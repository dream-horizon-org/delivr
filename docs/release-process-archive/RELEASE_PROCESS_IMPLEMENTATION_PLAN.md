# Release Process UI Implementation Plan (Updated)

## 1. Release Header/Banner Component

### Component: `ReleaseProcessHeader.tsx`

**Location:** `app/components/ReleaseProcess/ReleaseProcessHeader.tsx`

**Properties to Display:**

- Release branch
- Release version (per platform)
- Kickoff date
- Target release date
- Created by (user info)
- Release pilot (user info)
- Current active stage (badge)
- Release status (badge)

**Action Buttons (separate, not dropdown):**

- Pause/Resume Release button (conditional based on status)
- View Activity Log button (opens modal/drawer)
- Post Slack Message button (opens modal with message type selector)

**API Dependencies:**

- `GET /releases/{releaseId}` - Get release details
- `POST /releases/{releaseId}/pause` - Pause release
- `POST /releases/{releaseId}/resume` - Resume release
- `GET /releases/{releaseId}/activity` - Get activity log
- `POST /releases/{releaseId}/communications/slack` - Post Slack message

---

## 2. Manual Build Upload Widget

### Component: `ManualBuildUploadWidget.tsx`

**Location:** `app/components/ReleaseProcess/ManualBuildUploadWidget.tsx`

**Features:**

- File upload input (accepts .apk, .aab, .ipa, .dota files)
- Platform selector (if multiple platforms)
- Upload progress indicator
- Uploaded file display with remove option
- Validation (file type, size limits)

**Used in Tasks:**

1. **Pre-regression Build** (Kickoff stage) - if `hasManualBuildUpload = true`
2. **TestFlight Build** (Pre-Release stage) - if `hasManualBuildUpload = true` and iOS platform
3. **Android .AAB Build** (Pre-Release stage) - if `hasManualBuildUpload = true` and Android platform

**API Dependencies:**

- `POST /releases/{releaseId}/builds/upload` - Upload build file
- `DELETE /releases/{releaseId}/builds/{buildId}` - Remove uploaded build

---

## 3. Stage Components

### 3.1 Pre-Kickoff Stage

**Component:** `PreKickoffStage.tsx`

- Display pre-kickoff reminder task
- Show release details (read-only)
- Edit release button (if status is PENDING)
- No "Start Kickoff" button (automatic in backend)

### 3.2 Kickoff Stage

**Component:** `KickoffStage.tsx`

- Display tasks in sequence:
  - Task 1: Branch Fork (sequence 1)
  - Task 2: Pre-regression Builds (sequence 2, depends on 1)
  - Task 3: Project Management Ticket (sequence 1, parallel with 1)
  - Task 4: Test Management Run (sequence 1, parallel with 1)

**Task Dependency Handling:**

- Disable Task 2 until Task 1 completes
- Show "Waiting for Branch Fork..." status on Task 2
- Tasks 1, 3, 4 can run in parallel (no dependency UI needed)

**Manual Build Widget:**

- Show `ManualBuildUploadWidget` in Pre-regression Build task if `hasManualBuildUpload = true`

**Task Display:**

- Each task shows: status, external links (GitHub, Jira, Checkmate), retry button (subtle, only on failure)

### 3.3 Regression Stage

**Component:** `RegressionStage.tsx`

**Regression Cycles Display:**

- **No Active Cycle + No Upcoming Slot:** Show "No regression cycles scheduled"
- **No Active Cycle + Upcoming Slot:** Show "Next regression slot at: {datetime}"
- **Active Cycle:** Show current cycle details
- **Past Cycles:** Show all past cycles (accordion or expandable list)
- **Current Cycle Completed + Upcoming Slot:** Show both completed cycle and upcoming slot

**Current Cycle Tasks:**

- RC Tag
- Release Notes
- Regression Builds
- Automation Runs

**Manual Build Handling for Regression:**

- If `hasManualBuildUpload = true`:
  - Show upload widget for each platform target
  - Next slot won't start until all platforms have builds uploaded
  - Once uploaded, builds are "available" for next cycle
  - When slot time arrives, cycle is created and picks available builds
  - Builds are cleared after being picked
  - After cycle completes, user must upload for next cycle

**Approval Section:**

- Test Management Status (with link)
- Cherry Pick Status (with details)
- "Approve Regression" button (only enabled when cycle is completed and requirements met)

### 3.4 Pre-Release Stage

**Component:** `PostRegressionStage.tsx`

**Tasks:**

- TestFlight Build (iOS only) - with manual upload widget if manual
- Android .AAB Build (Android only) - with manual upload widget if manual
- DOTA .dota Build Upload - with manual upload widget if manual
- Concrete Release Tag & Notes
- Project Management Status (guardrail)

**Build Selection:**

- Dropdown to select from available builds (if CI/CD)
- Upload widget (if manual)

**PM Status Guardrail:**

- Show PM ticket status
- If not DONE, show warning and block progression
- If PM not configured, show manual approval option

**Action:**

- "Trigger Release Submission" button (enabled when all tasks complete)

### 3.5 Release Submission Stage

**Component:** `ReleaseSubmissionStage.tsx`

**Platform Sections (iOS/Android):**

- What's New input (per platform)
- Build selection dropdown (from available builds)
- Last release exposure status (Android only)
  - Show current exposure percentage
  - Toggle to increase to 100%
  - Warning if not increased

**Action:**

- "Submit Release" button → Changes status to `BUILD_SUBMITTED`

### 3.6 Release Stage

**Component:** `ReleaseStage.tsx`

- Distribution status per platform
- Activity log
- "Archive Release" button (if RELEASED)

---

## 4. Task Component with Dependencies

### Component: `TaskCard.tsx`

**Location:** `app/components/ReleaseProcess/TaskCard.tsx`

**Features:**

- Task status badge
- Task name and description
- Dependency indicator:
  - If task has unmet dependencies: show "Waiting for {taskName}..." message
  - Disable task actions until dependencies met
- External links (GitHub, Jira, Checkmate) - shown as icons/buttons
- Retry button (subtle, only visible on failure)
- Manual build upload widget (if applicable)
- Task output/metadata display (from spread fields)

---

## 5. Regression Cycle Components

### Component: `RegressionCycleCard.tsx`

**Location:** `app/components/ReleaseProcess/RegressionCycleCard.tsx`

**Features:**

- Cycle status badge
- Cycle datetime
- Cycle tasks list (grouped by releaseCycleId)
- Build info per platform
- Expandable/collapsible for past cycles

### Component: `RegressionCyclesList.tsx`

**Location:** `app/components/ReleaseProcess/RegressionCyclesList.tsx`

**Features:**

- Current active cycle (if exists)
- Upcoming slot display (if no active cycle or after current completes)
- Past cycles accordion/list
- Manual build upload section (if manual and no builds uploaded yet)

**Manual Build Upload Flow:**

1. Check if builds uploaded for all platform targets
2. If not, show upload widgets for missing platforms
3. Once all uploaded, show "Builds ready for next cycle"
4. When slot time arrives (backend), cycle is created and picks builds
5. After cycle completes, show upload widgets again for next cycle

---

## 6. Route Structure

### Main Route: `dashboard.$org.releases.$releaseId.tsx`

- Loads release details
- Determines current stage
- Renders `ReleaseProcessHeader`
- Conditionally renders stage component based on `currentActiveStage`

---

## 7. Service Layer & Hooks

### New Service: `release-process.service.ts`

**Location:** `app/.server/services/ReleaseProcess/release-process.service.ts`

**Methods:**

- `getReleaseStage(releaseId, stage)` - Get stage tasks
- `retryTask(releaseId, taskId)` - Retry failed task
- `uploadBuild(releaseId, file, platform, stage)` - Upload manual build
- `approveRegressionSlot(releaseId, slotId)` - Approve regression
- `submitRelease(releaseId, submissionData)` - Submit release

### New Hooks: `useReleaseProcess.ts`

**Location:** `app/hooks/useReleaseProcess.ts`

**Hooks:**

- `useReleaseStage(releaseId, stage)` - Get stage data
- `useRegressionSlots(releaseId)` - Get regression slots
- `useManualBuildUpload(releaseId, taskId, platform)` - Handle upload
- `useApproveRegression(releaseId)` - Approval mutation
- `useSubmitRelease(releaseId)` - Submission mutation

---

## 8. API Contract Structure - Stage-Wise Pattern

### Core Principle

**All stage APIs follow consistent structure:**

- Return `tasks: TaskInfo[]` array (always present, may be empty)
- Return `stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED'`
- Additional fields may be included per stage (e.g., `availableBuilds` for submission stage)

### TaskInfo Structure with Spread Metadata/Output

Each task has metadata and output fields spread/flattened for easy access:

```typescript
interface TaskInfo {
  taskId: string;
  taskType: TaskType;
  taskStage: TaskStage;
  status: TaskStatus;
  
  // Metadata fields (spread/flattened at top level based on task type)
  // Example for FORK_BRANCH:
  branchUrl?: string;
  commitId?: string;
  
  // Example for CREATE_PROJECT_MANAGEMENT_TICKET:
  ticketId?: string;
  ticketUrl?: string;
  platform?: string;
  
  // Example for CREATE_TEST_SUITE:
  testSuiteId?: string;
  testRunId?: string;
  runLink?: string;
  
  // Example for TRIGGER_PRE_REGRESSION_BUILDS:
  builds?: Array<{
    buildId: string;
    platform: string;
    queueId?: string;
    status: string;
  }>;
  
  // Output fields (in output object, may also be spread)
  output?: {
    [key: string]: any; // Task-specific output data
  };
  
  // For regression tasks - links to cycle (when cycle exists)
  releaseCycleId?: string;
  
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
```

### Regression Stage Special Handling

**No Active Cycle:**

- `tasks: []` (empty array)
- Frontend shows "No active regression cycle" or "Next regression slot at: {datetime}"

**Active Cycle Exists:**

- `tasks: TaskInfo[]` with each task having `releaseCycleId` field
- Frontend groups tasks by `releaseCycleId` to display cycles
- Each cycle shows its tasks grouped together

**Cycle Grouping Logic:**

```typescript
// Group tasks by releaseCycleId
const tasksByCycle = tasks.reduce((acc, task) => {
  const cycleId = task.releaseCycleId || 'no-cycle';
  if (!acc[cycleId]) acc[cycleId] = [];
  acc[cycleId].push(task);
  return acc;
}, {} as Record<string, TaskInfo[]>);

// Display: Active cycle, Past cycles (grouped), Upcoming slot
```

### Stage API Response Pattern

```typescript
interface StageTasksResponse {
  stage: TaskStage;
  releaseId: string;
  tasks: TaskInfo[];  // Always present (may be empty for regression if no active cycle)
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  // Additional fields per stage:
  // - Regression: slotId?
  // - Submission: availableBuilds?
  // - Release: distributionStatus?
}
```

---

## 9. Complete API List with Request/Response Templates (Final Consolidated List)

**Total: 24 APIs**

### Core Release APIs

#### 1. Get Release Details

**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}`

**Response:**

```typescript
interface ReleaseDetailsResponse {
  releaseId: string;
  branch: string;
  baseBranch: string;
  releaseType: string;
  status: ReleaseStatus;
  currentActiveStage: TaskStage | null;
  kickOffDate: string; // ISO 8601
  targetReleaseDate: string; // ISO 8601
  releaseDate?: string; // ISO 8601
  // we will also gets current Phase, based on which we wll take certain decidion
  platformTargets: Array<{
    platform: string;
    version: string;
  }>;
  tasks: TaskInfo[]; // All tasks across all stages
  createdAt: string;
  updatedAt: string;
}
```

---

### Stage APIs (All return `tasks: TaskInfo[]` + `stageStatus`)

#### 2. Get Pre-Kickoff Stage Tasks - NO api needed as no tasks, its a not started stage.




#### 3. Get Kickoff Stage Tasks

**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/kickoff`

**Response:**

```typescript
interface StageTasksResponse {
  stage: TaskStage.KICKOFF;
  releaseId: string;
  tasks: TaskInfo[];
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
}
```

**Expected Tasks:**

- FORK_BRANCH (metadata: branchUrl, commitId)
- CREATE_PROJECT_MANAGEMENT_TICKET (metadata: ticketId, ticketUrl, platform)
- CREATE_TEST_SUITE (metadata: testSuiteId, testRunId, runLink)
- TRIGGER_PRE_REGRESSION_BUILDS (metadata: builds array)

#### 4. Get Regression Stage Tasks

**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/regression`

**Response:**

```typescript
interface RegressionStageResponse {
  stage: TaskStage.REGRESSION;
  releaseId: string;
  tasks: TaskInfo[]; // Empty [] if no active cycle, or tasks grouped by releaseCycleId if cycles exist
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  
  // All regression cycles (past and current)
  cycles: Array<{
    cycleId: string;
    slotIndex: number;
    slotDateTime: string; // Original slot time (ISO 8601)
    status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'ABANDONED';
    tag?: string;
    commitId?: string;
    createdAt: string;
    completedAt?: string;
  }>;
  
  // Current active cycle (if exists)
  currentCycle?: {
    cycleId: string;
    slotIndex: number;
    slotDateTime: string;
    status: 'ACTIVE' | 'PAUSED';
    tag?: string;
    commitId?: string;
  };
  
  // Approval information (for stage-level approval)
  approvalStatus: {
    canApprove: boolean; // True if current cycle completed and requirements met
    approvalRequirements: {
      testManagementPassed: boolean;
      cherryPickStatusOk: boolean; // No new cherry picks found
      buildsCompleted: boolean;
      cycleCompleted: boolean; // Current cycle must be completed
    };
  };
  
  // Available builds for next cycle (if no active cycle or after current completes)
  availableBuilds?: {
    builds: BuildInfo[]; // Builds uploaded and ready to be picked
    buildsRequired: string[]; // Platform targets that still need builds
    allBuildsUploaded: boolean; // Whether all required platforms have builds
  };
  
  // Upcoming slot info (if no active cycle)
  upcomingSlot?: {
    slotDateTime: string; // ISO 8601
    requiresBuilds: string[]; // Platforms that need builds uploaded
  };
}
```

**Note:** All cycle, approval, and build information comes from this single API. No separate cycle/slot APIs needed.

**Expected Tasks (when cycle exists):**

- RESET_TEST_SUITE (only for subsequent slots)
- CREATE_RC_TAG (metadata: tag, commitId)
- CREATE_RELEASE_NOTES (metadata: notesUrl)
- TRIGGER_REGRESSION_BUILDS (metadata: builds array with build info)
- TRIGGER_AUTOMATION_RUNS
- AUTOMATION_RUNS (metadata: runId, results)
- SEND_REGRESSION_BUILD_MESSAGE

#### 5. Get Post-Regression Stage Tasks

**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/post-regression`

**Response:**

```typescript
interface StageTasksResponse {
  stage: TaskStage.POST_REGRESSION;
  releaseId: string;
  tasks: TaskInfo[];
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
}
```

**Expected Tasks:**

- PRE_RELEASE_CHERRY_PICKS_REMINDER
- TEST_FLIGHT_BUILD (metadata: buildNumber, testFlightBuildNumber)
- CREATE_RELEASE_TAG (metadata: tag, commitId)
- CREATE_FINAL_RELEASE_NOTES (metadata: notesUrl)
- SEND_POST_REGRESSION_MESSAGE
- ADD_L6_APPROVAL_CHECK
- ANother android release builds also will be present here


```

```

---

### Action APIs

#### 8. Retry Task

**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/tasks/{taskId}/retry`

**Request:**

```typescript
interface RetryTaskRequest {
  // Empty body or optional parameters
}
```

**Response:**

```typescript
interface RetryTaskResponse {
  success: boolean;
  message: string;
  task: TaskInfo;
}
```

#### 9. Update Release

**PUT** `/api/v1/tenants/{tenantId}/releases/{releaseId}`

**Request:**

```typescript
interface UpdateReleaseRequest {
  // Status change (for pause/resume)
  status?: ReleaseStatus.PAUSED | ReleaseStatus; // Set to PAUSED to pause, or previous status to resume
  pauseReason?: string; // Required when pausing
  updatedBy: string;
  
  // Other editable fields (only for UPCOMING releases before kickoff)
  branch?: string;
  baseBranch?: string;
  targetReleaseDate?: string; // ISO 8601
  platformTargets?: Array<{
    platform: string;
    version: string;
  }>;
  regressionBuildSlots?: Array<{
    daysFromKickoff: number;
    time: string; // HH:mm format
  }>;
  
  // For releases after kickoff - only targetReleaseDate and regression slots
  // (same fields as above, but limited based on release status)
}
```

**Response:**

```typescript
interface UpdateReleaseResponse {
  success: boolean;
  message: string;
  releaseId: string;
  release: ReleaseDetailsResponse;
  updatedAt: string;
  updatedBy: string;
}
```

**Note:**

- To pause: Set `status: ReleaseStatus.PAUSED` with `pauseReason`
- To resume: Set `status` to the previous status (before pause)
- Field editability depends on release status (UPCOMING vs after kickoff)

#### 10. Approve Regression Stage

**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/regression/approve`

**Request:**

```typescript
interface ApproveRegressionStageRequest {
  approvedBy: string;
  comments?: string;
  forceApprove?: boolean; // Override requirements (not recommended)
}
```

**Response:**

```typescript
interface ApproveRegressionStageResponse {
  success: boolean;
  message: string;
  releaseId: string;
  approvedAt: string;
  approvedBy: string;
  nextStage: TaskStage.POST_REGRESSION;
}
```

**Approval Requirements:**

- There must be an active regression cycle
- The active cycle must be completed
- No new cherry picks found (cherry pick status must be OK)
- Test management status must be passed (if applicable)
- All regression builds must be completed

**Note:**

- Approval is at the regression stage level, not individual slot level. User (release pilot) can approve before the next slot starts.
- **Approving the regression stage automatically triggers the POST_REGRESSION stage** - no separate trigger API needed.
- **Approving the regression stage automatically triggers the POST_REGRESSION stage** - no separate trigger API needed.

<!-- #### 11. Abandon Regression Cycle

**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/regression-cycles/{cycleId}/abandon`

**Request:**

```typescript
interface AbandonRegressionCycleRequest {
  abandonedBy: string;
  reason: string; // Required reason for abandoning
}
```

**Response:**

```typescript
interface AbandonRegressionCycleResponse {
  success: boolean;
  message: string;
  cycleId: string;
  abandonedAt: string;
  abandonedBy: string;
  reason: string;
} --> Will be picked later
```

**Note:** This abandons the active regression cycle. The cycle status will be set to ABANDONED.

#### 12. Trigger Pre-Release Completion

**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/post-regression/complete`

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
  nextStage: TaskStage.RELEASE_SUBMISSION;
}
```

```

---

### Build Management APIs

#### 14. Get All Builds (Overview)

**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/builds`

**Query Parameters:**

- `stage?: TaskStage`
- `platform?: 'IOS' | 'ANDROID' | 'WEB'`
- `status?: string`

**Response:**

```typescript
interface BuildsResponse {
  releaseId: string;
  builds: BuildInfo[];
  total: number;
}
```

**Note:** Individual build details come from task metadata in stage APIs. This API is for overview/aggregation only.

#### 15. Upload Build (Manual)

**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/builds/upload`

**Request:** (Multipart Form Data)

```
file: File (.apk, .aab, .ipa, .dota)
platform: 'IOS' | 'ANDROID' | 'WEB'
stage: TaskStage - regression IOS / ANdroid
taskId: string
```

**Response:**

```typescript
interface UploadBuildResponse {
  success: boolean;
  message: string;
  buildId: string;
  build: BuildInfo;
}
```

#### 16. Delete Build

**DELETE** `/api/v1/tenants/{tenantId}/releases/{releaseId}/builds/{buildId}`

**Response:**

```typescript
interface DeleteBuildResponse {
  success: boolean;
  message: string;
}
```

---

### Status Check APIs

#### 17. Get Test Management Status

**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/test-management/status`

**Query Parameters:**

- `platform?: 'IOS' | 'ANDROID'`
- `cycleId?: string` // For regression cycles

**Response:**

```typescript
interface TestManagementStatusResponse {
  releaseId: string;
  cycleId?: string;
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
    thresholdPassed: boolean;
  };
  runLink?: string;
  lastUpdated: string;
}
```

#### 18. Get Project Management Status

**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/project-management/status`

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
    isDone: boolean; // Guardrail check
  }>;
  allTicketsDone: boolean; // For guardrail
  lastUpdated: string;
}
```

#### 19. Get Cherry Pick Status

**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/cherry-picks/status`

**Response:**

```typescript
interface CherryPickStatusResponse {
  releaseId: string;
  status: 'OK' | 'PENDING' | 'MISMATCH';
  latestCommitId: string;
  latestReleaseTag: string;
  commitIdsMatch: boolean; // Whether latest commit == latest tag
  pendingCherryPicks: Array<{
    cherryPickId: string;
    commitHash: string;
    branch: string;
    status: string;
    createdAt: string;
  }>;
  lastUpdated: string;
}
```

---

### Communication APIs

#### 20. Get Communication Info

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

#### 21. Post Slack Message

**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/communications/slack`

**Request:**

```typescript
interface PostSlackMessageRequest {
  messageType: MessageTypeEnum;// Optional, overrides default template
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

### Update APIs

---

### Activity & Logs

#### 23. Fetch Activity Log

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

**Total: 24 APIs**

### Important API Design Notes

**Build Information:**

- Build details are included in task metadata from stage APIs, not separate build-type APIs
- Pre-regression builds: `TRIGGER_PRE_REGRESSION_BUILDS` task includes `builds` array in metadata
- TestFlight builds: `TEST_FLIGHT_BUILD` task includes build info in metadata
- Regression builds: `TRIGGER_REGRESSION_BUILDS` task includes `builds` array in metadata
- Android .AAB builds: Task metadata includes build info
- Available builds info (buildsRequired, allBuildsUploaded) comes from regression stage API `availableBuilds` field

**Regression Cycles vs Slots:**

- Slots are scheduled times (from release config)
- Cycles are actual execution instances created when slot time arrives
- All cycle information comes from regression stage API (cycles array, currentCycle, approvalStatus)
- Cycle task details come from regression stage API tasks, grouped by `releaseCycleId`
- No separate cycle/slot APIs needed

**Removed/Consolidated APIs:**

- Get Pre-Regression Builds → Use task metadata from kickoff stage
- Get TestFlight Builds → Use task metadata from post-regression stage
- Get Available Builds for Cycle → Use `availableBuilds` field in regression stage API
- Get Regression Slots → Use `cycles` array in regression stage API
- Get Current Regression Slot → Use `currentCycle` and `approvalStatus` in regression stage API
- Pause Release → Use Update Release API with `status: PAUSED`
- Resume Release → Use Update Release API with previous status
- Approve Regression Slot → Replaced with Approve Regression Stage (API #10)
- Trigger Pre-Release → Removed (approving regression stage automatically triggers POST_REGRESSION stage)

### Error Response Format (All APIs)

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}
```

### Error Response Format (All APIs)

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}
```