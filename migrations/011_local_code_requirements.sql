-- ============================================================================
-- MIGRATION: 011 - Local Code Requirements
-- ============================================================================
-- Purpose: Adds ONLY the changes required for local code to work properly
--          Run this AFTER remote's 010_missing_tables.sql
--
-- Assumes: Remote migrations 001-010 are already applied
-- Adds: 
--   1. Column renames (createdBy, releasePilotId, lastUpdatedBy)
--   2. Orchestration columns (stageData, externalData, etc.)
--   3. New tables (cron_jobs, release_permissions)
--   4. Updated enums (platforms, task types)
-- ============================================================================
-- Date: 2025-11-22
-- Compatible with: MySQL 5.7+
-- ============================================================================

SELECT 'Starting Migration 011: Local Code Requirements' as Status;

-- ============================================================================
-- STEP 1: PLATFORM ENUM - Add 'WEB' platform
-- ============================================================================

SELECT 'Step 1: Adding WEB to platforms enum' as Status;

ALTER TABLE platforms 
MODIFY COLUMN name ENUM('ANDROID', 'IOS', 'WEB') NOT NULL UNIQUE;

SELECT '✅ Platform enum updated' as Status;

-- ============================================================================
-- STEP 2: RELEASES TABLE - Rename columns for local code
-- ============================================================================

SELECT 'Step 2: Renaming columns in releases table' as Status;

-- Check if old column names exist
SET @old_column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'createdBy'
);

-- Rename createdBy -> createdByAccountId
SET @sql = IF(@old_column_exists > 0,
  'ALTER TABLE releases CHANGE COLUMN createdBy createdByAccountId VARCHAR(255)',
  'SELECT "createdBy already renamed" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and rename releasePilotId
SET @old_column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'releasePilotId'
);

SET @sql = IF(@old_column_exists > 0,
  'ALTER TABLE releases CHANGE COLUMN releasePilotId releasePilotAccountId VARCHAR(255) NOT NULL',
  'SELECT "releasePilotId already renamed" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and rename lastUpdatedBy
SET @old_column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'lastUpdatedBy'
);

SET @sql = IF(@old_column_exists > 0,
  'ALTER TABLE releases CHANGE COLUMN lastUpdatedBy lastUpdateByAccountId VARCHAR(255) NOT NULL',
  'SELECT "lastUpdatedBy already renamed" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Column renames completed' as Status;

-- ============================================================================
-- STEP 3: RELEASES TABLE - Add orchestration columns
-- ============================================================================

SELECT 'Step 3: Adding orchestration columns to releases' as Status;

-- Add stageData
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'stageData'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE releases ADD COLUMN stageData JSON NULL COMMENT "Stores integration responses per stage"',
  'SELECT "stageData already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add customIntegrationConfigs
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'customIntegrationConfigs'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE releases ADD COLUMN customIntegrationConfigs JSON NULL COMMENT "Per-release integration config overrides"',
  'SELECT "customIntegrationConfigs already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add preCreatedBuilds
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'preCreatedBuilds'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE releases ADD COLUMN preCreatedBuilds JSON NULL COMMENT "Array of pre-created builds"',
  'SELECT "preCreatedBuilds already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Orchestration columns added to releases' as Status;

-- ============================================================================
-- STEP 4: RELEASE_TASKS - Update taskType enum to ONLY NEW types
-- ============================================================================

SELECT 'Step 4: Updating release_tasks.taskType enum' as Status;
SELECT '⚠️  WARNING: Old task types will become NULL' as Warning;

-- This will cause data truncation for old task types
-- Keeping ONLY new task types as per requirements
ALTER TABLE release_tasks 
MODIFY COLUMN taskType ENUM(
  'PRE_KICK_OFF_REMINDER',
  'FORK_BRANCH',
  'CREATE_PROJECT_MANAGEMENT_TICKET',
  'CREATE_TEST_SUITE',
  'TRIGGER_PRE_REGRESSION_BUILDS',
  'RESET_TEST_SUITE',
  'CREATE_RC_TAG',
  'CREATE_RELEASE_NOTES',
  'TRIGGER_REGRESSION_BUILDS',
  'TRIGGER_AUTOMATION_RUNS',
  'AUTOMATION_RUNS',
  'SEND_REGRESSION_BUILD_MESSAGE',
  'PRE_RELEASE_CHERRY_PICKS_REMINDER',
  'CREATE_RELEASE_TAG',
  'CREATE_FINAL_RELEASE_NOTES',
  'TRIGGER_TEST_FLIGHT_BUILD',
  'SEND_PRE_RELEASE_MESSAGE',
  'CHECK_PROJECT_RELEASE_APPROVAL',
  'SUBMIT_TO_TARGET'
) NULL;

SELECT '✅ Task type enum updated' as Status;

-- ============================================================================
-- STEP 5: RELEASE_TASKS TABLE - Add externalData column
-- ============================================================================

SELECT 'Step 5: Adding externalData to release_tasks' as Status;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'release_tasks' 
    AND COLUMN_NAME = 'externalData'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE release_tasks ADD COLUMN externalData JSON NULL COMMENT "Full integration response data"',
  'SELECT "externalData already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ externalData column added' as Status;

-- ============================================================================
-- STEP 6: BUILDS TABLE - Add preCreatedBuildId column
-- ============================================================================

SELECT 'Step 6: Adding preCreatedBuildId to builds' as Status;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'builds' 
    AND COLUMN_NAME = 'preCreatedBuildId'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE builds ADD COLUMN preCreatedBuildId VARCHAR(255) NULL COMMENT "Links to preCreatedBuilds array"',
  'SELECT "preCreatedBuildId already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ preCreatedBuildId column added' as Status;

-- ============================================================================
-- STEP 7: REGRESSION_CYCLES TABLE - Add stage column
-- ============================================================================

SELECT 'Step 7: Adding stage to regression_cycles' as Status;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'regression_cycles' 
    AND COLUMN_NAME = 'stage'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE regression_cycles ADD COLUMN stage INT NOT NULL DEFAULT 2 COMMENT "Stage number (2 = REGRESSION)"',
  'SELECT "stage column already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ stage column added' as Status;

-- ============================================================================
-- STEP 8: CREATE CRON_JOBS TABLE
-- ============================================================================

SELECT 'Step 8: Creating cron_jobs table' as Status;

CREATE TABLE IF NOT EXISTS cron_jobs (
  id VARCHAR(255) PRIMARY KEY COMMENT 'Unique identifier',
  releaseId VARCHAR(255) NOT NULL COMMENT 'FK -> releases.id',
  
  -- Cron configuration (JSON)
  cronConfig JSON NULL COMMENT 'Cron-specific config (slots, reminders, etc.)',
  
  -- Stage statuses
  stage1Status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  stage2Status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  stage3Status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  
  -- Lock mechanism
  lockedBy VARCHAR(255) NULL COMMENT 'Instance ID that acquired lock',
  lockedAt TIMESTAMP NULL COMMENT 'When lock was acquired',
  lockExpiry TIMESTAMP NULL COMMENT 'When lock expires (5 min TTL)',
  
  -- Status
  status ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'ACTIVE',
  
  -- Timestamps
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_release (releaseId),
  KEY idx_cron_status (status),
  KEY idx_cron_stage1 (stage1Status),
  KEY idx_cron_stage2 (stage2Status),
  KEY idx_cron_stage3 (stage3Status),
  KEY idx_cron_lock (lockedBy, lockedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Cron job tracking for release workflows';

SELECT '✅ cron_jobs table created' as Status;

-- ============================================================================
-- STEP 9: CREATE RELEASE_PERMISSIONS TABLE
-- ============================================================================

SELECT 'Step 9: Creating release_permissions table' as Status;

CREATE TABLE IF NOT EXISTS release_permissions (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL COMMENT 'FK -> releases.id',
  accountId VARCHAR(255) NOT NULL COMMENT 'FK -> accounts.id',
  role ENUM('OWNER', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
  
  grantedByAccountId VARCHAR(255) NULL COMMENT 'Who granted permission',
  grantedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_release_account (releaseId, accountId),
  KEY idx_release_perm_release (releaseId),
  KEY idx_release_perm_account (accountId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Release-level access control';

SELECT '✅ release_permissions table created' as Status;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT '========================================' as '';
SELECT '✅ MIGRATION 011 COMPLETE' as Status;
SELECT '========================================' as '';
SELECT 'Local code requirements satisfied:' as '';
SELECT '  ✅ Column names aligned' as '';
SELECT '  ✅ Orchestration columns added' as '';
SELECT '  ✅ Task type enum updated' as '';
SELECT '  ✅ New tables created' as '';
SELECT '  ✅ Platform enum updated' as '';
SELECT '========================================' as '';
SELECT 'Your local code should now work properly!' as '';
SELECT '========================================' as '';

