-- ============================================================================
-- Rename projectId to tenantId in project_management_integrations table
-- This aligns with the tenant-scoped architecture used by other integrations
-- ============================================================================

USE codepushdb;

-- Check table structure before migration
SELECT 'Before migration:' as Status;
DESCRIBE project_management_integrations;

-- Rename the column
ALTER TABLE project_management_integrations 
  CHANGE COLUMN projectId tenantId VARCHAR(255) NOT NULL COMMENT 'Tenant identifier';

-- Update indexes if needed
-- Note: MySQL 5.7 doesn't support DROP INDEX IF EXISTS in this context
-- We'll check and drop manually if it exists

-- Recreate index on tenantId
ALTER TABLE project_management_integrations ADD INDEX idx_pm_integration_tenant (tenantId);

-- Update unique constraint
-- Drop old constraint if it exists (we'll ignore errors if it doesn't)
-- ALTER TABLE project_management_integrations DROP INDEX unique_project_name;

-- Add new unique constraint
ALTER TABLE project_management_integrations ADD UNIQUE KEY unique_tenant_name (tenantId, name);

-- Verify the change
SELECT 'After migration:' as Status;
DESCRIBE project_management_integrations;

SELECT 'Column renamed from projectId to tenantId successfully!' as Status;

