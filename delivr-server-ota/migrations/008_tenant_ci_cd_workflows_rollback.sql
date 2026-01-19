-- Version: 005
-- Date: 2025-11-14
-- Description: Removes tenant_ci_cd_workflows table
-- ⚠️ WARNING: This will DELETE all workflow records!
-- ============================================================================

-- Drop foreign keys first
ALTER TABLE tenant_ci_cd_workflows 
  DROP FOREIGN KEY IF EXISTS fk_wf_tenant;

ALTER TABLE tenant_ci_cd_workflows 
  DROP FOREIGN KEY IF EXISTS fk_wf_integration;

ALTER TABLE tenant_ci_cd_workflows 
  DROP FOREIGN KEY IF EXISTS fk_wf_created_by;

-- Drop table
DROP TABLE IF EXISTS tenant_ci_cd_workflows;

-- Verify
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Table successfully removed'
    ELSE '❌ Table still exists'
  END as rollback_status
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tenant_ci_cd_workflows';


