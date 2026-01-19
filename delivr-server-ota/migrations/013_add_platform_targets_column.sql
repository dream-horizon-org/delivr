-- ============================================================================
-- Migration: Add platformTargets Column to Release Configurations
-- Version: 013
-- Date: 2025-01-15
-- Description: Adds platformTargets JSON column to support new API contract
--              where platforms and targets are combined into a single array.
--              Migrates existing data from separate platforms/targets to 
--              platformTargets array format.
-- ============================================================================

-- ============================================================================
-- Purpose:
-- The new API contract uses platformTargets as an array of objects:
-- OLD: platforms: ["ANDROID", "IOS"], targets: ["PLAY_STORE", "APP_STORE"]
-- NEW: platformTargets: [
--        { platform: "ANDROID", target: "PLAY_STORE" },
--        { platform: "IOS", target: "APP_STORE" }
--      ]
--
-- This migration:
-- 1. Adds the new platformTargets column
-- 2. Migrates existing data to new format
-- 3. Keeps old columns for backward compatibility during transition
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- STEP 1: ADD NEW COLUMN
-- ============================================================================

ALTER TABLE release_configurations
  ADD COLUMN platformTargets JSON NULL
  COMMENT 'Array of platform-target objects: [{"platform":"ANDROID","target":"PLAY_STORE"}]'
  AFTER targets;

-- ============================================================================
-- STEP 2: MIGRATE EXISTING DATA
-- ============================================================================

-- Update existing records to populate platformTargets from platforms + targets
-- This handles the most common cases where:
-- - platforms array contains mobile platforms (ANDROID, IOS)
-- - targets array contains corresponding store targets (PLAY_STORE, APP_STORE)

UPDATE release_configurations
SET platformTargets = (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'platform', 
      CASE 
        WHEN target_val = 'PLAY_STORE' THEN 'ANDROID'
        WHEN target_val = 'APP_STORE' THEN 'IOS'
        WHEN target_val = 'WEB' THEN 'ANDROID'  -- WEB uses ANDROID as fallback
        ELSE 'ANDROID'  -- Default fallback
      END,
      'target', target_val
    )
  )
  FROM (
    SELECT DISTINCT 
      JSON_UNQUOTE(JSON_EXTRACT(targets, CONCAT('$[', numbers.n, ']'))) as target_val
    FROM (
      SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
    ) numbers
    WHERE JSON_EXTRACT(targets, CONCAT('$[', numbers.n, ']')) IS NOT NULL
  ) as target_values
)
WHERE targets IS NOT NULL 
  AND JSON_LENGTH(targets) > 0
  AND platformTargets IS NULL;

-- ============================================================================
-- STEP 3: VERIFICATION
-- ============================================================================

-- Show sample of migrated data
SELECT 
  id,
  name,
  platforms as old_platforms,
  targets as old_targets,
  platformTargets as new_platformTargets
FROM release_configurations
WHERE platformTargets IS NOT NULL
LIMIT 5;

-- Count records with platformTargets populated
SELECT 
  'Migration Status' as status,
  COUNT(*) as total_configs,
  SUM(CASE WHEN platformTargets IS NOT NULL THEN 1 ELSE 0 END) as migrated_configs,
  SUM(CASE WHEN platformTargets IS NULL THEN 1 ELSE 0 END) as pending_configs
FROM release_configurations;

-- Show detailed structure of first migrated record
SELECT 
  id,
  name,
  JSON_PRETTY(platformTargets) as platformTargets_formatted
FROM release_configurations
WHERE platformTargets IS NOT NULL
LIMIT 1;

-- ============================================================================
-- STEP 4: ADD INDEX FOR PERFORMANCE (Optional)
-- ============================================================================

-- Note: JSON columns cannot be directly indexed in MySQL
-- Virtual generated columns can be added later if needed for complex queries

-- ============================================================================
-- NOTES FOR DEVELOPERS
-- ============================================================================

-- 1. The old 'platforms' and 'targets' columns are kept for now
--    They can be deprecated and removed in a future migration after 
--    all services are updated to use platformTargets

-- 2. The BFF layer now handles transformation:
--    - UI sends: targets array
--    - BFF transforms to: platformTargets array
--    - Backend stores: platformTargets array
--    - BFF transforms back to: targets array for UI

-- 3. Backend services should be updated to:
--    - READ from platformTargets column
--    - WRITE to platformTargets column
--    - Optionally maintain platforms/targets for backward compatibility

-- 4. Mapping logic:
--    PLAY_STORE → { platform: "ANDROID", target: "PLAY_STORE" }
--    APP_STORE  → { platform: "IOS", target: "APP_STORE" }
--    WEB        → { platform: "ANDROID", target: "WEB" } (fallback)

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Insert new config with platformTargets
-- INSERT INTO release_configurations (
--   id, tenantId, name, releaseType, 
--   platformTargets,
--   createdByAccountId
-- ) VALUES (
--   'rc_new_001',
--   'tenant123',
--   'Multi-Platform Config',
--   'PLANNED',
--   JSON_ARRAY(
--     JSON_OBJECT('platform', 'ANDROID', 'target', 'PLAY_STORE'),
--     JSON_OBJECT('platform', 'IOS', 'target', 'APP_STORE')
--   ),
--   'acc_xyz'
-- );

-- Example 2: Query configs by platform
-- SELECT * FROM release_configurations
-- WHERE JSON_CONTAINS(
--   platformTargets,
--   JSON_OBJECT('platform', 'ANDROID'),
--   '$[*]'
-- );

-- Example 3: Query configs by target
-- SELECT * FROM release_configurations
-- WHERE JSON_CONTAINS(
--   platformTargets,
--   JSON_OBJECT('target', 'PLAY_STORE'),
--   '$[*]'
-- );

-- Example 4: Extract all platforms from a config
-- SELECT 
--   id,
--   name,
--   JSON_EXTRACT(platformTargets, '$[*].platform') as platforms
-- FROM release_configurations
-- WHERE platformTargets IS NOT NULL;

-- ============================================================================
-- DESCRIBE TABLE
-- ============================================================================

DESCRIBE release_configurations;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

