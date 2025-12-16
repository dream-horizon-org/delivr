-- ============================================================================
-- Migration: Add workflowId to builds table
-- Purpose: Link builds to CI/CD workflows for workflow URL retrieval
-- ============================================================================

-- Add workflowId column
ALTER TABLE builds
  ADD COLUMN workflowId VARCHAR(255) NULL COMMENT 'FK to tenant_ci_cd_workflows table - links build to specific workflow'
  AFTER ciRunType;

-- Add index for workflow lookup (retrieving builds by workflow)
CREATE INDEX idx_builds_workflow ON builds (workflowId);

-- Add foreign key constraint
ALTER TABLE builds
  ADD CONSTRAINT fk_builds_workflow
    FOREIGN KEY (workflowId) REFERENCES tenant_ci_cd_workflows(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

