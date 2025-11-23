# Quick Start: Merge Orchestration and Integrations

## TL;DR

This guide helps you merge the **Release Orchestration** repository into the **Integrations** repository to create a unified codebase.

**Source**: `/Users/navkashkrishna/delivr-server-ota-managed` (Orchestration)  
**Target**: `/Users/navkashkrishna/dota-managed/delivr-server-ota-managed` (Integrations - Current)

**See Full Plan**: [MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md](./MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md)

---

## What Are We Merging?

### From Orchestration Repo → Integrations Repo

**Adding**:
- ✅ Complete release workflow automation (3 stages)
- ✅ Task creation, sequencing, and execution engine
- ✅ Cron jobs for automated polling
- ✅ Integration interfaces (contracts)
- ✅ Release/Task/RegressionCycle data access layer

**Keeping** (from Integrations Repo):
- ✅ All integration implementations (CI/CD, Comm, PM, SCM, Store, Test Mgmt)
- ✅ Integration CRUD APIs
- ✅ Integration migrations
- ✅ Integration types and validation

**Bridging**:
- 🔗 Integration adapters (map interfaces → implementations)

---

## Prerequisites

Before starting:

```bash
# 1. Ensure you're in the integrations repo (current workspace)
cd /Users/navkashkrishna/dota-managed/delivr-server-ota-managed

# 2. Ensure clean working directory
git status  # Should show no uncommitted changes

# 3. Ensure you have Node.js and npm installed
node --version  # v16+
npm --version

# 4. Ensure database is accessible
mysql -u root -p codepushdb -e "SHOW TABLES;"
```

---

## Step-by-Step Execution

### Phase 1: Backup and Prepare (10 minutes)

```bash
# 1. Create backup branch
git branch backup-integrations-only-$(date +%Y%m%d_%H%M%S)
git add -A
git commit -m "Backup: Integrations-only state before orchestration merge"

# 2. Create merge branch
git checkout -b merge-orchestration-and-integrations

# 3. Verify source repo exists
ls -la /Users/navkashkrishna/delivr-server-ota-managed/api/script/routes/release/
```

**✅ Checkpoint**: Confirm backup branch created and source repo accessible.

---

### Phase 2: Copy Orchestration Files (30 minutes)

Run the automated copy script:

```bash
# Create and run copy script
cat > /tmp/copy-orchestration.sh << 'EOF'
#!/bin/bash

SOURCE="/Users/navkashkrishna/delivr-server-ota-managed"
TARGET="/Users/navkashkrishna/dota-managed/delivr-server-ota-managed"

echo "🚀 Starting orchestration file copy..."

# Cron job routes
echo "📁 Copying cron job routes..."
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

# Integration interfaces
echo "📁 Copying integration interfaces..."
mkdir -p "$TARGET/api/script/routes/release/integrations"
cp "$SOURCE/api/script/routes/release/integrations/cicd-integration.interface.ts" "$TARGET/api/script/routes/release/integrations/" && echo "  ✅ cicd-integration.interface.ts"
cp "$SOURCE/api/script/routes/release/integrations/jira-integration.interface.ts" "$TARGET/api/script/routes/release/integrations/" && echo "  ✅ jira-integration.interface.ts"
cp "$SOURCE/api/script/routes/release/integrations/notification-integration.interface.ts" "$TARGET/api/script/routes/release/integrations/" && echo "  ✅ notification-integration.interface.ts"
cp "$SOURCE/api/script/routes/release/integrations/scm-integration.interface.ts" "$TARGET/api/script/routes/release/integrations/" && echo "  ✅ scm-integration.interface.ts"
cp "$SOURCE/api/script/routes/release/integrations/test-platform-integration.interface.ts" "$TARGET/api/script/routes/release/integrations/" && echo "  ✅ test-platform-integration.interface.ts"
cp "$SOURCE/api/script/routes/release/integrations/index.ts" "$TARGET/api/script/routes/release/integrations/" && echo "  ✅ index.ts"

echo ""
echo "✨ Phase 2 complete! Files copied successfully."
echo ""
echo "Next: Review and commit changes"
EOF

chmod +x /tmp/copy-orchestration.sh
/tmp/copy-orchestration.sh
```

**✅ Checkpoint**: Verify files copied:

```bash
# Check key files exist
ls -la api/script/routes/release/kickoff-cron-job.ts
ls -la api/script/services/task-executor.ts
ls -la api/script/storage/release/release-dto.ts
ls -la api/script/utils/task-creation.ts
ls -la api/script/routes/release/integrations/scm-integration.interface.ts
```

Commit the changes:

```bash
git add api/script/
git commit -m "feat: Copy orchestration files from release orchestration repo

- Add cron job routes (kickoff, regression, post-regression)
- Add orchestration services (task-executor, cron-scheduler, cron-lock)
- Add release storage layer (DTOs and models)
- Add orchestration utils (task-creation, task-sequencing, time-utils)
- Add integration interfaces (SCM, CI/CD, JIRA, Notification, TestPlatform)
"
```

---

### Phase 3: Merge release-management.ts (15 minutes)

```bash
# Backup current version
cp api/script/routes/release-management.ts \
   api/script/routes/release-management.ts.integrations-backup

# Copy orchestration version
cp /Users/navkashkrishna/delivr-server-ota-managed/api/script/routes/release/release-management.ts \
   api/script/routes/release-management.ts

# Review differences
diff api/script/routes/release-management.ts.integrations-backup \
     api/script/routes/release-management.ts

# Commit
git add api/script/routes/release-management.ts
git commit -m "feat: Replace release-management.ts with full orchestration version

- Includes Stage 1, 2, 3 workflow
- Includes cron job auto-start
- Includes task creation on release creation
"
```

**✅ Checkpoint**: Verify `release-management.ts` has orchestration code.

---

### Phase 4: Create Orchestration Migration (20 minutes)

```bash
# Copy and consolidate orchestration migrations
cat > migrations/011_orchestration_complete.sql << 'EOF'
-- ============================================================================
-- Migration: Release Orchestration Complete
-- Description: Adds all release orchestration tables and columns
-- Date: 2025-11-22
-- Based on: 
--   - 005_release_orchestration_columns.sql
--   - 006_platform_target_junction_tables.sql
--   - 007_builds_unique_constraint.sql
--   - 008_update_task_type_enum.sql
--   - 009_manual_stage3_trigger_and_task_renaming.sql
-- ============================================================================

-- Source: Copy from /Users/navkashkrishna/delivr-server-ota-managed/migrations/
-- Manually extract the relevant SQL from the above migrations

-- TODO: Populate this file with actual migration content
-- For now, we'll skip this and use the existing migrations in the source repo

EOF
```

**⚠️ MANUAL STEP REQUIRED**: 

1. Open `/Users/navkashkrishna/delivr-server-ota-managed/migrations/` in a text editor
2. Review migrations 005, 006, 007, 008, 009
3. Extract the SQL that's NOT already in the integrations repo
4. Consolidate into `011_orchestration_complete.sql`

**Alternative (Simpler)**: Just copy the migration file from orchestration repo that has everything:

```bash
# Copy the complete migration
cp /Users/navkashkrishna/delivr-server-ota-managed/migrations/001_release_orchestration_complete.sql \
   migrations/011_orchestration_from_source.sql

# Run it
mysql -u root -p codepushdb < migrations/011_orchestration_from_source.sql
```

**✅ Checkpoint**: Verify tables created:

```bash
mysql -u root -p codepushdb -e "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'codepushdb' 
  AND table_name LIKE 'release%'
  ORDER BY table_name;
"
```

Should see:
- `releases`
- `release_tasks`
- `regression_cycles`
- `cron_jobs`
- `builds`
- `platform_releases`
- `release_builds`

Commit:

```bash
git add migrations/011_orchestration_from_source.sql
git commit -m "feat: Add orchestration migration (tables and columns)"
```

---

### Phase 5: Build and Fix TypeScript Errors (30-60 minutes)

```bash
cd api
npm run build
```

**Expected Errors**:
1. Missing imports
2. Type mismatches
3. Path resolution issues

**Fix Pattern**:

For each error:
1. Identify missing import
2. Add import at top of file
3. Re-run build
4. Repeat until clean

Common fixes:

```typescript
// If error: Cannot find module '../storage/release/release-models'
// Add:
import { ReleaseStatus, TaskType, TaskStage } from '../storage/release/release-models';

// If error: Property 'sequelize' does not exist on type 'Storage'
// Add:
import { hasSequelize, StorageWithSequelize } from '../routes/release/release-types';
```

**✅ Checkpoint**: `npm run build` succeeds with no errors.

Commit:

```bash
git add api/script/
git commit -m "fix: Resolve TypeScript build errors after orchestration merge"
```

---

### Phase 6: Create Integration Adapter Factory (60-90 minutes)

This is the **most critical step** - it bridges orchestration interfaces with real integration implementations.

Create `api/script/services/integration-adapter-factory.ts`:

```typescript
/**
 * Integration Adapter Factory
 * 
 * Bridges orchestration interfaces with concrete integration implementations.
 * Dynamically loads integrations based on tenant configuration.
 */

import { SCMIntegration } from '../routes/release/integrations/scm-integration.interface';
import { NotificationIntegration } from '../routes/release/integrations/notification-integration.interface';
import { JIRAIntegration } from '../routes/release/integrations/jira-integration.interface';
import { TestPlatformIntegration } from '../routes/release/integrations/test-platform-integration.interface';
import { CICDIntegration } from '../routes/release/integrations/cicd-integration.interface';

export interface IntegrationAdapters {
  scm?: SCMIntegration;
  notification?: NotificationIntegration;
  jira?: JIRAIntegration;
  testPlatform?: TestPlatformIntegration;
  cicd?: CICDIntegration;
}

/**
 * Loads real integrations for a tenant
 */
export async function loadIntegrationsForTenant(
  tenantId: string
): Promise<IntegrationAdapters> {
  const adapters: IntegrationAdapters = {};
  
  // TODO: Implement adapter loading logic
  // 1. Query database for tenant's configured integrations
  // 2. For each configured integration, create adapter
  // 3. Return adapters object
  
  console.log(`[Integration Adapter] Loading integrations for tenant ${tenantId}`);
  
  // For now, return empty adapters (will use mocks)
  return adapters;
}
```

**⚠️ CRITICAL**: This is a placeholder. You'll need to implement the actual adapter logic based on your integration implementations.

**See Full Example**: [MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md](./MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md) - Phase 4, Step 4.1

Commit:

```bash
git add api/script/services/integration-adapter-factory.ts
git commit -m "feat: Add integration adapter factory (placeholder)"
```

---

### Phase 7: Update Cron Jobs to Use Adapters (15 minutes)

Update cron jobs to use adapter factory instead of mocks:

```bash
# Edit kickoff-cron-job.ts
# Find: const integrations = getMockIntegrations();
# Replace with:
# import { loadIntegrationsForTenant } from '../../services/integration-adapter-factory';
# const integrations = await loadIntegrationsForTenant(release.tenantId);

# Do the same for:
# - regression-cron-job.ts
# - post-regression-cron-job.ts
```

**Tip**: For now, you can keep using mocks until adapters are fully implemented:

```typescript
// In cron jobs, use mocks if no real integrations loaded
const realIntegrations = await loadIntegrationsForTenant(release.tenantId);
const integrations = Object.keys(realIntegrations).length > 0 
  ? realIntegrations 
  : getMockIntegrations();
```

Commit:

```bash
git add api/script/routes/release/
git commit -m "feat: Update cron jobs to use integration adapter factory (with mock fallback)"
```

---

### Phase 8: Register Orchestration Routes (10 minutes)

Update `api/script/api.ts`:

```typescript
// Add import
import { getReleaseManagementRouter } from './routes/release/release-management';

// Register route (add this with other route registrations)
const releaseManagementRouter = getReleaseManagementRouter({ storage });
app.use('/api/v1/release-management', releaseManagementRouter);
```

Commit:

```bash
git add api/script/api.ts
git commit -m "feat: Register release management orchestration routes"
```

---

### Phase 9: Test Build and Basic Functionality (20 minutes)

```bash
# 1. Clean build
cd api
rm -rf bin/
npm run build

# 2. Start server (in background)
npm start &
SERVER_PID=$!

# Give it time to start
sleep 5

# 3. Test health endpoint
curl http://localhost:3000/api/v1/release-management/health

# Expected response:
# {
#   "service": "Release Management",
#   "status": "healthy",
#   "timestamp": "2025-11-22T..."
# }

# 4. Test create release endpoint (will fail if no auth, but should not error)
curl -X POST http://localhost:3000/api/v1/release-management/tenants/test-tenant/releases \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.0.0",
    "type": "PLANNED",
    "targetReleaseDate": "2025-12-01T00:00:00Z",
    "plannedDate": "2025-11-25T00:00:00Z",
    "baseBranch": "main",
    "platforms": ["IOS", "ANDROID"]
  }'

# Stop server
kill $SERVER_PID
```

**✅ Checkpoint**: 
- Health endpoint returns 200
- Create release endpoint returns 401 (auth required) - not 500 (internal error)

---

### Phase 10: Commit and Push (5 minutes)

```bash
# Final commit
git add .
git commit -m "feat: Complete orchestration and integrations merge

Summary:
- Copied all orchestration files from source repo
- Replaced release-management.ts with full orchestration version
- Added orchestration database migration
- Created integration adapter factory (placeholder)
- Updated cron jobs to use adapter factory
- Registered orchestration routes in API

Status:
- ✅ Build succeeds
- ✅ Server starts
- ✅ Health endpoint works
- ⏳ Adapters need implementation (Phase 2)
- ⏳ End-to-end testing needed (Phase 3)

See MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md for next steps.
"

# Push to remote
git push -u origin merge-orchestration-and-integrations
```

---

## Success Criteria

After completing the above steps, you should have:

- [x] All orchestration files copied
- [x] TypeScript build succeeds
- [x] Orchestration migration executed
- [x] Server starts without errors
- [x] Health endpoint responds
- [ ] Integration adapters implemented (Phase 2)
- [ ] End-to-end tests pass (Phase 3)

---

## Next Steps (Phase 2)

See [MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md](./MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md) for:

1. **Phase 2: Implement Integration Adapters**
   - Map SCM integration to SCM interface
   - Map CI/CD integration to CI/CD interface
   - Map JIRA integration to JIRA interface
   - Map Test Management to Test Platform interface
   - Map Slack integration to Notification interface

2. **Phase 3: End-to-End Testing**
   - Create release via API
   - Verify Stage 1 tasks execute with real integrations
   - Verify Stage 2 regression cycles work
   - Verify Stage 3 post-regression tasks work

3. **Phase 4: Production Readiness**
   - Add monitoring and alerts
   - Performance testing
   - Documentation
   - Team training

---

## Troubleshooting

### Build fails with "Cannot find module"

**Fix**: Check import paths. Orchestration code uses relative imports, ensure paths are correct.

```typescript
// ❌ Wrong
import { ReleaseDTO } from './release-dto';

// ✅ Correct
import { ReleaseDTO } from '../storage/release/release-dto';
```

### Server fails to start

**Fix**: Check migration status. Ensure all tables exist.

```bash
mysql -u root -p codepushdb -e "SHOW TABLES;"
```

### Health endpoint returns 404

**Fix**: Check route registration in `api.ts`. Ensure orchestration routes are registered.

### Cron jobs don't execute

**Fix**: Check cron job status in database.

```sql
SELECT * FROM cron_jobs;
```

If empty, cron jobs haven't been created. Create a release to trigger cron job creation.

---

## Rollback

If something goes wrong:

```bash
# Rollback to backup branch
git checkout backup-integrations-only-YYYYMMDD_HHMMSS

# Or reset merge branch
git reset --hard HEAD~N  # N = number of commits to undo
```

---

## Support

- **Full Plan**: [MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md](./MERGE_PLAN_ORCHESTRATION_AND_INTEGRATIONS.md)
- **Codebase Rules**: [.cursorrules](./.cursorrules)
- **Dev Setup**: [docs/DEV_SETUP.md](./docs/DEV_SETUP.md)

---

**Estimated Time**: 3-4 hours for Phase 1 (this guide)  
**Status**: Ready to Execute  
**Last Updated**: 2025-11-22

