-- ============================================================================
-- Migration: Change KICK_OFF to KICKOFF in builds and release_uploads tables
-- Version: 020
-- Date: 2025-12-18
-- Description: 
--   1. Updates all KICK_OFF values to KICKOFF in builds.buildStage
--   2. Updates all KICK_OFF values to KICKOFF in release_uploads.stage
--   3. Modifies ENUM definitions to use KICKOFF instead of KICK_OFF
--   This aligns the database schema with the Sequelize model definitions
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- STEP 1: Update data in builds table
-- ============================================================================

-- Update all existing KICK_OFF values to KICKOFF
UPDATE builds 
SET buildStage = 'KICKOFF' 
WHERE buildStage = 'KICK_OFF';

-- ============================================================================
-- STEP 2: Update data in release_uploads table
-- ============================================================================

-- Update all existing KICK_OFF values to KICKOFF
UPDATE release_uploads 
SET stage = 'KICKOFF' 
WHERE stage = 'KICK_OFF';

-- ============================================================================
-- STEP 3: Modify ENUM in builds table
-- ============================================================================

-- Verify no KICK_OFF values remain
SET @hasKickOffBuilds = (
  SELECT COUNT(*) 
  FROM builds 
  WHERE buildStage = 'KICK_OFF'
);

-- Modify the enum to use KICKOFF instead of KICK_OFF
SET @queryBuilds = IF(@hasKickOffBuilds = 0,
  'ALTER TABLE builds MODIFY COLUMN buildStage ENUM(\'KICKOFF\', \'REGRESSION\', \'PRE_RELEASE\') NOT NULL COMMENT \'Build stage in release lifecycle\'',
  'SELECT "Cannot modify enum - KICK_OFF values still exist in builds table. Please update them first." AS message'
);

PREPARE stmtBuilds FROM @queryBuilds;
EXECUTE stmtBuilds;
DEALLOCATE PREPARE stmtBuilds;

-- ============================================================================
-- STEP 4: Modify ENUM in release_uploads table
-- ============================================================================

-- Verify no KICK_OFF values remain
SET @hasKickOffUploads = (
  SELECT COUNT(*) 
  FROM release_uploads 
  WHERE stage = 'KICK_OFF'
);

-- Modify the enum to use KICKOFF instead of KICK_OFF
SET @queryUploads = IF(@hasKickOffUploads = 0,
  'ALTER TABLE release_uploads MODIFY COLUMN stage ENUM(\'KICKOFF\', \'REGRESSION\', \'PRE_RELEASE\') NOT NULL COMMENT \'Stage this upload is for (matches buildStage)\'',
  'SELECT "Cannot modify enum - KICK_OFF values still exist in release_uploads table. Please update them first." AS message'
);

PREPARE stmtUploads FROM @queryUploads;
EXECUTE stmtUploads;
DEALLOCATE PREPARE stmtUploads;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify builds table
SELECT 
  'builds' as table_name,
  buildStage,
  COUNT(*) as count
FROM builds
GROUP BY buildStage
ORDER BY buildStage;

-- Verify release_uploads table
SELECT 
  'release_uploads' as table_name,
  stage,
  COUNT(*) as count
FROM release_uploads
GROUP BY stage
ORDER BY stage;

-- Show updated schema
DESCRIBE builds;
DESCRIBE release_uploads;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

