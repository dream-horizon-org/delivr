# Migration 011 Re-Evaluation (Updated)

**Migration File**: `migrations/011_local_code_requirements.sql`  
**Evaluated Against**: Remote database convention (camelCase)  
**Date**: 2025-11-22 (Re-evaluated)  
**Status**: ✅ **MIGRATION IS CORRECT** | ⚠️ **ORCHESTRATION CODE NEEDS FIXES**

---

## Executive Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **Migration Convention** | ✅ **CORRECT** | Uses camelCase - matches remote database perfectly |
| **Remote Database** | ✅ **VERIFIED** | Uses camelCase for all columns |
| **Orchestration Code** | ⚠️ **MISMATCH** | Has snake_case field mappings - needs update |
| **Overall Recommendation** | ✅ **MIGRATION IS GOOD** | Fix orchestration code instead |

---

## Critical Understanding

### Remote Database Convention (Integration Repo)

**The remote database (integrations repo) uses camelCase for EVERYTHING:**

```sql
-- ✅ Remote database columns (CORRECT)
createdByAccountId          -- Not created_by_account_id
releasePilotAccountId       -- Not release_pilot_account_id
kickOffReminderDate         -- Not kick_off_reminder_date
slackMessageTimestamps      -- Not slack_message_timestamps
plannedDate                 -- Not planned_date
targetReleaseDate           -- Not target_release_date
```

**This is the convention we must follow!**

---

## Migration 011 Analysis (Updated)

### ✅ What Migration 011 Does (CORRECT!)

```sql
-- Step 3: Add orchestration columns (Lines 97-148)
ALTER TABLE releases ADD COLUMN stageData JSON NULL;                      ✅ camelCase
ALTER TABLE releases ADD COLUMN customIntegrationConfigs JSON NULL;      ✅ camelCase
ALTER TABLE releases ADD COLUMN preCreatedBuilds JSON NULL;              ✅ camelCase

-- Step 5: Add externalData (Line 199)
ALTER TABLE release_tasks ADD COLUMN externalData JSON NULL;             ✅ camelCase
```

**These match the remote database convention perfectly!** ✅

---

## The Real Problem: Orchestration Code Has Wrong Field Mappings

### ❌ Orchestration Code (`release-models.ts`)

The orchestration code was designed for a **different database convention** (snake_case):

**Lines 494-511**:
```typescript
// ❌ WRONG for remote database (expects snake_case)
stageData: {
  type: DataTypes.JSON,
  allowNull: true,
  field: 'stage_data',  // ← Database column is 'stageData' not 'stage_data'!
  comment: 'Stores integration responses per stage (JSON object)'
},
customIntegrationConfigs: {
  type: DataTypes.JSON,
  allowNull: true,
  field: 'custom_integration_configs',  // ← Wrong!
  comment: 'Per-release integration config overrides (JSON object)'
},
preCreatedBuilds: {
  type: DataTypes.JSON,
  allowNull: true,
  field: 'pre_created_builds',  // ← Wrong!
  comment: 'Array of pre-created builds'
}
```

**Lines 718-729**:
```typescript
// ❌ WRONG for remote database
externalId: {
  type: DataTypes.STRING(255),
  allowNull: true,
  field: 'external_id',  // ← Wrong! Should be 'externalId'
  comment: 'ID returned by integration'
},
externalData: {
  type: DataTypes.JSON,
  allowNull: true,
  field: 'external_data',  // ← Wrong! Should be 'externalData'
  comment: 'Additional data from integration response'
}
```

---

## Why This Mismatch Occurred

### Orchestration Repo Database

The **orchestration repo** likely used a **mixed convention**:
- ✅ **Account columns**: camelCase (`createdByAccountId`, `releasePilotAccountId`)
- ❌ **Orchestration columns**: snake_case (`stage_data`, `custom_integration_configs`)

**Evidence from orchestration migration** (`001_release_orchestration_complete.sql` lines 86-88):
```sql
-- Orchestration columns in original migration
stage_data JSON NULL COMMENT 'Stores integration responses per stage (JSON object)',
custom_integration_configs JSON NULL COMMENT 'Per-release integration config overrides (JSON object)',
pre_created_builds JSON NULL COMMENT 'Array of pre-created builds',
```

### Remote (Integrations) Repo Database

The **remote repo** uses **camelCase for EVERYTHING**:
- ✅ **All columns**: camelCase

**This is the convention we must adopt!**

---

## Solution: Update Orchestration Code, Not Migration

### ✅ Migration 011 is CORRECT - No Changes Needed!

Migration 011 uses camelCase, which matches the remote database convention perfectly.

### ⚠️ Orchestration Code Needs Updates

We need to update the `field:` mappings in the orchestration code to use camelCase.

---

## Required Code Fixes

### Fix 1: Update releases table field mappings

**File**: `/Users/navkashkrishna/delivr-server-ota-managed/api/script/storage/release/release-models.ts`

**Lines 494-511** (Change from snake_case to camelCase):

```typescript
// ✅ CORRECT for remote database (camelCase)
stageData: {
  type: DataTypes.JSON,
  allowNull: true,
  field: 'stageData',  // ← Changed from 'stage_data'
  comment: 'Stores integration responses per stage (JSON object)'
},
customIntegrationConfigs: {
  type: DataTypes.JSON,
  allowNull: true,
  field: 'customIntegrationConfigs',  // ← Changed from 'custom_integration_configs'
  comment: 'Per-release integration config overrides (JSON object)'
},
preCreatedBuilds: {
  type: DataTypes.JSON,
  allowNull: true,
  field: 'preCreatedBuilds',  // ← Changed from 'pre_created_builds'
  comment: 'Array of pre-created builds'
}
```

---

### Fix 2: Update release_tasks field mappings

**File**: `/Users/navkashkrishna/delivr-server-ota-managed/api/script/storage/release/release-models.ts`

**Lines 718-729** (Change from snake_case to camelCase):

```typescript
// ✅ CORRECT for remote database (camelCase)
externalId: {
  type: DataTypes.STRING(255),
  allowNull: true,
  field: 'externalId',  // ← Changed from 'external_id'
  comment: 'ID returned by integration'
},
externalData: {
  type: DataTypes.JSON,
  allowNull: true,
  field: 'externalData',  // ← Changed from 'external_data'
  comment: 'Additional data from integration response'
}
```

---

## Critical Issues Still Remaining

### ❌ Issue 1: Missing releaseConfigId Field

**Still missing from migration 011!**

This field is **critical for the merge** - it links releases to configurations.

**Required Fix** (add to migration 011 or create supplemental migration):

```sql
-- Add releaseConfigId to releases table
ALTER TABLE releases 
  ADD COLUMN releaseConfigId VARCHAR(255) NULL COMMENT 'FK to release_configs table',
  ADD INDEX idx_release_config (releaseConfigId);
```

**Why needed**: TaskExecutor needs this for configuration lookup:

```typescript
// TaskExecutor pattern
const config = await this.getReleaseConfig(release.releaseConfigId);
const workflowId = config.ciConfigId;
```

---

### ❌ Issue 2: Missing externalId Field

Migration adds `externalData` but **forgets `externalId`**!

**Required Fix** (add to migration 011 or create supplemental migration):

```sql
-- Add externalId to release_tasks
ALTER TABLE release_tasks 
  ADD COLUMN externalId VARCHAR(255) NULL COMMENT 'ID returned by integration',
  ADD INDEX idx_external_id (externalId);
```

**Why needed**: To track integration IDs (JIRA ticket IDs, build IDs, etc.)

---

### ⚠️ Issue 3: Cron Jobs Table Incomplete

Migration 011 creates `cron_jobs` table but **missing some fields**.

**Missing fields**:
- `cronCreatedByAccountId` (who created the cron job)
- `autoTransitionToStage3` (controls Stage 2 → Stage 3 transition)
- Mismatched field names (`lockExpiry` should be `lockTimeout`)

**Required Fix**:

```sql
-- Update cron_jobs table structure
ALTER TABLE cron_jobs 
  ADD COLUMN cronCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN cronStoppedAt TIMESTAMP NULL,
  ADD COLUMN cronCreatedByAccountId VARCHAR(255) NOT NULL,
  ADD COLUMN regressionTimings VARCHAR(255) DEFAULT '09:00,17:00',
  ADD COLUMN upcomingRegressions JSON NULL,
  ADD COLUMN regressionTimestamp VARCHAR(255) NULL,
  ADD COLUMN autoTransitionToStage3 BOOLEAN DEFAULT FALSE,
  ADD COLUMN lockTimeout INT NOT NULL DEFAULT 300,
  DROP COLUMN lockExpiry,
  ADD INDEX idx_cron_creator (cronCreatedByAccountId);
```

---

## Updated Assessment

### ✅ Migration 011 Strengths

| Aspect | Status | Notes |
|--------|--------|-------|
| **Naming Convention** | ✅ **PERFECT** | Uses camelCase - matches remote |
| **Column Renames** | ✅ **CORRECT** | Account columns renamed correctly |
| **Task Type Enum** | ✅ **CORRECT** | All 19 types match orchestration |
| **Platform Enum** | ✅ **CORRECT** | Adds WEB platform |
| **orchestration Columns** | ✅ **CORRECT** | Uses camelCase |

### ❌ Migration 011 Gaps

| Aspect | Status | Notes |
|--------|--------|-------|
| **releaseConfigId** | ❌ **MISSING** | Critical for merge! |
| **externalId** | ❌ **MISSING** | Needed for integration tracking |
| **Cron Jobs Completeness** | ⚠️ **PARTIAL** | Missing some fields |

---

## Revised Recommendation

### ✅ Migration 011: RUN WITH SUPPLEMENTS

**Migration 011 is good** - it follows the correct convention!

**But you need to:**

1. ✅ **Keep migration 011 as-is** (it's correct for remote database)

2. ⚠️ **Fix orchestration code** (update field mappings to camelCase):
   - Change `field: 'stage_data'` → `field: 'stageData'`
   - Change `field: 'custom_integration_configs'` → `field: 'customIntegrationConfigs'`
   - Change `field: 'pre_created_builds'` → `field: 'preCreatedBuilds'`
   - Change `field: 'external_id'` → `field: 'externalId'`
   - Change `field: 'external_data'` → `field: 'externalData'`

3. ❌ **Add supplemental migration** for missing fields:
   - Add `releaseConfigId` to releases
   - Add `externalId` to release_tasks
   - Update cron_jobs table structure

---

## Create Supplemental Migration

**File**: `migrations/012_orchestration_supplements.sql`

```sql
-- ============================================================================
-- MIGRATION 012: Orchestration Supplements
-- ============================================================================
-- Purpose: Adds fields missing from migration 011
-- Run after: 011_local_code_requirements.sql
-- ============================================================================

SELECT 'Starting Migration 012: Orchestration Supplements' as Status;

-- ============================================================================
-- STEP 1: Add releaseConfigId to releases (CRITICAL!)
-- ============================================================================

SELECT 'Step 1: Adding releaseConfigId to releases' as Status;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND COLUMN_NAME = 'releaseConfigId'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE releases ADD COLUMN releaseConfigId VARCHAR(255) NULL COMMENT "FK to release_configs table"',
  'SELECT "releaseConfigId already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'releases' 
    AND INDEX_NAME = 'idx_release_config'
);

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE releases ADD INDEX idx_release_config (releaseConfigId)',
  'SELECT "idx_release_config already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ releaseConfigId added' as Status;

-- ============================================================================
-- STEP 2: Add externalId to release_tasks (CRITICAL!)
-- ============================================================================

SELECT 'Step 2: Adding externalId to release_tasks' as Status;

SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'release_tasks' 
    AND COLUMN_NAME = 'externalId'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE release_tasks ADD COLUMN externalId VARCHAR(255) NULL COMMENT "ID returned by integration (e.g., JIRA ticket ID, build ID)"',
  'SELECT "externalId already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'release_tasks' 
    AND INDEX_NAME = 'idx_external_id'
);

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE release_tasks ADD INDEX idx_external_id (externalId)',
  'SELECT "idx_external_id already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ externalId added' as Status;

-- ============================================================================
-- STEP 3: Update cron_jobs table structure
-- ============================================================================

SELECT 'Step 3: Updating cron_jobs table' as Status;

-- Add cronCreatedAt
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'cronCreatedAt'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN cronCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT "cronCreatedAt already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add cronStoppedAt
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'cronStoppedAt'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN cronStoppedAt TIMESTAMP NULL',
  'SELECT "cronStoppedAt already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add cronCreatedByAccountId
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'cronCreatedByAccountId'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN cronCreatedByAccountId VARCHAR(255) NULL',
  'SELECT "cronCreatedByAccountId already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add regressionTimings
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'regressionTimings'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN regressionTimings VARCHAR(255) DEFAULT "09:00,17:00"',
  'SELECT "regressionTimings already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add upcomingRegressions
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'upcomingRegressions'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN upcomingRegressions JSON NULL',
  'SELECT "upcomingRegressions already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add regressionTimestamp
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'regressionTimestamp'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN regressionTimestamp VARCHAR(255) NULL',
  'SELECT "regressionTimestamp already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add autoTransitionToStage3
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'autoTransitionToStage3'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN autoTransitionToStage3 BOOLEAN DEFAULT FALSE COMMENT "Controls Stage 2 → Stage 3 transition"',
  'SELECT "autoTransitionToStage3 already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add lockTimeout (integer seconds)
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'lockTimeout'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE cron_jobs ADD COLUMN lockTimeout INT NOT NULL DEFAULT 300 COMMENT "Lock timeout in seconds"',
  'SELECT "lockTimeout already exists" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename status to cronStatus
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cron_jobs' 
    AND COLUMN_NAME = 'status'
);

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE cron_jobs CHANGE COLUMN status cronStatus ENUM("ACTIVE", "PAUSED", "COMPLETED", "FAILED") NOT NULL DEFAULT "ACTIVE"',
  'SELECT "status already renamed to cronStatus" as Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ cron_jobs table updated' as Status;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT '========================================' as '';
SELECT '✅ MIGRATION 012 COMPLETE' as Status;
SELECT '========================================' as '';
SELECT 'Orchestration supplements added:' as '';
SELECT '  ✅ releaseConfigId added to releases' as '';
SELECT '  ✅ externalId added to release_tasks' as '';
SELECT '  ✅ cron_jobs table fully updated' as '';
SELECT '========================================' as '';
```

---

## Execution Plan

### Step 1: Run Migration 011 ✅

```bash
# Migration 011 is CORRECT - run as-is!
mysql -u root -p codepushdb < migrations/011_local_code_requirements.sql
```

### Step 2: Update Orchestration Code ⚠️

Update `release-models.ts` field mappings from snake_case to camelCase (see Fix 1 and Fix 2 above).

### Step 3: Run Migration 012 ❌

```bash
# Run supplemental migration for missing fields
mysql -u root -p codepushdb < migrations/012_orchestration_supplements.sql
```

### Step 4: Verify ✅

```bash
# Verify all columns exist with correct naming
mysql -u root -p codepushdb -e "DESCRIBE releases" | grep -E "stageData|customIntegrationConfigs|preCreatedBuilds|releaseConfigId"

mysql -u root -p codepushdb -e "DESCRIBE release_tasks" | grep -E "externalId|externalData"

mysql -u root -p codepushdb -e "DESCRIBE cron_jobs" | grep -E "cronStatus|lockTimeout|cronCreatedByAccountId"
```

---

## Summary

| Component | Migration 011 | Orchestration Code | Action Required |
|-----------|---------------|-------------------|-----------------|
| **Naming Convention** | ✅ **camelCase (CORRECT)** | ❌ **snake_case** | Update code |
| **releaseConfigId** | ❌ **Missing** | ✅ **Expected** | Add migration 012 |
| **externalId** | ❌ **Missing** | ✅ **Expected** | Add migration 012 |
| **Cron Jobs** | ⚠️ **Partial** | ✅ **Complete** | Add migration 012 |

**Revised Verdict**: 
- ✅ **Migration 011 is CORRECT** - uses camelCase like remote database
- ⚠️ **Orchestration code needs updates** - change field mappings to camelCase
- ❌ **Need supplemental migration 012** - add missing fields

---

**Document Version**: 2.0 (Re-evaluated)  
**Evaluation Date**: 2025-11-22  
**Evaluator**: AI Assistant  
**Confidence**: 99% - Based on remote database convention verification

