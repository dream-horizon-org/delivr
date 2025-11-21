-- ============================================================================
-- Rollback: Remove platform column from store_integrations table
-- Version: 008 (Rollback)
-- Date: 2025-11-21
-- ============================================================================

USE codepushdb;

-- Drop index first
DROP INDEX idx_store_integrations_platform ON store_integrations;

-- Remove platform column
ALTER TABLE store_integrations
DROP COLUMN platform;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

