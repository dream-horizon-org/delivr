import type { Sequelize } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type {
  TenantCommunicationIntegration,
  CommunicationType,
  VerificationStatus
} from '~types/integrations/comm/comm-integration';

export const createCommIntegrationModel = (sequelize: Sequelize) => {
  class CommIntegrationModel
    extends Model<TenantCommunicationIntegration>
    implements TenantCommunicationIntegration
  {
    declare id: string;
    declare tenantId: string;
    declare communicationType: CommunicationType;
    declare slackBotToken: string;
    declare slackBotUserId: string | null;
    declare slackWorkspaceId: string | null;
    declare slackWorkspaceName: string | null;
    declare verificationStatus: VerificationStatus;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  CommIntegrationModel.init(
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
        references: {
          model: 'tenants',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to tenants table'
      },
      communicationType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['SLACK', 'TEAMS', 'EMAIL']]
        },
        comment: 'Communication platform type (extensible)'
      },
      slackBotToken: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Slack Bot Token (xoxb-...) - ENCRYPTED at application level'
      },
      slackBotUserId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Slack Bot User ID (e.g., U01234ABCDE)'
      },
      slackWorkspaceId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Slack Workspace/Team ID (e.g., T01234ABCDE)'
      },
      slackWorkspaceName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Slack Workspace Name (e.g., "Acme Corp")'
      },
      verificationStatus: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['PENDING', 'VALID', 'INVALID', 'EXPIRED']]
        },
        comment: 'Connection verification status'
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
      tableName: 'tenant_comm_integrations',
      timestamps: true,
      underscored: false, // Database has camelCase columns
      indexes: [
        {
          name: 'idx_comm_tenant',
          fields: ['tenantId']
        },
        {
          name: 'idx_comm_type',
          fields: ['communicationType']
        },
        {
          name: 'idx_comm_verification',
          fields: ['verificationStatus']
        }
      ]
    }
  );

  return CommIntegrationModel;
};

export type CommIntegrationModelType = ReturnType<typeof createCommIntegrationModel>;

