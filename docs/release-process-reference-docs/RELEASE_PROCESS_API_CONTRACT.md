# Release Process API Contract

## Overview
API contract for the release process that starts after a release is created. The release is divided into 5 stages: Pre-Kickoff, Kickoff, Regression, Pre-Release, and Release.

---

## ⚠️ CRITICAL: Path Parameter Conventions

**IMPORTANT**: All `{releaseId}` path parameters in this document refer to the **primary key** (`release.id`), NOT the user-facing identifier (`release.releaseId`).

- **`release.id`** = Primary key (UUID) - **Use this in API paths**
- **`release.releaseId`** = User-facing identifier (e.g., "REL-001") - **Display only, NOT for API calls**

### Example:
```typescript
// ✅ CORRECT - Using primary key with query parameter
const response = await apiGet(`/api/v1/tenants/${tenantId}/releases/${release.id}/tasks?stage=KICKOFF`);

// ❌ WRONG - Using user-facing identifier
const response = await apiGet(`/api/v1/tenants/${tenantId}/releases/${release.releaseId}/tasks?stage=KICKOFF`);
```

**Note:** Stage APIs use query parameter pattern: `/tasks?stage={stage}` (not `/stages/{stage}`)

**All API endpoints expect `release.id` (the primary key UUID) in the `{releaseId}` path parameter.**

---

## Common Types

### Task
```typescript
interface Task {
  id: string;                              // Primary key (UUID)
  taskId: string;                          // Unique task identifier
  taskType: TaskType;
  stage: 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION';
  taskStatus: 'PENDING' | 'IN_PROGRESS' | 'AWAITING_CALLBACK' | 'AWAITING_MANUAL_BUILD' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  taskConclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  accountId: string | null;
  regressionId: string | null;             // FK to regression cycle (if regression task)
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: string | null;
  externalId: string | null;               // External system ID (e.g., Jira ticket ID)
  externalData: Record<string, unknown> | null; // Flexible metadata per task type (maps to backend's metadata and output)
  branch: string | null;
  builds?: BuildInfo[];                    // Builds associated with this task (for Kickoff/Regression/Post-Regression build tasks)
  createdAt: string;                       // ISO 8601
  updatedAt: string;                       // ISO 8601
}
```

### TaskStatus
```typescript
enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_CALLBACK = 'AWAITING_CALLBACK',
  AWAITING_MANUAL_BUILD = 'AWAITING_MANUAL_BUILD',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}
```

### TaskStage
```typescript
enum TaskStage {
  PRE_KICKOFF = 'PRE_KICKOFF',
  KICKOFF = 'KICKOFF',
  REGRESSION = 'REGRESSION',
  POST_REGRESSION = 'POST_REGRESSION', // Pre-Release
  RELEASE_SUBMISSION = 'RELEASE_SUBMISSION', // NEW - separate from RELEASE
  RELEASE = 'RELEASE' // Distribution/Released
}
```

### ReleaseStatus (Backend)
```typescript
enum ReleaseStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  REGRESSION_IN_PROGRESS = 'REGRESSION_IN_PROGRESS',
  BUILD_SUBMITTED = 'BUILD_SUBMITTED',
  RELEASED = 'RELEASED',
  ARCHIVED = 'ARCHIVED',
  PAUSED = 'PAUSED',      // NEW
  FAILED = 'FAILED'       // NEW
}
```

### TaskType
```typescript
enum TaskType {
  // Pre-Kickoff
  PRE_KICK_OFF_REMINDER = 'PRE_KICK_OFF_REMINDER',
  
  // Kickoff
  FORK_BRANCH = 'FORK_BRANCH',
  CREATE_PROJECT_MANAGEMENT_TICKET = 'CREATE_PROJECT_MANAGEMENT_TICKET',
  CREATE_TEST_SUITE = 'CREATE_TEST_SUITE',
  TRIGGER_PRE_REGRESSION_BUILDS = 'TRIGGER_PRE_REGRESSION_BUILDS',
  
  // Regression
  RESET_TEST_SUITE = 'RESET_TEST_SUITE',
  CREATE_RC_TAG = 'CREATE_RC_TAG',
  CREATE_RELEASE_NOTES = 'CREATE_RELEASE_NOTES',
  TRIGGER_REGRESSION_BUILDS = 'TRIGGER_REGRESSION_BUILDS',
  TRIGGER_AUTOMATION_RUNS = 'TRIGGER_AUTOMATION_RUNS',
  AUTOMATION_RUNS = 'AUTOMATION_RUNS',
  SEND_REGRESSION_BUILD_MESSAGE = 'SEND_REGRESSION_BUILD_MESSAGE',
  
  // Post-Regression (Pre-Release)
  PRE_RELEASE_CHERRY_PICKS_REMINDER = 'PRE_RELEASE_CHERRY_PICKS_REMINDER',
  TEST_FLIGHT_BUILD = 'TEST_FLIGHT_BUILD',
  CREATE_RELEASE_TAG = 'CREATE_RELEASE_TAG',
  CREATE_FINAL_RELEASE_NOTES = 'CREATE_FINAL_RELEASE_NOTES',
  SEND_POST_REGRESSION_MESSAGE = 'SEND_POST_REGRESSION_MESSAGE',
  ADD_L6_APPROVAL_CHECK = 'ADD_L6_APPROVAL_CHECK',
  
  // Release
  PROMOTE_BUILD = 'PROMOTE_BUILD'
}
```

### MessageTypeEnum
```typescript
enum MessageTypeEnum {
  REGRESSION_BUILD = 'REGRESSION_BUILD',
  POST_REGRESSION = 'POST_REGRESSION',
  RELEASE_ANNOUNCEMENT = 'RELEASE_ANNOUNCEMENT',
  KICKOFF_REMINDER = 'KICKOFF_REMINDER',
  PRE_RELEASE_REMINDER = 'PRE_RELEASE_REMINDER'
}
```

### BuildArtifact
```typescript
interface BuildArtifact {
  id: string;                              // Unique build ID
  artifactPath: string | null;             // S3 path to artifact (`null` for TestFlight builds)
  downloadUrl: string | null;              // Presigned S3 download URL (expires in 1 hour), `null` if no artifact
  artifactVersionName: string;             // Version string (e.g., "1.2.3")
  buildNumber: string | null;              // Build number / version code
  releaseId: string;                       // Associated release ID (primary key)
  platform: 'ANDROID' | 'IOS' | 'WEB';    // Platform
  storeType: string | null;                // Target store: `APP_STORE`, `PLAY_STORE`, `TESTFLIGHT`, `WEB`
  buildStage: string;                      // Stage: `KICK_OFF`, `REGRESSION`, `PRE_RELEASE`
  buildType: 'MANUAL' | 'CI_CD';          // Type: `MANUAL` or `CI_CD`
  buildUploadStatus: string;               // Upload status: `PENDING`, `UPLOADING`, `UPLOADED`, `FAILED`
  workflowStatus: string | null;            // CI/CD workflow status (`null` for manual builds)
  regressionId: string | null;             // Regression cycle ID (if regression build)
  ciRunId: string | null;                  // CI/CD run ID (`null` for manual builds)
  createdAt: string;                       // ISO 8601 creation timestamp
  updatedAt: string;                       // ISO 8601 last update timestamp
}
```

### BuildInfo
```typescript
/**
 * BuildInfo - Build information included in task responses
 * Used for Kickoff, Regression, and Post-Regression build tasks
 * 
 * For Kickoff/Regression tasks:
 * - Contains artifactPath for download links
 * - Used to display build artifacts by platform
 * 
 * For Post-Regression tasks:
 * - iOS: Contains testflightNumber for TestFlight link
 * - Android: Contains internalTrackLink for Play Store Internal Track link
 */
interface BuildInfo {
  id: string;                              // Unique build ID
  tenantId: string;                        // Tenant UUID
  releaseId: string;                       // Release UUID (primary key)
  platform: 'ANDROID' | 'IOS' | 'WEB';    // Platform
  storeType: 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE' | 'WEB' | null;
  buildNumber: string | null;              // Build number / version code
  artifactVersionName: string | null;      // Version string (e.g., "1.2.3")
  artifactPath: string | null;             // S3 path to artifact (`null` for TestFlight builds)
  regressionId: string | null;             // FK to regression cycle
  ciRunId: string | null;                  // CI/CD run ID
  buildUploadStatus: 'PENDING' | 'UPLOADED' | 'FAILED';
  buildType: 'MANUAL' | 'CI_CD';
  buildStage: 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE';
  queueLocation: string | null;
  workflowStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;
  ciRunType: 'JENKINS' | 'GITHUB_ACTIONS' | 'CIRCLE_CI' | 'GITLAB_CI' | null;
  taskId: string | null;                  // Reference to release_tasks table
  internalTrackLink: string | null;       // Play Store Internal Track Link (for Android AAB builds)
  testflightNumber: string | null;         // TestFlight build number (for iOS builds)
  createdAt: string;                       // ISO 8601
  updatedAt: string;                       // ISO 8601
}
```

---

## Core APIs

### 1. Get Release Details
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**

**Response:**
```typescript
interface GetReleaseDetailsResponse {
  success: true;
  release: ReleaseDetails;  // See Common Types above
}
```

---

## Stage-Specific APIs

### 2. Get Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/tasks?stage={stage}`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**

**Query Parameters:**
- `stage` (string, required): Stage filter: `KICKOFF`, `REGRESSION`, or `POST_REGRESSION`

**Response:**

#### For KICKOFF and PRE_RELEASE stages:

```typescript
interface StageTasksResponse {
  success: true;
  stage: 'KICKOFF' | 'PRE_RELEASE';
  releaseId: string;                    // Release UUID (from path param)
  tasks: Task[];                        // See Common Types
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  uploadedBuilds: BuildInfo[];          // Staging builds not yet consumed by tasks
}
```

**Expected Tasks for KICKOFF:**
- `PRE_KICK_OFF_REMINDER`
- `FORK_BRANCH`
- `CREATE_PROJECT_MANAGEMENT_TICKET`
- `CREATE_TEST_SUITE`
- `TRIGGER_PRE_REGRESSION_BUILDS`

**Build Information for KICKOFF:**
- Tasks with `taskType: TRIGGER_PRE_REGRESSION_BUILDS`:
  - If `taskStatus === 'COMPLETED'`: `task.builds` contains consumed builds (cannot be changed)
  - If `taskStatus !== 'COMPLETED'`: Use `uploadedBuilds` from stage response (can be changed via PUT API)
- `uploadedBuilds`: Builds uploaded but not yet picked by task (stage-level, filtered by `buildStage: 'KICKOFF'`)
- Each `BuildInfo` contains `artifactPath` for download links
- Builds are grouped by platform (ANDROID, IOS, WEB)

**Build Information for PRE_RELEASE:**
- Tasks with `taskType: TRIGGER_TEST_FLIGHT_BUILD` or `CREATE_AAB_BUILD`:
  - If `taskStatus === 'COMPLETED'`: `task.builds` contains consumed builds (cannot be changed)
  - If `taskStatus !== 'COMPLETED'`: Use `uploadedBuilds` from stage response (can be changed via PUT API)
- `uploadedBuilds`: Builds uploaded but not yet picked by task (stage-level, filtered by `buildStage: 'PRE_RELEASE'`)
- Platform-specific: IOS for TestFlight, ANDROID for AAB

#### For REGRESSION stage (includes additional fields):

```typescript
interface RegressionStageTasksResponse {
  success: true;
  stage: 'REGRESSION';
  releaseId: string;                    // Release UUID (from path param)
  tasks: Task[];                        // See Common Types
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  
  // Regression-specific fields
  cycles: RegressionCycle[];
  currentCycle: RegressionCycle | null;
  approvalStatus: ApprovalStatus;
  uploadedBuilds: BuildInfo[];            // Builds uploaded for upcoming slot (only visible when cycle hasn't started)
  upcomingSlot: RegressionSlot[] | null;  // See Common Types
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

interface RegressionSlot {
  date: string;                            // ISO 8601
  config: Record<string, unknown>;
}
```

### PlatformTargetMapping
```typescript
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
```

### CronJob
```typescript
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
```

### Phase
```typescript
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

### ReleaseDetails
```typescript
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
  releasePhase: Phase;                     // Detailed phase (see Phase type above)
  
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
  platformTargetMappings: PlatformTargetMapping[];  // See above
  
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
  cronJob?: CronJob;                       // See above
  tasks?: Task[];                          // See above
}
```

**Expected Tasks:**
- `RESET_TEST_SUITE` (only for subsequent slots)
- `CREATE_RC_TAG`
- `CREATE_RELEASE_NOTES`
- `TRIGGER_REGRESSION_BUILDS`
- `TRIGGER_AUTOMATION_RUNS`
- `AUTOMATION_RUNS`
- `SEND_REGRESSION_BUILD_MESSAGE`

**Expected Tasks for REGRESSION:**
- `RESET_TEST_SUITE` (only for subsequent slots)
- `CREATE_RC_TAG`
- `CREATE_RELEASE_NOTES`
- `TRIGGER_REGRESSION_BUILDS`
- `TRIGGER_AUTOMATION_RUNS`
- `AUTOMATION_RUNS`
- `SEND_REGRESSION_BUILD_MESSAGE`

**Build Information for REGRESSION:**
- **Upload Widgets Visibility**: Build upload widgets are only visible when:
  - Current cycle is `DONE` (completed) AND `upcomingSlot` exists, OR
  - No cycles exist yet (first cycle after kickoff) AND `upcomingSlot` exists
- **uploadedBuilds**: Builds uploaded for upcoming slot (stage-level, filtered by `buildStage: 'REGRESSION'`)
  - Only visible when cycle hasn't started (currentCycle is null or DONE)
  - When cycle is `IN_PROGRESS`, uploadedBuilds is empty (builds are consumed)
- **Cycle Start Logic** (handled by backend cron):
  - Cycle starts only when ALL required builds are uploaded for upcoming slot
  - If builds are uploaded after slot time has passed, cycle starts immediately when all builds are uploaded
  - When cycle starts, builds are consumed (moved from `buildUploadsStaging` to `builds` table with `taskId`)
- **Tasks in Cycle**:
  - When cycle is `IN_PROGRESS`: Tasks use `task.builds` (consumed builds from `builds` table where `taskId === task.id`)
  - When cycle hasn't started: Tasks don't have builds yet (builds are in `uploadedBuilds`)
- **Build Flow**:
  1. Builds uploaded → stored in `buildUploadsStaging` → visible in `uploadedBuilds`
  2. When cycle starts → builds moved to `builds` table with `taskId` → visible in `task.builds`
  3. When cycle completes → same flow for next cycle

**Expected Tasks for POST_REGRESSION:**

- `PRE_RELEASE_CHERRY_PICKS_REMINDER`
- `TRIGGER_TEST_FLIGHT_BUILD`
- `CREATE_AAB_BUILD`
- `CREATE_RELEASE_TAG`
- `CREATE_FINAL_RELEASE_NOTES`
- `SEND_POST_REGRESSION_MESSAGE`
- `CHECK_PROJECT_RELEASE_APPROVAL`

**Build Information for POST_REGRESSION:**
- **For Completed Tasks**: Tasks with `taskType: TRIGGER_TEST_FLIGHT_BUILD` or `CREATE_AAB_BUILD` that have `taskStatus: 'COMPLETED'` **MUST** include `builds: BuildInfo[]` array with consumed builds from the `builds` table where `taskId === task.id`
- Tasks with `taskType: TRIGGER_TEST_FLIGHT_BUILD` (iOS) will include `builds: BuildInfo[]` when builds are available
  - Each iOS `BuildInfo` contains `testflightNumber` for TestFlight link generation (required for completed tasks)
  - `platform` will be `'IOS'`
- Tasks with `taskType: CREATE_AAB_BUILD` (Android) will include `builds: BuildInfo[]` when builds are available
  - Each Android `BuildInfo` contains `internalTrackLink` for Play Store Internal Track link (required for completed tasks)
  - `platform` will be `'ANDROID'`
- Builds are grouped by platform for display
- **Data Source**: `task.builds` contains consumed builds from `builds` table where `taskId === task.id` (NOT from staging table)

---

## Action APIs

### 8. Retry Task
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/tasks/{taskId}/retry`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**
- `taskId` (string, required): Task UUID (primary key from release_tasks table)

**Request Body:**
Empty body (no parameters required)

**Response:**
```typescript
interface RetryTaskResponse {
  success: true;
  message: string;                      // "Task retry initiated. Cron will re-execute on next tick."
  data: {
    taskId: string;                     // Task UUID
    releaseId: string;                  // Release UUID (primary key)
    previousStatus: string;             // Previous task status (should be "FAILED")
    newStatus: string;                  // New task status (should be "PENDING")
  };
}
```

**Behavior:**

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

**Notes:**

- **LAZY Execution**: Task is NOT executed immediately. It's queued by resetting status to `PENDING`, and the cron job will pick it up on the next execution cycle.
- **Automatic Resume**: If the release was paused due to task failure, retry automatically resumes the release.
- **Build Task Special Handling**: For build tasks, the system also resets failed build records to ensure proper re-execution.

---

### 11. Approve Regression
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/trigger-pre-release`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release UUID (user-facing identifier, e.g., "REL-001")

**Request Body:**
```typescript
interface ApproveRegressionStageRequest {
  approvedBy: string;                   // Account ID of approver (required)
  comments?: string;                    // Optional approval comments
  forceApprove?: boolean;               // Override requirements (not recommended)
}
```

**Response:**
```typescript
interface ApproveRegressionStageResponse {
  success: true;
  message: string;                      // "Regression stage approved and Post-Regression stage triggered successfully"
  releaseId: string;                    // Release UUID
  approvedAt: string;                   // ISO 8601 timestamp
  approvedBy: string;                   // Account ID of approver
  nextStage: 'POST_REGRESSION';
}
```

**Approval Requirements:**

Before approval can proceed, the following requirements must be met (unless `forceApprove: true`):

1. **No active cycles** - No regression cycle with status `IN_PROGRESS` or `NOT_STARTED`
2. **No upcoming slots** - No scheduled regression slots remain
3. **Cherry pick status OK** - No new cherry picks found (branch matches latest tag)
4. **Stage 2 COMPLETED** - Regression stage must be marked as `COMPLETED`

**Note:** Test management status is checked separately via the approval status API but not enforced by this endpoint.

**Behavior:**

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

**Notes:**

- This endpoint serves dual purpose: **Approve Regression** + **Trigger Stage 3**
- Approval is at the **regression stage level**, not individual cycle level
- Approving automatically triggers Stage 3 (Post-Regression) - no separate trigger needed
- Use `forceApprove: true` sparingly (for exceptional cases only)
- Activity logging is planned but not yet implemented

---

### 12. Abandon Regression Cycle

> ⚠️ **DEPRIORITIZED** - This API has been deprioritized for initial release.

**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/regression-cycles/{cycleId}/abandon`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release UUID (primary key in DB)
- `cycleId` (string, required): Regression Cycle UUID

**Request Body:**
```typescript
interface AbandonRegressionCycleRequest {
  abandonedBy: string;                  // Account ID of person abandoning
  reason: string;                       // Required reason for abandoning
}
```

**Response:**
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

**Behavior:**

1. Validates cycle exists and belongs to the release
2. Validates cycle is in a state that can be abandoned (`IN_PROGRESS` or `NOT_STARTED`)
3. Updates cycle status to `ABANDONED`
4. Records abandonment metadata (reason, timestamp, who)

**Notes:**

- The `ABANDONED` status already exists in DB enum (`RegressionCycleStatus`)
- Abandoning a cycle does NOT automatically start the next cycle
- User must manually trigger the next slot or approve regression stage

---

### 13. Trigger Pre-Release Completion
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/post-regression/complete`

**Request Body:**
Empty body (no parameters required)

**Request:**
```typescript
interface CompletePreReleaseRequest {
  // Empty body or optional parameters
}
```

**Response:**
```typescript
interface CompletePreReleaseResponse {
  success: true;
  message: string;
  releaseId: string;
  completedAt: string;                  // ISO 8601
  nextStage: 'RELEASE_SUBMISSION';
}
```

**Behavior:**

1. Validates release exists and belongs to tenant
2. Validates Stage 3 (Post-Regression) is `COMPLETED` (all tasks done)
3. Triggers Stage 4 (Release Submission)
4. Returns confirmation with next stage information

**Notes:**

- This completes the Post-Regression stage and transitions to Release Submission
- All Stage 3 tasks must be completed before this can be called
- Used when `autoTransitionToStage4` is not enabled (manual workflow)

---

### 14. Submit Release
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/submission/submit`

**Request:**
```typescript
interface SubmitReleaseRequest {
  platforms: Array<{
    platform: 'IOS' | 'ANDROID';
    buildId: string;
    whatsNew: string;
    increaseLastReleaseExposure?: boolean; // For Android
  }>;
  submittedBy: string;
}
```

**Response:**
```typescript
interface SubmitReleaseResponse {
  success: boolean;
  message: string;
  releaseId: string;
  status: ReleaseStatus.BUILD_SUBMITTED;
  submittedAt: string;
  submittedBy: string;
}
```

### 15. Get Release Submission Status
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/submission`

**Response:**
```typescript
interface ReleaseSubmissionStatusResponse {
  releaseId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  platforms: Array<{
    platform: 'IOS' | 'ANDROID';
    whatsNew?: string;
    lastReleaseExposure?: {
      exposure: number; // Percentage
      canIncrease: boolean;
      warning?: string;
    };
    submissionStatus: 'PENDING' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  }>;
}
```

### 14. Get All Builds

> 🚧 **IN PROGRESS** - @Devansh is working on this.

**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/builds`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release UUID (primary key in DB)

**Query Parameters:**
- `stage` (string, optional): Filter by build stage: `KICK_OFF`, `REGRESSION`, or `PRE_RELEASE`
- `platform` (string, optional): Filter by platform: `IOS`, `ANDROID`, or `WEB`
- `status` (string, optional): Filter by upload status: `PENDING`, `UPLOADED`, or `FAILED`

**Response:**
```typescript
interface GetBuildsResponse {
  success: true;
  releaseId: string;
  builds: BuildInfo[];                  // See Common Types
  total: number;
}
```

**Notes:**
- Returns all builds associated with the release
- Individual build details come from task metadata in stage APIs
- This API is for overview/aggregation across all stages

---

## Build Management APIs

### 19. Upload Manual Build

Upload a build artifact manually for a specific platform during a release stage.

**PUT** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/{stage}/builds/{platform}`

**Description:**

Used when `hasManualBuildUpload = true` on a release. This endpoint allows users to manually upload build artifacts instead of relying on CI/CD pipelines.

**Flow:**
1. Validates upload is allowed (hasManualBuildUpload, correct stage, platform configured)
2. Uploads artifact to S3 storage
3. Creates/updates entry in `release_uploads` staging table
4. Returns upload status including whether all platforms are ready

**Authentication:**
- **Required**: Yes
- **Permission**: Tenant Owner

**Path Parameters:**

| Parameter   | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `tenantId`  | string | Yes      | Unique tenant identifier |
| `releaseId` | string | Yes      | Unique release identifier (UUID) |
| `stage`     | string | Yes      | Release stage: `KICK_OFF`, `REGRESSION`, or `PRE_RELEASE` |
| `platform`  | string | Yes      | Platform: `IOS`, `ANDROID`, or `WEB` |

**Request:**

#### Content-Type

```
multipart/form-data
```

#### Form Fields

| Field      | Type | Required | Description |
|------------|------|----------|-------------|
| `artifact` | File | Yes      | Build artifact file (max 500MB) |

#### cURL Example

```bash
curl -X PUT \
  'https://api.example.com/release-management/tenants/{tenantId}/releases/{releaseId}/stages/KICK_OFF/builds/IOS' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: multipart/form-data' \
  -F 'artifact=@/path/to/build.ipa'
```

**Response:**

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "uploadId": "uuid-v4-upload-id",
    "platform": "IOS",
    "stage": "KICK_OFF",
    "downloadUrl": "https://s3.amazonaws.com/bucket/path/to/artifact.ipa",
    "internalTrackLink": null,
    "uploadedPlatforms": ["IOS"],
    "missingPlatforms": ["ANDROID", "WEB"],
    "allPlatformsReady": false
  }
}
```

#### Success Response - All Platforms Ready (200 OK)

```json
{
  "success": true,
  "data": {
    "uploadId": "uuid-v4-upload-id",
    "platform": "ANDROID",
    "stage": "KICK_OFF",
    "downloadUrl": "https://s3.amazonaws.com/bucket/path/to/artifact.apk",
    "internalTrackLink": "https://play.google.com/apps/internaltest/...",
    "uploadedPlatforms": ["IOS", "ANDROID", "WEB"],
    "missingPlatforms": [],
    "allPlatformsReady": true
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `data.uploadId` | string | UUID of the created upload record |
| `data.platform` | string | Platform that was uploaded (`IOS`, `ANDROID`, `WEB`) |
| `data.stage` | string | Stage the upload is for |
| `data.downloadUrl` | string | S3 download URL for the artifact |
| `data.internalTrackLink` | string \| null | Internal track link (Android AAB only) |
| `data.uploadedPlatforms` | string[] | List of platforms with uploads for this stage |
| `data.missingPlatforms` | string[] | List of platforms still pending upload |
| `data.allPlatformsReady` | boolean | `true` if all required platforms have been uploaded |

**Notes:**
- Maximum file size: **500MB**
- Supported stages: `KICK_OFF`, `REGRESSION`, `PRE_RELEASE`
- Supported platforms: `IOS`, `ANDROID`, `WEB`
- For Android AAB files, an `internalTrackLink` may be returned
- **Staging Table**: Uploads are stored in `release_uploads` staging table, NOT directly in `builds` table
- **Task Consumption**: The `builds` table entry is created later when the task executes and consumes from staging

**Error Responses:**

#### 400 Bad Request - Missing Parameters
```json
{
  "success": false,
  "error": "Release ID is required"
}
```

```json
{
  "success": false,
  "error": "Stage is required (KICK_OFF, REGRESSION, PRE_RELEASE)"
}
```

```json
{
  "success": false,
  "error": "Platform is required"
}
```

#### 400 Bad Request - Invalid Stage
```json
{
  "success": false,
  "error": "Invalid buildStage: invalid_stage. Must be one of: KICK_OFF, REGRESSION, PRE_RELEASE"
}
```

#### 400 Bad Request - Invalid Platform
```json
{
  "success": false,
  "error": "Invalid platform: invalid_platform. Must be one of: ANDROID, IOS, WEB"
}
```

#### 400 Bad Request - Missing File
```json
{
  "success": false,
  "error": "Build artifact file is required"
}
```

#### 400 Bad Request - Validation Failure
```json
{
  "success": false,
  "error": "Manual build upload is not enabled for this release"
}
```

```json
{
  "success": false,
  "error": "Platform IOS is not configured for this release"
}
```

```json
{
  "success": false,
  "error": "Cannot upload to stage REGRESSION - current stage is KICK_OFF"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized: Account ID not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Manual upload service not configured"
}
```

```json
{
  "success": false,
  "error": "Failed to upload build",
  "message": "S3 upload failed: timeout"
}
```

**Flow Summary:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. PUT /stages/:stage/builds/:platform                                   │
│    → Validates upload is allowed                                        │
│    → Uploads artifact to S3                                             │
│    → Creates entry in `release_uploads` staging table                   │
│    → Returns uploadId, downloadUrl, platform status                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Task executes (e.g., TRIGGER_PRE_REGRESSION_BUILDS)                   │
│    → Checks staging table (WHERE isUsed = false)                        │
│    → If all platforms ready:                                            │
│        - Marks staging entries: isUsed = true, usedByTaskId = taskId    │
│        - Creates `builds` table entries                                 │
│        - Task status: COMPLETED ✅                                       │
│    → If missing platforms:                                              │
│        - Task status: AWAITING_MANUAL_BUILD ⏳                           │
│        - Slack notification sent (once)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 20. Verify TestFlight Build

Verify that an iOS build exists in Apple TestFlight and stage it for task consumption.

**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/{stage}/builds/ios/verify-testflight`

**Description:**

Verifies an iOS build exists in TestFlight via App Store Connect API and **stages the verified build** in the `release_uploads` staging table. This endpoint serves two purposes:

1. **Verification**: Confirms the build exists in TestFlight with matching build number and version
2. **Staging**: Creates an entry in the `release_uploads` staging table (NOT directly in `builds` table)

**Important Flow:**
- This endpoint stores in the **staging table** (`release_uploads`), NOT the `builds` table
- The actual `builds` table entry is created later when the task (e.g., `TRIGGER_TEST_FLIGHT_BUILD`) executes
- Task consumption happens when the cron job runs and processes pending tasks

This is used for manual TestFlight uploads where the user uploads their build to TestFlight outside of CI/CD and then verifies it through this endpoint.

**Authentication:**
- **Required**: Yes
- **Permission**: Tenant Owner

**Path Parameters:**

| Parameter   | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `tenantId`  | string | Yes      | Unique tenant identifier |
| `releaseId` | string | Yes      | Unique release identifier (UUID) |
| `stage`     | string | Yes      | Release stage: `KICK_OFF`, `REGRESSION`, or `PRE_RELEASE` |

**Request:**

#### Content-Type

```
application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `testflightBuildNumber` | string | Yes | The build number to verify in TestFlight |
| `versionName` | string | Yes | The version string to match (e.g., "1.2.3") |

#### Example Request

```json
{
  "testflightBuildNumber": "12345",
  "versionName": "1.2.3"
}
```

#### cURL Example

```bash
curl -X POST \
  'https://api.example.com/release-management/tenants/{tenantId}/releases/{releaseId}/stages/PRE_RELEASE/builds/ios/verify-testflight' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "testflightBuildNumber": "12345",
    "versionName": "1.2.3"
  }'
```

**Response:**

#### Success Response (200 OK)

Upon successful verification, a staging entry is created in the `release_uploads` table:

```json
{
  "success": true,
  "data": {
    "uploadId": "staging-uuid-123",
    "releaseId": "550e8400-e29b-41d4-a716-446655440000",
    "platform": "IOS",
    "stage": "PRE_RELEASE",
    "testflightNumber": "12345",
    "versionName": "1.2.3",
    "verified": true,
    "isUsed": false,
    "uploadedPlatforms": ["IOS"],
    "missingPlatforms": ["ANDROID"],
    "allPlatformsReady": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Success Response - All Platforms Ready (200 OK)

```json
{
  "success": true,
  "data": {
    "uploadId": "staging-uuid-123",
    "releaseId": "550e8400-e29b-41d4-a716-446655440000",
    "platform": "IOS",
    "stage": "PRE_RELEASE",
    "testflightNumber": "12345",
    "versionName": "1.2.3",
    "verified": true,
    "isUsed": false,
    "uploadedPlatforms": ["IOS", "ANDROID"],
    "missingPlatforms": [],
    "allPlatformsReady": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `data.uploadId` | string | Unique ID of the staging entry in `release_uploads` |
| `data.releaseId` | string | UUID of the associated release |
| `data.platform` | string | Always `IOS` for TestFlight builds |
| `data.stage` | string | Release stage (`KICK_OFF`, `REGRESSION`, `PRE_RELEASE`) |
| `data.testflightNumber` | string | The verified TestFlight build number |
| `data.versionName` | string | Version string of the build |
| `data.verified` | boolean | Always `true` on success (TestFlight verification passed) |
| `data.isUsed` | boolean | `false` until task consumes this entry |
| `data.uploadedPlatforms` | string[] | Platforms with uploads staged for this stage |
| `data.missingPlatforms` | string[] | Platforms still pending upload |
| `data.allPlatformsReady` | boolean | `true` if all required platforms have been staged |
| `data.createdAt` | string | ISO 8601 timestamp when staging entry was created |

### Staging Table Entry Created

When verification succeeds, a record is created in the `release_uploads` **staging table**:

| Column | Value |
|--------|-------|
| `id` | Auto-generated staging UUID |
| `tenantId` | From path parameter |
| `releaseId` | From path parameter |
| `platform` | `IOS` |
| `stage` | From path parameter (`KICK_OFF`, `REGRESSION`, `PRE_RELEASE`) |
| `artifactPath` | `null` (artifact is in TestFlight, not S3) |
| `testflightNumber` | `testflightBuildNumber` from request |
| `versionName` | `versionName` from request |
| `isUsed` | `false` (until task consumes it) |
| `usedByTaskId` | `null` (set when task consumes) |
| `usedByCycleId` | `null` (set for regression cycles) |

### When Task Consumes the Staging Entry

When the task (e.g., `TRIGGER_TEST_FLIGHT_BUILD`) executes:

1. **Checks staging table** for unused entries (`isUsed = false`)
2. **If found**: Marks staging entry as used, creates `builds` table entry
3. **If missing**: Sets task to `AWAITING_MANUAL_BUILD`, sends Slack notification

**Builds table entry created by task:**

| Column | Value |
|--------|-------|
| `id` | New build UUID |
| `tenantId` | From staging entry |
| `releaseId` | From staging entry |
| `platform` | `IOS` |
| `storeType` | `TESTFLIGHT` |
| `buildStage` | From staging entry |
| `buildType` | `MANUAL` |
| `buildUploadStatus` | `UPLOADED` |
| `testflightNumber` | From staging entry |
| `artifactPath` | `null` |
| `ciRunId` | `null` |
| `taskId` | ID of the consuming task |

**Notes:**
- Requires a valid App Store Connect integration configured for the tenant
- The integration must be verified and have valid API credentials
- Build must be fully processed by Apple (not in `PROCESSING` state)
- This endpoint communicates with Apple's App Store Connect API
- **Staging Table**: Entry is created in `release_uploads` staging table, NOT directly in `builds` table
- **Task Consumption**: The `builds` table entry is created later when the task executes and consumes from staging
- The build will be stored with `buildType: MANUAL` to distinguish from CI/CD-created builds
- `artifactPath` is `null` because the actual artifact is stored in TestFlight, not S3
- Calling this endpoint again creates a new staging entry (previous unused entries remain available)

**Error Responses:**

#### 400 Bad Request - Missing Fields
```json
{
  "success": false,
  "field": "releaseId",
  "error": "releaseId is required"
}
```

```json
{
  "success": false,
  "field": "testflightBuildNumber",
  "error": "testflightBuildNumber is required"
}
```

```json
{
  "success": false,
  "field": "versionName",
  "error": "versionName is required"
}
```

#### 400 Bad Request - Store Integration Issues
```json
{
  "success": false,
  "error": {
    "code": "STORE_INTEGRATION_NOT_FOUND",
    "message": "App Store Connect integration not found for tenant"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "STORE_INTEGRATION_INVALID",
    "message": "App Store Connect integration is not verified or invalid"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "VERSION_MISMATCH",
    "message": "TestFlight version does not match release version"
  }
}
```

#### 404 Not Found - Build Not Found
```json
{
  "success": false,
  "error": {
    "code": "TESTFLIGHT_BUILD_NOT_FOUND",
    "message": "TestFlight build not found in App Store Connect"
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Store controllers not initialized"
}
```

```json
{
  "success": false,
  "error": "Failed to verify TestFlight build"
}
```

**Error Codes Reference:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TESTFLIGHT_BUILD_NOT_FOUND` | 404 | Build number not found in TestFlight |
| `VERSION_MISMATCH` | 400 | Build version doesn't match expected version |
| `STORE_INTEGRATION_NOT_FOUND` | 400 | No App Store Connect integration configured |
| `STORE_INTEGRATION_INVALID` | 400 | App Store Connect credentials are invalid or expired |

**Flow Summary:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. User uploads build to TestFlight (outside this system)               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. POST /verify-testflight                                               │
│    → Verifies build exists in App Store Connect                         │
│    → Creates entry in `release_uploads` staging table                   │
│    → Returns uploadId, verified=true, platform status                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Task executes (e.g., TRIGGER_TEST_FLIGHT_BUILD)                       │
│    → Checks staging table (WHERE isUsed = false)                        │
│    → If all platforms ready:                                            │
│        - Marks staging entries: isUsed = true, usedByTaskId = taskId    │
│        - Creates `builds` table entries                                 │
│        - Task status: COMPLETED ✅                                       │
│    → If missing platforms:                                              │
│        - Task status: AWAITING_MANUAL_BUILD ⏳                           │
│        - Slack notification sent                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 21. List Build Artifacts
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/builds/artifacts`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**

**Query Parameters (all optional):**
- `platform` (string): Filter by platform: `IOS`, `ANDROID`, `WEB`
- `buildStage` (string): Filter by stage: `KICK_OFF`, `REGRESSION`, `PRE_RELEASE`
- `storeType` (string): Filter by store: `APP_STORE`, `PLAY_STORE`, `TESTFLIGHT`, `WEB`
- `buildType` (string): Filter by type: `MANUAL` or `CI_CD`
- `regressionId` (string): Filter by regression cycle ID
- `taskId` (string): Filter by task ID
- `workflowStatus` (string): CI/CD status: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`
- `buildUploadStatus` (string): Upload status: `PENDING`, `UPLOADING`, `UPLOADED`, `FAILED`

**Response (200 OK):**
```typescript
interface ListBuildArtifactsResponse {
  success: true;
  data: BuildArtifact[];  // Array of BuildArtifact objects (see Common Types)
}
```

**Notes:**
- **Data Source**: Reads from `builds` table (consumed builds from staging)
- **Download URLs**: Presigned S3 URLs expire after 1 hour
- **TestFlight Builds**: Will have `artifactPath: null` and `downloadUrl: null` (artifact is in TestFlight)
- **Manual vs CI/CD**: Use `buildType` filter to distinguish between upload sources
- **Regression Builds**: Use `regressionId` filter to get builds for a specific regression cycle
- **Ordering**: Results are ordered by `createdAt` descending (newest first)

**Error Responses:**

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Release not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to list build artifacts",
  "message": "Database connection error"
}
```

---

### 22. Delete Build Artifact
**DELETE** `/api/v1/tenants/{tenantId}/releases/{releaseId}/builds/artifacts/{uploadId}`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**
- `uploadId` (string, required): Upload ID (UUID) of the artifact to delete

**Response (200 OK):**
```typescript
interface DeleteBuildArtifactResponse {
  success: true;
  message: string;  // e.g., "Build artifact deleted successfully"
}
```

**Notes:**
- Deletes the artifact from S3 storage and removes the record from the `builds` table
- Cannot delete artifacts that are already consumed by tasks (validation on backend)
- After deletion, upload widget will be shown again for that platform/stage

**Error Responses:**

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Cannot delete artifact that is already consumed by a task"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Build artifact not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to delete build artifact",
  "message": "S3 deletion failed"
}
```

---

## Status APIs

### 23. Get Test Management Status
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/test-management-run-status`

### 24. Get Project Management Status
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/project-management/status`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | No | Filter by platform: `IOS`, `ANDROID`, `WEB`. If not provided, returns all platforms |

**Response:**

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

### 25. Get Cherry Pick Status
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/check-cherry-pick-status`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (user-facing identifier, e.g., "REL-001") |

**Response:**
```typescript
interface CherryPickStatusResponse {
  success: true;
  releaseId: string;
  cherryPickAvailable: boolean;  // true = cherry picks exist, false = commits match
}
```

**Notes:**
- `cherryPickAvailable: true` means the branch has diverged from the **latest regression cycle tag** (cherry picks exist)
- `cherryPickAvailable: false` means the branch HEAD matches the latest regression cycle tag (no cherry picks)
- Uses `SCMService` to compare:
  - Branch: `releases.branch`
  - Tag: `regression_cycles.cycleTag` (where `isLatest = true`)
- Returns 400 if release doesn't have SCM integration configured or no regression cycles exist

---

## Notification APIs

### 26. Get Release Notifications
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/notifications`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

**Response:**

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

### 27. Send Release Notification
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/notify`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

**Request Body:**

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

**Response:**

**Status Code:** `201 Created`

```typescript
interface SendNotificationResponse {
  success: true;
  notification: ReleaseNotification;  // Single notification record created
}
```

---

## Update APIs

### 28. Update What's New

> 🚧 **IN PROGRESS** - @Mohit is working on this. Contract details to be finalized.

**PUT** `/api/v1/tenants/{tenantId}/releases/{releaseId}/whats-new`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**

**Purpose:**

Updates the "What's New" content for a release (release notes).

---

## Activity & Logs

### 28. Get Activity Logs
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/activity-logs`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant UUID |
| `releaseId` | string | Yes | Release UUID (primary key in DB) |

**Query Parameters:**
- `limit?: number` (default: 50)
- `offset?: number` (default: 0)
- `stage?: TaskStage`
- `taskType?: TaskType`

**Response:**

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

## Release Management APIs

### 29. Pause Release
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/pause`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**

**Request:**
```typescript
interface PauseReleaseRequest {
  reason?: string;
  pausedBy: string;
}
```

**Response:**
```typescript
interface PauseReleaseResponse {
  success: boolean;
  message: string;
  releaseId: string;
  status: ReleaseStatus.PAUSED;
  pausedAt: string;
  pausedBy: string;
}
```

---

### 30. Resume Release
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/resume`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**

**Request:**
```typescript
interface ResumeReleaseRequest {
  resumedBy: string;
}
```

**Response:**
```typescript
interface ResumeReleaseResponse {
  success: boolean;
  message: string;
  releaseId: string;
  status: ReleaseStatus; // Previous status
  resumedAt: string;
  resumedBy: string;
}
```

**Notes:**
- Resume can be done using the pause API by setting appropriate status, but this separate endpoint provides clearer semantics
- Resuming a release restores it to its previous status before it was paused

---

### 31. Change Release Pilot
**PUT** `/api/v1/tenants/{tenantId}/releases/{releaseId}/pilot`

> ⚠️ **BACKEND PENDING** - This API will be added to the backend later.

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**

**Request:**
```typescript
interface ChangePilotRequest {
  pilotId: string; // User ID or email
  changedBy: string;
  reason?: string;
}
```

**Response:**
```typescript
interface ChangePilotResponse {
  success: boolean;
  message: string;
  previousPilotId?: string;
  newPilotId: string;
  changedAt: string;
  changedBy: string;
}
```

---

## Error Response Format

All APIs return errors in this format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}
```

---

## Notes

1. All timestamps are in ISO 8601 format (e.g., `2024-01-15T10:30:00Z`)
2. All stage APIs return `tasks: Task[]` as requested
3. The main release GET API includes `currentActiveStage` field
4. Task metadata and output are flexible objects to accommodate different task types
5. All APIs require authentication (tenantId and user context)

