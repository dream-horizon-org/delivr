-- ============================================================================
-- Activity Logs Table Rollback
-- Removes the activity_logs table
-- ============================================================================

USE codepushdb;

-- Drop the activity_logs table
DROP TABLE IF EXISTS activity_logs;

-- ============================================================================
-- COMPLETE
-- ============================================================================

SELECT 'Activity logs table dropped successfully!' as Status;

