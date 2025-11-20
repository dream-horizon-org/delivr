import type { Sequelize } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
    ProjectTestManagementIntegration,
    ProjectTestManagementIntegrationConfig,
    TestManagementProviderType
} from '~types/integrations/test-management/project-integration';

export const createProjectTestManagementIntegrationModel = (sequelize: Sequelize) => {
  class ProjectTestManagementIntegrationModel
    extends Model<ProjectTestManagementIntegration>
    implements ProjectTestManagementIntegration
  {
    declare id: string;
    declare projectId: string;
    declare name: string;
    declare providerType: TestManagementProviderType;
    declare config: ProjectTestManagementIntegrationConfig;
    declare createdByAccountId: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  ProjectTestManagementIntegrationModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Primary key'
      },
      projectId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Project identifier - links to project service'
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
        type: DataTypes.JSONB,
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
      tableName: 'project_test_management_integrations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_ptmi_project',
          fields: ['projectId']
        },
        {
          name: 'idx_ptmi_provider',
          fields: ['providerType']
        },
        {
          name: 'idx_ptmi_created_at',
          fields: ['createdAt']
        },
        {
          name: 'idx_ptmi_unique_name',
          unique: true,
          fields: ['projectId', 'name']
        }
      ]
    }
  );

  return ProjectTestManagementIntegrationModel;
};

export type ProjectTestManagementIntegrationModelType = ReturnType<
  typeof createProjectTestManagementIntegrationModel
>;

