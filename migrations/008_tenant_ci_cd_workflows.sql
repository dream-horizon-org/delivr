-- Version: 005
-- Date: 2025-11-14
-- Description: Creates tenant_ci_cd_workflows table to store CI/CD workflows/jobs across providers
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_ci_cd_workflows (
  -- Primary key
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (shortid)',

  -- Tenant reference
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'FK -> tenants.id',

  -- Provider & linkage
  providerType ENUM('JENKINS','GITHUB_ACTIONS','CIRCLECI','GITLAB_CI') NOT NULL COMMENT 'Provider type',
  integrationId VARCHAR(255) NOT NULL COMMENT 'FK -> tenant_ci_cd_integrations.id',

  -- Display and identity
  displayName VARCHAR(255) NOT NULL COMMENT 'Human-friendly workflow name',
  workflowUrl VARCHAR(1024) NOT NULL COMMENT 'Provider URL for the job/workflow',
  providerIdentifiers JSON NULL COMMENT 'Provider-specific identifiers (e.g., jobFullName, repo, workflowFile)',

  -- Classification
  platform ENUM('ANDROID','IOS','OTHER') NOT NULL DEFAULT 'OTHER' COMMENT 'Target platform classification',
  workflowType ENUM('PRE_REGRESSION_BUILD','REGRESSION_BUILD','TEST_FLIGHT_BUILD','AUTOMATION_BUILD','CUSTOM') NOT NULL DEFAULT 'CUSTOM' COMMENT 'Workflow purpose/type',

  -- Parameters schema
  parameters JSON NULL COMMENT 'Array of parameter definitions with default values and choices',

  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexing
  INDEX idx_tenant (tenantId) COMMENT 'Query by tenant',
  INDEX idx_provider (providerType) COMMENT 'Query by provider',
  INDEX idx_integration (integrationId) COMMENT 'Query by integration',
  INDEX idx_platform (platform) COMMENT 'Filter by platform',
  INDEX idx_workflow_type (workflowType) COMMENT 'Filter by workflow type',
  INDEX idx_tenant_provider (tenantId, providerType) COMMENT 'Query by tenant and provider'
);

-- Foreign keys
ALTER TABLE tenant_ci_cd_workflows
  ADD CONSTRAINT fk_wf_tenant
    FOREIGN KEY (tenantId) REFERENCES tenants(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE tenant_ci_cd_workflows
  ADD CONSTRAINT fk_wf_integration
    FOREIGN KEY (integrationId) REFERENCES tenant_ci_cd_integrations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tenant_ci_cd_workflows
  ADD CONSTRAINT fk_wf_created_by
    FOREIGN KEY (createdByAccountId) REFERENCES accounts(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Verification helpers
DESCRIBE tenant_ci_cd_workflows;


