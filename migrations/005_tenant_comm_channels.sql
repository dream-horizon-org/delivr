-- ============================================================================
-- Migration: Slack Configuration
-- Version: 005
-- Date: 2025-11-20
-- Description: Creates table for stage-based Slack channel configuration
-- 
-- DESIGN NOTES:
--   - Each row represents a channel configuration for a specific release
--   - Multiple rows can have the same integrationId/tenantId (one per release)
--   - id is unique identifier (can be releaseId or generated)
--   - No unique constraint on integrationId (many configs per integration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS slack_configuration (
  -- Primary key (unique per release/config)
  id VARCHAR(21) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (nanoid - 21 chars)',
  
  -- Foreign key - Integration (non-unique: many releases share same integration)
  integrationId VARCHAR(255) NOT NULL COMMENT 'Reference to tenant_comm_integrations table',
  
  -- Foreign key - Tenant (non-unique: many releases for same tenant)
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'Reference to tenants table',
  
  -- Channel configuration (stage-based mapping)
  channelData JSON NULL COMMENT 'Stage-to-channels mapping: {"development": ["C111"], "production": ["C222"]}',
  
  -- Metadata
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- ========================================================================
  -- INDEXES
  -- ========================================================================
  
  INDEX idx_channels_integration (integrationId) COMMENT 'Query channels by integration',
  INDEX idx_channels_tenant (tenantId) COMMENT 'Query channels by tenant',
  
  -- ========================================================================
  -- FOREIGN KEY CONSTRAINTS
  -- ========================================================================
  
  CONSTRAINT fk_channels_integration
    FOREIGN KEY (integrationId) 
    REFERENCES tenant_comm_integrations(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_channels_tenant
    FOREIGN KEY (tenantId) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=latin1
COMMENT='Stage-based Slack channel configuration';

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  'slack_configuration' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'slack_configuration';

DESCRIBE slack_configuration;

-- ============================================================================
-- USAGE EXAMPLE (after table creation)
-- ============================================================================

-- Example: Configure channels for different releases
-- 
-- Release 1:
-- INSERT INTO slack_configuration (
--   id, integrationId, tenantId, channelData
-- ) VALUES (
--   'release-001',
--   'comm_abc123',
--   'NJEG6wOk7e',
--   '{"development": ["C111", "C222"], "production": ["C333"]}'
-- );
-- 
-- Release 2 (same integration/tenant, different channels):
-- INSERT INTO slack_configuration (
--   id, integrationId, tenantId, channelData
-- ) VALUES (
--   'release-002',
--   'comm_abc123',
--   'NJEG6wOk7e',
--   '{"development": ["C444"], "staging": ["C555"]}'
-- );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

