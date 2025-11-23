/**
 * Release Retrieval Service
 * 
 * Handles fetching release data with all related information
 */

import { ReleaseRepository } from '../../models/release/release.repository';
import { ReleaseToPlatformsRepository } from '../../models/release/release-to-platforms.repository';
import { ReleaseToTargetsRepository } from '../../models/release/release-to-targets.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';

export interface ReleaseTask {
  id: string;
  taskId: string;
  taskType: string;
  stage: string;
  taskStatus: string;
  taskConclusion: string | null;
  accountId: string | null;
  regressionId: string | null;
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: string | null;
  externalId: string | null;
  externalData: Record<string, unknown> | null;
  branch: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReleaseWithDetails {
  id: string;
  releaseKey: string;
  tenantId: string;
  type: string;
  status: string;
  platforms: string[];
  platformVersions: Record<string, string>;
  targets: string[];
  targetReleaseDate: Date;
  plannedDate: Date;
  baseBranch: string | null;
  baseVersion: string;
  parentId: string | null;
  releasePilotAccountId: string;
  createdByAccountId: string | null;
  lastUpdateByAccountId: string;
  kickOffReminderDate: Date | null;
  branchRelease: string | null;
  customIntegrationConfigs: Record<string, unknown> | null;
  regressionBuildSlots: any[] | null;
  preCreatedBuilds: any[] | null;
  createdAt: Date;
  updatedAt: Date;
  cronJob: {
    stage1Status: string;
    stage2Status: string;
    stage3Status: string;
    cronStatus: string;
    cronConfig: Record<string, unknown>;
    upcomingRegressions: any[] | null;
    regressionTimings: string;
    autoTransitionToStage3: boolean;
  } | null;
  tasks?: ReleaseTask[];
}

export class ReleaseRetrievalService {
  constructor(
    private readonly releaseRepo: ReleaseRepository,
    private readonly releaseToPlatformsRepo: ReleaseToPlatformsRepository,
    private readonly releaseToTargetsRepo: ReleaseToTargetsRepository,
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository
  ) {}

  /**
   * Get all releases for a tenant with complete details
   * @param includeTasks - Optional flag to include tasks (default: false for performance)
   */
  async getAllReleases(tenantId: string, includeTasks = false): Promise<ReleaseWithDetails[]> {
    // Fetch all releases for the tenant
    const releases = await this.releaseRepo.findAllByTenantId(tenantId);

    // Fetch related data for each release
    const releasesWithDetails = await Promise.all(
      releases.map(async (release) => {
        // Fetch platforms with versions
        const platformRecords = await this.releaseToPlatformsRepo.getByReleaseId(release.id);
        const platforms = platformRecords.map(p => p.platform);
        const platformVersions: Record<string, string> = {};
        platformRecords.forEach(p => {
          platformVersions[p.platform] = p.version;
        });

        // Fetch targets
        const targetRecords = await this.releaseToTargetsRepo.getByReleaseId(release.id);
        const targets = targetRecords.map(t => t.target);

        // Fetch cron job
        const cronJobRecord = await this.cronJobRepo.findByReleaseId(release.id);
        const cronJob = cronJobRecord ? {
          stage1Status: cronJobRecord.stage1Status,
          stage2Status: cronJobRecord.stage2Status,
          stage3Status: cronJobRecord.stage3Status,
          cronStatus: cronJobRecord.cronStatus,
          cronConfig: cronJobRecord.cronConfig,
          upcomingRegressions: cronJobRecord.upcomingRegressions,
          regressionTimings: cronJobRecord.regressionTimings,
          autoTransitionToStage3: cronJobRecord.autoTransitionToStage3
        } : null;

        // Fetch tasks if requested
        let tasks: ReleaseTask[] | undefined;
        if (includeTasks) {
          const taskRecords = await this.releaseTaskRepo.findByReleaseId(release.id);
          tasks = taskRecords.map(t => ({
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
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
          }));
        }

        return {
          id: release.id,
          releaseKey: release.releaseKey,
          tenantId: release.tenantId,
          type: release.type,
          status: release.status,
          platforms,
          platformVersions,
          targets,
          targetReleaseDate: release.targetReleaseDate,
          plannedDate: release.plannedDate,
          baseBranch: release.baseBranch,
          baseVersion: release.baseVersion,
          parentId: release.parentId,
          releasePilotAccountId: release.releasePilotAccountId,
          createdByAccountId: release.createdByAccountId,
          lastUpdateByAccountId: release.lastUpdateByAccountId,
          kickOffReminderDate: release.kickOffReminderDate,
          branchRelease: release.branchRelease,
          customIntegrationConfigs: release.customIntegrationConfigs,
          regressionBuildSlots: release.regressionBuildSlots,
          preCreatedBuilds: release.preCreatedBuilds,
          createdAt: release.createdAt,
          updatedAt: release.updatedAt,
          cronJob,
          ...(tasks && { tasks })
        };
      })
    );

    return releasesWithDetails;
  }

  /**
   * Get a single release by ID with complete details (always includes tasks)
   */
  async getReleaseById(releaseId: string): Promise<ReleaseWithDetails | null> {
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return null;
    }

    // Fetch platforms with versions
    const platformRecords = await this.releaseToPlatformsRepo.getByReleaseId(release.id);
    const platforms = platformRecords.map(p => p.platform);
    const platformVersions: Record<string, string> = {};
    platformRecords.forEach(p => {
      platformVersions[p.platform] = p.version;
    });

    // Fetch targets
    const targetRecords = await this.releaseToTargetsRepo.getByReleaseId(release.id);
    const targets = targetRecords.map(t => t.target);

    // Fetch cron job
    const cronJobRecord = await this.cronJobRepo.findByReleaseId(release.id);
    const cronJob = cronJobRecord ? {
      stage1Status: cronJobRecord.stage1Status,
      stage2Status: cronJobRecord.stage2Status,
      stage3Status: cronJobRecord.stage3Status,
      cronStatus: cronJobRecord.cronStatus,
      cronConfig: cronJobRecord.cronConfig,
      upcomingRegressions: cronJobRecord.upcomingRegressions,
      regressionTimings: cronJobRecord.regressionTimings,
      autoTransitionToStage3: cronJobRecord.autoTransitionToStage3
    } : null;

    // Fetch tasks (always for single release detail)
    const taskRecords = await this.releaseTaskRepo.findByReleaseId(release.id);
    const tasks: ReleaseTask[] = taskRecords.map(t => ({
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
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      id: release.id,
      releaseKey: release.releaseKey,
      tenantId: release.tenantId,
      type: release.type,
      status: release.status,
      platforms,
      platformVersions,
      targets,
      targetReleaseDate: release.targetReleaseDate,
      plannedDate: release.plannedDate,
      baseBranch: release.baseBranch,
      baseVersion: release.baseVersion,
      parentId: release.parentId,
      releasePilotAccountId: release.releasePilotAccountId,
      createdByAccountId: release.createdByAccountId,
      lastUpdateByAccountId: release.lastUpdateByAccountId,
      kickOffReminderDate: release.kickOffReminderDate,
      branchRelease: release.branchRelease,
      customIntegrationConfigs: release.customIntegrationConfigs,
      regressionBuildSlots: release.regressionBuildSlots,
      preCreatedBuilds: release.preCreatedBuilds,
      createdAt: release.createdAt,
      updatedAt: release.updatedAt,
      cronJob,
      tasks
    };
  }
}

