-- ============================================================================
-- PROJECT MANAGEMENT INTEGRATION - SIMPLIFIED STATELESS SCHEMA
-- Only credentials and configurations, NO ticket storage
-- Matches test management philosophy exactly!
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- LAYER 1: INTEGRATION (Credentials)
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
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE KEY unique_project_name (projectId, name),
  INDEX idx_pm_integration_project (projectId),
  INDEX idx_pm_integration_provider (providerType),
  
  FOREIGN KEY (createdByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Project management credentials (JIRA, Linear, etc.)';

-- ============================================================================
-- LAYER 2: CONFIGURATION (Reusable Configs)
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
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_project_config_name (projectId, name),
  INDEX idx_pm_config_project (projectId, isActive),
  INDEX idx_pm_config_integration (integrationId),
  
  FOREIGN KEY (integrationId) REFERENCES project_management_integrations(id) ON DELETE RESTRICT,
  FOREIGN KEY (createdByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Reusable project management configurations';

-- ============================================================================
-- NO LAYER 3! Release management handles ticket storage
-- ============================================================================

SELECT 'Project Management tables created successfully! (2 tables only - stateless)' as Status;

