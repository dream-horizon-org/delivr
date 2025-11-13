/**
 * Sequelize Model for Communication Integrations (Slack)
 * 
 * Defines the database model using Sequelize ORM
 * Matches the tenant_communication_integrations table created by migration 004
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import { 
  TenantCommunicationIntegration,
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
    declare slackChannels: any | null;
    
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
        type: DataTypes.CHAR(36),
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
      
      slackChannels: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of available Slack channels: [{id, name}]',
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
      tableName: 'tenant_communication_integrations',
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
