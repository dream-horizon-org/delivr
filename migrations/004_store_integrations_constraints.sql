-- ============================================================================
-- Migration: Store Integrations - Add Track Validation Constraints
-- Version: 004.1
-- Date: 2025-11-20
-- Description: Adds CHECK constraint to ensure defaultTrack is valid for storeType
--              Note: MySQL 5.7 parses but doesn't enforce CHECK constraints
--              Application-level validation is the primary enforcement
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- Add CHECK constraint for defaultTrack validation
-- ============================================================================
-- Note: MySQL 5.7 doesn't enforce CHECK constraints, but this documents the rule
-- Application-level validation in middleware/controllers enforces this

ALTER TABLE store_integrations
  ADD CONSTRAINT chk_store_track_valid
    CHECK (
      -- APP_STORE and TESTFLIGHT can have any track including TESTFLIGHT
      (storeType IN ('APP_STORE', 'TESTFLIGHT') AND defaultTrack IN ('PRODUCTION', 'BETA', 'ALPHA', 'INTERNAL', 'TESTFLIGHT', NULL))
      OR
      -- PLAY_STORE cannot have TESTFLIGHT track
      (storeType = 'PLAY_STORE' AND defaultTrack IN ('PRODUCTION', 'BETA', 'ALPHA', 'INTERNAL', NULL))
      OR
      -- MICROSOFT_STORE and FIREBASE can have any track except TESTFLIGHT
      (storeType IN ('MICROSOFT_STORE', 'FIREBASE') AND defaultTrack IN ('PRODUCTION', 'BETA', 'ALPHA', 'INTERNAL', NULL))
      OR
      -- NULL defaultTrack is always valid
      (defaultTrack IS NULL)
    );

-- ============================================================================
-- Verification
-- ============================================================================
-- Note: MySQL 5.7 doesn't support CHECK_CONSTRAINTS table in information_schema
-- The constraint is parsed but not enforced. Application-level validation enforces this rule.

SELECT 
  'CHECK constraint added for store_track validation' as status,
  CONSTRAINT_NAME,
  CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'store_integrations'
  AND CONSTRAINT_NAME = 'chk_store_track_valid';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

