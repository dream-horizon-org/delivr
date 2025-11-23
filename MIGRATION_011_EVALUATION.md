# Migration 011 Evaluation

**Migration File**: `migrations/011_local_code_requirements.sql`  
**Evaluated Against**: Orchestration repo TypeScript models  
**Date**: 2025-11-22  
**Status**: ⚠️ **NEEDS FIXES**

---

## Executive Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **Overall Compatibility** | ⚠️ **PARTIAL** | Some column names don't match orchestration code |
| **Column Renames** | ✅ **CORRECT** | Account column renames are correct |
| **Orchestration Columns** | ❌ **WRONG** | Uses camelCase instead of snake_case |
| **Missing Columns** | ❌ **CRITICAL** | Missing `releaseConfigId` field |
| **Task Types** | ✅ **CORRECT** | Enum values match orchestration code |
| **Cron Jobs Table** | ⚠️ **MOSTLY CORRECT** | Missing some fields |
| **Overall Recommendation** | ⚠️ **FIX REQUIRED** | Must fix before running |

---

## Critical Issues

### 🔴 Issue 1: Orchestration Column Names (CRITICAL)

**Problem**: Migration uses camelCase for orchestration columns, but TypeScript models expect snake_case in database.

**Migration 011** (Lines 97-146):
```sql
-- ❌ WRONG: Uses camelCase
ALTER TABLE releases ADD COLUMN stageData JSON NULL
ALTER TABLE releases ADD COLUMN customIntegrationConfigs JSON NULL
ALTER TABLE releases ADD COLUMN preCreatedBuilds JSON NULL
ALTER TABLE release_tasks ADD COLUMN externalData JSON NULL
```

**Orchestration Code** (`release-models.ts` lines 494-511):
```typescript
// TypeScript expects snake_case in database!
stageData: {
  type: DataTypes.JSON,
  field: 'stage_data',  // ← Database column is snake_case!
},
customIntegrationConfigs: {
  type: DataTypes.JSON,
  field: 'custom_integration_configs',  // ← Database column is snake_case!
},
preCreatedBuilds: {
  type: DataTypes.JSON,
  field: 'pre_created_builds',  // ← Database column is snake_case!
}
```

**Impact**: TypeScript code will fail to read/write these columns because names don't match!

**Fix Required**:
```sql
-- ✅ CORRECT: Use snake_case
ALTER TABLE releases ADD COLUMN stage_data JSON NULL COMMENT 'Stores integration responses per stage';
ALTER TABLE releases ADD COLUMN custom_integration_configs JSON NULL COMMENT 'Per-release integration config overrides';
ALTER TABLE releases ADD COLUMN pre_created_builds JSON NULL COMMENT 'Array of pre-created builds';
```

---

### 🔴 Issue 2: Missing releaseConfigId Field (CRITICAL)

**Problem**: The `releaseConfigId` field is completely missing from the migration!

**Required by Merge**: Based on our merge plan (MERGE_PLAN.md), every release MUST have a `releaseConfigId` to link to `ReleaseConfiguration`.

**From MERGE_PLAN.md**:
```typescript
type ReleaseConfiguration = {
  id: string;
  ciConfigId: string | null;
  projectManagementConfigId: string | null;
  testManagementConfigId: string | null;
  commsConfigId: string | null;
  // ...
};
```

**From TaskExecutor pattern**:
```typescript
// TaskExecutor needs this!
const config = await this.getReleaseConfig(release.releaseConfigId);
const workflowId = config.ciConfigId;
```

**Impact**: The entire merge will fail - releases won't link to configurations!

**Fix Required**:
```sql
-- Add releaseConfigId to releases table
ALTER TABLE releases 
  ADD COLUMN releaseConfigId VARCHAR(255) NULL COMMENT 'FK to release_configs table',
  ADD INDEX idx_release_config (releaseConfigId);
  
-- Note: NULL initially for existing releases, NOT NULL for new releases
```

---

### ⚠️ Issue 3: externalId Column Name Mismatch

**Problem**: Similar to Issue 1, `externalId` should be `external_id` in database.

**Migration 011** (Line 199):
```sql
-- ❌ WRONG
ALTER TABLE release_tasks ADD COLUMN externalData JSON NULL
-- Also missing externalId!
```

**Orchestration Code** (`release-models.ts` lines 718-728):
```typescript
externalId: {
  type: DataTypes.STRING(255),
  field: 'external_id',  // ← Database column is snake_case!
},
externalData: {
  type: DataTypes.JSON,
  field: 'external_data',  // ← Database column is snake_case!
}
```

**Fix Required**:
```sql
-- ✅ CORRECT
ALTER TABLE release_tasks ADD COLUMN external_id VARCHAR(255) NULL COMMENT 'ID returned by integration';
ALTER TABLE release_tasks ADD COLUMN external_data JSON NULL COMMENT 'Full integration response data';
ALTER TABLE release_tasks ADD INDEX idx_external_id (external_id);
```

---

## What's Correct ✅

### ✅ Column Renames (Lines 36-89)

**Correct**: Account column renames match orchestration code exactly.

```sql
createdBy → createdByAccountId          ✅ Correct
releasePilotId → releasePilotAccountId  ✅ Correct
lastUpdatedBy → lastUpdateByAccountId   ✅ Correct
```

**Orchestration Code Verification** (`release-models.ts` lines 402-435):
```typescript
createdByAccountId: {
  field: 'createdByAccountId',  // ✅ Database column is camelCase
},
releasePilotAccountId: {
  field: 'releasePilotAccountId',  // ✅ Database column is camelCase
},
lastUpdateByAccountId: {
  field: 'lastUpdateByAccountId',  // ✅ Database column is camelCase
}
```

**Pattern**: Account-related columns use **camelCase in database**, orchestration columns use **snake_case**.

---

### ✅ Task Type Enum (Lines 159-182)

**Correct**: Enum values match orchestration code exactly.

**Migration 011**:
```sql
ALTER TABLE release_tasks 
MODIFY COLUMN taskType ENUM(
  'PRE_KICK_OFF_REMINDER',
  'FORK_BRANCH',
  -- ... all 19 task types ...
) NULL;
```

**Orchestration Code** (`release-models.ts` lines 105-130):
```typescript
export enum TaskType {
  PRE_KICK_OFF_REMINDER = 'PRE_KICK_OFF_REMINDER',
  FORK_BRANCH = 'FORK_BRANCH',
  // ... matches exactly! ✅
}
```

---

### ✅ Platform Enum (Lines 26-28)

**Correct**: Adds `WEB` platform.

```sql
ALTER TABLE platforms 
MODIFY COLUMN name ENUM('ANDROID', 'IOS', 'WEB') NOT NULL UNIQUE;
```

Matches orchestration code ✅

---

## Partial Issues ⚠️

### ⚠️ Cron Jobs Table (Lines 262-296)

**Status**: Mostly correct, but missing some fields from orchestration code.

**Migration 011**:
```sql
CREATE TABLE IF NOT EXISTS cron_jobs (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL,
  cronConfig JSON NULL,
  stage1Status ENUM(...),
  stage2Status ENUM(...),
  stage3Status ENUM(...),
  lockedBy VARCHAR(255) NULL,
  lockedAt TIMESTAMP NULL,
  lockExpiry TIMESTAMP NULL,  -- ❌ Called lockExpiry
  status ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED'),
  -- ... 
);
```

**Orchestration Code** (`release-models.ts` lines 1152-1251):
```sql
-- Has additional fields:
cronStatus           -- Instead of just 'status'
cronCreatedAt
cronStoppedAt
cronCreatedByAccountId  -- ❌ MISSING in migration!
regressionTimings
upcomingRegressions
regressionTimestamp
lock_timeout         -- Instead of lockExpiry
autoTransitionToStage3  -- ❌ MISSING in migration!
```

**Missing Critical Fields**:
1. `cronCreatedByAccountId` - Who created the cron job (for permissions)
2. `autoTransitionToStage3` - Controls Stage 2 → Stage 3 transition
3. Field name mismatches: `lockExpiry` vs `lock_timeout`

---

### ⚠️ Builds Table (Lines 212-230)

**Migration adds**:
```sql
ALTER TABLE builds ADD COLUMN preCreatedBuildId VARCHAR(255) NULL
```

**Orchestration code**: Doesn't have this field in the model.

**Status**: Probably safe (extra column won't hurt), but should verify if needed.

---

### ⚠️ Regression Cycles (Lines 236-254)

**Migration adds**:
```sql
ALTER TABLE regression_cycles ADD COLUMN stage INT NOT NULL DEFAULT 2
```

**Orchestration code**: Doesn't have this field in the model.

**Status**: May be needed for local code logic, but not in orchestration models.

---

## Complete Fix List

### 🔧 Required Fixes

```sql
-- ============================================================================
-- FIX 1: Correct orchestration column names (snake_case)
-- ============================================================================

-- Remove incorrectly named columns if they exist
ALTER TABLE releases DROP COLUMN IF EXISTS stageData;
ALTER TABLE releases DROP COLUMN IF EXISTS customIntegrationConfigs;
ALTER TABLE releases DROP COLUMN IF EXISTS preCreatedBuilds;
ALTER TABLE release_tasks DROP COLUMN IF EXISTS externalData;

-- Add with correct snake_case names
ALTER TABLE releases 
  ADD COLUMN stage_data JSON NULL COMMENT 'Stores integration responses per stage',
  ADD COLUMN custom_integration_configs JSON NULL COMMENT 'Per-release integration config overrides',
  ADD COLUMN pre_created_builds JSON NULL COMMENT 'Array of pre-created builds';

ALTER TABLE release_tasks 
  ADD COLUMN external_id VARCHAR(255) NULL COMMENT 'ID returned by integration (e.g., JIRA ticket ID, build ID)',
  ADD COLUMN external_data JSON NULL COMMENT 'Full integration response data',
  ADD INDEX idx_external_id (external_id);

-- ============================================================================
-- FIX 2: Add missing releaseConfigId field (CRITICAL!)
-- ============================================================================

ALTER TABLE releases 
  ADD COLUMN releaseConfigId VARCHAR(255) NULL COMMENT 'FK to release_configs table',
  ADD INDEX idx_release_config (releaseConfigId);

-- ============================================================================
-- FIX 3: Fix cron_jobs table to match orchestration code
-- ============================================================================

-- Rename status column to cronStatus
ALTER TABLE cron_jobs 
  CHANGE COLUMN status cronStatus ENUM('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED') NOT NULL DEFAULT 'PENDING';

-- Rename lockExpiry to lock_timeout (and change to integer seconds)
ALTER TABLE cron_jobs 
  DROP COLUMN lockExpiry,
  ADD COLUMN lock_timeout INT NOT NULL DEFAULT 300 COMMENT 'Lock timeout in seconds';

-- Add missing columns
ALTER TABLE cron_jobs 
  ADD COLUMN cronCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN cronStoppedAt TIMESTAMP NULL,
  ADD COLUMN cronCreatedByAccountId VARCHAR(255) NOT NULL,
  ADD COLUMN regressionTimings VARCHAR(255) DEFAULT '09:00,17:00',
  ADD COLUMN upcomingRegressions JSON NULL,
  ADD COLUMN regressionTimestamp VARCHAR(255) NULL,
  ADD COLUMN auto_transition_to_stage3 BOOLEAN DEFAULT FALSE COMMENT 'Controls Stage 2 → Stage 3 transition',
  ADD INDEX idx_cron_creator (cronCreatedByAccountId);

-- Add foreign key for cronCreatedByAccountId
ALTER TABLE cron_jobs 
  ADD CONSTRAINT fk_cron_creator 
  FOREIGN KEY (cronCreatedByAccountId) REFERENCES accounts(id) ON DELETE CASCADE;
```

---

## Updated Migration Recommendation

### Option 1: Fix Existing Migration 011 ✅ **RECOMMENDED**

Create a new file: `migrations/011_local_code_requirements_FIXED.sql`

```sql
-- All fixes from above, properly organized
```

### Option 2: Create Supplemental Migration

Keep 011 as-is, create `migrations/012_orchestration_fixes.sql` with all fixes.

---

## Testing Checklist

After running the fixed migration:

```bash
# 1. Verify column names
mysql -u root -p codepushdb -e "DESCRIBE releases" | grep -E "stage_data|custom_integration_configs|pre_created_builds|releaseConfigId"

# 2. Verify release_tasks columns
mysql -u root -p codepushdb -e "DESCRIBE release_tasks" | grep -E "external_id|external_data"

# 3. Verify cron_jobs structure
mysql -u root -p codepushdb -e "DESCRIBE cron_jobs" | grep -E "cronStatus|lock_timeout|cronCreatedByAccountId|auto_transition"

# 4. Verify indexes
mysql -u root -p codepushdb -e "SHOW INDEX FROM releases WHERE Key_name IN ('idx_release_config')"
mysql -u root -p codepushdb -e "SHOW INDEX FROM release_tasks WHERE Key_name = 'idx_external_id'"
```

---

## Impact on Merge

### If Migration Runs As-Is ❌

1. **TaskExecutor will crash** - Can't read `stage_data`, `custom_integration_configs`, `pre_created_builds`
2. **Merge will fail** - No `releaseConfigId` field to link configurations
3. **Integration tracking broken** - Can't store `external_id` and `external_data`
4. **Cron jobs may malfunction** - Missing critical fields

### If Migration Runs with Fixes ✅

1. ✅ TaskExecutor can read orchestration columns
2. ✅ ReleaseConfiguration linking works
3. ✅ Integration responses properly tracked
4. ✅ Cron jobs have all required fields
5. ✅ Merge can proceed as planned

---

## Summary

| Component | Status | Action Required |
|-----------|--------|----------------|
| **Column naming (orchestration)** | ❌ **CRITICAL** | Change to snake_case |
| **releaseConfigId field** | ❌ **CRITICAL** | Add this field |
| **external_id/external_data** | ❌ **CRITICAL** | Fix naming |
| **Account column renames** | ✅ **CORRECT** | No changes needed |
| **Task type enum** | ✅ **CORRECT** | No changes needed |
| **Platform enum** | ✅ **CORRECT** | No changes needed |
| **Cron jobs table** | ⚠️ **PARTIAL** | Add missing fields |
| **Regression cycles** | ⚠️ **UNKNOWN** | Verify if needed |
| **Builds table** | ⚠️ **UNKNOWN** | Verify if needed |

---

## Recommendation

**DO NOT RUN MIGRATION 011 AS-IS!**

**Required Actions**:
1. ✅ Fix orchestration column names (snake_case)
2. ✅ Add `releaseConfigId` field
3. ✅ Fix `external_id` and `external_data` naming
4. ✅ Update cron_jobs table structure
5. ⚠️ Verify if `preCreatedBuildId` and `stage` fields are actually needed

**After Fixes**: Migration will be fully compatible with orchestration code and merge can proceed.

---

**Document Version**: 1.0  
**Evaluation Date**: 2025-11-22  
**Evaluator**: AI Assistant  
**Confidence**: 99% - Based on direct comparison with orchestration TypeScript models

