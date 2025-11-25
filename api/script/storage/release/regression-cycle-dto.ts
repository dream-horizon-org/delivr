/**
 * RegressionCycleDTO - Data Access Layer for Regression Cycles
 * 
 * Adapted from Delivr's RegressionCycle.service.ts for Sequelize ORM
 * 
 * Key Changes:
 * - Uses Sequelize (not Prisma)
 * - Uses accounts table (not User)
 * - Uses accountId (not userId)
 * - Build creation handled by task execution (not service method)
 */

import { v4 as uuidv4 } from 'uuid';
import { Sequelize, Op } from 'sequelize';
import { getStorage } from '../storage-instance';
import { RegressionCycleStatus } from './release-models';
import * as storageTypes from '../storage';

export interface CreateRegressionCycleData {
  releaseId: string;
  accountId: string;
  cycleTag?: string;
  status?: RegressionCycleStatus;
}

export interface UpdateRegressionCycleData {
  isLatest?: boolean;
  status?: RegressionCycleStatus;
  cycleTag?: string;
}

/**
 * Type guard to check if storage has Sequelize
 */
function hasSequelize(storage: storageTypes.Storage): storage is storageTypes.Storage & { sequelize: Sequelize } {
  return 'sequelize' in storage && storage.sequelize instanceof Sequelize;
}

export class RegressionCycleDTO {
  private get sequelize(): Sequelize {
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error('Storage does not have Sequelize instance');
    }
    return storage.sequelize;
  }

  private get RegressionCycleModel() {
    return this.sequelize.models.regressionCycle;
  }

  /**
   * Parse regression cycle from database record
   */
  private parseRegressionCycle(cycle: any): any {
    if (!cycle) {
      return null;
    }

    return {
      id: cycle.id,
      releaseId: cycle.releaseId,
      isLatest: cycle.isLatest ?? true,
      status: cycle.status || RegressionCycleStatus.NOT_STARTED,
      cycleTag: cycle.cycleTag,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt
    };
  }

  /**
   * Create a new regression cycle
   * 
   * Key Logic:
   * - Marks previous cycles as isLatest: false, status: DONE
   * - Creates new cycle with isLatest: true, status: NOT_STARTED
   */
  async create(data: CreateRegressionCycleData): Promise<any> {
    const cycleId = uuidv4();

    // Mark all previous cycles as not latest and DONE
    await this.RegressionCycleModel.update(
      {
        isLatest: false,
        status: RegressionCycleStatus.DONE
      },
      {
        where: {
          releaseId: data.releaseId,
          isLatest: true
        }
      }
    );

    // Create new cycle
    const cycleData = {
      id: cycleId,
      releaseId: data.releaseId,
      isLatest: true,
      status: data.status || RegressionCycleStatus.NOT_STARTED,
      cycleTag: data.cycleTag || null
    };

    const cycle = await this.RegressionCycleModel.create(cycleData);
    return this.parseRegressionCycle(cycle.toJSON());
  }

  /**
   * Get regression cycle by ID
   */
  async get(cycleId: string): Promise<any> {
    const cycle = await this.RegressionCycleModel.findByPk(cycleId);

    if (!cycle) {
      return null;
    }

    return this.parseRegressionCycle(cycle.toJSON());
  }

  /**
   * Get all regression cycles for a release
   */
  async getByRelease(releaseId: string): Promise<any[]> {
    const cycles = await this.RegressionCycleModel.findAll({
      where: { releaseId },
      order: [['createdAt', 'ASC']]
    });

    return cycles.map(cycle => this.parseRegressionCycle(cycle.toJSON()));
  }

  /**
   * Get the latest (current) regression cycle for a release
   */
  async getLatest(releaseId: string): Promise<any> {
    const cycle = await this.RegressionCycleModel.findOne({
      where: {
        releaseId,
        isLatest: true
      }
    });

    if (!cycle) {
      return null;
    }

    return this.parseRegressionCycle(cycle.toJSON());
  }

  /**
   * Get previous (completed) regression cycles for a release
   */
  async getPrevious(releaseId: string): Promise<any[]> {
    const cycles = await this.RegressionCycleModel.findAll({
      where: {
        releaseId,
        isLatest: false,
        status: RegressionCycleStatus.DONE
      },
      order: [['createdAt', 'DESC']]
    });

    return cycles.map(cycle => this.parseRegressionCycle(cycle.toJSON()));
  }

  /**
   * Update regression cycle
   */
  async update(cycleId: string, data: UpdateRegressionCycleData): Promise<any> {
    const updateData: Record<string, unknown> = {};

    if (data.isLatest !== undefined) {
      updateData.isLatest = data.isLatest;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.cycleTag !== undefined) {
      updateData.cycleTag = data.cycleTag;
    }

    await this.RegressionCycleModel.update(updateData, {
      where: { id: cycleId }
    });

    return this.get(cycleId);
  }

  /**
   * Update the latest regression cycle status
   */
  async updateLatestRegressionStatus(releaseId: string, status: RegressionCycleStatus): Promise<any> {
    const cycle = await this.getLatest(releaseId);

    if (!cycle) {
      throw new Error(`No latest regression cycle found for release ${releaseId}`);
    }

    return this.update(cycle.id, { status });
  }

  /**
   * Get total cycle count for a release
   */
  async getCycleCount(releaseId: string): Promise<number> {
    const count = await this.RegressionCycleModel.count({
      where: { releaseId }
    });

    return count;
  }

  /**
   * Get RC tag count for a release (number of cycles with tags)
   */
  async getTagCount(releaseId: string): Promise<number> {
    const count = await this.RegressionCycleModel.count({
      where: {
        releaseId,
        cycleTag: { [Op.ne]: null }
      }
    });

    return count;
  }
}

