/**
 * Release Update Service
 * Handles editing of existing releases with business rule validations
 */

import { ReleaseRepository } from '../../models/release/release.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import { UpdateReleaseRequestBody } from '../../types/release/release.interface';
import { Release, UpdateReleaseDto, UpdateCronJobDto, CronJob, StageStatus, CronStatus, RegressionSlot } from '../../models/release/release.interface';
import { CronJobService } from './cron-job/cron-job.service';

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

export class ReleaseUpdateService {
  constructor(
    private readonly releaseRepository: ReleaseRepository,
    private readonly cronJobRepository: CronJobRepository,
    private readonly platformMappingRepository: ReleasePlatformTargetMappingRepository,
    private readonly cronJobService: CronJobService
  ) {}

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
      const releaseUpdates: UpdateReleaseDto = {
        lastUpdatedByAccountId: accountId
      };

      // Always allowed fields
      if (updates.targetReleaseDate !== undefined) {
        releaseUpdates.targetReleaseDate = updates.targetReleaseDate ? new Date(updates.targetReleaseDate) : null;
      }

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

      await this.releaseRepository.update(releaseId, releaseUpdates);
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
  private validateUpdatePermissions(release: Release, updates: UpdateReleaseRequestBody): ReleaseUpdateValidationResult {
    const now = new Date();

    // Only IN_PROGRESS releases can be edited
    if (release.status !== 'IN_PROGRESS') {
      return {
        isValid: false,
        error: 'Only IN_PROGRESS releases can be edited'
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
    for (const mapping of mappings) {
      await this.platformMappingRepository.update(mapping.id, {
        platform: mapping.platform as 'ANDROID' | 'IOS' | 'WEB',
        target: mapping.target as 'WEB' | 'PLAY_STORE' | 'APP_STORE',
        version: mapping.version
      });
    }
  }

  /**
   * Update cron job fields
   */
  private async updateCronJobFields(
    releaseId: string,
    cronJobUpdates: NonNullable<UpdateReleaseRequestBody['cronJob']>,
    validation: ReleaseUpdateValidationResult,
    _accountId: string
  ): Promise<void> {
    const cronJob = await this.cronJobRepository.findByReleaseId(releaseId);
    if (!cronJob) {
      throw new Error('Cron job not found for release');
    }

    const updates: UpdateCronJobDto = {};

    // cronConfig can only be updated before kickoff
    if (cronJobUpdates.cronConfig !== undefined && validation.canEditCronConfig) {
      updates.cronConfig = cronJobUpdates.cronConfig;
    }

    // upcomingRegressions with stage-based validation
    if (cronJobUpdates.upcomingRegressions !== undefined) {
      const slotUpdateResult = await this.handleRegressionSlotUpdate(
        releaseId,
        cronJob,
        cronJobUpdates.upcomingRegressions
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
        console.log(`[ReleaseUpdateService] Restarting cron job for release ${releaseId} - new slots added`);
        await this.cronJobService.startCronJob(releaseId);
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

    // Detect changes by comparing dates
    const currentDates = new Set(currentSlots.map(s => new Date(s.date).toISOString()));
    const newDates = new Set(parsedNewSlots.map(s => new Date(s.date).toISOString()));

    const addedSlots = parsedNewSlots.filter(s => !currentDates.has(new Date(s.date).toISOString()));
    const removedSlots = currentSlots.filter(s => !newDates.has(new Date(s.date).toISOString()));

    const hasChanges = addedSlots.length > 0 || removedSlots.length > 0;

    // VALIDATION 1: Stage 3 must be PENDING for any slot changes
    if (hasChanges && cronJob.stage3Status !== StageStatus.PENDING) {
      throw new Error(`Cannot modify regression slots: Stage 3 already started (status: ${cronJob.stage3Status})`);
    }

    // VALIDATION 2: In Stage 2, cannot remove slots whose time has passed
    if (removedSlots.length > 0 && cronJob.stage2Status === StageStatus.IN_PROGRESS) {
      const now = new Date();
      const pastSlots = removedSlots.filter(s => new Date(s.date) < now);
      if (pastSlots.length > 0) {
        const pastDates = pastSlots.map(s => new Date(s.date).toISOString()).join(', ');
        throw new Error(`Cannot delete slots whose time has passed during Stage 2. Past slots: ${pastDates}`);
      }
    }

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
}
