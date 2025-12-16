# Client API Contract

**Version:** 1.0.0  
**Last Updated:** 2025-12-11  
**Status:** Draft

---

## Table of Contents

- [Shared Interfaces](#shared-interfaces)
- [API #1: Get Release Details](#api-1-get-release-details)
- [API #2: Get Stage Tasks](#api-2-get-stage-tasks)
- [API #8: Retry Task](#api-8-retry-task)
- [API #10: Approve Regression Stage](#api-10-approve-regression-stage)
- [API #11: Abandon Regression Cycle](#api-11-abandon-regression-cycle) *(Deprioritized)*
- [API #12: Trigger Pre-Release Completion](#api-12-trigger-pre-release-completion)
- [API #13: Submit Release](#api-13-submit-release) *(In Progress - @Mohit)*
- [API #14: Get All Builds](#api-14-get-all-builds) *(In Progress - @Devansh)*
- [API #15: Upload Build](#api-15-upload-build) *(In Progress - @Devansh)*
- [API #16: Delete Build](#api-16-delete-build) *(In Progress - @Devansh)*
- [API #17: Get Test Management Status](#api-17-get-test-management-status)
- [API #18: Get Project Management Status](#api-18-get-project-management-status)
- [API #19: Get Cherry Pick Status](#api-19-get-cherry-pick-status)
- [API #20: Get Release Notifications](#api-20-get-release-notifications)
- [API #21: Send Release Notification](#api-21-send-release-notification)
- [API #22: Update What's New](#api-22-update-whats-new) *(In Progress - @Mohit)*
- [API #23: Get Activity Logs](#api-23-get-activity-logs)
- [API #24: Get Release Submission Status](#api-24-get-release-submission-status) *(In Progress - @Mohit)*

---

## Shared Interfaces

These interfaces are used across multiple APIs.

```typescript
interface Task {
  id: string;
  taskId: string;                          // Unique task identifier
  taskType: TaskType;
  stage: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE';
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
  builds: BuildInfo[];                     // Builds linked to this task (builds.taskId = task.id)
  createdAt: string;                       // ISO 8601
  updatedAt: string;                       // ISO 8601
}

type TaskType =
  // Stage 1: Kickoff
  | 'PRE_KICK_OFF_REMINDER'
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
  // Stage 3: Pre-Release
  | 'PRE_RELEASE_CHERRY_PICKS_REMINDER'
  | 'CREATE_RELEASE_TAG'
  | 'CREATE_FINAL_RELEASE_NOTES'
  | 'TRIGGER_TEST_FLIGHT_BUILD'
  | 'CREATE_AAB_BUILD'
  | 'SEND_PRE_RELEASE_MESSAGE'
  | 'CHECK_PROJECT_RELEASE_APPROVAL'
  // Stage 4: Submission
  | 'SUBMIT_TO_TARGET';

interface PlatformTargetMapping {
  id: string;
  releaseId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  target: 'PLAY_STORE' | 'APP_STORE' | 'WEB';
  version: string;                         // e.g., "v6.5.0"
  projectManagementRunId: string | null;   // Jira ticket ID
  testManagementRunId: string | null;      // Test run ID
  createdAt: string;
  updatedAt: string;
}

interface CronJob {
  id: string;
  stage1Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage2Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage3Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage4Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  pauseType: 'NONE' | 'AWAITING_STAGE_TRIGGER' | 'USER_REQUESTED' | 'TASK_FAILURE';
  cronConfig: Record<string, unknown>;
  upcomingRegressions: RegressionSlot[] | null;
  cronCreatedAt: string;
  cronStoppedAt: string | null;
  cronCreatedByAccountId: string;
  autoTransitionToStage2: boolean;
  autoTransitionToStage3: boolean;
  stageData: Record<string, unknown> | null;
}

interface RegressionSlot {
  date: string;                            // ISO 8601
  config: Record<string, unknown>;
}
```

---

## API #1: Get Release Details

### Endpoint

```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Response

**Status Code:** `200 OK`

```typescript
interface GetReleaseDetailsResponse {
  success: true;
  release: ReleaseDetails;
}

interface ReleaseDetails {
  // Primary identification
  id: string;                              // Primary key (UUID)
  releaseId: string;                       // User-facing release identifier (e.g., "REL-001")
  releaseConfigId: string | null;          // FK to release configuration
  tenantId: string;                        // Tenant UUID
  
  // Release metadata
  type: 'MAJOR' | 'MINOR' | 'HOTFIX';
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED';
  currentActiveStage: 'PRE_KICKOFF' | 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE' | 'RELEASE_SUBMISSION' | 'RELEASE' | null;
  releasePhase: Phase;                     // Detailed phase (see Phase type below)
  
  // Branch information
  branch: string | null;                   // Release branch name (e.g., "release/v1.0.0")
  baseBranch: string | null;               // Base branch forked from (e.g., "master")
  baseReleaseId: string | null;            // Parent release ID (for hotfixes)
  
  // Dates (ISO 8601 format)
  kickOffReminderDate: string | null;
  kickOffDate: string | null;
  targetReleaseDate: string | null;
  releaseDate: string | null;              // Actual release date (populated when COMPLETED)
  
  // Platform targets
  platformTargetMappings: PlatformTargetMapping[];  // See Shared Interfaces
  
  // Configuration
  hasManualBuildUpload: boolean;
  
  // Ownership
  createdByAccountId: string;
  releasePilotAccountId: string | null;
  lastUpdatedByAccountId: string;
  
  // Timestamps
  createdAt: string;                       // ISO 8601
  updatedAt: string;                       // ISO 8601
  
  // Related data
  cronJob?: CronJob;                       // See Shared Interfaces
  tasks?: Task[];                          // See Shared Interfaces
}

type Phase =
  | 'NOT_STARTED'                    // Release created, not started
  | 'KICKOFF'                        // Stage 1 running
  | 'AWAITING_REGRESSION'            // Stage 1 complete, waiting for Stage 2 trigger
  | 'REGRESSION'                     // Stage 2 running (current cycle active)
  | 'REGRESSION_AWAITING_NEXT_CYCLE' // Between regression cycles
  | 'AWAITING_PRE_RELEASE'           // Stage 2 complete, waiting for Stage 3 trigger
  | 'PRE_RELEASE'                    // Stage 3 running
  | 'AWAITING_SUBMISSION'            // Stage 3 complete, waiting for Stage 4 trigger
  | 'SUBMISSION'                     // Stage 4 running, release IN_PROGRESS
  | 'SUBMITTED_PENDING_APPROVAL'     // Stage 4 running, release SUBMITTED
  | 'COMPLETED'                      // All stages complete
  | 'PAUSED_BY_USER'                 // User paused release
  | 'PAUSED_BY_FAILURE'              // Task failure paused release
  | 'ARCHIVED';                      // Release cancelled
```

---

## API #2: Get Stage Tasks

### Endpoint

```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/tasks?stage={stage}
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stage` | string | Yes | Stage filter: `KICKOFF`, `REGRESSION`, or `PRE_RELEASE` |

### Response

**Status Code:** `200 OK`

#### For KICKOFF and PRE_RELEASE stages:

```typescript
interface StageTasksResponse {
  success: true;
  stage: 'KICKOFF' | 'PRE_RELEASE';
  releaseId: string;                    // Release UUID (from path param)
  tasks: Task[];                        // See Shared Interfaces (each task has builds[])
  uploadedBuilds: BuildInfo[];          // Unused/unclaimed manual uploads for this stage
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}
```

**Note:** The `cycles` field is only present for the REGRESSION stage.

#### For REGRESSION stage (includes additional fields):

```typescript
interface RegressionStageTasksResponse {
  success: true;
  stage: 'REGRESSION';
  releaseId: string;                    // Release UUID (from path param)
  tasks: Task[];                        // See Shared Interfaces (each task has builds[])
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  
  // Regression-specific fields
  cycles: RegressionCycle[];            // All regression cycles (flat array)
  uploadedBuilds: BuildInfo[];          // Unused/unclaimed manual uploads for this stage
  currentCycle: RegressionCycle | null;
  approvalStatus: ApprovalStatus;
  upcomingSlot: RegressionSlot[] | null;  // See Shared Interfaces
}

interface RegressionCycle {
  id: string;                           // Cycle UUID
  releaseId: string;
  isLatest: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'ABANDONED';
  cycleTag: string | null;              // e.g., "RC1", "RC2"
  createdAt: string;                    // ISO 8601 (also serves as slot time)
  completedAt: string | null;           // ISO 8601 (updatedAt when status = DONE)
}

interface ApprovalStatus {
  canApprove: boolean;                  // True if all requirements met
  approvalRequirements: {
    testManagementPassed: boolean;      // Test run threshold passed
    cherryPickStatusOk: boolean;        // No new cherry picks found
    cyclesCompleted: boolean;           // No active cycles AND no upcoming slots
  };
}

interface BuildInfo {
  // ============================================================================
  // MANDATORY: Available in BOTH builds and uploads
  // ============================================================================
  id: string;
  tenantId: string;
  releaseId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  buildStage: 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE';
  artifactPath: string | null;
  internalTrackLink: string | null;     // Play Store Internal Track Link
  testflightNumber: string | null;      // TestFlight build number
  createdAt: string;                    // ISO 8601
  updatedAt: string;                    // ISO 8601

  // ============================================================================
  // OPTIONAL: Only in builds table (from CI/CD or consumed manual uploads)
  // ============================================================================
  buildType?: 'MANUAL' | 'CI_CD';
  buildUploadStatus?: 'PENDING' | 'UPLOADED' | 'FAILED';
  storeType?: 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE' | 'WEB' | null;
  buildNumber?: string | null;
  artifactVersionName?: string | null;
  regressionId?: string | null;         // FK to regression cycle
  ciRunId?: string | null;
  queueLocation?: string | null;
  workflowStatus?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;
  ciRunType?: 'JENKINS' | 'GITHUB_ACTIONS' | 'CIRCLE_CI' | 'GITLAB_CI' | null;
  taskId?: string | null;               // Reference to release_tasks table

  // ============================================================================
  // OPTIONAL: Only in uploads table (unused manual uploads)
  // ============================================================================
  isUsed?: boolean;                     // Whether consumed by a task
  usedByTaskId?: string | null;         // FK to release_tasks.id if consumed
}
```

---

## API #8: Retry Task

### Endpoint

```
POST /tenants/{tenantId}/releases/{releaseId}/tasks/{taskId}/retry
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (user-facing identifier, e.g., "REL-001") |
| `taskId` | string | Yes | Task UUID (primary key from release_tasks table) |

### Request Body

Empty body (no parameters required)

### Response

**Status Code:** `200 OK`

```typescript
interface RetryTaskResponse {
  success: true;
  message: string;                      // "Task retry initiated. Cron will re-execute on next tick."
  data: {
    taskId: string;                     // Task UUID
    releaseId: string;                  // Release UUID (user-facing identifier)
    previousStatus: string;             // Previous task status (should be "FAILED")
    newStatus: string;                  // New task status (should be "PENDING")
  };
}
```

### Behavior

1. **Authentication**: Requires valid user/account ID
2. **Validation**:
   - Validates task exists (returns 404 if not found)
   - Validates task status is `FAILED` (only failed tasks can be retried)
3. **Task Reset**:
   - Resets task status from `FAILED` → `PENDING`
   - Task will be automatically re-executed by the cron job on the next tick (LAZY approach)
4. **Release Resume** (if needed):
   - If release status is `PAUSED`, automatically resumes it to `IN_PROGRESS`
   - This allows the cron to continue execution
5. **Build Task Handling**:
   - For build-related tasks (`TRIGGER_PRE_REGRESSION_BUILDS`, `TRIGGER_REGRESSION_BUILDS`, `CREATE_AAB_BUILD`):
     - Also resets any associated failed build entries to `PENDING`
     - This ensures TaskExecutor knows which platforms to re-trigger

### Notes

- **LAZY Execution**: Task is NOT executed immediately. It's queued by resetting status to `PENDING`, and the cron job will pick it up on the next execution cycle.
- **Automatic Resume**: If the release was paused due to task failure, retry automatically resumes the release.
- **Build Task Special Handling**: For build tasks, the system also resets failed build records to ensure proper re-execution.

---

## API #10: Approve Regression Stage

### Endpoint

```
POST /tenants/{tenantId}/releases/{releaseId}/trigger-pre-release
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (user-facing identifier, e.g., "REL-001") |

### Request Body

```typescript
interface ApproveRegressionStageRequest {
  approvedBy: string;                   // Account ID of approver (required)
  comments?: string;                    // Optional approval comments
  forceApprove?: boolean;               // Override requirements (not recommended)
}
```

### Response

**Status Code:** `200 OK`

```typescript
interface ApproveRegressionStageResponse {
  success: true;
  message: string;                      // "Regression stage approved and Post-Regression stage triggered successfully"
  releaseId: string;                    // Release UUID
  approvedAt: string;                   // ISO 8601 timestamp
  approvedBy: string;                   // Account ID of approver
  nextStage: 'PRE_RELEASE';
}
```

### Approval Requirements

Before approval can proceed, the following requirements must be met (unless `forceApprove: true`):

1. **No active cycles** - No regression cycle with status `IN_PROGRESS` or `NOT_STARTED`
2. **No upcoming slots** - No scheduled regression slots remain
3. **Cherry pick status OK** - No new cherry picks found (branch matches latest tag)
4. **Stage 2 COMPLETED** - Regression stage must be marked as `COMPLETED`

**Note:** Test management status is checked separately via the approval status API (API #2) but not enforced by this endpoint.

### Behavior

1. Validates `approvedBy` field is provided (400 if missing)
2. Validates release exists and belongs to tenant (404/403 if not)
3. **Validates approval requirements** (400 if any fail, unless `forceApprove: true`):
   - Checks cherry pick status via `ReleaseStatusService.cherryPickAvailable()`
   - Checks cycles completed (no active cycles + no upcoming slots)
4. Validates Stage 2 is `COMPLETED` (400 if not)
5. Updates cron job: `autoTransitionToStage3 = true`, `stage3Status = IN_PROGRESS`
6. Starts the cron job to begin Stage 3 execution
7. Logs activity (approval metadata) - **TODO: Implement ActivityLogService**
8. Returns confirmation with approval metadata and next stage

### Notes

- This endpoint serves dual purpose: **Approve Regression** + **Trigger Stage 3**
- Approval is at the **regression stage level**, not individual cycle level
- Approving automatically triggers Stage 3 (Post-Regression) - no separate trigger needed
- Use `forceApprove: true` sparingly (for exceptional cases only)
- Activity logging is planned but not yet implemented

---

## API #11: Abandon Regression Cycle

> ⚠️ **DEPRIORITIZED** - This API has been deprioritized for initial release.

### Endpoint

```
POST /api/v1/tenants/{tenantId}/releases/{releaseId}/regression-cycles/{cycleId}/abandon
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |
| `cycleId` | string | Yes | Regression Cycle UUID |

### Request Body

```typescript
interface AbandonRegressionCycleRequest {
  abandonedBy: string;                  // Account ID of person abandoning
  reason: string;                       // Required reason for abandoning
}
```

### Response

**Status Code:** `200 OK`

```typescript
interface AbandonRegressionCycleResponse {
  success: true;
  message: string;
  cycleId: string;
  abandonedAt: string;                  // ISO 8601
  abandonedBy: string;
  reason: string;
}
```

### Behavior

1. Validates cycle exists and belongs to the release
2. Validates cycle is in a state that can be abandoned (`IN_PROGRESS` or `NOT_STARTED`)
3. Updates cycle status to `ABANDONED`
4. Records abandonment metadata (reason, timestamp, who)

### Notes

- The `ABANDONED` status already exists in DB enum (`RegressionCycleStatus`)
- Abandoning a cycle does NOT automatically start the next cycle
- User must manually trigger the next slot or approve regression stage

---

## API #12: Trigger Pre-Release Completion

### Endpoint

```
POST /api/v1/tenants/{tenantId}/releases/{releaseId}/stages/post-regression/complete
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Request Body

Empty body (no parameters required)

### Response

**Status Code:** `200 OK`

```typescript
interface CompletePreReleaseResponse {
  success: true;
  message: string;
  releaseId: string;
  completedAt: string;                  // ISO 8601
  nextStage: 'RELEASE_SUBMISSION';
}
```

### Behavior

1. Validates release exists and belongs to tenant
2. Validates Stage 3 (Post-Regression) is `COMPLETED` (all tasks done)
3. Triggers Stage 4 (Release Submission)
4. Returns confirmation with next stage information

### Notes

- This completes the Post-Regression stage and transitions to Release Submission
- All Stage 3 tasks must be completed before this can be called
- Used when `autoTransitionToStage4` is not enabled (manual workflow)

---

## API #13: Submit Release

> 🚧 **IN PROGRESS** - @Mohit is working on this. Actual endpoint may vary.

### Endpoint (Tentative)

```
POST /api/v1/tenants/{tenantId}/releases/{releaseId}/submission/submit
```

### Status

This API is currently under development. Contract details will be finalized once implementation is complete.

### Purpose

Submits the release to app stores (Play Store, App Store) for distribution.

---

## API #14: Get All Builds

> 🚧 **IN PROGRESS** - @Devansh is working on this.

### Endpoint

```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/builds
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stage` | string | No | Filter by build stage: `KICK_OFF`, `REGRESSION`, or `PRE_RELEASE` |
| `platform` | string | No | Filter by platform: `IOS`, `ANDROID`, or `WEB` |
| `status` | string | No | Filter by upload status: `PENDING`, `UPLOADED`, or `FAILED` |

### Response

**Status Code:** `200 OK`

```typescript
interface GetBuildsResponse {
  success: true;
  releaseId: string;
  builds: BuildInfo[];                  // See Shared Interfaces
  total: number;
}
```

### Notes

- Returns all builds associated with the release
- Individual build details come from task metadata in stage APIs
- This API is for overview/aggregation across all stages

---

## API #15: Upload Build

> 🚧 **IN PROGRESS** - @Devansh is working on this. Contract details to be finalized.

### Endpoint (Tentative)

```
POST /api/v1/tenants/{tenantId}/releases/{releaseId}/builds/upload
```

### Purpose

Manual build upload endpoint for releases with `hasManualBuildUpload: true`.

Accepts multipart form data with build file (.apk, .aab, .ipa, .dota) and metadata.

---

## API #16: Delete Build

> 🚧 **IN PROGRESS** - @Devansh is working on this. Contract details to be finalized.

### Endpoint (Tentative)

```
DELETE /api/v1/tenants/{tenantId}/releases/{releaseId}/builds/{buildId}
```

### Purpose

Deletes a build record and associated artifacts from storage.

---

## API #17: Get Test Management Status

### Endpoint

```
GET /tenants/{tenantId}/releases/{releaseId}/test-management-run-status
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (user-facing identifier, e.g., "REL-001") |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | No | Filter by platform: `IOS`, `ANDROID`, `WEB`. If not provided, returns all platforms |

### Response

**Status Code:** `200 OK`

#### Single Platform (when `platform` query param provided):

```typescript
interface GetTestManagementStatusResponse {
  success: true;
  releaseId: string;
  testManagementConfigId: string;
  platform: string;
  target: string;
  version: string;
  hasTestRun: boolean;
  runId: string | null;                 // This is the testRunId
  status?: string;
  runLink?: string;
  total?: number;
  testResults?: {
    passed?: number;
    failed?: number;
    untested?: number;
    blocked?: number;
    inProgress?: number;
    passPercentage?: number;
    threshold?: number;
    thresholdPassed?: boolean;
  };
  readyForApproval?: boolean;           // Extra: status === COMPLETED && thresholdPassed
  message: string;                      // Extra: Descriptive message
  error?: string;                       // Extra: Error message if fetch failed
}
```

#### All Platforms (when no `platform` query param):

```typescript
interface GetTestManagementStatusAllPlatformsResponse {
  success: true;
  releaseId: string;
  testManagementConfigId: string;
  platforms: TestManagementStatusResult[];  // Array of single platform results
}

type TestManagementStatusResult = {
  platform: string;
  target: string;
  version: string;
  hasTestRun: boolean;
  runId: string | null;
  status?: string;
  runLink?: string;
  total?: number;
  testResults?: {
    passed?: number;
    failed?: number;
    untested?: number;
    blocked?: number;
    inProgress?: number;
    passPercentage?: number;
    threshold?: number;
    thresholdPassed?: boolean;
  };
  readyForApproval?: boolean;
  message: string;
  error?: string;
};
```

---

## API #18: Get Project Management Status

### Endpoint

```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/project-management-run-status
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | No | Filter by platform: `IOS`, `ANDROID`, `WEB`. If not provided, returns all platforms |

### Response

**Status Code:** `200 OK`

#### Single Platform (when `platform` query param provided):

```typescript
interface GetProjectManagementStatusResponse {
  success: true;
  releaseId: string;
  projectManagementConfigId: string;
  platform: string;
  target: string;
  version: string;
  hasTicket: boolean;
  ticketKey: string | null;
  currentStatus?: string;
  completedStatus?: string;
  isCompleted?: boolean;
  message: string;
  error?: string;
}
```

#### All Platforms (when no `platform` query param):

```typescript
interface GetProjectManagementStatusAllPlatformsResponse {
  success: true;
  releaseId: string;
  projectManagementConfigId: string;
  platforms: ProjectManagementStatusResult[];
}

type ProjectManagementStatusResult = {
  platform: string;
  target: string;
  version: string;
  hasTicket: boolean;
  ticketKey: string | null;
  currentStatus?: string;
  completedStatus?: string;
  isCompleted?: boolean;
  message: string;
  error?: string;
};
```

---

## API #19: Get Cherry Pick Status

### Endpoint

```
GET /tenants/{tenantId}/releases/{releaseId}/check-cherry-pick-status
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (user-facing identifier, e.g., "REL-001") |

### Response

**Status Code:** `200 OK`

```typescript
interface CherryPickStatusResponse {
  success: true;
  releaseId: string;
  cherryPickAvailable: boolean;  // true = cherry picks exist, false = commits match
}
```

### Notes

- `cherryPickAvailable: true` means the branch has diverged from the **latest regression cycle tag** (cherry picks exist)
- `cherryPickAvailable: false` means the branch HEAD matches the latest regression cycle tag (no cherry picks)
- Uses `SCMService` to compare:
  - Branch: `releases.branch`
  - Tag: `regression_cycles.cycleTag` (where `isLatest = true`)
- Returns 400 if release doesn't have SCM integration configured or no regression cycles exist

---

## API #20: Get Release Notifications

### Endpoint

```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/notifications
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Response

**Status Code:** `200 OK`

```typescript
interface NotificationsResponse {
  success: true;
  releaseId: string;
  notifications: ReleaseNotification[];
}

type ReleaseNotification = {
  id: number;
  tenantId: number;
  releaseId: number;
  notificationType: NotificationType;
  isSystemGenerated: boolean;
  createdByUserId: number | null;
  taskId: string | null;
  delivery: Record<string, MessageResponse>;  // Map<channelId, MessageResponse>
  createdAt: string;
};

// NotificationType enum - values TBD based on notification_type DB enum
type NotificationType = string;

// MessageResponse - raw response from MessagingService.sendMessage()
type MessageResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
  // ... other provider-specific fields
};
```

---

## API #21: Send Release Notification

### Endpoint

```
POST /api/v1/tenants/{tenantId}/releases/{releaseId}/notify
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Request Body

```typescript
interface NotificationRequest {
  messageType: MessageTypeEnum;
}

// MessageTypeEnum - values based on notification_type DB enum
type MessageTypeEnum = 
  | 'RELEASE_KICKOFF'
  | 'REGRESSION_SLOT_REMINDER'
  | 'REGRESSION_COMPLETE'
  | 'PRE_RELEASE_CHERRY_PICKS_REMINDER'
  | 'RELEASE_APPROVED'
  | 'RELEASE_SUBMITTED'
  // ... other notification types
  ;
```

### Response

**Status Code:** `201 Created`

```typescript
interface SendNotificationResponse {
  success: true;
  notification: ReleaseNotification;  // Single notification record created
}
```

---

## API #22: Update What's New

> 🚧 **IN PROGRESS** - @Mohit is working on this. Contract details to be finalized.

### Endpoint (Tentative)

```
PUT /api/v1/tenants/{tenantId}/releases/{releaseId}/whats-new
```

### Purpose

Updates the "What's New" content for a release (release notes).

---

## API #23: Get Activity Logs

### Endpoint

```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/activity-logs
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Response

**Status Code:** `200 OK`

```typescript
interface ActivityLogsResponse {
  success: true;
  releaseId: string;
  activityLogs: ActivityLog[];
}

type ActivityLog = {
  id: string;
  releaseId: string;
  type: string;                          // Type of activity/change
  previousValue: Record<string, any> | null;  // Previous value before change
  newValue: Record<string, any> | null;       // New value after change
  updatedAt: string;
  updatedBy: string;                     // Account ID who made the change
};
```

---

## API #24: Get Release Submission Status

> 🚧 **IN PROGRESS** - @Mohit is working on this. Contract details to be finalized.

### Endpoint (Tentative)

```
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/submission
```

### Purpose

Gets the status of release submission to app stores.