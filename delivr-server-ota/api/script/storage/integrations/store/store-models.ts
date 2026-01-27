/**
 * Store Integration Sequelize Models
 * 
 * Defines Sequelize models for store integrations
 * (App Store Connect, Google Play, TestFlight, etc.)
 * Matches the store_integrations and store_credentials table schemas
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import { 
  StoreIntegration, 
  StoreCredential,
  StoreType, 
  IntegrationStatus,
  CredentialType,
  DefaultTrack
} from './store-types';

// ============================================================================
// Store Integration Model
// ============================================================================

export function createStoreIntegrationModel(sequelize: Sequelize) {
  class StoreIntegrationModel extends Model<StoreIntegration> 
    implements StoreIntegration {
    declare id: string;
    declare tenantId: string;
    declare storeType: StoreType;
    declare platform: 'ANDROID' | 'IOS';
    declare displayName: string;
    declare appIdentifier: string;
    declare targetAppId: string | null;
    declare defaultLocale: string | null;
    declare teamName: string | null;
    declare defaultTrack: DefaultTrack | null;
    declare status: IntegrationStatus;
    declare lastVerifiedAt: Date | null;
    declare createdByAccountId: string;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  StoreIntegrationModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier (nanoid)',
      },
      tenantId: {
        type: DataTypes.UUID,  // Changed from CHAR(36) to UUID to match App.id
        allowNull: false,
        references: {
          model: 'apps',  // Changed from 'tenants' to 'apps' (renamed table)
          key: 'id',
        },
        comment: 'Reference to apps table (renamed from tenants)',
      },
      storeType: {
        type: DataTypes.ENUM(...Object.values(StoreType)),
        allowNull: false,
        comment: 'Store provider type',
      },
      platform: {
        type: DataTypes.ENUM('ANDROID', 'IOS'),
        allowNull: false,
        comment: 'Platform type (Android or iOS)',
      },
      displayName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'User-friendly name',
      },
      appIdentifier: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Bundle ID (iOS) or Package Name (Android)',
      },
      targetAppId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Store-specific app ID',
      },
      defaultLocale: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Default locale (e.g., "en-US")',
      },
      teamName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Apple team name',
      },
      defaultTrack: {
        type: DataTypes.ENUM(...Object.values(DefaultTrack)),
        allowNull: true,
        comment: 'Google Play track or TestFlight',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(IntegrationStatus)),
        allowNull: false,
        defaultValue: IntegrationStatus.PENDING,
        comment: 'Integration status',
      },
      lastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last successful verification',
      },
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Account who created this',
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
      tableName: 'store_integrations',
      timestamps: true,
      charset: 'latin1',
      collate: 'latin1_bin',
      indexes: [
        {
          name: 'idx_store_tenant',
          fields: ['tenantId', 'status'],
        },
        {
          name: 'idx_store_type',
          fields: ['storeType'],
        },
        {
          name: 'idx_store_app_identifier',
          fields: ['appIdentifier'],
        },
      ],
    }
  );

  return StoreIntegrationModel;
}

// ============================================================================
// Store Credential Model
// ============================================================================

export function createStoreCredentialModel(sequelize: Sequelize) {
  class StoreCredentialModel extends Model<StoreCredential> 
    implements StoreCredential {
    declare id: string;
    declare integrationId: string;
    declare credentialType: CredentialType;
    declare encryptedPayload: Buffer;
    declare encryptionScheme: string;
    declare rotatedAt: Date | null;
    declare createdAt: Date;
  }

  StoreCredentialModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier (nanoid)',
      },
      integrationId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Reference to store_integrations table',
      },
      credentialType: {
        type: DataTypes.ENUM(...Object.values(CredentialType)),
        allowNull: false,
        comment: 'Type of credential',
      },
      encryptedPayload: {
        type: DataTypes.BLOB('long'),
        allowNull: false,
        comment: 'Encrypted credential data (JSON)',
      },
      encryptionScheme: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'AES-256-GCM',
        comment: 'Encryption method used',
      },
      rotatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When credential was rotated',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'store_credentials',
      timestamps: false,
      charset: 'latin1',
      collate: 'latin1_bin',
      indexes: [
        {
          name: 'idx_creds_integration',
          fields: ['integrationId'],
        },
        {
          name: 'idx_creds_type',
          fields: ['credentialType'],
        },
      ],
    }
  );

  return StoreCredentialModel;
}

