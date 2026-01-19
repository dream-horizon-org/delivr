-- ============================================================================
-- Migration: Tenant CI/CD Config
-- Table: tenant_ci_cd_config
-- Purpose: Store an array of workflow primary keys created for a release config
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_ci_cd_config (
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (shortid)',

  -- Tenant reference
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'FK -> tenants.id',

  -- Array of workflow primary keys (created in tenant_ci_cd_workflows)
  workflowIds JSON NOT NULL COMMENT 'Array of workflow IDs (strings)',

  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL COMMENT 'FK -> accounts.id',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexing
  KEY idx_tenant (tenantId)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Tenant-level CI/CD config (stores workflow IDs)';

-- Foreign keys
ALTER TABLE tenant_ci_cd_config
  ADD CONSTRAINT fk_ci_cd_config_tenant
    FOREIGN KEY (tenantId) REFERENCES tenants(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT fk_ci_cd_config_created_by
    FOREIGN KEY (createdByAccountId) REFERENCES accounts(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;


