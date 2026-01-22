import { Op } from 'sequelize';
import type { RegressionCycleModelType, RegressionCycleAttributes, RegressionCycleStatus } from './regression-cycle.sequelize.model';

/**
 * Regression Cycle database record type
 */
export type RegressionCycle = RegressionCycleAttributes;

/**
 * DTO for creating a new regression cycle
 */
export type CreateRegressionCycleDto = {
  id: string;
  releaseId: string;
  isLatest?: boolean;
  status?: RegressionCycleStatus;
  cycleTag?: string | null;
};

/**
 * DTO for updating a regression cycle
 */
export type UpdateRegressionCycleDto = {
  isLatest?: boolean;
  status?: RegressionCycleStatus;
  cycleTag?: string | null;
};

export class RegressionCycleRepository {
  constructor(private readonly model: RegressionCycleModelType) {}

  private toPlainObject(instance: any): RegressionCycle {
    return instance.toJSON() as RegressionCycle;
  }

  /**
   * Create a new regression cycle
   * Automatically marks previous cycles as not latest
   */
  async create(data: CreateRegressionCycleDto): Promise<RegressionCycle> {
    // Mark all previous cycles as not latest and DONE
    await this.model.update(
      {
        isLatest: false,
        status: 'DONE'
      },
      {
        where: {
          releaseId: data.releaseId,
          isLatest: true
        }
      }
    );

    // Create new cycle
    const cycle = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      isLatest: data.isLatest ?? true,
      status: data.status ?? 'NOT_STARTED',
      cycleTag: data.cycleTag ?? null
    });

    return this.toPlainObject(cycle);
  }

  /**
   * Find regression cycle by ID
   */
  async findById(id: string): Promise<RegressionCycle | null> {
    const cycle = await this.model.findByPk(id);
    if (!cycle) return null;
    return this.toPlainObject(cycle);
  }

  /**
   * Find all regression cycles for a release
   */
  async findByReleaseId(releaseId: string): Promise<RegressionCycle[]> {
    const cycles = await this.model.findAll({
      where: { releaseId },
      order: [['createdAt', 'ASC']]
    });
    return cycles.map((c: any) => this.toPlainObject(c));
  }

  /**
   * Find the latest (current) regression cycle for a release
   */
  async findLatest(releaseId: string): Promise<RegressionCycle | null> {
    const cycle = await this.model.findOne({
      where: {
        releaseId,
        isLatest: true
      }
    });
    if (!cycle) return null;
    return this.toPlainObject(cycle);
  }

  /**
   * Find previous (completed) regression cycles for a release
   */
  async findPrevious(releaseId: string): Promise<RegressionCycle[]> {
    const cycles = await this.model.findAll({
      where: {
        releaseId,
        isLatest: false,
        status: 'DONE'
      },
      order: [['createdAt', 'DESC']]
    });
    return cycles.map((c: any) => this.toPlainObject(c));
  }

  /**
   * Update a regression cycle
   */
  async update(id: string, updates: UpdateRegressionCycleDto): Promise<void> {
    await this.model.update(updates, {
      where: { id }
    });
  }

  /**
   * Update the latest regression cycle status
   */
  async updateLatestStatus(releaseId: string, status: RegressionCycleStatus): Promise<RegressionCycle | null> {
    const cycle = await this.findLatest(releaseId);

    if (!cycle) {
      throw new Error(`No latest regression cycle found for release ${releaseId}`);
    }

    await this.update(cycle.id, { status });
    return this.findById(cycle.id);
  }

  /**
   * Get total cycle count for a release
   */
  async getCycleCount(releaseId: string): Promise<number> {
    const count = await this.model.count({
      where: { releaseId }
    });
    return count;
  }

  /**
   * Get RC tag count for a release (number of cycles with tags)
   */
  async getTagCount(releaseId: string): Promise<number> {
    const count = await this.model.count({
      where: {
        releaseId,
        cycleTag: { [Op.ne]: null }
      }
    });
    return count;
  }

  /**
   * Delete a regression cycle
   */
  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }
}

