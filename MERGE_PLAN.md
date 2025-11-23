# MERGE PLAN: Release Orchestration + Integrations

**Status**: Active - Single Source of Truth  
**Last Updated**: 2025-11-22 (Re-evaluated orchestration repo - no new concerns)  
**Last Re-Evaluation**: 2025-11-22 (See [MERGE_RE_EVALUATION.md](./MERGE_RE_EVALUATION.md))  
**Estimated Time**: 1.3-1.8 hours (Database phase already complete!)  
**Approach**: Dependency Injection + TaskExecutor Config Lookup (No Adapter Layer, No Service Changes)

---

## ✅ RE-EVALUATION COMPLETED (2025-11-22)

**Full orchestration repo re-evaluation completed** - See [MERGE_RE_EVALUATION.md](./MERGE_RE_EVALUATION.md)

**Key Findings**:
- ✅ **No new changes** in orchestration repo since last evaluation
- ✅ **No new concerns** or blockers identified
- ✅ **Database already migrated** (Phase 4 complete!)
- ✅ **All files ready to copy** (Phase 2 validated)
- ✅ **Integration signatures verified** (Phase 8 pre-validated)
- ✅ **Timeline updated**: 1.3-1.8 hours (20 min saved!)

**Status**: **READY TO PROCEED WITH PHASE 2** when you give the signal.

---

## 🎯 CRITICAL CLARIFICATION (2025-11-22)

**Integration services DO NOT need to accept releaseConfigId!**

- ✅ **Services already accept specific IDs** (workflowId, integrationId, configId, channelId)
- ✅ **TaskExecutor does ALL lookups** - Looks up ReleaseConfiguration and extracts specific IDs
- ✅ **No service changes needed** - Phase 8 is just verification
- ✅ **Faster implementation** - 1.5-2 hours (down from 2-3 hours)
- ✅ **Lower risk** - Only TaskExecutor and cron jobs change

**Pattern**: 
```typescript
// TaskExecutor looks up config
const config = await this.getReleaseConfig(release.releaseConfigId);
const workflowId = config.ciConfigId;

// TaskExecutor calls service with correct signature
await this.cicdService.trigger(tenantId, {
  workflowId: workflowId,
  jobParameters: params
});
```

**⚠️ IMPORTANT**: See [INTEGRATION_SIGNATURES_CLARIFICATION.md](./INTEGRATION_SIGNATURES_CLARIFICATION.md) for actual service signatures!

See [MERGE_FEASIBILITY_ANALYSIS.md](./MERGE_FEASIBILITY_ANALYSIS.md) for detailed analysis.

---

## 📊 Phase Completion Status

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| **Phase 1** | ⏸️ Not Started | - | Backup and Preparation |
| **Phase 2** | ⏸️ Not Started | - | Copy Orchestration Files |
| **Phase 3** | ⏸️ Not Started | - | Merge release-management.ts |
| **Phase 4** | ✅ **COMPLETE** | 2025-11-22 | Database already migrated! |
| **Phase 5** | ⏸️ Not Started | - | Build and Fix TypeScript Errors |
| **Phase 6** | ⏸️ Not Started | - | Update TaskExecutor for DI |
| **Phase 7** | ⏸️ Not Started | - | Update Cron Jobs |
| **Phase 8** | ⏸️ Not Started | - | Verify Service Signatures |
| **Phase 9** | ⏸️ Not Started | - | Register Routes |
| **Phase 10** | ⏸️ Not Started | - | Test and Verify |

**📝 Update Instructions**: After completing each phase, update the status emoji:
- ⏸️ Not Started → 🔄 In Progress → ✅ Complete
- Add completion timestamp
- Add any notes about issues/resolutions

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Integration Resolution Patterns](#integration-resolution-patterns)
4. [Prerequisites](#prerequisites)
5. [Merge Execution Steps](#merge-execution-steps)
6. [Code Changes Required](#code-changes-required)
7. [Testing and Verification](#testing-and-verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Post-Merge Tasks](#post-merge-tasks)
10. [Tracking and Progress](#tracking-and-progress)

---

## Overview

### What We're Merging

**Source**: `/Users/navkashkrishna/delivr-server-ota-managed` (Orchestration Repo)  
**Target**: `/Users/navkashkrishna/dota-managed/delivr-server-ota-managed` (Integrations Repo - Current)

### Components Being Merged

| Component | Source | Target | Action |
|-----------|--------|--------|--------|
| Orchestration Engine | Orchestration Repo | Integrations Repo | **Copy** |
| Cron Job System | Orchestration Repo | Integrations Repo | **Copy** |
| Task Executor | Orchestration Repo | Integrations Repo | **Copy & Modify** |
| Integration Interfaces | Orchestration Repo | Integrations Repo | **Skip** (using DI) |
| Integration Services | Integrations Repo | - | **Keep & Extend** |
| Release Config Model | Integrations Repo | - | **Verify & Use** |

### Key Architectural Decision

**Using Dependency Injection + TaskExecutor Config Lookup** instead of Adapter Layer:
- ✅ **No service changes needed** - Integration services already accept correct parameters
- ✅ **TaskExecutor does ALL lookups** - Single point of change
- ✅ **Simpler** - No adapter layer, no service wrapper methods
- ✅ **Faster** - Saves 1+ hour (Phase 8 eliminated)
- ✅ **Lower risk** - Only TaskExecutor and cron jobs change
- ✅ **Uses existing ReleaseConfigModel** - Already has all needed fields

**Critical Insight**: Services already accept specific IDs (workflowId, integrationId, configId). TaskExecutor looks up ReleaseConfiguration, extracts the specific ID, and passes it to the service. Services remain unchanged!

---

## Architecture

### Current State: Two Separate Repositories

```
ORCHESTRATION REPO                    INTEGRATIONS REPO
┌────────────────────┐               ┌────────────────────┐
│ Release Workflows  │               │ Integration APIs   │
│ Task Execution     │               │ Real Providers     │
│ Cron Jobs          │               │ (GitHub, JIRA,     │
│ Mock Integrations  │               │  Slack, etc.)      │
└────────────────────┘               └────────────────────┘
```

### Target State: Unified Repository

```
┌─────────────────────────────────────────────────────────┐
│                    UNIFIED CODEBASE                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Release Workflows → TaskExecutor (DI) → Real Services  │
│                              ↓                           │
│                      ReleaseConfigModel                  │
│                              ↓                           │
│            (resolves integration configs)                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow (Updated with Clarification)

```
1. User creates Release (with releaseConfigId)
   ↓
2. Release record stores releaseConfigId + tenantId
   ↓
3. Cron job polls for tasks
   ↓
4. TaskExecutor gets task
   ↓
5. **TaskExecutor looks up ReleaseConfiguration by releaseConfigId**
   ↓
6. **TaskExecutor extracts specific integration ID from config:**
   - CI/CD: extracts ciConfigId (workflow ID)
   - JIRA: extracts projectManagementConfigId (integration ID)
   - Test Mgmt: extracts testManagementConfigId (config ID)
   - Notifications: extracts commsConfigId (channel ID)
   - SCM: doesn't need config lookup (uses tenantId directly)
   ↓
7. **TaskExecutor calls integration service with specific ID:**
   - CI/CD: cicdService.triggerWorkflow(tenantId, workflowId, params)
   - JIRA: jiraService.createTicket(tenantId, integrationId, params)
   - Test Mgmt: testMgmtService.createTestRun(tenantId, configId, params)
   - Notifications: notificationService.sendMessage(tenantId, channelId, params)
   - SCM: scmService.forkOutBranch(tenantId, branchName, baseBranch)
   ↓
8. Integration service executes action (no config lookup needed!)
   ↓
9. TaskExecutor updates task status
```

**Key Difference**: Services DON'T resolve configs - TaskExecutor does ALL the lookup work!

---

## Integration Resolution Patterns

### Pattern 1: Direct tenantId Resolution (SCM)

**Used by**: SCM (GitHub, GitLab, Bitbucket)

**Why**: SCM integrations are typically 1-per-tenant (single repo per tenant)

**Current Implementation**:
```typescript
// SCM Service (already in integrations repo)
class SCMService {
  async createBranch(tenantId: string, branchName: string, baseBranch: string) {
    // Looks up SCM integration by tenantId
    const scmIntegration = await this.scmRepo.findByTenantId(tenantId);
    
    // Uses integration config
    await this.githubClient.createBranch(
      scmIntegration.config.owner,
      scmIntegration.config.repo,
      branchName,
      baseBranch
    );
  }
}
```

**TaskExecutor Call**:
```typescript
// Just pass tenantId
await this.scmService.createBranch(
  release.tenantId,
  `release/v${release.version}`,
  release.baseBranch
);
```

**No changes needed** - SCM services already work this way!

---

### Pattern 2: ReleaseConfigModel Resolution (CI/CD, JIRA, Test Mgmt)

**Used by**: CI/CD, Project Management (JIRA), Test Management (Checkmate), Notifications (Slack)

**Why**: Multiple configs per tenant (different workflows, projects, channels per release type)

**ReleaseConfigModel Structure**:
```typescript
type ReleaseConfiguration = {
  id: string;                    // e.g., "config-123"
  tenantId: string;              // e.g., "tenant-456"
  name: string;                  // e.g., "Mobile Release Config"
  description?: string;
  
  // Integration-specific IDs (already exist!)
  ciConfigId: string | null;                    // workflow ID from tenant_ci_cd_workflows
  projectManagementConfigId: string | null;     // integration ID from project_management_integrations
  testManagementConfigId: string | null;        // config ID from test_management_configs
  commsConfigId: string | null;                 // channel config ID from tenant_comm_channels
  
  // Other config...
  platforms: string[];
  createdAt: Date;
  updatedAt: Date;
};
```

**Example Data**:
```json
{
  "id": "rc-mobile-prod",
  "tenantId": "tenant-acme",
  "name": "Mobile Production Release Config",
  "ciConfigId": "workflow-github-actions-mobile",
  "projectManagementConfigId": "jira-integration-main",
  "testManagementConfigId": "checkmate-config-prod",
  "commsConfigId": "slack-channel-releases"
}
```

**✅ CRITICAL: Services Already Accept Specific IDs (No Changes Needed!)**

**CI/CD Service (Already Correct - No Changes!)**:
```typescript
// ✅ Service already accepts workflowId, NOT releaseConfigId
class CICDService {
  async triggerWorkflow(
    tenantId: string,
    workflowId: string,  // ← Already accepts specific workflow ID!
    params: BuildParams
  ): Promise<string> {
    // 1. Look up workflow details
    const workflow = await this.cicdWorkflowRepo.findById(workflowId);
    
    // 2. Trigger workflow
    const runId = await this.githubActionsProvider.triggerWorkflow(workflow, params);
    
    return runId;
  }
}
```

**TaskExecutor Does the Lookup**:
```typescript
// TaskExecutor extracts workflowId and calls existing service method
async executeTask(context: TaskExecutionContext) {
  const { release, task } = context;
  
  // 1. Look up ReleaseConfiguration (in TaskExecutor, not service!)
  const config = await this.releaseConfigRepo.findById(release.releaseConfigId);
  
  // 2. Extract specific workflow ID
  const workflowId = config.ciConfigId;
  
  // 3. Check if configured
  if (!workflowId) {
    throw new Error('CI/CD integration not configured for this release');
  }
  
  // 4. Call existing service method with specific ID
  const buildNumber = await this.cicdService.triggerWorkflow(
    release.tenantId,
    workflowId,  // ← Specific ID, not releaseConfigId!
    {
      platform: 'IOS',
      version: release.version,
      branch: release.branchRelease
    }
  );
}
```

**Key Points**:
- ❌ **Services do NOT accept releaseConfigId**
- ✅ **Services already accept specific IDs** (workflowId, integrationId, etc.)
- ✅ **TaskExecutor does the lookup** and extracts the specific ID
- ✅ **No service changes needed!**

---

### Integration Resolution Summary (Updated)

| Integration Category | TaskExecutor Lookup | Service Method Parameters | Config Field |
|---------------------|---------------------|---------------------------|--------------|
| **SCM** (GitHub, GitLab, Bitbucket) | None (uses tenantId directly) | `tenantId, branchName, baseBranch` | N/A |
| **CI/CD** (GitHub Actions, Jenkins) | Extracts `ciConfigId` from ReleaseConfiguration | `tenantId, workflowId, params` | `ciConfigId` |
| **Project Management** (JIRA, Linear) | Extracts `projectManagementConfigId` | `tenantId, integrationId, params` | `projectManagementConfigId` |
| **Test Management** (Checkmate) | Extracts `testManagementConfigId` | `tenantId, configId, params` | `testManagementConfigId` |
| **Notifications** (Slack) | Extracts `commsConfigId` | `tenantId, channelId, params` | `commsConfigId` |

**Key Pattern**: 
- ✅ **TaskExecutor looks up** ReleaseConfiguration
- ✅ **TaskExecutor extracts** specific integration ID from config
- ✅ **TaskExecutor calls** service with specific ID
- ✅ **Service doesn't know** about ReleaseConfiguration at all!

---

## Prerequisites

### 1. Environment Setup

```bash
# Verify you're in the integrations repo (target)
pwd
# Should show: /Users/navkashkrishna/dota-managed/delivr-server-ota-managed

# Verify source repo exists
ls -la /Users/navkashkrishna/delivr-server-ota-managed/api/script/

# Verify clean git status
git status
# Should show: nothing to commit, working tree clean

# Verify database access
mysql -u root -p codepushdb -e "SHOW TABLES;"
```

### 2. Verify ReleaseConfigModel Exists

```bash
# Search for ReleaseConfigModel in integrations repo
grep -r "ReleaseConfig" api/script/models/ api/script/storage/ api/script/types/

# Expected: Should find ReleaseConfigModel definition
```

**If NOT found**: We need to create it (see [Creating ReleaseConfigModel](#creating-releaseconfigmodel) section)

### 3. Check Integration Service Signatures

```bash
# Check if services accept releaseConfigId parameter
grep -A 5 "triggerRegressionBuilds\|createReleaseTicket\|createTestRun" api/script/services/integrations/
```

**Expected**: May need to add `releaseConfigId` parameter to some methods

### 4. Verify Release Model Has releaseConfigId

```bash
# Check release model/DTO
grep "releaseConfigId" api/script/storage/release/release-models.ts api/script/storage/release/release-dto.ts

# Check migration
grep "releaseConfigId" migrations/002_release_management.sql
```

**If NOT found**: Add to migration (see [Adding releaseConfigId Field](#adding-releaseconfigid-field) section)

---

## Merge Execution Steps

### Phase 1: Backup and Preparation (10 minutes)

#### Step 1.1: Create Backup Branch

```bash
# Create timestamped backup
git branch backup-integrations-only-$(date +%Y%m%d_%H%M%S)

# Commit any uncommitted changes
git add -A
git commit -m "Backup: Integrations-only state before orchestration merge"

# Create merge branch
git checkout -b merge-orchestration-and-integrations
```

**✅ Checkpoint**: Verify backup branch exists
```bash
git branch | grep backup-integrations-only
```

**📝 Update MERGE_PLAN.md Phase Status**:
```bash
# Update Phase 1 status to ✅ Complete
# Change line: | **Phase 1** | ⏸️ Not Started | - | Backup and Preparation |
# To:         | **Phase 1** | ✅ **COMPLETE** | 2025-11-22 | Backup and Preparation |
```

#### Step 1.2: Verify Prerequisites

Run all checks from [Prerequisites](#prerequisites) section.

**Document findings**:
```bash
# Create tracking file
cat > MERGE_FINDINGS.md << 'EOF'
# Merge Prerequisites - Findings

## ReleaseConfigModel
- [ ] EXISTS / [ ] NEEDS CREATION
- Location: 
- Notes:

## Integration Service Signatures
- [ ] SCM accepts tenantId: YES / NO
- [ ] CI/CD accepts releaseConfigId: YES / NO / NEEDS UPDATE
- [ ] JIRA accepts releaseConfigId: YES / NO / NEEDS UPDATE
- [ ] Test Mgmt accepts releaseConfigId: YES / NO / NEEDS UPDATE
- [ ] Notifications accepts releaseConfigId: YES / NO / NEEDS UPDATE

## Release Model
- [ ] Has releaseConfigId field: YES / NO / NEEDS ADDITION

## Notes
(Add any findings here)
EOF

# Edit file with your findings
nano MERGE_FINDINGS.md
```

---

### Phase 2: Copy Orchestration Files (30 minutes)

#### Step 2.1: Run Automated Copy Script

```bash
# Create and execute copy script
cat > /tmp/copy-orchestration.sh << 'EOF'
#!/bin/bash

SOURCE="/Users/navkashkrishna/delivr-server-ota-managed"
TARGET="/Users/navkashkrishna/dota-managed/delivr-server-ota-managed"

echo "🚀 Starting orchestration file copy..."

# Cron job routes
echo "📁 Copying cron job routes..."
mkdir -p "$TARGET/api/script/routes/release"
cp "$SOURCE/api/script/routes/release/kickoff-cron-job.ts" "$TARGET/api/script/routes/release/" && echo "  ✅ kickoff-cron-job.ts"
cp "$SOURCE/api/script/routes/release/regression-cron-job.ts" "$TARGET/api/script/routes/release/" && echo "  ✅ regression-cron-job.ts"
cp "$SOURCE/api/script/routes/release/post-regression-cron-job.ts" "$TARGET/api/script/routes/release/" && echo "  ✅ post-regression-cron-job.ts"
cp "$SOURCE/api/script/routes/release/release-types.ts" "$TARGET/api/script/routes/release/" && echo "  ✅ release-types.ts"

# Services
echo "📁 Copying services..."
cp "$SOURCE/api/script/services/cron-lock-service.ts" "$TARGET/api/script/services/" && echo "  ✅ cron-lock-service.ts"
cp "$SOURCE/api/script/services/cron-scheduler.ts" "$TARGET/api/script/services/" && echo "  ✅ cron-scheduler.ts"
cp "$SOURCE/api/script/services/integration-mocks.ts" "$TARGET/api/script/services/" && echo "  ✅ integration-mocks.ts"
cp "$SOURCE/api/script/services/task-executor.ts" "$TARGET/api/script/services/" && echo "  ✅ task-executor.ts"

# Storage/release
echo "📁 Copying storage/release..."
mkdir -p "$TARGET/api/script/storage/release"
cp "$SOURCE/api/script/storage/release/cron-job-dto.ts" "$TARGET/api/script/storage/release/" && echo "  ✅ cron-job-dto.ts"
cp "$SOURCE/api/script/storage/release/regression-cycle-dto.ts" "$TARGET/api/script/storage/release/" && echo "  ✅ regression-cycle-dto.ts"
cp "$SOURCE/api/script/storage/release/release-dto.ts" "$TARGET/api/script/storage/release/" && echo "  ✅ release-dto.ts"
cp "$SOURCE/api/script/storage/release/release-models.ts" "$TARGET/api/script/storage/release/" && echo "  ✅ release-models.ts"
cp "$SOURCE/api/script/storage/release/release-tasks-dto.ts" "$TARGET/api/script/storage/release/" && echo "  ✅ release-tasks-dto.ts"

# Utils
echo "📁 Copying utils..."
cp "$SOURCE/api/script/utils/regression-cycle-creation.ts" "$TARGET/api/script/utils/" && echo "  ✅ regression-cycle-creation.ts"
cp "$SOURCE/api/script/utils/task-creation.ts" "$TARGET/api/script/utils/" && echo "  ✅ task-creation.ts"
cp "$SOURCE/api/script/utils/task-sequencing.ts" "$TARGET/api/script/utils/" && echo "  ✅ task-sequencing.ts"
cp "$SOURCE/api/script/utils/time-utils.ts" "$TARGET/api/script/utils/" && echo "  ✅ time-utils.ts"

# Skip integration interfaces (not needed with DI approach)
echo "⏭️  Skipping integration interfaces (using DI approach)"

echo ""
echo "✨ Phase 2 complete! Files copied successfully."
echo ""
echo "Next: Review changes and commit"
EOF

chmod +x /tmp/copy-orchestration.sh
/tmp/copy-orchestration.sh
```

#### Step 2.2: Verify Files Copied

```bash
# Check key files
ls -la api/script/routes/release/kickoff-cron-job.ts
ls -la api/script/services/task-executor.ts
ls -la api/script/storage/release/release-dto.ts
ls -la api/script/utils/task-creation.ts
```

#### Step 2.3: Commit Copied Files

```bash
git add api/script/
git commit -m "feat: Copy orchestration files from release orchestration repo

- Add cron job routes (kickoff, regression, post-regression)
- Add orchestration services (task-executor, cron-scheduler, cron-lock)
- Add release storage layer (DTOs and models)
- Add orchestration utils (task-creation, task-sequencing, time-utils)
- Skip integration interfaces (using DI approach instead)
"
```

**✅ Checkpoint**: Verify commit created
```bash
git log -1 --oneline
```

**📝 Update MERGE_PLAN.md Phase Status**:
```bash
# Update Phase 2 status to ✅ Complete
# Change line: | **Phase 2** | ⏸️ Not Started | - | Copy Orchestration Files |
# To:         | **Phase 2** | ✅ **COMPLETE** | 2025-11-22 | Copy Orchestration Files |
```

---

### Phase 3: Merge release-management.ts (15 minutes)

#### Step 3.1: Backup Current Version

```bash
# Backup current release-management.ts
cp api/script/routes/release-management.ts \
   api/script/routes/release-management.ts.integrations-backup
```

#### Step 3.2: Compare Versions

```bash
# See differences
diff api/script/routes/release-management.ts \
     /Users/navkashkrishna/delivr-server-ota-managed/api/script/routes/release/release-management.ts
```

**Review**: Check if integrations version has any custom logic to preserve.

#### Step 3.3: Copy Orchestration Version

```bash
# Copy orchestration version
cp /Users/navkashkrishna/delivr-server-ota-managed/api/script/routes/release/release-management.ts \
   api/script/routes/release-management.ts
```

#### Step 3.4: Commit

```bash
git add api/script/routes/release-management.ts
git commit -m "feat: Replace release-management.ts with full orchestration version

- Includes Stage 1, 2, 3 workflow
- Includes cron job auto-start
- Includes task creation on release creation
- Backup saved: release-management.ts.integrations-backup
"
```

**✅ Checkpoint**: Verify new version has orchestration code
```bash
grep -c "executeKickoffCronJob" api/script/routes/release-management.ts
# Should return > 0
```

---

### Phase 4: Database Migration (20 minutes)

#### Step 4.1: Copy Orchestration Migration

```bash
# Copy complete orchestration migration from source repo
cp /Users/navkashkrishna/delivr-server-ota-managed/migrations/001_release_orchestration_complete.sql \
   migrations/011_orchestration_from_source.sql
```

#### Step 4.2: Add releaseConfigId Field (If Needed)

**Check if needed**:
```bash
grep "releaseConfigId" migrations/011_orchestration_from_source.sql
```

**If NOT found**, add this to migration:

```sql
-- Add releaseConfigId to releases table
ALTER TABLE releases 
  ADD COLUMN releaseConfigId VARCHAR(255) NULL COMMENT 'FK to release_configs table',
  ADD INDEX idx_release_config (releaseConfigId);
```

#### Step 4.3: Run Required Migrations (011 + 012)

> ✅ **Latest Status (2025-11-23)**: The database has already been reset from a fresh backup, `011_local_code_requirements.sql` and `012_orchestration_supplements.sql` were applied, and `tests/db_schema_smoke_test.sql` verified all key columns.  
> Repeat these commands whenever you need to recreate the schema locally.

```bash
# 1. Backup current database (always do this!)
mkdir -p backups
mysqldump -u root -p codepushdb > backups/codepushdb_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. (Optional) Reset DB if you need a clean slate
docker exec -i api-db-1 mysql -u root -proot -e "DROP DATABASE IF EXISTS codepushdb; CREATE DATABASE codepushdb;"

# 3. Restore base schema (if you dropped it) – use latest backup
docker exec -i api-db-1 mysql -u root -proot codepushdb < backups/codepushdb_backup_YYYYMMDD_HHMMSS.sql

# 4. Apply the new migrations
docker exec -i api-db-1 mysql -u root -proot codepushdb < migrations/011_local_code_requirements.sql
docker exec -i api-db-1 mysql -u root -proot codepushdb < migrations/012_orchestration_supplements.sql

# 5. Run schema + smoke tests (verifies stageData, releaseConfigId, externalId, etc.)
docker exec -i api-db-1 mysql -u root -proot codepushdb < tests/db_schema_smoke_test.sql
```

#### Step 4.4: Verify Tables Created

```bash
mysql -u root -p codepushdb -e "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'codepushdb' 
  AND table_name LIKE 'release%'
  ORDER BY table_name;
"
```

**Expected tables**:
- releases
- release_tasks
- regression_cycles
- cron_jobs
- builds
- platform_releases
- release_builds

#### Step 4.5: Verify releaseConfigId Field

```bash
mysql -u root -p codepushdb -e "
  DESCRIBE releases;
" | grep releaseConfigId
```

**Expected**: Should show releaseConfigId column

#### Step 4.6: Commit Migration

```bash
git add migrations/011_orchestration_from_source.sql
git commit -m "feat: Add orchestration migration (tables and columns)

- Creates releases, release_tasks, regression_cycles, cron_jobs tables
- Creates builds table with platform/target relationships
- Adds releaseConfigId field to releases table
- Adds all necessary indexes and foreign keys
"
```

**✅ Checkpoint**: All tables exist in database

---

### Phase 5: Build and Fix TypeScript Errors (30-60 minutes)

#### Step 5.1: Attempt Build

```bash
cd api
npm run build 2>&1 | tee build-errors.log
```

**Expected**: Will have errors (missing imports, type mismatches)

#### Step 5.2: Fix Common Errors

**Pattern 1: Missing imports**
```typescript
// Error: Cannot find module '../storage/release/release-models'
// Fix: Add import
import { ReleaseStatus, TaskType, TaskStage } from '../storage/release/release-models';
```

**Pattern 2: Missing type guards**
```typescript
// Error: Property 'sequelize' does not exist on type 'Storage'
// Fix: Add import and use type guard
import { hasSequelize, StorageWithSequelize } from '../routes/release/release-types';

if (!hasSequelize(storage)) {
  throw new Error('Storage does not have Sequelize instance');
}
const sequelize = (storage as StorageWithSequelize).sequelize;
```

**Pattern 3: Path resolution**
```typescript
// Error: Module not found: '../release/...'
// Fix: Correct path
import { ReleaseDTO } from '../storage/release/release-dto';
```

#### Step 5.3: Rebuild Until Clean

```bash
# After each fix, rebuild
npm run build

# Repeat until no errors
```

#### Step 5.4: Commit Fixes

```bash
git add api/script/
git commit -m "fix: Resolve TypeScript build errors after orchestration merge

- Add missing imports for release models
- Fix path resolution issues
- Add type guards for Sequelize
- Update type definitions
"
```

**✅ Checkpoint**: `npm run build` succeeds with no errors

---

### Phase 6: Update TaskExecutor for Dependency Injection (30-45 minutes)

This is the **most critical phase** - converting from interface-based approach to dependency injection AND adding ReleaseConfiguration lookup logic.

**Note**: This phase now takes slightly more time because ALL lookup logic goes here (not in services).

#### Step 6.1: Update TaskExecutor Constructor

**File**: `api/script/services/task-executor.ts`

**Find**:
```typescript
export class TaskExecutor {
  private releaseTasksDTO: ReleaseTasksDTO;
  private releaseDTO: ReleaseDTO;

  constructor() {
    this.releaseTasksDTO = new ReleaseTasksDTO();
    this.releaseDTO = new ReleaseDTO();
  }
```

**Replace with**:
```typescript
export class TaskExecutor {
  private releaseTasksDTO: ReleaseTasksDTO;
  private releaseDTO: ReleaseDTO;

  constructor(
    private scmService: SCMService,
    private cicdService: CICDService,
    private jiraService: JiraService,
    private testMgmtService: TestManagementService,
    private notificationService: NotificationService,
    private releaseConfigRepo: ReleaseConfigRepository  // ← ADD THIS!
  ) {
    this.releaseTasksDTO = new ReleaseTasksDTO();
    this.releaseDTO = new ReleaseDTO();
  }
```

**Add imports**:
```typescript
// Add at top of file
import { SCMService } from './integrations/scm/scm-service';
import { CICDService } from './integrations/ci-cd/cicd-service';
import { JiraService } from './integrations/project-management/jira-service';
import { TestManagementService } from './integrations/test-management/test-management-service';
import { NotificationService } from './integrations/comm/notification-service';
import { ReleaseConfigRepository } from '../models/release-configs/release-config.repository';
```

**Note**: Adjust import paths based on your actual file structure.

#### Step 6.1b: Add Config Lookup Helper Method

**Add this helper method to TaskExecutor class**:
```typescript
/**
 * Look up ReleaseConfiguration and return it
 * @throws Error if config not found
 */
private async getReleaseConfig(releaseConfigId: string): Promise<ReleaseConfiguration> {
  const config = await this.releaseConfigRepo.findById(releaseConfigId);
  
  if (!config) {
    throw new Error(`Release configuration ${releaseConfigId} not found`);
  }
  
  return config;
}
```

This method will be called at the start of each task execution (for non-SCM tasks).

#### Step 6.2: Update executeTask Method Signature

**Find**:
```typescript
async executeTask(
  context: TaskExecutionContext,
  integrations: IntegrationInstances = {}
): Promise<TaskExecutionResult> {
```

**Replace with**:
```typescript
async executeTask(
  context: TaskExecutionContext
): Promise<TaskExecutionResult> {
  // No integrations parameter - using DI
```

#### Step 6.3: Update Task Execution Calls - Pattern 1 (SCM - tenantId only)

**Find all SCM calls like**:
```typescript
await integrations.scm.forkOutBranch(
  tenantId,
  releaseBranch,
  baseBranch,
  release.customIntegrationConfigs?.SCM
);
```

**Replace with**:
```typescript
await this.scmService.createBranch(
  release.tenantId,
  releaseBranch,
  baseBranch
);
```

**Tasks affected**: `FORK_BRANCH`, `CREATE_RC_TAG`, `CREATE_RELEASE_NOTES`, `CREATE_RELEASE_TAG`, `CREATE_FINAL_RELEASE_NOTES`

#### Step 6.4: Update Task Execution Calls - Pattern 2 (CI/CD - TaskExecutor Lookup + Specific ID)

**Find all CI/CD calls like**:
```typescript
const buildNumber = await integrations.cicd.triggerRegressionBuilds(
  context.releaseId,
  {
    platform: platformName,
    version: release.version,
    branch: release.branchRelease || `release/v${release.version}`,
    buildType: 'regression',
    regressionId: task.regressionId
  },
  release.customIntegrationConfigs?.CICD
);
```

**Replace with (✅ CORRECT SIGNATURE - TaskExecutor does lookup, service gets specific ID)**:
```typescript
// 1. Look up ReleaseConfiguration
const config = await this.getReleaseConfig(release.releaseConfigId);

// 2. Extract workflow ID
const workflowId = config.ciConfigId;

// 3. Check if configured
if (!workflowId) {
  throw new Error('CI/CD integration not configured for this release');
}

// 4. Call service with CORRECT signature (trigger, not triggerWorkflow!)
const result = await this.cicdService.trigger(
  release.tenantId,  // ← tenantId for security validation
  {
    workflowId: workflowId,  // ← Specific workflow ID, not releaseConfigId!
    jobParameters: {
      platform: platformName,
      version: release.version,
      branch: release.branchRelease || `release/v${release.version}`,
      buildType: 'regression',
      regressionId: task.regressionId
    }
  }
);

// Extract build number from result
const buildNumber = result.queueLocation;  // Adjust based on actual return type
```

**⚠️ CRITICAL**: 
- Actual method is `trigger()` NOT `triggerWorkflow()`
- Returns `{ queueLocation: string }` (GitHub Actions/Jenkins)
- See [INTEGRATION_SIGNATURES_CLARIFICATION.md](./INTEGRATION_SIGNATURES_CLARIFICATION.md) for details

**Tasks affected**: `TRIGGER_PRE_REGRESSION_BUILDS`, `TRIGGER_REGRESSION_BUILDS`, `TRIGGER_AUTOMATION_RUNS`, `TRIGGER_TEST_FLIGHT_BUILD`

#### Step 6.5: Update Task Execution Calls - Pattern 3 (JIRA - TaskExecutor Lookup + Config ID)

**Find**:
```typescript
const ticketId = await integrations.jira.createReleaseTicket(
  tenantId,
  'Epic',
  {
    summary: `Release ${release.version}`,
    description: `Release ${release.version} planned for ${release.targetReleaseDate}`,
    version: release.version
  },
  release.customIntegrationConfigs?.JIRA
);
```

**Replace with (✅ CORRECT SIGNATURE - Service uses configId, not integrationId)**:
```typescript
// 1. Look up ReleaseConfiguration
const config = await this.getReleaseConfig(release.releaseConfigId);

// 2. Extract PM config ID (NOT integrationId!)
const pmConfigId = config.projectManagementConfigId;

// 3. Check if configured
if (!pmConfigId) {
  throw new Error('Project management integration not configured for this release');
}

// 4. Call service with CORRECT signature (createTickets, not createTicket!)
const results = await this.pmTicketService.createTickets({
  configId: pmConfigId,  // ← Config ID (service validates tenant ownership)
  tickets: [{
    platform: 'IOS',  // Or 'ANDROID', 'WEB' - adjust based on task
    title: `Release ${release.version}`,
    description: `Release ${release.version} planned for ${release.targetReleaseDate}`
  }]
});

// Extract ticket ID from results
const ticketId = results['IOS']?.ticketKey;  // Adjust platform key
```

**⚠️ CRITICAL**: 
- Actual method is `createTickets()` (plural) NOT `createTicket()`
- Accepts `{ configId, tickets }` NOT `(tenantId, integrationId, params)`
- Service validates tenant ownership via configId lookup
- See [INTEGRATION_SIGNATURES_CLARIFICATION.md](./INTEGRATION_SIGNATURES_CLARIFICATION.md) for details

**Tasks affected**: `CREATE_PROJECT_MANAGEMENT_TICKET`, `CHECK_PROJECT_RELEASE_APPROVAL`

#### Step 6.6: Update Task Execution Calls - Pattern 4 (Test Mgmt - TaskExecutor Lookup + Config ID)

**Find**:
```typescript
const suiteId = await integrations.testPlatform.createTestSuite(
  tenantId,
  {
    name: `Release ${release.version} Test Suite`,
    releaseVersion: release.version
  },
  release.customIntegrationConfigs?.TestPlatform
);
```

**Replace with (✅ CORRECT SIGNATURE - Service uses configId, returns results per platform)**:
```typescript
// 1. Look up ReleaseConfiguration
const config = await this.getReleaseConfig(release.releaseConfigId);

// 2. Extract test management config ID
const testConfigId = config.testManagementConfigId;

// 3. Check if configured
if (!testConfigId) {
  throw new Error('Test management integration not configured for this release');
}

// 4. Call service with CORRECT signature (createTestRuns, not createTestRun!)
const results = await this.testRunService.createTestRuns({
  testManagementConfigId: testConfigId,  // ← Config ID (service validates tenant ownership)
  platforms: ['IOS', 'ANDROID']  // Optional - filter platforms, or omit to create for all
});

// Extract run IDs from results (one per platform)
const iosRunId = results['IOS']?.runId;
const androidRunId = results['ANDROID']?.runId;
```

**⚠️ CRITICAL**: 
- Actual method is `createTestRuns()` (plural) NOT `createTestRun()`
- Accepts `{ testManagementConfigId, platforms? }` NOT `(tenantId, configId, params)`
- Returns results per platform: `{ [platform]: { runId, url, status } }`
- Service validates tenant ownership via configId lookup
- See [INTEGRATION_SIGNATURES_CLARIFICATION.md](./INTEGRATION_SIGNATURES_CLARIFICATION.md) for details

**Tasks affected**: `CREATE_TEST_SUITE`, `RESET_TEST_SUITE`, `AUTOMATION_RUNS`

#### Step 6.7: Update Task Execution Calls - Pattern 5 (Notifications - TaskExecutor Lookup + Channel ID)

**⚠️ NOTE**: Notification service signature needs verification - adjust based on actual implementation

**Find**:
```typescript
const messageId = await integrations.notification.sendMessage(
  tenantId,
  'pre-kickoff-reminder',
  [
    release.version,
    release.plannedDate?.toISOString() || '',
    release.targetReleaseDate?.toISOString() || ''
  ],
  {},
  release.customIntegrationConfigs?.Notification
);
```

**Replace with (TaskExecutor does lookup, service gets specific ID)**:
```typescript
// 1. Look up ReleaseConfiguration
const config = await this.getReleaseConfig(release.releaseConfigId);

// 2. Extract channel ID
const channelId = config.commsConfigId;

// 3. Check if configured
if (!channelId) {
  throw new Error('Communication channel not configured for this release');
}

// 4. Call service with specific ID
const messageId = await this.notificationService.sendMessage(
  release.tenantId,
  channelId,  // ← Specific channel ID, not releaseConfigId!
  {
    message: 'pre-kickoff-reminder',
    data: {
      version: release.version,
      plannedDate: release.plannedDate?.toISOString() || '',
      targetReleaseDate: release.targetReleaseDate?.toISOString() || ''
    }
  }
);
```

**Important**: Check your actual service signature (params structure may vary).

**Tasks affected**: `PRE_KICK_OFF_REMINDER`, `SEND_REGRESSION_BUILD_MESSAGE`, `PRE_RELEASE_CHERRY_PICKS_REMINDER`, `SEND_POST_REGRESSION_MESSAGE`

#### Step 6.8: Remove IntegrationInstances Interface

**Delete** or comment out (no longer needed):
```typescript
// export interface IntegrationInstances {
//   scm?: SCMIntegration;
//   notification?: NotificationIntegration;
//   jira?: JIRAIntegration;
//   testPlatform?: TestPlatformIntegration;
//   cicd?: CICDIntegration;
// }
```

#### Step 6.9: Build and Test

```bash
cd api
npm run build
```

**Fix any errors** that arise from the changes.

#### Step 6.10: Commit TaskExecutor Changes

```bash
git add api/script/services/task-executor.ts
git commit -m "feat: Update TaskExecutor to use dependency injection

- Add service dependencies to constructor (SCM, CI/CD, JIRA, Test Mgmt, Notifications)
- Remove integrations parameter from executeTask method
- Update all task execution calls:
  * SCM: uses tenantId directly
  * CI/CD: uses tenantId + releaseConfigId
  * JIRA: uses tenantId + releaseConfigId
  * Test Mgmt: uses tenantId + releaseConfigId
  * Notifications: uses tenantId + releaseConfigId
- Remove IntegrationInstances interface (no longer needed)
"
```

**✅ Checkpoint**: TaskExecutor uses dependency injection, no interface/adapter layer

---

### Phase 7: Update Cron Jobs to Inject Services (10 minutes)

#### Step 7.1: Update kickoff-cron-job.ts

**File**: `api/script/routes/release/kickoff-cron-job.ts`

**Find**:
```typescript
const integrations = getMockIntegrations();

const taskExecutor = new TaskExecutor();

const result = await taskExecutor.executeTask(
  {
    releaseId,
    tenantId: release.tenantId,
    release,
    task
  },
  integrations
);
```

**Replace with**:
```typescript
// Import services
import { SCMService } from '../../services/integrations/scm/scm-service';
import { CICDService } from '../../services/integrations/ci-cd/cicd-service';
import { JiraService } from '../../services/integrations/project-management/jira-service';
import { TestManagementService } from '../../services/integrations/test-management/test-management-service';
import { NotificationService } from '../../services/integrations/comm/notification-service';
import { ReleaseConfigRepository } from '../../models/release-configs/release-config.repository';

// Instantiate services and repository
const scmService = new SCMService();
const cicdService = new CICDService();
const jiraService = new JiraService();
const testMgmtService = new TestManagementService();
const notificationService = new NotificationService();
const releaseConfigRepo = new ReleaseConfigRepository();  // ← ADD THIS

// Inject services + repository into TaskExecutor
const taskExecutor = new TaskExecutor(
  scmService,
  cicdService,
  jiraService,
  testMgmtService,
  notificationService,
  releaseConfigRepo  // ← ADD THIS
);

// Execute task (no integrations parameter)
const result = await taskExecutor.executeTask({
  releaseId,
  tenantId: release.tenantId,
  release,
  task
});
```

**Note**: Adjust import paths based on actual file structure.

#### Step 7.2: Update regression-cron-job.ts

Apply the same changes as Step 7.1 to `regression-cron-job.ts`.

#### Step 7.3: Update post-regression-cron-job.ts

Apply the same changes as Step 7.1 to `post-regression-cron-job.ts`.

#### Step 7.4: Build and Test

```bash
cd api
npm run build
```

#### Step 7.5: Commit Cron Job Updates

```bash
git add api/script/routes/release/kickoff-cron-job.ts \
        api/script/routes/release/regression-cron-job.ts \
        api/script/routes/release/post-regression-cron-job.ts

git commit -m "feat: Update cron jobs to inject integration services

- Replace getMockIntegrations() with real service instantiation
- Inject services into TaskExecutor constructor
- Remove integrations parameter from executeTask calls
- Apply to all cron jobs (kickoff, regression, post-regression)
"
```

**✅ Checkpoint**: Cron jobs inject real services, no mocks (unless services return mocks internally)

---

### Phase 8: Verify Integration Service Signatures (0-5 minutes)

**✅ CRITICAL FINDING**: Integration services already accept specific IDs (workflowId, integrationId, etc.)!

**NO UPDATES NEEDED** - This phase is just verification.

#### Step 8.1: Verify CI/CD Service Signature

**File**: `api/script/services/integrations/ci-cd/cicd-service.ts` (or similar)

**Expected signature** (should already exist):
```typescript
async triggerWorkflow(
  tenantId: string,
  workflowId: string,  // ← Already accepts specific workflow ID
  params: any
): Promise<string>
```

**✅ If this exists, no changes needed!**

**❌ If service has different signature**, verify:
- Does it accept `tenantId` + `workflowId`?
- If not, you may need to refactor, but likely it already works correctly

#### Step 8.2: Verify JIRA Service Signature

**File**: `api/script/services/integrations/project-management/jira-service.ts` (or similar)

**Expected signature** (should already exist):
```typescript
async createTicket(
  tenantId: string,
  integrationId: string,  // ← Already accepts specific integration ID
  data: any
): Promise<string>
```

**✅ If this exists, no changes needed!**

#### Step 8.3: Verify Test Management Service Signature

**File**: `api/script/services/integrations/test-management/test-management-service.ts` (or similar)

**Expected signature** (should already exist):
```typescript
async createTestRun(
  tenantId: string,
  configId: string,  // ← Already accepts specific config ID
  params: any
): Promise<string>
```

**✅ If this exists, no changes needed!**

#### Step 8.4: Verify Notification Service Signature

**File**: `api/script/services/integrations/comm/notification-service.ts` (or similar)

**Expected signature** (should already exist):
```typescript
async sendMessage(
  tenantId: string,
  channelId: string,  // ← Already accepts specific channel ID
  params: any
): Promise<void>
```

**✅ If this exists, no changes needed!**

#### Step 8.5: Document Findings

```bash
cat >> MERGE_FINDINGS.md << 'EOF'

## Phase 8: Service Verification

- [ ] CI/CD service accepts workflowId: YES / NO
- [ ] JIRA service accepts integrationId: YES / NO
- [ ] Test Mgmt service accepts configId: YES / NO
- [ ] Notification service accepts channelId: YES / NO

### Service Changes Required
(List any services that need signature updates)

### Notes
(Add any notes)
EOF
```

**✅ Checkpoint**: All integration services already accept correct parameters (no changes needed!)

---

### Phase 9: Register Orchestration Routes (5 minutes)

#### Step 9.1: Update api.ts

**File**: `api/script/api.ts`

**Add import**:
```typescript
import { getReleaseManagementRouter } from './routes/release/release-management';
```

**Register route** (add with other route registrations):
```typescript
// Release Management (Orchestration)
const releaseManagementRouter = getReleaseManagementRouter({ storage });
app.use('/api/v1/release-management', releaseManagementRouter);
```

#### Step 9.2: Build

```bash
cd api
npm run build
```

#### Step 9.3: Commit

```bash
git add api/script/api.ts
git commit -m "feat: Register release management orchestration routes

- Add /api/v1/release-management/* endpoints
- Routes include release CRUD, task management, cron job control
"
```

**✅ Checkpoint**: Orchestration routes registered

---

### Phase 10: Test and Verify (20 minutes)

#### Step 10.1: Start Server

```bash
cd api
npm start
```

**Wait for**: "Server listening on port 3000" (or your configured port)

#### Step 10.2: Test Health Endpoint

```bash
curl http://localhost:3000/api/v1/release-management/health
```

**Expected response**:
```json
{
  "service": "Release Management",
  "status": "healthy",
  "timestamp": "2025-11-22T..."
}
```

#### Step 10.3: Test Release Creation (Will Fail Auth, But Should Not Error)

```bash
curl -X POST http://localhost:3000/api/v1/release-management/tenants/test-tenant/releases \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.0.0",
    "type": "PLANNED",
    "targetReleaseDate": "2025-12-01T00:00:00Z",
    "plannedDate": "2025-11-25T00:00:00Z",
    "baseBranch": "main",
    "platforms": ["IOS", "ANDROID"],
    "releaseConfigId": "test-config-1"
  }'
```

**Expected**: 401 Unauthorized (not 500 Internal Server Error)

#### Step 10.4: Check Database

```bash
mysql -u root -p codepushdb -e "
  SELECT table_name, table_rows 
  FROM information_schema.tables 
  WHERE table_schema = 'codepushdb' 
  AND table_name IN ('releases', 'release_tasks', 'cron_jobs', 'regression_cycles', 'builds')
  ORDER BY table_name;
"
```

**Expected**: All tables exist (may have 0 rows initially)

#### Step 10.5: Stop Server

```bash
# Press Ctrl+C or kill the process
```

#### Step 10.6: Document Test Results

```bash
cat >> MERGE_FINDINGS.md << 'EOF'

## Phase 10 Test Results

- [ ] Server starts successfully: YES / NO
- [ ] Health endpoint responds: YES / NO
- [ ] Release creation endpoint exists (401 expected): YES / NO
- [ ] All tables exist in database: YES / NO

### Issues Found
(List any issues)

### Notes
(Add any notes)
EOF
```

**✅ Checkpoint**: Server starts, health endpoint works, database tables exist

---

## Code Changes Required

### Summary of Changes by File (Updated)

| File | Change Type | Description |
|------|-------------|-------------|
| `task-executor.ts` | **MODIFY** | Add DI constructor + ReleaseConfigRepo, add getReleaseConfig() helper, update all task execution calls with lookup logic |
| `kickoff-cron-job.ts` | **MODIFY** | Inject services + ReleaseConfigRepo, remove mock integrations |
| `regression-cron-job.ts` | **MODIFY** | Inject services + ReleaseConfigRepo, remove mock integrations |
| `post-regression-cron-job.ts` | **MODIFY** | Inject services + ReleaseConfigRepo, remove mock integrations |
| `cicd-service.ts` | **✅ NO CHANGE** | Already accepts workflowId (correct signature) |
| `jira-service.ts` | **✅ NO CHANGE** | Already accepts integrationId (correct signature) |
| `test-management-service.ts` | **✅ NO CHANGE** | Already accepts configId (correct signature) |
| `notification-service.ts` | **✅ NO CHANGE** | Already accepts channelId (correct signature) |
| `scm-service.ts` | **✅ NO CHANGE** | Already accepts tenantId (correct signature) |
| `release-dto.ts` | **VERIFY** | Ensure has releaseConfigId field |
| `release-models.ts` | **VERIFY** | Ensure has releaseConfigId field |
| `api.ts` | **MODIFY** | Register orchestration routes |
| All other copied files | **NO CHANGE** | Use as-is |

**Key Insight**: Only TaskExecutor and cron jobs need changes. Services remain untouched!

---

## Testing and Verification

### Unit Tests

After merge, create unit tests for:

1. **TaskExecutor with DI**
   ```typescript
   describe('TaskExecutor', () => {
     it('should inject services correctly', () => {
       const executor = new TaskExecutor(
         mockSCMService,
         mockCICDService,
         mockJiraService,
         mockTestMgmtService,
         mockNotificationService
       );
       expect(executor).toBeDefined();
     });
   });
   ```

2. **Integration Service Resolution**
   ```typescript
   describe('CICDService', () => {
     it('should resolve workflow from releaseConfigId', async () => {
       const result = await cicdService.triggerRegressionBuilds(
         'tenant-123',
         'config-456',
         params
       );
       expect(mockReleaseConfigRepo.findById).toHaveBeenCalledWith('config-456');
     });
   });
   ```

### Integration Tests

Create E2E test:

```typescript
describe('Release Orchestration E2E', () => {
  it('should create release and execute Stage 1 tasks', async () => {
    // 1. Create ReleaseConfigModel
    const config = await createReleaseConfig({
      tenantId: 'test-tenant',
      integrationConfigs: {
        cicd: 'workflow-1',
        projectManagement: 'jira-integration-1',
        testManagement: 'checkmate-config-1',
        notification: 'slack-channel-1'
      }
    });
    
    // 2. Create release
    const release = await createRelease({
      tenantId: 'test-tenant',
      releaseConfigId: config.id,
      version: '1.0.0',
      platforms: ['IOS', 'ANDROID']
    });
    
    // 3. Wait for cron job to execute
    await waitForCronExecution(5000);
    
    // 4. Verify tasks executed
    const tasks = await getReleaseTasks(release.id);
    expect(tasks.filter(t => t.status === 'COMPLETED')).toHaveLength(4);
  });
});
```

---

## Rollback Procedures

### If Build Fails

```bash
# Rollback to last working commit
git reset --hard HEAD~1

# Or rollback to backup branch
git checkout backup-integrations-only-YYYYMMDD_HHMMSS
```

### If Database Migration Fails

```bash
# Restore from backup
mysql -u root -p codepushdb < backup_before_orchestration_YYYYMMDD_HHMMSS.sql

# Rollback migration (if rollback script exists)
mysql -u root -p codepushdb < migrations/011_orchestration_rollback.sql
```

### If Runtime Errors Occur

```bash
# Revert entire merge branch
git checkout main
git branch -D merge-orchestration-and-integrations

# Start fresh from backup
git checkout backup-integrations-only-YYYYMMDD_HHMMSS
git checkout -b merge-orchestration-and-integrations-v2
```

---

## Post-Merge Tasks

### Immediate (Within 1 Day)

- [ ] Run full test suite
- [ ] Update API documentation
- [ ] Create release notes

### Short-term (Within 1 Week)

- [ ] Deploy to staging environment
- [ ] Run E2E tests in staging
- [ ] Performance testing
- [ ] Load testing

### Medium-term (Within 2 Weeks)

- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Gather user feedback
- [ ] Iterate on improvements

### Long-term (Within 1 Month)

- [ ] Add more integration providers
- [ ] Optimize performance
- [ ] Add advanced features
- [ ] Update documentation

---

## Tracking and Progress

### Checklist

Use this checklist to track progress:

```markdown
## Pre-Merge
- [ ] Verified ReleaseConfigModel exists
- [ ] Checked integration service signatures
- [ ] Verified Release model has releaseConfigId
- [ ] Created backup branch
- [ ] Documented findings in MERGE_FINDINGS.md

## Phase 1: Backup
- [ ] Created backup branch
- [ ] Committed current state
- [ ] Created merge branch

## Phase 2: Copy Files
- [ ] Copied cron job routes
- [ ] Copied services
- [ ] Copied storage layer
- [ ] Copied utils
- [ ] Committed copied files

## Phase 3: Merge release-management.ts
- [ ] Backed up current version
- [ ] Copied orchestration version
- [ ] Committed changes

## Phase 4: Database Migration
- [ ] Backed up database
- [ ] Added releaseConfigId field (if needed)
- [ ] Ran migration
- [ ] Verified tables created
- [ ] Committed migration

## Phase 5: Build Fix
- [ ] Fixed TypeScript errors
- [ ] Build succeeds
- [ ] Committed fixes

## Phase 6: TaskExecutor DI + Config Lookup
- [ ] Updated constructor with DI + ReleaseConfigRepository
- [ ] Added getReleaseConfig() helper method
- [ ] Updated all SCM calls (tenantId only - no config lookup)
- [ ] Updated all CI/CD calls (lookup config, extract workflowId, call service)
- [ ] Updated all JIRA calls (lookup config, extract integrationId, call service)
- [ ] Updated all Test Mgmt calls (lookup config, extract configId, call service)
- [ ] Updated all Notification calls (lookup config, extract channelId, call service)
- [ ] Removed IntegrationInstances interface
- [ ] Build succeeds
- [ ] Committed changes

## Phase 7: Cron Jobs
- [ ] Updated kickoff-cron-job.ts (added ReleaseConfigRepo injection)
- [ ] Updated regression-cron-job.ts (added ReleaseConfigRepo injection)
- [ ] Updated post-regression-cron-job.ts (added ReleaseConfigRepo injection)
- [ ] Build succeeds
- [ ] Committed changes

## Phase 8: Integration Services Verification
- [ ] Verified CI/CD service accepts workflowId (no changes needed)
- [ ] Verified JIRA service accepts integrationId (no changes needed)
- [ ] Verified Test Mgmt service accepts configId (no changes needed)
- [ ] Verified Notification service accepts channelId (no changes needed)
- [ ] Documented any service signature mismatches (if any)
- [ ] ✅ No changes committed (services already correct!)

## Phase 9: Register Routes
- [ ] Updated api.ts
- [ ] Build succeeds
- [ ] Committed changes

## Phase 10: Test
- [ ] Server starts
- [ ] Health endpoint works
- [ ] Database tables exist
- [ ] Documented results

## Post-Merge
- [ ] Pushed to remote
- [ ] Created pull request
- [ ] Code review
- [ ] Merged to main
```

### Time Tracking (Updated)

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1: Backup | 10 min | | |
| Phase 2: Copy Files | 30 min | | |
| Phase 3: Merge release-management.ts | 15 min | | |
| Phase 4: Migration | 20 min | | |
| Phase 5: Build Fix | 30-45 min | | Fewer errors expected |
| **Phase 6: TaskExecutor DI** | **30-45 min** | | All lookup logic here now |
| **Phase 7: Cron Jobs** | **5 min** | | Just add ReleaseConfigRepo param |
| **Phase 8: Services** | **0-5 min** | | Verification only - no changes! |
| Phase 9: Routes | 5 min | | |
| Phase 10: Test | 20 min | | |
| **TOTAL** | **1.5-2 hours** | | **Reduced from 2-3 hours!** |

---

## Additional Sections

### Creating ReleaseConfigModel

If ReleaseConfigModel doesn't exist, create it:

**Migration**: `migrations/012_create_release_config_model.sql`

```sql
CREATE TABLE IF NOT EXISTS release_configs (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- Integration-specific IDs (JSON object)
  integrationConfigs JSON NOT NULL COMMENT '{
    "cicd": "workflow-id",
    "projectManagement": "integration-id",
    "testManagement": "config-id",
    "notification": "channel-id"
  }',
  
  -- Platforms
  platforms JSON NOT NULL COMMENT '["IOS", "ANDROID", "WEB"]',
  
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_tenant (tenantId),
  INDEX idx_active (isActive),
  UNIQUE KEY unique_tenant_name (tenantId, name),
  
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COMMENT='Release configuration linking integrations';
```

**Model**: `api/script/models/release/release-config.model.ts`

```typescript
export type ReleaseConfigModel = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  integrationConfigs: {
    cicd?: string;
    projectManagement?: string;
    testManagement?: string;
    notification?: string;
  };
  platforms: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

### Adding releaseConfigId Field

If Release model doesn't have releaseConfigId:

**Migration**: Add to `migrations/011_orchestration_from_source.sql`

```sql
ALTER TABLE releases 
  ADD COLUMN releaseConfigId VARCHAR(255) NULL COMMENT 'FK to release_configs table',
  ADD INDEX idx_release_config (releaseConfigId),
  ADD FOREIGN KEY (releaseConfigId) REFERENCES release_configs(id) ON DELETE RESTRICT;
```

**Model**: Update `api/script/storage/release/release-models.ts`

```typescript
export interface ReleaseModel {
  id: string;
  tenantId: string;
  releaseConfigId: string;  // ← ADD THIS
  version: string;
  // ... other fields
}
```

---

## Appendix: Reference Materials

### Integration Resolution Quick Reference (Updated)

| Integration | TaskExecutor Lookup | Service Call Parameters | Config Field Extracted |
|-------------|---------------------|------------------------|------------------------|
| **SCM** | None (direct call) | `tenantId, branchName, baseBranch` | N/A |
| **CI/CD** | Lookup ReleaseConfiguration by releaseConfigId | `tenantId, workflowId, params` | `ciConfigId` |
| **JIRA** | Lookup ReleaseConfiguration by releaseConfigId | `tenantId, integrationId, params` | `projectManagementConfigId` |
| **Test Mgmt** | Lookup ReleaseConfiguration by releaseConfigId | `tenantId, configId, params` | `testManagementConfigId` |
| **Notifications** | Lookup ReleaseConfiguration by releaseConfigId | `tenantId, channelId, params` | `commsConfigId` |

**Pattern**: TaskExecutor → Look up config → Extract ID → Call service with specific ID

### File Locations Reference

| Component | File Path |
|-----------|-----------|
| TaskExecutor | `api/script/services/task-executor.ts` |
| Kickoff Cron | `api/script/routes/release/kickoff-cron-job.ts` |
| Regression Cron | `api/script/routes/release/regression-cron-job.ts` |
| Post-Regression Cron | `api/script/routes/release/post-regression-cron-job.ts` |
| Release DTO | `api/script/storage/release/release-dto.ts` |
| Release Models | `api/script/storage/release/release-models.ts` |
| Task Creation Utils | `api/script/utils/task-creation.ts` |
| Task Sequencing Utils | `api/script/utils/task-sequencing.ts` |
| API Entry Point | `api/script/api.ts` |
| SCM Service | `api/script/services/integrations/scm/*` |
| CI/CD Service | `api/script/services/integrations/ci-cd/*` |
| JIRA Service | `api/script/services/integrations/project-management/*` |
| Test Mgmt Service | `api/script/services/integrations/test-management/*` |
| Notification Service | `api/script/services/integrations/comm/*` |

---

**END OF MERGE PLAN**

---

## Document Status

- **Version**: 2.0 (Critical Update Applied)
- **Status**: Active - Single Source of Truth
- **Last Updated**: 2025-11-22 (Updated with integration resolution clarification)
- **Next Review**: After merge completion
- **Owner**: Development Team

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-22 | 1.0 | Initial comprehensive merge plan | AI Assistant |
| 2025-11-22 | 2.0 | **CRITICAL UPDATE**: Services don't need releaseConfigId - TaskExecutor does all lookups. Reduced time to 1.5-2 hours. Phase 8 eliminated. | AI Assistant |

---

**Remember**: This is the SINGLE SOURCE OF TRUTH for the merge. Update this document as you progress.

