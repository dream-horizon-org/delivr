# Release Process API Contract

## Overview
API contract for the release process that starts after a release is created. The release is divided into 5 stages: Pre-Kickoff, Kickoff, Regression, Pre-Release, and Release.

---

## Common Types

### TaskInfo
```typescript
interface TaskInfo {
  taskId: string;
  taskType: TaskType;
  taskStage: TaskStage;
  status: TaskStatus;
  metadata: TaskMetadata;
  output?: TaskOutput;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  startedAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  error?: string;
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

---

## Core APIs

### 1. Get Release Details
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}`

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
  tasks: TaskInfo[]; // All tasks across all stages
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
  tasks: TaskInfo[];
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}
```

### 3. Get Kickoff Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/kickoff`

**Response:**
```typescript
interface StageTasksResponse {
  stage: TaskStage.KICKOFF;
  releaseId: string;
  tasks: TaskInfo[];
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}
```

**Expected Tasks:**
- `PRE_KICK_OFF_REMINDER`
- `FORK_BRANCH`
- `CREATE_PROJECT_MANAGEMENT_TICKET`
- `CREATE_TEST_SUITE`
- `TRIGGER_PRE_REGRESSION_BUILDS`

### 4. Get Regression Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/regression`

**Query Parameters:**
- `slotId?: string` - For specific regression slot

**Response:**
```typescript
interface StageTasksResponse {
  stage: TaskStage.REGRESSION;
  releaseId: string;
  slotId?: string; // For subsequent regression slots
  tasks: TaskInfo[];
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  canProceed: boolean; // Whether user can proceed to next stage
  blockingTasks?: string[]; // Task IDs blocking progression
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

### 5. Get Post-Regression (Pre-Release) Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/post-regression`

**Response:**
```typescript
interface StageTasksResponse {
  stage: TaskStage.POST_REGRESSION;
  releaseId: string;
  tasks: TaskInfo[];
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}
```

**Expected Tasks:**
- `PRE_RELEASE_CHERRY_PICKS_REMINDER`
- `TEST_FLIGHT_BUILD`
- `CREATE_RELEASE_TAG`
- `CREATE_FINAL_RELEASE_NOTES`
- `SEND_POST_REGRESSION_MESSAGE`
- `ADD_L6_APPROVAL_CHECK`

### 6. Get Release Submission Stage Tasks
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/release-submission`

**Response:**
```typescript
interface ReleaseSubmissionStageResponse {
  stage: TaskStage.RELEASE_SUBMISSION;
  releaseId: string;
  tasks: TaskInfo[];
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
  tasks: TaskInfo[];
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

**Response:**
```typescript
interface RetryTaskResponse {
  success: boolean;
  message: string;
  task: TaskInfo;
}
```

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
  tasks: TaskInfo[];
}
```

### 12. Approve Regression
**POST** `/api/v1/tenants/{tenantId}/releases/{releaseId}/stages/regression/approve`

**Request:**
```typescript
interface ApproveRegressionRequest {
  regressionSlotId?: string; // Optional, for specific regression slot
  approvedBy: string; // User ID or email
  comments?: string;
}
```

**Response:**
```typescript
interface ApproveRegressionResponse {
  success: boolean;
  message: string;
  regressionSlotId: string;
  approvedAt: string;
  approvedBy: string;
}
```

### 13. Trigger Pre-Release Completion
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
  nextStage: TaskStage.RELEASE;
}
```

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

## Status APIs

### 19. Get Test Management Status
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

### 20. Get Project Management Status
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

### 21. Get Cherry Pick Status
**GET** `/api/v1/tenants/{tenantId}/releases/{releaseId}/cherry-picks/status`

**Response:**
```typescript
interface CherryPickStatusResponse {
  releaseId: string;
  status: 'OK' | 'PENDING' | 'MISMATCH'; // NEW statuses
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

## Communication APIs

### 22. Get Communication Info
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

### 23. Post Slack Message
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

### 24. Update What's New
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

### 25. Change Release Pilot
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

### 26. Fetch Activity Log
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
2. All stage APIs return `tasks: TaskInfo[]` as requested
3. The main release GET API includes `currentActiveStage` field
4. Task metadata and output are flexible objects to accommodate different task types
5. All APIs require authentication (tenantId and user context)

