import { Model } from 'sequelize';
import { getTrimmedString } from '~utils/request.utils';
import type { BuildAttributes, BuildModelType } from './build.sequelize.model';

export class BuildRepository {
  private readonly model: BuildModelType;

  constructor(model: BuildModelType) {
    this.model = model;
  }

  async create(attributes: BuildAttributes): Promise<void> {
    await this.model.create(attributes);
  }

  async findByCiRunId(ciRunId: string): Promise<BuildAttributes | null> {
    const row = await this.model.findOne({
      where: { ciRunId }
    });
    if (!row) return null;
    return row.get() as unknown as BuildAttributes;
  }

  async updateArtifactPath(buildId: string, artifactPath: string): Promise<void> {
    await this.model.update(
      { artifactPath, updatedAt: new Date() },
      { where: { id: buildId } }
    );
  }

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
  }): Promise<BuildAttributes[]> {
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

    // Required filters
    const where: Record<string, unknown> = {
      tenantId,
      releaseId
    };

    // Optional filters - only add if provided
    const platformFilter = getTrimmedString(platform);
    if (platformFilter) {
      where['platform'] = platformFilter;
    }

    const buildStageFilter = getTrimmedString(buildStage);
    if (buildStageFilter) {
      where['buildStage'] = buildStageFilter;
    }

    const storeTypeFilter = getTrimmedString(storeType);
    if (storeTypeFilter) {
      where['storeType'] = storeTypeFilter;
    }

    const buildTypeFilter = getTrimmedString(buildType);
    if (buildTypeFilter) {
      where['buildType'] = buildTypeFilter;
    }

    const regressionIdFilter = getTrimmedString(regressionId);
    if (regressionIdFilter) {
      where['regressionId'] = regressionIdFilter;
    }

    const taskIdFilter = getTrimmedString(taskId);
    if (taskIdFilter) {
      where['taskId'] = taskIdFilter;
    }

    const workflowStatusFilter = getTrimmedString(workflowStatus);
    if (workflowStatusFilter) {
      where['workflowStatus'] = workflowStatusFilter;
    }

    const buildUploadStatusFilter = getTrimmedString(buildUploadStatus);
    if (buildUploadStatusFilter) {
      where['buildUploadStatus'] = buildUploadStatusFilter;
    }

    const rows = await this.model.findAll({
      attributes: [
        'id',
        'tenantId',
        'createdAt',
        'updatedAt',
        'artifactVersionCode',
        'artifactVersionName',
        'artifactPath',
        'releaseId',
        'platform',
        'storeType',
        'buildStage',
        'buildType',
        'buildUploadStatus',
        'workflowStatus',
        'regressionId',
        'ciRunId',
        'taskId',
        'internalTrackLink',
        'testflightNumber'
      ],
      where,
      order: [['createdAt', 'DESC']]
    });
    return rows.map(r => r.get() as unknown as BuildAttributes);
  }
}


