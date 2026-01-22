import type { ReleaseNotificationModelType } from './release-notification.sequelize.model';
import type {
  ReleaseNotification,
  CreateReleaseNotificationDto,
  UpdateReleaseNotificationDto,
  NotificationQueryFilters
} from '~types/release-notification';
import { NotificationType } from '~types/release-notification';

/**
 * Release Notification Repository
 * Data access layer for release_notifications table
 */
export class ReleaseNotificationRepository {
  constructor(private readonly model: ReleaseNotificationModelType) {}

  private toPlainObject(instance: unknown): ReleaseNotification {
    const record = instance as { toJSON: () => ReleaseNotification };
    return record.toJSON();
  }

  /**
   * Create a new notification record
   */
  async create(data: CreateReleaseNotificationDto): Promise<ReleaseNotification> {
    const notification = await this.model.create({
      tenantId: data.tenantId,
      releaseId: data.releaseId,
      notificationType: data.notificationType,
      isSystemGenerated: data.isSystemGenerated ?? true,
      createdByUserId: data.createdByUserId ?? null,
      taskId: data.taskId ?? null,
      delivery: data.delivery ?? {}
    });

    return this.toPlainObject(notification);
  }

  /**
   * Find notification by ID
   */
  async findById(id: number): Promise<ReleaseNotification | null> {
    const notification = await this.model.findByPk(id);
    if (!notification) return null;
    return this.toPlainObject(notification);
  }

  /**
   * Update notification (primarily for delivery status)
   */
  async update(id: number, data: UpdateReleaseNotificationDto): Promise<ReleaseNotification | null> {
    await this.model.update(data, {
      where: { id }
    });
    return this.findById(id);
  }

  /**
   * Find all notifications for a release
   */
  async findByReleaseId(releaseId: string): Promise<ReleaseNotification[]> {
    const notifications = await this.model.findAll({
      where: { releaseId },
      order: [['createdAt', 'DESC']]
    });
    return notifications.map((n) => this.toPlainObject(n));
  }

  /**
   * Find all notifications for a tenant
   */
  async findByTenantId(tenantId: string): Promise<ReleaseNotification[]> {
    const notifications = await this.model.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    });
    return notifications.map((n) => this.toPlainObject(n));
  }

  /**
   * Find notifications with filters
   */
  async findWithFilters(filters: NotificationQueryFilters): Promise<ReleaseNotification[]> {
    const where: Record<string, unknown> = {};

    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    }
    if (filters.releaseId) {
      where.releaseId = filters.releaseId;
    }
    if (filters.notificationType) {
      where.notificationType = filters.notificationType;
    }
    if (filters.isSystemGenerated !== undefined) {
      where.isSystemGenerated = filters.isSystemGenerated;
    }
    if (filters.createdByUserId) {
      where.createdByUserId = filters.createdByUserId;
    }

    const notifications = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    return notifications.map((n) => this.toPlainObject(n));
  }

  /**
   * Find notifications by type for a release
   */
  async findByReleaseAndType(
    releaseId: string,
    notificationType: NotificationType
  ): Promise<ReleaseNotification[]> {
    const notifications = await this.model.findAll({
      where: { releaseId, notificationType },
      order: [['createdAt', 'DESC']]
    });
    return notifications.map((n) => this.toPlainObject(n));
  }

  /**
   * Count notifications for a release
   */
  async countByReleaseId(releaseId: string): Promise<number> {
    return this.model.count({
      where: { releaseId }
    });
  }

  /**
   * Count notifications by type for a release
   */
  async countByReleaseAndType(
    releaseId: string,
    notificationType: NotificationType
  ): Promise<number> {
    return this.model.count({
      where: { releaseId, notificationType }
    });
  }
}

