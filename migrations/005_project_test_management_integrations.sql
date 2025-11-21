-- Migration: Create project_test_management_integrations table (MySQL 5.7)
-- Description: Store test management integrations at project level
-- Date: 2024-11-20

CREATE TABLE IF NOT EXISTS project_test_management_integrations (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50) NOT NULL,
  config JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  verification_status VARCHAR(50) DEFAULT NULL,
  last_verified_at DATETIME DEFAULT NULL,
  created_by_account_id VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_ptmi_provider_type CHECK (provider_type IN ('checkmate', 'testrail', 'xray', 'zephyr')),
  CONSTRAINT check_ptmi_verification_status CHECK (verification_status IS NULL OR verification_status IN ('PENDING', 'VALID', 'INVALID', 'ERROR')),
  CONSTRAINT check_ptmi_name_not_empty CHECK (CHAR_LENGTH(name) > 0),
  CONSTRAINT check_ptmi_project_id_not_empty CHECK (CHAR_LENGTH(project_id) > 0),
  
  -- Indexes
  KEY idx_ptmi_project_active (project_id, is_active),
  KEY idx_ptmi_provider (provider_type),
  KEY idx_ptmi_created_at (created_at),
  UNIQUE KEY idx_ptmi_unique_active_name (project_id, name, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
