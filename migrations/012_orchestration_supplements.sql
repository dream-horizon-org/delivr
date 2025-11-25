-- ============================================================================
-- MIGRATION 012: Orchestration Supplements
-- ============================================================================
-- Purpose: Adds fields missing from migration 011 that are required by
--          orchestration code
-- Run after: 011_local_code_requirements.sql
-- ============================================================================
-- Date: 2025-11-22
-- Compatible with: MySQL 5.7+
-- ============================================================================

SELECT 'Starting Migration 012: Orchestration Supplements' as Status;

-- ============================================================================
-- STEP 1: Add releaseConfigId to releases (CRITICAL FOR MERGE!)
-- ============================================================================

SELECT 'Step 1: Adding releaseConfigId to releases' as Status;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'releaseConfigId'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE releases ADD COLUMN releaseConfigId VARCHAR(255) NULL COMMENT "FK to release_configs table"',
  'SELECT "releaseConfigId already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND INDEX_NAME = 'idx_release_config'
);

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE releases ADD INDEX idx_release_config (releaseConfigId)',
  'SELECT "idx_release_config already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ releaseConfigId added to releases' as Status;

-- ============================================================================
-- STEP 2: Add externalId to release_tasks (CRITICAL!)
-- ============================================================================

SELECT 'Step 2: Adding externalId to release_tasks' as Status;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'release_tasks' 
    AND COLUMN_NAME = 'externalId'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE release_tasks ADD COLUMN externalId VARCHAR(255) NULL COMMENT "ID returned by integration (e.g., JIRA-123, BUILD-456)"',
  'SELECT "externalId already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'release_tasks' 
    AND INDEX_NAME = 'idx_external_id'
);

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE release_tasks ADD INDEX idx_external_id (externalId)',
  'SELECT "idx_external_id already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ externalId added to release_tasks' as Status;

-- ============================================================================
-- STEP 3: Update cron_jobs table structure
-- ============================================================================

SELECT 'Step 3: Updating cron_jobs table structure' as Status;

-- Add cronCreatedAt
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'cronCreatedAt'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN cronCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT "cronCreatedAt already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add cronStoppedAt
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'cronStoppedAt'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN cronStoppedAt TIMESTAMP NULL',
  'SELECT "cronStoppedAt already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add cronCreatedByAccountId
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'cronCreatedByAccountId'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN cronCreatedByAccountId VARCHAR(255) NULL',
  'SELECT "cronCreatedByAccountId already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add regressionTimings
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'regressionTimings'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN regressionTimings VARCHAR(255) DEFAULT "09:00,17:00"',
  'SELECT "regressionTimings already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add upcomingRegressions
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'upcomingRegressions'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN upcomingRegressions JSON NULL',
  'SELECT "upcomingRegressions already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add regressionTimestamp
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'regressionTimestamp'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN regressionTimestamp VARCHAR(255) NULL',
  'SELECT "regressionTimestamp already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add autoTransitionToStage3
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'autoTransitionToStage3'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN autoTransitionToStage3 BOOLEAN DEFAULT FALSE COMMENT "Controls Stage 2 to Stage 3 transition"',
  'SELECT "autoTransitionToStage3 already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add lockTimeout (integer seconds)
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'lockTimeout'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN lockTimeout INT NOT NULL DEFAULT 300 COMMENT "Lock timeout in seconds"',
  'SELECT "lockTimeout already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename status to cronStatus for consistency
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'status'
);

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE cron_jobs CHANGE COLUMN status cronStatus ENUM("ACTIVE", "PAUSED", "COMPLETED", "FAILED") NOT NULL DEFAULT "ACTIVE"',
  'SELECT "status already renamed to cronStatus" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ cron_jobs table structure updated' as Status;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT '========================================' as '';
SELECT '✅ MIGRATION 012 COMPLETE' as Status;
SELECT '========================================' as '';
SELECT 'Orchestration supplements added:' as '';
SELECT '  ✅ releaseConfigId → releases table' as '';
SELECT '  ✅ externalId → release_tasks table' as '';
SELECT '  ✅ Complete cron_jobs structure' as '';
SELECT '========================================' as '';
SELECT 'You can now run orchestration features!' as '';
SELECT '========================================' as '';

