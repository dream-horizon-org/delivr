-- ============================================================================
-- ROLLBACK: Rename tenantId back to projectId in project_management_integrations
-- ============================================================================

USE codepushdb;

-- Rename the column back
ALTER TABLE project_management_integrations 
  CHANGE COLUMN tenantId projectId VARCHAR(255) NOT NULL COMMENT 'Project/Tenant identifier';

-- Drop tenant index (ignore errors if doesn't exist)
ALTER TABLE project_management_integrations DROP INDEX idx_pm_integration_tenant;

-- Recreate project index
ALTER TABLE project_management_integrations ADD INDEX idx_pm_integration_project (projectId);

-- Update unique constraint (drop new, create old)
ALTER TABLE project_management_integrations DROP INDEX unique_tenant_name;
ALTER TABLE project_management_integrations ADD UNIQUE KEY unique_project_name (projectId, name);

SELECT 'Rollback complete: Column renamed from tenantId back to projectId!' as Status;

