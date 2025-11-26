-- ============================================================================
-- MIGRATION 016: Add releaseId column to releases table
-- ============================================================================
-- Purpose: Adds releaseId column to releases table to match Sequelize model
--          The releaseId is a user-facing identifier (e.g., "REL-ABC123")
--          This is separate from releaseKey which may serve a different purpose
-- Run after: 015_add_project_id_to_test_management_configs.sql
-- ============================================================================
-- Date: 2025-11-25
-- Compatible with: MySQL 5.7+
-- ============================================================================

SELECT 'Starting Migration 016: Add releaseId to releases' as Status;

-- ============================================================================
-- STEP 1: Add releaseId column to releases table
-- ============================================================================

SELECT 'Step 1: Adding releaseId column to releases' as Status;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'releaseId'
);

-- Add column as nullable first (to handle existing records)
SET @sql = IF(@column_exists = 0,
  'ALTER TABLE releases ADD COLUMN releaseId VARCHAR(255) NULL COMMENT "User-facing release identifier (e.g., REL-001)" AFTER id',
  'SELECT "releaseId already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 2: Populate releaseId for existing records (if any)
-- ============================================================================
-- Generate releaseId for existing releases that don't have one
-- Format: REL-{first 8 chars of UUID}

SELECT 'Step 2: Populating releaseId for existing releases' as Status;

SET @sql = '
  UPDATE releases 
  SET releaseId = CONCAT("REL-", UPPER(SUBSTRING(REPLACE(UUID(), "-", ""), 1, 8)))
  WHERE releaseId IS NULL OR releaseId = ""
';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 3: Make releaseId NOT NULL and UNIQUE
-- ============================================================================

SELECT 'Step 3: Making releaseId NOT NULL and UNIQUE' as Status;

-- First, ensure all records have a releaseId
SET @null_count = (SELECT COUNT(*) FROM releases WHERE releaseId IS NULL OR releaseId = '');
SET @sql = IF(@null_count > 0,
  'UPDATE releases SET releaseId = CONCAT("REL-", UPPER(SUBSTRING(REPLACE(UUID(), "-", ""), 1, 8))) WHERE releaseId IS NULL OR releaseId = ""',
  'SELECT "All records have releaseId" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add unique index first
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND INDEX_NAME = 'idx_releases_releaseId'
);

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE releases ADD UNIQUE INDEX idx_releases_releaseId (releaseId)',
  'SELECT "idx_releases_releaseId already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Then make it NOT NULL
SET @sql = 'ALTER TABLE releases MODIFY COLUMN releaseId VARCHAR(255) NOT NULL';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration 016 completed successfully' as Status;

