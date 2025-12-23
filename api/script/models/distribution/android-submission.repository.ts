import type { AndroidSubmissionBuildModelType } from './android-submission.sequelize.model';
import type { AndroidSubmissionBuild, CreateAndroidSubmissionDto, UpdateAndroidSubmissionDto, AndroidSubmissionFilters } from '~types/distribution/android-submission.interface';

/**
 * Android Submission Build Repository
 * Data access layer for Android submission operations
 */
export class AndroidSubmissionBuildRepository {
  constructor(private readonly model: AndroidSubmissionBuildModelType) {}

  private toPlainObject(instance: any): AndroidSubmissionBuild {
    return instance.toJSON() as AndroidSubmissionBuild;
  }

  /**
   * Create a new Android submission
   */
  async create(data: CreateAndroidSubmissionDto): Promise<AndroidSubmissionBuild> {
    const submission = await this.model.create({
      id: data.id,
      distributionId: data.distributionId,
      internalTrackLink: data.internalTrackLink ?? null,
      artifactPath: data.artifactPath,
      version: data.version,
      versionCode: data.versionCode,
      buildType: data.buildType,
      storeType: data.storeType ?? 'PLAY_STORE',
      status: data.status ?? 'PENDING',
      releaseNotes: data.releaseNotes ?? null,
      inAppUpdatePriority: data.inAppUpdatePriority ?? null,
      rolloutPercentage: data.rolloutPercentage ?? null,
      submittedBy: data.submittedBy ?? null,
      isActive: data.isActive ?? true
    });

    return this.toPlainObject(submission);
  }

  /**
   * Find Android submission by ID
   */
  async findById(id: string): Promise<AndroidSubmissionBuild | null> {
    const submission = await this.model.findByPk(id);
    if (!submission) return null;
    return this.toPlainObject(submission);
  }

  /**
   * Find all Android submissions by distribution ID
   */
  async findByDistributionId(distributionId: string): Promise<AndroidSubmissionBuild[]> {
    const submissions = await this.model.findAll({
      where: { distributionId },
      order: [['createdAt', 'DESC']]
    });

    return submissions.map(s => this.toPlainObject(s));
  }

  /**
   * Find latest active Android submission by distribution ID
   * Returns the most recent active submission (or null if none)
   */
  async findLatestByDistributionId(distributionId: string): Promise<AndroidSubmissionBuild | null> {
    const submission = await this.model.findOne({
      where: { 
        distributionId,
        isActive: true
      },
      order: [['createdAt', 'DESC']]
    });

    if (!submission) return null;
    return this.toPlainObject(submission);
  }

  /**
   * Find all Android submissions with optional filters
   */
  async findAll(filters: AndroidSubmissionFilters = {}): Promise<AndroidSubmissionBuild[]> {
    const where: Record<string, unknown> = {};

    if (filters.distributionId) {
      where.distributionId = filters.distributionId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.buildType) {
      where.buildType = filters.buildType;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.submittedBy) {
      where.submittedBy = filters.submittedBy;
    }

    const submissions = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return submissions.map(s => this.toPlainObject(s));
  }

  /**
   * Update Android submission by ID
   */
  async update(id: string, data: UpdateAndroidSubmissionDto): Promise<AndroidSubmissionBuild | null> {
    const submission = await this.model.findByPk(id);
    if (!submission) return null;

    await submission.update({
      ...(data.internalTrackLink !== undefined && { internalTrackLink: data.internalTrackLink }),
      ...(data.artifactPath && { artifactPath: data.artifactPath }),
      ...(data.version && { version: data.version }),
      ...(data.versionCode && { versionCode: data.versionCode }),
      ...(data.buildType && { buildType: data.buildType }),
      ...(data.storeType && { storeType: data.storeType }),
      ...(data.status && { status: data.status }),
      ...(data.releaseNotes !== undefined && { releaseNotes: data.releaseNotes }),
      ...(data.inAppUpdatePriority !== undefined && { inAppUpdatePriority: data.inAppUpdatePriority }),
      ...(data.rolloutPercentage !== undefined && { rolloutPercentage: data.rolloutPercentage }),
      ...(data.submittedBy !== undefined && { submittedBy: data.submittedBy }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.cronicleJobId !== undefined && { cronicleJobId: data.cronicleJobId }),
      ...(data.cronicleCreatedDate !== undefined && { cronicleCreatedDate: data.cronicleCreatedDate }),
      ...(data.submittedAt !== undefined && { submittedAt: data.submittedAt })
    });

    return this.toPlainObject(submission);
  }

  /**
   * Delete Android submission by ID
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.model.destroy({
      where: { id }
    });

    return deleted > 0;
  }

  /**
   * Count Android submissions by filters
   */
  async count(filters: AndroidSubmissionFilters = {}): Promise<number> {
    const where: Record<string, unknown> = {};

    if (filters.distributionId) {
      where.distributionId = filters.distributionId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.buildType) {
      where.buildType = filters.buildType;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.submittedBy) {
      where.submittedBy = filters.submittedBy;
    }

    return await this.model.count({ where });
  }
}

