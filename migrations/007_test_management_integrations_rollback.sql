-- ============================================================================
-- Rollback Migration: Test Management Integrations
-- Version: 007
-- Date: 2025-01-20
-- Description: Drops test management integration tables
-- ============================================================================

-- Drop foreign key constraints first
ALTER TABLE test_management_configs
  DROP FOREIGN KEY IF EXISTS fk_tmc_integration;

-- Drop tables (in reverse order of creation)
DROP TABLE IF EXISTS test_management_configs;
DROP TABLE IF EXISTS project_test_management_integrations;

-- Verification
SELECT 
  'Rollback Complete' as status,
  CASE 
    WHEN COUNT(*) = 0 THEN 'Success'
    ELSE 'Failed - tables still exist'
  END as result
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN ('project_test_management_integrations', 'test_management_configs');

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

