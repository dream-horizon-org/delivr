/**
 * Release Update Service
 * Handles editing of existing releases with business rule validations
 */

import { ReleaseRepository } from '../../models/release/release.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import { UpdateReleaseRequestBody } from '../../types/release/release.interface';
import { Release, UpdateReleaseDto, UpdateCronJobDto } from '../../models/release/release.interface';

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
    private readonly platformMappingRepository: ReleasePlatformTargetMappingRepository
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
    accountId: string
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

    // upcomingRegressions can always be updated for IN_PROGRESS releases
    if (cronJobUpdates.upcomingRegressions !== undefined) {
      // Convert string dates to Date objects
      const regressions = cronJobUpdates.upcomingRegressions.map(regression => ({
        date: new Date(regression.date),
        config: regression.config
      }));
      updates.upcomingRegressions = regressions;
    }

    if (Object.keys(updates).length > 0) {
      await this.cronJobRepository.update(cronJob.id, updates);
    }
  }
}
