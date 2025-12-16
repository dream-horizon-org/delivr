/**
 * Release Retrieval Service
 * 
 * Handles fetching release data with all related information
 */

import { ReleaseRepository } from '../../models/release/release.repository';
import { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import { RegressionCycleRepository } from '../../models/release/regression-cycle.repository';
import { BuildRepository, Build } from '../../models/release/build.repository';
import { ReleaseUploadsRepository, ReleaseUpload } from '../../models/release/release-uploads.repository';
import { TaskStage, ReleaseTask, Phase, ReleasePlatformTargetMapping } from '../../models/release/release.interface';
import { ReleaseConfigRepository } from '../../models/release-configs/release-config.repository';
import type { 
  ReleaseResponseBody, 
  ReleaseWithPlatformTargets, 
  BuildInfoResponse, 
  ReleaseTaskResponse,
  TaskOutput,
  ForkBranchTaskOutput,
  ProjectManagementTaskOutput,
  TestManagementTaskOutput,
  CreateRcTagTaskOutput,
  ReleaseNotesTaskOutput,
  CreateReleaseTagTaskOutput,
  FinalReleaseNotesTaskOutput,
  SinglePlatformBuildTaskOutput,
  AllPlatformsBuildTaskOutput,
  Platform
} from '~types/release';
import { ReleaseConfiguration } from '~types/release-configs';
import { SCMService } from '../integrations/scm/scm.service';
import { ProjectManagementTicketService } from '../integrations/project-management/ticket/ticket.service';
import { TestManagementRunService } from '../integrations/test-management/test-run/test-run.service';
import { Platform as PMPlatform } from '~types/integrations/project-management';

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
    return 'AWAITING_PRE_RELEASE';
  }

  // Stage 3 (Pre-Release)
  if (stage3Status === 'IN_PROGRESS') {
    return 'PRE_RELEASE';
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

/**
 * Derives the current active stage - simplified view of release progress
 * Returns null for terminal states (COMPLETED, ARCHIVED)
 * 
 * @param cronJob - Cron job data (optional)
 * @param releaseStatus - Release status
 * @returns ActiveStage - One of 7 possible values or null
 */
function deriveCurrentActiveStage(
  cronJob: any | undefined,
  releaseStatus: string
): 'PRE_KICKOFF' | 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE' | 'RELEASE_SUBMISSION' | 'RELEASE' | null {
  // Terminal states - return null
  if (releaseStatus === 'ARCHIVED' || releaseStatus === 'COMPLETED') {
    return null;
  }
  
  // SUBMITTED state - return RELEASE
  if (releaseStatus === 'SUBMITTED') {
    return 'RELEASE';
  }
  
  // No cron job - not started yet
  if (!cronJob) {
    return 'PRE_KICKOFF';
  }
  
  // Cron job exists but not started (check BEFORE stage statuses)
  if (cronJob.cronStatus === 'PENDING') {
    return 'PRE_KICKOFF';
  }
  
  // Check stage statuses in order (most specific first)
  if (cronJob.stage4Status === 'IN_PROGRESS') {
    return 'RELEASE_SUBMISSION';
  }
  
  if (cronJob.stage3Status === 'IN_PROGRESS') {
    return 'PRE_RELEASE';
  }
  
  if (cronJob.stage2Status === 'IN_PROGRESS') {
    return 'REGRESSION';
  }
  
  if (cronJob.stage1Status === 'IN_PROGRESS') {
    return 'KICKOFF';
  }
  
  // Between stages - show last completed stage
  if (cronJob.stage3Status === 'COMPLETED') {
    return 'PRE_RELEASE';  // Completed, awaiting submission
  }
  
  if (cronJob.stage2Status === 'COMPLETED' && cronJob.stage3Status === 'PENDING') {
    return 'REGRESSION';  // Regression done, awaiting post-regression trigger
  }
  
  if (cronJob.stage1Status === 'COMPLETED' && cronJob.stage2Status === 'PENDING') {
    return 'KICKOFF';  // Kickoff done, awaiting regression trigger
  }
  
  // Default fallback
  return 'PRE_KICKOFF';
}

/**
 * Derives the stage status from cronJob
 * Returns PENDING if no cronJob exists
 * 
 * @param cronJob - Cron job data (optional)
 * @param stage - Stage name (KICKOFF, REGRESSION, PRE_RELEASE)
 * @returns Stage status (PENDING, IN_PROGRESS, or COMPLETED)
 */
function deriveStageStatus(
  cronJob: any | undefined,
  stage: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE'
): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' {
  if (!cronJob) {
    return 'PENDING';
  }
  
  switch (stage) {
    case 'KICKOFF':
      return cronJob.stage1Status;
    case 'REGRESSION':
      return cronJob.stage2Status;
    case 'PRE_RELEASE':
      return cronJob.stage3Status;
    default:
      return 'PENDING';
  }
}

export type GetTasksResult = {
  success: true;
  stage: 'KICKOFF';
  releaseId: string;
  tasks: ReleaseTaskResponse[];
  uploadedBuilds: BuildInfoResponse[];
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
} | {
  success: true;
  stage: 'PRE_RELEASE';
  releaseId: string;
  tasks: ReleaseTaskResponse[];
  uploadedBuilds: BuildInfoResponse[];
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  approvalStatus: {
    canApprove: boolean;
    approvalRequirements: {
      projectManagementPassed: boolean;
    };
  };
} | {
  success: true;
  stage: 'REGRESSION';
  releaseId: string;
  tasks: ReleaseTaskResponse[];
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cycles: any[];
  uploadedBuilds: BuildInfoResponse[];
  currentCycle: any | null;
  approvalStatus: {
    canApprove: boolean;
    approvalRequirements: {
      testManagementPassed: boolean;
      cherryPickStatusOk: boolean;
      cyclesCompleted: boolean;
    };
  };
  upcomingSlot: any[] | null;
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
  private releaseStatusService?: any; // Optional - set after construction to avoid circular dependency

  constructor(
    private readonly releaseRepo: ReleaseRepository,
    private readonly platformTargetMappingRepo: ReleasePlatformTargetMappingRepository,
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository,
    private readonly regressionCycleRepo: RegressionCycleRepository,
    private readonly buildRepo: BuildRepository,
    private readonly releaseUploadsRepo: ReleaseUploadsRepository,
    private readonly releaseConfigRepo: ReleaseConfigRepository,
    private readonly scmService: SCMService,
    private readonly pmTicketService: ProjectManagementTicketService,
    private readonly testRunService: TestManagementRunService
  ) {}

  /**
   * Set ReleaseStatusService after construction (to avoid circular dependency)
   * @param service - ReleaseStatusService instance
   */
  setReleaseStatusService(service: any): void {
    this.releaseStatusService = service;
  }

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
          stage4Status: cronJobRecord.stage4Status,
          cronStatus: cronJobRecord.cronStatus,
          pauseType: cronJobRecord.pauseType ?? 'NONE',
          cronConfig: cronJobRecord.cronConfig,
          upcomingRegressions: cronJobRecord.upcomingRegressions,
          cronCreatedAt: cronJobRecord.cronCreatedAt.toISOString(),
          cronStoppedAt: cronJobRecord.cronStoppedAt ? cronJobRecord.cronStoppedAt.toISOString() : null,
          cronCreatedByAccountId: cronJobRecord.cronCreatedByAccountId,
          autoTransitionToStage2: cronJobRecord.autoTransitionToStage2,
          autoTransitionToStage3: cronJobRecord.autoTransitionToStage3,
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
          output: null,  // Not populated in list view for performance
          branch: t.branch,
          builds: [],  // Not populated in list view
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

    // Derive current active stage
    const currentActiveStage = deriveCurrentActiveStage(cronJobRecord, release.status);

    // Fetch latest regression cycle for phase derivation
    const latestCycle = await this.regressionCycleRepo.findLatest(release.id);
    const currentCycleStatus = latestCycle?.status ?? null;

    // Derive detailed release phase
    const releasePhase = cronJobRecord
      ? derivePhase({
          releaseStatus: release.status,
          stage1Status: cronJobRecord.stage1Status,
          stage2Status: cronJobRecord.stage2Status,
          stage3Status: cronJobRecord.stage3Status,
          stage4Status: cronJobRecord.stage4Status ?? 'PENDING',
          cronStatus: cronJobRecord.cronStatus,
          pauseType: cronJobRecord.pauseType ?? 'NONE',
          currentCycleStatus: currentCycleStatus,
          hasNextCycle: cronJobRecord.upcomingRegressions && cronJobRecord.upcomingRegressions.length > 0
        })
      : 'NOT_STARTED';

    const releaseResponse: ReleaseResponseBody = {
      id: release.id,
      releaseId: release.releaseId,
      releaseConfigId: release.releaseConfigId,
      tenantId: release.tenantId,
      type: release.type,
      status: release.status,
      currentActiveStage: currentActiveStage,
      releasePhase: releasePhase,
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
        output: null,  // Not populated in detail view (only in API #2 - stage tasks)
        branch: t.branch,
        builds: [],  // Not populated in detail view
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
        stage4Status: cronJobRecord.stage4Status,
        cronStatus: cronJobRecord.cronStatus,
        pauseType: cronJobRecord.pauseType ?? 'NONE',
        cronConfig: cronJobRecord.cronConfig,
        upcomingRegressions: cronJobRecord.upcomingRegressions,
        cronCreatedAt: cronJobRecord.cronCreatedAt.toISOString(),
        cronStoppedAt: cronJobRecord.cronStoppedAt ? cronJobRecord.cronStoppedAt.toISOString() : null,
        cronCreatedByAccountId: cronJobRecord.cronCreatedByAccountId,
        autoTransitionToStage2: cronJobRecord.autoTransitionToStage2,
        autoTransitionToStage3: cronJobRecord.autoTransitionToStage3,
        stageData: cronJobRecord.stageData
      };
    }

    return releaseResponse;
  }


  /**
   * Enrich tasks with builds and release uploads
   * @private
   */
  private async enrichTasksWithBuildsAndUploads(
    tasks: ReleaseTask[],
    allBuilds: Build[],
    allReleaseUploads: ReleaseUpload[],
    tenantId: string,
    releaseConfig: ReleaseConfiguration | null,
    platformMappings: ReleasePlatformTargetMapping[]
  ): Promise<{
    enrichedTasks: ReleaseTaskResponse[];
    topLevelUploadedBuilds: BuildInfoResponse[];
  }> {
    // Group builds by taskId
    const buildsByTaskId: Map<string, BuildInfoResponse[]> = new Map();
    allBuilds.forEach(build => {
      if (build.taskId) {
        const taskBuilds = buildsByTaskId.get(build.taskId) || [];
        taskBuilds.push({
          // Mandatory fields (in both builds and uploads)
          id: build.id,
          tenantId: build.tenantId,
          releaseId: build.releaseId,
          platform: build.platform,
          buildStage: build.buildStage,
          artifactPath: build.artifactPath,
          internalTrackLink: build.internalTrackLink,
          testflightNumber: build.testflightNumber,
          createdAt: build.createdAt.toISOString(),
          updatedAt: build.updatedAt.toISOString(),
          
          // Optional fields (builds-specific)
          buildType: build.buildType,
          buildUploadStatus: build.buildUploadStatus,
          storeType: build.storeType,
          buildNumber: build.buildNumber,
          artifactVersionName: build.artifactVersionName,
          regressionId: build.regressionId,
          ciRunId: build.ciRunId,
          queueLocation: build.queueLocation,
          workflowStatus: build.workflowStatus,
          ciRunType: build.ciRunType,
          taskId: build.taskId
          
          // isUsed, usedByTaskId: NOT sent for builds
        });
        buildsByTaskId.set(build.taskId, taskBuilds);
      }
    });

    // Convert unused uploads to BuildInfoResponse (top level only)
    const topLevelUploadedBuilds: BuildInfoResponse[] = [];

    allReleaseUploads.forEach(upload => {
      // Only include unused uploads in uploadedBuilds array
      const uploadIsUnused = !upload.isUsed || !upload.usedByTaskId;
      if (uploadIsUnused) {
        topLevelUploadedBuilds.push({
          // Mandatory fields (in both builds and uploads)
          id: upload.id,
          tenantId: upload.tenantId,
          releaseId: upload.releaseId,
          platform: upload.platform,
          buildStage: upload.stage,  // Map stage → buildStage
          artifactPath: upload.artifactPath,
          internalTrackLink: upload.internalTrackLink,
          testflightNumber: upload.testflightNumber,
          createdAt: upload.createdAt.toISOString(),
          updatedAt: upload.updatedAt.toISOString(),
          
          // Optional fields (uploads-specific)
          isUsed: upload.isUsed,
          usedByTaskId: upload.usedByTaskId
          
          // buildType, buildUploadStatus, etc.: NOT sent for uploads
        });
      }
    });

    // Enrich tasks with builds only (no releaseUploads) - use Promise.all for async output derivation
    const enrichedTasks: ReleaseTaskResponse[] = await Promise.all(tasks.map(async (t) => ({
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
      output: await this.deriveTaskOutput(t, tenantId, releaseConfig, platformMappings, allBuilds),
      branch: t.branch,
      builds: buildsByTaskId.get(t.id) || [],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    })));

    return { enrichedTasks, topLevelUploadedBuilds };
  }

  /**
   * Get tasks for a release with tenant ownership verification
   * API #2: GET /tenants/:tenantId/releases/:releaseId/tasks?stage={stage}
   * 
   * @param releaseId - The release ID
   * @param tenantId - The tenant ID for ownership verification
   * @param stage - Required stage filter (KICKOFF, REGRESSION, or PRE_RELEASE)
   */
  async getTasksForRelease(releaseId: string, tenantId: string, stage?: string): Promise<GetTasksResult> {
    // Verify release exists (releaseId is the primary key - releases.id)
    const release = await this.releaseRepo.findById(releaseId);

    if (!release) {
      return {
        success: false,
        error: 'Release not found',
        statusCode: 404
      };
    }

    // Stage parameter is required
    if (!stage) {
      return {
        success: false,
        error: 'Stage parameter is required. Must be one of: KICKOFF, REGRESSION, PRE_RELEASE',
        statusCode: 400
      };
    }

    // Strict validation: only accept KICKOFF, REGRESSION, PRE_RELEASE
    const validStages: Array<'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE'> = ['KICKOFF', 'REGRESSION', 'PRE_RELEASE'];
    if (!validStages.includes(stage as any)) {
      return {
        success: false,
        error: `Invalid stage. Must be one of: ${validStages.join(', ')}`,
        statusCode: 400
      };
    }

    const validatedStage = stage as 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE';

    // Fetch cronJob to derive stage status (use internal id for FK lookups)
    const cronJobRecord = await this.cronJobRepo.findByReleaseId(release.id);

    // Get tasks for the specified stage (use internal id for FK lookups)
    const tasks = await this.releaseTaskRepo.findByReleaseIdAndStage(release.id, validatedStage as TaskStage);

    // Derive stage status from cronJob
    const stageStatus = deriveStageStatus(cronJobRecord, validatedStage);

    // Fetch all builds and releaseUploads for this release and stage
    const allBuilds = await this.buildRepo.findByReleaseIdAndStage(release.id, validatedStage as any);
    const allReleaseUploads = await this.releaseUploadsRepo.findByReleaseAndStage(release.id, validatedStage as any);

    // Fetch releaseConfig and platformMappings for deriving task output
    const releaseConfig = release.releaseConfigId 
      ? await this.releaseConfigRepo.findById(release.releaseConfigId)
      : null;
    const platformMappings = await this.platformTargetMappingRepo.getByReleaseId(release.id);

    // Enrich tasks with builds and releaseUploads
    const { enrichedTasks, topLevelUploadedBuilds } = await this.enrichTasksWithBuildsAndUploads(
      tasks,
      allBuilds,
      allReleaseUploads,
      tenantId,
      releaseConfig,
      platformMappings
    );

    // For REGRESSION stage, add additional fields
    if (validatedStage === 'REGRESSION') {
      // 1. Query all regression cycles for this release (use internal id for FK lookups)
      const allCycles = await this.regressionCycleRepo.findByReleaseId(release.id);
      
      // Map cycles to response format
      const cycles = allCycles.map(cycle => ({
        id: cycle.id,
        releaseId: cycle.releaseId,
        isLatest: cycle.isLatest,
        status: cycle.status,
        cycleTag: cycle.cycleTag,
        createdAt: cycle.createdAt.toISOString(),
        completedAt: cycle.status === 'DONE' ? cycle.updatedAt.toISOString() : null
      }));

      // 2. Derive currentCycle (simple: just get the latest cycle)
      const currentCycle = allCycles.find(c => c.isLatest === true);

      const currentCycleResponse = currentCycle ? {
        id: currentCycle.id,
        releaseId: currentCycle.releaseId,
        isLatest: currentCycle.isLatest,
        status: currentCycle.status,
        cycleTag: currentCycle.cycleTag,
        createdAt: currentCycle.createdAt.toISOString(),
        completedAt: currentCycle.status === 'DONE' ? currentCycle.updatedAt.toISOString() : null
      } : null;

      // 3. Extract upcomingSlot from cronJob (pass as-is)
      const upcomingSlot = cronJobRecord?.upcomingRegressions || null;

      // 5. Calculate approvalStatus (Phase 3)
      let approvalStatus;
      if (this.releaseStatusService) {
        // Check cherry pick status (inverted - OK means NO cherry picks, use internal id)
        const hasCherryPicks = await this.releaseStatusService.cherryPickAvailable(tenantId, release.id);
        const cherryPickStatusOk = !hasCherryPicks;

        // Check if cycles are completed (no active cycles and no upcoming slots)
        // Active cycles are those with status IN_PROGRESS or NOT_STARTED
        const hasActiveCycle = allCycles.some(c => c.status === 'IN_PROGRESS' || c.status === 'NOT_STARTED');
        const hasUpcomingSlots = upcomingSlot !== null && upcomingSlot.length > 0;
        const cyclesCompleted = !hasActiveCycle && !hasUpcomingSlots;

        // Check if all platforms are passing test management thresholds (use internal id)
        const testManagementPassed = await this.releaseStatusService.allPlatformsPassingTestManagement(release.id);

        // Calculate canApprove (cherry picks OK AND cycles completed)
        const canApprove = cherryPickStatusOk && cyclesCompleted;

        approvalStatus = {
          canApprove,
          approvalRequirements: {
            testManagementPassed,
            cherryPickStatusOk,
            cyclesCompleted
          }
        };
      } else {
        // Fallback if ReleaseStatusService not available (should not happen)
        approvalStatus = {
          canApprove: false,
          approvalRequirements: {
            testManagementPassed: false,
            cherryPickStatusOk: false,
            cyclesCompleted: false
          }
        };
      }

      // Return REGRESSION-specific response
      return {
        success: true,
        stage: 'REGRESSION',
        releaseId: releaseId,
        tasks: enrichedTasks,
        stageStatus: stageStatus,
        cycles: cycles,
        uploadedBuilds: topLevelUploadedBuilds,
        currentCycle: currentCycleResponse,
        approvalStatus: approvalStatus,
        upcomingSlot: upcomingSlot
      };
    }

    // For PRE_RELEASE stage, add approval status
    if (validatedStage === 'PRE_RELEASE') {
      let approvalStatus;
      if (this.releaseStatusService) {
        // Check if all platforms are passing project management (tickets completed)
        const projectManagementPassed = await this.releaseStatusService.allPlatformsPassingProjectManagement(release.id);
        
        // Calculate canApprove (same as projectManagementPassed)
        const canApprove = projectManagementPassed;
        
        approvalStatus = {
          canApprove,
          approvalRequirements: {
            projectManagementPassed
          }
        };
      } else {
        // Fallback if ReleaseStatusService not available (should not happen)
        approvalStatus = {
          canApprove: false,
          approvalRequirements: {
            projectManagementPassed: false
          }
        };
      }
      
      // Return PRE_RELEASE-specific response
      return {
        success: true,
        stage: 'PRE_RELEASE',
        releaseId: releaseId,
        tasks: enrichedTasks,
        uploadedBuilds: topLevelUploadedBuilds,
        stageStatus: stageStatus,
        approvalStatus: approvalStatus
      };
    }
    
    // For KICKOFF stage, return basic response with uploadedBuilds
    return {
      success: true,
      stage: validatedStage,
      releaseId: releaseId,
      tasks: enrichedTasks,
      uploadedBuilds: topLevelUploadedBuilds,
      stageStatus: stageStatus
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

  /**
   * Derive structured output for a task based on its type and externalData
   * 
   * @param task - Task with externalData
   * @param tenantId - Tenant ID for service calls
   * @param releaseConfig - Release configuration (for PM/TM config IDs)
   * @param platformMappings - Platform mappings (for PM/TM ticket/run IDs)
   * @param allBuilds - All builds for this release/stage (for build tasks)
   * @returns Structured TaskOutput or null if not applicable
   */
  private async deriveTaskOutput(
    task: ReleaseTask,
    tenantId: string,
    releaseConfig: ReleaseConfiguration | null,
    platformMappings?: ReleasePlatformTargetMapping[],
    allBuilds?: Build[]
  ): Promise<TaskOutput | null> {
    // These tasks derive output from sources OTHER than externalData/externalId:
    // - Build tasks: Use builds table (filtered by taskId)
    // - PM tickets: Use platformMappings[].projectManagementRunId
    // - TM runs: Use platformMappings[].testManagementRunId
    const tasksWithoutExternalData = [
      'TRIGGER_PRE_REGRESSION_BUILDS',
      'TRIGGER_REGRESSION_BUILDS',
      'TRIGGER_TEST_FLIGHT_BUILD',
      'CREATE_AAB_BUILD',
      'CREATE_PROJECT_MANAGEMENT_TICKET',
      'CREATE_TEST_SUITE'
    ].includes(task.taskType);

    // Return null for other tasks without externalData/externalId
    if (!tasksWithoutExternalData && !task.externalData && !task.externalId) {
      return null;
    }

    try {
      switch (task.taskType) {
        case 'FORK_BRANCH':
          return await this.deriveForkBranchOutput(task, tenantId);
        
        case 'CREATE_PROJECT_MANAGEMENT_TICKET':
          return await this.deriveProjectManagementOutput(task, tenantId, releaseConfig, platformMappings);
        
        case 'CREATE_TEST_SUITE':
          return await this.deriveTestManagementOutput(task, tenantId, releaseConfig, platformMappings);
        
        case 'CREATE_RC_TAG':
          return await this.deriveCreateRcTagOutput(task, tenantId);
        
        case 'CREATE_RELEASE_NOTES':
          return await this.deriveReleaseNotesOutput(task, tenantId);
        
        case 'CREATE_RELEASE_TAG':
          return await this.deriveCreateReleaseTagOutput(task, tenantId);
        
        case 'CREATE_FINAL_RELEASE_NOTES':
          return await this.deriveFinalReleaseNotesOutput(task, tenantId);
        
        // Multi-platform build tasks
        case 'TRIGGER_PRE_REGRESSION_BUILDS':
        case 'TRIGGER_REGRESSION_BUILDS':
          return await this.deriveAllPlatformsBuildOutput(task, allBuilds);
        
        // Single-platform build tasks
        case 'TRIGGER_TEST_FLIGHT_BUILD':
        case 'CREATE_AAB_BUILD':
          return await this.deriveSinglePlatformBuildOutput(task, allBuilds);
        
        default:
          return null;
      }
    } catch (error) {
      console.error(`[ReleaseRetrievalService] Error deriving output for task ${task.id}:`, error);
      return null;
    }
  }

  /**
   * Derive output for FORK_BRANCH task
   */
  private async deriveForkBranchOutput(
    task: ReleaseTask,
    tenantId: string
  ): Promise<ForkBranchTaskOutput | null> {
    const externalData = task.externalData as { branchName?: string } | null;
    if (!externalData?.branchName) {
      return null;
    }

    try {
      const branchUrl = await this.scmService.getBranchUrl(tenantId, externalData.branchName);
      
      return {
        branchName: externalData.branchName,
        branchUrl
      };
    } catch (error) {
      console.error(`[ReleaseRetrievalService] Error deriving fork branch output:`, error);
      return null;
    }
  }

  /**
   * Derive output for CREATE_PROJECT_MANAGEMENT_TICKET task
   */
  private async deriveProjectManagementOutput(
    task: ReleaseTask,
    tenantId: string,
    releaseConfig: ReleaseConfiguration | null,
    platformMappings?: ReleasePlatformTargetMapping[]
  ): Promise<ProjectManagementTaskOutput | null> {
    if (!platformMappings || platformMappings.length === 0) {
      return null;
    }

    const pmConfigId = releaseConfig.projectManagementConfigId;
    if (!pmConfigId) {
      return null;
    }

    const platforms: Array<{ platform: string; ticketUrl: string }> = [];

    for (const mapping of platformMappings) {
      if (mapping.projectManagementRunId) {
        try {
          const ticketUrl = await this.pmTicketService.getTicketUrl({
            pmConfigId,
            platform: mapping.platform as PMPlatform,
            ticketKey: mapping.projectManagementRunId
          });

          platforms.push({
            platform: mapping.platform,
            ticketUrl
          });
        } catch (error) {
          console.error(`[ReleaseRetrievalService] Error getting ticket URL for platform ${mapping.platform}:`, error);
        }
      }
    }

    return platforms.length > 0 ? { platforms } : null;
  }

  /**
   * Derive output for CREATE_TEST_SUITE task
   */
  private async deriveTestManagementOutput(
    task: ReleaseTask,
    tenantId: string,
    releaseConfig: ReleaseConfiguration | null,
    platformMappings?: ReleasePlatformTargetMapping[]
  ): Promise<TestManagementTaskOutput | null> {
    if (!platformMappings || platformMappings.length === 0) {
      return null;
    }

    const testConfigId = releaseConfig.testManagementConfigId;
    if (!testConfigId) {
      return null;
    }

    const platforms: Array<{ platform: string; runId: string; runUrl: string }> = [];

    for (const mapping of platformMappings) {
      if (mapping.testManagementRunId) {
        try {
          const runUrl = await this.testRunService.getRunUrl({
            runId: mapping.testManagementRunId,
            testManagementConfigId: testConfigId
          });

          platforms.push({
            platform: mapping.platform,
            runId: mapping.testManagementRunId,
            runUrl
          });
        } catch (error) {
          console.error(`[ReleaseRetrievalService] Error getting run URL for platform ${mapping.platform}:`, error);
        }
      }
    }

    return platforms.length > 0 ? { platforms } : null;
  }

  /**
   * Derive output for CREATE_RC_TAG task
   */
  private async deriveCreateRcTagOutput(
    task: ReleaseTask,
    tenantId: string
  ): Promise<CreateRcTagTaskOutput | null> {
    const externalData = task.externalData as { tag?: string } | null;
    if (!externalData?.tag) {
      return null;
    }

    try {
      const tagUrl = await this.scmService.getTagUrl(tenantId, externalData.tag);
      
      return {
        tagName: externalData.tag,
        tagUrl
      };
    } catch (error) {
      console.error(`[ReleaseRetrievalService] Error deriving RC tag output:`, error);
      return null;
    }
  }

  /**
   * Derive output for CREATE_RELEASE_NOTES task (regression cycle notes)
   */
  private async deriveReleaseNotesOutput(
    task: ReleaseTask,
    tenantId: string
  ): Promise<ReleaseNotesTaskOutput | null> {
    const externalData = task.externalData as { currentTag?: string } | null;
    if (!externalData?.currentTag) {
      return null;
    }

    try {
      const tagUrl = await this.scmService.getTagUrl(tenantId, externalData.currentTag);
      
      return {
        tagUrl
      };
    } catch (error) {
      console.error(`[ReleaseRetrievalService] Error deriving release notes output:`, error);
      return null;
    }
  }

  /**
   * Derive output for CREATE_RELEASE_TAG task
   */
  private async deriveCreateReleaseTagOutput(
    task: ReleaseTask,
    tenantId: string
  ): Promise<CreateReleaseTagTaskOutput | null> {
    const externalData = task.externalData as { tagName?: string } | null;
    if (!externalData?.tagName) {
      return null;
    }

    try {
      const tagUrl = await this.scmService.getTagUrl(tenantId, externalData.tagName);
      
      return {
        tagName: externalData.tagName,
        tagUrl
      };
    } catch (error) {
      console.error(`[ReleaseRetrievalService] Error deriving create release tag output:`, error);
      return null;
    }
  }

  /**
   * Derive output for CREATE_FINAL_RELEASE_NOTES task
   */
  private async deriveFinalReleaseNotesOutput(
    task: ReleaseTask,
    tenantId: string
  ): Promise<FinalReleaseNotesTaskOutput | null> {
    const externalData = task.externalData as { currentTag?: string } | null;
    if (!externalData?.currentTag) {
      return null;
    }

    try {
      const tagUrl = await this.scmService.getTagUrl(tenantId, externalData.currentTag);
      
      return {
        tagUrl
      };
    } catch (error) {
      console.error(`[ReleaseRetrievalService] Error deriving final release notes output:`, error);
      return null;
    }
  }

  /**
   * Derive output for all-platforms build tasks
   * (TRIGGER_PRE_REGRESSION_BUILDS, TRIGGER_REGRESSION_BUILDS)
   * 
   * These tasks create multiple builds (one per platform)
   * We return jobUrl for each platform
   * 
   * @param task - Task with builds linked via taskId
   * @param allBuilds - All builds for this release/stage (filter by taskId)
   * @returns AllPlatformsBuildTaskOutput with platforms array
   */
  private async deriveAllPlatformsBuildOutput(
    task: ReleaseTask,
    allBuilds?: Build[]
  ): Promise<AllPlatformsBuildTaskOutput | null> {
    if (!allBuilds || allBuilds.length === 0) {
      return null;
    }

    try {
      // Filter builds for this task
      const taskBuilds = allBuilds.filter(build => build.taskId === task.id);
      
      if (taskBuilds.length === 0) {
        return null;
      }

      // Map each build to { platform, jobUrl }
      const platforms = taskBuilds.map(build => ({
        platform: build.platform,
        jobUrl: this.deriveJobUrl(build)
      }));

      return { platforms };
    } catch (error) {
      console.error(`[ReleaseRetrievalService] Error deriving all-platforms build output:`, error);
      return null;
    }
  }

  /**
   * Derive output for single-platform build tasks
   * (TRIGGER_TEST_FLIGHT_BUILD, CREATE_AAB_BUILD)
   * 
   * These tasks create one build per task
   * Build ID is stored in task.externalId
   * 
   * @param task - Task with build ID in externalId
   * @param allBuilds - All builds for this release/stage (find by ID)
   * @returns SinglePlatformBuildTaskOutput with single jobUrl
   */
  private async deriveSinglePlatformBuildOutput(
    task: ReleaseTask,
    allBuilds?: Build[]
  ): Promise<SinglePlatformBuildTaskOutput | null> {
    // Build ID stored in externalId
    const buildId = task.externalId;
    
    if (!buildId || !allBuilds || allBuilds.length === 0) {
      return { jobUrl: null };
    }

    try {
      // Find the build by ID
      const build = allBuilds.find(b => b.id === buildId);
      
      if (!build) {
        console.error(`[ReleaseRetrievalService] Build ${buildId} not found for task ${task.id}`);
        return { jobUrl: null };
      }

      // Derive jobUrl from build's CI/CD data
      const jobUrl = this.deriveJobUrl(build);
      
      return { jobUrl };
    } catch (error) {
      console.error(`[ReleaseRetrievalService] Error deriving single-platform build output:`, error);
      return { jobUrl: null };
    }
  }

  /**
   * Derive job URL from build's CI/CD data
   * 
   * For all CI/CD providers (Jenkins, GitHub Actions, etc.):
   * ciRunId IS the job URL - can be used directly
   * 
   * @param build - Build record with CI/CD data
   * @returns Job URL or null if not available
   */
  private deriveJobUrl(build: Build): string | null {
    // ciRunId IS the job URL for all providers
    // (Jenkins stores full job URL, GitHub Actions stores run URL, etc.)
    return build.ciRunId || null;
  }
}
