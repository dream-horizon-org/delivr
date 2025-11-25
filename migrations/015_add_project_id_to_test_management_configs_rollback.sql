-- Rollback Migration: Remove project_id from test_management_configs table
-- Description: Removes the projectId field added in migration 015
-- Date: 2025-11-25

ALTER TABLE test_management_configs 
DROP COLUMN project_id;

