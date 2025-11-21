-- ============================================================================
-- Rollback Migration: Slack Configuration
-- Version: 005
-- Date: 2025-11-20
-- Description: Drops slack_configuration table
-- ============================================================================

DROP TABLE IF EXISTS slack_configuration;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  'slack_configuration' as table_name,
  CASE 
    WHEN COUNT(*) = 0 THEN 'DROPPED SUCCESSFULLY'
    ELSE 'TABLE STILL EXISTS'
  END as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'slack_configuration';

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
