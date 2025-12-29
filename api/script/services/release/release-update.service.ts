/**
 * Release Update Service
 * Handles editing of existing releases with business rule validations
 */

import { ReleaseRepository } from '../../models/release/release.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import { BuildRepository } from '../../models/release/build.repository';
import { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import { ReleaseActivityLogService } from './release-activity-log.service';
import { RegressionCycleRepository } from '../../models/release/regression-cycle.repository';
import { UpdateReleaseRequestBody } from '../../types/release/release.interface';
import { 
  Release, 
  UpdateReleaseDto, 
  UpdateCronJobDto, 
  CronJob, 
  StageStatus, 
  CronStatus, 
  RegressionSlot,
  TaskStatus,
  ReleaseStatus,
  PauseType,
  TaskType,
  RegressionCycleStatus
} from '../../models/release/release.interface';
import { CronJobService } from './cron-job/cron-job.service';
import { 
  validateTargetDateChange, 
  validateSlotsArray, 
  logTargetDateChangeAudit,
  TargetDateAuditInfo
} from '../../controllers/release/release-validation';
import { ReleaseNotificationService } from '../release-notification/release-notification.service';
import { NotificationType } from '~types/release-notification';

export interface UpdateReleasePayload {
  releaseId: string;
  accountId: string;
  updates: UpdateReleaseRequestBody;
}

export interface ReleaseUpdateValidationResult {
  isValid: boolean;
  error?: string;
  canEditRelease?: boolean;
  canEditPlatformMappings?: boolean;
  canEditCronConfig?: boolean;
  canEditKickOffReminder?: boolean;
  canEditKickOffDate?: boolean;
}

export interface RetryTaskResult {
  success: boolean;
  error?: string;
  taskId?: string;
  previousStatus?: string;
  newStatus?: string;
}

/**
 * Build-related task types that require build entry reset on retry
 */
const BUILD_TASK_TYPES: TaskType[] = [
  TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
  TaskType.TRIGGER_REGRESSION_BUILDS,
  TaskType.TRIGGER_TEST_FLIGHT_BUILD,
  TaskType.CREATE_AAB_BUILD
];

export class ReleaseUpdateService {
  constructor(
    private readonly releaseRepository: ReleaseRepository,
    private readonly cronJobRepository: CronJobRepository,
    private readonly platformMappingRepository: ReleasePlatformTargetMappingRepository,
    private readonly activityLogService: ReleaseActivityLogService,
    private readonly cronJobService: CronJobService,
    private readonly taskRepository: ReleaseTaskRepository,  // ✅ Required - actively initialized in aws-storage.ts
    private readonly buildRepository: BuildRepository,  // ✅ Required - actively initialized in aws-storage.ts
    private readonly regressionCycleRepository: RegressionCycleRepository,  // ✅ Required - actively initialized in aws-storage.ts
    private readonly releaseNotificationService?: ReleaseNotificationService  // Can be undefined if notifications not configured
  ) {}

  // Repository getters for manual upload flow
  // ✅ Repositories are required - actively initialized in aws-storage.ts, no null checks needed
  getBuildRepository(): BuildRepository {
    return this.buildRepository;
  }

  getTaskRepository(): ReleaseTaskRepository {
    return this.taskRepository;
  }

  getReleaseRepository(): ReleaseRepository {
    return this.releaseRepository;
  }

  getPlatformMappingRepository(): ReleasePlatformTargetMappingRepository {
    return this.platformMappingRepository;
  }

  /**
   * Update an existing release with business rule validations
   */
  async updateRelease(payload: UpdateReleasePayload): Promise<Release> {
    const { releaseId, accountId, updates } = payload;

    // Step 1: Get current release
    const currentRelease = await this.releaseRepository.findById(releaseId);
    if (!currentRelease) {
      throw new Error('Release not found');
    }

    // Step 2: Validate business rules
    const validation = this.validateUpdatePermissions(currentRelease, updates);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const now = new Date();

    // Step 3: Update release fields (if allowed)
    if (validation.canEditRelease && this.hasReleaseUpdates(updates)) {
      // Capture OLD values (before update)
      const previousReleaseValues = {
        releaseConfigId: currentRelease.releaseConfigId,
        type: currentRelease.type,
        branch: currentRelease.branch,
        baseBranch: currentRelease.baseBranch,
        baseReleaseId: currentRelease.baseReleaseId,
        kickOffReminderDate: currentRelease.kickOffReminderDate,
        kickOffDate: currentRelease.kickOffDate,
        targetReleaseDate: currentRelease.targetReleaseDate
      };
      
      const releaseUpdates: UpdateReleaseDto = {
        lastUpdatedByAccountId: accountId
      };

      // Target Release Date - with validation
      if (updates.targetReleaseDate !== undefined && currentRelease.targetReleaseDate) {
        const newTargetDate = updates.targetReleaseDate ? new Date(updates.targetReleaseDate) : null;
        
        if (newTargetDate) {
          // Get existing slots and their cycle statuses for validation
          const existingSlots = await this.getExistingSlotsWithStatus(releaseId);
          
          const dateValidation = validateTargetDateChange({
            oldDate: currentRelease.targetReleaseDate,
            newDate: newTargetDate,
            existingSlots,
            delayReason: updates.delayReason
          });
          
          if (!dateValidation.isValid) {
            throw new Error(dateValidation.error ?? 'Target date validation failed');
          }
          
          // Log audit if date changed
          if (dateValidation.shouldLogAudit && dateValidation.auditInfo) {
            logTargetDateChangeAudit(releaseId, dateValidation.auditInfo, accountId);
            
            // Send notification
            await this.notifyReleaseTargetDateChange(
              releaseId,
              currentRelease,
              dateValidation.auditInfo,
              accountId
            );
          }
        }
        
        releaseUpdates.targetReleaseDate = newTargetDate;
      }
      // Note: No else branch needed - targetReleaseDate is mandatory at release creation

      // Conditionally allowed fields (before kickoff)
      const kickOffDate = currentRelease.kickOffDate;
      const canEditBeforeKickoff = !kickOffDate || now < kickOffDate;

      if (canEditBeforeKickoff) {
        if (updates.releaseConfigId !== undefined) {
          releaseUpdates.releaseConfigId = updates.releaseConfigId;
        }
        if (updates.type !== undefined) {
          releaseUpdates.type = updates.type;
        }
        if (updates.branch !== undefined) {
          releaseUpdates.branch = updates.branch;
        }
        if (updates.baseBranch !== undefined) {
          releaseUpdates.baseBranch = updates.baseBranch;
        }
        if (updates.baseReleaseId !== undefined) {
          releaseUpdates.baseReleaseId = updates.baseReleaseId;
        }
      }

      // Time-specific validations
      if (updates.kickOffReminderDate !== undefined && validation.canEditKickOffReminder) {
        releaseUpdates.kickOffReminderDate = updates.kickOffReminderDate ? new Date(updates.kickOffReminderDate) : null;
      }
      if (updates.kickOffDate !== undefined && validation.canEditKickOffDate) {
        releaseUpdates.kickOffDate = updates.kickOffDate ? new Date(updates.kickOffDate) : null;
      }

      // Update database
      await this.releaseRepository.update(releaseId, releaseUpdates);
      
      // Capture NEW values (after update)
      const newReleaseValues = {
        releaseConfigId: releaseUpdates.releaseConfigId ?? currentRelease.releaseConfigId,
        type: releaseUpdates.type ?? currentRelease.type,
        branch: releaseUpdates.branch ?? currentRelease.branch,
        baseBranch: releaseUpdates.baseBranch ?? currentRelease.baseBranch,
        baseReleaseId: releaseUpdates.baseReleaseId ?? currentRelease.baseReleaseId,
        kickOffReminderDate: releaseUpdates.kickOffReminderDate ?? currentRelease.kickOffReminderDate,
        kickOffDate: releaseUpdates.kickOffDate ?? currentRelease.kickOffDate,
        targetReleaseDate: releaseUpdates.targetReleaseDate ?? currentRelease.targetReleaseDate
      };
      
      // Log activity
      await this.activityLogService.registerActivityLogs(
        releaseId,
        accountId,
        now,
        'RELEASE',
        previousReleaseValues,
        newReleaseValues
      );
    }

    

    // Step 4: Update platform target mappings (if allowed and before kickoff)
    if (validation.canEditPlatformMappings && updates.platformTargetMappings) {
      await this.updatePlatformTargetMappings(releaseId, updates.platformTargetMappings, accountId);
    }

    // Step 5: Update cron job fields (if provided)
    if (updates.cronJob) {
      await this.updateCronJobFields(releaseId, updates.cronJob, validation, accountId);
    } 

    // Step 6: Return updated release
    const updatedRelease = await this.releaseRepository.findById(releaseId);
    if (!updatedRelease) {
      throw new Error('Failed to retrieve updated release');
    }

    return updatedRelease;
  }

  /**
   * Validate what can be updated based on business rules
   */
  private validateUpdatePermissions(release: Release, _updates: UpdateReleaseRequestBody): ReleaseUpdateValidationResult {
    const now = new Date();

    // Cannot edit COMPLETED, SUBMITTED, or ARCHIVED releases
    const isCompleted = release.status === ReleaseStatus.COMPLETED;
    const isSubmitted = release.status === ReleaseStatus.SUBMITTED;
    const isArchived = release.status === ReleaseStatus.ARCHIVED;
    const isFinalized = isCompleted || isSubmitted || isArchived;
    
    if (isFinalized) {
      return {
        isValid: false,
        error: 'Cannot edit COMPLETED, SUBMITTED, or ARCHIVED releases'
      };
    }

    const kickOffDate = release.kickOffDate;
    const kickOffReminderDate = release.kickOffReminderDate;

    // Check time-based permissions
    const canEditBeforeKickoff = !kickOffDate || now < kickOffDate;
    const canEditKickOffReminder = !kickOffReminderDate || now < kickOffReminderDate;
    const canEditKickOffDate = !kickOffDate || now < kickOffDate;

    return {
      isValid: true,
      canEditRelease: true,
      canEditPlatformMappings: canEditBeforeKickoff,
      canEditCronConfig: canEditBeforeKickoff,
      canEditKickOffReminder,
      canEditKickOffDate
    };
  }

  /**
   * Check if there are any release-level updates
   */
  private hasReleaseUpdates(updates: UpdateReleaseRequestBody): boolean {
    return !!(
      updates.releaseConfigId !== undefined ||
      updates.type !== undefined ||
      updates.branch !== undefined ||
      updates.baseBranch !== undefined ||
      updates.baseReleaseId !== undefined ||
      updates.kickOffReminderDate !== undefined ||
      updates.kickOffDate !== undefined ||
      updates.targetReleaseDate !== undefined
    );
  }

  /**
   * Update platform target mappings
   */
  private async updatePlatformTargetMappings(
    releaseId: string,
    mappings: Array<{ id: string; platform: string; target: string; version: string }>,
    accountId: string
  ): Promise<void> {
    
    const now = new Date();
    
    // Get OLD mappings BEFORE update
    const oldMappings = await this.platformMappingRepository.getByReleaseId(releaseId);
    const oldMappingMap = new Map(oldMappings.map(m => [m.id, m]));
    const newMappingIds = new Set(mappings.map(m => m.id));
    
    // Helper to extract only comparable fields for activity logging
    const extractComparableFields = (mapping: any) => ({
      platform: mapping.platform,
      target: mapping.target,
      version: mapping.version,
      projectManagementRunId: mapping.projectManagementRunId ?? null,
      testManagementRunId: mapping.testManagementRunId ?? null
    });
    
    // 1️⃣ Handle ADDED and UPDATED mappings
    for (const newMapping of mappings) {
      const oldMapping = oldMappingMap.get(newMapping.id);
      
      // Update database
      await this.platformMappingRepository.update(newMapping.id, {
        platform: newMapping.platform as 'ANDROID' | 'IOS' | 'WEB',
        target: newMapping.target as 'WEB' | 'PLAY_STORE' | 'APP_STORE',
        version: newMapping.version
      });
      
      // Extract only comparable fields
      const oldComparable = oldMapping ? extractComparableFields(oldMapping) : null;
      const newComparable = extractComparableFields(newMapping);
      
      // Check if values actually changed (compare by value, not reference)
      const oldJson = oldComparable ? JSON.stringify(oldComparable) : null;
      const newJson = JSON.stringify(newComparable);
      const hasChanged = oldJson !== newJson;
      
      // Log changes only if actually changed (ADDED if oldMapping is null, UPDATED if exists)
      if (hasChanged) {
        await this.activityLogService.registerActivityLogs(
          releaseId,
          accountId,
          now,
          'PLATFORM_TARGET',
          oldComparable,
          newComparable
        );
      }
    }
    
    // 2️⃣ Handle DELETED mappings (in OLD but not in NEW)
    for (const oldMapping of oldMappings) {
      const wasDeleted = !newMappingIds.has(oldMapping.id);
      
      if (wasDeleted) {
        // Delete from database
        await this.platformMappingRepository.delete(oldMapping.id);
        
        // Log deletion with only comparable fields
        await this.activityLogService.registerActivityLogs(
          releaseId,
          accountId,
          now,
          'PLATFORM_TARGET',
          extractComparableFields(oldMapping),
          null         // null = DELETED
        );
      }
    }
  }

  /**
   * Update cron job fields
   */
  private async updateCronJobFields(
    releaseId: string,
    cronJobUpdates: NonNullable<UpdateReleaseRequestBody['cronJob']>,
    validation: ReleaseUpdateValidationResult,
    accountId: string
  ): Promise<void> {
    const cronJob = await this.cronJobRepository.findByReleaseId(releaseId);
    if (!cronJob) {
      throw new Error('Cron job not found for release');
    }
    const now = new Date();
    const updates: UpdateCronJobDto = {};

    // 1️⃣ Handle cronConfig update (only before kickoff)
    if (cronJobUpdates.cronConfig !== undefined && validation.canEditCronConfig) {
      const oldCronConfig = cronJob.cronConfig;
      
      // Deep merge: preserve existing fields, update only provided fields
      const mergedCronConfig = {
        ...oldCronConfig,              // Existing values
        ...cronJobUpdates.cronConfig   // Overwrite with new values
      };
      updates.cronConfig = mergedCronConfig;
      
      // Compare merged result with original to detect actual changes
      const oldJson = oldCronConfig ? JSON.stringify(oldCronConfig) : null;
      const newJson = JSON.stringify(mergedCronConfig);
      const hasChanged = oldJson !== newJson;
      
      // Only log if values actually changed
      if (hasChanged) {
        await this.activityLogService.registerActivityLogs(
          releaseId,
          accountId,
          now,
          'CRONCONFIG',
          oldCronConfig ?? null,
          mergedCronConfig
        );
      }
    }

    // 2️⃣ Handle upcomingRegressions update (always allowed for IN_PROGRESS releases)
    if (cronJobUpdates.upcomingRegressions !== undefined) {
      const oldRegressions = cronJob.upcomingRegressions ?? [];
      
      // Convert string dates to Date objects for DB storage
      // Deep merge: preserve existing config fields, update only provided fields
      const newRegressions = cronJobUpdates.upcomingRegressions.map((regression, index) => {
        const existingRegression = index < oldRegressions.length ? oldRegressions[index] : null;
        const existingConfig = existingRegression?.config ?? {};
        
        // Merge config: preserve existing fields, update only provided fields
        const mergedConfig = {
          ...existingConfig,      // Existing config values
          ...regression.config    // Overwrite with new config values
        };
        
        return {
          date: new Date(regression.date),
          config: mergedConfig
        };
      });
      
      // 3️⃣ Compare arrays index by index
      const maxLength = Math.max(oldRegressions.length, newRegressions.length);
      
      for (let i = 0; i < maxLength; i++) {
        const oldRegression = i < oldRegressions.length ? oldRegressions[i] : null;
        const newRegression = i < newRegressions.length ? newRegressions[i] : null;

        // Deep comparison using JSON serialization (handles Date objects and nested configs)
        const oldJson = oldRegression ? JSON.stringify(oldRegression) : null;
        const newJson = newRegression ? JSON.stringify(newRegression) : null;
        const hasChanged = oldJson !== newJson;

        if (hasChanged) {
          // Log: UPDATED (both exist), ADDED (only new), DELETED (only old)
          console.log(`[ReleaseUpdateService] Regression updated: ${oldJson} → ${newJson}`);
          await this.activityLogService.registerActivityLogs(
            releaseId,
            accountId,
            now,
            'REGRESSION',
            oldRegression,
            newRegression
          );
        }
      }
      const slotUpdateResult = await this.handleRegressionSlotUpdate(
        releaseId,
        cronJob,
        newRegressions  // Pass merged regressions, not raw client data
      );
      
      if (slotUpdateResult.updatedSlots) {
        updates.upcomingRegressions = slotUpdateResult.updatedSlots;
      }
      
      // Process slot update after cron job is updated
      if (Object.keys(updates).length > 0) {
        await this.cronJobRepository.update(cronJob.id, updates);
      }
      
      // Restart cron if slots were added and cron is not running
      if (slotUpdateResult.shouldRestartCron) {
        console.log(`[ReleaseUpdateService] Resuming cron job for release ${releaseId} - new slots added`);
        // Use resumeCronJob() instead of startCronJob() to avoid resetting stage1Status
        // Release could be in any stage (Stage 1, 2, or 3) when adding new slots
        await this.cronJobService.resumeCronJob(releaseId);
      }
      
      return; // Exit early since we already updated
    }

    if (Object.keys(updates).length > 0) {
      await this.cronJobRepository.update(cronJob.id, updates);
    }
  }

  /**
   * Handle regression slot updates with validation
   * 
   * Validation Rules:
   * 1. Stage 3 must be PENDING for any slot changes
   * 2. In Stage 2, cannot remove slots whose time has passed
   * 3. All slot dates must be before targetReleaseDate
   * 
   * Side Effects:
   * - If slots are added and cron is not running, restart cron
   */
  private async handleRegressionSlotUpdate(
    releaseId: string,
    cronJob: CronJob,
    newSlots: Array<{ date: string | Date; config?: Record<string, unknown> }>
  ): Promise<{ updatedSlots: RegressionSlot[] | null; shouldRestartCron: boolean }> {
    // Parse current slots
    const currentSlots = this.parseRegressionSlots(cronJob.upcomingRegressions);
    
    // Convert new slots to RegressionSlot format
    const parsedNewSlots: RegressionSlot[] = newSlots.map(slot => ({
      date: new Date(slot.date),
      config: slot.config || {}
    }));

    // VALIDATION: All slot dates must be before targetReleaseDate
    const release = await this.releaseRepository.findById(releaseId);
    if (release?.targetReleaseDate) {
      const slotsForValidation = parsedNewSlots.map((slot, index) => ({
        id: `slot-${index}`,
        date: new Date(slot.date).toISOString()
      }));
      
      const slotsValidation = validateSlotsArray(slotsForValidation, release.targetReleaseDate);
      if (!slotsValidation.isValid) {
        const invalidDates = slotsValidation.invalidSlots.map(s => s.date).join(', ');
        throw new Error(
          `Slot dates must be before targetReleaseDate (${release.targetReleaseDate.toISOString()}). ` +
          `Invalid slots: ${invalidDates}`
        );
      }
    }

    // Detect changes by comparing dates
    const currentDates = new Set(currentSlots.map(s => new Date(s.date).toISOString()));
    const newDates = new Set(parsedNewSlots.map(s => new Date(s.date).toISOString()));

    const addedSlots = parsedNewSlots.filter(s => !currentDates.has(new Date(s.date).toISOString()));
    const removedSlots = currentSlots.filter(s => !newDates.has(new Date(s.date).toISOString()));

    const hasChanges = addedSlots.length > 0 || removedSlots.length > 0;

    // VALIDATION: Stage 3 must be PENDING for any slot changes
    if (hasChanges && cronJob.stage3Status !== StageStatus.PENDING) {
      throw new Error(`Cannot modify regression slots: Stage 3 already started (status: ${cronJob.stage3Status})`);
    }

    // Note: We no longer block deletion of past slots during Stage 2.
    // Slots are removed from upcomingRegressions upon cycle creation,
    // so users should be able to clean them up if needed.

    // Determine if cron should be restarted
    const wasStage2Completed = cronJob.stage2Status === StageStatus.COMPLETED;
    const cronNotRunning = cronJob.cronStatus !== CronStatus.RUNNING;
    const shouldRestartCron = addedSlots.length > 0 && cronNotRunning;

    if (hasChanges) {
      console.log(
        `[ReleaseUpdateService] Regression slots updated for release ${releaseId}. ` +
        `Added: ${addedSlots.length}, Removed: ${removedSlots.length}. ` +
        `Stage 2 was ${wasStage2Completed ? 'COMPLETED' : cronJob.stage2Status}.`
      );
    }

    return {
      updatedSlots: parsedNewSlots,
      shouldRestartCron
    };
  }

  /**
   * Parse regression slots from various formats
   */
  private parseRegressionSlots(
    slots: RegressionSlot[] | string | null | undefined
  ): RegressionSlot[] {
    if (!slots) return [];
    
    if (typeof slots === 'string') {
      try {
        return JSON.parse(slots);
      } catch {
        return [];
      }
    }
    
    return slots;
  }

  /**
   * Get existing slots with their regression cycle status
   * Used for target date validation
   */
  private async getExistingSlotsWithStatus(
    releaseId: string
  ): Promise<Array<{ id: string; date: string; status?: RegressionCycleStatus }>> {
    const cronJob = await this.cronJobRepository.findByReleaseId(releaseId);
    if (!cronJob) return [];

    const slots = this.parseRegressionSlots(cronJob.upcomingRegressions);
    
    // ✅ regressionCycleRepository is required - actively initialized in aws-storage.ts, no null check needed
    const cycles = await this.regressionCycleRepository.findByReleaseId(releaseId);
    
    // Enrich slots with actual cycle status
    return slots.map((slot, index) => {
      // Match slot to cycle by index (cycles are created in order)
      const cycle = cycles[index];
      return {
        id: `slot-${index}`,
        date: new Date(slot.date).toISOString(),
        status: cycle?.status as RegressionCycleStatus | undefined
      };
    });
  }

  // ===========================================================================
  // RETRY TASK
  // ===========================================================================

  /**
   * Retry a failed task
   * 
   * This resets the task status to PENDING so the cron job can pick it up
   * and re-execute it on the next tick (LAZY approach).
   * 
   * For build tasks, also resets failed build entries so TaskExecutor
   * knows which platforms to re-trigger.
   * 
   * @param taskId - ID of the task to retry
   * @param accountId - Account ID of user initiating retry
   * @returns RetryTaskResult with success status
   */
  async retryTask(taskId: string, accountId: string): Promise<RetryTaskResult> {
    // ✅ taskRepository is required - actively initialized in aws-storage.ts, no null check needed
    
    // Step 1: Find the task
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // Step 2: Validate task can be retried (only FAILED tasks)
    if (task.taskStatus !== TaskStatus.FAILED) {
      return { 
        success: false, 
        error: `Only FAILED tasks can be retried. Current status: ${task.taskStatus}` 
      };
    }

    const previousStatus = task.taskStatus;

    // Step 3: Reset task status to PENDING
    await this.taskRepository.update(taskId, { 
      taskStatus: TaskStatus.PENDING 
    });

    // Step 4: Resume release if it was paused
    const release = await this.releaseRepository.findById(task.releaseId);
    if (release && release.status === ReleaseStatus.PAUSED) {
      await this.releaseRepository.update(task.releaseId, { 
        status: ReleaseStatus.IN_PROGRESS,
        lastUpdatedByAccountId: accountId
      });

      // Also reset cronJob pauseType
      const cronJob = await this.cronJobRepository.findByReleaseId(task.releaseId);
      if (cronJob) {
        await this.cronJobRepository.update(cronJob.id, { 
          pauseType: PauseType.NONE 
        });
      }

      console.log(`[ReleaseUpdateService] Release ${task.releaseId} resumed after task retry`);
    }

    // Step 5: For build tasks, reset failed build entries
    if (this.isBuildTask(task.taskType) && this.buildRepository) {
      const resetCount = await this.buildRepository.deleteFailedBuildsForTask(taskId);
      console.log(`[ReleaseUpdateService] Reset ${resetCount} failed build entries for task ${taskId}`);
    }

    console.log(
      `[ReleaseUpdateService] Task ${taskId} retry initiated by ${accountId}. ` +
      `Status: ${previousStatus} → PENDING. Cron will pick up on next tick.`
    );

    return {
      success: true,
      taskId,
      previousStatus,
      newStatus: TaskStatus.PENDING
    };
  }

  /**
   * Send TARGET_DATE_CHANGED notification
   */
  private async notifyReleaseTargetDateChange(
    releaseId: string,
    release: Release,
    auditInfo: TargetDateAuditInfo,
    accountId: string
  ): Promise<void> {
    if (!this.releaseNotificationService) {
      console.log('[ReleaseUpdateService] ReleaseNotificationService not available, skipping notification');
      return;
    }

    try {
      await this.releaseNotificationService.notify({
        type: NotificationType.TARGET_DATE_CHANGED,
        tenantId: release.tenantId,
        releaseId: releaseId,
        previousDate: auditInfo.oldDate.toISOString(),
        newDate: auditInfo.newDate.toISOString(),
        isSystemGenerated: false,
        userId: accountId
      });

      console.log(`[ReleaseUpdateService] Sent TARGET_DATE_CHANGED notification for release ${releaseId}`);
    } catch (error) {
      console.error(`[ReleaseUpdateService] Error sending TARGET_DATE_CHANGED notification:`, error);
      // Don't fail the update if notification fails
    }
  }

  /**
   * Check if task type is a build-related task
   */
  private isBuildTask(taskType: TaskType): boolean {
    return BUILD_TASK_TYPES.includes(taskType);
  }
}
