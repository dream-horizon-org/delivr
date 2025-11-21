-- ============================================================================
-- Rollback: Store Integrations
-- Version: 004 (Rollback)
-- Date: 2025-11-11
-- WARNING: This will delete all store integration data!
-- ============================================================================

USE codepushdb;

-- Drop foreign keys first
ALTER TABLE store_credentials DROP FOREIGN KEY IF EXISTS fk_creds_integration;
ALTER TABLE store_integrations DROP FOREIGN KEY IF EXISTS fk_store_created_by;
ALTER TABLE store_integrations DROP FOREIGN KEY IF EXISTS fk_store_tenant;

-- Drop tables
DROP TABLE IF EXISTS store_credentials;
DROP TABLE IF EXISTS store_integrations;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

