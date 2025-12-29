import type { WhereOptions } from 'sequelize';
import type { Model } from 'sequelize';
import type { BuildModelType, BuildAttributes } from './build.sequelize.model';
import {
  type BuildPlatform,
  type StoreType,
  type BuildUploadStatus,
  type BuildType,
  type BuildStage,
  type WorkflowStatus,
  type CiRunType,
  BUILD_UPLOAD_STATUS
} from '~types/release-management/builds';
import { getTrimmedString, removeTrailingSlash } from '~utils/string.utils';

/**
 * Build database record type
 */
export type Build = BuildAttributes;

/**
 * DTO for creating a new build
 */
export type CreateBuildDto = {
  id: string;
  tenantId: string;
  releaseId: string;
  platform: BuildPlatform;
  buildType: BuildType;
  buildStage: BuildStage;
  buildNumber?: string | null;
  artifactVersionName?: string | null;
  artifactPath?: string | null;
  storeType?: StoreType | null;
  regressionId?: string | null;
  ciRunId?: string | null;
  buildUploadStatus?: BuildUploadStatus;
  queueLocation?: string | null;
  workflowStatus?: WorkflowStatus | null;
  ciRunType?: CiRunType | null;
  taskId?: string | null;
  internalTrackLink?: string | null;
  testflightNumber?: string | null;
};

/**
 * DTO for updating a build
 */
export type UpdateBuildDto = {
  buildNumber?: string | null;
  artifactVersionName?: string | null;
  artifactPath?: string | null;
  storeType?: StoreType | null;
  regressionId?: string | null;
  ciRunId?: string | null;
  buildUploadStatus?: BuildUploadStatus;
  queueLocation?: string | null;
  workflowStatus?: WorkflowStatus | null;
  ciRunType?: CiRunType | null;
  taskId?: string | null;
  internalTrackLink?: string | null;
  testflightNumber?: string | null;
};

export class BuildRepository {
  constructor(private readonly model: BuildModelType) {}

  private toPlainObject(instance: Model<BuildAttributes>): Build {
    return instance.toJSON() as Build;
  }

  /**
   * Create a new build record
   */
  async create(data: CreateBuildDto): Promise<Build> {
    const build = await this.model.create({
      id: data.id,
      tenantId: data.tenantId,
      releaseId: data.releaseId,
      platform: data.platform,
      buildType: data.buildType,
      buildStage: data.buildStage,
      buildNumber: data.buildNumber ?? null,
      artifactVersionName: data.artifactVersionName ?? null,
      artifactPath: data.artifactPath ?? null,
      storeType: data.storeType ?? null,
      regressionId: data.regressionId ?? null,
      ciRunId: data.ciRunId ? removeTrailingSlash(data.ciRunId) : null,
      buildUploadStatus: data.buildUploadStatus ?? 'PENDING',
      queueLocation: data.queueLocation ?? null,
      workflowStatus: data.workflowStatus ?? null,
      ciRunType: data.ciRunType ?? null,
      taskId: data.taskId ?? null,
      internalTrackLink: data.internalTrackLink ?? null,
      testflightNumber: data.testflightNumber ?? null
    });

    return this.toPlainObject(build);
  }

  /**
   * Find build by ID
   */
  async findById(id: string): Promise<Build | null> {
    const build = await this.model.findByPk(id);
    if (!build) return null;
    return this.toPlainObject(build);
  }

  /**
   * Find all builds for a release
   */
  async findByReleaseId(releaseId: string): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { releaseId },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find builds for a release and platform
   */
  async findByReleaseAndPlatform(releaseId: string, platform: BuildPlatform): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { releaseId, platform },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find builds for a release and stage
   * Used by API #2: Get Stage Tasks to fetch builds for all tasks in a stage
   */
  async findByReleaseIdAndStage(releaseId: string, buildStage: BuildStage): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { releaseId, buildStage },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find builds for a regression cycle
   */
  async findByRegressionId(regressionId: string): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { regressionId },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find build for a regression cycle and platform
   */
  async findByRegressionAndPlatform(regressionId: string, platform: BuildPlatform): Promise<Build | null> {
    const build = await this.model.findOne({
      where: { regressionId, platform }
    });
    if (!build) return null;
    return this.toPlainObject(build);
  }

  /**
   * Find all builds for a task (for platform-specific retry)
   */
  async findByTaskId(taskId: string): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { taskId },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find build for a task and platform
   */
  async findByTaskAndPlatform(taskId: string, platform: BuildPlatform): Promise<Build | null> {
    const build = await this.model.findOne({
      where: { taskId, platform }
    });
    if (!build) return null;
    return this.toPlainObject(build);
  }

  /**
   * Find build by taskId and queueLocation (unique combination)
   * Used by CI/CD callback handler to identify the specific build
   */
  async findByTaskAndQueueLocation(taskId: string, queueLocation: string): Promise<Build | null> {
    const build = await this.model.findOne({
      where: { taskId, queueLocation }
    });
    if (!build) return null;
    return this.toPlainObject(build);
  }

  /**
   * Find builds by workflow status (for callback handling)
   */
  async findByWorkflowStatus(workflowStatus: WorkflowStatus): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { workflowStatus },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find builds for a release with a specific workflow status.
   * Used by workflow polling service to find PENDING or RUNNING builds.
   */
  async findByReleaseAndWorkflowStatus(
    releaseId: string,
    workflowStatus: WorkflowStatus
  ): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { releaseId, workflowStatus },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find CI/CD builds for a release with a specific workflow status.
   * Filters to only buildType = 'CI_CD' (excludes MANUAL uploads).
   * Used by workflow polling service.
   */
  async findCiCdBuildsByReleaseAndWorkflowStatus(
    releaseId: string,
    workflowStatus: WorkflowStatus
  ): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { 
        releaseId, 
        workflowStatus,
        buildType: 'CI_CD'
      },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find builds awaiting completion for a task
   */
  async findPendingByTaskId(taskId: string): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { 
        taskId,
        workflowStatus: ['PENDING', 'RUNNING']
      },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find failed builds for a task (for retry)
   */
  async findFailedByTaskId(taskId: string): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { 
        taskId,
        workflowStatus: 'FAILED'
      },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Find completed builds for a task
   */
  async findCompletedByTaskId(taskId: string): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { 
        taskId,
        workflowStatus: 'COMPLETED'
      },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Update a build
   */
  async update(id: string, updates: UpdateBuildDto): Promise<void> {
    const { ciRunId, ...restUpdates } = updates;
    const ciRunIdNotProvided = ciRunId === undefined;
    const ciRunIdIsString = typeof ciRunId === 'string';
    
    const processedCiRunId = ciRunIdIsString
      ? removeTrailingSlash(ciRunId)
      : ciRunId;
    
    const updateData = ciRunIdNotProvided
      ? restUpdates
      : { ...restUpdates, ciRunId: processedCiRunId };
    
    await this.model.update(updateData, {
      where: { id }
    });
  }

  /**
   * Update workflow status for a build
   */
  async updateWorkflowStatus(id: string, workflowStatus: WorkflowStatus): Promise<void> {
    await this.model.update(
      { workflowStatus },
      { where: { id } }
    );
  }

  /**
   * Update build upload status
   */
  async updateBuildUploadStatus(id: string, buildUploadStatus: BuildUploadStatus): Promise<void> {
    await this.model.update(
      { buildUploadStatus },
      { where: { id } }
    );
  }

  /**
   * Delete failed builds for a task
   */
  async deleteFailedBuildsForTask(taskId: string, platforms?: BuildPlatform[]): Promise<number> {
    const where: WhereOptions<BuildAttributes> = { 
      taskId,
      workflowStatus: 'FAILED'
    };
    
    const hasPlatformFilter = platforms && platforms.length > 0;
    if (hasPlatformFilter) {
      where.platform = platforms;
    }

    const deletedCount = await this.model.destroy({ where });

    return deletedCount;
  }

  /**
   * Bulk create builds
   */
  async bulkCreate(data: CreateBuildDto[]): Promise<Build[]> {
    const builds = await this.model.bulkCreate(
      data.map(d => ({
        id: d.id,
        tenantId: d.tenantId,
        releaseId: d.releaseId,
        platform: d.platform,
        buildType: d.buildType,
        buildStage: d.buildStage,
        buildNumber: d.buildNumber ?? null,
        artifactVersionName: d.artifactVersionName ?? null,
        artifactPath: d.artifactPath ?? null,
        storeType: d.storeType ?? null,
        regressionId: d.regressionId ?? null,
        ciRunId: d.ciRunId ? removeTrailingSlash(d.ciRunId) : null,
        buildUploadStatus: d.buildUploadStatus ?? 'PENDING',
        queueLocation: d.queueLocation ?? null,
        workflowStatus: d.workflowStatus ?? null,
        ciRunType: d.ciRunType ?? null,
        taskId: d.taskId ?? null,
        internalTrackLink: d.internalTrackLink ?? null,
        testflightNumber: d.testflightNumber ?? null
      }))
    );
    return builds.map((b) => this.toPlainObject(b));
  }

  /**
   * Delete a build
   */
  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }

  /**
   * Check if all builds for a task are completed
   * Task is COMPLETED when ALL platforms have buildUploadStatus = UPLOADED
   * 
   * For CI_CD builds: workflowStatus should be COMPLETED (set by build system)
   * For MANUAL builds: workflowStatus is NULL, only buildUploadStatus matters
   */
  async areAllBuildsCompleted(taskId: string): Promise<boolean> {
    const builds = await this.findByTaskId(taskId);
    if (builds.length === 0) return true;
    
    // Task complete = ALL platforms have buildUploadStatus = UPLOADED
    return builds.every(b => b.buildUploadStatus === 'UPLOADED');
  }

  /**
   * Check if any build for a task has failed
   * Task is FAILED if:
   * - ANY platform has buildUploadStatus = FAILED, OR
   * - ANY CI_CD build has workflowStatus = FAILED (set by build system via callback)
   */
  async hasAnyBuildFailed(taskId: string): Promise<boolean> {
    const builds = await this.findByTaskId(taskId);
    return builds.some(b => 
      b.buildUploadStatus === 'FAILED' || 
      b.workflowStatus === 'FAILED'
    );
  }

  /**
   * Check if all CI/CD triggers succeeded (have queueLocation)
   * Used to determine if task can transition to AWAITING_CALLBACK
   */
  async allTriggersSucceeded(taskId: string): Promise<boolean> {
    const builds = await this.findByTaskId(taskId);
    const cicdBuilds = builds.filter(b => b.buildType === 'CI_CD');
    
    if (cicdBuilds.length === 0) return true;
    
    // All CI/CD builds must have queueLocation (trigger succeeded)
    return cicdBuilds.every(b => b.queueLocation !== null);
  }

  /**
   * Get aggregated status for a task's builds
   * Based on buildUploadStatus (primary) and workflowStatus (for CI_CD)
   */
  async getTaskBuildStatus(taskId: string): Promise<'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NO_BUILDS'> {
    const builds = await this.findByTaskId(taskId);
    
    if (builds.length === 0) return 'NO_BUILDS';
    
    // Check for failures first
    const hasAnyFailed = builds.some(b => 
      b.buildUploadStatus === 'FAILED' || 
      b.workflowStatus === 'FAILED'
    );
    if (hasAnyFailed) return 'FAILED';
    
    // Check if all uploaded
    const allUploaded = builds.every(b => b.buildUploadStatus === 'UPLOADED');
    if (allUploaded) return 'COMPLETED';
    
    // Check for running CI_CD builds
    const hasAnyRunning = builds.some(b => 
      b.buildType === 'CI_CD' && 
      b.workflowStatus === 'RUNNING'
    );
    if (hasAnyRunning) return 'RUNNING';
    
    return 'PENDING';
  }

  // ============================================================================
  // Methods migrated from models/build/build.repository.ts
  // ============================================================================

  /**
   * Find build by CI run ID.
   * Used by BuildArtifactService for CI/CD artifact uploads.
   */
  async findByCiRunId(ciRunId: string): Promise<Build | null> {
    ciRunId = removeTrailingSlash(ciRunId);
    const build = await this.model.findOne({
      where: { ciRunId }
    });
    if (!build) return null;
    return this.toPlainObject(build);
  }

  /**
   * Update internal track info (Play Store).
   * Sets internalTrackLink and buildNumber together.
   */
  async updateInternalTrackInfo(
    id: string,
    internalTrackLink: string,
    buildNumber: string
  ): Promise<void> {
    await this.model.update(
      { internalTrackLink, buildNumber },
      { where: { id } }
    );
  }

  /**
   * Update TestFlight build number.
   * Also updates buildNumber to match testflightNumber for consistency.
   */
  async updateTestflightNumber(id: string, testflightNumber: string): Promise<void> {
    await this.model.update(
      { testflightNumber, buildNumber: testflightNumber, buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED },
      { where: { id } }
    );
  }

  /**
   * Find builds with complex filtering.
   * All filters except tenantId and releaseId are optional.
   * Used by BuildArtifactService to list builds with various filter combinations.
   */
  async findBuilds(params: {
    tenantId: string;
    releaseId: string;
    platform?: string | null;
    buildStage?: string | null;
    storeType?: string | null;
    buildType?: string | null;
    regressionId?: string | null;
    taskId?: string | null;
    workflowStatus?: string | null;
    buildUploadStatus?: string | null;
  }): Promise<Build[]> {
    const {
      tenantId,
      releaseId,
      platform,
      buildStage,
      storeType,
      buildType,
      regressionId,
      taskId,
      workflowStatus,
      buildUploadStatus
    } = params;

    // Build where clause with required and optional filters
    const where: WhereOptions<BuildAttributes> = {
      tenantId,
      releaseId
    };

    // Optional filters - only add if provided
    const platformFilter = getTrimmedString(platform);
    if (platformFilter) {
      where.platform = platformFilter as BuildPlatform;
    }

    const buildStageFilter = getTrimmedString(buildStage);
    if (buildStageFilter) {
      where.buildStage = buildStageFilter as BuildStage;
    }

    const storeTypeFilter = getTrimmedString(storeType);
    if (storeTypeFilter) {
      where.storeType = storeTypeFilter as StoreType;
    }

    const buildTypeFilter = getTrimmedString(buildType);
    if (buildTypeFilter) {
      where.buildType = buildTypeFilter as BuildType;
    }

    const regressionIdFilter = getTrimmedString(regressionId);
    if (regressionIdFilter) {
      where.regressionId = regressionIdFilter;
    }

    const taskIdFilter = getTrimmedString(taskId);
    if (taskIdFilter) {
      where.taskId = taskIdFilter;
    }

    const workflowStatusFilter = getTrimmedString(workflowStatus);
    if (workflowStatusFilter) {
      where.workflowStatus = workflowStatusFilter as WorkflowStatus;
    }

    const buildUploadStatusFilter = getTrimmedString(buildUploadStatus);
    if (buildUploadStatusFilter) {
      where.buildUploadStatus = buildUploadStatusFilter as BuildUploadStatus;
    }

    const builds = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return builds.map((b) => this.toPlainObject(b));
  }
}
