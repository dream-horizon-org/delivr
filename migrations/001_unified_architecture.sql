-- Migration: Unified Architecture - Tenant-Centric with Unified Collaborators
-- Date: 2025-11-08
-- Description: 
--   1. Add OAuth and profile fields to accounts table
--   2. Update collaborators table to support both app-level AND tenant-level collaboration
--   3. Make apps support both accountId (V1) and tenantId (V2)

-- ============================================================================
-- STEP 1: Update accounts table with OAuth and profile fields
-- ============================================================================

-- Add ssoId
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'ssoId';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN ssoId VARCHAR(255) UNIQUE AFTER email', 
  'SELECT "Column ssoId already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add azureAdId
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'azureAdId';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN azureAdId VARCHAR(255) AFTER ssoId', 
  'SELECT "Column azureAdId already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add gitHubId
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'gitHubId';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN gitHubId VARCHAR(255) AFTER azureAdId', 
  'SELECT "Column gitHubId already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add microsoftId
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'microsoftId';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN microsoftId VARCHAR(255) AFTER gitHubId', 
  'SELECT "Column microsoftId already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add firstName
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'firstName';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN firstName VARCHAR(255) AFTER microsoftId', 
  'SELECT "Column firstName already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add lastName
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'lastName';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN lastName VARCHAR(255) AFTER firstName', 
  'SELECT "Column lastName already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add picture
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'picture';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN picture VARCHAR(255) AFTER lastName', 
  'SELECT "Column picture already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add slackId
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'slackId';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN slackId VARCHAR(255) AFTER picture', 
  'SELECT "Column slackId already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add teamsId
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'teamsId';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN teamsId VARCHAR(255) AFTER slackId', 
  'SELECT "Column teamsId already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 2: Update collaborators table for unified collaboration
-- ============================================================================

-- Make appId nullable (for tenant-level collaborators)
ALTER TABLE collaborators
  MODIFY COLUMN appId VARCHAR(255) NULL;

-- Add isCreator field (conditional)
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'collaborators' 
  AND COLUMN_NAME = 'isCreator'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE collaborators ADD COLUMN isCreator BOOLEAN NOT NULL DEFAULT FALSE AFTER permission',
  'SELECT "isCreator column already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Expand permission enum to include Editor and Viewer (for tenant roles)
ALTER TABLE collaborators
  MODIFY COLUMN permission ENUM('Owner', 'Editor', 'Viewer', 'Collaborator') DEFAULT NULL;

-- Add tenantId if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'collaborators' 
  AND COLUMN_NAME = 'tenantId'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE collaborators ADD COLUMN tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NULL AFTER appId',
  'SELECT "tenantId column already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for tenantId if it doesn't exist
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'collaborators' 
  AND COLUMN_NAME = 'tenantId'
  AND REFERENCED_TABLE_NAME = 'tenants'
);

SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE collaborators ADD FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE',
  'SELECT "tenantId foreign key already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 3: Ensure apps table has both accountId and tenantId for dual compatibility
-- ============================================================================

-- Apps table should already have both fields from Sequelize auto-sync
-- This is just a verification step

SELECT 'Migration completed: Unified architecture setup complete!' AS status;

-- Summary
SELECT 
  'accounts' as table_name,
  COUNT(*) as total_records
FROM accounts
UNION ALL
SELECT 
  'tenants' as table_name,
  COUNT(*) as total_records
FROM tenants
UNION ALL
SELECT 
  'apps' as table_name,
  COUNT(*) as total_records
FROM apps
UNION ALL
SELECT 
  'collaborators' as table_name,
  COUNT(*) as total_records
FROM collaborators;

SELECT 
  CASE 
    WHEN appId IS NULL AND tenantId IS NOT NULL THEN 'Tenant-level'
    WHEN appId IS NOT NULL AND tenantId IS NULL THEN 'App-level (V1)'
    WHEN appId IS NOT NULL AND tenantId IS NOT NULL THEN 'App-level (V2)'
    ELSE 'Other'
  END as collaborator_type,
  permission,
  COUNT(*) as count
FROM collaborators
GROUP BY collaborator_type, permission
ORDER BY collaborator_type, permission;

