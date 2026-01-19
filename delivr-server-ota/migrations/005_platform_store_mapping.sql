-- ============================================================================
-- Migration: Platform Store Mapping & Change INTERNAL to FIREBASE
-- Version: 005
-- Date: 2025-11-20
-- Description: 
--   1. Changes INTERNAL to FIREBASE in store_integrations.storeType enum
--   2. Creates platform_store_type_mapping table for static platform-to-store mapping
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- STEP 1: Change INTERNAL to FIREBASE in store_integrations table
-- ============================================================================

-- First, update any existing INTERNAL values to FIREBASE
UPDATE store_integrations 
SET storeType = 'FIREBASE' 
WHERE storeType = 'INTERNAL';

-- Modify the enum to replace INTERNAL with FIREBASE
-- Note: MySQL doesn't support direct enum modification, so we need to:
-- 1. Add FIREBASE to the enum
-- 2. Remove INTERNAL (if no data exists with that value)

-- Check if we can safely modify the enum
SET @hasInternal = (
  SELECT COUNT(*) 
  FROM store_integrations 
  WHERE storeType = 'INTERNAL'
);

-- If no INTERNAL values exist, we can modify the enum
-- Otherwise, we'll need to handle it differently
SET @query = IF(@hasInternal = 0,
  'ALTER TABLE store_integrations MODIFY COLUMN storeType ENUM(\'APP_STORE\', \'PLAY_STORE\', \'TESTFLIGHT\', \'MICROSOFT_STORE\', \'FIREBASE\') NOT NULL',
  'SELECT "Cannot modify enum - INTERNAL values still exist. Please update them first." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 2: Create platform_store_type_mapping table
-- ============================================================================

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

-- ============================================================================
-- STEP 3: Insert static seed data
-- ============================================================================

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
-- Verification
-- ============================================================================

SELECT 
  'platform_store_type_mapping' as table_name,
  COUNT(*) as row_count
FROM platform_store_type_mapping;

SELECT 
  platform,
  allowedStoreTypes
FROM platform_store_type_mapping
ORDER BY platform;

DESCRIBE platform_store_type_mapping;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

