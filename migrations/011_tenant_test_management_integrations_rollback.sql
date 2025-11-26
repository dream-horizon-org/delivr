-- ============================================================================
-- Rollback Migration: Tenant Test Management Integrations
-- Version: 011
-- Date: 2025-11-22
-- Description: Rolls back tenant-scoped test management integrations table
-- ============================================================================

-- ============================================================================
-- Drop tenant test management integrations table
-- ============================================================================

DROP TABLE IF EXISTS tenant_test_management_integrations;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  'tenant_test_management_integrations' as table_name,
  COUNT(*) as still_exists
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tenant_test_management_integrations';

-- If still_exists = 0, rollback was successful

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

