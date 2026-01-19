-- ============================================================================
-- Rollback: Release Config Activity Logs Table
-- ============================================================================

USE codepushdb;

-- Drop release config activity logs table
DROP TABLE IF EXISTS release_config_activity_logs;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

SELECT 'Release config activity logs table dropped successfully!' as Status;

