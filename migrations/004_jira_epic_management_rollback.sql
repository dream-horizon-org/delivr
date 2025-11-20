-- ============================================================================
-- Jira Epic Management Rollback Script
-- Reverses changes from 004_jira_epic_management.sql
-- ============================================================================

USE codepushdb;

-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS release_jira_epics;
DROP TABLE IF EXISTS jira_configurations;
DROP TABLE IF EXISTS jira_integrations;

-- Remove jiraProjectKey column from releases table
ALTER TABLE releases 
DROP COLUMN IF EXISTS jiraProjectKey;

SELECT 'Jira Epic Management rollback completed!' as Status;

