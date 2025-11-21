-- ============================================================================
-- Consolidated Rollback: Store Integrations (Complete)
-- Versions: 008, 007, 006, 005, 004.1, 004 (Rollback)
-- Date: 2025-11-21
-- WARNING: This will delete all store integration data and revert all changes!
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- ROLLBACK 008: Remove platform column from store_integrations
-- ============================================================================

-- Drop index first (if exists)
SET @indexExists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'store_integrations' 
    AND INDEX_NAME = 'idx_store_integrations_platform'
);

SET @query = IF(@indexExists > 0,
  'DROP INDEX idx_store_integrations_platform ON store_integrations',
  'SELECT "Index idx_store_integrations_platform does not exist, skipping." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove platform column (if exists)
SET @columnExists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'store_integrations' 
    AND COLUMN_NAME = 'platform'
);

SET @query = IF(@columnExists > 0,
  'ALTER TABLE store_integrations DROP COLUMN platform',
  'SELECT "Column platform does not exist, skipping." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- ROLLBACK 007: Rename platform_store_type_mapping back to Platform_StoreType_Mapping
-- ============================================================================
-- Note: This is only needed if the table was renamed in migration 007

SET @tableExists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'platform_store_type_mapping'
);

SET @query = IF(@tableExists > 0,
  'RENAME TABLE platform_store_type_mapping TO Platform_StoreType_Mapping',
  'SELECT "Table platform_store_type_mapping does not exist, skipping rename." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- ROLLBACK 006: Rename platform_store_type_mapping back to platform_store_mapping
-- ============================================================================
-- Note: This is only needed if the table was renamed in migration 006

SET @tableExists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND (TABLE_NAME = 'platform_store_type_mapping' OR TABLE_NAME = 'Platform_StoreType_Mapping')
);

SET @query = IF(@tableExists > 0,
  'RENAME TABLE platform_store_type_mapping TO platform_store_mapping',
  'SELECT "Table does not exist, skipping rename." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- ROLLBACK 005: Platform Store Mapping & FIREBASE to INTERNAL
-- ============================================================================

-- Drop platform_store_type_mapping table (or platform_store_mapping if renamed)
DROP TABLE IF EXISTS platform_store_type_mapping;
DROP TABLE IF EXISTS platform_store_mapping;
DROP TABLE IF EXISTS Platform_StoreType_Mapping;

-- Revert FIREBASE back to INTERNAL in store_integrations
UPDATE store_integrations 
SET storeType = 'INTERNAL' 
WHERE storeType = 'FIREBASE';

-- Modify enum back to INTERNAL (if no FIREBASE values exist)
SET @hasFirebase = (
  SELECT COUNT(*) 
  FROM store_integrations 
  WHERE storeType = 'FIREBASE'
);

SET @query = IF(@hasFirebase = 0,
  'ALTER TABLE store_integrations MODIFY COLUMN storeType ENUM(\'APP_STORE\', \'PLAY_STORE\', \'TESTFLIGHT\', \'MICROSOFT_STORE\', \'INTERNAL\') NOT NULL',
  'SELECT "Cannot modify enum - FIREBASE values still exist. Please update them first." AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- ROLLBACK 004.1: Remove Track Validation Constraint
-- ============================================================================

ALTER TABLE store_integrations DROP CONSTRAINT IF EXISTS chk_store_track_valid;

-- ============================================================================
-- ROLLBACK 004: Drop Store Integrations Tables
-- ============================================================================

-- Drop foreign keys first
ALTER TABLE store_credentials DROP FOREIGN KEY IF EXISTS fk_creds_integration;
ALTER TABLE store_integrations DROP FOREIGN KEY IF EXISTS fk_store_created_by;
ALTER TABLE store_integrations DROP FOREIGN KEY IF EXISTS fk_store_tenant;

-- Drop tables
DROP TABLE IF EXISTS store_credentials;
DROP TABLE IF EXISTS store_integrations;

-- ============================================================================
-- END OF CONSOLIDATED ROLLBACK
-- ============================================================================

