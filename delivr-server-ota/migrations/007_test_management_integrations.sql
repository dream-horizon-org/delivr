-- ============================================================================
-- Migration: Test Management Integrations
-- Version: 007
-- Date: 2025-01-20
-- Description: Creates tables for Test Management integrations (Checkmate, TestRail, etc.)
--              - project_test_management_integrations: Stores credentials for test management providers
--              - test_management_configs: Reusable test configurations for projects
-- ============================================================================

-- ============================================================================
-- TABLE 1: Project Test Management Integrations
-- ============================================================================
-- Purpose: Store test management provider credentials per project
-- Providers: Checkmate, TestRail, Xray, Zephyr
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_test_management_integrations (
  -- Primary key
  id CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID primary key',
  
  -- Project reference
  project_id VARCHAR(255) NOT NULL COMMENT 'Project identifier - links to project service',
  
  -- Integration details
  name VARCHAR(255) NOT NULL COMMENT 'User-friendly name (e.g., "Checkmate Production", "TestRail Staging")',
  
  provider_type VARCHAR(50) NOT NULL COMMENT 'Test management provider: CHECKMATE, TESTRAIL, XRAY, ZEPHYR',
  
  -- Provider configuration (JSONB in PostgreSQL, JSON in MySQL)
  config JSON NOT NULL COMMENT 'Provider configuration (baseUrl, authToken, etc.)',
  
  -- Metadata
  created_by_account_id VARCHAR(255) NULL COMMENT 'Account ID of creator',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_ptmi_project (project_id) COMMENT 'Query integrations by project',
  INDEX idx_ptmi_provider (provider_type) COMMENT 'Query by provider type',
  INDEX idx_ptmi_created_at (created_at) COMMENT 'Sort by creation date',
  
  -- Unique constraint: One integration name per project
  UNIQUE KEY idx_ptmi_unique_name (project_id, name) COMMENT 'Unique integration name per project'
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1 
COMMENT='Test management provider credentials (Checkmate, TestRail, etc.)';

-- ============================================================================
-- TABLE 2: Test Management Configs
-- ============================================================================
-- Purpose: Store reusable test configurations for projects
-- Links to: project_test_management_integrations
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_management_configs (
  -- Primary key
  id CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID primary key',
  
  -- References
  project_id VARCHAR(255) NOT NULL COMMENT 'Project identifier',
  integration_id CHAR(36) NOT NULL COMMENT 'Reference to project_test_management_integrations',
  
  -- Configuration details
  name VARCHAR(255) NOT NULL COMMENT 'Configuration name (e.g., "Smoke Tests", "Regression Tests")',
  
  pass_threshold_percent INT NOT NULL DEFAULT 100 COMMENT 'Minimum pass percentage required (0-100)',
  
  -- Platform-specific configurations (JSONB in PostgreSQL, JSON in MySQL)
  platform_configurations JSON NOT NULL COMMENT 'Platform-specific test configurations',
  
  -- Metadata
  created_by_account_id VARCHAR(255) NULL COMMENT 'Account ID of creator',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_tmc_project (project_id) COMMENT 'Query configs by project',
  INDEX idx_tmc_integration (integration_id) COMMENT 'Query configs by integration',
  INDEX idx_tmc_created_at (created_at) COMMENT 'Sort by creation date',
  
  -- Unique constraint: One config name per project
  UNIQUE KEY idx_tmc_unique_name (project_id, name) COMMENT 'Unique config name per project'
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1 
COMMENT='Reusable test configurations for projects';

-- ============================================================================
-- Foreign Key Constraints
-- ============================================================================

-- Link test_management_configs to project_test_management_integrations
ALTER TABLE test_management_configs
  ADD CONSTRAINT fk_tmc_integration
    FOREIGN KEY (integration_id) 
    REFERENCES project_test_management_integrations(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  'project_test_management_integrations' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'project_test_management_integrations';

SELECT 
  'test_management_configs' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'test_management_configs';

DESCRIBE project_test_management_integrations;
DESCRIBE test_management_configs;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Create Checkmate integration
-- 
-- INSERT INTO project_test_management_integrations (
--   id, project_id, name, provider_type, config, created_by_account_id
-- ) VALUES (
--   UUID(),
--   'proj_abc123',
--   'Checkmate Production',
--   'CHECKMATE',
--   JSON_OBJECT(
--     'baseUrl', 'https://checkmate.example.com',
--     'authToken', '[ENCRYPTED_TOKEN]'
--   ),
--   'acc_xyz'
-- );

-- Example 2: Create test configuration
-- 
-- INSERT INTO test_management_configs (
--   id, project_id, integration_id, name, pass_threshold_percent,
--   platform_configurations, created_by_account_id
-- ) VALUES (
--   UUID(),
--   'proj_abc123',
--   '[integration_id_from_above]',
--   'Smoke Tests',
--   95,
--   JSON_ARRAY(
--     JSON_OBJECT(
--       'platform', 'IOS',
--       'projectId', 1,
--       'sectionIds', JSON_ARRAY(101, 102),
--       'labelIds', JSON_ARRAY(201),
--       'squadIds', JSON_ARRAY(301)
--     ),
--     JSON_OBJECT(
--       'platform', 'ANDROID',
--       'projectId', 2,
--       'sectionIds', JSON_ARRAY(103, 104),
--       'labelIds', JSON_ARRAY(202),
--       'squadIds', JSON_ARRAY(302)
--     )
--   ),
--   'acc_xyz'
-- );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

