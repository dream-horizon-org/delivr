-- ============================================================================
-- ROLLBACK: Drop Project Management Tables
-- ============================================================================

USE codepushdb;

DROP TABLE IF EXISTS project_management_configs;
DROP TABLE IF EXISTS project_management_integrations;

SELECT 'Project Management tables dropped successfully!' as Status;

