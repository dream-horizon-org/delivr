/**
 * Sequelize Model for SCM Integrations
 * 
 * Defines the database model using Sequelize ORM
 * Matches the tenant_scm_integrations table created by migration 003
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import { 
  TenantSCMIntegration, 
  SCMType, 
  VerificationStatus 
} from './scm-types';

// ============================================================================
// Model Definition
// ============================================================================

export function createSCMIntegrationModel(sequelize: Sequelize) {
  class SCMIntegrationModel extends Model<TenantSCMIntegration> 
    implements TenantSCMIntegration {
    
    // Primary fields
    declare id: string;
    declare tenantId: string;
    declare scmType: SCMType;
    declare displayName: string;
    
    // GitHub core fields (from OG Delivr)
    declare owner: string;
    declare repo: string;
    declare repositoryUrl: string;
    declare defaultBranch: string;
    declare accessToken: string;
    
    // Webhook configuration
    declare webhookSecret: string | null;
    declare webhookUrl: string | null;
    declare webhookEnabled: boolean;
    declare senderLogin: string | null;
    
    // Extensibility
    declare providerConfig: any | null;
    
    // Status
    declare isActive: boolean;
    declare verificationStatus: VerificationStatus;
    declare lastVerifiedAt: Date | null;
    declare verificationError: string | null;
    
    // Metadata
    declare createdByAccountId: string;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  SCMIntegrationModel.init(
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
      // PROVIDER TYPE
      // ========================================================================
      scmType: {
        type: DataTypes.ENUM(...Object.values(SCMType)),
        allowNull: false,
        defaultValue: SCMType.GITHUB,
        comment: 'Provider type',
      },
      
      displayName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'User-friendly name',
      },
      
      // ========================================================================
      // GITHUB CORE FIELDS (OG Delivr requirements)
      // ========================================================================
      owner: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'GitHub organization or username (e.g., "dream11")',
      },
      
      repo: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Repository name (e.g., "d11-react-native")',
      },
      
      repositoryUrl: {
        type: DataTypes.STRING(512),
        allowNull: false,
        comment: 'Full repository URL',
      },
      
      defaultBranch: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'main',
        comment: 'Default branch for operations',
      },
      
      // ========================================================================
      // AUTHENTICATION (ENCRYPTED!)
      // ========================================================================
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'GitHub Personal Access Token (encrypted) - needs repo + workflow permissions',
      },
      
      // ========================================================================
      // WEBHOOK CONFIGURATION
      // ========================================================================
      webhookSecret: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Webhook secret for signature verification (encrypted)',
      },
      
      webhookUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
        comment: 'Delivr webhook endpoint URL',
      },
      
      webhookEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Is webhook active?',
      },
      
      senderLogin: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'GitHub username for commits/operations attribution',
      },
      
      // ========================================================================
      // EXTENSIBILITY
      // ========================================================================
      providerConfig: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional provider-specific configuration',
      },
      
      // ========================================================================
      // STATUS & VERIFICATION
      // ========================================================================
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag',
      },
      
      verificationStatus: {
        type: DataTypes.ENUM(...Object.values(VerificationStatus)),
        allowNull: false,
        defaultValue: VerificationStatus.PENDING,
        comment: 'Connection status (verified via GitHub API)',
      },
      
      lastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last successful verification',
      },
      
      verificationError: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if verification failed',
      },
      
      // ========================================================================
      // METADATA
      // ========================================================================
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'User who created this',
      },
      
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
      tableName: 'tenant_scm_integrations',
      timestamps: true,
      indexes: [
        // Most common query: active integrations by tenant
        {
          name: 'idx_scm_tenant',
          fields: ['tenantId', 'isActive'],
        },
        // Query by GitHub org/repo
        {
          name: 'idx_scm_owner_repo',
          fields: ['owner', 'repo'],
        },
        // Find expired/failed connections
        {
          name: 'idx_scm_verification',
          fields: ['verificationStatus'],
        },
      ],
    }
  );

  return SCMIntegrationModel;
}

// ============================================================================
// Helper Methods (Optional - can add instance methods here)
// ============================================================================

// Example: Check if token might be expired
// SCMIntegrationModel.prototype.needsReVerification = function() {
//   if (!this.lastVerifiedAt) return true;
//   const daysSinceVerification = (Date.now() - this.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24);
//   return daysSinceVerification > 7; // Re-verify after 7 days
// };

