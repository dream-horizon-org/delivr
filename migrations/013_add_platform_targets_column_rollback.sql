-- ============================================================================
-- Rollback Migration: Remove platformTargets Column
-- Version: 013
-- Date: 2025-01-15
-- Description: Rollback script to remove platformTargets column from 
--              release_configurations table
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- BACKUP CHECK (Optional - Manual Verification)
-- ============================================================================

-- Before rolling back, you may want to verify data will be preserved
-- SELECT 
--   COUNT(*) as total_configs,
--   SUM(CASE WHEN platformTargets IS NOT NULL AND (platforms IS NOT NULL OR targets IS NOT NULL) THEN 1 ELSE 0 END) as configs_with_fallback
-- FROM release_configurations;

-- ============================================================================
-- STEP 1: REMOVE COLUMN
-- ============================================================================

ALTER TABLE release_configurations
  DROP COLUMN IF EXISTS platformTargets;

-- ============================================================================
-- STEP 2: VERIFICATION
-- ============================================================================

-- Verify column is removed
SELECT 
  'platformTargets rollback completed' as status,
  COUNT(*) as columns_remaining
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'release_configurations'
  AND COLUMN_NAME = 'platformTargets';

-- Show current table structure
DESCRIBE release_configurations;

-- Verify old columns are still present and have data
SELECT 
  'Data Integrity Check' as check_name,
  COUNT(*) as total_configs,
  SUM(CASE WHEN platforms IS NOT NULL THEN 1 ELSE 0 END) as configs_with_platforms,
  SUM(CASE WHEN targets IS NOT NULL THEN 1 ELSE 0 END) as configs_with_targets
FROM release_configurations;

-- ============================================================================
-- NOTES
-- ============================================================================

-- After rollback:
-- 1. The old 'platforms' and 'targets' columns remain intact
-- 2. Services should be reverted to use the old columns
-- 3. BFF layer transformations should be removed/disabled
-- 4. UI will continue to work with targets array

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

