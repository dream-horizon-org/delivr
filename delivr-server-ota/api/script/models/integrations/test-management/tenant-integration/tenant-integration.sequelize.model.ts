import type { Sequelize } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  TenantTestManagementIntegration,
  TenantTestManagementIntegrationConfig,
  TestManagementProviderType
} from '~types/integrations/test-management/tenant-integration';

export const createTenantTestManagementIntegrationModel = (sequelize: Sequelize) => {
  class TenantTestManagementIntegrationModel
    extends Model<TenantTestManagementIntegration>
    implements TenantTestManagementIntegration
  {
    declare id: string;
    declare appId: string;
    declare name: string;
    declare providerType: TestManagementProviderType;
    declare config: TenantTestManagementIntegrationConfig;
    declare createdByAccountId: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  TenantTestManagementIntegrationModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Primary key'
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'User-friendly name (e.g., "Checkmate Production", "TestRail Staging")'
      },
      providerType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['checkmate', 'testrail', 'xray', 'zephyr']]
        },
        comment: 'Test management provider type'
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: 'Provider configuration (baseUrl, authToken, etc.)'
      },
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Account ID of creator'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
      }
    },
    {
      sequelize,
      tableName: 'tenant_test_management_integrations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_ptmi_tenant',
          fields: ['tenant_id']  // Index on tenant_id
        },
        {
          name: 'idx_ptmi_provider',
          fields: ['provider_type']
        },
        {
          name: 'idx_ptmi_created_at',
          fields: ['created_at']
        },
        {
          name: 'idx_ptmi_unique_name',
          unique: true,
          fields: ['tenant_id', 'name']  // Unique constraint on tenant_id + name
        }
      ]
    }
  );

  return TenantTestManagementIntegrationModel;
};

export type TenantTestManagementIntegrationModelType = ReturnType<typeof createTenantTestManagementIntegrationModel>;
