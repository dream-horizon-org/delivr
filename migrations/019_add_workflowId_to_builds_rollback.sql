-- ============================================================================
-- Rollback: Remove workflowId from builds table
-- ============================================================================

-- Remove foreign key constraint
ALTER TABLE builds DROP FOREIGN KEY fk_builds_workflow;

-- Remove index
DROP INDEX idx_builds_workflow ON builds;

-- Remove workflowId column
ALTER TABLE builds DROP COLUMN workflowId;

