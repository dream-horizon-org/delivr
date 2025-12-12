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
  currentActiveStage: 'PRE_KICKOFF' | 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION' | 'RELEASE_SUBMISSION' | 'RELEASE' | null;
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
  | 'AWAITING_POST_REGRESSION'       // Stage 2 complete, waiting for Stage 3 trigger
  | 'POST_REGRESSION'                // Stage 3 running
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
| `stage` | string | Yes | Stage filter: `KICKOFF`, `REGRESSION`, or `POST_REGRESSION` |

### Response

**Status Code:** `200 OK`

#### For KICKOFF and POST_REGRESSION stages:

```typescript
interface StageTasksResponse {
  success: true;
  stage: 'KICKOFF' | 'POST_REGRESSION';
  releaseId: string;                    // Release UUID (from path param)
  tasks: Task[];                        // See Shared Interfaces
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}
```

#### For REGRESSION stage (includes additional fields):

```typescript
interface RegressionStageTasksResponse {
  success: true;
  stage: 'REGRESSION';
  releaseId: string;                    // Release UUID (from path param)
  tasks: Task[];                        // See Shared Interfaces
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  
  // Regression-specific fields
  cycles: RegressionCycle[];
  currentCycle: RegressionCycle | null;
  approvalStatus: ApprovalStatus;
  availableBuilds: BuildInfo[];           // See Shared Interfaces
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
  buildStage: 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE';
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

---

## API #8: Retry Task

### Endpoint

```
POST /api/v1/tenants/{tenantId}/releases/{releaseId}/tasks/{taskId}/retry
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |
| `taskId` | string | Yes | Task UUID (primary key from release_tasks table) |

### Request Body

Empty body (no parameters required)

### Response

**Status Code:** `200 OK`

```typescript
interface RetryTaskResponse {
  success: true;
  message: string;                      // e.g., "Task queued for retry"
  task: Task;                           // See Shared Interfaces - updated task with status = PENDING
}
```

### Behavior

1. Validates task exists and belongs to the specified release
2. Validates task status is `FAILED` (only failed tasks can be retried)
3. Validates release status is not `ARCHIVED`
4. Resets task status from `FAILED` → `PENDING`
5. Clears `taskConclusion` and error data in `externalData`
6. Task will be automatically re-executed by the cron job in the next execution cycle

---

## API #10: Approve Regression Stage

### Endpoint

```
POST /api/v1/tenants/{tenantId}/releases/{releaseId}/stages/regression/approve
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Request Body

```typescript
interface ApproveRegressionStageRequest {
  approvedBy: string;                   // Account ID of approver
  comments?: string;                    // Optional approval comments
  forceApprove?: boolean;               // Override requirements (not recommended)
}
```

### Response

**Status Code:** `200 OK`

```typescript
interface ApproveRegressionStageResponse {
  success: true;
  message: string;
  releaseId: string;
  approvedAt: string;                   // ISO 8601
  approvedBy: string;
  nextStage: 'POST_REGRESSION';
}
```

### Approval Requirements

Before approval can proceed, the following requirements must be met (unless `forceApprove: true`):

1. **Active cycle must be completed** - No regression cycle with status `IN_PROGRESS` or `NOT_STARTED`
2. **No new cherry picks** - Cherry pick status must be OK (no divergence from latest tag)
3. **Test management passed** - Test run threshold must be met (if test management integration configured)
4. **All regression builds completed** - All required platform builds must be complete

### Behavior

1. Validates release exists and belongs to tenant
2. Validates Stage 2 (Regression) is `COMPLETED` or all cycles are done
3. Validates approval requirements are met (or `forceApprove: true`)
4. Records approval metadata (approvedBy, comments, timestamp)
5. **Automatically triggers POST_REGRESSION stage** (Stage 3)
6. Returns confirmation with next stage information

### Notes

- Approval is at the **regression stage level**, not individual cycle level
- Release pilot can approve before the next scheduled slot starts
- Approving automatically triggers Stage 3 - no separate trigger API needed
- Use `forceApprove` sparingly (for exceptional cases only)

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
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/test-management-run-status
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
    skipped?: number;
    blocked?: number;
    inProgress?: number;
    passPercentage?: number;
    threshold?: number;
    thresholdPassed?: boolean;
  };
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
    skipped?: number;
    blocked?: number;
    inProgress?: number;
    passPercentage?: number;
    threshold?: number;
    thresholdPassed?: boolean;
  };
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
GET /api/v1/tenants/{tenantId}/releases/{releaseId}/check-cherry-pick-status
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

### Response

**Status Code:** `200 OK`

```typescript
interface CherryPickStatusResponse {
  success: true;
  releaseId: string;
  latestReleaseTag: string;
  commitIdsMatch: boolean;  // Whether branch head commit == tag commit
}
```

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

