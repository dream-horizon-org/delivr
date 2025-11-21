-- Migration: Create test_management_configs table (MySQL 5.7)
-- Description: Reusable test configurations that can be referenced by release configs
-- Date: 2024-11-20

CREATE TABLE IF NOT EXISTS test_management_configs (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  integration_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  pass_threshold_percent INT NOT NULL DEFAULT 100,
  platform_configurations JSON NOT NULL,
  created_by_account_id VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key
  CONSTRAINT fk_tmc_integration FOREIGN KEY (integration_id) 
    REFERENCES tenant_test_management_integrations(id) ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT check_tmc_pass_threshold_range CHECK (pass_threshold_percent >= 0 AND pass_threshold_percent <= 100),
  CONSTRAINT check_tmc_tenant_id_not_empty CHECK (CHAR_LENGTH(tenant_id) > 0),
  CONSTRAINT check_tmc_name_not_empty CHECK (CHAR_LENGTH(name) > 0),
  
  -- Indexes
  KEY idx_tmc_tenant_id (tenant_id),
  KEY idx_tmc_integration_id (integration_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
