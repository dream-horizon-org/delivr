/**
 * Upload Validation Service
 * 
 * Validates manual build uploads based on:
 * - Release configuration (hasManualBuildUpload flag)
 * - Platform configuration (platform must be in release)
 * - Stage-specific rules (upload window must be open)
 * - Task status (PENDING or AWAITING_MANUAL_BUILD)
 * 
 * Reference: docs/MANUAL_BUILD_UPLOAD_FLOW.md
 */

import { PlatformName, TaskStatus, TaskType, StageStatus } from '../../models/release/release.interface';
import { UploadStage } from '../../models/release/release-uploads.sequelize.model';
import { ReleaseRepository } from '../../models/release/release.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import { RegressionCycleRepository } from '../../models/release/regression-cycle.repository';
import { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';

// ============================================================================
// TYPES
// ============================================================================

export type UploadValidationResult = {
  valid: boolean;
  error?: string;
  details?: {
    reason: string;
    currentStatus?: string;
    allowedStatuses?: string[];
  };
};

export type UploadWindowStatus = {
  isOpen: boolean;
  reason: string;
  opensAt?: Date;
  closesAt?: string; // Description of when it closes
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class UploadValidationService {
  constructor(
    private readonly releaseRepo: ReleaseRepository,
    private readonly cronJobRepo: CronJobRepository,
    private readonly taskRepo: ReleaseTaskRepository,
    private readonly cycleRepo: RegressionCycleRepository,
    private readonly platformMappingRepo: ReleasePlatformTargetMappingRepository
  ) {}

  /**
   * Main validation method - validates all rules
   */
  async validateUpload(
    releaseId: string,
    stage: UploadStage,
    platform: PlatformName
  ): Promise<UploadValidationResult> {
    // 1. Check release exists and hasManualBuildUpload is enabled
    const releaseCheck = await this.validateReleaseConfig(releaseId);
    const releaseCheckFailed = !releaseCheck.valid;
    if (releaseCheckFailed) {
      return releaseCheck;
    }

    // 2. Check platform is configured for this release
    const platformCheck = await this.validatePlatform(releaseId, platform);
    const platformCheckFailed = !platformCheck.valid;
    if (platformCheckFailed) {
      return platformCheck;
    }

    // 3. Check upload window is open for this stage
    const windowCheck = await this.validateUploadWindow(releaseId, stage, platform);
    const windowCheckFailed = !windowCheck.valid;
    if (windowCheckFailed) {
      return windowCheck;
    }

    return { valid: true };
  }

  /**
   * Validate release configuration
   */
  async validateReleaseConfig(releaseId: string): Promise<UploadValidationResult> {
    const release = await this.releaseRepo.findById(releaseId);
    
    const releaseNotFound = !release;
    if (releaseNotFound) {
      return {
        valid: false,
        error: 'Release not found',
        details: { reason: 'RELEASE_NOT_FOUND' },
      };
    }

    const manualUploadDisabled = !release.hasManualBuildUpload;
    if (manualUploadDisabled) {
      return {
        valid: false,
        error: 'Manual upload not enabled for this release',
        details: { reason: 'MANUAL_UPLOAD_DISABLED' },
      };
    }

    return { valid: true };
  }

  /**
   * Validate platform is configured for this release
   */
  async validatePlatform(releaseId: string, platform: PlatformName): Promise<UploadValidationResult> {
    const mappings = await this.platformMappingRepo.getByReleaseId(releaseId);
    const platforms = mappings.map(m => m.platform);
    
    const platformNotConfigured = !platforms.includes(platform);
    if (platformNotConfigured) {
      return {
        valid: false,
        error: `Platform ${platform} not configured for this release`,
        details: {
          reason: 'PLATFORM_NOT_CONFIGURED',
          allowedStatuses: platforms,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Validate upload window is open for the stage
   */
  async validateUploadWindow(
    releaseId: string,
    stage: UploadStage,
    platform: PlatformName
  ): Promise<UploadValidationResult> {
    switch (stage) {
      case 'KICK_OFF':
        return this.validateKickOffWindow(releaseId);
      case 'REGRESSION':
        return this.validateRegressionWindow(releaseId);
      case 'PRE_RELEASE':
        return this.validatePreReleaseWindow(releaseId, platform);
      default:
        return {
          valid: false,
          error: `Invalid stage: ${stage}`,
          details: { reason: 'INVALID_STAGE' },
        };
    }
  }

  /**
   * KICK_OFF (Pre-Regression) upload window:
   * - Open: No task yet, or task is PENDING/AWAITING_MANUAL_BUILD
   * - Closed: Task is IN_PROGRESS or COMPLETED
   */
  private async validateKickOffWindow(releaseId: string): Promise<UploadValidationResult> {
    const task = await this.taskRepo.findByTaskType(
      releaseId,
      TaskType.TRIGGER_PRE_REGRESSION_BUILDS
    );

    // No task yet - upload allowed (early upload before kickoff)
    const noTaskYet = !task;
    if (noTaskYet) {
      return { valid: true };
    }

    const allowedStatuses = [TaskStatus.PENDING, TaskStatus.AWAITING_CALLBACK, TaskStatus.AWAITING_MANUAL_BUILD];
    const taskStatusAllowed = allowedStatuses.includes(task.taskStatus as TaskStatus);
    
    if (taskStatusAllowed) {
      return { valid: true };
    }

    return {
      valid: false,
      error: 'KICK_OFF upload window closed',
      details: {
        reason: 'UPLOAD_WINDOW_CLOSED',
        currentStatus: task.taskStatus,
        allowedStatuses: allowedStatuses,
      },
    };
  }

  /**
   * REGRESSION upload window:
   * - Stage 1 must be complete
   * - Stage 2 must not be complete
   * - Current cycle's TRIGGER_REGRESSION_BUILDS task must be PENDING or AWAITING_MANUAL_BUILD
   */
  private async validateRegressionWindow(releaseId: string): Promise<UploadValidationResult> {
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    
    const noCronJob = !cronJob;
    if (noCronJob) {
      return {
        valid: false,
        error: 'Release not started yet',
        details: { reason: 'RELEASE_NOT_STARTED' },
      };
    }

    // Check Stage 1 is complete
    const stage1NotComplete = cronJob.stage1Status !== StageStatus.COMPLETED;
    if (stage1NotComplete) {
      return {
        valid: false,
        error: 'Stage 1 not complete yet',
        details: {
          reason: 'STAGE_1_NOT_COMPLETE',
          currentStatus: cronJob.stage1Status,
        },
      };
    }

    // Check Stage 2 is not complete
    const stage2Complete = cronJob.stage2Status === StageStatus.COMPLETED;
    if (stage2Complete) {
      return {
        valid: false,
        error: 'All regression cycles complete',
        details: {
          reason: 'ALL_CYCLES_COMPLETE',
          currentStatus: cronJob.stage2Status,
        },
      };
    }

    // Check current cycle's task status
    const latestCycle = await this.cycleRepo.findLatest(releaseId);
    const hasActiveCycle = latestCycle !== null;
    
    if (hasActiveCycle) {
      // Find task by regression cycle ID and type
      const cycleTasks = await this.taskRepo.findByRegressionCycleId(latestCycle.id);
      const task = cycleTasks.find(t => t.taskType === TaskType.TRIGGER_REGRESSION_BUILDS) ?? null;

      const hasTask = task !== null;
      if (hasTask) {
        const allowedStatuses = [TaskStatus.PENDING, TaskStatus.AWAITING_CALLBACK, TaskStatus.AWAITING_MANUAL_BUILD];
        const taskStatusNotAllowed = !allowedStatuses.includes(task.taskStatus as TaskStatus);
        
        if (taskStatusNotAllowed) {
          return {
            valid: false,
            error: 'Current cycle upload window closed',
            details: {
              reason: 'CYCLE_WINDOW_CLOSED',
              currentStatus: task.taskStatus,
              allowedStatuses: allowedStatuses,
            },
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * PRE_RELEASE upload window:
   * - Stage 3 must be IN_PROGRESS
   * - Platform-specific task must be PENDING or AWAITING_MANUAL_BUILD
   */
  private async validatePreReleaseWindow(
    releaseId: string,
    platform: PlatformName
  ): Promise<UploadValidationResult> {
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    
    const noCronJob = !cronJob;
    if (noCronJob) {
      return {
        valid: false,
        error: 'Release not started yet',
        details: { reason: 'RELEASE_NOT_STARTED' },
      };
    }

    // Check Stage 3 is in progress
    const stage3NotStarted = cronJob.stage3Status !== StageStatus.IN_PROGRESS;
    if (stage3NotStarted) {
      return {
        valid: false,
        error: 'Stage 3 approval not granted yet',
        details: {
          reason: 'STAGE_3_NOT_STARTED',
          currentStatus: cronJob.stage3Status,
        },
      };
    }

    // Get platform-specific task type
    const taskType = this.getPreReleaseTaskType(platform);
    const noTaskTypeForPlatform = taskType === null;
    if (noTaskTypeForPlatform) {
      return {
        valid: false,
        error: `No pre-release build task for platform ${platform}`,
        details: { reason: 'NO_TASK_FOR_PLATFORM' },
      };
    }

    // Check task status
    const task = await this.taskRepo.findByTaskType(releaseId, taskType);
    const hasTask = task !== null;
    
    if (hasTask) {
      const allowedStatuses = [TaskStatus.PENDING, TaskStatus.AWAITING_CALLBACK, TaskStatus.AWAITING_MANUAL_BUILD];
      const taskStatusNotAllowed = !allowedStatuses.includes(task.taskStatus as TaskStatus);
      
      if (taskStatusNotAllowed) {
        return {
          valid: false,
          error: `PRE_RELEASE upload window closed for ${platform}`,
          details: {
            reason: 'UPLOAD_WINDOW_CLOSED',
            currentStatus: task.taskStatus,
            allowedStatuses: allowedStatuses,
          },
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get the pre-release build task type for a platform
   */
  private getPreReleaseTaskType(platform: PlatformName): TaskType | null {
    switch (platform) {
      case PlatformName.IOS:
        return TaskType.TRIGGER_TEST_FLIGHT_BUILD;
      case PlatformName.ANDROID:
        return TaskType.CREATE_AAB_BUILD;
      default:
        return null;
    }
  }

  /**
   * Get upload window status for a stage
   * Useful for API response to show user when they can upload
   */
  async getUploadWindowStatus(
    releaseId: string,
    stage: UploadStage,
    platform: PlatformName
  ): Promise<UploadWindowStatus> {
    const validation = await this.validateUploadWindow(releaseId, stage, platform);
    
    const isOpen = validation.valid;
    if (isOpen) {
      return {
        isOpen: true,
        reason: 'Upload window is open',
        closesAt: this.getWindowCloseDescription(stage),
      };
    }

    return {
      isOpen: false,
      reason: validation.error ?? 'Upload window is closed',
    };
  }

  /**
   * Get description of when upload window closes
   */
  private getWindowCloseDescription(stage: UploadStage): string {
    switch (stage) {
      case 'KICK_OFF':
        return 'When TRIGGER_PRE_REGRESSION_BUILDS task starts';
      case 'REGRESSION':
        return 'When TRIGGER_REGRESSION_BUILDS task starts for current cycle';
      case 'PRE_RELEASE':
        return 'When the platform-specific build task starts';
      default:
        return 'Unknown';
    }
  }
}

export default UploadValidationService;

