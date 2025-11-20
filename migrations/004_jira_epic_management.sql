-- ============================================================================
-- Jira Epic Management Migration
-- Separates Jira credentials from configurations for better flexibility
-- 
-- Creates 3 new tables:
-- - jira_integrations: Stores Jira credentials (one per tenant)
-- - jira_configurations: Stores reusable Jira configurations (many per tenant)
-- - release_jira_epics: Stores epic metadata and tracks creation status
-- 
-- Modifies 1 existing table:
-- - releases: Adds jiraProjectKey column for backward compatibility
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- JIRA INTEGRATIONS TABLE (Credentials)
-- ============================================================================

-- Jira Integrations table - Stores Jira credentials per tenant
CREATE TABLE IF NOT EXISTS jira_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- Connection details
  jiraInstanceUrl VARCHAR(500) NOT NULL COMMENT 'Base URL of Jira instance (e.g., https://company.atlassian.net)',
  apiToken TEXT NOT NULL COMMENT 'Encrypted Jira API token or password',
  email VARCHAR(255) NULL COMMENT 'Email for Jira Cloud authentication',
  jiraType ENUM('JIRA_CLOUD', 'JIRA_SERVER', 'JIRA_DATA_CENTER') NOT NULL DEFAULT 'JIRA_CLOUD',
  
  -- Status
  isEnabled BOOLEAN NOT NULL DEFAULT TRUE,
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'NOT_VERIFIED',
  lastVerifiedAt TIMESTAMP NULL,
  
  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE KEY unique_tenant_jira (tenantId) COMMENT 'One Jira integration per tenant',
  INDEX idx_jira_integration_tenant (tenantId),
  INDEX idx_jira_verification (verificationStatus),
  
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Stores Jira credentials and connection info per tenant';

-- ============================================================================
-- JIRA CONFIGURATIONS TABLE (Reusable Configs)
-- ============================================================================

-- Jira Configurations table - Stores reusable Jira configurations
-- Each tenant can have multiple configurations (e.g., "Frontend Config", "Mobile Config")
CREATE TABLE IF NOT EXISTS jira_configurations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- Configuration identification
  configName VARCHAR(255) NOT NULL COMMENT 'User-friendly name (e.g., "Frontend Release Config")',
  description TEXT NULL,
  
  -- Platform-specific Jira settings stored as JSON
  -- Structure: {"WEB": {"projectKey": "FE", "readyToReleaseState": "Done"}, "IOS": {...}, "ANDROID": {...}}
  platformsConfig JSON NOT NULL COMMENT 'Platform-specific Jira project keys and ready states',
  
  -- Status
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE KEY unique_tenant_config_name (tenantId, configName) COMMENT 'Each config name must be unique per tenant',
  INDEX idx_jira_config_tenant (tenantId, isActive),
  INDEX idx_jira_config_active (isActive),
  
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Stores reusable Jira configurations with platform-specific settings';

-- ============================================================================
-- JIRA EPIC MANAGEMENT TABLE
-- ============================================================================

-- Release Jira Epics table - Stores epic metadata and tracks creation status
CREATE TABLE IF NOT EXISTS release_jira_epics (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL,
  platform ENUM('WEB', 'IOS', 'ANDROID') NOT NULL,
  
  -- Reference to configuration (contains project key and ready state)
  jiraConfigId VARCHAR(255) NOT NULL COMMENT 'Reference to jira_configurations table',
  
  -- Epic details
  epicTitle VARCHAR(500) NOT NULL,
  epicDescription TEXT NULL,
  
  -- Jira API response (populated after creation)
  jiraEpicKey VARCHAR(50) NULL,
  jiraEpicId VARCHAR(255) NULL,
  jiraEpicUrl VARCHAR(500) NULL,
  
  -- Status tracking
  creationStatus ENUM('PENDING', 'CREATING', 'CREATED', 'FAILED') DEFAULT 'PENDING',
  creationError TEXT NULL,
  
  -- Timestamps
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  jiraCreatedAt TIMESTAMP NULL,
  
  FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  FOREIGN KEY (jiraConfigId) REFERENCES jira_configurations(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_release_platform (releaseId, platform),
  INDEX idx_release_epics (releaseId),
  INDEX idx_epic_status (creationStatus),
  INDEX idx_epic_config (jiraConfigId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- MODIFY EXISTING TABLES
-- ============================================================================

-- Add jiraProjectKey to releases table for backward compatibility
ALTER TABLE releases 
ADD COLUMN IF NOT EXISTS jiraProjectKey VARCHAR(50) NULL AFTER playStoreEpicId;

-- ============================================================================
-- COMPLETE
-- ============================================================================

SELECT 'Jira Epic Management tables created successfully!' as Status;

