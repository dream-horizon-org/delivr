-- ============================================================================
-- Migration: Builds Table
-- Purpose: Track individual builds (iOS, Android, Web) for releases
-- Supports both CI/CD triggered builds and manual uploads
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

  -- Indexes based on actual repository query patterns (verified from build.repository.ts)
  INDEX idx_builds_release (releaseId),      -- findByReleaseId, findByReleaseAndPlatform, etc.
  INDEX idx_builds_regression (regressionId), -- findByRegressionId, findByRegressionAndPlatform
  INDEX idx_builds_task (taskId),            -- findByTaskId, findPendingByTaskId, findFailedByTaskId
  INDEX idx_builds_ci_run_id (ciRunId),      -- findByCiRunId (callback lookup)
  UNIQUE INDEX idx_builds_task_queue_unique (taskId, queueLocation) -- findByTaskAndQueueLocation
);

-- Foreign keys
ALTER TABLE builds
  ADD CONSTRAINT fk_builds_tenant 
    FOREIGN KEY (tenantId) REFERENCES tenants(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE builds
  ADD CONSTRAINT fk_builds_release 
    FOREIGN KEY (releaseId) REFERENCES releases(id) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE builds
  ADD CONSTRAINT fk_builds_regression 
    FOREIGN KEY (regressionId) REFERENCES regression_cycles(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE builds
  ADD CONSTRAINT fk_builds_task 
    FOREIGN KEY (taskId) REFERENCES release_tasks(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;
