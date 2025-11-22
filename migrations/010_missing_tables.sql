-- ============================================================================
-- Migration: Create Missing Tables
-- Description: Creates tables that were missing from the database
-- Date: 2025-11-21
-- Tables: project_management_integrations, project_management_configs, tenant_ci_cd_config
-- ============================================================================

-- ============================================================================
-- PROJECT MANAGEMENT INTEGRATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_management_integrations (
  id VARCHAR(255) PRIMARY KEY,
  projectId VARCHAR(255) NOT NULL COMMENT 'Project identifier',
  name VARCHAR(255) NOT NULL COMMENT 'User-friendly name (e.g., "JIRA Production")',
  providerType ENUM('JIRA', 'LINEAR', 'ASANA', 'MONDAY', 'CLICKUP') NOT NULL DEFAULT 'JIRA',
  config JSON NOT NULL COMMENT 'Provider-specific configuration',
  
  -- Status
  isEnabled BOOLEAN NOT NULL DEFAULT TRUE,
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'NOT_VERIFIED',
  lastVerifiedAt TIMESTAMP NULL,
  
  -- Metadata
  createdByAccountId VARCHAR(255) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE KEY unique_project_name (projectId, name),
  INDEX idx_pm_integration_project (projectId),
  INDEX idx_pm_integration_provider (providerType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Project management credentials (JIRA, Linear, etc.)';

-- ============================================================================
-- PROJECT MANAGEMENT CONFIGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_management_configs (
  id VARCHAR(255) PRIMARY KEY,
  projectId VARCHAR(255) NOT NULL,
  integrationId VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL COMMENT 'Config name (e.g., "Frontend Release")',
  description TEXT NULL,
  
  -- Platform-specific settings as JSON array
  -- [
  --   {
  --     "platform": "WEB",
  --     "parameters": {
  --       "projectKey": "FE",
  --       "issueType": "Epic",
  --       "completedStatus": "Done"
  --     }
  --   }
  -- ]
  platformConfigurations JSON NOT NULL,
  
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdByAccountId VARCHAR(255) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_project_config_name (projectId, name),
  INDEX idx_pm_config_project (projectId, isActive),
  INDEX idx_pm_config_integration (integrationId),
  
  FOREIGN KEY (integrationId) REFERENCES project_management_integrations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Reusable project management configurations';

-- ============================================================================
-- TENANT CI/CD CONFIG
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_ci_cd_config (
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (shortid)',

  -- Tenant reference
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'FK -> tenants.id',

  -- Array of workflow primary keys (created in tenant_ci_cd_workflows)
  workflowIds JSON NOT NULL COMMENT 'Array of workflow IDs (strings)',

  -- Metadata
  createdByAccountId VARCHAR(255) NULL COMMENT 'FK -> accounts.id',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexing
  KEY idx_tenant (tenantId),
  
  -- Foreign keys
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 
COMMENT='Tenant-level CI/CD config (stores workflow IDs)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 010: Missing tables created successfully' AS status;

