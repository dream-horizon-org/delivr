
-- ============================================================================
-- Rollback Migration: Tenant CI/CD Integrations
-- Version: 004
-- Date: 2025-11-14
-- Description: Removes tenant_ci_cd_integrations table
-- ⚠️  WARNING: This will DELETE all CI/CD integration data!
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop foreign key constraints first
-- ============================================================================

ALTER TABLE tenant_ci_cd_integrations 
  DROP FOREIGN KEY IF EXISTS fk_ci_cd_tenant;

ALTER TABLE tenant_ci_cd_integrations 
  DROP FOREIGN KEY IF EXISTS fk_ci_cd_created_by_account;

-- ============================================================================
-- STEP 2: Drop the table
-- ============================================================================

DROP TABLE IF EXISTS tenant_ci_cd_integrations;

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
  AND TABLE_NAME = 'tenant_ci_cd_integrations';

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================


