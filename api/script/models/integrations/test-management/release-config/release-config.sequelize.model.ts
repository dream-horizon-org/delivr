import { DataTypes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';
import type {
  ReleaseConfigTestManagement,
  PlatformConfiguration
} from '~types/integrations/test-management/release-config/release-config.interface';

export const createReleaseConfigTestManagementModel = (sequelize: Sequelize) => {
  class ReleaseConfigTestManagementModel
    extends Model<ReleaseConfigTestManagement>
    implements ReleaseConfigTestManagement
  {
    declare id: string;
    declare releaseConfigId: string;
    declare integrationId: string;
    declare passThresholdPercent: number;
    declare platformConfigurations: PlatformConfiguration[];
    declare createdByAccountId: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  ReleaseConfigTestManagementModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Primary key'
      },
      releaseConfigId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'release_config_id',
        comment: 'Release configuration identifier - one config per release config'
      },
      integrationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'integration_id',
        comment: 'Reference to project_test_management_integrations',
        references: {
          model: 'project_test_management_integrations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      passThresholdPercent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        field: 'pass_threshold_percent',
        comment: 'Minimum percentage of tests that must pass (0-100)',
        validate: {
          min: 0,
          max: 100
        }
      },
      platformConfigurations: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'platform_configurations',
        comment: 'Array of platform-specific test configurations'
      },
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'created_by_account_id',
        comment: 'Account that created this configuration'
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
      tableName: 'release_config_test_management',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_integration_id',
          fields: ['integration_id']
        }
      ]
    }
  );

  return ReleaseConfigTestManagementModel;
};

export type ReleaseConfigTestManagementModelType = ReturnType<typeof createReleaseConfigTestManagementModel>;

