-- ============================================================================
-- Rollback: Change KICKOFF back to KICK_OFF in builds and release_uploads tables
-- Version: 020 (Rollback)
-- Date: 2025-12-18
-- WARNING: This will revert KICKOFF back to KICK_OFF
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- STEP 1: Update data in builds table
-- ============================================================================

-- Update all existing KICKOFF values back to KICK_OFF
UPDATE builds 
SET buildStage = 'KICK_OFF' 
WHERE buildStage = 'KICKOFF';

-- ============================================================================
-- STEP 2: Update data in release_uploads table
-- ============================================================================

-- Update all existing KICKOFF values back to KICK_OFF
UPDATE release_uploads 
SET stage = 'KICK_OFF' 
WHERE stage = 'KICKOFF';

-- ============================================================================
-- STEP 3: Modify ENUM in builds table
-- ============================================================================

-- Verify no KICKOFF values remain
SET @hasKickoffBuilds = (
  SELECT COUNT(*) 
  FROM builds 
  WHERE buildStage = 'KICKOFF'
);

-- Modify the enum back to KICK_OFF
SET @queryBuilds = IF(@hasKickoffBuilds = 0,
  'ALTER TABLE builds MODIFY COLUMN buildStage ENUM(\'KICK_OFF\', \'REGRESSION\', \'PRE_RELEASE\') NOT NULL COMMENT \'Build stage in release lifecycle\'',
  'SELECT "Cannot modify enum - KICKOFF values still exist in builds table. Please update them first." AS message'
);

PREPARE stmtBuilds FROM @queryBuilds;
EXECUTE stmtBuilds;
DEALLOCATE PREPARE stmtBuilds;

-- ============================================================================
-- STEP 4: Modify ENUM in release_uploads table
-- ============================================================================

-- Verify no KICKOFF values remain
SET @hasKickoffUploads = (
  SELECT COUNT(*) 
  FROM release_uploads 
  WHERE stage = 'KICKOFF'
);

-- Modify the enum back to KICK_OFF
SET @queryUploads = IF(@hasKickoffUploads = 0,
  'ALTER TABLE release_uploads MODIFY COLUMN stage ENUM(\'KICK_OFF\', \'REGRESSION\', \'PRE_RELEASE\') NOT NULL COMMENT \'Stage this upload is for (matches buildStage)\'',
  'SELECT "Cannot modify enum - KICKOFF values still exist in release_uploads table. Please update them first." AS message'
);

PREPARE stmtUploads FROM @queryUploads;
EXECUTE stmtUploads;
DEALLOCATE PREPARE stmtUploads;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

