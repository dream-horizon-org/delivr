-- Migration 018: Release Orchestration Final Schema
-- Purpose: Create/update all tables required for release orchestration
-- Date: 2024
-- 
-- This migration is idempotent - can be run multiple times safely
-- Tables: releases, cron_jobs, release_tasks, regression_cycles, state_history,
--         release_platforms_targets_mapping, release_configurations, builds,
--         release_uploads
--
-- Dependencies: accounts, tenants (must exist)

-- ============================================================================
-- 1. RELEASE CONFIGURATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS release_configurations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  releaseType ENUM('MINOR', 'HOTFIX', 'MAJOR') NOT NULL,
  platformTargets JSON COMMENT 'Array of platform-target pairs: [{"platform": "ANDROID", "target": "PLAY_STORE"}, ...]',
  baseBranch VARCHAR(255) COMMENT 'Base branch for releases',
  ciConfigId VARCHAR(255) COMMENT 'Reference to CI integration config',
  testManagementConfigId VARCHAR(255) COMMENT 'Reference to Test Management integration config',
  projectManagementConfigId VARCHAR(255) COMMENT 'Reference to Project Management integration config',
  commsConfigId VARCHAR(255) COMMENT 'Reference to Communications integration config',
  scheduling JSON,
  hasManualBuildUpload BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether manual build upload is enabled',
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  isDefault BOOLEAN NOT NULL DEFAULT FALSE,
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_release_configs_tenant (tenantId),
  INDEX idx_release_configs_active (tenantId, isActive),
  CONSTRAINT fk_release_configs_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_release_configs_creator FOREIGN KEY (createdByAccountId) REFERENCES accounts(id)
);

-- ============================================================================
-- 2. RELEASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS releases (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL UNIQUE COMMENT 'User-facing release identifier (e.g., REL-001)',
  releaseConfigId VARCHAR(255) COMMENT 'FK to release_configurations table',
  tenantId CHAR(36) NOT NULL,
  status ENUM('PENDING', 'IN_PROGRESS', 'PAUSED', 'SUBMITTED', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'PENDING' COMMENT 'Release lifecycle status',
  type ENUM('MINOR', 'HOTFIX', 'MAJOR') NOT NULL,
  branch VARCHAR(255) COMMENT 'Release branch name (e.g., release/v1.0.0)',
  baseBranch VARCHAR(255) COMMENT 'Base branch forked from (e.g., master)',
  baseReleaseId VARCHAR(255) COMMENT 'Parent release ID (for hotfixes)',
  releaseTag VARCHAR(255) COMMENT 'Final release tag (e.g., v1.0.0_IOS_ANDROID)',
  kickOffReminderDate DATETIME COMMENT 'When to send kickoff reminder',
  kickOffDate DATETIME COMMENT 'When to start kickoff stage',
  targetReleaseDate DATETIME COMMENT 'Target/planned release date',
  delayReason VARCHAR(500) COMMENT 'Reason for extending targetReleaseDate',
  releaseDate DATETIME COMMENT 'Actual release date when completed',
  hasManualBuildUpload BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether manual build upload is enabled',
  createdByAccountId VARCHAR(255) NOT NULL COMMENT 'Account ID who created release',
  releasePilotAccountId VARCHAR(255) COMMENT 'Account ID of release pilot',
  lastUpdatedByAccountId VARCHAR(255) NOT NULL COMMENT 'Account ID who last updated release',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_releases_tenant (tenantId),
  INDEX idx_releases_tenant_status (tenantId, status),
  INDEX idx_releases_config (releaseConfigId),
  INDEX idx_releases_pilot (releasePilotAccountId),
  CONSTRAINT fk_releases_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_releases_config FOREIGN KEY (releaseConfigId) REFERENCES release_configurations(id) ON DELETE SET NULL,
  CONSTRAINT fk_releases_creator FOREIGN KEY (createdByAccountId) REFERENCES accounts(id),
  CONSTRAINT fk_releases_pilot FOREIGN KEY (releasePilotAccountId) REFERENCES accounts(id),
  CONSTRAINT fk_releases_updater FOREIGN KEY (lastUpdatedByAccountId) REFERENCES accounts(id)
);

-- ============================================================================
-- 3. CRON JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cron_jobs (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL UNIQUE,
  stage1Status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
  stage2Status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
  stage3Status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
  stage4Status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'PENDING' COMMENT 'Stage 4 (Submission) status tracking',
  cronStatus ENUM('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
  pauseType ENUM('NONE', 'AWAITING_STAGE_TRIGGER', 'USER_REQUESTED', 'TASK_FAILURE') NOT NULL DEFAULT 'NONE' COMMENT 'Reason for pause (NONE = not paused)',
  cronConfig JSON NOT NULL COMMENT 'Cron configuration object',
  upcomingRegressions JSON COMMENT 'Array of upcoming regression schedules',
  stageData JSON COMMENT 'JSON object for stage-specific data',
  cronCreatedAt DATETIME NOT NULL,
  cronStoppedAt DATETIME,
  cronCreatedByAccountId VARCHAR(255) NOT NULL,
  lockedBy VARCHAR(255) COMMENT 'Instance ID holding the lock (for horizontal scaling)',
  lockedAt DATETIME COMMENT 'When lock was acquired',
  lockTimeout INT NOT NULL DEFAULT 300 COMMENT 'Lock timeout in seconds (default 5 minutes)',
  autoTransitionToStage2 BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Controls automatic Stage 1 → Stage 2 transition',
  autoTransitionToStage3 BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Controls automatic Stage 2 → Stage 3 transition',
  
  INDEX idx_cron_jobs_release (releaseId),
  INDEX idx_cron_jobs_creator (cronCreatedByAccountId),
  INDEX idx_cron_jobs_lock (lockedBy, lockedAt),
  CONSTRAINT fk_cron_jobs_release FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  CONSTRAINT fk_cron_jobs_creator FOREIGN KEY (cronCreatedByAccountId) REFERENCES accounts(id)
);

-- ============================================================================
-- 4. REGRESSION CYCLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS regression_cycles (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL,
  isLatest BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether this is the current active regression cycle',
  status ENUM('NOT_STARTED', 'IN_PROGRESS', 'DONE', 'ABANDONED') NOT NULL DEFAULT 'NOT_STARTED' COMMENT 'Regression cycle status (ABANDONED for user-cancelled cycles)',
  cycleTag VARCHAR(255) COMMENT 'RC tag (e.g., RC1, RC2)',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_regression_cycles_release (releaseId),
  INDEX idx_regression_cycles_release_latest (releaseId, isLatest),
  CONSTRAINT fk_regression_cycles_release FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE
);

-- ============================================================================
-- 5. RELEASE TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS release_tasks (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL,
  taskId VARCHAR(255) UNIQUE COMMENT 'Unique task identifier',
  taskType VARCHAR(255) NOT NULL COMMENT 'Type of task (e.g., CREATE_JIRA_EPIC, TRIGGER_BUILD)',
  taskStatus ENUM('PENDING', 'IN_PROGRESS', 'AWAITING_CALLBACK', 'AWAITING_MANUAL_BUILD', 'COMPLETED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING' COMMENT 'Task execution status (AWAITING_CALLBACK for CI/CD, AWAITING_MANUAL_BUILD for manual uploads)',
  taskConclusion ENUM('success', 'failure', 'cancelled', 'skipped'),
  stage ENUM('KICKOFF', 'REGRESSION', 'PRE_RELEASE') NOT NULL COMMENT 'Which stage this task belongs to',
  branch VARCHAR(255),
  isReleaseKickOffTask BOOLEAN NOT NULL DEFAULT FALSE,
  isRegressionSubTasks BOOLEAN NOT NULL DEFAULT FALSE,
  identifier VARCHAR(255) COMMENT 'Task identifier prefix',
  accountId VARCHAR(255) COMMENT 'Account ID associated with task',
  regressionId VARCHAR(255) COMMENT 'FK to regression_cycles table',
  externalId VARCHAR(255) COMMENT 'ID returned by integration (e.g., JIRA ticket ID)',
  externalData JSON COMMENT 'Additional data from integration response',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_release_tasks_release (releaseId),
  INDEX idx_release_tasks_stage (releaseId, stage),
  INDEX idx_release_tasks_status (releaseId, taskStatus),
  INDEX idx_release_tasks_regression (regressionId),
  INDEX idx_release_tasks_external (externalId),
  CONSTRAINT fk_release_tasks_release FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  CONSTRAINT fk_release_tasks_account FOREIGN KEY (accountId) REFERENCES accounts(id),
  CONSTRAINT fk_release_tasks_regression FOREIGN KEY (regressionId) REFERENCES regression_cycles(id) ON DELETE SET NULL
);

-- ============================================================================
-- 6. STATE HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS state_history (
  id VARCHAR(255) PRIMARY KEY,
  action ENUM('CREATE', 'UPDATE', 'REMOVE', 'ADD') NOT NULL DEFAULT 'CREATE',
  accountId VARCHAR(255) NOT NULL,
  releaseId VARCHAR(255),
  codepushId VARCHAR(255),
  settingsId VARCHAR(255),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_state_history_release (releaseId),
  INDEX idx_state_history_account (accountId),
  CONSTRAINT fk_state_history_account FOREIGN KEY (accountId) REFERENCES accounts(id)
);

-- ============================================================================
-- 7. RELEASE PLATFORMS TARGETS MAPPING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS release_platforms_targets_mapping (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL,
  platform ENUM('ANDROID', 'IOS', 'WEB') NOT NULL,
  target ENUM('WEB', 'PLAY_STORE', 'APP_STORE') NOT NULL,
  version VARCHAR(50) NOT NULL COMMENT 'Version for this platform-target combination (e.g., v6.5.0)',
  projectManagementRunId VARCHAR(255) COMMENT 'Project management run ID (e.g., Jira epic ID)',
  testManagementRunId VARCHAR(255) COMMENT 'Test management run ID (e.g., test suite run ID)',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_platform_target_unique (releaseId, platform, target),
  INDEX idx_platform_target_pm (projectManagementRunId),
  INDEX idx_platform_target_tm (testManagementRunId),
  CONSTRAINT fk_platform_target_release FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE
);

-- ============================================================================
-- 8. BUILDS TABLE (Enhanced schema for CI/CD tracking and platform-specific retry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS builds (
  id VARCHAR(255) PRIMARY KEY,
  tenantId VARCHAR(255) NOT NULL COMMENT 'FK to tenants table',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  buildNumber VARCHAR(255) NULL COMMENT 'Build number from CI/CD',
  artifactVersionName VARCHAR(255) NULL COMMENT 'Version name of the artifact',
  artifactPath VARCHAR(255) NULL COMMENT 'Path or URL to build artifacts',
  releaseId VARCHAR(255) NOT NULL COMMENT 'FK to releases table',
  platform ENUM('ANDROID', 'IOS', 'WEB') NOT NULL COMMENT 'Platform type',
  storeType ENUM('APP_STORE', 'PLAY_STORE', 'TESTFLIGHT', 'MICROSOFT_STORE', 'FIREBASE', 'WEB') NULL COMMENT 'Store provider type',
  regressionId VARCHAR(255) NULL COMMENT 'FK to regression_cycles table',
  ciRunId VARCHAR(255) NULL COMMENT 'CI/CD run/job ID from the provider',
  buildUploadStatus ENUM('PENDING', 'UPLOADED', 'FAILED') NOT NULL DEFAULT 'PENDING' COMMENT 'Build upload status',
  buildType ENUM('MANUAL', 'CI_CD') NOT NULL COMMENT 'Build type - manual upload or CI/CD triggered',
  buildStage ENUM('KICK_OFF', 'REGRESSION', 'PRE_RELEASE') NOT NULL COMMENT 'Build stage in release lifecycle',
  queueLocation VARCHAR(255) NULL COMMENT 'Queue location for CI/CD job',
  workflowStatus ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NULL COMMENT 'CI/CD workflow status - used for AWAITING_CALLBACK pattern',
  ciRunType ENUM('JENKINS', 'GITHUB_ACTIONS', 'CIRCLE_CI', 'GITLAB_CI') NULL COMMENT 'CI/CD provider type',
  taskId VARCHAR(255) NULL COMMENT 'FK to release_tasks table - links build to specific task for retry',
  internalTrackLink VARCHAR(255) NULL COMMENT 'Play Store Internal Track Link',
  testflightNumber VARCHAR(255) NULL COMMENT 'TestFlight build number',
  
  INDEX idx_builds_tenant (tenantId),
  INDEX idx_builds_release (releaseId),
  INDEX idx_builds_platform (platform),
  INDEX idx_builds_store_type (storeType),
  INDEX idx_builds_regression (regressionId),
  INDEX idx_builds_task (taskId),
  INDEX idx_builds_workflow_status (workflowStatus),
  INDEX idx_builds_stage (buildStage),
  INDEX idx_builds_regression_platform (regressionId, platform),
  INDEX idx_builds_task_platform (taskId, platform),
  UNIQUE INDEX idx_builds_task_queue_unique (taskId, queueLocation),
  CONSTRAINT fk_builds_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_builds_release FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  CONSTRAINT fk_builds_regression FOREIGN KEY (regressionId) REFERENCES regression_cycles(id) ON DELETE SET NULL,
  CONSTRAINT fk_builds_task FOREIGN KEY (taskId) REFERENCES release_tasks(id) ON DELETE SET NULL
);

-- ============================================================================
-- 9. RELEASE UPLOADS TABLE (Manual build uploads staging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS release_uploads (
  id VARCHAR(255) PRIMARY KEY,
  tenantId VARCHAR(255) NOT NULL COMMENT 'FK to tenants table',
  releaseId VARCHAR(255) NOT NULL COMMENT 'FK to releases table',
  platform ENUM('ANDROID', 'IOS', 'WEB') NOT NULL COMMENT 'Platform for this upload',
  stage ENUM('KICK_OFF', 'REGRESSION', 'PRE_RELEASE') NOT NULL COMMENT 'Stage this upload is for (matches buildStage)',
  artifactPath VARCHAR(1024) NOT NULL COMMENT 'S3 path to uploaded artifact',
  internalTrackLink VARCHAR(255) NULL COMMENT 'Play Store Internal Track Link',
  testflightNumber VARCHAR(255) NULL COMMENT 'TestFlight build number',
  isUsed BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether this upload has been consumed by a task',
  usedByTaskId VARCHAR(255) NULL COMMENT 'FK to release_tasks - which task consumed this upload',
  usedByCycleId VARCHAR(255) NULL COMMENT 'FK to regression_cycles - which cycle consumed this upload (for REGRESSION stage)',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_release_uploads_tenant (tenantId),
  INDEX idx_release_uploads_release (releaseId),
  INDEX idx_release_uploads_release_stage (releaseId, stage),
  INDEX idx_release_uploads_release_platform_stage (releaseId, platform, stage),
  INDEX idx_release_uploads_unused (releaseId, stage, isUsed),
  INDEX idx_release_uploads_task (usedByTaskId),
  INDEX idx_release_uploads_cycle (usedByCycleId),
  CONSTRAINT fk_release_uploads_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_release_uploads_release FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  CONSTRAINT fk_release_uploads_task FOREIGN KEY (usedByTaskId) REFERENCES release_tasks(id) ON DELETE SET NULL,
  CONSTRAINT fk_release_uploads_cycle FOREIGN KEY (usedByCycleId) REFERENCES regression_cycles(id) ON DELETE SET NULL
);

-- ============================================================================
-- SEED DATA: Platform and Target reference values (for documentation)
-- ============================================================================
-- Note: Platforms and Targets are now ENUMs, not separate tables
-- Valid values:
--   platform: 'ANDROID', 'IOS', 'WEB'
--   target: 'WEB', 'PLAY_STORE', 'APP_STORE'
--
-- Platform-Target mappings:
--   ANDROID → PLAY_STORE
--   IOS → APP_STORE
--   WEB → WEB

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

