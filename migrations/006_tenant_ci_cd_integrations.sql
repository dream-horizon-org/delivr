-- Version: 004
-- Date: 2025-11-14
-- Description: Creates tenant_ci_cd_integrations table for CI/CD provider connections
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_ci_cd_integrations (
  -- Primary key
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (shortid)',

  -- Tenant reference (matches tenants.id exactly)
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'FK -> tenants.id',

  -- Provider
  providerType ENUM('JENKINS','GITHUB_ACTIONS','CIRCLE_CI','GITLAB_CI') NOT NULL COMMENT 'CI/CD provider type',
  displayName VARCHAR(255) NOT NULL COMMENT 'User-friendly name shown in UI',

  -- Connection basics
  hostUrl VARCHAR(512) NOT NULL COMMENT 'Base API URL (e.g. https://jenkins.example)',
  authType ENUM('BASIC','BEARER','HEADER') NOT NULL DEFAULT 'BEARER' COMMENT 'Authentication mode',
  username VARCHAR(255) NULL COMMENT 'Required for BASIC auth',

  -- Secrets (ENCRYPTED by application before storage)
  apiToken TEXT NULL COMMENT 'Encrypted API token / PAT',
  headerName VARCHAR(255) NULL COMMENT 'For HEADER auth (e.g., Circle-Token)',
  headerValue TEXT NULL COMMENT 'Encrypted header value when HEADER auth is used',

  -- Provider-specific extras
  providerConfig JSON NULL COMMENT 'Arbitrary provider-specific configuration',

  -- Status and verification
  verificationStatus ENUM('PENDING','VALID','INVALID','EXPIRED') NOT NULL DEFAULT 'PENDING',
  lastVerifiedAt DATETIME NULL,
  verificationError TEXT NULL,

  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexing (minimal set - unique constraint serves as composite index)
  -- Note: Single-column indexes on providerType/verificationStatus omitted (low cardinality)
  -- Note: idx_tenant_provider omitted (redundant - unique key creates same index)
  UNIQUE KEY uniq_tenant_provider (tenantId, providerType) COMMENT 'Unique constraint and index for tenant+provider queries'
);

-- Foreign keys
ALTER TABLE tenant_ci_cd_integrations
  ADD CONSTRAINT fk_ci_cd_tenant
    FOREIGN KEY (tenantId) REFERENCES tenants(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE tenant_ci_cd_integrations
  ADD CONSTRAINT fk_ci_cd_created_by_account
    FOREIGN KEY (createdByAccountId) REFERENCES accounts(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;
    
-- Verification helper queries
SELECT 
  'tenant_ci_cd_integrations' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tenant_ci_cd_integrations';

DESCRIBE tenant_ci_cd_integrations;

-- Normalize legacy providerType values if any rows used CIRCLECI before enum standardization
UPDATE tenant_ci_cd_integrations
SET providerType = 'CIRCLE_CI'
WHERE providerType = 'CIRCLECI';


