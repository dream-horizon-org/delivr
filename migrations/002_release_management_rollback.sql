-- ============================================================================
-- Release Management Rollback Script
-- Drops all Release Management tables in reverse order to avoid foreign key conflicts
-- WARNING: This will delete ALL release management data!
-- ============================================================================

USE codepushdb;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop in reverse order of dependencies

-- Settings tables
DROP TABLE IF EXISTS global_settings;
DROP TABLE IF EXISTS release_settings;

-- Feature tables
DROP TABLE IF EXISTS whats_new;

-- Automation tables
DROP TABLE IF EXISTS cron_change_logs;
DROP TABLE IF EXISTS cron_jobs;

-- Audit tables
DROP TABLE IF EXISTS state_history_items;
DROP TABLE IF EXISTS state_history;

-- Core tables (deepest dependencies first)
DROP TABLE IF EXISTS cherry_picks;
DROP TABLE IF EXISTS tenant_integrations;
DROP TABLE IF EXISTS rollout_user_adoption;
DROP TABLE IF EXISTS rollout_stats;
DROP TABLE IF EXISTS rollouts;
DROP TABLE IF EXISTS regression_cycles;
DROP TABLE IF EXISTS release_tasks;
DROP TABLE IF EXISTS pre_release_tasks;
DROP TABLE IF EXISTS builds;
DROP TABLE IF EXISTS release_builds;
DROP TABLE IF EXISTS releases;

-- Reference tables (last, as they have no dependencies)
DROP TABLE IF EXISTS targets;
DROP TABLE IF EXISTS platforms;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Release Management tables dropped successfully!' as Status;

