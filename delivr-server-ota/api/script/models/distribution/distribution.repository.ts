import type { DistributionModelType } from './distribution.sequelize.model';
import type { Distribution, CreateDistributionDto, UpdateDistributionDto, DistributionFilters } from '~types/distribution/distribution.interface';

/**
 * Distribution Repository
 * Data access layer for distribution operations
 */
export class DistributionRepository {
  constructor(private readonly model: DistributionModelType) {}

  private toPlainObject(instance: any): Distribution {
    return instance.toJSON() as Distribution;
  }

  /**
   * Create a new distribution
   */
  async create(data: CreateDistributionDto): Promise<Distribution> {
    const distribution = await this.model.create({
      id: data.id,
      appId: data.appId,
      releaseId: data.releaseId,
      branch: data.branch,
      configuredListOfPlatforms: data.configuredListOfPlatforms,
      configuredListOfStoreTypes: data.configuredListOfStoreTypes,
      status: data.status ?? 'PENDING'
    });

    return this.toPlainObject(distribution);
  }

  /**
   * Find distribution by ID
   */
  async findById(id: string): Promise<Distribution | null> {
    const distribution = await this.model.findByPk(id);
    if (!distribution) return null;
    return this.toPlainObject(distribution);
  }

  /**
   * Find distribution by release ID
   */
  async findByReleaseId(releaseId: string): Promise<Distribution | null> {
    const distribution = await this.model.findOne({
      where: { releaseId }
    });
    if (!distribution) return null;
    return this.toPlainObject(distribution);
  }

  /**
   * Find all distributions with optional filters
   */
  async findAll(filters: DistributionFilters = {}): Promise<Distribution[]> {
    const where: Record<string, unknown> = {};

    if (filters.appId) {
      where.appId = filters.appId;
    }
    if (filters.releaseId) {
      where.releaseId = filters.releaseId;
    }
    if (filters.branch) {
      where.branch = filters.branch;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const distributions = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return distributions.map(d => this.toPlainObject(d));
  }

  /**
   * Find all distributions with pagination and optional filters
   */
  async findAllPaginated(
    filters: DistributionFilters = {},
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ distributions: Distribution[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (filters.appId) {
      where.appId = filters.appId;
    }
    if (filters.releaseId) {
      where.releaseId = filters.releaseId;
    }
    if (filters.branch) {
      where.branch = filters.branch;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const limit = Math.min(pageSize, 100); // Max 100 items per page
    const offset = (page - 1) * limit;

    const { rows, count } = await this.model.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return {
      distributions: rows.map(d => this.toPlainObject(d)),
      total: count
    };
  }

  /**
   * Find all distributions by app id
   */
  async findByAppId(appId: string): Promise<Distribution[]> {
    const distributions = await this.model.findAll({
      where: { appId },
      order: [['createdAt', 'DESC']]
    });

    return distributions.map(d => this.toPlainObject(d));
  }

  /**
   * Update distribution by ID
   */
  async update(id: string, data: UpdateDistributionDto): Promise<Distribution | null> {
    const distribution = await this.model.findByPk(id);
    if (!distribution) return null;

    await distribution.update({
      ...(data.branch && { branch: data.branch }),
      ...(data.configuredListOfPlatforms && { configuredListOfPlatforms: data.configuredListOfPlatforms }),
      ...(data.configuredListOfStoreTypes && { configuredListOfStoreTypes: data.configuredListOfStoreTypes }),
      ...(data.status && { status: data.status })
    });

    return this.toPlainObject(distribution);
  }

  /**
   * Delete distribution by ID
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.model.destroy({
      where: { id }
    });

    return deleted > 0;
  }

  /**
   * Count distributions by filters
   */
  async count(filters: DistributionFilters = {}): Promise<number> {
    const where: Record<string, unknown> = {};

    if (filters.appId) {
      where.appId = filters.appId;
    }
    if (filters.releaseId) {
      where.releaseId = filters.releaseId;
    }
    if (filters.branch) {
      where.branch = filters.branch;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    return await this.model.count({ where });
  }
}

