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
  providerType ENUM('JENKINS','GITHUB_ACTIONS','CIRCLE_CI','GITLAB_CI') NOT NULL COMMENT 'Provider type',
  integrationId VARCHAR(255) NOT NULL COMMENT 'FK -> tenant_ci_cd_integrations.id',

  -- Display and identity
  displayName VARCHAR(255) NOT NULL COMMENT 'Human-friendly workflow name',
  workflowUrl VARCHAR(1024) NOT NULL COMMENT 'Provider URL for the job/workflow',
  providerIdentifiers JSON NULL COMMENT 'Provider-specific identifiers (e.g., jobFullName, repo, workflowFile)',

  -- Classification (platform-agnostic: allows any platform string like 'ios', 'android', 'tvos', etc.)
  platform VARCHAR(100) NOT NULL DEFAULT 'other' COMMENT 'Target platform classification (lowercase, platform-agnostic)',
  workflowType ENUM('PRE_REGRESSION_BUILD','REGRESSION_BUILD','TEST_FLIGHT_BUILD','AUTOMATION_BUILD','AAB_BUILD', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM' COMMENT 'Workflow purpose/type',

  -- Parameters schema
  parameters JSON NULL COMMENT 'Array of parameter definitions with default values and choices',

  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes based on actual query patterns (verified from workflow.repository.ts)
  INDEX idx_wf_tenant (tenantId) COMMENT 'Query by tenant',
  INDEX idx_wf_integration (integrationId) COMMENT 'Query by integration, delete check'
  -- Note: providerType, platform, workflowType are low-cardinality - no index needed
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

-- Normalize legacy providerType values if any rows used CIRCLECI before enum standardization
UPDATE tenant_ci_cd_workflows
SET providerType = 'CIRCLE_CI'
WHERE providerType = 'CIRCLECI';


