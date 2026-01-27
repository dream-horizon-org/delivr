/**
 * Release Schedule Service
 * Handles release schedule operations and Cronicle job management
 * 
 * NOTE: Schedule → Config relationship (schedule has releaseConfigId FK)
 * This means when creating a schedule, we always have the configId available,
 * making Cronicle job creation straightforward.
 */

import * as shortid from 'shortid';
import type { CronicleService } from '~services/cronicle';
import type { ReleaseScheduleRepository } from '~models/release-schedules';
import type { ReleaseConfigService } from '~services/release-configs/release-config.service';
import type { ReleaseCreationService } from '~services/release/release-creation.service';
import type { ReleaseRetrievalService } from '~services/release/release-retrieval.service';
import type { ReleaseVersionService } from '~services/release/release-version.service';
import type {
  ReleaseScheduleRecord,
  CreateReleaseScheduleDto,
  UpdateReleaseScheduleDto,
  ReleaseSchedule
} from '~types/release-schedules/release-schedule.interface';
import type { CreateReleaseResult, Platform, Target } from '~types/release';
import {
  buildScheduledReleasePayload,
  subtractWorkingDays,
  parseISODate,
  toDateString,
  calculateNextKickoffDate,
  getCurrentDateInTimezone
} from './utils';
import {
  RELEASE_CREATION_ADVANCE_DAYS,
  CRONICLE_DAILY_JOB_TIME
} from './release-schedule.constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result type for webhook-triggered release creation
 * Uses discriminated union for clear status handling
 */
export type WebhookCreateReleaseResult =
  | { status: 'not_found' }
  | { status: 'disabled' }
  | { status: 'skipped'; nextKickoffDate: string }
  | { status: 'created'; releaseId: string; releaseInternalId: string };

// ============================================================================
// CONSTANTS
// ============================================================================

const RELEASE_SCHEDULE_ERROR_MESSAGES = {
  SCHEDULE_NOT_FOUND: 'Release schedule not found',
  CONFIG_NOT_FOUND: 'Release configuration not found for schedule',
  CREATE_CRONICLE_JOB_FAILED: 'Failed to create Cronicle job for release schedule',
  UPDATE_CRONICLE_JOB_FAILED: 'Failed to update Cronicle job for release schedule',
  DELETE_CRONICLE_JOB_FAILED: 'Failed to delete Cronicle job for release schedule',
  CREATE_RELEASE_FAILED: 'Failed to create release from schedule',
  SCHEDULE_DISABLED: 'Release schedule is disabled',
  FETCH_VERSIONS_FAILED: 'Failed to fetch latest versions for platform-targets',
  SCHEDULE_DISABLED_CRONICLE_UNAVAILABLE: 'Release schedule created but disabled - Cronicle job creation failed. Re-enable when Cronicle is available.'
} as const;

// Cronicle job category TITLE - CronicleService auto-creates if it doesn't exist
// Note: Cronicle auto-generates the ID from the title (e.g., "Release Scheduling" -> "releasescheduling")
const CRONICLE_JOB_CATEGORY_TITLE = 'Release Scheduling';

// ============================================================================
// SERVICE
// ============================================================================

export class ReleaseScheduleService {
  // Optional dependencies for scheduled release creation (set via setter due to circular dependency)
  private releaseConfigService?: ReleaseConfigService;
  private releaseRetrievalService?: ReleaseRetrievalService;
  private releaseCreationService?: ReleaseCreationService;
  private releaseVersionService?: ReleaseVersionService;

  constructor(
    private readonly scheduleRepository: ReleaseScheduleRepository,
    private readonly cronicleService: CronicleService | null // Null if Cronicle is not configured
  ) {}

  /**
   * Set dependencies for scheduled release creation
   * Called after all services are initialized to avoid circular dependency
   */
  setReleaseCreationDependencies = (deps: {
    releaseConfigService: ReleaseConfigService;
    releaseRetrievalService: ReleaseRetrievalService;
    releaseCreationService: ReleaseCreationService;
    releaseVersionService: ReleaseVersionService;
  }): void => {
    this.releaseConfigService = deps.releaseConfigService;
    this.releaseRetrievalService = deps.releaseRetrievalService;
    this.releaseCreationService = deps.releaseCreationService;
    this.releaseVersionService = deps.releaseVersionService;
  };

  // ─────────────────────────────────────────────────────────────
  // Public API: CRUD Operations
  // ─────────────────────────────────────────────────────────────

  /**
   * Get schedule by ID
   */
  getById = async (scheduleId: string): Promise<ReleaseScheduleRecord | null> => {
    return this.scheduleRepository.findById(scheduleId);
  };

  /**
   * Get schedule by release config ID
   * Each config can only have one schedule (unique constraint)
   */
  getByReleaseConfigId = async (releaseConfigId: string): Promise<ReleaseScheduleRecord | null> => {
    return this.scheduleRepository.findByReleaseConfigId(releaseConfigId);
  };

  /**
   * Get schedules by tenant
   */
  getByTenantId = async (appId: string): Promise<ReleaseScheduleRecord[]> => {
    return this.scheduleRepository.findByAppId(appId);
  };

  /**
   * Create a new release schedule with Cronicle job
   * Since schedule references config, we always have configId during creation
   * 
   * @param releaseConfigId - The config this schedule belongs to (required)
   * @param releaseConfigName - For Cronicle job title
   * @param scheduleData - Schedule configuration data
   * @param appId - app id (denormalized for queries)
   * @param createdByAccountId - User who created this schedule
   */
  create = async (
    releaseConfigId: string,
    releaseConfigName: string,
    scheduleData: ReleaseSchedule,
    appId: string,
    createdByAccountId: string
  ): Promise<ReleaseScheduleRecord> => {
    // Generate ID for the schedule
    const scheduleId = shortid.generate();

    // Calculate nextReleaseKickoffDate from firstReleaseKickoffDate if not provided
    // The first release will use firstReleaseKickoffDate, and nextReleaseKickoffDate
    // will be updated after the first release is created
    const nextReleaseKickoffDate = scheduleData.nextReleaseKickoffDate ?? 
      calculateNextKickoffDate(
        scheduleData.firstReleaseKickoffDate,
        scheduleData.releaseFrequency,
        scheduleData.workingDays
      );

    // Build DTO with releaseConfigId
    const createDto: CreateReleaseScheduleDto & { id: string } = {
      id: scheduleId,
      releaseConfigId,
      appId,
      releaseFrequency: scheduleData.releaseFrequency,
      firstReleaseKickoffDate: scheduleData.firstReleaseKickoffDate,
      initialVersions: scheduleData.initialVersions,
      kickoffReminderTime: scheduleData.kickoffReminderTime,
      kickoffTime: scheduleData.kickoffTime,
      targetReleaseTime: scheduleData.targetReleaseTime,
      targetReleaseDateOffsetFromKickoff: scheduleData.targetReleaseDateOffsetFromKickoff,
      kickoffReminderEnabled: scheduleData.kickoffReminderEnabled,
      timezone: scheduleData.timezone,
      regressionSlots: scheduleData.regressionSlots,
      workingDays: scheduleData.workingDays,
      nextReleaseKickoffDate,
      createdByAccountId
    };

    // Create the schedule in database
    const schedule = await this.scheduleRepository.create(createDto);

    // Create Cronicle job if service is available
    const shouldCreateJob = this.cronicleService !== null;
    if (shouldCreateJob) {
      try {
        const cronicleJobId = await this.createCronicleJob(
          schedule,
          releaseConfigName
        );

        // Update schedule with Cronicle job ID
        await this.scheduleRepository.update(schedule.id, { cronicleJobId });
        schedule.cronicleJobId = cronicleJobId;
      } catch (error) {
        // Cronicle is unavailable - disable schedule for visibility
        // User can re-enable when Cronicle is back, which will trigger job creation
        console.error(
          RELEASE_SCHEDULE_ERROR_MESSAGES.CREATE_CRONICLE_JOB_FAILED,
          { scheduleId: schedule.id, error }
        );
        console.warn(
          `[ReleaseScheduleService] ${RELEASE_SCHEDULE_ERROR_MESSAGES.SCHEDULE_DISABLED_CRONICLE_UNAVAILABLE}`,
          { scheduleId: schedule.id }
        );
        
        // Set isEnabled: false to give visibility that schedule is not active
        await this.scheduleRepository.update(schedule.id, { isEnabled: false });
        schedule.isEnabled = false;
      }
    }

    // Create the first release immediately after schedule creation
    // This uses initialVersions from the schedule for the first release
    await this.createFirstRelease(schedule);

    return schedule;
  };

  /**
   * Create the first release for a newly created schedule
   * 
   * Called immediately after schedule creation to create the first release
   * using initialVersions. Subsequent releases will be created by Cronicle jobs.
   * 
   * Errors are logged but don't fail the schedule creation - the schedule
   * can still be used and the first release can be triggered manually if needed.
   * 
   * @param schedule - The schedule object (already fetched, avoids duplicate DB call)
   */
  private createFirstRelease = async (schedule: ReleaseScheduleRecord): Promise<void> => {
    // Check if dependencies are available
    const dependenciesNotReady = !this.releaseConfigService || 
                                  !this.releaseRetrievalService || 
                                  !this.releaseCreationService;
    if (dependenciesNotReady) {
      console.warn('[createFirstRelease] Dependencies not ready, skipping first release creation');
      return;
    }

    console.log('[createFirstRelease] Creating first release for schedule:', schedule.id);

    try {
      const result = await this.createScheduledRelease(schedule);
      console.log('[createFirstRelease] First release created successfully:', {
        releaseId: result.release.id,
        releaseInternalId: result.release.releaseId
      });
    } catch (error) {
      // Log error but don't fail the schedule creation
      // The schedule is created and Cronicle job is set up - first release can be created manually
      console.error('[createFirstRelease] Failed to create first release:', error);
      console.warn('[createFirstRelease] Schedule created successfully but first release failed.');
      console.warn('[createFirstRelease] First release can be triggered manually or will be created by Cronicle job.');
    }
  };

  /**
   * Update an existing release schedule
   * Updates the Cronicle job if timing or enabled status changes
   */
  update = async (
    scheduleId: string,
    data: UpdateReleaseScheduleDto,
    releaseConfigName?: string // For Cronicle job updates
  ): Promise<ReleaseScheduleRecord | null> => {
    const existingSchedule = await this.scheduleRepository.findById(scheduleId);
    const scheduleNotFound = existingSchedule === null;
    if (scheduleNotFound) {
      return null;
    }

    // Update the schedule in database
    const updatedSchedule = await this.scheduleRepository.update(scheduleId, data);
    const updateFailed = updatedSchedule === null;
    if (updateFailed) {
      return null;
    }

    // Handle Cronicle job updates if name is provided
    const configName = releaseConfigName ?? 'Release Schedule';
    await this.syncCronicleJob(
      existingSchedule,
      updatedSchedule,
      existingSchedule.releaseConfigId,
      configName
    );

    return updatedSchedule;
  };

  /**
   * Delete a release schedule by ID
   * Also deletes the associated Cronicle job
   */
  delete = async (scheduleId: string): Promise<boolean> => {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    const scheduleNotFound = schedule === null;
    if (scheduleNotFound) {
      return false;
    }

    // Delete Cronicle job if exists
    await this.deleteCronicleJobIfExists(schedule);

    // Delete schedule from database
    return this.scheduleRepository.delete(scheduleId);
  };

  /**
   * Delete schedule by release config ID
   * Useful when config is deleted (though FK cascade should handle this)
   */
  deleteByReleaseConfigId = async (releaseConfigId: string): Promise<boolean> => {
    const schedule = await this.scheduleRepository.findByReleaseConfigId(releaseConfigId);
    
    if (schedule) {
      // Delete Cronicle job if exists
      await this.deleteCronicleJobIfExists(schedule);
    }

    // Delete schedule from database
    return this.scheduleRepository.deleteByReleaseConfigId(releaseConfigId);
  };

  // ─────────────────────────────────────────────────────────────
  // Public API: Job Operations
  // ─────────────────────────────────────────────────────────────

  /**
   * Enable or disable a schedule
   * Also enables/disables the Cronicle job
   */
  setEnabled = async (scheduleId: string, enabled: boolean): Promise<boolean> => {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    const scheduleNotFound = schedule === null;
    if (scheduleNotFound) {
      return false;
    }

    // Update Cronicle job if exists
    const hasCronicleJob = schedule.cronicleJobId !== null && this.cronicleService !== null;
    if (hasCronicleJob) {
      try {
        await this.cronicleService!.setJobEnabled(schedule.cronicleJobId!, enabled);
      } catch (error) {
        console.error(RELEASE_SCHEDULE_ERROR_MESSAGES.UPDATE_CRONICLE_JOB_FAILED, error);
      }
    }

    // Update database
    await this.scheduleRepository.setEnabled(scheduleId, enabled);
    return true;
  };

  /**
   * Update schedule after a release is created
   * Updates nextReleaseKickoffDate and lastCreatedReleaseId
   */
  recordReleaseCreation = async (
    scheduleId: string,
    releaseId: string,
    nextKickoffDate: string
  ): Promise<void> => {
    await this.scheduleRepository.updateAfterReleaseCreation(
      scheduleId,
      nextKickoffDate,    // Correct order: nextKickoffDate first
      releaseId           // Correct order: releaseId second
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Public API: Scheduled Release Creation
  // ─────────────────────────────────────────────────────────────

  /**
   * Try to create a release from a schedule (for Cronicle webhook)
   * 
   * This method handles all pre-creation checks:
   * - Schedule exists
   * - Schedule is enabled
   * - It's time to create (based on working days and nextKickoffDate)
   * 
   * Returns a discriminated union result for clean controller mapping to HTTP responses.
   * 
   * @param scheduleId - The schedule to create a release for
   * @returns Result indicating status (not_found, disabled, skipped, or created)
   */
  tryCreateScheduledReleaseFromWebhook = async (
    scheduleId: string
  ): Promise<WebhookCreateReleaseResult> => {
    // Step 1: Get schedule (single DB call - passed to createScheduledRelease)
    const schedule = await this.scheduleRepository.findById(scheduleId);
    const scheduleNotFound = schedule === null;
    if (scheduleNotFound) {
      return { status: 'not_found' };
    }

    // Step 2: Check if schedule is enabled
    const scheduleDisabled = !schedule.isEnabled;
    if (scheduleDisabled) {
      return { status: 'disabled' };
    }

    // Step 3: Check if it's time to create
    const isTimeToCreate = this.isTimeToCreateRelease(schedule);
    if (!isTimeToCreate) {
      return { 
        status: 'skipped', 
        nextKickoffDate: schedule.nextReleaseKickoffDate 
      };
    }

    // Step 4: Create the release (pass schedule object to avoid duplicate DB call)
    console.log('[tryCreateScheduledReleaseFromWebhook] Creating release for schedule:', scheduleId);
    const result = await this.createScheduledRelease(schedule);

    return {
      status: 'created',
      releaseId: result.release.id,
      releaseInternalId: result.release.releaseId
    };
  };

  /**
   * Create a release from a schedule (pure creation)
   * 
   * This is the core release creation method that:
   * 1. Fetches config from DB
   * 2. Fetches previous release for version bumping (if not first release)
   * 3. Builds the release payload using pure utility functions
   * 4. Creates the release via ReleaseCreationService
   * 5. Updates the schedule with next kickoff date and last release ID
   * 
   * NOTE: This method does NOT check if schedule is enabled or if it's time to create.
   * Use `tryCreateScheduledReleaseFromWebhook` for webhook calls which need those checks.
   * 
   * @param schedule - The schedule object (already fetched by caller)
   * @returns The created release result
   * @throws Error if config not found or release creation fails
   */
  createScheduledRelease = async (schedule: ReleaseScheduleRecord): Promise<CreateReleaseResult> => {
    // Validate dependencies are available
    const dependenciesMissing = !this.releaseConfigService || 
                                 !this.releaseCreationService ||
                                 !this.releaseVersionService;
    if (dependenciesMissing) {
      throw new Error('Release creation dependencies not configured');
    }

    // Step 1: Get release config (schedule object passed in, no need to fetch)
    const config = await this.releaseConfigService!.getConfigById(schedule.releaseConfigId);
    const configNotFound = config === null;
    if (configNotFound) {
      throw new Error(RELEASE_SCHEDULE_ERROR_MESSAGES.CONFIG_NOT_FOUND);
    }

    // Step 2: Get latest versions for each platform-target using ReleaseVersionService
    // This queries tenant-wide (across all non-ARCHIVED releases)
    let latestVersions: Array<{ platform: string; target: string; version: string | null }>;
    try {
      latestVersions = await Promise.all(
        schedule.initialVersions.map(async (iv) => ({
          platform: iv.platform,
          target: iv.target,
          version: await this.releaseVersionService!.getLatestVersion(
            config.appId,
            iv.platform as Platform,
            iv.target as Target
          )
        }))
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[createScheduledRelease] ${RELEASE_SCHEDULE_ERROR_MESSAGES.FETCH_VERSIONS_FAILED}`,
        { scheduleId: schedule.id, configId: schedule.releaseConfigId, error: errorMessage }
      );
      throw new Error(`${RELEASE_SCHEDULE_ERROR_MESSAGES.FETCH_VERSIONS_FAILED}: ${errorMessage}`);
    }

    // Step 3: Build the release payload using pure utility
    const { payload, nextReleaseKickoffDate } = buildScheduledReleasePayload({
      schedule,
      config,
      latestVersions
    });

    // Step 4: Create the release
    let result: CreateReleaseResult;
    try {
      result = await this.releaseCreationService!.createRelease(payload);
    } catch (error) {
      console.error(RELEASE_SCHEDULE_ERROR_MESSAGES.CREATE_RELEASE_FAILED, error);
      throw error;
    }

    // Step 5: Update schedule with next kickoff date and last release ID
    await this.recordReleaseCreation(
      schedule.id,
      result.release.id,
      nextReleaseKickoffDate
    );

    // Step 6: Update in-memory schedule object so API response reflects the new state
    schedule.lastCreatedReleaseId = result.release.id;
    schedule.nextReleaseKickoffDate = nextReleaseKickoffDate;

    return result;
  };

  // ─────────────────────────────────────────────────────────────
  // Public API: Utility
  // ─────────────────────────────────────────────────────────────

  /**
   * Map ReleaseScheduleRecord to ReleaseSchedule (strip DB-only fields)
   * Useful for API responses
   */
  mapRecordToSchedule = (record: ReleaseScheduleRecord | null): ReleaseSchedule | null => {
    if (record === null) {
      return null;
    }

    return {
      releaseFrequency: record.releaseFrequency,
      firstReleaseKickoffDate: record.firstReleaseKickoffDate,
      nextReleaseKickoffDate: record.nextReleaseKickoffDate,
      initialVersions: record.initialVersions,
      kickoffReminderTime: record.kickoffReminderTime,
      kickoffTime: record.kickoffTime,
      targetReleaseTime: record.targetReleaseTime,
      targetReleaseDateOffsetFromKickoff: record.targetReleaseDateOffsetFromKickoff,
      kickoffReminderEnabled: record.kickoffReminderEnabled,
      timezone: record.timezone,
      regressionSlots: record.regressionSlots ?? undefined,
      workingDays: record.workingDays,
      // Runtime state fields
      isEnabled: record.isEnabled,
      lastCreatedReleaseId: record.lastCreatedReleaseId
    };
  };

  // ─────────────────────────────────────────────────────────────
  // Private: Cronicle Job Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Delete Cronicle job if it exists
   */
  private deleteCronicleJobIfExists = async (schedule: ReleaseScheduleRecord): Promise<void> => {
    const hasCronicleJob = schedule.cronicleJobId !== null && this.cronicleService !== null;
    if (hasCronicleJob) {
      try {
        await this.cronicleService!.deleteJob(schedule.cronicleJobId!);
      } catch (error) {
        console.error(RELEASE_SCHEDULE_ERROR_MESSAGES.DELETE_CRONICLE_JOB_FAILED, error);
        // Continue even if Cronicle job deletion fails
      }
    }
  };

  /**
   * Create a Cronicle job for a release schedule
   * 
   * Creates a job that runs daily at CRONICLE_DAILY_JOB_TIME.
   * The webhook handler checks if it's time to create a release.
   */
  private createCronicleJob = async (
    schedule: ReleaseScheduleRecord,
    releaseConfigName: string
  ): Promise<string> => {
    const cronicleNotConfigured = this.cronicleService === null;
    if (cronicleNotConfigured) {
      throw new Error('Cronicle service not configured');
    }

    // All jobs run at the same fixed time
    const timing = this.buildCronicleTiming();

    // Category is auto-created by CronicleService.createJob if it doesn't exist
    // Pass the category TITLE - CronicleService will resolve it to the correct ID
    const jobId = await this.cronicleService!.createJob({
      // Let Cronicle auto-generate the ID
      title: `Release Schedule: ${releaseConfigName}`,
      category: CRONICLE_JOB_CATEGORY_TITLE, // CronicleService handles ID resolution/creation
      timing,
      timezone: schedule.timezone, // Use schedule's timezone for the daily job
      params: {
        method: 'POST',
        // Route is at /internal/release-schedules/create-release (no /api prefix)
        url: this.cronicleService!.buildDirectUrl('/internal/release-schedules/create-release'),
        body: {
          scheduleId: schedule.id
        }
      },
      notes: `Auto-generated job for release schedule ${schedule.id}. Runs daily and checks if it's time to create a release.`,
      retries: 3,
      catchUp: false // Don't run missed jobs - releases should be created fresh
    });

    return jobId;
  };

  /**
   * Sync Cronicle job with schedule changes
   * 
   * Handles:
   * - Enable/disable job (using setJobEnabled, NOT delete/recreate)
   * - Create job if missing
   */
  private syncCronicleJob = async (
    oldSchedule: ReleaseScheduleRecord,
    newSchedule: ReleaseScheduleRecord,
    _releaseConfigId: string,
    releaseConfigName: string
  ): Promise<void> => {
    const cronicleNotConfigured = this.cronicleService === null;
    if (cronicleNotConfigured) {
      return;
    }

    const wasEnabled = oldSchedule.isEnabled;
    const isNowEnabled = newSchedule.isEnabled;
    const hasJob = newSchedule.cronicleJobId !== null;
    const enabledChanged = wasEnabled !== isNowEnabled;

    // Case 1: Enabled status changed and job exists → toggle job enabled state
    if (enabledChanged && hasJob) {
      try {
        await this.cronicleService!.setJobEnabled(newSchedule.cronicleJobId!, isNowEnabled);
        console.log(`[syncCronicleJob] Job ${isNowEnabled ? 'enabled' : 'disabled'}:`, newSchedule.cronicleJobId);
      } catch (error) {
        console.error(RELEASE_SCHEDULE_ERROR_MESSAGES.UPDATE_CRONICLE_JOB_FAILED, error);
      }
      return;
    }

    // Case 2: Schedule enabled but no job → create job
    // This happens when user re-enables a schedule that was disabled due to Cronicle failure
    const shouldCreateJob = isNowEnabled && !hasJob;
    if (shouldCreateJob) {
      try {
        const cronicleJobId = await this.createCronicleJob(
          newSchedule,
          releaseConfigName
        );
        await this.scheduleRepository.update(newSchedule.id, { cronicleJobId });
        console.log('[syncCronicleJob] Job created:', cronicleJobId);
      } catch (error) {
        // Cronicle is unavailable - revert isEnabled to false for visibility
        console.error(
          RELEASE_SCHEDULE_ERROR_MESSAGES.CREATE_CRONICLE_JOB_FAILED,
          { scheduleId: newSchedule.id, error }
        );
        console.warn(
          `[syncCronicleJob] ${RELEASE_SCHEDULE_ERROR_MESSAGES.SCHEDULE_DISABLED_CRONICLE_UNAVAILABLE}`,
          { scheduleId: newSchedule.id }
        );
        
        // Revert isEnabled to false since job creation failed
        await this.scheduleRepository.update(newSchedule.id, { isEnabled: false });
      }
      return;
    }

    // No timing updates needed - all jobs run at same fixed time
  };

  /**
   * Build Cronicle timing configuration
   *
   * Runs daily at a fixed time (CRONICLE_DAILY_JOB_TIME).
   * The webhook handler checks if it's time to create a release based on
   * nextReleaseKickoffDate and RELEASE_CREATION_ADVANCE_DAYS.
   */
  private buildCronicleTiming = (): { hours: number[]; minutes: number[] } => {
    // Parse fixed daily job time (format: "HH:mm")
    const [hoursStr, minutesStr] = CRONICLE_DAILY_JOB_TIME.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    // Run daily at the fixed time
    return {
      hours: [hours],
      minutes: [minutes]
    };
  };

  // ─────────────────────────────────────────────────────────────
  // Private: Scheduling Check
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if it's time to create a release for this schedule
   * 
   * A release should be created if today (in the schedule's timezone) is
   * RELEASE_CREATION_ADVANCE_DAYS working days before nextReleaseKickoffDate.
   * 
   * @param schedule - The release schedule to check
   * @returns true if it's time to create a release
   */
  private isTimeToCreateRelease = (schedule: ReleaseScheduleRecord): boolean => {
    // Parse nextReleaseKickoffDate
    const nextKickoffDate = parseISODate(schedule.nextReleaseKickoffDate);
    
    // Calculate the creation date (RELEASE_CREATION_ADVANCE_DAYS before kickoff)
    const creationDate = subtractWorkingDays(
      nextKickoffDate,
      RELEASE_CREATION_ADVANCE_DAYS,
      schedule.workingDays
    );

    // Get today's date in the schedule's timezone
    const todayDateStr = getCurrentDateInTimezone(schedule.timezone);
    const creationDateStr = toDateString(creationDate);

    // Check if today is the creation date
    const isCreationDay = todayDateStr === creationDateStr;
    
    return isCreationDay;
  };
}
