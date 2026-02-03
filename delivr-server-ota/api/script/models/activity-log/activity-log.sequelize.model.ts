/**
 * Unified Activity Log Sequelize Model
 * Tracks all changes across all entity types (releases, configurations, integrations, distributions)
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import { EntityType } from './activity-log.interface';

export type UnifiedActivityLogAttributes = {
  id: string;
  entityType: EntityType;
  entityId: string;
  tenantId: string;
  type: string;
  previousValue: any; // JSON object
  newValue: any; // JSON object
  updatedAt: Date;
  updatedBy: string;
};

export type UnifiedActivityLogModelType = typeof Model & {
  new (): Model<UnifiedActivityLogAttributes>;
};

export const createUnifiedActivityLogModel = (
  sequelize: Sequelize
): UnifiedActivityLogModelType => {
  const UnifiedActivityLogModel = sequelize.define<Model<UnifiedActivityLogAttributes>>(
    'UnifiedActivityLog',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      entityType: {
        type: DataTypes.ENUM(
          EntityType.RELEASE,
          EntityType.CONFIGURATION,
          EntityType.INTEGRATION,
          EntityType.DISTRIBUTION
        ),
        allowNull: false,
        field: 'entityType',
        comment: 'Type of entity this log belongs to'
      },
      entityId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'entityId',
        comment: 'ID of the entity (releaseId, configId, integrationId, etc.)'
      },
      tenantId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'tenantId',
        references: {
          model: 'tenants',
          key: 'id'
        },
        comment: 'Tenant ID for data isolation and tenant-level queries'
      },
      type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'type',
        comment: 'High-level field name/type (RELEASE, PLATFORM_TARGET, CI_CONFIG, etc.)'
      },
      previousValue: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'previousValue',
        comment: 'Previous value before change (JSON)'
      },
      newValue: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'newValue',
        comment: 'New value after change (JSON)'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt'
      },
      updatedBy: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'updatedBy',
        references: {
          model: 'accounts',
          key: 'id'
        },
        comment: 'Account ID of user who made the change'
      }
    },
    {
      tableName: 'unified_activity_logs',
      timestamps: false,
      underscored: false,
      indexes: [
        {
          name: 'idx_entity',
          fields: ['entityType', 'entityId']
        },
        {
          name: 'idx_tenant_entity',
          fields: ['tenantId', 'entityType', 'entityId']
        },
        {
          name: 'idx_updated_at',
          fields: ['updatedAt']
        }
      ]
    }
  ) as UnifiedActivityLogModelType;

  return UnifiedActivityLogModel;
};
