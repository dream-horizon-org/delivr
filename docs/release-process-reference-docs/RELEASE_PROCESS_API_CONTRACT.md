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
// ✅ CORRECT - Using primary key
const response = await apiGet(`/api/v1/tenants/${tenantId}/releases/${release.id}/tasks`);

// ❌ WRONG - Using user-facing identifier
const response = await apiGet(`/api/v1/tenants/${tenantId}/releases/${release.releaseId}/tasks`);
```

**All API endpoints expect `release.id` (the primary key UUID) in the `{releaseId}` path parameter.**

---

## Common Types

### Task
```typescript
interface Task {
  taskId: string;
  taskType: TaskType;
  taskStage: TaskStage;
  status: TaskStatus;
  metadata: TaskMetadata;
  output?: TaskOutput;
  builds?: BuildInfo[]; // Builds associated with this task (for Kickoff/Regression/Post-Regression build tasks)
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### TaskMetadata
```typescript
interface TaskMetadata {
  [key: string]: any; // Flexible metadata per task type
}
```

### TaskOutput
```typescript
interface TaskOutput {
  [key: string]: any; // Task-specific output data
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
interface ReleaseDetailsResponse {
  releaseId: string;
  branch: string;
  baseBranch: string;
  releaseType: string;
  status: ReleaseStatus; // Backend status enum
  currentActiveStage: TaskStage | null;
  currentRegressionSlot?: {
    slotId: string;
    slotIndex: number;
    status: string;
  };
  kickOffDate: string; // ISO 8601
  targetReleaseDate: string; // ISO 8601
  releaseDate?: string; // ISO 8601
  platformTargets: Array<{
    platform: string;
    version: string;
  }>;
  tasks: Task[]; // All tasks across all stages
  builds?: Array<{
    buildId: string;
    platform: string;
    stage: TaskStage;
    status: string;
  }>; // All builds for this release
  regressionSlots?: Array<{
    slotId: string;
    slotIndex: number;
    status: string;
  }>; // All regression slots
  createdAt: string;
  updatedAt: string;
}
```

---

## Stage-Specific APIs

### 2. Get Pre-Kickoff Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/pre-kickoff`

**Response:**
```typescript
interface StageTasksResponse {
  stage: TaskStage.PRE_KICKOFF;
  releaseId: string;
  tasks: Task[];
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}
```

### 3. Get Kickoff Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/kickoff`

**Response:**
```typescript
interface StageTasksResponse {
  success: true;
  stage: TaskStage.KICKOFF;
  releaseId: string;
  tasks: Task[];
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}
```

**Expected Tasks:**
- `PRE_KICK_OFF_REMINDER`
- `FORK_BRANCH`
- `CREATE_PROJECT_MANAGEMENT_TICKET`
- `CREATE_TEST_SUITE`
- `TRIGGER_PRE_REGRESSION_BUILDS`

**Build Information:**
- Tasks with `taskType: TRIGGER_PRE_REGRESSION_BUILDS` will include `builds: BuildInfo[]` when builds are available
- Each `BuildInfo` contains `artifactPath` for download links
- Builds are grouped by platform (ANDROID, IOS, WEB)

### 4. Get Regression Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/regression`

**Response:**
```typescript
interface RegressionStageTasksResponse {
  success: true;
  stage: TaskStage.REGRESSION;
  releaseId: string;
  tasks: Task[];
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  
  // Regression-specific fields
  cycles: RegressionCycle[];
  currentCycle: RegressionCycle | null;
  approvalStatus: ApprovalStatus;
  availableBuilds: BuildInfo[];
  upcomingSlot: RegressionSlot[] | null;
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

**Expected Tasks:**
- `RESET_TEST_SUITE` (only for subsequent slots)
- `CREATE_RC_TAG`
- `CREATE_RELEASE_NOTES`
- `TRIGGER_REGRESSION_BUILDS`
- `TRIGGER_AUTOMATION_RUNS`
- `AUTOMATION_RUNS`
- `SEND_REGRESSION_BUILD_MESSAGE`

**Build Information:**
- Tasks with `taskType: TRIGGER_REGRESSION_BUILDS` will include `builds: BuildInfo[]` when builds are available
- Each `BuildInfo` contains `artifactPath` for download links
- Builds are grouped by platform (ANDROID, IOS, WEB)

### 5. Get Post-Regression (Pre-Release) Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/post-regression`

**Response:**
```typescript
interface StageTasksResponse {
  success: true;
  stage: TaskStage.POST_REGRESSION;
  releaseId: string;
  tasks: Task[];
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}
```

**Expected Tasks:**
- `PRE_RELEASE_CHERRY_PICKS_REMINDER`
- `TEST_FLIGHT_BUILD`
- `CREATE_RELEASE_TAG`
- `CREATE_FINAL_RELEASE_NOTES`
- `SEND_POST_REGRESSION_MESSAGE`
- `ADD_L6_APPROVAL_CHECK`

**Build Information:**
- Tasks with `taskType: TRIGGER_TEST_FLIGHT_BUILD` (iOS) will include `builds: BuildInfo[]` when builds are available
  - Each iOS `BuildInfo` contains `testflightNumber` for TestFlight link generation
  - `storeType` will be `'TESTFLIGHT'`
- Tasks with `taskType: CREATE_AAB_BUILD` (Android) will include `builds: BuildInfo[]` when builds are available
  - Each Android `BuildInfo` contains `internalTrackLink` for Play Store Internal Track link
  - `storeType` will be `'PLAY_STORE'`
- Builds are grouped by platform for display

### 6. Get Release Submission Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/release-submission`

**Response:**
```typescript
interface ReleaseSubmissionStageResponse {
  stage: TaskStage.RELEASE_SUBMISSION;
  releaseId: string;
  tasks: Task[];
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  availableBuilds: Array<{
    buildId: string;
    platform: 'IOS' | 'ANDROID';
    version: string;
    buildNumber: string;
    createdAt: string;
  }>;
}
```

### 7. Get Release Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/release`

**Response:**
```typescript
interface ReleaseStageResponse {
  stage: TaskStage.RELEASE;
  releaseId: string;
  tasks: Task[];
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  distributionStatus: Array<{
    platform: 'IOS' | 'ANDROID' | 'WEB';
    status: 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RELEASED';
    submittedAt?: string;
    releasedAt?: string;
  }>;
}
```

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

### 9. Pause Release
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/pause`

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

### 10. Resume Release
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/resume`

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

### 11. Trigger Pre-Release
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/post-regression/trigger`

**Request:**
```typescript
interface TriggerPreReleaseRequest {
  // Empty body or optional parameters
}
```

**Response:**
```typescript
interface TriggerPreReleaseResponse {
  success: boolean;
  message: string;
  stage: TaskStage.POST_REGRESSION;
  tasks: Task[];
}
```

### 12. Approve Regression
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/regression/approve`

**Request:**
```typescript
interface ApproveRegressionRequest {
  approvedBy: string; // Account ID of approver (required)
  comments?: string; // Optional approval comments
  forceApprove?: boolean; // Override requirements (not recommended)
}
```

**Response:**
```typescript
interface ApproveRegressionResponse {
  success: true;
  message: string; // "Regression stage approved and Post-Regression stage triggered successfully"
  releaseId: string; // Release UUID
  approvedAt: string; // ISO 8601 timestamp
  approvedBy: string; // Account ID of approver
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
  success: boolean;
  message: string;
  nextStage: TaskStage.RELEASE;
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

### 16. Get Regression Slots
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/regression-slots`

**Response:**
```typescript
interface RegressionSlotsResponse {
  releaseId: string;
  slots: Array<{
    slotId: string;
    slotIndex: number;
    status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
    tag?: string;
    commitId?: string;
  }>;
  currentSlotIndex: number;
  approvalStatus: boolean;
}
```

### 17. Approve Regression Slot
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/regression-slots/{slotId}/approve`

**Request:**
```typescript
interface ApproveRegressionSlotRequest {
  approvedBy: string;
  comments?: string;
  forceApprove?: boolean; // Override requirements
}
```

**Response:**
```typescript
interface ApproveRegressionSlotResponse {
  success: boolean;
  message: string;
  slotId: string;
  approvedAt: string;
  approvedBy: string;
  nextStage?: TaskStage;
}
```

### 18. Get Builds
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/builds`

**Query Parameters:**
- `stage?: TaskStage`
- `platform?: 'IOS' | 'ANDROID' | 'WEB'`
- `status?: string`

**Response:**
```typescript
interface BuildsResponse {
  releaseId: string;
  builds: Array<{
    buildId: string;
    platform: 'IOS' | 'ANDROID' | 'WEB';
    stage: TaskStage;
    buildEnvironment: 'TESTFLIGHT' | 'PR' | 'REGRESSION' | 'RELEASE';
    status: 'PENDING' | 'TRIGGERED' | 'IN_PROGRESS' | 'WAITING' | 'SUCCESS' | 'FAILED';
    info: {
      queueId?: string;
      jobId?: string;
      artifactLink?: string;
      buildNumber?: string;
    };
  }>;
  total: number;
}
```
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/release/promote`

**Request:**
```typescript
interface PromoteBuildRequest {
  buildId: string;
  platform: 'IOS' | 'ANDROID';
  promotedBy: string; // User ID or email
}
```

**Response:**
```typescript
interface PromoteBuildResponse {
  success: boolean;
  message: string;
  buildId: string;
  platform: string;
  promotedAt: string;
  promotedBy: string;
}
```

---

## Build Management APIs

### 19. Upload Manual Build
**PUT** `/tenants/{tenantId}/releases/{releaseId}/stages/{stage}/builds/{platform}`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**
- `stage` (string, required): Release stage: `KICK_OFF`, `REGRESSION`, or `PRE_RELEASE`
- `platform` (string, required): Platform: `IOS`, `ANDROID`, or `WEB`

**Description:**
Used when `hasManualBuildUpload = true` on a release. This endpoint allows users to manually upload build artifacts instead of relying on CI/CD pipelines.

**Request:**
- Content-Type: `multipart/form-data`
- Form Field: `artifact` (File, required) - Build artifact file (max 500MB)

**Response (200 OK):**
```typescript
interface BuildUploadResponse {
  success: true;
  data: {
    uploadId: string;                      // UUID of the created upload record
    platform: string;                      // Platform that was uploaded
    stage: string;                         // Stage the upload is for
    downloadUrl: string;                   // S3 download URL for the artifact
    internalTrackLink: string | null;      // Internal track link (Android AAB only)
    uploadedPlatforms: string[];            // List of platforms with uploads for this stage
    missingPlatforms: string[];            // List of platforms still pending upload
    allPlatformsReady: boolean;            // `true` if all required platforms have been uploaded
  };
}
```

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
**POST** `/tenants/{tenantId}/releases/{releaseId}/stages/{stage}/builds/ios/verify-testflight`

**Path Parameters:**
- `tenantId` (string, required): Tenant UUID
- `releaseId` (string, required): Release primary key (UUID) - **NOT the user-facing identifier**
- `stage` (string, required): Release stage: `KICK_OFF`, `REGRESSION`, or `PRE_RELEASE`

**Description:**
Verifies an iOS build exists in TestFlight via App Store Connect API and **stages the verified build** in the `release_uploads` staging table.

**Request:**
- Content-Type: `application/json`
- Body:
```typescript
{
  testflightBuildNumber: string;  // The build number to verify in TestFlight
  versionName: string;            // The version string to match (e.g., "1.2.3")
}
```

**Response (200 OK):**
```typescript
interface VerifyTestFlightResponse {
  success: true;
  data: {
    uploadId: string;                      // Unique ID of the staging entry
    releaseId: string;                     // UUID of the associated release
    platform: 'IOS';                       // Always IOS for TestFlight builds
    stage: string;                         // Release stage
    testflightNumber: string;               // The verified TestFlight build number
    versionName: string;                    // Version string of the build
    verified: boolean;                      // Always `true` on success
    isUsed: boolean;                        // `false` until task consumes this entry
    uploadedPlatforms: string[];            // Platforms with uploads staged for this stage
    missingPlatforms: string[];             // Platforms still pending upload
    allPlatformsReady: boolean;            // `true` if all required platforms have been staged
    createdAt: string;                      // ISO 8601 timestamp
  };
}
```

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
**GET** `/tenants/{tenantId}/releases/{releaseId}/builds/artifacts`

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
**DELETE** `/tenants/{tenantId}/releases/{releaseId}/builds/artifacts/{uploadId}`

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
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/test-management/status`

**Response:**
```typescript
interface TestManagementStatusResponse {
  releaseId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  testSuiteId?: string;
  testRunId?: string;
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  lastUpdated: string;
}
```

**Query Parameters:**
- `platform?: 'IOS' | 'ANDROID'`
- `slotId?: string`

**Response:**
```typescript
interface TestManagementStatusResponse {
  releaseId: string;
  slotId?: string;
  platform?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  testSuiteId?: string;
  testRunId?: string;
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    archived: number;
    thresholdPassed: boolean; // NEW
  };
  runLink?: string;
  lastUpdated: string;
}
```

### 24. Get Project Management Status
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/project-management/status`

**Response:**
```typescript
interface ProjectManagementStatusResponse {
  releaseId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  ticketId?: string;
  ticketUrl?: string;
  ticketStatus?: string;
  lastUpdated: string;
}
```

**Response:**
```typescript
interface ProjectManagementStatusResponse {
  releaseId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  tickets: Array<{
    platform?: string;
    ticketId: string;
    ticketUrl: string;
    ticketStatus: string;
    isDone: boolean; // NEW - guardrail check
  }>;
  allTicketsDone: boolean; // NEW - for guardrail
  lastUpdated: string;
}
```

### 25. Get Cherry Pick Status
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/check-cherry-pick-status`

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

## Communication APIs

### 26. Get Communication Info
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/communications`

**Response:**
```typescript
interface CommunicationsResponse {
  releaseId: string;
  messages: Array<{
    messageId: string;
    messageType: MessageTypeEnum;
    channel: string; // Slack channel, email, etc.
    status: 'PENDING' | 'SENT' | 'FAILED';
    sentAt?: string;
    content?: string;
  }>;
}
```

### 27. Post Slack Message
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/communications/slack`

**Request:**
```typescript
interface PostSlackMessageRequest {
  messageType: MessageTypeEnum;
  channel?: string; // Optional, uses default if not provided
  customMessage?: string; // Optional, overrides default template
}
```

**Response:**
```typescript
interface PostSlackMessageResponse {
  success: boolean;
  messageId: string;
  messageType: MessageTypeEnum;
  channel: string;
  sentAt: string;
}
```

---

## Update APIs

### 28. Update What's New
**PUT** `/api/v1/tenants/{tenantId}/releases/{releaseId}/whats-new`

**Request:**
```typescript
interface UpdateWhatsNewRequest {
  whatsNew: string;
  platform?: 'IOS' | 'ANDROID'; // Optional, if platform-specific
  updatedBy: string;
}
```

**Response:**
```typescript
interface UpdateWhatsNewResponse {
  success: boolean;
  message: string;
  whatsNew: string;
  updatedAt: string;
  updatedBy: string;
}
```

### 29. Change Release Pilot
**PUT** `/api/v1/tenants/{tenantId}/releases/{releaseId}/pilot`

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

## Activity & Logs

### 30. Fetch Activity Log
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/activity`

**Query Parameters:**
- `limit?: number` (default: 50)
- `offset?: number` (default: 0)
- `stage?: TaskStage`
- `taskType?: TaskType`

**Response:**
```typescript
interface ActivityLogResponse {
  releaseId: string;
  activities: Array<{
    activityId: string;
    timestamp: string;
    stage: TaskStage;
    taskType?: TaskType;
    action: string;
    performedBy: string;
    details?: Record<string, any>;
  }>;
  total: number;
  limit: number;
  offset: number;
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

