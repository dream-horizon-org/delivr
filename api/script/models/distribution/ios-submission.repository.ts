import type { IosSubmissionBuildModelType } from './ios-submission.sequelize.model';
import type { IosSubmissionBuild, CreateIosSubmissionDto, UpdateIosSubmissionDto, IosSubmissionFilters } from '~types/distribution/ios-submission.interface';

/**
 * iOS Submission Build Repository
 * Data access layer for iOS submission operations
 */
export class IosSubmissionBuildRepository {
  constructor(private readonly model: IosSubmissionBuildModelType) {}

  private toPlainObject(instance: any): IosSubmissionBuild {
    return instance.toJSON() as IosSubmissionBuild;
  }

  /**
   * Create a new iOS submission
   */
  async create(data: CreateIosSubmissionDto): Promise<IosSubmissionBuild> {
    const submission = await this.model.create({
      id: data.id,
      distributionId: data.distributionId,
      testflightNumber: data.testflightNumber,
      version: data.version,
      buildType: data.buildType,
      storeType: data.storeType ?? 'APP_STORE',
      status: data.status ?? 'PENDING',
      releaseNotes: data.releaseNotes ?? null,
      phasedRelease: data.phasedRelease ?? null,
      releaseType: data.releaseType ?? 'AFTER_APPROVAL',
      resetRating: data.resetRating ?? null,
      rolloutPercentage: data.rolloutPercentage ?? null,
      isActive: data.isActive ?? true,
      submittedBy: data.submittedBy ?? null
    });

    return this.toPlainObject(submission);
  }

  /**
   * Find iOS submission by ID
   */
  async findById(id: string): Promise<IosSubmissionBuild | null> {
    const submission = await this.model.findByPk(id);
    if (!submission) return null;
    return this.toPlainObject(submission);
  }

  /**
   * Find all iOS submissions by distribution ID
   */
  async findByDistributionId(distributionId: string): Promise<IosSubmissionBuild[]> {
    const submissions = await this.model.findAll({
      where: { distributionId },
      order: [['createdAt', 'DESC']]
    });

    return submissions.map(s => this.toPlainObject(s));
  }

  /**
   * Find all iOS submissions with optional filters
   */
  async findAll(filters: IosSubmissionFilters = {}): Promise<IosSubmissionBuild[]> {
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
   * Update iOS submission by ID
   */
  async update(id: string, data: UpdateIosSubmissionDto): Promise<IosSubmissionBuild | null> {
    const submission = await this.model.findByPk(id);
    if (!submission) return null;

    await submission.update({
      ...(data.testflightNumber && { testflightNumber: data.testflightNumber }),
      ...(data.version && { version: data.version }),
      ...(data.buildType && { buildType: data.buildType }),
      ...(data.storeType && { storeType: data.storeType }),
      ...(data.status && { status: data.status }),
      ...(data.releaseNotes !== undefined && { releaseNotes: data.releaseNotes }),
      ...(data.phasedRelease !== undefined && { phasedRelease: data.phasedRelease }),
      ...(data.releaseType && { releaseType: data.releaseType }),
      ...(data.resetRating !== undefined && { resetRating: data.resetRating }),
      ...(data.rolloutPercentage !== undefined && { rolloutPercentage: data.rolloutPercentage }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.submittedBy !== undefined && { submittedBy: data.submittedBy }),
      ...(data.submittedAt !== undefined && { submittedAt: data.submittedAt })
    });

    return this.toPlainObject(submission);
  }

  /**
   * Delete iOS submission by ID
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.model.destroy({
      where: { id }
    });

    return deleted > 0;
  }

  /**
   * Count iOS submissions by filters
   */
  async count(filters: IosSubmissionFilters = {}): Promise<number> {
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

