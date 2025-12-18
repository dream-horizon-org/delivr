# Backend API Contract Analysis

**Date:** 2025-01-11  
**Contract Version:** 1.0.0  
**Status:** Draft

## Summary

This document compares the actual backend API contract with our Phase 1 implementation to identify differences and required updates.

---

## Critical Differences

### 1. API #2: Get Stage Tasks - **BREAKING CHANGE**

**Backend Contract:**
```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/tasks?stage={stage}
```
- Single endpoint with `stage` query parameter
- Returns different response structure based on stage value

**Our Implementation:**
```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/stages/kickoff
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/stages/regression
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/stages/post-regression
```
- Separate endpoints per stage

**Action Required:**
- Update service layer to use single endpoint with query param
- Update BFF routes to call backend with `stage` query param
- Update API routing patterns in `api.config.ts`

---

### 2. Task Interface - **MAJOR STRUCTURE CHANGE**

**Backend Contract:**
```typescript
interface Task {
  id: string;
  taskId: string;                          // Unique task identifier
  taskType: TaskType;
  stage: 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION';
  taskStatus: 'PENDING' | 'IN_PROGRESS' | 'AWAITING_CALLBACK' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  taskConclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  accountId: string | null;
  regressionId: string | null;             // FK to regression cycle (if regression task)
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: string | null;
  externalId: string | null;               // External system ID (e.g., Jira ticket ID)
  externalData: Record<string, unknown> | null;
  branch: string | null;
  createdAt: string;                       // ISO 8601
  updatedAt: string;                       // ISO 8601
}
```

**Our Implementation:**
```typescript
interface TaskInfo {
  taskId: string;
  taskType: TaskType;
  taskStage: TaskStage;
  status: TaskStatus;                      // Different name: taskStatus vs status
  // Spread metadata (task-type specific)
  branchUrl?: string;
  commitId?: string;
  ticketId?: string;
  // ... many optional fields
  releaseCycleId?: string;                 // Different name: regressionId vs releaseCycleId
  createdAt: string;
  updatedAt: string;
}
```

**Key Differences:**
- `taskStatus` vs `status`
- `taskConclusion` - **NEW FIELD** (not in our types)
- `regressionId` vs `releaseCycleId`
- `externalId` and `externalData` - **NEW FIELDS** (not in our types)
- `isReleaseKickOffTask` and `isRegressionSubTasks` - **NEW FIELDS**
- `identifier` - **NEW FIELD**
- `accountId` - **NEW FIELD**
- No spread metadata fields (branchUrl, commitId, etc.) - these likely go in `externalData`

**Action Required:**
- Update `TaskInfo` interface to match backend `Task` interface
- Map `externalData` to extract task-specific metadata
- Update all components using `TaskInfo`

---

### 3. TaskStatus Enum - **ENUM VALUES CHANGE**

**Backend Contract:**
```typescript
taskStatus: 'PENDING' | 'IN_PROGRESS' | 'AWAITING_CALLBACK' | 'COMPLETED' | 'FAILED' | 'SKIPPED'
```

**Our Implementation:**
```typescript
enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',                      // Not in backend
}
```

**Key Differences:**
- `AWAITING_CALLBACK` - **NEW VALUE** (not in our enum)
- `SKIPPED` - **NEW VALUE** (not in our enum)
- `PAUSED` - **REMOVED** (not in backend)

**Action Required:**
- Update `TaskStatus` enum to match backend values

---

### 4. RegressionCycle Interface - **STRUCTURE CHANGE**

**Backend Contract:**
```typescript
interface RegressionCycle {
  id: string;                           // Cycle UUID
  releaseId: string;
  isLatest: boolean;                    // NEW FIELD
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'ABANDONED';
  cycleTag: string | null;              // e.g., "RC1", "RC2"
  createdAt: string;                    // ISO 8601 (also serves as slot time)
  completedAt: string | null;           // ISO 8601 (updatedAt when status = DONE)
}
```

**Our Implementation:**
```typescript
interface RegressionCycle {
  cycleId: string;                     // Different name: id vs cycleId
  slotIndex: number;                   // NOT in backend
  slotDateTime: string;                // NOT in backend (use createdAt instead)
  status: RegressionCycleStatus;        // Different enum values
  tag?: string;                        // Different name: cycleTag vs tag
  commitId?: string;                   // NOT in backend
  createdAt?: string;                  // Optional in our types
  completedAt?: string;                // Optional in our types
}
```

**Key Differences:**
- `id` vs `cycleId`
- `isLatest` - **NEW FIELD** (not in our types)
- `cycleTag` vs `tag`
- Status enum values: `NOT_STARTED | IN_PROGRESS | DONE | ABANDONED` vs our `PENDING | ACTIVE | PAUSED | COMPLETED | FAILED | ABANDONED`
- No `slotIndex` or `slotDateTime` in backend (use `createdAt` for slot time)
- No `commitId` in backend

**Action Required:**
- Update `RegressionCycle` interface to match backend
- Update `RegressionCycleStatus` enum to match backend values
- Remove `slotIndex` and `slotDateTime` fields
- Use `createdAt` for slot time

---

### 5. RegressionCycleStatus Enum - **ENUM VALUES CHANGE**

**Backend Contract:**
```typescript
status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'ABANDONED'
```

**Our Implementation:**
```typescript
enum RegressionCycleStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
}
```

**Key Differences:**
- `NOT_STARTED` - **NEW VALUE** (not in our enum)
- `IN_PROGRESS` - **NEW VALUE** (not in our enum)
- `DONE` - **NEW VALUE** (not in our enum)
- `PENDING`, `ACTIVE`, `PAUSED`, `COMPLETED`, `FAILED` - **REMOVED** (not in backend)

**Action Required:**
- Update `RegressionCycleStatus` enum to match backend values

---

### 6. BuildInfo Interface - **MAJOR EXPANSION**

**Backend Contract:**
```typescript
interface BuildInfo {
  id: string;
  tenantId: string;
  releaseId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  storeType: 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE' | 'WEB' | null;
  buildNumber: string | null;
  artifactVersionName: string | null;
  artifactPath: string | null;
  regressionId: string | null;          // FK to regression cycle
  ciRunId: string | null;
  buildUploadStatus: 'PENDING' | 'UPLOADED' | 'FAILED';
  buildType: 'MANUAL' | 'CI_CD';
  buildStage: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE';
  queueLocation: string | null;
  workflowStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;
  ciRunType: 'JENKINS' | 'GITHUB_ACTIONS' | 'CIRCLE_CI' | 'GITLAB_CI' | null;
  taskId: string | null;                // Reference to release_tasks table
  internalTrackLink: string | null;     // Play Store Internal Track Link
  testflightNumber: string | null;      // TestFlight build number
  createdAt: string;                    // ISO 8601
  updatedAt: string;                    // ISO 8601
}
```

**Our Implementation:**
```typescript
interface BuildInfo {
  buildId: string;                      // Different name: id vs buildId
  platform: Platform;
  artifactPath: string;
  versionName?: string;                 // Different name: artifactVersionName vs versionName
  versionCode?: string;                 // NOT in backend
  createdAt: string;
}
```

**Key Differences:**
- **MASSIVE EXPANSION** - Backend has 20+ fields, we have 5
- `id` vs `buildId`
- `storeType` - **NEW FIELD**
- `buildNumber` - **NEW FIELD**
- `artifactVersionName` vs `versionName`
- `regressionId` - **NEW FIELD**
- `ciRunId` - **NEW FIELD**
- `buildUploadStatus` - **NEW FIELD**
- `buildType` - **NEW FIELD**
- `buildStage` - **NEW FIELD**
- `queueLocation` - **NEW FIELD**
- `workflowStatus` - **NEW FIELD**
- `ciRunType` - **NEW FIELD**
- `taskId` - **NEW FIELD**
- `internalTrackLink` - **NEW FIELD**
- `testflightNumber` - **NEW FIELD**
- `tenantId` and `releaseId` - **NEW FIELDS**
- `versionCode` - **REMOVED** (not in backend)

**Action Required:**
- Completely rewrite `BuildInfo` interface to match backend
- Update all components using `BuildInfo`

---

### 7. ApprovalStatus Interface - **STRUCTURE CHANGE**

**Backend Contract:**
```typescript
interface ApprovalStatus {
  canApprove: boolean;
  approvalRequirements: {
    testManagementPassed: boolean;
    cherryPickStatusOk: boolean;
    cyclesCompleted: boolean;
  };
}
```

**Our Implementation:**
```typescript
interface ApprovalStatus {
  canApprove: boolean;
  approvalRequirements: {
    allCyclesCompleted: boolean;        // Different name: cyclesCompleted vs allCyclesCompleted
    allTestsPassed: boolean;            // Different name: testManagementPassed vs allTestsPassed
    noBlockingIssues: boolean;          // NOT in backend
    manualApprovalRequired: boolean;     // NOT in backend
  };
  blockingIssues?: string[];            // NOT in backend
}
```

**Key Differences:**
- `testManagementPassed` vs `allTestsPassed`
- `cherryPickStatusOk` - **NEW FIELD** (not in our types)
- `cyclesCompleted` vs `allCyclesCompleted`
- `noBlockingIssues` and `manualApprovalRequired` - **REMOVED** (not in backend)
- `blockingIssues` - **REMOVED** (not in backend)

**Action Required:**
- Update `ApprovalStatus` interface to match backend
- Update `ApprovalRequirements` interface

---

### 8. API Endpoint Paths - **SEVERAL CHANGES**

| API | Backend Contract | Our Implementation | Status |
|-----|-----------------|---------------------|--------|
| Get Stage Tasks | `/tasks?stage={stage}` | `/stages/kickoff`, `/stages/regression`, `/stages/post-regression` | ❌ **BREAKING** |
| Test Management Status | `/test-management-run-status` | `/test-management/status` | ❌ **CHANGE** |
| Project Management Status | `/project-management-run-status` | `/project-management/status` | ❌ **CHANGE** |
| Cherry Pick Status | `/check-cherry-pick-status` | `/cherry-picks/status` | ❌ **CHANGE** |
| Activity Logs | `/activity-logs` | `/activity` | ❌ **CHANGE** |
| Notifications | `/notifications` | `/communications/slack` | ❌ **CHANGE** |
| Send Notification | `/notify` | `/communications/slack` | ❌ **CHANGE** |

**Action Required:**
- Update all API endpoint paths in service layer
- Update API routing patterns in `api.config.ts`
- Update BFF routes

---

### 9. TaskType Enum - **ADDITIONAL VALUES**

**Backend Contract:**
```typescript
type TaskType =
  // Stage 1: Kickoff
  | 'PRE_KICKOFF_REMINDER'
  | 'FORK_BRANCH'
  | 'CREATE_PROJECT_MANAGEMENT_TICKET'
  | 'CREATE_TEST_SUITE'
  | 'TRIGGER_PRE_REGRESSION_BUILDS'
  // Stage 2: Regression
  | 'RESET_TEST_SUITE'
  | 'CREATE_RC_TAG'
  | 'CREATE_RELEASE_NOTES'
  | 'TRIGGER_REGRESSION_BUILDS'
  | 'TRIGGER_AUTOMATION_RUNS'
  | 'AUTOMATION_RUNS'
  | 'SEND_REGRESSION_BUILD_MESSAGE'
  // Stage 3: Post-Regression
  | 'PRE_RELEASE_CHERRY_PICKS_REMINDER'
  | 'CREATE_RELEASE_TAG'
  | 'CREATE_FINAL_RELEASE_NOTES'
  | 'TRIGGER_TEST_FLIGHT_BUILD'
  | 'CREATE_AAB_BUILD'
  | 'SEND_POST_REGRESSION_MESSAGE'
  | 'CHECK_PROJECT_RELEASE_APPROVAL'
  // Stage 4: Submission
  | 'SUBMIT_TO_TARGET';
```

**Our Implementation:**
- Matches backend exactly ✅

**Action Required:**
- None (already correct)

---

### 10. StageStatus Enum - **ENUM VALUES CHANGE**

**Backend Contract:**
```typescript
stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
```

**Our Implementation:**
```typescript
enum StageStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
}
```

**Key Differences:**
- `PENDING` - **NEW VALUE** (not in our enum)
- `NOT_STARTED`, `FAILED`, `PAUSED` - **REMOVED** (not in backend)

**Action Required:**
- Update `StageStatus` enum to match backend values

---

### 11. New APIs Not in Our Implementation

**API #1: Get Release Details**
```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}
```
- Returns full release details with `releasePhase` (Phase enum)
- Includes `cronJob` and `tasks` optionally
- **Action Required:** Add to service layer

**API #20: Get Release Notifications**
```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/notifications
```
- **Action Required:** Add to service layer

**API #21: Send Release Notification**
```
POST /api/v1/tenants/{tenantId}/releases/{releaseId}/notify
```
- **Action Required:** Add to service layer

**API #14: Get All Builds**
```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/builds
```
- **Action Required:** Add to service layer

---

## Implementation Plan

### Phase 1: Update Types and Enums
1. Update `TaskInfo` → `Task` interface
2. Update `TaskStatus` enum
3. Update `RegressionCycle` interface
4. Update `RegressionCycleStatus` enum
5. Update `BuildInfo` interface
6. Update `ApprovalStatus` interface
7. Update `StageStatus` enum
8. Add `Phase` type (from API #1)

### Phase 2: Update Service Layer
1. Update `getKickoffStage` → use `/tasks?stage=KICKOFF`
2. Update `getRegressionStage` → use `/tasks?stage=REGRESSION`
3. Update `getPostRegressionStage` → use `/tasks?stage=POST_REGRESSION`
4. Update all status check endpoints
5. Add new APIs (Get Release Details, Notifications, etc.)

### Phase 3: Update BFF Routes
1. Update stage routes to use query param
2. Update endpoint paths
3. Update response parsing

### Phase 4: Update Mock Server
1. Update middleware to match new endpoints
2. Update response structures
3. Update mock data

### Phase 5: Update Components
1. Update all components using `TaskInfo` → `Task`
2. Update all components using `BuildInfo`
3. Update all components using `RegressionCycle`
4. Update all components using `ApprovalStatus`

---

## Migration Checklist

- [ ] Update types in `app/types/release-process.types.ts`
- [ ] Update enums in `app/types/release-process-enums.ts`
- [ ] Update service layer in `app/.server/services/ReleaseProcess/index.ts`
- [ ] Update BFF routes
- [ ] Update API routing patterns in `app/config/api.config.ts`
- [ ] Update mock server middleware
- [ ] Update mock data in `mock-server/data/db.json`
- [ ] Update hooks in `app/hooks/useReleaseProcess.ts`
- [ ] Update test page
- [ ] Test all endpoints with mock server
- [ ] Update documentation

---

## Notes

1. **Backward Compatibility:** Since we're in Phase 1 and using mock server, we can make breaking changes now without affecting production.

2. **Task Metadata:** The backend uses `externalData` for task-specific metadata. We'll need to extract this in components (e.g., `externalData.ticketId` for project management tasks).

3. **Phase Enum:** The backend has a detailed `Phase` enum that's more granular than `currentActiveStage`. We should use `releasePhase` for UI decisions.

4. **BuildInfo Expansion:** The expanded `BuildInfo` interface provides much more detail. We should update build display components to show this information.

5. **Single Endpoint Pattern:** The single `/tasks?stage={stage}` endpoint is cleaner and more RESTful. Our BFF routes can still provide stage-specific endpoints for UI clarity.

