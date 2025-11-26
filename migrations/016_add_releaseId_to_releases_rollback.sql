-- ============================================================================
-- MIGRATION 016 ROLLBACK: Remove releaseId column from releases table
-- ============================================================================
-- Purpose: Removes releaseId column added in migration 016
-- ============================================================================
-- Date: 2025-11-25
-- Compatible with: MySQL 5.7+
-- ============================================================================

SELECT 'Starting Migration 016 Rollback: Remove releaseId from releases' as Status;

-- ============================================================================
-- STEP 1: Drop unique index on releaseId
-- ============================================================================

SELECT 'Step 1: Dropping unique index on releaseId' as Status;

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

-- ============================================================================
-- STEP 2: Drop releaseId column
-- ============================================================================

SELECT 'Step 2: Dropping releaseId column' as Status;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'releaseId'
);

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE releases DROP COLUMN releaseId',
  'SELECT "releaseId column does not exist" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration 016 rollback completed successfully' as Status;

