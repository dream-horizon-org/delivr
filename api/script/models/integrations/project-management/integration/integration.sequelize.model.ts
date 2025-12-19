import type { Sequelize } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  ProjectManagementIntegration,
  ProjectManagementIntegrationConfig,
  ProjectManagementProviderType,
  VerificationStatus
} from '~types/integrations/project-management';

export const createProjectManagementIntegrationModel = (sequelize: Sequelize) => {
  class ProjectManagementIntegrationModel
    extends Model<ProjectManagementIntegration>
    implements ProjectManagementIntegration
  {
    declare id: string;
    declare tenantId: string;
    declare name: string;
    declare providerType: ProjectManagementProviderType;
    declare config: ProjectManagementIntegrationConfig;
    declare isEnabled: boolean;
    declare verificationStatus: VerificationStatus;
    declare lastVerifiedAt: Date | null;
    declare createdByAccountId: string;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  ProjectManagementIntegrationModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        comment: 'Primary key'
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Tenant identifier'
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'User-friendly name (e.g., "JIRA Production")'
      },
      providerType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['JIRA', 'LINEAR', 'ASANA', 'MONDAY', 'CLICKUP']]
        },
        comment: 'Project management provider type'
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: 'Provider-specific configuration'
      },
      isEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether integration is enabled'
      },
      verificationStatus: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'NOT_VERIFIED',
        validate: {
          isIn: [['NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED']]
        },
        comment: 'Verification status'
      },
      lastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last verification timestamp'
      },
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Account ID of creator'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'createdAt'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt'
      }
    },
    {
      sequelize,
      tableName: 'project_management_integrations',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      underscored: false,
      indexes: [
        {
          name: 'idx_pm_integration_tenant',
          fields: ['tenantId']
        },
        {
          name: 'idx_pm_integration_provider',
          fields: ['providerType']
        },
        {
          name: 'idx_pm_integration_unique_name',
          unique: true,
          fields: ['tenantId', 'name']
        }
      ]
    }
  );

  return ProjectManagementIntegrationModel;
};

export type ProjectManagementIntegrationModelType = ReturnType<
  typeof createProjectManagementIntegrationModel
>;

