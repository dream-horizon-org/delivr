import type { Sequelize } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  TenantCommChannel,
  StageChannelMapping
} from '~storage/integrations/comm/slack-types';

export const createChannelConfigModel = (sequelize: Sequelize) => {
  class ChannelConfigModel
    extends Model<TenantCommChannel>
    implements TenantCommChannel
  {
    declare id: string;
    declare integrationId: string;
    declare tenantId: string;
    declare channelData: StageChannelMapping;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  ChannelConfigModel.init(
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
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to tenants table (denormalized for easier queries)'
      },
      channelData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Stage-to-channels mapping: {"stageName": [{"id":"C123","name":"dev-releases"}]}'
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
      tableName: 'slack_configuration',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_channels_integration',
          fields: ['integrationId']
        },
        {
          name: 'idx_channels_tenant',
          fields: ['tenantId']
        }
      ]
    }
  );

  return ChannelConfigModel;
};

export type ChannelConfigModelType = ReturnType<typeof createChannelConfigModel>;

