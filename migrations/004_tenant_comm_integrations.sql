-- ============================================================================
-- Migration: Tenant Comm Integrations (Slack Focus)
-- Version: 004
-- Date: 2025-11-14
-- Description: Creates table for Slack connections for release notifications
-- ============================================================================

-- ============================================================================
-- What we need for Slack:
--   - botToken: SLACK_BOT_TOKEN (xoxb-...)
--   - workspaceId: Slack Workspace/Team ID (e.g., T01234ABCDE)
--   - workspaceName: Human-readable workspace name
--   - botUserId: Bot User ID (e.g., U01234ABCDE)
--   - channels: Array of channels to post notifications
-- 
-- These fields enable:
--   ✅ Post release notifications
--   ✅ Send deployment updates
--   ✅ Alert on build failures
--   ✅ Channel-specific messaging
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_comm_integrations (
  -- Primary key
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (nanoid)',
  
  -- Tenant reference (matches tenants.id exactly)
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'Reference to tenants table',
  
  -- Communication platform type (extensible for future: Teams, Discord)
  communicationType ENUM('SLACK') NOT NULL DEFAULT 'SLACK' COMMENT 'Communication platform type',
  
  -- ========================================================================
  -- SLACK CONFIGURATION
  -- ========================================================================
  
  -- Authentication (ENCRYPTED at application level before storage!)
  slackBotToken TEXT NULL COMMENT 'Slack Bot Token (xoxb-...) - ENCRYPTED at application level',
  
  -- Workspace identification
  slackBotUserId VARCHAR(255) NULL COMMENT 'Slack Bot User ID (e.g., U01234ABCDE)',
  slackWorkspaceId VARCHAR(255) NULL COMMENT 'Slack Workspace/Team ID (e.g., T01234ABCDE)',
  slackWorkspaceName VARCHAR(255) NULL COMMENT 'Slack Workspace Name (e.g., "Acme Corp")',
  
  -- Channels configuration
  slackChannels JSON NULL COMMENT 'Array of Slack channels: [{id, name}]',
  
  -- ========================================================================
  -- STATUS & VERIFICATION
  -- ========================================================================
  
  verificationStatus ENUM('PENDING', 'VALID', 'INVALID') NOT NULL DEFAULT 'PENDING' 
    COMMENT 'Connection verification status',
  
  -- ========================================================================
  -- METADATA
  -- ========================================================================
  
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- ========================================================================
  -- INDEXES
  -- ========================================================================
  
  INDEX idx_comm_tenant (tenantId) COMMENT 'Query integrations by tenant',
  INDEX idx_comm_verification (verificationStatus) COMMENT 'Find failed connections',
  
  -- Enforce one-to-one: One Slack integration per tenant
  UNIQUE KEY unique_tenant_comm (tenantId, communicationType) COMMENT 'Each tenant can only have ONE Slack integration'
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1
COMMENT='Tenant Slack connections for release notifications';

-- ============================================================================
-- Add foreign key constraints
-- ============================================================================

ALTER TABLE tenant_comm_integrations
  ADD CONSTRAINT fk_comm_tenant
    FOREIGN KEY (tenantId) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  'tenant_comm_integrations' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tenant_comm_integrations';

DESCRIBE tenant_comm_integrations;

-- ============================================================================
-- USAGE EXAMPLE (after table creation)
-- ============================================================================

-- Example: Connecting Slack workspace for notifications
-- 
-- INSERT INTO tenant_comm_integrations (
--   id, tenantId, communicationType,
--   slackBotToken, slackBotUserId, 
--   slackWorkspaceId, slackWorkspaceName,
--   slackChannels, verificationStatus
-- ) VALUES (
--   'comm_abc123',
--   'NJEG6wOk7e',
--   'SLACK',
--   '[ENCRYPTED_TOKEN]',
--   'U01234ABCDE',
--   'T01234ABCDE',
--   'Acme Corp',
--   '[{"id": "C12345", "name": "releases"}, {"id": "C67890", "name": "general"}]',
--   'VALID'
-- );
-- 
-- This enables:
--   - Post release announcements to #releases
--   - Send deployment status to #general
--   - Alert on build failures
--   - Custom notifications per channel

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
--
-- ⚠️  IMPORTANT:
--   - slackBotToken MUST be encrypted at application level before storage
--   - NEVER expose tokens in API responses
--   - Use secure token management (AWS Secrets Manager, etc.)
--   - Rotate tokens periodically
--   - Revoke tokens immediately if compromised

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

