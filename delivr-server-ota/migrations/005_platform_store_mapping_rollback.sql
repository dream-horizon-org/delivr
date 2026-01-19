-- ============================================================================
-- Rollback: Platform Store Mapping & FIREBASE to INTERNAL
-- Version: 005 (Rollback)
-- Date: 2025-11-20
-- WARNING: This will revert FIREBASE back to INTERNAL and remove platform mapping
-- ============================================================================

USE codepushdb;

-- Drop platform_store_type_mapping table
DROP TABLE IF EXISTS platform_store_type_mapping;

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
-- END OF ROLLBACK
-- ============================================================================

