# Architecture Overview: Orchestration + Integrations Merge

## Current State vs. Target State

### Current State: Two Separate Repositories

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION REPO                                │
│         (/Users/navkashkrishna/delivr-server-ota-managed)          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Release Orchestration Engine                   │   │
│  │  - Stage 1: Kickoff (fork branch, create tickets)          │   │
│  │  - Stage 2: Regression (RC tags, builds, tests)            │   │
│  │  - Stage 3: Post-Regression (release tags, TestFlight)     │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │            Integration Interfaces (Contracts)               │   │
│  │  - SCMIntegration                                           │   │
│  │  - NotificationIntegration                                  │   │
│  │  - JIRAIntegration                                          │   │
│  │  - TestPlatformIntegration                                  │   │
│  │  - CICDIntegration                                          │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Mock Implementations                      │   │
│  │  (Used for testing orchestration logic)                     │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                     INTEGRATIONS REPO                                │
│  (/Users/navkashkrishna/dota-managed/delivr-server-ota-managed)    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                 Integration CRUD APIs                        │   │
│  │  - Create/Read/Update/Delete integrations                   │   │
│  │  - Configure integration credentials                        │   │
│  │  - Verify integration connections                           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │            Real Integration Implementations                  │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │ CI/CD: GitHub Actions, Jenkins                   │      │   │
│  │  │ Comm: Slack                                      │      │   │
│  │  │ PM: JIRA, Linear, Asana, Monday, ClickUp         │      │   │
│  │  │ SCM: GitHub, GitLab, Bitbucket                   │      │   │
│  │  │ Store: Apple App Store, Google Play Store        │      │   │
│  │  │ Test: Checkmate                                  │      │   │
│  │  └──────────────────────────────────────────────────┘      │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                  Integration Storage                         │   │
│  │  (Database tables for credentials, configs, etc.)           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Problem**: Orchestration can't use real integrations. Integrations can't trigger workflows.

---

### Target State: Unified Repository

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED DELIVR SERVER                                 │
│         (/Users/navkashkrishna/dota-managed/delivr-server-ota-managed)     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                   Release Orchestration Engine                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐      │    │
│  │  │   Stage 1    │  │   Stage 2    │  │     Stage 3         │      │    │
│  │  │   Kickoff    │→│  Regression   │→│  Post-Regression    │      │    │
│  │  └──────────────┘  └──────────────┘  └─────────────────────┘      │    │
│  │                                                                      │    │
│  │  Features:                                                          │    │
│  │  - Automated task creation                                          │    │
│  │  - Task sequencing and dependencies                                 │    │
│  │  - Cron-based polling                                               │    │
│  │  - Time-based task triggers                                         │    │
│  │  - Distributed locking                                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              Integration Adapter Layer (NEW!)                       │    │
│  │  Maps orchestration interfaces → concrete implementations           │    │
│  │                                                                      │    │
│  │  loadIntegrationsForTenant(tenantId) {                              │    │
│  │    // Query database for tenant's configured integrations           │    │
│  │    // For each integration, create adapter                          │    │
│  │    return {                                                          │    │
│  │      scm: createSCMAdapter(scmService),                             │    │
│  │      cicd: createCICDAdapter(cicdService),                          │    │
│  │      jira: createJiraAdapter(jiraService),                          │    │
│  │      testPlatform: createTestPlatformAdapter(testMgmtService),      │    │
│  │      notification: createNotificationAdapter(slackService)          │    │
│  │    }                                                                 │    │
│  │  }                                                                   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                │                 │                │                          │
│                ▼                 ▼                ▼                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │            Integration Interfaces (Contracts)                     │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │      │
│  │  │     SCM      │  │    CI/CD     │  │      JIRA        │       │      │
│  │  │  Interface   │  │  Interface   │  │   Interface      │  ...  │      │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘       │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                │                 │                │                          │
│                ▼                 ▼                ▼                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │               Real Integration Implementations                    │      │
│  │  ┌────────────────────────────────────────────────────────┐      │      │
│  │  │ CI/CD Services                                          │      │      │
│  │  │  - GitHubActionsService                                 │      │      │
│  │  │  - JenkinsService                                       │      │      │
│  │  ├────────────────────────────────────────────────────────┤      │      │
│  │  │ Communication Services                                  │      │      │
│  │  │  - SlackIntegrationService                              │      │      │
│  │  ├────────────────────────────────────────────────────────┤      │      │
│  │  │ Project Management Services                             │      │      │
│  │  │  - JiraService                                          │      │      │
│  │  │  - LinearService                                        │      │      │
│  │  │  - AsanaService, MondayService, ClickUpService          │      │      │
│  │  ├────────────────────────────────────────────────────────┤      │      │
│  │  │ SCM Services                                            │      │      │
│  │  │  - GitHubService                                        │      │      │
│  │  │  - GitLabService                                        │      │      │
│  │  │  - BitbucketService                                     │      │      │
│  │  ├────────────────────────────────────────────────────────┤      │      │
│  │  │ Store Services                                          │      │      │
│  │  │  - AppStoreService                                      │      │      │
│  │  │  - PlayStoreService                                     │      │      │
│  │  ├────────────────────────────────────────────────────────┤      │      │
│  │  │ Test Management Services                                │      │      │
│  │  │  - CheckmateService                                     │      │      │
│  │  └────────────────────────────────────────────────────────┘      │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                      Integration CRUD APIs                          │    │
│  │  - POST /integrations/ci-cd/connections                             │    │
│  │  - GET /integrations/scm/providers                                  │    │
│  │  - PUT /integrations/test-management/configs/:id                    │    │
│  │  - DELETE /integrations/project-management/integrations/:id         │    │
│  │  - POST /integrations/test-management/test-runs/:runId/reset        │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                     Unified Storage Layer                           │    │
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐        │    │
│  │  │ Orchestration    │  │  Integration Storage             │        │    │
│  │  │ - releases       │  │  - tenant_scm_integrations       │        │    │
│  │  │ - release_tasks  │  │  - tenant_ci_cd_integrations     │        │    │
│  │  │ - cron_jobs      │  │  - tenant_comm_integrations      │        │    │
│  │  │ - regression_... │  │  - project_management_...        │        │    │
│  │  │ - builds         │  │  - test_management_...           │        │    │
│  │  └──────────────────┘  └──────────────────────────────────┘        │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Solution**: Single unified codebase where orchestration uses real integrations via adapters.

---

## Component Interaction Flow

### Example: Triggering a Regression Build

```
┌─────────────┐
│   User      │ Creates release via API
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  POST /api/v1/release-management/tenants/:tenantId/releases      │
│  (release-management.ts)                                         │
└──────┬──────────────────────────────────────────────────────────┘
       │
       │ 1. Creates release record
       ▼
┌──────────────────────────┐
│  ReleaseDTO.create()     │
│  (release-dto.ts)        │
└──────┬───────────────────┘
       │
       │ 2. Creates cron job
       ▼
┌──────────────────────────┐
│  CronJobDTO.create()     │
│  (cron-job-dto.ts)       │
└──────┬───────────────────┘
       │
       │ 3. Creates Stage 1 tasks
       ▼
┌──────────────────────────────────┐
│  createStage1Tasks()             │
│  (task-creation.ts)              │
│  - FORK_BRANCH                   │
│  - CREATE_PROJECT_MGMT_TICKET    │
│  - CREATE_TEST_SUITE             │
│  - TRIGGER_PRE_REGRESSION_BUILDS │
└──────┬───────────────────────────┘
       │
       │ 4. Auto-starts cron job
       ▼
┌──────────────────────────────────┐
│  startCronJob(releaseId, fn)     │
│  (cron-scheduler.ts)             │
└──────┬───────────────────────────┘
       │
       │ Polls every 60s
       ▼
┌────────────────────────────────────────────────────────────┐
│  executeKickoffCronJob(releaseId)                          │
│  (kickoff-cron-job.ts)                                     │
│                                                             │
│  1. Load integrations for tenant                           │
│     integrations = loadIntegrationsForTenant(tenantId) ────┐
│                                                             │
│  2. Get pending tasks                                       │
│     tasks = releaseTasksDTO.getByReleaseAndStage()         │
│                                                             │
│  3. Execute each task                                       │
│     taskExecutor.executeTask(context, integrations) ───────┤
└────────────────────────────────────────────────────────────┘
                                                              │
       │                                                      │
       │ 5. Load real integrations                           │
       ▼                                                      │
┌──────────────────────────────────────────────────┐         │
│  loadIntegrationsForTenant(tenantId)             │◄────────┘
│  (integration-adapter-factory.ts)                │
│                                                   │
│  1. Query database for tenant's integrations     │
│     - SCM integration?                           │
│     - CI/CD integration?                         │
│     - JIRA integration?                          │
│     - Test Management integration?               │
│     - Notification integration?                  │
│                                                   │
│  2. For each configured integration:             │
│     - Load service instance                      │
│     - Create adapter (interface → impl)          │
│                                                   │
│  3. Return adapters object                       │
│     {                                             │
│       scm: SCMAdapter,                           │
│       cicd: CICDAdapter,                         │
│       jira: JiraAdapter,                         │
│       testPlatform: TestPlatformAdapter,         │
│       notification: NotificationAdapter          │
│     }                                             │
└──────────────────────────────────────────────────┘
       │
       │ 6. Execute task
       ▼
┌─────────────────────────────────────────────────────────────┐
│  taskExecutor.executeTask(context, integrations)            │
│  (task-executor.ts)                                         │
│                                                              │
│  switch(taskType) {                                         │
│    case TRIGGER_REGRESSION_BUILDS:                          │
│      buildNumber = integrations.cicd.triggerRegressionBuilds(
│        releaseId, { platform, version, branch }, config     │
│      )                                                       │
│      break;                                                  │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
       │
       │ 7. Call real integration via adapter
       ▼
┌─────────────────────────────────────────────────────┐
│  CICDAdapter.triggerRegressionBuilds()              │
│  (integration-adapter-factory.ts)                   │
│                                                      │
│  Maps interface method → service method:            │
│  triggerRegressionBuilds() → service.triggerWorkflow()
└──────────────────────────────────────────────────────┘
       │
       │ 8. Execute real CI/CD service
       ▼
┌─────────────────────────────────────────────────────┐
│  GitHubActionsService.triggerWorkflow()             │
│  (ci-cd/github-actions.service.ts)                  │
│                                                      │
│  - Calls GitHub API                                 │
│  - Triggers workflow run                            │
│  - Returns run ID                                   │
└──────────────────────────────────────────────────────┘
       │
       │ 9. Returns build number to task executor
       ▼
┌─────────────────────────────────────────────────────┐
│  taskExecutor updates task:                         │
│  - taskStatus = COMPLETED                           │
│  - externalId = buildNumber                         │
└─────────────────────────────────────────────────────┘
```

---

## Data Flow

### Release Creation → Task Execution

```
┌──────────────────┐
│   CREATE RELEASE │
└────────┬─────────┘
         │
         │ Writes to:
         ├─► releases (1 record)
         ├─► cron_jobs (1 record)
         ├─► release_tasks (4-5 records for Stage 1)
         └─► platform_releases (1+ records, junction table)
         
┌──────────────────┐
│   CRON JOB POLL  │
└────────┬─────────┘
         │
         │ Reads:
         ├─► cron_jobs (check stage status)
         ├─► releases (get release details)
         └─► release_tasks (get pending tasks)
         
┌──────────────────┐
│  EXECUTE TASK    │
└────────┬─────────┘
         │
         │ Reads:
         ├─► tenant_ci_cd_integrations (get CI/CD config)
         ├─► tenant_scm_integrations (get SCM config)
         ├─► project_management_integrations (get JIRA config)
         ├─► test_management_integrations (get Checkmate config)
         └─► tenant_comm_integrations (get Slack config)
         │
         │ Writes:
         ├─► release_tasks (update status, externalId, externalData)
         └─► builds (create build records for TRIGGER_*_BUILDS tasks)
```

### Integration Configuration → Orchestration Usage

```
┌─────────────────────────────────────────┐
│  User configures integrations via API   │
└──────────────────┬──────────────────────┘
                   │
                   │ Writes to:
                   ├─► tenant_ci_cd_integrations
                   ├─► tenant_scm_integrations
                   ├─► project_management_integrations
                   ├─► test_management_integrations
                   └─► tenant_comm_integrations
                   
┌─────────────────────────────────────────┐
│  User creates release via orchestration │
└──────────────────┬──────────────────────┘
                   │
                   │ Orchestration reads:
                   ├─► tenant_ci_cd_integrations ──┐
                   ├─► tenant_scm_integrations ────┤
                   ├─► project_management_...  ────┼─► Loads into adapters
                   ├─► test_management_... ────────┤
                   └─► tenant_comm_integrations ───┘
                   
┌─────────────────────────────────────────┐
│  Orchestration executes tasks           │
└──────────────────┬──────────────────────┘
                   │
                   │ Uses real integrations:
                   ├─► Creates branches in GitHub
                   ├─► Triggers workflows in GitHub Actions
                   ├─► Creates tickets in JIRA
                   ├─► Creates test runs in Checkmate
                   └─► Sends messages to Slack
```

---

## Directory Structure (After Merge)

```
delivr-server-ota-managed/
├── api/
│   └── script/
│       ├── routes/
│       │   ├── release/
│       │   │   ├── release-management.ts         # Main orchestration API
│       │   │   ├── kickoff-cron-job.ts          # Stage 1 cron
│       │   │   ├── regression-cron-job.ts       # Stage 2 cron
│       │   │   ├── post-regression-cron-job.ts  # Stage 3 cron
│       │   │   ├── release-types.ts             # Type definitions
│       │   │   └── integrations/                # Integration interfaces
│       │   │       ├── scm-integration.interface.ts
│       │   │       ├── cicd-integration.interface.ts
│       │   │       ├── jira-integration.interface.ts
│       │   │       ├── notification-integration.interface.ts
│       │   │       └── test-platform-integration.interface.ts
│       │   │
│       │   ├── ci-cd-integrations.ts            # CI/CD CRUD APIs
│       │   ├── scm-integrations.ts              # SCM CRUD APIs
│       │   ├── pm-integrations.ts               # PM CRUD APIs
│       │   ├── test-management-integrations.ts  # Test CRUD APIs
│       │   └── comm-integrations.ts             # Comm CRUD APIs
│       │
│       ├── services/
│       │   ├── cron-scheduler.ts                # Cron job scheduler
│       │   ├── cron-lock-service.ts             # Distributed locking
│       │   ├── task-executor.ts                 # Task execution engine
│       │   ├── integration-mocks.ts             # Mock integrations (testing)
│       │   ├── integration-adapter-factory.ts   # ⭐ NEW: Adapter factory
│       │   │
│       │   └── integrations/                    # Real implementations
│       │       ├── ci-cd/
│       │       │   ├── github-actions.service.ts
│       │       │   └── jenkins.service.ts
│       │       ├── comm/
│       │       │   └── slack-integration.service.ts
│       │       ├── project-management/
│       │       │   ├── jira.service.ts
│       │       │   ├── linear.service.ts
│       │       │   └── ...
│       │       ├── scm/
│       │       │   ├── github.service.ts
│       │       │   ├── gitlab.service.ts
│       │       │   └── bitbucket.service.ts
│       │       ├── store/
│       │       │   ├── app-store.service.ts
│       │       │   └── play-store.service.ts
│       │       └── test-management/
│       │           └── checkmate.service.ts
│       │
│       ├── storage/
│       │   ├── release/                         # Orchestration storage
│       │   │   ├── release-dto.ts
│       │   │   ├── release-tasks-dto.ts
│       │   │   ├── cron-job-dto.ts
│       │   │   ├── regression-cycle-dto.ts
│       │   │   └── release-models.ts
│       │   │
│       │   └── integrations/                    # Integration storage
│       │       ├── ci-cd/
│       │       ├── scm/
│       │       ├── comm/
│       │       └── test-management/
│       │
│       ├── utils/
│       │   ├── task-creation.ts                 # Task creation logic
│       │   ├── task-sequencing.ts               # Task ordering
│       │   ├── time-utils.ts                    # Time-based triggers
│       │   └── regression-cycle-creation.ts     # Regression utils
│       │
│       └── controllers/integrations/            # Integration controllers
│           ├── ci-cd/
│           ├── comm/
│           ├── project-management/
│           ├── scm/
│           ├── store-controllers.ts
│           └── test-management/
│
├── migrations/
│   ├── 001_unified_architecture.sql             # Base schema
│   ├── 002_release_management.sql               # Base release tables
│   ├── 003-010_*.sql                            # Integration tables
│   └── 011_orchestration_complete.sql           # ⭐ NEW: Orchestration tables
│
└── docs/
    ├── MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md  # Full merge plan
    ├── MERGE_QUICK_START.md                          # Quick start guide
    └── MERGE_ARCHITECTURE_OVERVIEW.md                # This document
```

---

## Key Benefits of Unified Architecture

### 1. End-to-End Release Automation
- User configures integrations once (via integration APIs)
- Release orchestration automatically uses configured integrations
- No manual intervention needed for routine release tasks

### 2. Single Source of Truth
- One codebase to maintain
- One deployment pipeline
- One set of tests

### 3. Flexibility
- Support multiple providers per integration category
- Tenant-specific integration configurations
- Easy to add new integration providers

### 4. Testability
- Mock integrations for orchestration testing
- Real integrations for integration testing
- Adapters are independently testable

### 5. Scalability
- Horizontal scaling (multiple service instances)
- Distributed locking prevents duplicate task execution
- Cron-based polling is stateless

---

## What's New (After Merge)

### New Components

1. **Integration Adapter Factory**
   - Maps orchestration interfaces to concrete implementations
   - Dynamically loads tenant-configured integrations
   - Location: `services/integration-adapter-factory.ts`

2. **Orchestration Storage Layer**
   - DTOs for releases, tasks, cron jobs, regression cycles
   - Location: `storage/release/`

3. **Task Execution Engine**
   - Executes tasks using real integrations
   - Updates task status in database
   - Location: `services/task-executor.ts`

4. **Cron Job System**
   - Polls for pending tasks
   - Executes tasks based on dependencies and time triggers
   - Location: `routes/release/*-cron-job.ts`

5. **Orchestration Utilities**
   - Task creation logic
   - Task sequencing and ordering
   - Time-based triggers
   - Location: `utils/task-*.ts`, `utils/time-utils.ts`

### New APIs

```
POST   /api/v1/release-management/tenants/:tenantId/releases
GET    /api/v1/release-management/tenants/:tenantId/releases
GET    /api/v1/release-management/tenants/:tenantId/releases/:releaseId
PATCH  /api/v1/release-management/tenants/:tenantId/releases/:releaseId
DELETE /api/v1/release-management/tenants/:tenantId/releases/:releaseId

GET    /api/v1/release-management/tenants/:tenantId/releases/:releaseId/tasks
GET    /api/v1/release-management/tenants/:tenantId/releases/:releaseId/tasks/:taskId
PUT    /api/v1/release-management/tenants/:tenantId/releases/:releaseId/tasks/:taskId

POST   /api/v1/release-management/tenants/:tenantId/releases/:releaseId/trigger-pre-release
```

### New Database Tables

```
releases                 # Release records
release_tasks            # Task records (linked to releases)
cron_jobs               # Cron job configuration per release
regression_cycles       # Regression cycle records
builds                  # Build records (linked to releases, platforms, targets)
platform_releases       # Junction table (releases ↔ platforms)
release_builds          # Junction table (releases ↔ builds)
state_history           # State change audit log
state_history_items     # State change details
```

---

## Success Metrics

After successful merge, you should be able to:

1. ✅ Configure SCM integration via API
2. ✅ Configure CI/CD integration via API
3. ✅ Create a release via orchestration API
4. ✅ See Stage 1 tasks created automatically
5. ✅ See cron job polling every 60s
6. ✅ See tasks execute using real integrations
7. ✅ See branches created in real SCM (GitHub/GitLab/Bitbucket)
8. ✅ See workflows triggered in real CI/CD (GitHub Actions/Jenkins)
9. ✅ See tickets created in real PM tool (JIRA/Linear)
10. ✅ See test runs created in real test platform (Checkmate)

---

## Next Steps

1. **Execute Merge**: Follow [MERGE_QUICK_START.md](./MERGE_QUICK_START.md)
2. **Implement Adapters**: Complete integration adapter factory
3. **Test End-to-End**: Create a release and verify it works with real integrations
4. **Document**: Update API documentation with new endpoints
5. **Deploy**: Roll out to staging, then production

---

**Last Updated**: 2025-11-22  
**Status**: DRAFT - Ready for Execution  
**Author**: AI Assistant

