/**
 * Release Retrieval Service
 * 
 * Handles fetching release data with all related information
 */

import { ReleaseRepository } from '../../models/release/release.repository';
import { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import { TaskStage, ReleaseTask, Phase } from '../../models/release/release.interface';
import type { ReleaseResponseBody } from '~types/release';

// ============================================================================
// PHASE DERIVATION TYPES
// ============================================================================

type PauseType = 'NONE' | 'AWAITING_STAGE_TRIGGER' | 'USER_REQUESTED' | 'TASK_FAILURE';

export type DerivePhaseInput = {
  releaseStatus: string;
  stage1Status: string;
  stage2Status: string;
  stage3Status: string;
  stage4Status: string;
  cronStatus: string;
  pauseType: PauseType;
  currentCycleStatus?: string | null;
  hasNextCycle?: boolean;
};

// ============================================================================
// PHASE DERIVATION FUNCTION
// ============================================================================

/**
 * Derives the current phase of a release based on multiple status fields.
 * Used for UI display - 14 distinct phases.
 * 
 * @param input - Object containing all relevant status fields
 * @returns Phase - One of 14 possible phase values
 */
export function derivePhase(input: DerivePhaseInput): Phase {
  const {
    releaseStatus,
    stage1Status,
    stage2Status,
    stage3Status,
    stage4Status,
    cronStatus,
    pauseType,
    currentCycleStatus,
    hasNextCycle
  } = input;

  // Terminal states first (highest priority)
  if (releaseStatus === 'ARCHIVED') return 'ARCHIVED';
  if (releaseStatus === 'COMPLETED') return 'COMPLETED';

  // Paused states
  if (releaseStatus === 'PAUSED') {
    if (pauseType === 'USER_REQUESTED') return 'PAUSED_BY_USER';
    if (pauseType === 'TASK_FAILURE') return 'PAUSED_BY_FAILURE';
  }

  // Submitted state
  if (releaseStatus === 'SUBMITTED') {
    return 'SUBMITTED_PENDING_APPROVAL';
  }

  // Not started
  if (releaseStatus === 'PENDING' && cronStatus === 'PENDING') {
    return 'NOT_STARTED';
  }

  // Stage 1 (Kickoff)
  if (stage1Status === 'IN_PROGRESS') {
    return 'KICKOFF';
  }

  // Between Stage 1 and 2
  if (stage1Status === 'COMPLETED' && stage2Status === 'PENDING') {
    return 'AWAITING_REGRESSION';
  }

  // Stage 2 (Regression)
  if (stage2Status === 'IN_PROGRESS') {
    // Check if waiting for next cycle
    if (currentCycleStatus === 'DONE' && hasNextCycle) {
      return 'REGRESSION_AWAITING_NEXT_CYCLE';
    }
    return 'REGRESSION';
  }

  // Between Stage 2 and 3
  if (stage2Status === 'COMPLETED' && stage3Status === 'PENDING') {
    return 'AWAITING_POST_REGRESSION';
  }

  // Stage 3 (Post-Regression)
  if (stage3Status === 'IN_PROGRESS') {
    return 'POST_REGRESSION';
  }

  // Between Stage 3 and 4
  if (stage3Status === 'COMPLETED' && stage4Status === 'PENDING') {
    return 'AWAITING_SUBMISSION';
  }

  // Stage 4 (Submission)
  if (stage4Status === 'IN_PROGRESS') {
    return 'SUBMISSION';
  }

  // Fallback
  return 'NOT_STARTED';
}

export type GetTasksResult = {
  success: true;
  tasks: ReleaseTask[];
  count: number;
} | {
  success: false;
  error: string;
  statusCode: number;
};

export type GetTaskByIdResult = {
  success: true;
  task: ReleaseTask;
} | {
  success: false;
  error: string;
  statusCode: number;
};

export class ReleaseRetrievalService {
  constructor(
    private readonly releaseRepo: ReleaseRepository,
    private readonly platformTargetMappingRepo: ReleasePlatformTargetMappingRepository,
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository
  ) {}

  /**
   * Get all releases for a tenant with complete details
   * @param includeTasks - Optional flag to include tasks (default: false for performance)
   */
  async getAllReleases(tenantId: string, includeTasks: boolean = false): Promise<ReleaseResponseBody[]> {
    // Fetch all releases for tenant
    const releases = await this.releaseRepo.findAllByTenantId(tenantId);

    // Fetch platform-target mappings for all releases
    const releaseResponses: ReleaseResponseBody[] = [];

    for (const release of releases) {
      // Fetch platform-target mappings
      const mappings = await this.platformTargetMappingRepo.getByReleaseId(release.id);

      // Fetch cron job
      const cronJobRecord = await this.cronJobRepo.findByReleaseId(release.id);

      const releaseResponse: ReleaseResponseBody = {
        id: release.id,
        releaseId: release.releaseId,
        releaseConfigId: release.releaseConfigId,
        tenantId: release.tenantId,
        type: release.type,
        status: release.status,
        branch: release.branch,
        baseBranch: release.baseBranch,
        baseReleaseId: release.baseReleaseId,
        platformTargetMappings: mappings,
        kickOffReminderDate: release.kickOffReminderDate ? release.kickOffReminderDate.toISOString() : null,
        kickOffDate: release.kickOffDate ? release.kickOffDate.toISOString() : null,
        targetReleaseDate: release.targetReleaseDate ? release.targetReleaseDate.toISOString() : null,
        releaseDate: release.releaseDate ? release.releaseDate.toISOString() : null,
        hasManualBuildUpload: release.hasManualBuildUpload,
        createdByAccountId: release.createdByAccountId,
        releasePilotAccountId: release.releasePilotAccountId,
        lastUpdatedByAccountId: release.lastUpdatedByAccountId,
        createdAt: release.createdAt.toISOString(),
        updatedAt: release.updatedAt.toISOString()
      };

      // Add cron job if exists
      if (cronJobRecord) {
        releaseResponse.cronJob = {
          id: cronJobRecord.id,
          stage1Status: cronJobRecord.stage1Status,
          stage2Status: cronJobRecord.stage2Status,
          stage3Status: cronJobRecord.stage3Status,
          cronStatus: cronJobRecord.cronStatus,
          cronConfig: cronJobRecord.cronConfig,
          upcomingRegressions: cronJobRecord.upcomingRegressions,
          cronCreatedAt: cronJobRecord.cronCreatedAt.toISOString(),
          cronStoppedAt: cronJobRecord.cronStoppedAt ? cronJobRecord.cronStoppedAt.toISOString() : null,
          cronCreatedByAccountId: cronJobRecord.cronCreatedByAccountId,
          autoTransitionToStage2: cronJobRecord.autoTransitionToStage2,
          stageData: cronJobRecord.stageData
        };
      }

      // Optionally include tasks
      if (includeTasks) {
        const taskRecords = await this.releaseTaskRepo.findByReleaseId(release.id);
        releaseResponse.tasks = taskRecords.map(t => ({
          id: t.id,
          taskId: t.taskId,
          taskType: t.taskType,
          stage: t.stage,
          taskStatus: t.taskStatus,
          taskConclusion: t.taskConclusion,
          accountId: t.accountId,
          regressionId: t.regressionId,
          isReleaseKickOffTask: t.isReleaseKickOffTask,
          isRegressionSubTasks: t.isRegressionSubTasks,
          identifier: t.identifier,
          externalId: t.externalId,
          externalData: t.externalData,
          branch: t.branch,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString()
        }));
      }

      releaseResponses.push(releaseResponse);
    }

    return releaseResponses;
  }

  /**
   * Get a single release by ID with all details (always includes tasks)
   */
  async getReleaseById(releaseId: string): Promise<ReleaseResponseBody | null> {
    // Fetch release
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) return null;

    // Fetch platform-target mappings
    const mappings = await this.platformTargetMappingRepo.getByReleaseId(release.id);

    // Fetch cron job
    const cronJobRecord = await this.cronJobRepo.findByReleaseId(release.id);

    // Fetch tasks (always for single release detail)
    const taskRecords = await this.releaseTaskRepo.findByReleaseId(release.id);

    const releaseResponse: ReleaseResponseBody = {
      id: release.id,
      releaseId: release.releaseId,
      releaseConfigId: release.releaseConfigId,
      tenantId: release.tenantId,
      type: release.type,
      status: release.status,
      branch: release.branch,
      baseBranch: release.baseBranch,
      baseReleaseId: release.baseReleaseId,
      platformTargetMappings: mappings,
      kickOffReminderDate: release.kickOffReminderDate ? release.kickOffReminderDate.toISOString() : null,
      kickOffDate: release.kickOffDate ? release.kickOffDate.toISOString() : null,
      targetReleaseDate: release.targetReleaseDate ? release.targetReleaseDate.toISOString() : null,
      releaseDate: release.releaseDate ? release.releaseDate.toISOString() : null,
      hasManualBuildUpload: release.hasManualBuildUpload,
      createdByAccountId: release.createdByAccountId,
      releasePilotAccountId: release.releasePilotAccountId,
      lastUpdatedByAccountId: release.lastUpdatedByAccountId,
      createdAt: release.createdAt.toISOString(),
      updatedAt: release.updatedAt.toISOString(),
      tasks: taskRecords.map(t => ({
        id: t.id,
        taskId: t.taskId,
        taskType: t.taskType,
        stage: t.stage,
        taskStatus: t.taskStatus,
        taskConclusion: t.taskConclusion,
        accountId: t.accountId,
        regressionId: t.regressionId,
        isReleaseKickOffTask: t.isReleaseKickOffTask,
        isRegressionSubTasks: t.isRegressionSubTasks,
        identifier: t.identifier,
        externalId: t.externalId,
        externalData: t.externalData,
        branch: t.branch,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString()
      }))
    };

    // Add cron job if exists
    if (cronJobRecord) {
      releaseResponse.cronJob = {
        id: cronJobRecord.id,
        stage1Status: cronJobRecord.stage1Status,
        stage2Status: cronJobRecord.stage2Status,
        stage3Status: cronJobRecord.stage3Status,
        cronStatus: cronJobRecord.cronStatus,
        cronConfig: cronJobRecord.cronConfig,
        upcomingRegressions: cronJobRecord.upcomingRegressions,
        cronCreatedAt: cronJobRecord.cronCreatedAt.toISOString(),
        cronStoppedAt: cronJobRecord.cronStoppedAt ? cronJobRecord.cronStoppedAt.toISOString() : null,
        cronCreatedByAccountId: cronJobRecord.cronCreatedByAccountId,
        autoTransitionToStage2: cronJobRecord.autoTransitionToStage2,
        stageData: cronJobRecord.stageData
      };
    }

    return releaseResponse;
  }

  /**
   * Get tasks for a release with tenant ownership verification
   * @param releaseId - The release ID
   * @param tenantId - The tenant ID for ownership verification
   * @param stage - Optional stage filter
   */
  async getTasksForRelease(releaseId: string, tenantId: string, stage?: string): Promise<GetTasksResult> {
    // Verify release exists and belongs to tenant
    const release = await this.releaseRepo.findById(releaseId);

    if (!release) {
      return {
        success: false,
        error: 'Release not found',
        statusCode: 404
      };
    }

    if (release.tenantId !== tenantId) {
      return {
        success: false,
        error: 'Release does not belong to this tenant',
        statusCode: 403
      };
    }

    // Get tasks
    let tasks: ReleaseTask[];
    if (stage) {
      // Validate stage
      const validStages = Object.values(TaskStage);
      if (!validStages.includes(stage as TaskStage)) {
        return {
          success: false,
          error: `Invalid stage. Must be one of: ${validStages.join(', ')}`,
          statusCode: 400
        };
      }
      tasks = await this.releaseTaskRepo.findByReleaseIdAndStage(releaseId, stage as TaskStage);
    } else {
      tasks = await this.releaseTaskRepo.findByReleaseId(releaseId);
    }

    return {
      success: true,
      tasks,
      count: tasks.length
    };
  }

  /**
   * Get a specific task by ID with tenant and release ownership verification
   * @param taskId - The task ID
   * @param releaseId - The release ID for ownership verification
   * @param tenantId - The tenant ID for ownership verification
   */
  async getTaskById(taskId: string, releaseId: string, tenantId: string): Promise<GetTaskByIdResult> {
    // Verify release exists and belongs to tenant
    const release = await this.releaseRepo.findById(releaseId);

    if (!release) {
      return {
        success: false,
        error: 'Release not found',
        statusCode: 404
      };
    }

    if (release.tenantId !== tenantId) {
      return {
        success: false,
        error: 'Release does not belong to this tenant',
        statusCode: 403
      };
    }

    // Get task
    const task = await this.releaseTaskRepo.findById(taskId);

    if (!task) {
      return {
        success: false,
        error: 'Task not found',
        statusCode: 404
      };
    }

    // Verify task belongs to release
    if (task.releaseId !== releaseId) {
      return {
        success: false,
        error: 'Task does not belong to this release',
        statusCode: 403
      };
    }

    return {
      success: true,
      task
    };
  }
}
