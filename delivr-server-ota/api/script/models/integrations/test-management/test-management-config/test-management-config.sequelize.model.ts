/**
 * Test Management Config Sequelize Model
 * Reusable test configurations for tenants
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import type { PlatformConfiguration } from '~types/integrations/test-management/test-management-config';

export type TestManagementConfigAttributes = {
  id: string;
  appId: string;
  integrationId: string;
  name: string;
  passThresholdPercent: number;
  platformConfigurations: PlatformConfiguration[];
  createdByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TestManagementConfigModelType = typeof Model & {
  new (): Model<TestManagementConfigAttributes>;
};

export const createTestManagementConfigModel = (
  sequelize: Sequelize
): TestManagementConfigModelType => {
  const TestManagementConfigModel = sequelize.define<Model<TestManagementConfigAttributes>>(
    'TestManagementConfig',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      appId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'apps',  // Changed from 'tenants' to 'apps'
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'App identifier (references apps.id, renamed from tenants)'
      },
      integrationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'integration_id'
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      passThresholdPercent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        field: 'pass_threshold_percent'
      },
      platformConfigurations: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        field: 'platform_configurations'
      },
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'created_by_account_id'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
      }
    },
    {
      tableName: 'test_management_configs',
      timestamps: true,
      underscored: true
    }
  ) as TestManagementConfigModelType;

  return TestManagementConfigModel;
};

