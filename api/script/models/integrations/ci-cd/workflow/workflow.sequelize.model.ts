import type { Sequelize } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { TenantCICDWorkflow, CICDProviderType, Platform, WorkflowType } from '~types/integrations/ci-cd';

export const createCICDWorkflowModel = (sequelize: Sequelize) => {
  class CICDWorkflowModel
    extends Model<TenantCICDWorkflow>
    implements TenantCICDWorkflow
  {
    declare id: string;
    declare tenantId: string;
    declare providerType: CICDProviderType;
    declare integrationId: string;
    declare displayName: string;
    declare workflowUrl: string;
    declare providerIdentifiers: any | null;
    declare platform: Platform;
    declare workflowType: WorkflowType;
    declare parameters: any | null;
    declare createdByAccountId: string;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  CICDWorkflowModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier (nanoid)'
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      providerType: {
        type: DataTypes.ENUM('JENKINS','GITHUB_ACTIONS','CIRCLE_CI','GITLAB_CI'),
        allowNull: false
      },
      integrationId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'tenant_ci_cd_integrations', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      displayName: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      workflowUrl: {
        type: DataTypes.STRING(1024),
        allowNull: false
      },
      providerIdentifiers: {
        type: DataTypes.JSON,
        allowNull: true
      },
      platform: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'other',
        comment: 'Normalized lowercase platform identifier'
      },
      workflowType: {
        type: DataTypes.ENUM('PRE_REGRESSION_BUILD','REGRESSION_BUILD','TEST_FLIGHT_BUILD','AUTOMATION_BUILD','CUSTOM'),
        allowNull: false,
        defaultValue: 'CUSTOM'
      },
      parameters: {
        type: DataTypes.JSON,
        allowNull: true
      },
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      tableName: 'tenant_ci_cd_workflows',
      timestamps: true,
      indexes: [
        { name: 'idx_wf_tenant', fields: ['tenantId'] },
        { name: 'idx_wf_provider', fields: ['providerType'] },
        { name: 'idx_wf_integration', fields: ['integrationId'] },
        { name: 'idx_wf_platform', fields: ['platform'] },
        { name: 'idx_wf_type', fields: ['workflowType'] }
      ]
    }
  );

  return CICDWorkflowModel;
};

export type CICDWorkflowModelType = ReturnType<typeof createCICDWorkflowModel>;


