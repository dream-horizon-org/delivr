# Release Process UI Implementation Plan

## Overview

Complete redevelopment of Release Process UI from scratch, following backend implementation patterns from RELEASE_STATUS_GUIDE.md, MANUAL_BUILD_UPLOAD_FLOW.md, and DISTRIBUTION_UI_FLOW_SPEC.md. Uses hybrid approach: existing release APIs stay on backend, new release process APIs use mock server.

## Critical Implementation Guidelines

### 1. Component Architecture

- **Small and Structured Components**: Each component should be <250 lines, single responsibility
- **Component Structure**: One component per file, extract sub-components when needed
- **Reusability**: Check existing Mantine components before creating custom ones
- **File Organization**: `app/components/ReleaseProcess/` folder with sub-folders per feature

### 2. Constants, Enums, and Types Organization

- **Constants**: All in `app/constants/release-process.ts` (or separate files if large)
- **Enums**: All in `app/types/release-process-enums.ts`
- **Interfaces/Types**: All in `app/types/release-process.types.ts`
- **NO hardcoded strings**: Use constants for all UI text, status values, API endpoints
- **NO inline types**: All types must be in types folder, imported properly

### 3. Theme and Styling

- **Use Existing Mantine Theme**: 
  - Primary color: `brand.5` (#14b8a6 - teal)
  - Text colors: `slate.7` (primary), `slate.5` (secondary), `slate.4` (muted)
  - Backgrounds: `slate.0` (app), `white` (paper), `slate.1` (subtle)
  - Borders: `slate.2` (subtle), `slate.3` (strong), `brand.3` (brand)
- **NO custom colors**: Use theme colors only, check `app/theme/colors.ts` and `app/theme/mantine-theme.ts`
- **Consistent spacing**: Use theme spacing (xs, sm, md, lg, xl)
- **Consistent radius**: Use theme radius (xs, sm, md, lg, xl)

### 4. Responsive Design

- **Minimum breakpoint**: Tablet width (48em / 768px) - `mantine-breakpoint-sm`
- **All components responsive**: Headers, steppers, cards, lists must work on tablet
- **Use Mantine Grid/Flex**: For responsive layouts
- **Use `useMediaQuery`**: For conditional rendering based on screen size
- **Test on tablet width**: Ensure all UI elements are usable at 768px width

### 5. API Methods

- **ALWAYS use `apiGet` and `apiPost`**: From `~/utils/api-client.ts`
- **NO raw fetch**: Never use `fetch()` directly
- **NO axios in components**: Use centralized API client only
- **Error handling**: Use `getApiErrorMessage()` for all errors

### 6. Data Refresh Strategy

- **After any action**: Automatically refetch current stage data
- **Seamless loading**: Show loading state while refetching, don't unmount components
- **Optimistic updates**: Update UI immediately, then refetch to confirm
- **Loading indicators**: Use Mantine `Loader` or skeleton states during refetch

### 7. API Architecture

- **Backend API**: Single endpoint `GET /api/v1/tenants/:tenantId/releases/:releaseId/tasks?stage={stage}` (matches backend contract)
- **BFF Routes**: Separate routes per stage for UI clarity:
  - `/api/v1/tenants/:tenantId/releases/:releaseId/stages/kickoff` → calls `/tasks?stage=KICKOFF`
  - `/api/v1/tenants/:tenantId/releases/:releaseId/stages/regression` → calls `/tasks?stage=REGRESSION`
  - `/api/v1/tenants/:tenantId/releases/:releaseId/stages/post-regression` → calls `/tasks?stage=POST_REGRESSION`
- **BFF Implementation**: Each BFF route calls backend API with `stage` query param
- **Response differentiation**: Backend returns different DTO based on stage, BFF handles parsing
- **Backend Contract**: All APIs match the backend contract from `CLIENT_API_CONTRACT.md`

### 8. Testing Requirements

- **Component tests**: Test all components with React Testing Library
- **Hook tests**: Test all custom hooks
- **API integration tests**: Test mock server responses
- **Responsive tests**: Test components at tablet width (768px)
- **User flow tests**: Test complete workflows (retry task, upload build, approve stage)

### 9. Implementation Phases

- **Phase 1**: Infrastructure (API config, services, hooks, mock server)
- **Phase 2**: Core components (Header, TaskCard, BuildUpload)
- **Phase 3**: Stage components (Kickoff, Regression, PostRegression)
- **Phase 4**: Integration (Routes, navigation, data flow)
- **Phase 5**: Polish (Loading states, error handling, responsive fixes)
- **Milestone commits**: Commit after each phase completion

### 10. Backend Integration

- **Pending until backend ready**: Only mock server implementation now
- **Easy migration**: When backend ready, update `getReleaseProcessBaseURL()` to return backend URL
- **No breaking changes**: Keep same API contracts, just change base URL

---

## 1. API Routing Strategy

### 1.1 Hybrid Mode Configuration

**Pattern**: Same as Distribution Service - route new APIs to mock, keep existing on backend.

**Existing APIs (Backend - DO NOT CHANGE)**:

- `GET /api/v1/tenants/:tenantId/releases` - List releases
- `GET /api/v1/tenants/:tenantId/releases/:releaseId` - Get release details
- `POST /api/v1/tenants/:tenantId/releases` - Create release
- `PATCH /api/v1/tenants/:tenantId/releases/:releaseId` - Update release (pause/resume)

**New APIs (Mock Server)** - Matches backend contract:

- Stage APIs: `GET /tasks?stage={stage}` (single endpoint with query param)
- Task management APIs: `POST /tasks/:taskId/retry` (no request body)
- Build APIs: `GET /builds`, `POST /builds/upload`, `DELETE /builds/:buildId`
- Status check APIs: 
  - `GET /test-management-run-status?platform={platform}`
  - `GET /project-management-run-status?platform={platform}`
  - `GET /check-cherry-pick-status`
- Approval APIs: 
  - `POST /stages/regression/approve` (with `ApproveRegressionStageRequest`)
  - `POST /stages/post-regression/complete` (no request body)
- Notification APIs: `GET /notifications`, `POST /notify`
- Activity log API: `GET /activity-logs`

### 1.2 API Pattern Configuration

**File**: `app/config/api.config.ts`

Add release process API patterns:

```typescript
export const RELEASE_PROCESS_API_PATTERNS = [
  '/api/v1/tenants/*/releases/*',                    // Get Release Details (API #1)
  '/api/v1/tenants/*/releases/*/tasks',               // Get Stage Tasks (API #2) - with ?stage= query param
  '/api/v1/tenants/*/releases/*/tasks/*/retry',      // Retry Task (API #8)
  '/api/v1/tenants/*/releases/*/builds',            // Get All Builds (API #14)
  '/api/v1/tenants/*/releases/*/builds/upload',      // Upload Build (API #15)
  '/api/v1/tenants/*/releases/*/builds/*',           // Delete Build (API #16)
  '/api/v1/tenants/*/releases/*/test-management-run-status',  // Test Management Status (API #17)
  '/api/v1/tenants/*/releases/*/project-management-run-status',  // Project Management Status (API #18)
  '/api/v1/tenants/*/releases/*/check-cherry-pick-status',  // Cherry Pick Status (API #19)
  '/api/v1/tenants/*/releases/*/stages/regression/approve',  // Approve Regression (API #10)
  '/api/v1/tenants/*/releases/*/stages/post-regression/complete',  // Complete Post-Regression (API #12)
  '/api/v1/tenants/*/releases/*/notifications',       // Get Notifications (API #20)
  '/api/v1/tenants/*/releases/*/notify',              // Send Notification (API #21)
  '/api/v1/tenants/*/releases/*/activity-logs',       // Activity Logs (API #23)
] as const;
```

Update `isDistributionAPI()` to also check release process patterns, or create `isReleaseProcessAPI()` function.

### 1.3 Server-Side Service Pattern

**File**: `app/.server/services/ReleaseProcess/index.ts` (NEW)

Follow same pattern as Distribution service:

```typescript
function getReleaseProcessBaseURL(): string {
  const isHybridMode = process.env.DELIVR_HYBRID_MODE === 'true';
  const mockURL = process.env.DELIVR_MOCK_URL || 'http://localhost:4000';
  const backendURL = process.env.DELIVR_BACKEND_URL || 'http://localhost:3010';
  
  if (isHybridMode) {
    console.log('[ReleaseProcessService] Using mock server:', mockURL);
    return mockURL;
  }
  
  return backendURL;
}
```

---

## 2. Mock Server Setup for Release Process

### 2.1 Mock Server Middleware

**File**: `mock-server/middleware/release-process.middleware.js` (NEW)

Create middleware similar to `distribution.middleware.js` to handle:

- Stage API responses with tasks
- Regression cycles data structure
- Task retry logic
- Build upload handling
- Status check responses
- Approval workflows

### 2.2 Mock Data Structure

**File**: `mock-server/data/db.json`

Add release process data:

```json
{
  "releases": [...existing releases...],
  "releaseStages": [
    {
      "releaseId": "rel_dev",
      "stage": "KICKOFF",
      "stageStatus": "IN_PROGRESS",
      "tasks": [...]
    }
  ],
  "releaseTasks": [
    {
      "id": "task_1",
      "releaseId": "rel_dev",
      "taskType": "FORK_BRANCH",
      "taskStage": "KICKOFF",
      "status": "COMPLETED",
      "branchUrl": "https://github.com/...",
      "commitId": "abc123",
      "createdAt": "2025-12-10T10:00:00Z"
    }
  ],
  "regressionCycles": [
    {
      "id": "cycle_1",
      "releaseId": "rel_dev",
      "slotIndex": 1,
      "slotDateTime": "2025-12-16T10:00:00Z",
      "status": "COMPLETED",
      "tag": "rc-7.0.0-cycle1",
      "createdAt": "2025-12-16T10:00:00Z",
      "completedAt": "2025-12-16T12:00:00Z"
    }
  ],
  "buildUploadsStaging": [
    {
      "id": "staging_1",
      "releaseId": "rel_dev",
      "platform": "ANDROID",
      "stage": "PRE_REGRESSION",
      "artifactPath": "s3://bucket/...",
      "isUsed": false,
      "createdAt": "2025-12-10T09:00:00Z"
    }
  ],
  "activityLogs": [
    {
      "id": "activity_1",
      "releaseId": "rel_dev",
      "timestamp": "2025-12-10T10:00:00Z",
      "stage": "KICKOFF",
      "taskType": "FORK_BRANCH",
      "action": "Task completed",
      "performedBy": "system"
    }
  ]
}
```

### 2.3 Mock Server Routes

**File**: `mock-server/server.js`

Add routes for release process APIs:

```javascript
// Stage APIs
server.get('/api/v1/tenants/:tenantId/releases/:releaseId/stages/kickoff', ...);
server.get('/api/v1/tenants/:tenantId/releases/:releaseId/stages/regression', ...);
server.get('/api/v1/tenants/:tenantId/releases/:releaseId/stages/post-regression', ...);

// Task APIs
server.post('/api/v1/tenants/:tenantId/releases/:releaseId/tasks/:taskId/retry', ...);

// Build APIs
server.post('/api/v1/tenants/:tenantId/releases/:releaseId/builds/upload', ...);
server.delete('/api/v1/tenants/:tenantId/releases/:releaseId/builds/:buildId', ...);

// Status APIs
server.get('/api/v1/tenants/:tenantId/releases/:releaseId/test-management/status', ...);
server.get('/api/v1/tenants/:tenantId/releases/:releaseId/project-management/status', ...);
server.get('/api/v1/tenants/:tenantId/releases/:releaseId/cherry-picks/status', ...);

// Approval APIs
server.post('/api/v1/tenants/:tenantId/releases/:releaseId/stages/regression/approve', ...);
server.post('/api/v1/tenants/:tenantId/releases/:releaseId/stages/post-regression/complete', ...);

// Communication APIs
server.post('/api/v1/tenants/:tenantId/releases/:releaseId/communications/slack', ...);

// Activity API
server.get('/api/v1/tenants/:tenantId/releases/:releaseId/activity', ...);
```

---

## 3. Component Architecture

### 3.1 Release Process Header

**File**: `app/components/ReleaseProcess/ReleaseProcessHeader.tsx`

**Properties**:

- Release branch, versions, dates
- Current phase (from backend status API)
- Release status badge
- Action buttons: Pause/Resume, Activity Log, Post Slack Message

**Data Source**:

- Uses existing `GET /api/v1/tenants/:tenantId/releases/:releaseId` (backend)
- Phase information comes from backend status response (per RELEASE_STATUS_GUIDE.md)

### 3.2 Stage Components

**Files**:

- `app/components/ReleaseProcess/PreKickoffStage.tsx`
- `app/components/ReleaseProcess/KickoffStage.tsx`
- `app/components/ReleaseProcess/RegressionStage.tsx`
- `app/components/ReleaseProcess/PostRegressionStage.tsx`

**Data Flow**:

- Each stage component calls stage-specific API (mock server)
- `GET /api/v1/tenants/:tenantId/releases/:releaseId/stages/{stage}`
- Returns tasks array + stageStatus + stage-specific data

### 3.3 Task Component

**File**: `app/components/ReleaseProcess/TaskCard.tsx`

**Features**:

- Task status badge
- Task metadata display (spread fields from API)
- Dependency indicators
- External links (GitHub, Jira, Checkmate)
- Retry button (on failure)
- Manual build upload widget (if applicable)

### 3.4 Regression Cycle Components

**Files**:

- `app/components/ReleaseProcess/RegressionCycleCard.tsx`
- `app/components/ReleaseProcess/RegressionCyclesList.tsx`

**Data Flow**:

- Regression stage API returns `cycles[]`, `currentCycle`, `upcomingSlot`
- Frontend groups tasks by `releaseCycleId`
- Displays cycles with manual build upload widgets

### 3.5 Manual Build Upload Widget

**File**: `app/components/ReleaseProcess/ManualBuildUploadWidget.tsx`

**Features**:

- File upload (accepts .apk, .aab, .ipa, .dota)
- Platform selector
- Upload progress
- Uploaded file display with remove
- Validation (file type, size)

**API**: `POST /api/v1/tenants/:tenantId/releases/:releaseId/builds/upload` (mock server)

**Request**:

```
Content-Type: multipart/form-data
file: File
platform: 'IOS' | 'ANDROID' | 'WEB'
stage: 'PRE_REGRESSION' | 'REGRESSION' | 'PRE_RELEASE'
```

---

## 4. Route Structure

### 4.1 Main Release Details Route

**File**: `app/routes/dashboard.$org.releases.$releaseId.tsx`

**Current State**: Basic release details page

**Updates Needed**:

- Load release details (existing API - backend)
- Determine current phase from release status
- Render `ReleaseProcessHeader`
- Conditionally render stage component based on `currentPhase`
- Handle stage navigation

**Phase-to-Stage Mapping** (from RELEASE_STATUS_GUIDE.md):

- `NOT_STARTED` → PreKickoffStage
- `KICKOFF` → KickoffStage
- `AWAITING_REGRESSION`, `REGRESSION_CYCLE_STARTING`, `REGRESSION_CYCLE_RUNNING`, `REGRESSION_AWAITING_NEXT_CYCLE` → RegressionStage
- `AWAITING_POST_REGRESSION`, `POST_REGRESSION` → PostRegressionStage
- `SUBMITTED`, `COMPLETED` → Link to Distribution (separate module)

### 4.2 Stage-Specific Routes (Optional)

Can use query params or separate routes:

- `/dashboard/:org/releases/:releaseId?stage=kickoff`
- `/dashboard/:org/releases/:releaseId?stage=regression`
- `/dashboard/:org/releases/:releaseId?stage=post-regression`

---

## 5. Service Layer & Hooks

### 5.1 Release Process Service

**File**: `app/.server/services/ReleaseProcess/index.ts` (NEW)

**Methods**:

- `getReleaseStage(releaseId, stage)` - Get stage tasks
- `retryTask(releaseId, taskId)` - Retry failed task
- `uploadBuild(releaseId, file, platform, stage)` - Upload manual build
- `approveRegressionStage(releaseId, request)` - Approve regression
- `completePostRegressionStage(releaseId)` - Complete post-regression
- `getTestManagementStatus(releaseId, cycleId?)` - Get test status
- `getProjectManagementStatus(releaseId)` - Get PM status
- `getCherryPickStatus(releaseId)` - Get cherry pick status
- `postSlackMessage(releaseId, request)` - Post Slack message
- `getActivityLog(releaseId, filters?)` - Get activity log

**Base URL**: Uses `getReleaseProcessBaseURL()` (routes to mock server in hybrid mode)

### 5.2 Client-Side Hooks

**File**: `app/hooks/useReleaseProcess.ts` (NEW)

**Hooks**:

- `useReleaseStage(releaseId, stage)` - Get stage data with React Query
- `useRetryTask(releaseId, taskId)` - Retry mutation
- `useManualBuildUpload(releaseId, platform, stage)` - Upload mutation
- `useApproveRegression(releaseId)` - Approval mutation
- `useCompletePostRegression(releaseId)` - Completion mutation
- `useTestManagementStatus(releaseId, cycleId?)` - Status query
- `useProjectManagementStatus(releaseId)` - PM status query
- `useCherryPickStatus(releaseId)` - Cherry pick status query
- `usePostSlackMessage(releaseId)` - Slack message mutation
- `useActivityLog(releaseId, filters?)` - Activity log query

**Pattern**: Follow existing hooks pattern (`useRelease`, `useReleases`)

---

## 6. API Implementation Details

### 6.1 Stage APIs Response Structure

All stage APIs follow consistent pattern:

```typescript
interface StageTasksResponse {
  stage: TaskStage;
  releaseId: string;
  tasks: TaskInfo[];  // Always present (may be empty)
  stageStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  // Stage-specific additional fields
}
```

### 6.2 Regression Stage Special Response - Backend Contract

```typescript
interface RegressionStageResponse {
  success: true;
  stage: 'REGRESSION';
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
  canApprove: boolean;
  approvalRequirements: {
    testManagementPassed: boolean;
    cherryPickStatusOk: boolean;
    cyclesCompleted: boolean;
  };
}

interface RegressionSlot {
  date: string;                            // ISO 8601
  config: Record<string, unknown>;
}
```

### 6.3 Task Structure - Backend Contract

Tasks match backend contract exactly (see `CLIENT_API_CONTRACT.md`):

```typescript
interface Task {
  id: string;                              // Primary key (UUID)
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
  externalData: Record<string, unknown> | null;  // Task-specific metadata stored here
  branch: string | null;
  createdAt: string;                       // ISO 8601
  updatedAt: string;                       // ISO 8601
}
```

**Note**: Task-specific metadata (branchUrl, commitId, ticketId, etc.) is stored in `externalData` object, not as spread fields.

---

## 7. Integration with Distribution

### 7.1 Stage Transition

**Post-Regression → Distribution**:

- Post-regression stage completes
- Release status changes to `READY_FOR_SUBMISSION` (backend)
- UI shows link/button to navigate to Distribution tab
- Distribution is separate module (per DISTRIBUTION_UI_FLOW_SPEC.md)

**Route**: `/dashboard/:org/releases/:releaseId?tab=distribution`

### 7.2 Phase-Based Navigation

**File**: `app/components/ReleaseProcess/ReleaseProcessHeader.tsx`

Use phase from backend status API to:

- Show correct stage in stepper
- Enable/disable navigation
- Display appropriate actions

**Backend Status API** (from RELEASE_STATUS_GUIDE.md):

- Returns `currentPhase`, `displayText`, `actions[]`
- Frontend uses phase to determine UI state

---

## 8. Mock Server Implementation

### 8.1 Middleware Structure

**File**: `mock-server/middleware/release-process.middleware.js`

**Handlers**:

1. **Stage APIs**: Return tasks + stageStatus + stage-specific data
2. **Regression Stage**: Include cycles, currentCycle, approvalStatus, availableBuilds
3. **Task Retry**: Update task status, return updated task
4. **Build Upload**: Create staging entry, return build info
5. **Status Checks**: Return status from mock data
6. **Approvals**: Update stage status, trigger next stage
7. **Activity Log**: Return filtered activity entries

### 8.2 Mock Data Scenarios

**File**: `mock-server/data/db.json`

Create multiple release scenarios:

- Release in KICKOFF stage
- Release in REGRESSION with active cycle
- Release in REGRESSION with no active cycle (upcoming slot)
- Release in POST_REGRESSION
- Release with manual build upload enabled
- Release with failed tasks (for retry testing)

### 8.3 Build Upload Flow Mocking

**Staging Table Simulation**:

- `buildUploadsStaging` array in db.json
- On upload: Create entry with `isUsed: false`
- On task execution: Mark `isUsed: true`, create build entry
- Track by `releaseId`, `platform`, `stage`

---

## 9. Component Implementation Order

### Phase 1: Foundation

1. Update API config with release process patterns
2. Create ReleaseProcess service (server-side)
3. Create useReleaseProcess hooks
4. Set up mock server routes and middleware
5. Create mock data scenarios

### Phase 2: Core Components

6. ReleaseProcessHeader component
7. TaskCard component
8. ManualBuildUploadWidget component
9. PreKickoffStage component
10. KickoffStage component

### Phase 3: Regression Components

11. RegressionCycleCard component
12. RegressionCyclesList component
13. RegressionStage component

### Phase 4: Post-Regression

14. PostRegressionStage component

### Phase 5: Integration

15. Update main release details route
16. Add stage navigation
17. Integrate with distribution stage
18. Add activity log modal
19. Add Slack message modal

---

## 10. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ React Component (UI)                                         │
│ - ReleaseProcessHeader                                       │
│ - KickoffStage, RegressionStage, etc.                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Custom Hooks (useReleaseProcess.ts)                          │
│ - useReleaseStage()                                          │
│ - useRetryTask()                                             │
│ - useManualBuildUpload()                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Remix API Routes (BFF Layer)                                 │
│ - api.v1.tenants.$tenantId.releases.$releaseId.stages.*.ts   │
│ - api.v1.tenants.$tenantId.releases.$releaseId.tasks.*.ts    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Server Services (.server/services/ReleaseProcess)            │
│ - Uses getReleaseProcessBaseURL()                            │
│ - Routes to: Mock Server (hybrid mode) or Backend            │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ↓                     ↓
┌───────────────┐   ┌─────────────────────┐
│ Mock Server   │   │ Real Backend         │
│ (New APIs)   │   │ (Existing APIs)      │
│ Port: 4000   │   │ Port: 3010           │
└───────────────┘   └─────────────────────┘
```

---

## 11. API List (Final - Mock Server Only)

### Core Release APIs (Backend - Keep As Is)

1. `GET /api/v1/tenants/:tenantId/releases` - List releases
2. `GET /api/v1/tenants/:tenantId/releases/:releaseId` - Get release (includes phase)
3. `POST /api/v1/tenants/:tenantId/releases` - Create release
4. `PATCH /api/v1/tenants/:tenantId/releases/:releaseId` - Update release (pause/resume)

### Stage APIs (Mock Server - NEW) - Backend Contract

5. `GET /api/v1/tenants/:tenantId/releases/:releaseId/tasks?stage=KICKOFF` (API #2)
6. `GET /api/v1/tenants/:tenantId/releases/:releaseId/tasks?stage=REGRESSION` (API #2)
7. `GET /api/v1/tenants/:tenantId/releases/:releaseId/tasks?stage=POST_REGRESSION` (API #2)

### Task APIs (Mock Server - NEW)

8. `POST /api/v1/tenants/:tenantId/releases/:releaseId/tasks/:taskId/retry`

### Build APIs (Mock Server - NEW)

9. `POST /api/v1/tenants/:tenantId/releases/:releaseId/builds/upload` (unified)
10. `DELETE /api/v1/tenants/:tenantId/releases/:releaseId/builds/:buildId`

### Status APIs (Mock Server - NEW) - Backend Contract

11. `GET /api/v1/tenants/:tenantId/releases/:releaseId/test-management-run-status?platform={platform}` (API #17)
12. `GET /api/v1/tenants/:tenantId/releases/:releaseId/project-management-run-status?platform={platform}` (API #18)
13. `GET /api/v1/tenants/:tenantId/releases/:releaseId/check-cherry-pick-status` (API #19)

### Approval APIs (Mock Server - NEW)

14. `POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/regression/approve`
15. `POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/post-regression/complete`

### Notification APIs (Mock Server - NEW) - Backend Contract

16. `GET /api/v1/tenants/:tenantId/releases/:releaseId/notifications` (API #20)
17. `POST /api/v1/tenants/:tenantId/releases/:releaseId/notify` (API #21)

### Activity API (Mock Server - NEW) - Backend Contract

18. `GET /api/v1/tenants/:tenantId/releases/:releaseId/activity-logs` (API #23)

**Total: 18 APIs** (4 backend + 14 mock server)

**Note**: All APIs match the backend contract from `CLIENT_API_CONTRACT.md`. See `BACKEND_CONTRACT_ANALYSIS.md` for detailed comparison.

---

## 12. Removed/Out of Scope APIs

- `GET /api/v1/tenants/:tenantId/releases/:releaseId/stages/pre-kickoff` - No tasks, not needed
- `GET /api/v1/tenants/:tenantId/releases/:releaseId/stages/release-submission` - Distribution scope
- `GET /api/v1/tenants/:tenantId/releases/:releaseId/stages/release` - Distribution scope
- `GET /api/v1/tenants/:tenantId/releases/:releaseId/builds` - Use task metadata instead
- `GET /api/v1/tenants/:tenantId/releases/:releaseId/communications` - Not needed
- `PUT /api/v1/tenants/:tenantId/releases/:releaseId/whats-new` - Distribution scope
- `GET /api/v1/tenants/:tenantId/releases/:releaseId/submission` - Distribution scope

---

## 13. Backend Status API Integration

### 13.1 Phase-Based UI Decisions

**File**: `app/components/ReleaseProcess/ReleaseProcessHeader.tsx`

Backend provides phase in release details response (per RELEASE_STATUS_GUIDE.md):

```typescript
interface ReleaseDetailsResponse {
  // ... existing fields ...
  currentPhase: Phase;  // 'KICKOFF' | 'REGRESSION_CYCLE_RUNNING' | etc.
  displayText: string;  // Human-readable status
  actions: Action[];    // Available UI actions
}
```

**Usage**:

- Determine which stage component to render
- Enable/disable action buttons
- Show appropriate status messages

### 13.2 Phase-to-Stage Component Mapping

```typescript
function getStageComponent(phase: Phase) {
  switch (phase) {
    case 'NOT_STARTED':
      return <PreKickoffStage />;
    case 'KICKOFF':
      return <KickoffStage />;
    case 'AWAITING_REGRESSION':
    case 'REGRESSION_CYCLE_STARTING':
    case 'REGRESSION_CYCLE_RUNNING':
    case 'REGRESSION_AWAITING_NEXT_CYCLE':
      return <RegressionStage />;
    case 'AWAITING_POST_REGRESSION':
    case 'POST_REGRESSION':
      return <PostRegressionStage />;
    case 'SUBMITTED':
    case 'COMPLETED':
      return <DistributionLink />; // Link to distribution module
    default:
      return <ErrorState />;
  }
}
```

---

## 14. Manual Build Upload Flow

### 14.1 Upload Window Logic

**Per MANUAL_BUILD_UPLOAD_FLOW.md**:

- **PRE_REGRESSION**: Upload window opens after release creation, closes when `TRIGGER_PRE_REGRESSION_BUILDS` task starts
- **REGRESSION**: Upload window opens after previous cycle completes, closes when cycle's `TRIGGER_REGRESSION_BUILDS` task starts
- **PRE_RELEASE**: Upload window opens after regression approval, closes when pre-release task starts

**UI Implementation**:

- Check `availableBuilds` from regression stage API
- Show upload widget when `allBuildsUploaded: false`
- Hide upload widget when task starts executing

### 14.2 Unified Upload API

**Endpoint**: `POST /api/v1/tenants/:tenantId/releases/:releaseId/builds/upload`

**Request** (multipart/form-data):

```
file: File
platform: 'IOS' | 'ANDROID' | 'WEB'
stage: 'PRE_REGRESSION' | 'REGRESSION' | 'PRE_RELEASE'
```

**Response**:

```typescript
{
  success: true,
  buildId: string,
  message: string,
  build: BuildInfo
}
```

**Mock Server**: Creates entry in `buildUploadsStaging` table

---

## 15. Testing Scenarios

### 15.1 Mock Data Scenarios

Create releases in `db.json` for:

1. **Kickoff Stage**: Release with stage1Status=IN_PROGRESS, tasks in various states
2. **Regression Active Cycle**: Release with currentCycle, tasks grouped by cycleId
3. **Regression No Cycle**: Release with upcomingSlot, availableBuilds
4. **Post-Regression**: Release with stage3Status=IN_PROGRESS
5. **Manual Build Required**: Release with hasManualBuildUpload=true, missing builds
6. **Failed Tasks**: Release with failed tasks (for retry testing)

### 15.2 Manual Build Upload Scenarios

1. Upload PRE_REGRESSION builds before kickoff
2. Upload REGRESSION builds between cycles
3. Upload PRE_RELEASE builds after regression approval
4. Test upload window closing when task starts
5. Test build consumption by tasks

---

## 16. Implementation Checklist

### Phase 1: Infrastructure

- [ ] Update `api.config.ts` with release process API patterns
- [ ] Create `getReleaseProcessBaseURL()` function
- [ ] Create `ReleaseProcessService` (server-side)
- [ ] Create `useReleaseProcess` hooks
- [ ] Create mock server middleware `release-process.middleware.js`
- [ ] Add mock server routes for all 13 new APIs
- [ ] Create mock data scenarios in `db.json`

### Phase 2: Core Components

- [ ] Create `ReleaseProcessHeader` component
- [ ] Create `TaskCard` component
- [ ] Create `ManualBuildUploadWidget` component
- [ ] Create `PreKickoffStage` component
- [ ] Create `KickoffStage` component

### Phase 3: Regression Components

- [ ] Create `RegressionCycleCard` component
- [ ] Create `RegressionCyclesList` component
- [ ] Create `RegressionStage` component

### Phase 4: Post-Regression

- [ ] Create `PostRegressionStage` component

### Phase 5: Integration

- [ ] Update `dashboard.$org.releases.$releaseId.tsx` route
- [ ] Implement phase-based stage rendering
- [ ] Add stage navigation
- [ ] Create activity log modal
- [ ] Create Slack message modal
- [ ] Add link to distribution stage

### Phase 6: Remix API Routes (BFF)

- [ ] Create stage API routes (kickoff, regression, post-regression)
- [ ] Create task retry route
- [ ] Create build upload route
- [ ] Create status check routes
- [ ] Create approval routes
- [ ] Create communication route
- [ ] Create activity log route

---

## 17. Key Design Decisions

### 17.1 Hybrid API Routing

- **Existing APIs**: Stay on backend (no changes)
- **New APIs**: Use mock server (for development)
- **Pattern**: Same as Distribution service
- **Benefit**: Can develop UI without waiting for backend implementation

### 17.2 Phase-Based UI

- **Source**: Backend status API provides `currentPhase`
- **Usage**: Determine which stage component to show
- **Benefit**: Single source of truth, backend controls flow

### 17.3 Unified Build Upload API

- **Single endpoint**: `/builds/upload` for all stages
- **Parameters**: `stage`, `platform`, `file`
- **Benefit**: Consistent API, easier to mock

### 17.4 Task Metadata Spreading

- **Pattern**: Task metadata spread at top level (not nested)
- **Benefit**: Easier access in components, no deep nesting

### 17.5 Regression Cycles in Single API

- **Single endpoint**: Regression stage API returns cycles, currentCycle, approvalStatus
- **No separate APIs**: No need for separate cycle/slot APIs
- **Benefit**: Fewer API calls, atomic data

---

## 18. Mock Server Data Structure

### 18.1 Release Stages

```json
{
  "releaseStages": [
    {
      "releaseId": "rel_dev",
      "stage": "KICKOFF",
      "stageStatus": "IN_PROGRESS",
      "tasks": ["task_1", "task_2", "task_3"]
    }
  ]
}
```

### 18.2 Release Tasks

```json
{
  "releaseTasks": [
    {
      "id": "task_1",
      "releaseId": "rel_dev",
      "taskType": "FORK_BRANCH",
      "taskStage": "KICKOFF",
      "status": "COMPLETED",
      "branchUrl": "https://github.com/org/repo/tree/release/7.0.0",
      "commitId": "abc123def456",
      "releaseCycleId": null,
      "createdAt": "2025-12-10T10:00:00Z",
      "completedAt": "2025-12-10T10:05:00Z"
    }
  ]
}
```

### 18.3 Regression Cycles

```json
{
  "regressionCycles": [
    {
      "id": "cycle_1",
      "releaseId": "rel_dev",
      "slotIndex": 1,
      "slotDateTime": "2025-12-16T10:00:00Z",
      "status": "COMPLETED",
      "tag": "rc-7.0.0-cycle1",
      "commitId": "def456ghi789",
      "createdAt": "2025-12-16T10:00:00Z",
      "completedAt": "2025-12-16T12:00:00Z"
    }
  ]
}
```

### 18.4 Build Uploads Staging

```json
{
  "buildUploadsStaging": [
    {
      "id": "staging_1",
      "tenantId": "tenant_123",
      "releaseId": "rel_dev",
      "platform": "ANDROID",
      "stage": "PRE_REGRESSION",
      "artifactPath": "s3://bucket/releases/rel_dev/android.apk",
      "isUsed": false,
      "usedByTaskId": null,
      "usedByCycleId": null,
      "createdAt": "2025-12-10T09:00:00Z"
    }
  ]
}
```

---

## 19. Environment Configuration

### 19.1 Development Setup

**`.env` file**:

```
DELIVR_BACKEND_URL=http://localhost:3010
DELIVR_MOCK_URL=http://localhost:4000
DELIVR_HYBRID_MODE=true
```

**Package.json scripts**:

```json
{
  "dev:with-mock": "concurrently \"pnpm run mock-server\" \"pnpm run dev:mock\"",
  "mock-server": "node mock-server/server.js"
}
```

### 19.2 API Routing Logic

**Flow**:

1. Check `DELIVR_HYBRID_MODE`
2. If true, check if API matches release process patterns
3. If matches → route to mock server
4. If not → route to backend
5. Existing release CRUD APIs always go to backend

---

## 20. Integration Points

### 20.1 With Distribution Module

**Transition Point**: Post-regression stage completion

**Flow**:

1. Post-regression stage completes
2. Backend sets release status to `READY_FOR_SUBMISSION`
3. UI shows "Ready for Distribution" message
4. Link/button navigates to: `/dashboard/:org/releases/:releaseId?tab=distribution`
5. Distribution module handles submission (separate scope)

### 20.2 With Existing Release Management

**Reuse**:

- Existing `useRelease` hook (for release details)
- Existing `useReleases` hook (for releases list)
- Existing release creation flow
- Existing release update flow (pause/resume)

**New**:

- Stage-specific data fetching
- Task management
- Build upload
- Status checks

---

## 21. Error Handling

### 21.1 API Error Responses

All APIs return consistent error format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}
```

### 21.2 UI Error States

- **Task Failure**: Show error message, retry button
- **Build Upload Failure**: Show error, allow retry
- **Approval Failure**: Show requirements not met
- **API Failure**: Show toast notification, log error

---

## 22. Performance Considerations

### 22.1 Data Fetching Strategy

- **Stage APIs**: Fetch on stage component mount
- **Status APIs**: Poll every 30 seconds (or on user action)
- **Activity Log**: Fetch on modal open (paginated)
- **Task Updates**: Use React Query cache invalidation

### 22.2 Caching

- Use React Query for all data fetching
- Cache stage data for 2 minutes
- Invalidate on mutations (retry, upload, approve)
- Optimistic updates for better UX

---

## 23. Accessibility & UX

### 23.1 Loading States

- Show skeleton loaders for stage components
- Show progress indicators for uploads
- Show loading spinners for status checks

### 23.2 Empty States

- "No active cycle" message for regression
- "No tasks yet" for stages
- "Upload builds to continue" for manual builds

### 23.3 Success Feedback

- Toast notifications for actions (retry, upload, approve)
- Visual feedback for task completion
- Progress indicators for stage completion

---

## 24. Documentation Updates

### 24.1 API Documentation

- Document all 13 new APIs in mock server
- Include request/response examples
- Document error scenarios

### 24.2 Component Documentation

- JSDoc comments for all components
- Props interfaces documented
- Usage examples in comments

---

## 25. Testing Strategy

### 25.1 Mock Server Testing

- Test all API endpoints with various scenarios
- Test error cases (404, 500, validation errors)
- Test build upload flow end-to-end
- Test regression cycle scenarios

### 25.2 Component Testing

- Test task dependency logic
- Test manual build upload widget
- Test regression cycle display
- Test stage transitions

---

## 26. Migration Path

### 26.1 Backend Integration

When backend APIs are ready:

1. Update `getReleaseProcessBaseURL()` to return backend URL
2. Remove mock server routes
3. Update API contracts if needed
4. Test with real backend

### 26.2 Backward Compatibility

- Keep mock server for development
- Support both mock and backend via env vars
- Gradual migration per API

---

## 27. Success Criteria

### 27.1 Functional Requirements

- [ ] All stages display correctly based on phase
- [ ] Tasks show with correct status and metadata
- [ ] Manual build upload works for all stages
- [ ] Regression cycles display with tasks grouped
- [ ] Approval workflows work correctly
- [ ] Activity log shows all events
- [ ] Slack messages can be posted
- [ ] Integration with distribution stage works

### 27.2 Technical Requirements

- [ ] All new APIs use mock server in hybrid mode
- [ ] Existing APIs continue using backend
- [ ] React Query caching works correctly
- [ ] Error handling is consistent
- [ ] Loading states are appropriate
- [ ] Code follows cursor rules (constants, types, utils)

---

## 28. Next Steps

1. **Review and approve plan**
2. **Set up mock server infrastructure** (Phase 1)
3. **Create core components** (Phase 2)
4. **Implement regression components** (Phase 3)
5. **Complete post-regression** (Phase 4)
6. **Integrate everything** (Phase 5)
7. **Test and refine** (Phase 6)