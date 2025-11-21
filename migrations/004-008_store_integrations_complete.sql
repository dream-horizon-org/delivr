-- ============================================================================
-- Consolidated Migration: Store Integrations (Complete)
-- Versions: 004, 004.1, 005, 006, 007, 008
-- Date: 2025-11-21
-- Description: Complete migration for store integrations including:
--   - Create store_integrations and store_credentials tables
--   - Add track validation constraints
--   - Change INTERNAL to FIREBASE in storeType enum
--   - Create platform_store_type_mapping table
--   - Add platform column to store_integrations
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- MIGRATION 004: Store Integrations Tables
-- ============================================================================

-- ============================================================================
-- STORE_INTEGRATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_integrations (
  -- Primary key
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (nanoid)',
  
  -- Tenant reference (matches tenants.id exactly)
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'Reference to tenants table',
  
  -- Store type
  storeType ENUM('APP_STORE', 'PLAY_STORE', 'TESTFLIGHT', 'MICROSOFT_STORE', 'FIREBASE') NOT NULL COMMENT 'Store provider type',
  
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
-- MIGRATION 004.1: Add Track Validation Constraints
-- ============================================================================

ALTER TABLE store_integrations
  ADD CONSTRAINT chk_store_track_valid
    CHECK (
      -- APP_STORE and TESTFLIGHT can have any track including TESTFLIGHT
      (storeType IN ('APP_STORE', 'TESTFLIGHT') AND defaultTrack IN ('PRODUCTION', 'BETA', 'ALPHA', 'INTERNAL', 'TESTFLIGHT', NULL))
      OR
      -- PLAY_STORE cannot have TESTFLIGHT track
      (storeType = 'PLAY_STORE' AND defaultTrack IN ('PRODUCTION', 'BETA', 'ALPHA', 'INTERNAL', NULL))
      OR
      -- MICROSOFT_STORE and FIREBASE can have any track except TESTFLIGHT
      (storeType IN ('MICROSOFT_STORE', 'FIREBASE') AND defaultTrack IN ('PRODUCTION', 'BETA', 'ALPHA', 'INTERNAL', NULL))
      OR
      -- NULL defaultTrack is always valid
      (defaultTrack IS NULL)
    );

-- ============================================================================
-- MIGRATION 005: Platform Store Mapping & Change INTERNAL to FIREBASE
-- ============================================================================

-- Update any existing INTERNAL values to FIREBASE (if any exist from old data)
UPDATE store_integrations 
SET storeType = 'FIREBASE' 
WHERE storeType = 'INTERNAL';

-- Modify the enum to ensure FIREBASE is present (if table was just created, enum already has FIREBASE)
-- Check if we can safely modify the enum
SET @hasInternal = (
  SELECT COUNT(*) 
  FROM store_integrations 
  WHERE storeType = 'INTERNAL'
);

-- If no INTERNAL values exist, we can modify the enum
SET @query = IF(@hasInternal = 0,
  'ALTER TABLE store_integrations MODIFY COLUMN storeType ENUM(\'APP_STORE\', \'PLAY_STORE\', \'TESTFLIGHT\', \'MICROSOFT_STORE\', \'FIREBASE\') NOT NULL',
  'SELECT "Cannot modify enum - INTERNAL values still exist. Please update them first." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create platform_store_type_mapping table
CREATE TABLE IF NOT EXISTS platform_store_type_mapping (
  -- Primary key
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (nanoid)',
  
  -- Platform (Android or iOS)
  platform ENUM('ANDROID', 'IOS') NOT NULL COMMENT 'Platform type',
  
  -- Store type (comma-separated or JSON - using JSON for flexibility)
  allowedStoreTypes JSON NOT NULL COMMENT 'Array of allowed store types for this platform',
  
  -- Metadata
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Unique constraint: One mapping per platform
  UNIQUE KEY unique_platform (platform) COMMENT 'One mapping per platform'
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1 
COMMENT='Platform to store type mapping (static reference data)';

-- Insert static seed data
-- Android platform mapping
INSERT INTO platform_store_type_mapping (id, platform, allowedStoreTypes)
VALUES (
  'platform_android_001',
  'ANDROID',
  JSON_ARRAY('PLAY_STORE', 'MICROSOFT_STORE', 'FIREBASE')
)
ON DUPLICATE KEY UPDATE 
  allowedStoreTypes = JSON_ARRAY('PLAY_STORE', 'MICROSOFT_STORE', 'FIREBASE'),
  updatedAt = CURRENT_TIMESTAMP;

-- iOS platform mapping
INSERT INTO platform_store_type_mapping (id, platform, allowedStoreTypes)
VALUES (
  'platform_ios_001',
  'IOS',
  JSON_ARRAY('APP_STORE', 'TESTFLIGHT', 'FIREBASE')
)
ON DUPLICATE KEY UPDATE 
  allowedStoreTypes = JSON_ARRAY('APP_STORE', 'TESTFLIGHT', 'FIREBASE'),
  updatedAt = CURRENT_TIMESTAMP;

-- ============================================================================
-- MIGRATION 006: Rename platform_store_mapping (if exists) to platform_store_type_mapping
-- ============================================================================
-- Note: This migration handles the case where the table might have been created with the old name
-- If platform_store_type_mapping already exists (from migration 005), this will be a no-op

SET @tableExists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'platform_store_mapping'
);

SET @query = IF(@tableExists > 0,
  'RENAME TABLE platform_store_mapping TO platform_store_type_mapping',
  'SELECT "Table platform_store_mapping does not exist, skipping rename." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- MIGRATION 007: Rename Platform_StoreType_Mapping to lowercase (if exists)
-- ============================================================================
-- Note: This handles the case where the table might have been created with mixed case

SET @tableExists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Platform_StoreType_Mapping'
);

SET @query = IF(@tableExists > 0,
  'RENAME TABLE Platform_StoreType_Mapping TO platform_store_type_mapping',
  'SELECT "Table Platform_StoreType_Mapping does not exist, skipping rename." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- MIGRATION 008: Add platform column to store_integrations
-- ============================================================================

-- Add platform column (only if it doesn't exist)
SET @columnExists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'store_integrations' 
    AND COLUMN_NAME = 'platform'
);

SET @query = IF(@columnExists = 0,
  'ALTER TABLE store_integrations ADD COLUMN platform ENUM(\'ANDROID\', \'IOS\') NOT NULL COMMENT \'Platform type (Android or iOS)\' AFTER storeType',
  'SELECT "Column platform already exists, skipping." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for platform (only if it doesn't exist)
SET @indexExists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'store_integrations' 
    AND INDEX_NAME = 'idx_store_integrations_platform'
);

SET @query = IF(@indexExists = 0,
  'CREATE INDEX idx_store_integrations_platform ON store_integrations(platform)',
  'SELECT "Index idx_store_integrations_platform already exists, skipping." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

SELECT 
  'platform_store_type_mapping' as table_name,
  COUNT(*) as row_count
FROM platform_store_type_mapping;

DESCRIBE store_integrations;
DESCRIBE store_credentials;
DESCRIBE platform_store_type_mapping;

-- ============================================================================
-- END OF CONSOLIDATED MIGRATION
-- ============================================================================

