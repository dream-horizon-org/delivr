import { Model } from 'sequelize';
import { getOptionalTrimmedString } from '~utils/request.utils';
import type { BuildAttributes, BuildModelType } from './build.sequelize.model';

export class BuildRepository {
  private readonly model: BuildModelType;

  constructor(model: BuildModelType) {
    this.model = model;
  }

  async create(attributes: BuildAttributes): Promise<void> {
    await this.model.create(attributes);
  }

  async findArtifactPaths(params: {
    tenantId: string;
    releaseId: string;
    platform: 'ANDROID' | 'IOS';
  }): Promise<string[]> {
    const { tenantId, releaseId, platform } = params;
    const rows = await this.model.findAll({
      attributes: ['artifact_path'],
      where: {
        tenant_id: tenantId,
        release_id: releaseId,
        platform
      }
    });
    const paths: string[] = [];
    for (const row of rows) {
      const data = row.get() as unknown as BuildAttributes;
      const pathValue = data.artifact_path ?? null;
      const hasPath = typeof pathValue === 'string' && pathValue.trim().length > 0;
      if (hasPath) {
        paths.push(pathValue);
      }
    }
    return paths;
  }

  async findByCiRunId(ciRunId: string): Promise<BuildAttributes | null> {
    const row = await this.model.findOne({
      where: { ci_run_id: ciRunId }
    });
    if (!row) return null;
    return row.get() as unknown as BuildAttributes;
  }

  async updateArtifactPath(buildId: string, artifactPath: string): Promise<void> {
    await this.model.update(
      { artifact_path: artifactPath, updated_at: new Date() as unknown as any },
      { where: { id: buildId } }
    );
  }

  async findBuilds(params: {
    tenantId: string;
    releaseId: string;
    platform: 'ANDROID' | 'IOS';
    regressionId?: string | null;
  }): Promise<BuildAttributes[]> {
    const { tenantId, releaseId, platform, regressionId } = params;
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      release_id: releaseId,
      platform
    };
    const hasRegressionFilter = getOptionalTrimmedString(regressionId);
    if (hasRegressionFilter) {
      where['regression_id'] = hasRegressionFilter;
    }

    const rows = await this.model.findAll({
      attributes: [
        'id',
        'tenant_id',
        'created_at',
        'updated_at',
        'artifact_version_code',
        'artifact_version_name',
        'artifact_path',
        'release_id',
        'platform',
        'storeType',
        'regression_id',
        'ci_run_id'
      ],
      where
    });
    return rows.map(r => r.get() as unknown as BuildAttributes);
  }
}


