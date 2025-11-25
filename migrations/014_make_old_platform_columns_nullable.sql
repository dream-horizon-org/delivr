-- ============================================================================
-- Migration: Make Old Platform Columns Nullable
-- Version: 014
-- Date: 2025-11-25
-- Description: Makes 'platforms' and 'targets' columns nullable to allow
--              backend to use only platformTargets without errors
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- STEP 1: Make old columns nullable
-- ============================================================================

ALTER TABLE release_configurations
  MODIFY COLUMN platforms JSON NULL
  COMMENT 'DEPRECATED: Use platformTargets instead. Kept for backward compatibility.';

ALTER TABLE release_configurations
  MODIFY COLUMN targets JSON NULL
  COMMENT 'DEPRECATED: Use platformTargets instead. Kept for backward compatibility.';

-- ============================================================================
-- STEP 2: Verification
-- ============================================================================

-- Check table structure
DESCRIBE release_configurations;

-- Show configs with new vs old format
SELECT 
  id,
  name,
  platforms as old_platforms,
  targets as old_targets,
  platformTargets as new_platformTargets
FROM release_configurations
LIMIT 5;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. Old columns (platforms, targets) are now nullable
-- 2. Backend will only write to platformTargets
-- 3. Old columns kept for any legacy read-only operations
-- 4. Can be fully removed in future migration after full transition

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

