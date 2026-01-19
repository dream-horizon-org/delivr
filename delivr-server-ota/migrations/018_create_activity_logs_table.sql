-- ============================================================================
-- Activity Logs Table Migration
-- Tracks all changes to releases (edits, slot additions, deletions, cron config changes)
-- ============================================================================

USE codepushdb;

-- Create enum for activity log types
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  previousValue JSON NULL,
  newValue JSON NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedBy VARCHAR(255) NOT NULL,
  
  -- Foreign keys
  CONSTRAINT fk_activity_logs_release 
    FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_logs_user 
    FOREIGN KEY (updatedBy) REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_activity_logs_release_id (releaseId),
  INDEX idx_activity_logs_updated_at (updatedAt),
  INDEX idx_activity_logs_updated_by (updatedBy),
  INDEX idx_activity_logs_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- ============================================================================
-- COMPLETE
-- ============================================================================

SELECT 'Activity logs table created successfully!' as Status;

