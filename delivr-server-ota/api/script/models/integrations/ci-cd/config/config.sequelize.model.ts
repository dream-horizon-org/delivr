import type { Sequelize } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { TenantCICDConfig } from '~types/integrations/ci-cd/config.interface';

export const createCICDConfigModel = (sequelize: Sequelize) => {
  class CICDConfigModel
    extends Model<TenantCICDConfig>
    implements TenantCICDConfig
  {
    declare id: string;
    declare appId: string;
    declare workflowIds: string[];
    declare createdByAccountId: string;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  CICDConfigModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier (shortid)'
      },
      appId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'apps', key: 'id' },  // Changed from 'tenants' to 'apps'
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to apps table (renamed from tenants)'
      },
      workflowIds: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Array of workflow IDs (strings)'
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
      tableName: 'tenant_ci_cd_config',
      timestamps: true,
      indexes: [
        { fields: ['appId'], name: 'idx_tenant_ci_cd_config_tenant' }
      ]
    }
  );

  return CICDConfigModel;
};

export type CICDConfigModelType = ReturnType<typeof createCICDConfigModel>;


