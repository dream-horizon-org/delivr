-- ============================================================================
-- Release Config Activity Logs Table Migration
-- Tracks all changes to release configs (base fields, CI, test mgmt, PM, comms, schedule)
-- ============================================================================

USE codepushdb;

-- Create release config activity logs table
CREATE TABLE IF NOT EXISTS release_config_activity_logs (
  id VARCHAR(255) PRIMARY KEY,
  releaseConfigId VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  previousValue JSON NULL,
  newValue JSON NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedBy VARCHAR(255) NOT NULL,
  
  -- Foreign keys
  CONSTRAINT fk_release_config_activity_logs_config 
    FOREIGN KEY (releaseConfigId) REFERENCES release_configs(id) ON DELETE CASCADE,
  CONSTRAINT fk_release_config_activity_logs_user 
    FOREIGN KEY (updatedBy) REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_release_config_activity_logs_config_id (releaseConfigId),
  INDEX idx_release_config_activity_logs_updated_at (updatedAt),
  INDEX idx_release_config_activity_logs_updated_by (updatedBy),
  INDEX idx_release_config_activity_logs_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- ============================================================================
-- COMPLETE
-- ============================================================================

SELECT 'Release config activity logs table created successfully!' as Status;

