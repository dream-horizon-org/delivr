-- ============================================================================
-- Rollback Migration: Tenant Comm Integrations
-- Version: 004
-- Date: 2025-11-14
-- Description: Removes tenant_comm_integrations table
-- ⚠️  WARNING: This will DELETE all Slack integration data!
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop foreign key constraints first
-- ============================================================================

ALTER TABLE tenant_comm_integrations 
  DROP FOREIGN KEY IF EXISTS fk_comm_tenant;

-- ============================================================================
-- STEP 2: Drop the table
-- ============================================================================

DROP TABLE IF EXISTS tenant_comm_integrations;

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Table successfully removed'
    ELSE '❌ Table still exists'
  END as rollback_status
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tenant_comm_integrations';

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

