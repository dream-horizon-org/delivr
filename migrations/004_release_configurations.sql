-- ============================================================================
-- Migration: Release Configurations
-- Version: 004
-- Date: 2025-01-10
-- Description: Creates table for release configuration profiles that reference
--              various integration configurations. This enables platform-agnostic
--              release management where each profile can have different settings.
-- ============================================================================

-- ============================================================================
-- Purpose:
-- This table acts as the central configuration hub for releases. When creating
-- a release, users select a configuration profile (e.g., "Production") which
-- contains references to all the necessary integration configurations.
-- 
-- The core release service uses these configIds to call respective integration
-- services without knowing the implementation details.
-- ============================================================================

USE codepushdb;

-- ============================================================================
-- RELEASE CONFIGURATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS release_configurations (
  -- ========================================================================
  -- PRIMARY KEY
  -- ========================================================================
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Unique identifier (shortid)',
  
  -- ========================================================================
  -- TENANT/PROJECT REFERENCE
  -- ========================================================================
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL 
    COMMENT 'Reference to tenants table (project)',
  
  -- ========================================================================
  -- BASIC CONFIGURATION
  -- ========================================================================
  name VARCHAR(255) NOT NULL 
    COMMENT 'Configuration name',
  
  description TEXT NULL 
    COMMENT 'Optional description',
  
  releaseType ENUM('PLANNED', 'HOTFIX', 'MAJOR') NOT NULL 
    COMMENT 'Type of release',
  
  targets JSON NOT NULL 
    COMMENT 'Array of target platforms (e.g., ["PLAY_STORE", "APP_STORE"])',
  
  -- ========================================================================
  -- INTEGRATION CONFIGURATION REFERENCES
  -- These are foreign keys to respective integration tables
  -- NULL means that integration is not configured for this profile
  -- ========================================================================
  
  -- Source Code Management integration configuration reference
  sourceCodeManagementConfigId VARCHAR(255) NULL 
    COMMENT 'Reference to Source Code Management integration config',
  
  -- CI integration configuration reference (contains all build pipelines)
  ciConfigId VARCHAR(255) NULL 
    COMMENT 'Reference to CI integration config (contains all build pipelines)',
  
  -- Test Case Management integration configuration reference
  testManagementConfigId VARCHAR(255) NULL 
    COMMENT 'Reference to Test Case Management integration config',
  
  -- Project Management integration configuration reference
  projectManagementConfigId VARCHAR(255) NULL 
    COMMENT 'Reference to Project Management integration config',
  
  commsConfigId VARCHAR(255) NULL 
    COMMENT 'Reference to Communications (Slack/Teams) integration config',
  
  -- ========================================================================
  -- SCHEDULING CONFIGURATION
  -- ========================================================================
  
  scheduling JSON NULL 
    COMMENT 'Scheduling configuration as JSON object',
  
  
  -- ========================================================================
  -- STATUS AND FLAGS
  -- ========================================================================
  
  isActive BOOLEAN NOT NULL DEFAULT TRUE 
    COMMENT 'Soft delete flag',
  
  isDefault BOOLEAN NOT NULL DEFAULT FALSE 
    COMMENT 'Default profile for this tenant',
  
  -- ========================================================================
  -- METADATA
  -- ========================================================================
  
  createdByAccountId VARCHAR(255) NOT NULL 
    COMMENT 'Account who created this configuration',
  
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- ========================================================================
  -- INDEXES
  -- ========================================================================
  
  INDEX idx_release_config_tenant (tenantId, isActive) 
    COMMENT 'Query active configurations by tenant',
  
  INDEX idx_release_config_name (tenantId, name) 
    COMMENT 'Query by configuration name',
  
  INDEX idx_release_config_type (tenantId, releaseType) 
    COMMENT 'Query by release type',
  
  INDEX idx_release_config_default (tenantId, isDefault) 
    COMMENT 'Find default configuration',
  
  -- Ensure unique configuration names per tenant
  UNIQUE KEY unique_tenant_name (tenantId, name) 
    COMMENT 'Each tenant can only have one configuration with the same name'
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1 
COMMENT='Release configuration profiles linking to various integration configs';

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Link to tenants table
ALTER TABLE release_configurations
  ADD CONSTRAINT fk_release_config_tenant
    FOREIGN KEY (tenantId) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Link to accounts table for creator
ALTER TABLE release_configurations
  ADD CONSTRAINT fk_release_config_created_by
    FOREIGN KEY (createdByAccountId)
    REFERENCES accounts(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Link to SCM integrations (already exists)
ALTER TABLE release_configurations
  ADD CONSTRAINT fk_release_config_scm
    FOREIGN KEY (sourceCodeManagementConfigId)
    REFERENCES tenant_scm_integrations(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Note: Foreign keys for other integrations will be added when those tables are created:
-- - fk_release_config_ci -> tenant_ci_integrations
-- - fk_release_config_tcm -> tenant_test_case_management_integrations
-- - fk_release_config_pm -> tenant_project_management_integrations
-- - fk_release_config_comms -> tenant_communication_integrations

-- ============================================================================
-- VALIDATION TRIGGER (Optional)
-- Ensures at least one integration is configured
-- ============================================================================

DELIMITER $$

CREATE TRIGGER validate_release_config_has_integrations
BEFORE INSERT ON release_configurations
FOR EACH ROW
BEGIN
  -- Check if at least one integration is configured
  IF NEW.sourceCodeManagementConfigId IS NULL 
     AND NEW.ciConfigId IS NULL 
     AND NEW.testManagementConfigId IS NULL 
     AND NEW.projectManagementConfigId IS NULL 
     AND NEW.commsConfigId IS NULL THEN
    SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'At least one integration must be configured for a release profile';
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
  'release_configurations' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'release_configurations';

DESCRIBE release_configurations;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Production Configuration
-- INSERT INTO release_configurations (
--   id, tenantId, name, description, releaseType, targets,
--   sourceCodeManagementConfigId, ciConfigId, testManagementConfigId, projectManagementConfigId, commsConfigId,
--   scheduling, isDefault, createdByAccountId
-- ) VALUES (
--   'rc_prod_001',
--   'NJEG6wOk7e',
--   'Prod Release Config',
--   'Configuration for production releases with full testing',
--   'PLANNED',
--   JSON_ARRAY('PLAY_STORE', 'APP_STORE'),
--   'scm_github_001',      -- GitHub SCM configuration
--   'ci_all_pipelines_001', -- CI config containing all build pipelines
--   'tcm_chk_001',         -- Test Case Management configuration
--   'pm_jira_001',         -- Project Management configuration
--   'comms_slack_001',     -- Slack configuration
--   JSON_OBJECT(
--     'releaseFrequency', null,
--     'defaultReleaseTime', '18:00',
--     'timezone', 'Asia/Kolkata'
--   ),
--   TRUE,
--   'acc_xyz'
-- );

-- Example 2: Hotfix Configuration with minimal integrations
-- INSERT INTO release_configurations (
--   id, tenantId, name, description, releaseType, targets,
--   sourceCodeManagementConfigId, commsConfigId, createdByAccountId
-- ) VALUES (
--   'rc_hotfix_001',
--   'NJEG6wOk7e',
--   'Hotfix Config',
--   'Quick hotfix releases',
--   'HOTFIX',
--   JSON_ARRAY('PLAY_STORE'),
--   'scm_abc123',      -- Same GitHub config
--   'comms_slack_001', -- Slack notifications
--   'acc_xyz'
-- );

-- ============================================================================
-- QUERY EXAMPLES
-- ============================================================================

-- Get all active configurations for a tenant
-- SELECT * FROM release_configurations 
-- WHERE tenantId = 'NJEG6wOk7e' AND isActive = TRUE;

-- Get default configuration for a tenant
-- SELECT * FROM release_configurations 
-- WHERE tenantId = 'NJEG6wOk7e' AND isDefault = TRUE AND isActive = TRUE;

-- Get configuration with all integration details (JOIN example)
-- SELECT 
--   rc.*,
--   scm.displayName as scm_name,
--   scm.owner as github_owner,
--   scm.repo as github_repo
-- FROM release_configurations rc
-- LEFT JOIN tenant_scm_integrations scm ON rc.sourceCodeManagementConfigId = scm.id
-- WHERE rc.id = 'rc_prod_001';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
