import type { UnifiedActivityLogModelType } from './activity-log.sequelize.model';
import { UnifiedActivityLog, CreateActivityLogDto, EntityType } from './activity-log.interface';

/**
 * Unified Activity Log Repository
 * Data access layer for unified activity logs across all entity types
 */
export class UnifiedActivityLogRepository {
  constructor(private readonly model: UnifiedActivityLogModelType) {}

  private toPlainObject(instance: any): UnifiedActivityLog {
    return instance.toJSON() as UnifiedActivityLog;
  }

  /**
   * Create a new activity log entry
   */
  async create(data: CreateActivityLogDto): Promise<UnifiedActivityLog> {
    const activityLog = await this.model.create({
      id: data.id,
      entityType: data.entityType,
      entityId: data.entityId,
      tenantId: data.tenantId,
      type: data.type,
      previousValue: data.previousValue ?? null,
      newValue: data.newValue ?? null,
      updatedBy: data.updatedBy,
      updatedAt: new Date()
    });

    return this.toPlainObject(activityLog);
  }

  /**
   * Find all activity logs for a specific entity
   */
  async findByEntity(
    entityType: EntityType,
    entityId: string
  ): Promise<UnifiedActivityLog[]> {
    const activityLogs = await this.model.findAll({
      where: {
        entityType,
        entityId
      },
      order: [['updatedAt', 'DESC']]
    });
    return activityLogs.map((log) => this.toPlainObject(log));
  }

  /**
   * Find activity logs by tenant with optional filtering
   */
  async findByTenant(
    tenantId: string,
    options?: {
      entityType?: EntityType;
      limit?: number;
      offset?: number;
    }
  ): Promise<UnifiedActivityLog[]> {
    const where: any = { tenantId };
    if (options?.entityType) {
      where.entityType = options.entityType;
    }

    const queryOptions: any = {
      where,
      order: [['updatedAt', 'DESC']]
    };

    if (options?.limit) {
      queryOptions.limit = options.limit;
    }
    if (options?.offset) {
      queryOptions.offset = options.offset;
    }

    const activityLogs = await this.model.findAll(queryOptions);
    return activityLogs.map((log) => this.toPlainObject(log));
  }

  /**
   * Delete all activity logs for a specific entity
   */
  async deleteByEntity(
    entityType: EntityType,
    entityId: string
  ): Promise<void> {
    await this.model.destroy({
      where: {
        entityType,
        entityId
      }
    });
  }
}
