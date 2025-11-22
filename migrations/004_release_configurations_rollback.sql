-- ============================================================================
-- Rollback Migration: Release Configurations
-- Version: 004
-- Date: 2025-01-10
-- Description: Rollback script to remove release_configurations table
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- DROP TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS validate_release_config_has_integrations;

-- ============================================================================
-- DROP FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE release_configurations 
  DROP FOREIGN KEY IF EXISTS fk_release_config_tenant;

ALTER TABLE release_configurations 
  DROP FOREIGN KEY IF EXISTS fk_release_config_created_by;

ALTER TABLE release_configurations 
  DROP FOREIGN KEY IF EXISTS fk_release_config_scm;

ALTER TABLE release_configurations 
  DROP FOREIGN KEY IF EXISTS fk_release_config_ci;

ALTER TABLE release_configurations 
  DROP FOREIGN KEY IF EXISTS fk_release_config_checkmate;

ALTER TABLE release_configurations 
  DROP FOREIGN KEY IF EXISTS fk_release_config_jira;

ALTER TABLE release_configurations 
  DROP FOREIGN KEY IF EXISTS fk_release_config_slack;

-- ============================================================================
-- DROP TABLE
-- ============================================================================

DROP TABLE IF EXISTS release_configurations;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
  'release_configurations rollback completed' as status,
  COUNT(*) as tables_remaining
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'release_configurations';

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
