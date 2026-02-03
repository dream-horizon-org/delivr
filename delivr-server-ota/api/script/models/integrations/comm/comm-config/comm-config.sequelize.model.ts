import type { Sequelize } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  TenantCommChannel,
  StageChannelMapping
} from '~types/integrations/comm/comm-integration';

export const createCommConfigModel = (sequelize: Sequelize) => {
  class CommConfigModel
    extends Model<TenantCommChannel>
    implements TenantCommChannel
  {
    declare id: string;
    declare integrationId: string;
    declare appId: string;
    declare channelData: StageChannelMapping;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  CommConfigModel.init(
    {
      id: {
        type: DataTypes.STRING(21),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier (nanoid - 21 chars)'
      },
      integrationId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
          model: 'tenant_comm_integrations',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to tenant_comm_integrations table'
      },
      appId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'apps',  // Changed from 'tenants' to 'apps'
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to apps table (renamed from tenants, denormalized for easier queries)'
      },
      channelData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Stage-to-channels mapping: {"stageName": [{"id":"C123","name":"dev-releases"}]}'
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
      tableName: 'slack_configuration',
      timestamps: true,
      underscored: false, // Database has camelCase columns
      indexes: [
        {
          name: 'idx_channels_integration',
          fields: ['integrationId']
        },
        {
          name: 'idx_channels_tenant',
          fields: ['appId']
        }
      ]
    }
  );

  return CommConfigModel;
};

export type CommConfigModelType = ReturnType<typeof createCommConfigModel>;

