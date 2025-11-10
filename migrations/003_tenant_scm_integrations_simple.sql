-- ============================================================================
-- Migration: Tenant SCM Integrations (Simplified - GitHub Focus)
-- Version: 003
-- Date: 2025-01-10
-- Description: Creates table for GitHub connections with minimal fields needed
--              for branch operations, commits, and workflows (like OG Delivr)
-- ============================================================================

-- ============================================================================
-- What OG Delivr uses for GitHub (from Github.server.ts):
--   - token: GITHUB_TOKEN (Personal Access Token)
--   - owner: 'dream11' (organization/username)
--   - repo: 'd11-react-native' (repository name)
--   - secret: GITHUB_WEBHOOK_SECRET (for webhooks)
--   - sender: GITHUB_SENDER_LOGIN (for attribution)
-- 
-- These fields enable:
--   ✅ Create branches
--   ✅ Get branches
--   ✅ Compare commits
--   ✅ Create tags
--   ✅ Trigger workflows
--   ✅ Handle webhooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_scm_integrations (
  -- Primary key
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (nanoid)',
  
  -- Tenant reference (matches tenants.id exactly)
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'Reference to tenants table',
  
  -- SCM provider type (extensible for future: GitLab, Bitbucket)
  scmType ENUM('GITHUB', 'GITLAB', 'BITBUCKET') NOT NULL DEFAULT 'GITHUB' COMMENT 'Provider type',
  
  -- Display name
  displayName VARCHAR(255) NOT NULL COMMENT 'User-friendly name (e.g., "Dream11 Mobile App")',
  
  -- ========================================================================
  -- GITHUB CONNECTION (OG Delivr requirements)
  -- ========================================================================
  
  -- Repository identification (parsed from URL or entered separately)
  owner VARCHAR(255) NOT NULL COMMENT 'GitHub organization or username (e.g., "dream11")',
  repo VARCHAR(255) NOT NULL COMMENT 'Repository name (e.g., "d11-react-native")',
  
  -- Full URL (convenience field - can be constructed from owner/repo)
  repositoryUrl VARCHAR(512) NOT NULL COMMENT 'Full URL: https://github.com/{owner}/{repo}',
  
  -- Default branch (main/master/develop)
  defaultBranch VARCHAR(255) NOT NULL DEFAULT 'main' COMMENT 'Default branch for operations',
  
  -- Authentication (ENCRYPTED at application level before storage!)
  accessToken TEXT NOT NULL COMMENT 'GitHub Personal Access Token (encrypted) - needs repo + workflow permissions',
  
  -- Webhook configuration (optional - for automated events)
  webhookSecret TEXT NULL COMMENT 'Webhook secret for signature verification (encrypted)',
  webhookUrl VARCHAR(512) NULL COMMENT 'Delivr webhook endpoint URL',
  webhookEnabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Is webhook active?',
  
  -- GitHub sender (optional - for attribution)
  senderLogin VARCHAR(255) NULL COMMENT 'GitHub username for commits/operations attribution',
  
  -- ========================================================================
  -- EXTENSIBILITY (for GitLab/Bitbucket - future)
  -- ========================================================================
  
  -- Provider-specific config (JSON blob for flexibility)
  providerConfig JSON NULL COMMENT 'Additional provider-specific configuration',
  
  -- ========================================================================
  -- STATUS & VERIFICATION
  -- ========================================================================
  
  isActive BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Soft delete flag',
  
  verificationStatus ENUM('PENDING', 'VALID', 'INVALID', 'EXPIRED') NOT NULL DEFAULT 'PENDING' 
    COMMENT 'Connection status (verified via GitHub API)',
  
  lastVerifiedAt DATETIME NULL COMMENT 'Last successful verification',
  verificationError TEXT NULL COMMENT 'Error message if verification failed',
  
  -- ========================================================================
  -- METADATA
  -- ========================================================================
  
  createdByAccountId VARCHAR(255) NOT NULL COMMENT 'Account who created this',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- ========================================================================
  -- INDEXES
  -- ========================================================================
  
  INDEX idx_scm_tenant (tenantId, isActive) COMMENT 'Query active integrations by tenant',
  INDEX idx_scm_owner_repo (owner, repo) COMMENT 'Query by GitHub org/repo',
  INDEX idx_scm_verification (verificationStatus) COMMENT 'Find failed/expired connections',
  
  -- Enforce one-to-one: One SCM integration per tenant
  UNIQUE KEY unique_tenant_scm (tenantId) COMMENT 'Each tenant can only have ONE SCM integration'
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1 
COMMENT='Tenant GitHub connections (like OG Delivr: owner, repo, token)';

-- ============================================================================
-- Add foreign key constraints
-- ============================================================================

ALTER TABLE tenant_scm_integrations
  ADD CONSTRAINT fk_scm_tenant
    FOREIGN KEY (tenantId) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE tenant_scm_integrations
  ADD CONSTRAINT fk_scm_created_by
    FOREIGN KEY (createdByAccountId)
    REFERENCES accounts(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  'tenant_scm_integrations' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tenant_scm_integrations';

DESCRIBE tenant_scm_integrations;

-- ============================================================================
-- USAGE EXAMPLE (after table creation)
-- ============================================================================

-- Example: Dream11 connecting their GitHub repo
-- 
-- INSERT INTO tenant_scm_integrations (
--   id, tenantId, scmType, displayName,
--   owner, repo, repositoryUrl, defaultBranch,
--   accessToken, createdByAccountId
-- ) VALUES (
--   'scm_abc123',
--   'NJEG6wOk7e',
--   'GITHUB',
--   'Dream11 Mobile App',
--   'dream11',
--   'd11-react-native',
--   'https://github.com/dream11/d11-react-native',
--   'master',
--   '[ENCRYPTED_TOKEN]',
--   'acc_xyz'
-- );
-- 
-- This enables:
--   - octokit.rest.repos.getBranch({ owner: 'dream11', repo: 'd11-react-native', branch: 'master' })
--   - octokit.rest.repos.compareCommits({ owner, repo, base, head })
--   - octokit.rest.git.createTag({ owner, repo, tag, message, object, type })
--   - And all other operations from OG Delivr!

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

