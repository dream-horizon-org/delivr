-- ============================================================================
-- Rollback Migration: Tenant SCM Integrations
-- Version: 003
-- Date: 2025-01-10
-- Description: Removes tenant_scm_integrations table
-- ⚠️  WARNING: This will DELETE all SCM integration data!
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop foreign key constraints first
-- ============================================================================

ALTER TABLE tenant_scm_integrations 
  DROP FOREIGN KEY IF EXISTS fk_scm_tenant;

ALTER TABLE tenant_scm_integrations 
  DROP FOREIGN KEY IF EXISTS fk_scm_created_by;

-- ============================================================================
-- STEP 2: Drop the table
-- ============================================================================

DROP TABLE IF EXISTS tenant_scm_integrations;

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
  AND TABLE_NAME = 'tenant_scm_integrations';

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

