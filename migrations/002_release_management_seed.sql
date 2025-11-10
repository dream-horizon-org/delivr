-- ============================================================================
-- Release Management Seed Data
-- Seeds only reference data (Platform and Target) which are shared across all tenants
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- PLATFORMS (Shared across all tenants)
-- ============================================================================

INSERT IGNORE INTO platforms (id, name, createdAt, updatedAt) VALUES
  ('platform_android', 'ANDROID', NOW(), NOW()),
  ('platform_ios', 'IOS', NOW(), NOW());

-- ============================================================================
-- TARGETS (Shared across all tenants)
-- ============================================================================

INSERT IGNORE INTO targets (id, name, createdAt, updatedAt) VALUES
  ('target_web', 'WEB', NOW(), NOW()),
  ('target_playstore', 'PLAY_STORE', NOW(), NOW()),
  ('target_appstore', 'APP_STORE', NOW(), NOW());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Platforms seeded:' as Status;
SELECT id, name FROM platforms ORDER BY name;

SELECT 'Targets seeded:' as Status;
SELECT id, name FROM targets ORDER BY name;

SELECT 'Seed data completed successfully!' as Status;

