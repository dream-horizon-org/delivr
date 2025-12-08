import type { BuildModelType, BuildAttributes, PlatformName, TargetName } from './build.sequelize.model';

/**
 * Build database record type
 */
export type Build = BuildAttributes;

/**
 * DTO for creating a new build
 */
export type CreateBuildDto = {
  id: string;
  number: string;
  link?: string | null;
  releaseId: string;
  platform: PlatformName;
  target?: TargetName | null;
  regressionId?: string | null;
};

/**
 * DTO for updating a build
 */
export type UpdateBuildDto = {
  number?: string;
  link?: string | null;
  target?: TargetName | null;
  regressionId?: string | null;
};

export class BuildRepository {
  constructor(private readonly model: BuildModelType) {}

  private toPlainObject(instance: any): Build {
    return instance.toJSON() as Build;
  }

  /**
   * Create a new build record
   */
  async create(data: CreateBuildDto): Promise<Build> {
    const build = await this.model.create({
      id: data.id,
      number: data.number,
      link: data.link ?? null,
      releaseId: data.releaseId,
      platform: data.platform,
      target: data.target ?? null,
      regressionId: data.regressionId ?? null
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
    return builds.map((b: any) => this.toPlainObject(b));
  }

  /**
   * Find builds for a release and platform
   */
  async findByReleaseAndPlatform(releaseId: string, platform: PlatformName): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { releaseId, platform },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b: any) => this.toPlainObject(b));
  }

  /**
   * Find builds for a regression cycle
   */
  async findByRegressionId(regressionId: string): Promise<Build[]> {
    const builds = await this.model.findAll({
      where: { regressionId },
      order: [['createdAt', 'ASC']]
    });
    return builds.map((b: any) => this.toPlainObject(b));
  }

  /**
   * Find build for a regression cycle and platform (unique combination)
   */
  async findByRegressionAndPlatform(regressionId: string, platform: PlatformName): Promise<Build | null> {
    const build = await this.model.findOne({
      where: { regressionId, platform }
    });
    if (!build) return null;
    return this.toPlainObject(build);
  }

  /**
   * Update a build
   */
  async update(id: string, updates: UpdateBuildDto): Promise<void> {
    await this.model.update(updates, {
      where: { id }
    });
  }

  /**
   * Bulk create builds
   */
  async bulkCreate(data: CreateBuildDto[]): Promise<Build[]> {
    const builds = await this.model.bulkCreate(
      data.map(d => ({
        id: d.id,
        number: d.number,
        link: d.link ?? null,
        releaseId: d.releaseId,
        platform: d.platform,
        target: d.target ?? null,
        regressionId: d.regressionId ?? null
      }))
    );
    return builds.map((b: any) => this.toPlainObject(b));
  }

  /**
   * Delete a build
   */
  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }
}

