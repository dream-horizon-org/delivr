-- ============================================================================
-- Migration: Store Integrations (App Store, Play Store, etc.)
-- Version: 004
-- Date: 2025-11-11
-- Description: Creates tables for store integrations (App Store Connect, Google Play)
--              Supports multiple stores per tenant with encrypted credentials
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- STORE_INTEGRATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_integrations (
  -- Primary key
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (nanoid)',
  
  -- Tenant reference (matches tenants.id exactly)
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'Reference to tenants table',
  
  -- Store type
  storeType ENUM('APP_STORE', 'PLAY_STORE', 'TESTFLIGHT', 'MICROSOFT_STORE', 'INTERNAL') NOT NULL COMMENT 'Store provider type',
  
  -- Display name
  displayName VARCHAR(255) NOT NULL COMMENT 'User-friendly name (e.g., "Dream Play iOS")',
  
  -- App identification
  appIdentifier VARCHAR(255) NOT NULL COMMENT 'Bundle ID (iOS) or Package Name (Android)',
  targetAppId VARCHAR(255) NULL COMMENT 'Store-specific app ID (e.g., App Store Connect app ID)',
  
  -- Store-specific configuration
  defaultLocale VARCHAR(10) NULL COMMENT 'Default locale (e.g., "en-US")',
  teamName VARCHAR(255) NULL COMMENT 'Apple team name',
  defaultTrack ENUM('PRODUCTION', 'BETA', 'ALPHA', 'INTERNAL', 'TESTFLIGHT') NULL COMMENT 'Google Play track or TestFlight',
  
  -- Status & verification
  status ENUM('PENDING', 'VERIFIED', 'REVOKED') NOT NULL DEFAULT 'PENDING' COMMENT 'Integration status',
  lastVerifiedAt DATETIME NULL COMMENT 'Last successful verification',
  
  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL COMMENT 'Account who created this',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_store_tenant (tenantId, status) COMMENT 'Query integrations by tenant and status',
  INDEX idx_store_type (storeType) COMMENT 'Query by store type',
  INDEX idx_store_app_identifier (appIdentifier) COMMENT 'Query by app identifier',
  
  -- Unique constraint: One integration per tenant + store type + app identifier
  UNIQUE KEY unique_tenant_store_app (tenantId, storeType, appIdentifier) COMMENT 'One integration per tenant/store/app combination'
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1 
COMMENT='Store integrations (App Store Connect, Google Play, etc.)';

-- ============================================================================
-- STORE_CREDENTIALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_credentials (
  -- Primary key
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (nanoid)',
  
  -- Integration reference
  integrationId VARCHAR(255) NOT NULL COMMENT 'Reference to store_integrations table',
  
  -- Credential type
  credentialType ENUM('APPLE_API_KEY', 'GOOGLE_SERVICE_ACCOUNT', 'MICROSOFT_PARTNER_CENTER', 'CUSTOM') NOT NULL COMMENT 'Type of credential',
  
  -- Encrypted payload (application-level encryption before storage)
  encryptedPayload LONGBLOB NOT NULL COMMENT 'Encrypted credential data (JSON)',
  encryptionScheme VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM' COMMENT 'Encryption method used',
  
  -- Rotation tracking
  rotatedAt DATETIME NULL COMMENT 'When credential was rotated',
  
  -- Metadata
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_creds_integration (integrationId) COMMENT 'Query credentials by integration',
  INDEX idx_creds_type (credentialType) COMMENT 'Query by credential type'
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1 
COMMENT='Encrypted store credentials (API keys, service accounts, etc.)';

-- ============================================================================
-- Add foreign key constraints
-- ============================================================================

ALTER TABLE store_integrations
  ADD CONSTRAINT fk_store_tenant
    FOREIGN KEY (tenantId) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE store_integrations
  ADD CONSTRAINT fk_store_created_by
    FOREIGN KEY (createdByAccountId)
    REFERENCES accounts(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE store_credentials
  ADD CONSTRAINT fk_creds_integration
    FOREIGN KEY (integrationId)
    REFERENCES store_integrations(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  'store_integrations' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'store_integrations';

SELECT 
  'store_credentials' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'store_credentials';

DESCRIBE store_integrations;
DESCRIBE store_credentials;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

