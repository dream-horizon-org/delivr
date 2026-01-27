/**
 * Release Notification Sequelize Model
 * Ledger of all release-related notifications sent
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import { NotificationType, NOTIFICATION_TYPES } from '~types/release-notification';

export type ReleaseNotificationAttributes = {
  id: number;
  tenantId: string;
  releaseId: string;
  notificationType: NotificationType;
  isSystemGenerated: boolean;
  createdByUserId: string | null;
  taskId: string | null;
  delivery: Record<string, unknown>;
  createdAt: Date;
};

export type ReleaseNotificationModelType = typeof Model & {
  new (): Model<ReleaseNotificationAttributes>;
};

export const createReleaseNotificationModel = (
  sequelize: Sequelize
): ReleaseNotificationModelType => {
  const ReleaseNotificationModel = sequelize.define<Model<ReleaseNotificationAttributes>>(
    'ReleaseNotification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'tenantId',
        references: {
          model: 'apps',  // Changed from 'tenants' to 'apps'
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'App identifier (references apps.id, renamed from tenants)'
      },
      releaseId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'releaseId',
        references: {
          model: 'releases',
          key: 'id'
        },
        comment: 'Release ID this notification belongs to'
      },
      notificationType: {
        type: DataTypes.ENUM(...NOTIFICATION_TYPES),
        allowNull: false,
        field: 'notificationType',
        comment: 'Type of notification sent'
      },
      isSystemGenerated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'isSystemGenerated',
        comment: 'True if auto-triggered by orchestration, false if ad-hoc'
      },
      createdByUserId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'createdByUserId',
        references: {
          model: 'accounts',
          key: 'id'
        },
        comment: 'User who triggered ad-hoc notification (null for system)'
      },
      taskId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'taskId',
        comment: 'Associated release task ID (if triggered by task)'
      },
      delivery: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        field: 'delivery',
        comment: 'Raw response from messaging service (channel -> response mapping)'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'createdAt',
        comment: 'When notification was sent'
      }
    },
    {
      tableName: 'release_notifications',
      timestamps: false, // We manage createdAt manually, no updatedAt needed
      underscored: false,
      indexes: [
        {
          name: 'idx_notifications_release',
          fields: ['releaseId']
        },
        {
          name: 'idx_notifications_tenant',
          fields: ['tenantId']
        },
        {
          name: 'idx_notifications_created',
          fields: [{ name: 'createdAt', order: 'DESC' }]
        },
        {
          name: 'idx_notifications_type',
          fields: ['notificationType']
        }
      ]
    }
  ) as ReleaseNotificationModelType;

  return ReleaseNotificationModel;
};

