-- ============================================================================
-- MIGRATION 017 ROLLBACK: Remove columns added in migration 017
-- ============================================================================
-- Purpose: Removes columns added to align releases table with Sequelize model
-- ============================================================================
-- Date: 2025-11-25
-- Compatible with: MySQL 5.7+
-- ============================================================================

SELECT 'Starting Migration 017 Rollback: Remove Sequelize model columns' as Status;

-- Drop indexes first
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND INDEX_NAME = 'idx_releases_releaseId'
);

SET @sql = IF(@index_exists > 0,
  'ALTER TABLE releases DROP INDEX idx_releases_releaseId',
  'SELECT "idx_releases_releaseId does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop columns (in reverse order)
SET @columns_to_drop = (
  SELECT GROUP_CONCAT(COLUMN_NAME) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME IN ('releaseId', 'releaseConfigId', 'baseReleaseId', 'kickOffDate', 'branch', 'hasManualBuildUpload', 'customIntegrationConfigs', 'preCreatedBuilds', 'createdBy', 'lastUpdatedBy')
);

-- Drop each column if it exists
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'lastUpdatedBy') > 0,
  'ALTER TABLE releases DROP COLUMN lastUpdatedBy',
  'SELECT "lastUpdatedBy does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'createdBy') > 0,
  'ALTER TABLE releases DROP COLUMN createdBy',
  'SELECT "createdBy does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'preCreatedBuilds') > 0,
  'ALTER TABLE releases DROP COLUMN preCreatedBuilds',
  'SELECT "preCreatedBuilds does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'customIntegrationConfigs') > 0,
  'ALTER TABLE releases DROP COLUMN customIntegrationConfigs',
  'SELECT "customIntegrationConfigs does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'hasManualBuildUpload') > 0,
  'ALTER TABLE releases DROP COLUMN hasManualBuildUpload',
  'SELECT "hasManualBuildUpload does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'branch') > 0,
  'ALTER TABLE releases DROP COLUMN branch',
  'SELECT "branch does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'kickOffDate') > 0,
  'ALTER TABLE releases DROP COLUMN kickOffDate',
  'SELECT "kickOffDate does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'baseReleaseId') > 0,
  'ALTER TABLE releases DROP COLUMN baseReleaseId',
  'SELECT "baseReleaseId does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'releaseConfigId') > 0,
  'ALTER TABLE releases DROP INDEX idx_release_config, DROP COLUMN releaseConfigId',
  'SELECT "releaseConfigId does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' AND COLUMN_NAME = 'releaseId') > 0,
  'ALTER TABLE releases DROP COLUMN releaseId',
  'SELECT "releaseId does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration 017 rollback completed successfully' as Status;

