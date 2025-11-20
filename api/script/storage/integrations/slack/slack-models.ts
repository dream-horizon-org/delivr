/**
 * Sequelize Model for Communication Integrations (Slack)
 * 
 * Defines the database model using Sequelize ORM
 * Matches the tenant_communication_integrations table created by migration 004
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import { 
  TenantCommunicationIntegration,
  TenantCommChannel,
  StageChannelMapping,
  CommunicationType, 
  VerificationStatus
} from './slack-types';

// ============================================================================
// Model Definition
// ============================================================================

export function createSlackIntegrationModel(sequelize: Sequelize) {
  class SlackIntegrationModel extends Model<TenantCommunicationIntegration> 
    implements TenantCommunicationIntegration {
    
    // Primary fields
    declare id: string;
    declare tenantId: string;
    declare communicationType: CommunicationType;
    
    // Slack configuration
    declare slackBotToken: string;
    declare slackBotUserId: string | null;
    declare slackWorkspaceId: string | null;
    declare slackWorkspaceName: string | null;
    
    // Verification status
    declare verificationStatus: VerificationStatus;
    
    // Metadata
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  SlackIntegrationModel.init(
    {
      // ========================================================================
      // PRIMARY KEY
      // ========================================================================
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier (nanoid)',
      },
      
      // ========================================================================
      // FOREIGN KEY - TENANT
      // ========================================================================
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to tenants table',
      },
      
      // ========================================================================
      // COMMUNICATION PLATFORM TYPE
      // ========================================================================
      communicationType: {
        type: DataTypes.ENUM(...Object.values(CommunicationType)),
        allowNull: false,
        defaultValue: CommunicationType.SLACK,
        comment: 'Communication platform type (extensible)',
      },
      
      // ========================================================================
      // SLACK CONFIGURATION
      // ========================================================================
      slackBotToken: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Slack Bot Token (xoxb-...) - ENCRYPTED at application level',
      },
      
      slackBotUserId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Slack Bot User ID (e.g., U01234ABCDE)',
      },
      
      slackWorkspaceId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Slack Workspace/Team ID (e.g., T01234ABCDE)',
      },
      
      slackWorkspaceName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Slack Workspace Name (e.g., "Acme Corp")',
      },
      
      // ========================================================================
      // VERIFICATION STATUS
      // ========================================================================
      verificationStatus: {
        type: DataTypes.ENUM(...Object.values(VerificationStatus)),
        allowNull: false,
        defaultValue: VerificationStatus.PENDING,
        comment: 'Connection verification status',
      },
      
      // ========================================================================
      // METADATA
      // ========================================================================
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'tenant_comm_integrations',
      timestamps: true,
      indexes: [
        // Query integrations by tenant
        {
          name: 'idx_comm_tenant',
          fields: ['tenantId'],
        },
        // Query by platform type
        {
          name: 'idx_comm_type',
          fields: ['communicationType'],
        },
        // Find failed connections
        {
          name: 'idx_comm_verification',
          fields: ['verificationStatus'],
        },
      ],
    }
  );

  return SlackIntegrationModel;
}

// ============================================================================
// Channel Configuration Model (tenant_comm_channels table)
// ============================================================================

export function createChannelConfigModel(sequelize: Sequelize) {
  class ChannelConfigModel extends Model<TenantCommChannel> 
    implements TenantCommChannel {
    
    // Primary fields
    declare id: string;
    declare integrationId: string;
    declare tenantId: string;
    declare channelData: StageChannelMapping;
    
    // Metadata
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  ChannelConfigModel.init(
    {
      // ========================================================================
      // PRIMARY KEY
      // ========================================================================
      id: {
        type: DataTypes.STRING(21),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier (nanoid - 21 chars)',
      },
      
      // ========================================================================
      // FOREIGN KEY - INTEGRATION
      // ========================================================================
      integrationId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
          model: 'tenant_comm_integrations',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to tenant_comm_integrations table',
      },
      
      // ========================================================================
      // FOREIGN KEY - TENANT (Denormalized)
      // ========================================================================
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to tenants table (denormalized for easier queries)',
      },
      
      // ========================================================================
      // CHANNEL CONFIGURATION
      // ========================================================================
      channelData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Stage-to-channels mapping: {"stage1": ["C123"], "stage2": ["C456"]}',
      },
      
      // ========================================================================
      // METADATA
      // ========================================================================
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      },
      {
        sequelize,
        tableName: 'slack_configuration',
        timestamps: true,
        indexes: [
        // Query channels by integration (non-unique - multiple releases per integration)
        {
          name: 'idx_channels_integration',
          fields: ['integrationId'],
        },
        // Query channels by tenant (non-unique - multiple releases per tenant)
        {
          name: 'idx_channels_tenant',
          fields: ['tenantId'],
        },
      ],
    }
  );

  return ChannelConfigModel;
}
