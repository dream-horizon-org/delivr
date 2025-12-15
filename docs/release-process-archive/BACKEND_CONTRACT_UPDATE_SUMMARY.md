# Backend Contract Update Summary

**Date:** 2025-01-11  
**Status:** Types and Service Layer Updated

## What Was Updated

### ✅ Completed

1. **Types and Enums** (`app/types/release-process-enums.ts` & `app/types/release-process.types.ts`)
   - Updated `TaskStatus` enum to match backend: Added `AWAITING_CALLBACK` and `SKIPPED`, removed `PAUSED`
   - Added `TaskConclusion` type
   - Updated `StageStatus` enum: Changed to `PENDING | IN_PROGRESS | COMPLETED` (removed `NOT_STARTED`, `FAILED`, `PAUSED`)
   - Updated `RegressionCycleStatus` enum: Changed to `NOT_STARTED | IN_PROGRESS | DONE | ABANDONED`
   - Completely rewrote `Task` interface to match backend contract (renamed from `TaskInfo`)
   - Completely rewrote `BuildInfo` interface to match backend contract (expanded from 5 to 20+ fields)
   - Updated `RegressionCycle` interface to match backend (removed `slotIndex`, `slotDateTime`, added `isLatest`, `cycleTag`)
   - Updated `ApprovalStatus` interface to match backend structure
   - Added new types: `Phase`, `ReleaseDetails`, `CronJob`, `PlatformTargetMapping`, `RegressionSlot`
   - Added notification types: `ReleaseNotification`, `NotificationRequest`, `SendNotificationResponse`
   - Updated all response types to match backend contract

2. **Service Layer** (`app/.server/services/ReleaseProcess/index.ts`)
   - Updated stage APIs to use single endpoint `/tasks?stage={stage}` instead of separate endpoints
   - Updated all endpoint paths to match backend contract:
     - `/test-management-run-status` (was `/test-management/status`)
     - `/project-management-run-status` (was `/project-management/status`)
     - `/check-cherry-pick-status` (was `/cherry-picks/status`)
     - `/activity-logs` (was `/activity`)
   - Updated request/response types to match backend contract
   - Added new APIs: `getReleaseDetails()`, `getAllBuilds()`, `getNotifications()`, `sendNotification()`
   - Updated method signatures to match backend contract

3. **API Configuration** (`app/config/api.config.ts`)
   - Updated `RELEASE_PROCESS_API_PATTERNS` to match new endpoint paths
   - Added patterns for new APIs (notifications, activity-logs, etc.)

4. **Documentation**
   - Created `BACKEND_CONTRACT_ANALYSIS.md` with detailed comparison
   - Created this summary document

---

## What Still Needs to Be Done

### 🔴 Critical (Required for Phase 1 to work)

1. **BFF Routes** (`app/routes/api.v1.tenants.$tenantId.releases.$releaseId.stages.*.ts`)
   - Update kickoff route to call `/tasks?stage=KICKOFF` instead of `/stages/kickoff`
   - Update regression route to call `/tasks?stage=REGRESSION` instead of `/stages/regression`
   - Update post-regression route to call `/tasks?stage=POST_REGRESSION` instead of `/stages/post-regression`
   - Update response parsing to handle new structure

2. **Hooks** (`app/hooks/useReleaseProcess.ts`)
   - Update to use new `Task` interface instead of `TaskInfo`
   - Update to handle new response structures
   - Update field names: `status` → `taskStatus`, `releaseCycleId` → `regressionId`, etc.
   - Update to extract metadata from `externalData` instead of spread fields

3. **Mock Server** (`mock-server/middleware/release-process.middleware.js`)
   - Update to use new endpoint `/tasks?stage={stage}` instead of `/stages/{stage}`
   - Update response structures to match backend contract
   - Update mock data structure to match new `Task` interface
   - Update mock data structure to match new `BuildInfo` interface
   - Update mock data structure to match new `RegressionCycle` interface

4. **Mock Data** (`mock-server/data/db.json`)
   - Update `releaseTasks` to match new `Task` structure
   - Update `regressionCycles` to match new `RegressionCycle` structure
   - Update `buildUploadsStaging` to match new `BuildInfo` structure

5. **Test Page** (`app/routes/test.release-process.tsx`)
   - Update to use new field names (`taskStatus` instead of `status`)
   - Update to extract metadata from `externalData`
   - Update to handle new response structures

### 🟡 Important (For Phase 2+)

6. **Components** (when we build them)
   - Update all components to use `Task` instead of `TaskInfo`
   - Update all components to use `taskStatus` instead of `status`
   - Update all components to extract metadata from `externalData`
   - Update build display components to show expanded `BuildInfo` fields
   - Update regression cycle display to use new structure

7. **RELEASE_PROCESS_PLAN.md**
   - Update plan document to reflect backend contract changes
   - Update API endpoint documentation
   - Update type documentation

---

## Migration Notes

### Breaking Changes

1. **Task Interface**
   - `TaskInfo` → `Task` (renamed)
   - `status` → `taskStatus` (renamed)
   - `releaseCycleId` → `regressionId` (renamed)
   - Spread metadata fields removed (now in `externalData`)
   - Added: `taskConclusion`, `externalId`, `externalData`, `isReleaseKickOffTask`, `isRegressionSubTasks`, `identifier`, `accountId`

2. **BuildInfo Interface**
   - `buildId` → `id` (renamed)
   - `versionName` → `artifactVersionName` (renamed)
   - Removed: `versionCode`
   - Added: 15+ new fields (storeType, buildNumber, regressionId, ciRunId, buildUploadStatus, buildType, buildStage, queueLocation, workflowStatus, ciRunType, taskId, internalTrackLink, testflightNumber, tenantId, releaseId)

3. **RegressionCycle Interface**
   - `cycleId` → `id` (renamed)
   - `tag` → `cycleTag` (renamed)
   - Removed: `slotIndex`, `slotDateTime`, `commitId`
   - Added: `isLatest`
   - Status enum values changed

4. **API Endpoints**
   - `/stages/kickoff` → `/tasks?stage=KICKOFF`
   - `/stages/regression` → `/tasks?stage=REGRESSION`
   - `/stages/post-regression` → `/tasks?stage=POST_REGRESSION`
   - `/test-management/status` → `/test-management-run-status`
   - `/project-management/status` → `/project-management-run-status`
   - `/cherry-picks/status` → `/check-cherry-pick-status`
   - `/activity` → `/activity-logs`
   - `/communications/slack` → `/notifications` and `/notify`

### Backward Compatibility

- Legacy type aliases added for `TaskInfo`, `ApproveRegressionRequest`, etc. (marked as `@deprecated`)
- These will be removed in a future cleanup phase

---

## Testing Checklist

- [ ] Test BFF routes with new endpoint structure
- [ ] Test hooks with new response structures
- [ ] Test mock server with new endpoint paths
- [ ] Test mock server with new response structures
- [ ] Test test page with new field names
- [ ] Verify all API calls work end-to-end
- [ ] Verify data extraction from `externalData` works correctly

---

## Next Steps

1. **Immediate:** Update BFF routes, hooks, and mock server to match new contract
2. **Short-term:** Test Phase 1 infrastructure with updated types
3. **Medium-term:** Update plan document and proceed with Phase 2

---

## Questions for Backend Team

1. **Task Metadata:** How should we extract task-specific metadata from `externalData`? Is there a schema or should we check for specific keys?

2. **Phase vs currentActiveStage:** When should we use `releasePhase` vs `currentActiveStage` for UI decisions?

3. **BuildInfo Expansion:** Are all the new `BuildInfo` fields always populated, or are some optional based on build type?

4. **Notifications:** What are the exact values for `NotificationType` enum? The contract says "TBD based on notification_type DB enum".

