import type { SubmissionActionHistoryModelType } from './submission-action-history.sequelize.model';
import type { SubmissionActionHistory, CreateSubmissionActionHistoryDto, SubmissionActionHistoryFilters } from '~types/distribution/submission-action-history.interface';

/**
 * Submission Action History Repository
 * Data access layer for submission action history operations
 */
export class SubmissionActionHistoryRepository {
  constructor(private readonly model: SubmissionActionHistoryModelType) {}

  private toPlainObject(instance: any): SubmissionActionHistory {
    return instance.toJSON() as SubmissionActionHistory;
  }

  /**
   * Create a new submission action history entry
   */
  async create(data: CreateSubmissionActionHistoryDto): Promise<SubmissionActionHistory> {
    const history = await this.model.create({
      id: data.id,
      submissionId: data.submissionId,
      platform: data.platform,
      action: data.action,
      reason: data.reason,
      createdBy: data.createdBy
    });

    return this.toPlainObject(history);
  }

  /**
   * Find action history by ID
   */
  async findById(id: string): Promise<SubmissionActionHistory | null> {
    const history = await this.model.findByPk(id);
    if (!history) return null;
    return this.toPlainObject(history);
  }

  /**
   * Find all action history for a specific submission
   */
  async findBySubmissionId(submissionId: string): Promise<SubmissionActionHistory[]> {
    const histories = await this.model.findAll({
      where: { submissionId },
      order: [['createdAt', 'DESC']]
    });

    return histories.map(h => this.toPlainObject(h));
  }

  /**
   * Find all action history with optional filters
   */
  async findAll(filters: SubmissionActionHistoryFilters = {}): Promise<SubmissionActionHistory[]> {
    const where: Record<string, unknown> = {};

    if (filters.submissionId) {
      where.submissionId = filters.submissionId;
    }
    if (filters.platform) {
      where.platform = filters.platform;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    const histories = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return histories.map(h => this.toPlainObject(h));
  }

  /**
   * Count action history entries by filters
   */
  async count(filters: SubmissionActionHistoryFilters = {}): Promise<number> {
    const where: Record<string, unknown> = {};

    if (filters.submissionId) {
      where.submissionId = filters.submissionId;
    }
    if (filters.platform) {
      where.platform = filters.platform;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    return await this.model.count({ where });
  }

  /**
   * Delete action history by ID
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.model.destroy({
      where: { id }
    });

    return deleted > 0;
  }
}

