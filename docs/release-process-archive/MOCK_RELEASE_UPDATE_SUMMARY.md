# Mock Release Data Update Summary

## Overview
Updated mock release data in `mock-server/data/db.json` to match the backend API contract structure.

## Key Differences Between Old and New Structure

### ❌ Old Mock Structure (Incorrect)
```json
{
  "id": "rel_dev",                    // Simple string
  "version": "2.7.0",                 // Not in contract
  "platforms": ["ANDROID", "IOS"],    // Array of strings
  "status": "PRE_RELEASE",           // Invalid status value
  "regressionComplete": false,        // Not in contract
  "stage1Status": "IN_PROGRESS",      // Not in contract
  "stage2Status": "NOT_STARTED",      // Not in contract
  "stage3Status": "NOT_STARTED"       // Not in contract
}
```

### ✅ New Mock Structure (Matches Backend Contract)
```json
{
  "id": "fb30dd6d-583e-422a-97e1-74e78fa6c23b",  // UUID
  "releaseId": "REL-E33E9265",                    // User-facing identifier
  "releaseConfigId": "NklcgYBbmx",                // FK to config
  "tenantId": "Vy3mYbVgmx",                      // Tenant UUID
  "type": "PLANNED",                             // 'PLANNED' | 'HOTFIX' | 'UNPLANNED'
  "status": "IN_PROGRESS",                       // Contract enum values
  "releasePhase": "KICKOFF",                     // Phase enum value
  "platformTargetMappings": [...],               // Array of objects
  "createdByAccountId": "4JCGF-VeXg",            // Account ID (not "createdBy")
  "releasePilotAccountId": "4JCGF-VeXg",         // Pilot account
  "lastUpdatedByAccountId": "4JCGF-VeXg",        // Account ID (not "lastUpdatedBy")
  "cronJob": {...},                              // CronJob object
  "tasks": []                                    // Array of Task objects
}
```

## Changes Made

### 1. **Primary Identification**
- ✅ Changed `id` from simple string to UUID format
- ✅ Added `releaseId` (user-facing identifier like "REL-E33E9265")
- ✅ Added `releaseConfigId` (string | null)
- ✅ Added `tenantId` (UUID string)

### 2. **Release Metadata**
- ✅ Kept `type` as `'PLANNED' | 'HOTFIX' | 'UNPLANNED'` (matching actual backend, not contract's 'MAJOR' | 'MINOR' | 'HOTFIX')
- ✅ Updated `status` to use contract enum: `'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED'`
- ✅ Added `releasePhase` (Phase enum value)

### 3. **Platform Information**
- ❌ Removed: `platforms` (array of strings)
- ✅ Added: `platformTargetMappings` (array of PlatformTargetMapping objects)
  - Each mapping includes: `id`, `releaseId`, `platform`, `target`, `version`, `projectManagementRunId`, `testManagementRunId`, `createdAt`, `updatedAt`

### 4. **Branch Information**
- ✅ Added `baseBranch` (string | null)
- ✅ Added `baseReleaseId` (string | null, for hotfixes)

### 5. **Dates**
- ✅ Added `kickOffReminderDate` (string | null)
- ✅ Kept `kickOffDate`, `targetReleaseDate`, `releaseDate`

### 6. **Configuration**
- ✅ Added `hasManualBuildUpload` (boolean)
- ✅ Added `customIntegrationConfigs` (Record<string, unknown> | null)
- ✅ Added `preCreatedBuilds` (any[] | null)

### 7. **Ownership**
- ❌ Removed: `createdBy`, `lastUpdatedBy` (if they existed)
- ✅ Added: `createdByAccountId` (string)
- ✅ Added: `releasePilotAccountId` (string | null)
- ✅ Added: `lastUpdatedByAccountId` (string)

### 8. **Cron Job**
- ✅ Added `cronJob` object with:
  - `id`, `stage1Status`, `stage2Status`, `stage3Status`, `stage4Status`
  - `cronStatus` ('PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED')
  - `pauseType` ('NONE' | 'AWAITING_STAGE_TRIGGER' | 'USER_REQUESTED' | 'TASK_FAILURE')
  - `cronConfig`, `upcomingRegressions`, `cronCreatedAt`, `cronStoppedAt`, etc.

### 9. **Tasks**
- ✅ Added `tasks` array (can be empty or populated with Task objects)

### 10. **Removed Fields**
- ❌ `version` (not in contract - version comes from `platformTargetMappings[].version`)
- ❌ `regressionComplete` (not in contract)
- ❌ `stage1Status`, `stage2Status`, `stage3Status` (moved to `cronJob`)

## Updated Release IDs

| Old ID | New UUID | New releaseId |
|--------|----------|---------------|
| `rel_dev` | `fb30dd6d-583e-422a-97e1-74e78fa6c23b` | `REL-E33E9265` |
| `rel_pre_android` | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | `REL-HOTFIX-001` |
| `rel_pre_both` | `c3d4e5f6-a7b8-9012-cdef-456789012345` | `REL-PLANNED-002` |
| `rel_dist_rolling` | `e7f8a9b0-c1d2-4567-ef01-890123456789` | `REL-SUBMITTED-003` |
| `rel_ios_only` | `f9a0b1c2-d3e4-7890-1234-234567890123` | `REL-HOTFIX-002` |
| `rel_completed` | `b2c3d4e5-f6a7-8901-bcde-567890123456` | `REL-COMPLETED-001` |

## Status Mappings

| Old Status | New Status | New Phase |
|------------|------------|-----------|
| `IN_PROGRESS` | `IN_PROGRESS` | `KICKOFF` |
| `PRE_RELEASE` | `IN_PROGRESS` | `POST_REGRESSION` or `REGRESSION` |
| `READY_FOR_SUBMISSION` | `SUBMITTED` | `SUBMITTED_PENDING_APPROVAL` |
| `COMPLETED` | `COMPLETED` | `COMPLETED` |

## Next Steps

⚠️ **Important**: Other parts of `db.json` that reference release IDs (like `builds`, `pmApprovals`, `submissions`, etc.) may need to be updated to use the new UUID `id` values instead of the old simple string IDs.

## Backend Contract Reference

The structure now matches the backend contract from `CLIENT_API_CONTRACT.md`:
- API #1: Get Release Details (`ReleaseDetails` interface)
- Uses `BackendReleaseResponse` type from `app/.server/services/ReleaseManagement/index.ts`
- Matches actual backend response structure provided by user

