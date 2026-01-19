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

-- Add picture
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'picture';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE accounts ADD COLUMN picture VARCHAR(255) AFTER microsoftId', 
  'SELECT "Column picture already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- STEP 2: Update collaborators table - Support both app-level AND tenant-level
-- ============================================================================

-- Add tenantId column (nullable to support both app and tenant collaboration)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborators' AND COLUMN_NAME = 'tenantId';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE collaborators ADD COLUMN tenantId CHAR(36) AFTER appId', 
  'SELECT "Column tenantId already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add isCreator column
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborators' AND COLUMN_NAME = 'isCreator';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE collaborators ADD COLUMN isCreator BOOLEAN DEFAULT FALSE AFTER permission', 
  'SELECT "Column isCreator already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update permission enum to use Owner, Editor, Viewer (remove legacy 'Collaborator')
ALTER TABLE collaborators 
  MODIFY COLUMN permission ENUM('Owner', 'Editor', 'Viewer') DEFAULT NULL;

-- Make appId nullable (since tenant-level collaborators won't have an app)
ALTER TABLE collaborators 
  MODIFY COLUMN appId VARCHAR(255) DEFAULT NULL;

-- Add foreign key for tenantId if not exists
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM information_schema.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'collaborators' 
  AND CONSTRAINT_NAME = 'collaborators_ibfk_3';

SET @query = IF(@fk_exists = 0, 
  'ALTER TABLE collaborators ADD CONSTRAINT collaborators_ibfk_3 FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE', 
  'SELECT "Foreign key collaborators_ibfk_3 already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed: Unified architecture applied' AS status; 