/**
 * Release Retrieval Service
 * 
 * Handles fetching release data with all related information
 */

import { ReleaseRepository } from '../../models/release/release.repository';
import { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import { ReleaseResponseBody } from '../../routes/release/release-types';

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
  async getAllReleases(tenantId: string, includeTasks = false): Promise<ReleaseResponseBody[]> {
    // Fetch all releases for the tenant
    const releases = await this.releaseRepo.findAllByTenantId(tenantId);

    // Fetch related data for each release
    const releasesWithDetails = await Promise.all(
      releases.map(async (release): Promise<ReleaseResponseBody> => {
        // Fetch platform-target mappings
        const mappingRecords = await this.platformTargetMappingRepo.getByReleaseId(release.id);
        
        // Extract unique platforms and targets
        const platforms = [...new Set(mappingRecords.map(m => m.platform))];
        const targets = [...new Set(mappingRecords.map(m => m.target))];
        
        // Build platformVersions map (platform -> version)
        // Note: If same platform has multiple targets with different versions, last one wins
        const platformVersions: Record<string, string> = {};
        mappingRecords.forEach(m => {
          platformVersions[m.platform] = m.version;
        });

        // Fetch cron job
        const cronJobRecord = await this.cronJobRepo.findByReleaseId(release.id);

        // Base release response
        const releaseResponse: ReleaseResponseBody = {
          id: release.id,
          releaseKey: release.releaseKey,
          tenantId: release.tenantId,
          type: release.type,
          status: release.status,
          platforms,
          platformVersions,
          targets,
          targetReleaseDate: release.targetReleaseDate.toISOString(),
          plannedDate: release.plannedDate.toISOString(),
          baseBranch: release.baseBranch,
          baseVersion: release.baseVersion,
          parentId: release.parentId,
          releasePilotAccountId: release.releasePilotAccountId,
          createdByAccountId: release.createdByAccountId,
          lastUpdateByAccountId: release.lastUpdateByAccountId,
          kickOffReminderDate: release.kickOffReminderDate ? release.kickOffReminderDate.toISOString() : null,
          branchRelease: release.branchRelease,
          customIntegrationConfigs: release.customIntegrationConfigs,
          regressionBuildSlots: release.regressionBuildSlots,
          preCreatedBuilds: release.preCreatedBuilds,
          hasManualBuildUpload: release.hasManualBuildUpload,
          createdAt: release.createdAt.toISOString(),
          updatedAt: release.updatedAt.toISOString()
        };

        // Add cron job if exists
        if (cronJobRecord) {
          releaseResponse.cronJob = {
            stage1Status: cronJobRecord.stage1Status,
            stage2Status: cronJobRecord.stage2Status,
            stage3Status: cronJobRecord.stage3Status,
            cronStatus: cronJobRecord.cronStatus,
            cronConfig: cronJobRecord.cronConfig,
            upcomingRegressions: cronJobRecord.upcomingRegressions,
            regressionTimings: cronJobRecord.regressionTimings,
            autoTransitionToStage3: cronJobRecord.autoTransitionToStage3
          };
        }

        // Fetch tasks if requested
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

        return releaseResponse;
      })
    );

    return releasesWithDetails;
  }

  /**
   * Get a single release by ID with complete details (always includes tasks)
   */
  async getReleaseById(releaseId: string): Promise<ReleaseResponseBody | null> {
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return null;
    }

    // Fetch platform-target mappings
    const mappingRecords = await this.platformTargetMappingRepo.getByReleaseId(release.id);
    
    // Extract unique platforms and targets
    const platforms = [...new Set(mappingRecords.map(m => m.platform))];
    const targets = [...new Set(mappingRecords.map(m => m.target))];
    
    // Build platformVersions map (platform -> version)
    const platformVersions: Record<string, string> = {};
    mappingRecords.forEach(m => {
      platformVersions[m.platform] = m.version;
    });

    // Fetch cron job
    const cronJobRecord = await this.cronJobRepo.findByReleaseId(release.id);

    // Fetch tasks (always for single release detail)
    const taskRecords = await this.releaseTaskRepo.findByReleaseId(release.id);

    const releaseResponse: ReleaseResponseBody = {
      id: release.id,
      releaseKey: release.releaseKey,
      tenantId: release.tenantId,
      type: release.type,
      status: release.status,
      platforms,
      platformVersions,
      targets,
      targetReleaseDate: release.targetReleaseDate.toISOString(),
      plannedDate: release.plannedDate.toISOString(),
      baseBranch: release.baseBranch,
      baseVersion: release.baseVersion,
      parentId: release.parentId,
      releasePilotAccountId: release.releasePilotAccountId,
      createdByAccountId: release.createdByAccountId,
      lastUpdateByAccountId: release.lastUpdateByAccountId,
      kickOffReminderDate: release.kickOffReminderDate ? release.kickOffReminderDate.toISOString() : null,
      branchRelease: release.branchRelease,
      customIntegrationConfigs: release.customIntegrationConfigs,
      regressionBuildSlots: release.regressionBuildSlots,
      preCreatedBuilds: release.preCreatedBuilds,
      hasManualBuildUpload: release.hasManualBuildUpload,
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
        stage1Status: cronJobRecord.stage1Status,
        stage2Status: cronJobRecord.stage2Status,
        stage3Status: cronJobRecord.stage3Status,
        cronStatus: cronJobRecord.cronStatus,
        cronConfig: cronJobRecord.cronConfig,
        upcomingRegressions: cronJobRecord.upcomingRegressions,
        regressionTimings: cronJobRecord.regressionTimings,
        autoTransitionToStage3: cronJobRecord.autoTransitionToStage3
      };
    }

    return releaseResponse;
  }
}

