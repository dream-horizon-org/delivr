/**
 * Awaiting Manual Build Handler Utility
 * 
 * Handles tasks that are waiting for manual build uploads.
 * Called by cron states (Kickoff, Regression, PreRelease) to check
 * if manual uploads are available and ready to be consumed.
 * 
 * Flow:
 * 1. Task is set to AWAITING_MANUAL_BUILD by TaskExecutor when waiting for manual builds
 *    (Note: AWAITING_CALLBACK is used for CI/CD mode - waiting for external callback)
 * 2. Cron state calls checkAndConsumeManualBuilds() on each tick
 * 3. If all platform uploads are ready → consume them, complete task
 * 4. If uploads missing → continue waiting (no action)
 */

import { TaskType, TaskStatus, PlatformName } from '~models/release/release.interface';
import type { ReleaseTask } from '~models/release/release.interface';
import { ReleaseUploadsRepository, ReleaseUpload } from '~models/release/release-uploads.repository';
import { UploadStage } from '~models/release/release-uploads.sequelize.model';
import { ReleaseTaskRepository } from '~models/release/release-task.repository';
import { BuildRepository, CreateBuildDto } from '~models/release/build.repository';
import { v4 as uuidv4 } from 'uuid';
import { BUILD_STAGE } from '~types/release-management/builds';
import type { BuildNotificationService } from '~services/release/build/build-notification.service';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Simplified mapping with just platform and version for build creation.
 * Extracted from ReleasePlatformTargetMapping to avoid full dependency.
 */
export type PlatformVersionMapping = {
  platform: PlatformName;
  version: string;
};

export type ManualBuildCheckResult = {
  checked: boolean;
  allReady: boolean;
  consumed: boolean;
  uploads: ReleaseUpload[];
  missingPlatforms: PlatformName[];
};

export type ManualBuildCheckContext = {
  releaseId: string;
  taskId: string;
  taskType: TaskType;
  cycleId: string | null;
  platforms: PlatformName[];
  platformVersionMappings: PlatformVersionMapping[];
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Build task types that support manual uploads
 * These are the only task types that should trigger upload checking
 */
export const MANUAL_BUILD_TASK_TYPES = [
  TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
  TaskType.TRIGGER_REGRESSION_BUILDS,
  TaskType.TRIGGER_TEST_FLIGHT_BUILD,
  TaskType.CREATE_AAB_BUILD,
] as const;

/**
 * Map task type to upload stage
 * Uses same values as builds.buildStage for consistency
 */
export const TASK_TYPE_TO_UPLOAD_STAGE: Record<string, UploadStage> = {
  [TaskType.TRIGGER_PRE_REGRESSION_BUILDS]: BUILD_STAGE.KICKOFF,
  [TaskType.TRIGGER_REGRESSION_BUILDS]: BUILD_STAGE.REGRESSION,
  [TaskType.TRIGGER_TEST_FLIGHT_BUILD]: BUILD_STAGE.PRE_RELEASE,
  [TaskType.CREATE_AAB_BUILD]: BUILD_STAGE.PRE_RELEASE,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a task type supports manual build uploads
 */
export const isBuildTaskType = (taskType: TaskType): boolean => {
  return MANUAL_BUILD_TASK_TYPES.includes(taskType as any);
};

/**
 * Get upload stage for a task type
 */
export const getUploadStageForTaskType = (taskType: TaskType): UploadStage | null => {
  return TASK_TYPE_TO_UPLOAD_STAGE[taskType] ?? null;
};

/**
 * Check if a task is waiting for manual builds
 * 
 * A task is waiting for manual builds if:
 * 1. Task status is AWAITING_MANUAL_BUILD (not AWAITING_CALLBACK - that's for CI/CD)
 * 2. Task type is a build task that supports manual uploads
 * 3. Release has manual build upload enabled
 */
export const isAwaitingManualBuild = (
  task: { taskType: TaskType; taskStatus: TaskStatus },
  hasManualBuildUpload: boolean
): boolean => {
  // AWAITING_MANUAL_BUILD = waiting for user uploads (manual mode)
  const isAwaitingManualBuildStatus = task.taskStatus === TaskStatus.AWAITING_MANUAL_BUILD;
  const isBuildTask = isBuildTaskType(task.taskType);
  
  return isAwaitingManualBuildStatus && isBuildTask && hasManualBuildUpload;
};

/**
 * Get required platforms for a specific task type
 * 
 * Different build tasks target different platforms:
 * - TRIGGER_TEST_FLIGHT_BUILD: IOS only (TestFlight)
 * - CREATE_AAB_BUILD: ANDROID only (Play Store AAB)
 * - TRIGGER_PRE_REGRESSION_BUILDS, TRIGGER_REGRESSION_BUILDS: All platforms
 * 
 * @param taskType - The task type
 * @param availablePlatforms - All platforms configured for the release
 * @returns Array of platforms required for this specific task
 */
export const getRequiredPlatformsForTask = (
  taskType: TaskType,
  availablePlatforms: PlatformVersionMapping[]
): PlatformName[] => {
  // IOS-only tasks
  if (taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD) {
    const hasIOS = availablePlatforms.some(p => p.platform === PlatformName.IOS);
    return hasIOS ? [PlatformName.IOS] : [];
  }
  
  // ANDROID-only tasks
  if (taskType === TaskType.CREATE_AAB_BUILD) {
    const hasAndroid = availablePlatforms.some(p => p.platform === PlatformName.ANDROID);
    return hasAndroid ? [PlatformName.ANDROID] : [];
  }
  
  // Multi-platform tasks (need all configured platforms)
  if (
    taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS ||
    taskType === TaskType.TRIGGER_REGRESSION_BUILDS
  ) {
    return availablePlatforms.map(m => m.platform);
  }
  
  // Default: all platforms (safest fallback)
  return availablePlatforms.map(m => m.platform);
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Check and consume manual builds for a task
 * 
 * This is the main function called by cron states to handle AWAITING_MANUAL_BUILD tasks.
 * 
 * @param context - Task context (releaseId, taskId, taskType, cycleId, platforms)
 * @param releaseUploadsRepo - Repository for release_uploads table
 * @param releaseTaskRepo - Repository for release_tasks table
 * @param buildRepo - Repository for builds table (for creating build records)
 * @param buildNotificationService - Service for sending build notifications
 * @returns Result object with check outcome
 */
export const checkAndConsumeManualBuilds = async (
  context: ManualBuildCheckContext,
  releaseUploadsRepo: ReleaseUploadsRepository,
  releaseTaskRepo: ReleaseTaskRepository,
  buildRepo: BuildRepository,
  buildNotificationService: BuildNotificationService
): Promise<ManualBuildCheckResult> => {
  const { releaseId, taskId, taskType, cycleId, platforms, platformVersionMappings } = context;
  
  // Get upload stage for this task type
  const stage = getUploadStageForTaskType(taskType);
  
  if (!stage) {
    console.log(`[ManualBuildHandler] Task type ${taskType} does not support manual uploads`);
    return {
      checked: false,
      allReady: false,
      consumed: false,
      uploads: [],
      missingPlatforms: [],
    };
  }

  console.log(
    `[ManualBuildHandler] Checking uploads for task ${taskId} (${taskType}), ` +
    `stage=${stage}, platforms=[${platforms.join(', ')}]`
  );

  // Check if all platform uploads are ready
  const readiness = await releaseUploadsRepo.checkAllPlatformsReady(
    releaseId,
    stage,
    platforms
  );

  console.log(
    `[ManualBuildHandler] Readiness check: allReady=${readiness.allReady}, ` +
    `uploaded=[${readiness.uploadedPlatforms.join(', ')}], ` +
    `missing=[${readiness.missingPlatforms.join(', ')}]`
  );

  // If not all ready, continue waiting
  if (!readiness.allReady) {
    return {
      checked: true,
      allReady: false,
      consumed: false,
      uploads: [],
      missingPlatforms: readiness.missingPlatforms,
    };
  }

  // All platforms ready - consume uploads!
  console.log(`[ManualBuildHandler] All platforms ready! Consuming uploads...`);

  // Get unused uploads for this stage
  const uploads = await releaseUploadsRepo.findUnused(releaseId, stage);
  
  // Filter to only include required platforms
  const uploadsToConsume = uploads.filter(u => platforms.includes(u.platform));

  // Mark uploads as used
  const uploadIds = uploadsToConsume.map(u => u.id);
  
  if (uploadIds.length > 0) {
    await releaseUploadsRepo.markMultipleAsUsed(uploadIds, taskId, cycleId);
    
    console.log(
      `[ManualBuildHandler] Consumed ${uploadIds.length} uploads for task ${taskId}` +
      (cycleId ? ` (cycle ${cycleId})` : '')
    );
  }

  // Create build records from consumed uploads
  if (uploadsToConsume.length > 0) {
    console.log(`[ManualBuildHandler] Creating ${uploadsToConsume.length} build records...`);
    
    for (const upload of uploadsToConsume) {
      const buildId = uuidv4();
      
      // ✅ FIX: Handle null artifactPath for different upload types
      let uploadFileName: string;
      
      if (upload.artifactPath) {
        // Case 1: File upload with artifact path
        uploadFileName = upload.artifactPath.split('/').pop() ?? upload.artifactPath;
      } else if (upload.testflightNumber) {
        // Case 2: IOS TestFlight build (only testflightNumber, no file)
        uploadFileName = `testflight-${upload.testflightNumber}`;
      } else if (upload.internalTrackLink) {
        // Case 3: ANDROID internal track build (only link, no file)
        const versionCode = upload.internalTrackLink.split('/').pop() || upload.internalTrackLink;
        uploadFileName = `internal-track-${versionCode}`;
      } else {
        // Case 4: Fallback (should not happen, but handle gracefully)
        uploadFileName = `manual-build-${upload.platform.toLowerCase()}`;
        console.warn(
          `[ManualBuildHandler] Upload ${upload.id} has no artifactPath, testflightNumber, or internalTrackLink. ` +
          `Using fallback name: ${uploadFileName}`
        );
      }
      
      // Get version from platform mappings (each platform can have different version)
      // Note: platformMapping should always exist since uploadsToConsume is filtered to only include platforms from platformVersionMappings
      const platformMapping = platformVersionMappings.find(m => m.platform === upload.platform);
      
      const mappingNotFound = !platformMapping;
      if (mappingNotFound) {
        console.warn(`[ManualBuildHandler] No version mapping found for platform ${upload.platform}, skipping build creation`);
        continue;
      }
      
      const artifactVersionName = platformMapping.version;

      // Determine store type and copy appropriate link from upload
      const isIosPlatform = upload.platform === 'IOS';
      const storeType = isIosPlatform ? 'APP_STORE' : 'PLAY_STORE';

      const buildData: CreateBuildDto = {
        id: buildId,
        tenantId: upload.tenantId,
        releaseId: upload.releaseId,
        platform: upload.platform,
        buildType: 'MANUAL',
        buildStage: stage,
        buildNumber: uploadFileName,
        artifactVersionName,
        artifactPath: upload.artifactPath,
        storeType,
        regressionId: cycleId ?? null,
        ciRunId: null,
        buildUploadStatus: 'UPLOADED',
        queueLocation: null,
        workflowStatus: null,
        taskId: taskId,
        internalTrackLink: upload.internalTrackLink ?? null,
        testflightNumber: upload.testflightNumber ?? null
      };
      
      await buildRepo.create(buildData);
      console.log(`[ManualBuildHandler] Created build record for ${upload.platform}: ${uploadFileName} (version: ${artifactVersionName})`);
    }
  }

  // Send build notifications
  try {
    // Fetch builds that were just created for this task
    const builds = await buildRepo.findByTaskId(taskId);
    
    const hasBuilds = builds.length > 0;
    if (hasBuilds) {
      // Construct minimal task object for notification (only fields used by notifyBuildCompletions)
      const task = {
        id: taskId,
        taskType,
        releaseId,
      } as ReleaseTask;
      
      await buildNotificationService.notifyBuildCompletions(task, builds);
    }
  } catch (error) {
    // Log but don't fail - notification failure shouldn't break the flow
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[ManualBuildHandler] Error sending build notifications: ` +
      `taskId=${taskId}, releaseId=${releaseId}, taskType=${taskType}, error=${errorMessage}`
    );
  }

  // Update task status to COMPLETED
  await releaseTaskRepo.update(taskId, {
    taskStatus: TaskStatus.COMPLETED,
  });

  console.log(`[ManualBuildHandler] Task ${taskId} marked as COMPLETED`);

  return {
    checked: true,
    allReady: true,
    consumed: true,
    uploads: uploadsToConsume,
    missingPlatforms: [],
  };
};

/**
 * Process all AWAITING_MANUAL_BUILD tasks for a release
 * 
 * This is a convenience function that checks all waiting tasks at once.
 * Called by cron states at the start of each execution cycle.
 * 
 * Note: Only processes tasks with status AWAITING_MANUAL_BUILD.
 * Tasks with AWAITING_CALLBACK are handled by the CI/CD callback handler.
 * 
 * @param releaseId - Release ID
 * @param tasks - All tasks for the stage
 * @param hasManualBuildUpload - Whether release has manual upload enabled
 * @param platformVersionMappings - Platform to version mappings (from release_platform_target_mapping)
 * @param releaseUploadsRepo - Repository for release_uploads table
 * @param releaseTaskRepo - Repository for release_tasks table
 * @param buildRepo - Repository for builds table (for creating build records)
 * @param buildNotificationService - Service for sending build notifications
 * @returns Array of results for each waiting task
 */
export const processAwaitingManualBuildTasks = async (
  releaseId: string,
  tasks: Array<{ id: string; taskType: TaskType; taskStatus: TaskStatus; cycleId?: string | null }>,
  hasManualBuildUpload: boolean,
  platformVersionMappings: PlatformVersionMapping[],
  releaseUploadsRepo: ReleaseUploadsRepository,
  releaseTaskRepo: ReleaseTaskRepository,
  buildRepo: BuildRepository,
  buildNotificationService: BuildNotificationService
): Promise<Map<string, ManualBuildCheckResult>> => {
  const results = new Map<string, ManualBuildCheckResult>();

  // Find tasks waiting for manual builds
  const waitingTasks = tasks.filter(task => 
    isAwaitingManualBuild(task, hasManualBuildUpload)
  );

  if (waitingTasks.length === 0) {
    return results;
  }

  console.log(
    `[ManualBuildHandler] Found ${waitingTasks.length} tasks waiting for manual builds`
  );

  // Check each waiting task
  for (const task of waitingTasks) {
    // ✅ FIX: Get platforms specific to this task type
    // Different tasks require different platforms:
    // - TRIGGER_TEST_FLIGHT_BUILD needs only IOS
    // - CREATE_AAB_BUILD needs only ANDROID
    // - TRIGGER_PRE_REGRESSION_BUILDS/TRIGGER_REGRESSION_BUILDS need all platforms
    const requiredPlatforms = getRequiredPlatformsForTask(
      task.taskType,
      platformVersionMappings
    );
    
    console.log(
      `[ManualBuildHandler] Task ${task.id} (${task.taskType}) requires platforms: [${requiredPlatforms.join(', ')}]`
    );
    
    const result = await checkAndConsumeManualBuilds(
      {
        releaseId,
        taskId: task.id,
        taskType: task.taskType,
        cycleId: task.cycleId ?? null,
        platforms: requiredPlatforms,
        platformVersionMappings,
      },
      releaseUploadsRepo,
      releaseTaskRepo,
      buildRepo,
      buildNotificationService
    );

    results.set(task.id, result);
  }

  return results;
};

export default {
  isBuildTaskType,
  getUploadStageForTaskType,
  isAwaitingManualBuild,
  getRequiredPlatformsForTask,
  checkAndConsumeManualBuilds,
  processAwaitingManualBuildTasks,
  MANUAL_BUILD_TASK_TYPES,
  TASK_TYPE_TO_UPLOAD_STAGE,
};

