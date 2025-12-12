/**
 * ReleaseUploads Repository
 * 
 * Data access layer for manual build uploads.
 * Handles CRUD operations and upload consumption logic.
 */

import { v4 as uuidv4 } from 'uuid';
import { Sequelize, Op } from 'sequelize';
import { ReleaseUploadModel, ReleaseUploadAttributes, UploadStage } from './release-uploads.sequelize.model';
import { PlatformName } from './release.interface';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data required to create a new upload
 */
export type CreateReleaseUploadDto = {
  tenantId: string;
  releaseId: string;
  platform: PlatformName;
  stage: UploadStage;
  artifactPath: string;
};

/**
 * Data for updating an upload
 */
export type UpdateReleaseUploadDto = Partial<{
  artifactPath: string;
  isUsed: boolean;
  usedByTaskId: string | null;
  usedByCycleId: string | null;
}>;

/**
 * ReleaseUpload entity (plain object)
 */
export type ReleaseUpload = ReleaseUploadAttributes;

// ============================================================================
// REPOSITORY CLASS
// ============================================================================

export class ReleaseUploadsRepository {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly model: typeof ReleaseUploadModel
  ) {}

  /**
   * Convert model instance to plain object
   */
  private toPlainObject(instance: ReleaseUploadModel | null): ReleaseUpload | null {
    const hasNoInstance = !instance;
    if (hasNoInstance) {
      return null;
    }
    return instance.get({ plain: true }) as ReleaseUpload;
  }

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  /**
   * Create a new upload entry
   */
  async create(data: CreateReleaseUploadDto): Promise<ReleaseUpload> {
    const id = uuidv4();
    const instance = await this.model.create({
      id,
      tenantId: data.tenantId,
      releaseId: data.releaseId,
      platform: data.platform,
      stage: data.stage,
      artifactPath: data.artifactPath,
      isUsed: false,
      usedByTaskId: null,
      usedByCycleId: null,
    });
    return this.toPlainObject(instance) as ReleaseUpload;
  }

  /**
   * Upsert: Create or update an existing unused upload for the same platform+stage
   * This allows replacing an upload before it's consumed
   */
  async upsert(data: CreateReleaseUploadDto): Promise<ReleaseUpload> {
    // Find existing unused upload for this platform+stage
    const existing = await this.findUnusedByPlatform(
      data.releaseId,
      data.stage,
      data.platform
    );

    const hasExisting = existing !== null;
    if (hasExisting) {
      // Update existing
      await this.update(existing.id, { artifactPath: data.artifactPath });
      const updated = await this.findById(existing.id);
      return updated as ReleaseUpload;
    }

    // Create new
    return this.create(data);
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  /**
   * Find upload by ID
   */
  async findById(id: string): Promise<ReleaseUpload | null> {
    const instance = await this.model.findByPk(id);
    return this.toPlainObject(instance);
  }

  /**
   * Find all uploads for a release and stage
   */
  async findByReleaseAndStage(releaseId: string, stage: UploadStage): Promise<ReleaseUpload[]> {
    const instances = await this.model.findAll({
      where: { releaseId, stage },
      order: [['createdAt', 'DESC']],
    });
    return instances.map(i => this.toPlainObject(i) as ReleaseUpload);
  }

  /**
   * Find all unused uploads for a release and stage
   * These are available for consumption by tasks
   */
  async findUnused(releaseId: string, stage: UploadStage): Promise<ReleaseUpload[]> {
    const instances = await this.model.findAll({
      where: {
        releaseId,
        stage,
        isUsed: false,
      },
      order: [['createdAt', 'DESC']],
    });
    return instances.map(i => this.toPlainObject(i) as ReleaseUpload);
  }

  /**
   * Find unused upload for a specific platform
   * Used for checking if upload exists before upsert
   */
  async findUnusedByPlatform(
    releaseId: string,
    stage: UploadStage,
    platform: PlatformName
  ): Promise<ReleaseUpload | null> {
    const instance = await this.model.findOne({
      where: {
        releaseId,
        stage,
        platform,
        isUsed: false,
      },
      order: [['createdAt', 'DESC']],
    });
    return this.toPlainObject(instance);
  }

  /**
   * Find all uploads consumed by a specific task
   */
  async findByTaskId(taskId: string): Promise<ReleaseUpload[]> {
    const instances = await this.model.findAll({
      where: { usedByTaskId: taskId },
    });
    return instances.map(i => this.toPlainObject(i) as ReleaseUpload);
  }

  /**
   * Find all uploads consumed by a specific cycle
   */
  async findByCycleId(cycleId: string): Promise<ReleaseUpload[]> {
    const instances = await this.model.findAll({
      where: { usedByCycleId: cycleId },
    });
    return instances.map(i => this.toPlainObject(i) as ReleaseUpload);
  }

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  /**
   * Update an upload
   */
  async update(id: string, data: UpdateReleaseUploadDto): Promise<void> {
    await this.model.update(data, { where: { id } });
  }

  /**
   * Mark an upload as used by a task (and optionally a cycle)
   * This is the main consumption method
   */
  async markAsUsed(
    id: string,
    taskId: string,
    cycleId: string | null
  ): Promise<ReleaseUpload | null> {
    await this.model.update(
      {
        isUsed: true,
        usedByTaskId: taskId,
        usedByCycleId: cycleId,
      },
      { where: { id } }
    );
    return this.findById(id);
  }

  /**
   * Mark multiple uploads as used (batch operation)
   */
  async markMultipleAsUsed(
    ids: string[],
    taskId: string,
    cycleId: string | null
  ): Promise<number> {
    const [affectedCount] = await this.model.update(
      {
        isUsed: true,
        usedByTaskId: taskId,
        usedByCycleId: cycleId,
      },
      { where: { id: { [Op.in]: ids } } }
    );
    return affectedCount;
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  /**
   * Delete an upload by ID
   * Only allows deletion if upload is not yet used
   */
  async delete(id: string): Promise<boolean> {
    const upload = await this.findById(id);
    const hasNoUpload = !upload;
    if (hasNoUpload) {
      return false;
    }

    const isAlreadyUsed = upload.isUsed;
    if (isAlreadyUsed) {
      throw new Error('Cannot delete an upload that has already been consumed');
    }

    const deletedCount = await this.model.destroy({ where: { id } });
    return deletedCount > 0;
  }

  /**
   * Delete all unused uploads for a release and stage
   * Useful for cleanup
   */
  async deleteUnused(releaseId: string, stage: UploadStage): Promise<number> {
    return this.model.destroy({
      where: {
        releaseId,
        stage,
        isUsed: false,
      },
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if all platforms have unused uploads for a stage
   * @param releaseId Release ID
   * @param stage Stage to check
   * @param requiredPlatforms List of platforms that need uploads
   * @returns Object with ready status and missing platforms
   */
  async checkAllPlatformsReady(
    releaseId: string,
    stage: UploadStage,
    requiredPlatforms: PlatformName[]
  ): Promise<{
    allReady: boolean;
    uploadedPlatforms: PlatformName[];
    missingPlatforms: PlatformName[];
  }> {
    const uploads = await this.findUnused(releaseId, stage);
    const uploadedPlatforms = uploads.map(u => u.platform);
    const missingPlatforms = requiredPlatforms.filter(p => !uploadedPlatforms.includes(p));

    return {
      allReady: missingPlatforms.length === 0,
      uploadedPlatforms,
      missingPlatforms,
    };
  }

  /**
   * Get upload count for a release
   */
  async getUploadCount(releaseId: string): Promise<{ total: number; used: number; unused: number }> {
    const all = await this.model.count({ where: { releaseId } });
    const used = await this.model.count({ where: { releaseId, isUsed: true } });
    return {
      total: all,
      used,
      unused: all - used,
    };
  }
}

export default ReleaseUploadsRepository;

