/**
 * Awaiting Manual Build Handler Utility
 * 
 * Handles tasks that are waiting for manual build uploads.
 * Called by cron states (Kickoff, Regression, PostRegression) to check
 * if manual uploads are available and ready to be consumed.
 * 
 * Flow:
 * 1. Task is set to AWAITING_CALLBACK by TaskExecutor when waiting for manual builds
 * 2. Cron state calls checkAndConsumeManualBuilds() on each tick
 * 3. If all platform uploads are ready → consume them, complete task
 * 4. If uploads missing → continue waiting (no action)
 */

import { TaskType, TaskStatus, PlatformName } from '~models/release/release.interface';
import { ReleaseUploadsRepository, ReleaseUpload } from '~models/release/release-uploads.repository';
import { UploadStage } from '~models/release/release-uploads.sequelize.model';
import { ReleaseTaskRepository } from '~models/release/release-task.repository';
import { BuildRepository } from '~models/release/build.repository';

// ============================================================================
// TYPES
// ============================================================================

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
 */
export const TASK_TYPE_TO_UPLOAD_STAGE: Record<string, UploadStage> = {
  [TaskType.TRIGGER_PRE_REGRESSION_BUILDS]: 'PRE_REGRESSION',
  [TaskType.TRIGGER_REGRESSION_BUILDS]: 'REGRESSION',
  [TaskType.TRIGGER_TEST_FLIGHT_BUILD]: 'PRE_RELEASE',
  [TaskType.CREATE_AAB_BUILD]: 'PRE_RELEASE',
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
 */
export const isAwaitingManualBuild = (
  task: { taskType: TaskType; taskStatus: TaskStatus },
  hasManualBuildUpload: boolean
): boolean => {
  const isAwaitingCallback = task.taskStatus === TaskStatus.AWAITING_CALLBACK;
  const isBuildTask = isBuildTaskType(task.taskType);
  
  return isAwaitingCallback && isBuildTask && hasManualBuildUpload;
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Check and consume manual builds for a task
 * 
 * This is the main function called by cron states to handle AWAITING_CALLBACK tasks.
 * 
 * @param context - Task context (releaseId, taskId, taskType, cycleId, platforms)
 * @param releaseUploadsRepo - Repository for release_uploads table
 * @param releaseTaskRepo - Repository for release_tasks table
 * @param buildRepo - Repository for builds table (optional, for creating build records)
 * @returns Result object with check outcome
 */
export const checkAndConsumeManualBuilds = async (
  context: ManualBuildCheckContext,
  releaseUploadsRepo: ReleaseUploadsRepository,
  releaseTaskRepo: ReleaseTaskRepository,
  _buildRepo?: BuildRepository
): Promise<ManualBuildCheckResult> => {
  const { releaseId, taskId, taskType, cycleId, platforms } = context;
  
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

  // Optionally create build records (if buildRepo provided)
  // Note: This is handled separately in TaskExecutor.handleManualModeBuilds
  // so we skip it here to avoid duplication

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
 * Process all AWAITING_CALLBACK tasks for a release
 * 
 * This is a convenience function that checks all waiting tasks at once.
 * Called by cron states at the start of each execution cycle.
 * 
 * @param releaseId - Release ID
 * @param tasks - All tasks for the stage
 * @param hasManualBuildUpload - Whether release has manual upload enabled
 * @param platforms - Release platforms
 * @param releaseUploadsRepo - Repository for release_uploads table
 * @param releaseTaskRepo - Repository for release_tasks table
 * @returns Array of results for each waiting task
 */
export const processAwaitingManualBuildTasks = async (
  releaseId: string,
  tasks: Array<{ id: string; taskType: TaskType; taskStatus: TaskStatus; cycleId?: string | null }>,
  hasManualBuildUpload: boolean,
  platforms: PlatformName[],
  releaseUploadsRepo: ReleaseUploadsRepository,
  releaseTaskRepo: ReleaseTaskRepository
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
    const result = await checkAndConsumeManualBuilds(
      {
        releaseId,
        taskId: task.id,
        taskType: task.taskType,
        cycleId: task.cycleId ?? null,
        platforms,
      },
      releaseUploadsRepo,
      releaseTaskRepo
    );

    results.set(task.id, result);
  }

  return results;
};

export default {
  isBuildTaskType,
  getUploadStageForTaskType,
  isAwaitingManualBuild,
  checkAndConsumeManualBuilds,
  processAwaitingManualBuildTasks,
  MANUAL_BUILD_TASK_TYPES,
  TASK_TYPE_TO_UPLOAD_STAGE,
};

