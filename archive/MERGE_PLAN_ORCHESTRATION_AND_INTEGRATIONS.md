# Merge Plan: Release Orchestration + Integrations

## Overview

This document outlines the plan to merge two versions of the delivr-server-ota-managed repository:

1. **Release Orchestration Repo** (`/Users/navkashkrishna/delivr-server-ota-managed`)
   - Complete release orchestration logic (Stages 1-3)
   - Task creation, sequencing, and execution
   - Cron jobs for automated workflows
   - Integration interfaces (contracts)
   - Release/Task/RegressionCycle DTOs

2. **Integrations Repo** (Current: `/Users/navkashkrishna/dota-managed/delivr-server-ota-managed`)
   - Complete integration implementations (CI/CD, Comm, PM, SCM, Store, Test Management)
   - Controllers, services, models, storage for all integrations
   - Migrations for integration tables
   - Types and validation logic

**Goal**: Combine both into a single unified codebase where release orchestration can use real integration implementations.

---

## Repository Analysis

### Files in Release Orchestration Repo ONLY

#### Core Orchestration Logic
```
api/script/routes/release/
├── kickoff-cron-job.ts           # Stage 1 cron job
├── regression-cron-job.ts        # Stage 2 cron job
├── post-regression-cron-job.ts   # Stage 3 cron job
├── release-management.ts         # Main release management routes
└── release-types.ts              # Type definitions

api/script/services/
├── cron-lock-service.ts          # Distributed locking
├── cron-scheduler.ts             # Cron job scheduler
├── integration-mocks.ts          # Mock integrations for testing
└── task-executor.ts              # Task execution engine

api/script/storage/release/
├── cron-job-dto.ts               # Cron job data access
├── regression-cycle-dto.ts       # Regression cycle data access
├── release-dto.ts                # Release data access
├── release-models.ts             # Sequelize models for releases
└── release-tasks-dto.ts          # Release tasks data access

api/script/utils/
├── regression-cycle-creation.ts  # Regression cycle utils
├── task-creation.ts              # Task creation logic
├── task-sequencing.ts            # Task ordering/sequencing
└── time-utils.ts                 # Time-based task triggers
```

#### Integration Interfaces (Contracts)
```
api/script/routes/release/integrations/
├── cicd-integration.interface.ts            # CI/CD contract
├── jira-integration.interface.ts            # JIRA contract
├── notification-integration.interface.ts    # Notification contract
├── scm-integration.interface.ts             # SCM contract
└── test-platform-integration.interface.ts   # Test platform contract
```

#### Migrations
```
migrations/
├── 001_release_orchestration_complete.sql   # All release tables
├── 005_release_orchestration_columns.sql    # Additional columns
├── 006_platform_target_junction_tables.sql  # Platform/target mappings
├── 007_builds_unique_constraint.sql         # Builds table fixes
├── 008_update_task_type_enum.sql            # Task type updates
├── 009_manual_stage3_trigger_and_task_renaming.sql  # Stage 3 manual trigger
└── 010_migrate_to_consolidated_schema.sql   # Schema consolidation
```

#### Test Files
```
api/
├── test-chunk*.ts                # Unit/integration tests for each chunk
├── test-e2e-all-stages.ts        # Full E2E test
└── E2E_TESTING_REPORT.md         # Test results documentation
```

### Files in Integrations Repo ONLY

#### Integration Implementations
```
api/script/controllers/integrations/
├── ci-cd/                        # CI/CD implementations (GitHub Actions, Jenkins)
├── comm/                         # Communication (Slack)
├── project-management/           # Project management (JIRA, Linear, etc.)
├── scm/                          # SCM (GitHub, GitLab, Bitbucket)
├── store-controllers.ts          # Store integrations
└── test-management/              # Test management (Checkmate)

api/script/services/integrations/
├── ci-cd/                        # CI/CD services
├── comm/                         # Communication services
├── project-management/           # PM services
├── scm/                          # SCM services
├── store/                        # Store services
└── test-management/              # Test management services

api/script/models/integrations/
├── ci-cd/                        # CI/CD models
├── comm/                         # Communication models
├── project-management/           # PM models
├── scm/                          # SCM models
├── store/                        # Store models
└── test-management/              # Test management models

api/script/storage/integrations/
├── ci-cd/                        # CI/CD storage
├── comm/                         # Communication storage
├── scm/                          # SCM storage
└── test-management/              # Test management storage

api/script/types/integrations/
├── ci-cd/                        # CI/CD types
├── comm/                         # Communication types
├── project-management/           # PM types
├── scm/                          # SCM types
├── store/                        # Store types
└── test-management/              # Test management types
```

#### Integration Routes
```
api/script/routes/
├── ci-cd-integrations.ts         # CI/CD routes
├── comm-integrations.ts          # Communication routes
├── pm-integrations.ts            # Project management routes
├── scm-integrations.ts           # SCM routes
├── store-integrations.ts         # Store routes
└── test-management-integrations.ts  # Test management routes
```

#### Integration Migrations
```
migrations/
├── 003_tenant_scm_integrations_simple.sql        # SCM integrations
├── 004_tenant_comm_integrations.sql              # Communication integrations
├── 004-008_store_integrations_complete.sql       # Store integrations
├── 005_project_management_integration.sql        # PM integrations
├── 005_project_test_management_integrations.sql  # Test management integrations
├── 006_tenant_ci_cd_integrations.sql             # CI/CD integrations
├── 007_test_management_configs.sql               # Test management configs
├── 008_tenant_ci_cd_workflows.sql                # CI/CD workflows
├── 009_tenant_ci_cd_config.sql                   # CI/CD config
└── 010_missing_tables.sql                        # Missing tables fix
```

### Files in BOTH Repos (Need Careful Merge)

#### Base Infrastructure
```
api/script/
├── api.ts                        # Main API entry point
├── server.ts                     # Server setup
├── environment.ts                # Environment config
├── default-server.ts             # Default server config
├── error.ts                      # Error handling
├── file-upload-manager.ts        # File uploads
├── memcached-manager.ts          # Memcached
└── redis-manager.ts              # Redis

api/script/common/
├── middleware/auth.ts            # Authentication
├── storage/models.ts             # Base models
└── storage/sequelize-common-storage.ts  # Sequelize setup

api/script/middleware/
├── app-permissions.ts            # App permissions
├── release-permissions.ts        # Release permissions
└── tenant-permissions.ts         # Tenant permissions

api/script/storage/
├── aws-storage.ts                # AWS storage
├── azure-storage.ts              # Azure storage
├── json-storage.ts               # JSON storage
├── storage-instance.ts           # Storage instance
├── storage.ts                    # Storage interface
└── seedData.ts                   # Seed data
```

#### Routes (Exist in Both)
```
api/script/routes/
├── acquisition.ts                # Acquisition routes
├── management.ts                 # Management routes
├── release-management.ts         # Release routes (DIFFERENT in each)
├── authentication.ts             # Auth routes
└── ...other shared routes
```

#### Migrations (Base)
```
migrations/
├── 001_unified_architecture.sql  # Base schema (SAME)
├── 002_release_management.sql    # Base release tables (DIFFERENT)
```

---

## Merge Strategy

### Phase 1: Pre-Merge Preparation

#### Step 1.1: Backup Current State
```bash
# In integrations repo (current workspace)
git branch backup-integrations-only-$(date +%Y%m%d)
git add -A
git commit -m "Backup: Integrations-only state before merge"
```

#### Step 1.2: Create Merge Branch
```bash
git checkout -b merge-orchestration-and-integrations
```

#### Step 1.3: Document Integration Contracts
Create a mapping document showing which orchestration interfaces map to which integration implementations:

| Interface (Orchestration) | Implementation (Integrations) | Status |
|---------------------------|-------------------------------|--------|
| `SCMIntegration` | `scm-service-factory.ts` → GitHub/GitLab/Bitbucket | ✅ Ready |
| `NotificationIntegration` | `comm/slack-integration.service.ts` | ✅ Ready |
| `JIRAIntegration` | `project-management/jira.service.ts` | ✅ Ready |
| `TestPlatformIntegration` | `test-management/checkmate.service.ts` | ✅ Ready |
| `CICDIntegration` | `ci-cd/github-actions.service.ts` | ✅ Ready |

---

### Phase 2: Copy Orchestration Files (No Conflicts)

Copy all orchestration-specific files that don't exist in integrations repo:

#### Step 2.1: Copy Cron Job Routes
```bash
# Source: /Users/navkashkrishna/delivr-server-ota-managed/api/script/routes/release/
# Target: /Users/navkashkrishna/dota-managed/delivr-server-ota-managed/api/script/routes/release/

cp kickoff-cron-job.ts          → routes/release/
cp regression-cron-job.ts       → routes/release/
cp post-regression-cron-job.ts  → routes/release/
cp release-types.ts             → routes/release/
```

#### Step 2.2: Copy Orchestration Services
```bash
# Source: /Users/navkashkrishna/delivr-server-ota-managed/api/script/services/
# Target: /Users/navkashkrishna/dota-managed/delivr-server-ota-managed/api/script/services/

cp cron-lock-service.ts         → services/
cp cron-scheduler.ts            → services/
cp integration-mocks.ts         → services/
cp task-executor.ts             → services/
```

#### Step 2.3: Copy Release Storage Layer
```bash
# Source: /Users/navkashkrishna/delivr-server-ota-managed/api/script/storage/release/
# Target: /Users/navkashkrishna/dota-managed/delivr-server-ota-managed/api/script/storage/release/

cp cron-job-dto.ts              → storage/release/
cp regression-cycle-dto.ts      → storage/release/
cp release-dto.ts               → storage/release/
cp release-models.ts            → storage/release/
cp release-tasks-dto.ts         → storage/release/
```

#### Step 2.4: Copy Orchestration Utils
```bash
# Source: /Users/navkashkrishna/delivr-server-ota-managed/api/script/utils/
# Target: /Users/navkashkrishna/dota-managed/delivr-server-ota-managed/api/script/utils/

cp regression-cycle-creation.ts → utils/
cp task-creation.ts             → utils/
cp task-sequencing.ts           → utils/
cp time-utils.ts                → utils/
```

#### Step 2.5: Copy Integration Interfaces
```bash
# Source: /Users/navkashkrishna/delivr-server-ota-managed/api/script/routes/release/integrations/
# Target: /Users/navkashkrishna/dota-managed/delivr-server-ota-managed/api/script/routes/release/integrations/

cp cicd-integration.interface.ts           → routes/release/integrations/
cp jira-integration.interface.ts           → routes/release/integrations/
cp notification-integration.interface.ts   → routes/release/integrations/
cp scm-integration.interface.ts            → routes/release/integrations/
cp test-platform-integration.interface.ts  → routes/release/integrations/
cp index.ts                                → routes/release/integrations/
```

---

### Phase 3: Merge Conflicting Files

#### Step 3.1: Merge `release-management.ts` Route

**Conflict**: Both repos have this file, but orchestration repo has full implementation.

**Strategy**: Replace integrations version with orchestration version.

```bash
# Backup current version
cp routes/release-management.ts routes/release-management.ts.integrations-backup

# Copy orchestration version
cp /Users/navkashkrishna/delivr-server-ota-managed/api/script/routes/release/release-management.ts \
   api/script/routes/release-management.ts
```

**Manual Review Needed**: Check if integrations version had any custom logic that needs to be preserved.

#### Step 3.2: Merge Migrations

**Critical**: Migrations must be executed in order. Need to reconcile numbering.

**Current State**:
- Integrations repo: `001` to `010` (integration tables)
- Orchestration repo: `001` to `010` (release tables + integration tables)

**Strategy**: Consolidate migrations to avoid duplicates.

**Action Items**:
1. Review orchestration repo's `010_migrate_to_consolidated_schema.sql` (likely supersedes earlier ones)
2. Extract only orchestration-specific migrations
3. Renumber to fit after integrations migrations

**New Migration Sequence**:
```
001_unified_architecture.sql                    # Base (KEEP from integrations)
002_release_management.sql                      # Base release tables (KEEP from integrations)
003_tenant_scm_integrations_simple.sql          # SCM (KEEP from integrations)
004_tenant_comm_integrations.sql                # Comm (KEEP from integrations)
004-008_store_integrations_complete.sql         # Store (KEEP from integrations)
005_project_management_integration.sql          # PM (KEEP from integrations)
005_project_test_management_integrations.sql    # Test Mgmt (KEEP from integrations)
006_tenant_ci_cd_integrations.sql               # CI/CD (KEEP from integrations)
007_test_management_configs.sql                 # Test configs (KEEP from integrations)
008_tenant_ci_cd_workflows.sql                  # Workflows (KEEP from integrations)
009_tenant_ci_cd_config.sql                     # CI/CD config (KEEP from integrations)
010_missing_tables.sql                          # Missing tables (KEEP from integrations)

# NEW: Orchestration-specific migrations
011_release_orchestration_columns.sql           # FROM: 005_release_orchestration_columns.sql
012_platform_target_junction_tables.sql         # FROM: 006_platform_target_junction_tables.sql
013_builds_unique_constraint.sql                # FROM: 007_builds_unique_constraint.sql
014_update_task_type_enum.sql                   # FROM: 008_update_task_type_enum.sql
015_manual_stage3_trigger.sql                   # FROM: 009_manual_stage3_trigger_and_task_renaming.sql
```

**Create New Migration**: `011_orchestration_complete.sql` that includes:
- Release orchestration columns
- Platform/target junction tables
- Builds table constraints
- Task type enum updates
- Stage 3 manual trigger support

#### Step 3.3: Merge Base Infrastructure Files

These files exist in both but may have diverged:
- `api.ts`
- `server.ts`
- `environment.ts`

**Strategy**: Use 3-way diff to merge changes.

**Action**:
```bash
# For each file:
# 1. Identify changes in orchestration version
# 2. Identify changes in integrations version
# 3. Merge both sets of changes
# 4. Test thoroughly
```

---

### Phase 4: Create Integration Adapters

The orchestration code expects interfaces, but integrations code has concrete implementations. Need adapters to bridge them.

#### Step 4.1: Create Adapter Factory

Create `api/script/services/integration-adapter-factory.ts`:

```typescript
import { SCMIntegration } from '../routes/release/integrations/scm-integration.interface';
import { NotificationIntegration } from '../routes/release/integrations/notification-integration.interface';
import { JIRAIntegration } from '../routes/release/integrations/jira-integration.interface';
import { TestPlatformIntegration } from '../routes/release/integrations/test-platform-integration.interface';
import { CICDIntegration } from '../routes/release/integrations/cicd-integration.interface';

// Import actual implementations
import { SCMServiceFactory } from './scm/scm-service-factory';
import { SlackIntegrationService } from './integrations/comm/slack-integration.service';
import { JiraService } from './integrations/project-management/jira.service';
import { CheckmateService } from './integrations/test-management/checkmate.service';
import { GitHubActionsService } from './integrations/ci-cd/github-actions.service';

export interface IntegrationAdapters {
  scm?: SCMIntegration;
  notification?: NotificationIntegration;
  jira?: JIRAIntegration;
  testPlatform?: TestPlatformIntegration;
  cicd?: CICDIntegration;
}

/**
 * Loads real integrations for a tenant based on their configuration
 */
export async function loadIntegrationsForTenant(
  tenantId: string
): Promise<IntegrationAdapters> {
  const adapters: IntegrationAdapters = {};
  
  // Load SCM integration (if configured)
  const scmService = await SCMServiceFactory.getServiceForTenant(tenantId);
  if (scmService) {
    adapters.scm = createSCMAdapter(scmService);
  }
  
  // Load Notification integration (if configured)
  const slackService = await SlackIntegrationService.getForTenant(tenantId);
  if (slackService) {
    adapters.notification = createNotificationAdapter(slackService);
  }
  
  // Load JIRA integration (if configured)
  const jiraService = await JiraService.getForTenant(tenantId);
  if (jiraService) {
    adapters.jira = createJiraAdapter(jiraService);
  }
  
  // Load Test Platform integration (if configured)
  const checkmateService = await CheckmateService.getForTenant(tenantId);
  if (checkmateService) {
    adapters.testPlatform = createTestPlatformAdapter(checkmateService);
  }
  
  // Load CI/CD integration (if configured)
  const cicdService = await GitHubActionsService.getForTenant(tenantId);
  if (cicdService) {
    adapters.cicd = createCICDAdapter(cicdService);
  }
  
  return adapters;
}

// Adapter functions (map implementation methods to interface methods)
function createSCMAdapter(service: any): SCMIntegration {
  return {
    forkOutBranch: async (tenantId, branchName, baseBranch, config) => {
      return service.createBranch(config.repoOwner, config.repoName, branchName, baseBranch);
    },
    createReleaseTag: async (tenantId, branch, tagName, targets, version, config) => {
      return service.createTag(config.repoOwner, config.repoName, tagName, branch);
    },
    createReleaseNotes: async (tenantId, currentTag, previousTag, version, parentTargets, config) => {
      return service.generateReleaseNotes(config.repoOwner, config.repoName, currentTag, previousTag);
    },
    createGitHubRelease: async (tenantId, currentTag, previousTag, baseVersion, parentTargets, releaseDate, releaseId, config) => {
      return service.createRelease(config.repoOwner, config.repoName, currentTag, previousTag, releaseDate);
    }
  };
}

function createNotificationAdapter(service: any): NotificationIntegration {
  return {
    sendMessage: async (tenantId, template, params, metadata, config) => {
      return service.sendMessage(config.channelId, template, params);
    }
  };
}

function createJiraAdapter(service: any): JIRAIntegration {
  return {
    createReleaseTicket: async (tenantId, issueType, data, config) => {
      return service.createIssue(config.projectKey, issueType, data.summary, data.description);
    },
    checkTicketStatus: async (tenantId, ticketId, config) => {
      return service.getIssueStatus(ticketId);
    }
  };
}

function createTestPlatformAdapter(service: any): TestPlatformIntegration {
  return {
    createTestSuite: async (tenantId, data, config) => {
      return service.createTestRun(config.projectId, data.name, data.releaseVersion);
    },
    resetTestSuite: async (tenantId, suiteId, config) => {
      return service.resetTestRun(suiteId);
    },
    getTestSuiteStatus: async (tenantId, suiteId, config) => {
      return service.getTestRunStatus(suiteId);
    }
  };
}

function createCICDAdapter(service: any): CICDIntegration {
  return {
    triggerPlannedRelease: async (releaseId, params, config) => {
      return service.triggerWorkflow(config.workflowId, params);
    },
    triggerRegressionBuilds: async (releaseId, params, config) => {
      return service.triggerWorkflow(config.workflowId, params);
    },
    triggerAutomationRuns: async (releaseId, params, config) => {
      return service.triggerWorkflow(config.workflowId, params);
    },
    createTestFlightBuild: async (releaseId, params, config) => {
      return service.triggerWorkflow(config.workflowId, params);
    }
  };
}
```

#### Step 4.2: Update Cron Jobs to Use Real Integrations

Replace `getMockIntegrations()` with `loadIntegrationsForTenant()` in:
- `kickoff-cron-job.ts`
- `regression-cron-job.ts`
- `post-regression-cron-job.ts`

**Before**:
```typescript
const integrations = getMockIntegrations();
```

**After**:
```typescript
import { loadIntegrationsForTenant } from '../../services/integration-adapter-factory';

const integrations = await loadIntegrationsForTenant(release.tenantId);
```

---

### Phase 5: Update Routes and API Entry Point

#### Step 5.1: Register Orchestration Routes

Update `api/script/api.ts` to include orchestration routes:

```typescript
// Add import
import { getReleaseManagementRouter } from './routes/release/release-management';

// Register route
const releaseManagementRouter = getReleaseManagementRouter({ storage });
app.use('/api/v1/release-management', releaseManagementRouter);
```

#### Step 5.2: Ensure All Integration Routes Are Registered

Verify all integration routes are registered in `api.ts`:
- CI/CD integrations
- Communication integrations
- Project management integrations
- SCM integrations
- Store integrations
- Test management integrations

---

### Phase 6: Database Migration and Testing

#### Step 6.1: Create Consolidated Migration Script

Create `migrations/011_orchestration_complete.sql` that adds all orchestration tables/columns:

```sql
-- ============================================================================
-- Migration: Release Orchestration Complete
-- Description: Adds all release orchestration tables and columns
-- Date: 2025-11-22
-- ============================================================================

-- Add orchestration columns to releases table
-- (from 005_release_orchestration_columns.sql)

-- Create platform/target junction tables
-- (from 006_platform_target_junction_tables.sql)

-- Add builds table constraints
-- (from 007_builds_unique_constraint.sql)

-- Update task type enum
-- (from 008_update_task_type_enum.sql)

-- Add Stage 3 manual trigger support
-- (from 009_manual_stage3_trigger_and_task_renaming.sql)
```

#### Step 6.2: Run Migrations

```bash
# Run new migration
mysql -u root -p codepushdb < migrations/011_orchestration_complete.sql

# Verify tables exist
mysql -u root -p codepushdb -e "SHOW TABLES LIKE 'release%';"
mysql -u root -p codepushdb -e "SHOW TABLES LIKE 'regression%';"
mysql -u root -p codepushdb -e "SHOW TABLES LIKE 'cron%';"
```

#### Step 6.3: Test Build

```bash
cd api
npm run build
```

Fix any TypeScript errors that arise from:
- Missing imports
- Type mismatches between interfaces and implementations
- Path resolution issues

#### Step 6.4: Run Integration Tests

```bash
# Run existing integration tests
npm test

# Run orchestration E2E tests
npm run test:e2e
```

---

### Phase 7: Create Integration Test Suite

#### Step 7.1: Test Orchestration with Real Integrations

Create `api/test-orchestration-with-real-integrations.ts`:

```typescript
/**
 * Test: Release Orchestration with Real Integrations
 * 
 * Tests the complete release workflow using actual integration implementations
 * instead of mocks.
 */

import { loadIntegrationsForTenant } from './script/services/integration-adapter-factory';

describe('Release Orchestration with Real Integrations', () => {
  
  test('Should create release and execute Stage 1 tasks with real SCM', async () => {
    // 1. Create a release
    // 2. Verify real SCM integration is loaded
    // 3. Execute FORK_BRANCH task
    // 4. Verify branch was actually created in GitHub/GitLab
  });
  
  test('Should execute Stage 2 regression cycle with real CI/CD', async () => {
    // 1. Trigger regression cycle
    // 2. Verify real CI/CD integration is loaded
    // 3. Execute TRIGGER_REGRESSION_BUILDS task
    // 4. Verify workflow was actually triggered
  });
  
  test('Should execute Stage 3 with real Test Management', async () => {
    // 1. Transition to Stage 3
    // 2. Verify real Test Management integration is loaded
    // 3. Execute test suite operations
    // 4. Verify test suite was actually updated in Checkmate
  });
  
});
```

#### Step 7.2: Test Adapter Mappings

Create `api/test-integration-adapters.ts`:

```typescript
/**
 * Test: Integration Adapters
 * 
 * Verifies that adapters correctly map orchestration interfaces to
 * integration implementations.
 */

describe('Integration Adapters', () => {
  
  test('SCM adapter should map interface methods to service methods', async () => {
    // Test each method mapping
  });
  
  test('Notification adapter should map interface methods to service methods', async () => {
    // Test each method mapping
  });
  
  // ... test all adapters
  
});
```

---

### Phase 8: Documentation and Cleanup

#### Step 8.1: Update README

Update main README to explain the unified architecture:

```markdown
# Delivr Server OTA - Unified Release Management Platform

## Architecture

This codebase contains:

1. **Release Orchestration Engine**
   - Automated release workflows (3 stages)
   - Task creation, sequencing, and execution
   - Cron-based polling and automation
   - Integration interfaces (contracts)

2. **Integration Implementations**
   - CI/CD: GitHub Actions, Jenkins
   - Communication: Slack
   - Project Management: JIRA, Linear, Asana, Monday, ClickUp
   - SCM: GitHub, GitLab, Bitbucket
   - Store: Apple App Store, Google Play Store
   - Test Management: Checkmate

3. **Integration Adapter Layer**
   - Bridges orchestration interfaces with concrete implementations
   - Dynamically loads integrations based on tenant configuration
   - Supports multiple providers per integration category

## Key Components

### Orchestration
- `routes/release/release-management.ts` - Main release API
- `routes/release/*-cron-job.ts` - Stage-specific cron jobs
- `services/task-executor.ts` - Task execution engine
- `utils/task-creation.ts` - Task creation logic
- `utils/task-sequencing.ts` - Task ordering/dependencies

### Integrations
- `controllers/integrations/` - Integration CRUD APIs
- `services/integrations/` - Integration business logic
- `services/integration-adapter-factory.ts` - Adapter factory

### Storage
- `storage/release/` - Release orchestration data access
- `storage/integrations/` - Integration data access

## Getting Started

See [docs/DEV_SETUP.md](docs/DEV_SETUP.md) for setup instructions.
```

#### Step 8.2: Create Migration Guide

Create `docs/ORCHESTRATION_MIGRATION_GUIDE.md` explaining:
- How orchestration was integrated
- How to configure integrations for orchestration
- How to test end-to-end workflows
- Troubleshooting common issues

#### Step 8.3: Clean Up Backup Files

```bash
# Remove backup files after successful merge
rm api/script/routes/release-management.ts.integrations-backup
```

---

## Validation Checklist

Before considering the merge complete, verify:

### Build and Compile
- [ ] `npm run build` succeeds with no errors
- [ ] No TypeScript errors
- [ ] No ESLint errors

### Database
- [ ] All migrations run successfully
- [ ] All required tables exist
- [ ] Foreign key constraints are valid
- [ ] Indexes are created

### API Endpoints
- [ ] Release management endpoints respond
- [ ] Integration endpoints still work
- [ ] Health check endpoints work

### Orchestration
- [ ] Can create a release
- [ ] Stage 1 tasks execute
- [ ] Stage 2 regression cycles execute
- [ ] Stage 3 post-regression tasks execute
- [ ] Cron jobs poll correctly

### Integrations
- [ ] Can configure SCM integration
- [ ] Can configure CI/CD integration
- [ ] Can configure Project Management integration
- [ ] Can configure Test Management integration
- [ ] Can configure Communication integration
- [ ] Orchestration can load and use integrations

### Integration Adapters
- [ ] SCM adapter works
- [ ] CI/CD adapter works
- [ ] JIRA adapter works
- [ ] Test Platform adapter works
- [ ] Notification adapter works

### Tests
- [ ] Existing integration tests pass
- [ ] Orchestration E2E tests pass
- [ ] New adapter tests pass

---

## Rollback Plan

If the merge causes critical issues:

```bash
# Rollback to integrations-only state
git reset --hard backup-integrations-only-YYYYMMDD
git push --force-with-lease origin merge-orchestration-and-integrations
```

---

## Post-Merge Tasks

After successful merge:

1. **Update CI/CD Pipeline**
   - Ensure build pipeline includes new files
   - Add orchestration tests to CI

2. **Update Deployment Scripts**
   - Ensure new migrations run on deploy
   - Update environment variables for orchestration

3. **Update Monitoring**
   - Add metrics for cron job execution
   - Add alerts for task failures
   - Add dashboards for release status

4. **Team Training**
   - Document new orchestration workflows
   - Train team on release management APIs
   - Create runbooks for troubleshooting

5. **Performance Testing**
   - Test with multiple concurrent releases
   - Test with large number of tasks
   - Test cron job scaling

---

## Timeline Estimate

| Phase | Estimated Time | Dependencies |
|-------|----------------|--------------|
| Phase 1: Pre-Merge Preparation | 1-2 hours | None |
| Phase 2: Copy Orchestration Files | 2-3 hours | Phase 1 |
| Phase 3: Merge Conflicting Files | 3-4 hours | Phase 2 |
| Phase 4: Create Integration Adapters | 4-6 hours | Phase 3 |
| Phase 5: Update Routes and API | 1-2 hours | Phase 4 |
| Phase 6: Database Migration and Testing | 2-3 hours | Phase 5 |
| Phase 7: Integration Test Suite | 3-4 hours | Phase 6 |
| Phase 8: Documentation and Cleanup | 2-3 hours | Phase 7 |
| **Total** | **18-27 hours** | |

**Recommended Approach**: Execute in 2-3 day sprint with daily checkpoints.

---

## Critical Success Factors

1. **Careful Migration Management**: Ensure migrations don't conflict or create duplicate tables
2. **Thorough Adapter Testing**: Verify each adapter correctly maps interface to implementation
3. **Integration Configuration**: Ensure orchestration can dynamically load tenant integrations
4. **Backward Compatibility**: Ensure existing integration APIs continue to work
5. **Comprehensive Testing**: Test both orchestration workflows and integration APIs independently

---

## Next Steps

1. Review this plan with the team
2. Create a merge branch
3. Execute Phase 1 (Pre-Merge Preparation)
4. Begin Phase 2 (Copy Orchestration Files)
5. Checkpoint after each phase completion

---

## Questions to Answer Before Starting

1. Are there any custom changes in the integrations repo's `release-management.ts` that need to be preserved?
2. Do we need to support multiple versions of the API during transition?
3. Are there any production tenants actively using either codebase?
4. Do we need a feature flag to gradually roll out orchestration?
5. What's the rollback strategy for production deployments?

---

## Appendix: File Copy Commands

For reference, here are the exact copy commands for Phase 2:

```bash
# Set source and target directories
SOURCE="/Users/navkashkrishna/delivr-server-ota-managed"
TARGET="/Users/navkashkrishna/dota-managed/delivr-server-ota-managed"

# Copy cron job routes
cp "$SOURCE/api/script/routes/release/kickoff-cron-job.ts" \
   "$TARGET/api/script/routes/release/"
cp "$SOURCE/api/script/routes/release/regression-cron-job.ts" \
   "$TARGET/api/script/routes/release/"
cp "$SOURCE/api/script/routes/release/post-regression-cron-job.ts" \
   "$TARGET/api/script/routes/release/"
cp "$SOURCE/api/script/routes/release/release-types.ts" \
   "$TARGET/api/script/routes/release/"

# Copy services
cp "$SOURCE/api/script/services/cron-lock-service.ts" \
   "$TARGET/api/script/services/"
cp "$SOURCE/api/script/services/cron-scheduler.ts" \
   "$TARGET/api/script/services/"
cp "$SOURCE/api/script/services/integration-mocks.ts" \
   "$TARGET/api/script/services/"
cp "$SOURCE/api/script/services/task-executor.ts" \
   "$TARGET/api/script/services/"

# Copy storage/release
mkdir -p "$TARGET/api/script/storage/release"
cp "$SOURCE/api/script/storage/release/cron-job-dto.ts" \
   "$TARGET/api/script/storage/release/"
cp "$SOURCE/api/script/storage/release/regression-cycle-dto.ts" \
   "$TARGET/api/script/storage/release/"
cp "$SOURCE/api/script/storage/release/release-dto.ts" \
   "$TARGET/api/script/storage/release/"
cp "$SOURCE/api/script/storage/release/release-models.ts" \
   "$TARGET/api/script/storage/release/"
cp "$SOURCE/api/script/storage/release/release-tasks-dto.ts" \
   "$TARGET/api/script/storage/release/"

# Copy utils
cp "$SOURCE/api/script/utils/regression-cycle-creation.ts" \
   "$TARGET/api/script/utils/"
cp "$SOURCE/api/script/utils/task-creation.ts" \
   "$TARGET/api/script/utils/"
cp "$SOURCE/api/script/utils/task-sequencing.ts" \
   "$TARGET/api/script/utils/"
cp "$SOURCE/api/script/utils/time-utils.ts" \
   "$TARGET/api/script/utils/"

# Copy integration interfaces
mkdir -p "$TARGET/api/script/routes/release/integrations"
cp "$SOURCE/api/script/routes/release/integrations/cicd-integration.interface.ts" \
   "$TARGET/api/script/routes/release/integrations/"
cp "$SOURCE/api/script/routes/release/integrations/jira-integration.interface.ts" \
   "$TARGET/api/script/routes/release/integrations/"
cp "$SOURCE/api/script/routes/release/integrations/notification-integration.interface.ts" \
   "$TARGET/api/script/routes/release/integrations/"
cp "$SOURCE/api/script/routes/release/integrations/scm-integration.interface.ts" \
   "$TARGET/api/script/routes/release/integrations/"
cp "$SOURCE/api/script/routes/release/integrations/test-platform-integration.interface.ts" \
   "$TARGET/api/script/routes/release/integrations/"
cp "$SOURCE/api/script/routes/release/integrations/index.ts" \
   "$TARGET/api/script/routes/release/integrations/"

echo "✅ Phase 2 file copy complete!"
```

---

## Success Criteria

The merge is considered successful when:

1. ✅ All files copied without conflicts
2. ✅ TypeScript builds successfully
3. ✅ All migrations execute cleanly
4. ✅ All existing tests pass
5. ✅ Integration adapters work correctly
6. ✅ Can create a release via API
7. ✅ Stage 1 tasks execute with real integrations
8. ✅ Stage 2 regression cycles execute with real integrations
9. ✅ Stage 3 post-regression tasks execute with real integrations
10. ✅ Cron jobs poll and execute tasks
11. ✅ All integration CRUD APIs still work
12. ✅ Documentation is updated

---

**Last Updated**: 2025-11-22  
**Author**: AI Assistant  
**Status**: DRAFT - Awaiting Review

