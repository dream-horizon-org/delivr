/**
 * ReleaseDTO - Data Access Layer for Releases
 * 
 * Adapted from Delivr's Release.dto.ts for Sequelize ORM
 * 
 * Key Changes:
 * - Uses Sequelize (not Prisma)
 * - Uses accounts table (not User/UserProfile)
 * - Uses accountId (not userId)
 * - Added stageData support
 * - Added regressionBuildSlots support
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorage } from '../storage-instance';
import { ReleaseStatus, ReleaseType } from './release-models';

export interface CreateReleaseData {
  tenantId: string;
  accountId: string; // Creator account ID
  version: string;
  type: ReleaseType;
  targetReleaseDate: Date;
  plannedDate: Date;
  baseBranch: string;
  releasePilotAccountId: string;
  // Optional fields
  releaseConfigId?: string; // FK to release_configs table
  regressionBuildSlots?: Array<{ date: Date; config: any }>;
  stageData?: any;
  baseVersion?: string;
  kickOffReminderDate?: Date;
  parentId?: string;
}

export interface UpdateReleaseData {
  version?: string;
  type?: ReleaseType;
  status?: ReleaseStatus;
  targetReleaseDate?: Date;
  plannedDate?: Date;
  baseBranch?: string;
  releasePilotAccountId?: string;
  releaseConfigId?: string; // FK to release_configs table
  stageData?: any;
  regressionBuildSlots?: Array<{ date: Date; config: any }>;
  [key: string]: any; // Allow other fields
}

export class ReleaseDTO {
  private get sequelize() {
    const storage = getStorage();
    return (storage as any).sequelize;
  }

  private get ReleaseModel() {
    return this.sequelize.models.release;
  }

  /**
   * Create a new release
   */
  async create(data: CreateReleaseData): Promise<any> {
    const releaseId = uuidv4();
    const releaseKey = `release-${data.version}-${Date.now()}`;

    const releaseData = {
      id: releaseId,
      releaseKey,
      tenantId: data.tenantId,
      version: data.version,
      type: data.type,
      targetReleaseDate: data.targetReleaseDate,
      plannedDate: data.plannedDate,
      baseBranch: data.baseBranch,
      baseVersion: data.baseVersion || data.version,
      releasePilotAccountId: data.releasePilotAccountId,
      createdByAccountId: data.accountId,
      lastUpdatedByAccountId: data.accountId,
      status: ReleaseStatus.PENDING,
      kickOffReminderDate: data.kickOffReminderDate || null,
      parentId: data.parentId || null,
      releaseConfigId: data.releaseConfigId || null,
      // Orchestration-specific fields
      stageData: data.stageData || {},
      regressionBuildSlots: data.regressionBuildSlots ? JSON.stringify(data.regressionBuildSlots) : null,
    };

    const release = await this.ReleaseModel.create(releaseData);
    return release.toJSON();
  }

  /**
   * Get release by ID
   */
  async get(releaseId: string, options?: { include?: string[] }): Promise<any> {
    const include = [];
    
    if (options?.include?.includes('releasePilot')) {
      include.push({
        model: this.sequelize.models.account,
        as: 'releasePilot',
        attributes: ['id', 'email', 'name', 'picture']
      });
    }

    if (options?.include?.includes('creator')) {
      include.push({
        model: this.sequelize.models.account,
        as: 'creator',
        attributes: ['id', 'email', 'name', 'picture']
      });
    }

    const release = await this.ReleaseModel.findByPk(releaseId, {
      include: include.length > 0 ? include : undefined
    });

    if (!release) {
      return null;
    }

    const releaseJson = release.toJSON();
    
    // Parse JSON fields
    if (releaseJson.stageData && typeof releaseJson.stageData === 'string') {
      releaseJson.stageData = JSON.parse(releaseJson.stageData);
    }
    if (releaseJson.regressionBuildSlots && typeof releaseJson.regressionBuildSlots === 'string') {
      releaseJson.regressionBuildSlots = JSON.parse(releaseJson.regressionBuildSlots);
    }

    return releaseJson;
  }

  /**
   * Update release
   */
  async update(releaseId: string, accountId: string, data: UpdateReleaseData): Promise<any> {
    const updateData: any = {
      ...data,
      lastUpdateByAccountId: accountId,
      updatedAt: new Date()
    };

    // Stringify JSON fields if provided
    if (data.stageData !== undefined) {
      updateData.stageData = typeof data.stageData === 'string' ? data.stageData : JSON.stringify(data.stageData);
    }
    if (data.regressionBuildSlots !== undefined) {
      updateData.regressionBuildSlots = typeof data.regressionBuildSlots === 'string'
        ? data.regressionBuildSlots
        : JSON.stringify(data.regressionBuildSlots);
    }

    await this.ReleaseModel.update(updateData, {
      where: { id: releaseId }
    });

    return this.get(releaseId);
  }

  /**
   * Update stage data (merge with existing)
   */
  async updateStageData(releaseId: string, stageData: any): Promise<any> {
    const release = await this.get(releaseId);
    const currentStageData = release?.stageData || {};
    const mergedStageData = { ...currentStageData, ...stageData };

    return this.update(releaseId, release.lastUpdateByAccountId, { stageData: mergedStageData });
  }

  /**
   * Get stage data
   */
  async getStageData(releaseId: string): Promise<any> {
    const release = await this.get(releaseId);
    return release?.stageData || {};
  }

  /**
   * Get base release (for hotfixes)
   */
  async getBaseRelease(version: string, tenantId: string): Promise<any> {
    const release = await this.ReleaseModel.findOne({
      where: {
        version,
        tenantId,
        status: ReleaseStatus.RELEASED
      },
      order: [['releaseDate', 'DESC']]
    });

    return release ? release.toJSON() : null;
  }

  /**
   * Get all releases for a tenant
   */
  async getAll(tenantId: string, options?: { limit?: number; offset?: number }): Promise<any[]> {
    const releases = await this.ReleaseModel.findAll({
      where: { tenantId },
      limit: options?.limit,
      offset: options?.offset,
      order: [['createdAt', 'DESC']]
    });

    return releases.map(r => {
      const json = r.toJSON();
      // Parse JSON fields
      if (json.stageData && typeof json.stageData === 'string') {
        json.stageData = JSON.parse(json.stageData);
      }
      if (json.regressionBuildSlots && typeof json.regressionBuildSlots === 'string') {
        json.regressionBuildSlots = JSON.parse(json.regressionBuildSlots);
      }
      return json;
    });
  }

  /**
   * Delete release (soft delete - set status to ARCHIVED)
   */
  async delete(releaseId: string, accountId: string): Promise<void> {
    await this.update(releaseId, accountId, { status: ReleaseStatus.ARCHIVED });
  }
}

