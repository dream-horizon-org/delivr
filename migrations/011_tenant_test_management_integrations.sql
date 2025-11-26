-- ============================================================================
-- Migration: Tenant Test Management Integrations
-- Version: 011
-- Date: 2025-11-22
-- Description: Creates table for tenant-scoped test management integrations (Checkmate, TestRail, etc.)
-- ============================================================================

-- ============================================================================
-- Purpose: Store test management provider credentials per tenant
-- Providers: Checkmate, TestRail, Xray, Zephyr
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_test_management_integrations (
  -- Primary key
  id CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID primary key',
  
  -- Tenant reference (matches tenants.id exactly)
  tenant_id CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'Reference to tenants table',
  
  -- Integration details
  name VARCHAR(255) NOT NULL COMMENT 'User-friendly name (e.g., "Checkmate Production", "TestRail Staging")',
  
  provider_type VARCHAR(50) NOT NULL COMMENT 'Test management provider: CHECKMATE, TESTRAIL, XRAY, ZEPHYR',
  
  -- Provider configuration (JSON)
  config JSON NOT NULL COMMENT 'Provider configuration (baseUrl, authToken, orgId, etc.)',
  
  -- Metadata
  created_by_account_id VARCHAR(255) NULL COMMENT 'Account ID of creator',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_ttmi_tenant (tenant_id) COMMENT 'Query integrations by tenant',
  INDEX idx_ttmi_provider (provider_type) COMMENT 'Query by provider type',
  INDEX idx_ttmi_created_at (created_at) COMMENT 'Sort by creation date',
  
  -- Unique constraint: One integration name per tenant per provider
  UNIQUE KEY idx_ttmi_unique_name (tenant_id, provider_type, name) COMMENT 'Unique integration name per tenant per provider',
  
  -- Foreign key to tenants table
  CONSTRAINT fk_ttmi_tenant
    FOREIGN KEY (tenant_id) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1 
COMMENT='Tenant test management provider credentials (Checkmate, TestRail, etc.)';

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  'tenant_test_management_integrations' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tenant_test_management_integrations';

DESCRIBE tenant_test_management_integrations;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Create Checkmate integration for a tenant
-- 
-- INSERT INTO tenant_test_management_integrations (
--   id, tenant_id, name, provider_type, config, created_by_account_id
-- ) VALUES (
--   UUID(),
--   'Vy3mYbVgmx',
--   'Checkmate Production',
--   'CHECKMATE',
--   JSON_OBJECT(
--     'baseUrl', 'https://checkmate.example.com',
--     'authToken', '[ENCRYPTED_TOKEN]',
--     'orgId', 123
--   ),
--   'acc_xyz'
-- );

-- Example 2: Create TestRail integration
-- 
-- INSERT INTO tenant_test_management_integrations (
--   id, tenant_id, name, provider_type, config, created_by_account_id
-- ) VALUES (
--   UUID(),
--   'Vy3mYbVgmx',
--   'TestRail QA',
--   'TESTRAIL',
--   JSON_OBJECT(
--     'baseUrl', 'https://testrail.example.com',
--     'username', 'qa@example.com',
--     'apiKey', '[ENCRYPTED_KEY]'
--   ),
--   'acc_xyz'
-- );

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
--
-- ⚠️  IMPORTANT:
--   - authToken/apiKey in config MUST be encrypted at application level before storage
--   - NEVER expose tokens in API responses
--   - Use secure token management (AWS Secrets Manager, etc.)
--   - Rotate tokens periodically
--   - Revoke tokens immediately if compromised

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

