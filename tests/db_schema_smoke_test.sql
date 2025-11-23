-- ============================================================================
-- DB Schema Smoke Test
-- ============================================================================
-- This script verifies that key orchestration columns exist and that inserts
-- involving releaseConfigId and externalId succeed.
--
-- Usage:
--   docker exec -i api-db-1 mysql -u root -proot codepushdb \
--     < tests/db_schema_smoke_test.sql
-- ============================================================================

USE codepushdb;

SELECT 'Schema verification: releases' AS step;
SHOW COLUMNS FROM releases LIKE 'stageData';
SHOW COLUMNS FROM releases LIKE 'customIntegrationConfigs';
SHOW COLUMNS FROM releases LIKE 'preCreatedBuilds';
SHOW COLUMNS FROM releases LIKE 'releaseConfigId';

SELECT 'Schema verification: release_tasks' AS step;
SHOW COLUMNS FROM release_tasks LIKE 'externalId';
SHOW COLUMNS FROM release_tasks LIKE 'externalData';
SHOW COLUMNS FROM release_tasks LIKE 'stage';

SELECT 'Schema verification: cron_jobs' AS step;
SHOW COLUMNS FROM cron_jobs LIKE 'cronStatus';
SHOW COLUMNS FROM cron_jobs LIKE 'cronCreatedByAccountId';
SHOW COLUMNS FROM cron_jobs LIKE 'autoTransitionToStage3';
SHOW COLUMNS FROM cron_jobs LIKE 'lockTimeout';

SELECT 'Smoke test: release + task inserts (transaction will roll back)' AS step;

START TRANSACTION;

SET @releaseId := 'release_smoke_test';
SET @taskId := 'release_task_smoke_test';

INSERT INTO releases (
  id,
  tenantId,
  releaseKey,
  plannedDate,
  targetReleaseDate,
  version,
  baseVersion,
  releasePilotAccountId,
  lastUpdateByAccountId,
  releaseConfigId,
  stageData,
  customIntegrationConfigs,
  preCreatedBuilds,
  createdAt,
  updatedAt
) VALUES (
  @releaseId,
  'tenant-smoke-0001',
  'release-smoke-key',
  NOW(),
  NOW() + INTERVAL 7 DAY,
  '1.0.0',
  '0.9.0',
  'account-smoke-pilot',
  'account-smoke-updater',
  'config-smoke-123',
  JSON_OBJECT('stage1', 'ok'),
  JSON_OBJECT('cicdWorkflowId', 'workflow-smoke-1'),
  JSON_ARRAY(JSON_OBJECT('platform', 'IOS', 'buildNumber', '100')),
  NOW(),
  NOW()
);

INSERT INTO release_tasks (
  id,
  releaseId,
  taskType,
  stage,
  externalId,
  externalData,
  createdAt,
  updatedAt
) VALUES (
  @taskId,
  @releaseId,
  'FORK_BRANCH',
  'KICKOFF',
  'EXT-12345',
  JSON_OBJECT('provider', 'GITHUB', 'status', 'success'),
  NOW(),
  NOW()
);

SELECT 'Inserted release row' AS step;
SELECT id, releaseConfigId, stageData FROM releases WHERE id = @releaseId;

SELECT 'Inserted release_task row' AS step;
SELECT id, externalId, externalData FROM release_tasks WHERE id = @taskId;

ROLLBACK;

SELECT 'Smoke test complete (transaction rolled back)' AS step;

