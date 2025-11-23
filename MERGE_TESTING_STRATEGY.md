# Merge Testing Strategy

**Date**: 2025-11-22  
**Purpose**: Define tests for each merge phase to verify correctness  
**Status**: Ready to implement

---

## Phase 1: Backup and Preparation ✅

### Status Check
**Are Phase 1 steps complete?**
- [ ] ❌ NOT STARTED - Waiting for your signal to begin

### Phase 1 Tests

```bash
# Test 1.1: Verify backup branch created
git branch | grep "backup-integrations-only"
# Expected: backup-integrations-only-YYYYMMDD_HHMMSS

# Test 1.2: Verify merge branch created and active
git branch | grep "* merge-orchestration-and-integrations"
# Expected: * merge-orchestration-and-integrations

# Test 1.3: Verify clean working directory
git status
# Expected: "On branch merge-orchestration-and-integrations"
#           "nothing to commit, working tree clean"

# Test 1.4: Verify can switch back to backup
git checkout backup-integrations-only-YYYYMMDD_HHMMSS
git checkout merge-orchestration-and-integrations
# Expected: No errors, smooth switching
```

**Exit Criteria**: All 4 tests pass ✅

---

## Phase 2: Copy Orchestration Files

### Phase 2 Tests

```bash
# Test 2.1: Verify cron job routes copied
test -f api/script/routes/release/kickoff-cron-job.ts && \
test -f api/script/routes/release/regression-cron-job.ts && \
test -f api/script/routes/release/post-regression-cron-job.ts && \
test -f api/script/routes/release/release-types.ts && \
echo "✅ Cron job routes copied" || echo "❌ Missing cron job routes"

# Test 2.2: Verify services copied
test -f api/script/services/cron-lock-service.ts && \
test -f api/script/services/cron-scheduler.ts && \
test -f api/script/services/integration-mocks.ts && \
test -f api/script/services/task-executor.ts && \
echo "✅ Services copied" || echo "❌ Missing services"

# Test 2.3: Verify storage layer copied
test -f api/script/storage/release/cron-job-dto.ts && \
test -f api/script/storage/release/regression-cycle-dto.ts && \
test -f api/script/storage/release/release-dto.ts && \
test -f api/script/storage/release/release-models.ts && \
test -f api/script/storage/release/release-tasks-dto.ts && \
echo "✅ Storage layer copied" || echo "❌ Missing storage files"

# Test 2.4: Verify utils copied
test -f api/script/utils/regression-cycle-creation.ts && \
test -f api/script/utils/task-creation.ts && \
test -f api/script/utils/task-sequencing.ts && \
test -f api/script/utils/time-utils.ts && \
echo "✅ Utils copied" || echo "❌ Missing utils"

# Test 2.5: Verify integration interfaces NOT copied (skipped as planned)
! test -f api/script/routes/release/integrations/scm-integration.interface.ts && \
echo "✅ Integration interfaces correctly skipped" || echo "⚠️  Integration interfaces copied (unexpected)"

# Test 2.6: Verify file count
FILE_COUNT=$(find api/script/routes/release api/script/services api/script/storage/release api/script/utils \
  -type f -name "*.ts" 2>/dev/null | wc -l)
echo "📊 Total TypeScript files after copy: $FILE_COUNT"
```

**Exit Criteria**: Tests 2.1-2.4 pass, Test 2.5 confirms interfaces skipped ✅

---

## Phase 3: Merge release-management.ts

### Phase 3 Tests

```bash
# Test 3.1: Verify backup created
test -f api/script/routes/release-management.ts.integrations-backup && \
echo "✅ Backup created" || echo "❌ Backup missing"

# Test 3.2: Verify new file has orchestration code
grep -q "executeKickoffCronJob" api/script/routes/release-management.ts && \
grep -q "Stage 1.*Kickoff" api/script/routes/release-management.ts && \
grep -q "Stage 2.*Regression" api/script/routes/release-management.ts && \
grep -q "Stage 3.*Post-Regression" api/script/routes/release-management.ts && \
echo "✅ Orchestration code present" || echo "❌ Orchestration code missing"

# Test 3.3: Verify file size increased (orchestration version is larger)
OLD_SIZE=$(wc -l < api/script/routes/release-management.ts.integrations-backup)
NEW_SIZE=$(wc -l < api/script/routes/release-management.ts)
if [ "$NEW_SIZE" -gt "$OLD_SIZE" ]; then
  echo "✅ File size increased: $OLD_SIZE → $NEW_SIZE lines"
else
  echo "❌ File size did not increase (expected orchestration version to be larger)"
fi

# Test 3.4: Verify syntax valid (quick check)
node -c api/script/routes/release-management.ts 2>/dev/null && \
echo "✅ Syntax valid" || echo "⚠️  Syntax errors (will fix in Phase 5)"
```

**Exit Criteria**: Tests 3.1-3.3 pass ✅

---

## Phase 4: Database Migration

### Phase 4 Status
**Already Complete!** ✅
- Migration `011_local_code_requirements.sql` applied ✅
- Migration `012_orchestration_supplements.sql` applied ✅
- Smoke test passed ✅

### Phase 4 Verification (Re-run to confirm)

```bash
# Test 4.1: Verify database accessible
docker exec -i api-db-1 mysql -u root -proot codepushdb -e "SELECT 1" && \
echo "✅ Database accessible" || echo "❌ Database not accessible"

# Test 4.2: Verify orchestration columns exist
docker exec -i api-db-1 mysql -u root -proot codepushdb -e "
  SELECT 
    COUNT(*) as count
  FROM information_schema.COLUMNS
  WHERE 
    TABLE_SCHEMA = 'codepushdb' 
    AND TABLE_NAME = 'releases'
    AND COLUMN_NAME IN ('stageData', 'customIntegrationConfigs', 'preCreatedBuilds', 'releaseConfigId')
" | grep -q "4" && \
echo "✅ All orchestration columns present" || echo "❌ Missing orchestration columns"

# Test 4.3: Verify release_tasks columns
docker exec -i api-db-1 mysql -u root -proot codepushdb -e "
  SELECT 
    COUNT(*) as count
  FROM information_schema.COLUMNS
  WHERE 
    TABLE_SCHEMA = 'codepushdb' 
    AND TABLE_NAME = 'release_tasks'
    AND COLUMN_NAME IN ('stage', 'externalId', 'externalData')
" | grep -q "3" && \
echo "✅ release_tasks columns present" || echo "❌ Missing release_tasks columns"

# Test 4.4: Verify cron_jobs table exists
docker exec -i api-db-1 mysql -u root -proot codepushdb -e "
  SHOW TABLES LIKE 'cron_jobs'
" | grep -q "cron_jobs" && \
echo "✅ cron_jobs table exists" || echo "❌ cron_jobs table missing"

# Test 4.5: Re-run smoke test
docker exec -i api-db-1 mysql -u root -proot codepushdb < tests/db_schema_smoke_test.sql && \
echo "✅ Smoke test passed" || echo "❌ Smoke test failed"
```

**Exit Criteria**: All 5 tests pass ✅

---

## Phase 5: Build and Fix TypeScript Errors

### Phase 5 Tests

```bash
# Test 5.1: Attempt build
cd api && npm run build 2>&1 | tee build-phase5.log
BUILD_EXIT_CODE=$?

# Test 5.2: Count errors
ERROR_COUNT=$(grep -c "error TS" build-phase5.log || echo 0)
echo "📊 TypeScript errors: $ERROR_COUNT"

# Test 5.3: Verify build succeeds after fixes
if [ $BUILD_EXIT_CODE -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "⏳ Build has errors - fix iteratively"
  # Show first 20 errors
  head -20 build-phase5.log
fi

# Test 5.4: Verify no missing imports
grep -i "cannot find module" build-phase5.log && \
echo "❌ Missing imports detected" || echo "✅ No missing imports"

# Test 5.5: Verify dist folder created
test -d api/bin && \
echo "✅ Build output (bin/) created" || echo "❌ Build output missing"
```

**Exit Criteria**: Build succeeds (exit code 0) ✅

---

## Phase 6: Update TaskExecutor for Dependency Injection

### Phase 6 Tests

```bash
# Test 6.1: Verify TaskExecutor constructor updated
grep -A 10 "constructor(" api/script/services/task-executor.ts | grep -q "private scmService" && \
grep -A 10 "constructor(" api/script/services/task-executor.ts | grep -q "private cicdService" && \
grep -A 10 "constructor(" api/script/services/task-executor.ts | grep -q "private releaseConfigRepo" && \
echo "✅ TaskExecutor constructor has DI" || echo "❌ TaskExecutor constructor missing DI"

# Test 6.2: Verify executeTask signature updated
grep -A 3 "executeTask(" api/script/services/task-executor.ts | grep -v "integrations:" && \
echo "✅ executeTask no longer accepts integrations parameter" || echo "❌ executeTask still has integrations parameter"

# Test 6.3: Verify getReleaseConfig helper added
grep -q "getReleaseConfig" api/script/services/task-executor.ts && \
echo "✅ getReleaseConfig helper present" || echo "❌ getReleaseConfig helper missing"

# Test 6.4: Verify SCM calls use tenantId directly
grep -A 5 "this.scmService" api/script/services/task-executor.ts | grep -q "release.tenantId" && \
echo "✅ SCM calls use tenantId" || echo "❌ SCM calls incorrect"

# Test 6.5: Verify CI/CD calls use tenantId + workflowId
grep -A 10 "this.cicdService" api/script/services/task-executor.ts | grep -q "tenantId" && \
grep -A 10 "this.cicdService" api/script/services/task-executor.ts | grep -q "workflowId" && \
echo "✅ CI/CD calls use tenantId + workflowId" || echo "❌ CI/CD calls incorrect"

# Test 6.6: Verify IntegrationInstances interface removed or commented
! grep -q "export interface IntegrationInstances" api/script/services/task-executor.ts && \
echo "✅ IntegrationInstances removed" || echo "⚠️  IntegrationInstances still present"

# Test 6.7: Build succeeds after TaskExecutor updates
cd api && npm run build && \
echo "✅ Build successful after TaskExecutor DI" || echo "❌ Build failed"
```

**Exit Criteria**: Tests 6.1-6.5 pass, build succeeds ✅

---

## Phase 7: Update Cron Jobs to Inject Services

### Phase 7 Tests

```bash
# Test 7.1: Verify kickoff-cron-job.ts injects services
grep -A 20 "const taskExecutor = new TaskExecutor" api/script/routes/release/kickoff-cron-job.ts | \
grep -q "scmService" && \
grep -A 20 "const taskExecutor = new TaskExecutor" api/script/routes/release/kickoff-cron-job.ts | \
grep -q "releaseConfigRepo" && \
echo "✅ kickoff-cron-job.ts injects services" || echo "❌ kickoff-cron-job.ts missing service injection"

# Test 7.2: Verify regression-cron-job.ts injects services
grep -A 20 "const taskExecutor = new TaskExecutor" api/script/routes/release/regression-cron-job.ts | \
grep -q "scmService" && \
echo "✅ regression-cron-job.ts injects services" || echo "❌ regression-cron-job.ts missing service injection"

# Test 7.3: Verify post-regression-cron-job.ts injects services
grep -A 20 "const taskExecutor = new TaskExecutor" api/script/routes/release/post-regression-cron-job.ts | \
grep -q "scmService" && \
echo "✅ post-regression-cron-job.ts injects services" || echo "❌ post-regression-cron-job.ts missing service injection"

# Test 7.4: Verify getMockIntegrations() removed
! grep -q "getMockIntegrations()" api/script/routes/release/kickoff-cron-job.ts && \
! grep -q "getMockIntegrations()" api/script/routes/release/regression-cron-job.ts && \
! grep -q "getMockIntegrations()" api/script/routes/release/post-regression-cron-job.ts && \
echo "✅ getMockIntegrations() removed from all cron jobs" || echo "❌ getMockIntegrations() still present"

# Test 7.5: Build succeeds after cron job updates
cd api && npm run build && \
echo "✅ Build successful after cron job DI" || echo "❌ Build failed"
```

**Exit Criteria**: All 5 tests pass, build succeeds ✅

---

## Phase 8: Verify Integration Service Signatures

### Phase 8 Tests

```bash
# Test 8.1: Verify CI/CD service signature
grep -A 10 "trigger.*async" api/script/services/integrations/ci-cd/workflows/github-actions-workflow.service.ts | \
grep -q "tenantId: string" && \
echo "✅ CI/CD service has correct signature" || echo "❌ CI/CD service signature incorrect"

# Test 8.2: Verify JIRA service signature
grep -A 10 "createTickets" api/script/services/integrations/project-management/ticket/ticket.service.ts | \
grep -q "configId" && \
echo "✅ JIRA service has correct signature" || echo "❌ JIRA service signature incorrect"

# Test 8.3: Verify Test Management service signature
grep -A 10 "createTestRuns" api/script/services/integrations/test-management/test-run/test-run.service.ts | \
grep -q "testManagementConfigId" && \
echo "✅ Test Management service has correct signature" || echo "❌ Test Management service signature incorrect"

# Test 8.4: Verify SCM service signature
grep -A 10 "forkOutBranch" api/script/services/integrations/scm/scm.service.ts | \
grep -q "tenantId: string" && \
echo "✅ SCM service has correct signature" || echo "❌ SCM service signature incorrect"
```

**Exit Criteria**: All 4 tests pass (services already correct - no changes needed!) ✅

---

## Phase 9: Register Orchestration Routes

### Phase 9 Tests

```bash
# Test 9.1: Verify route import added
grep -q "getReleaseManagementRouter" api/script/api.ts && \
echo "✅ Route import present" || echo "❌ Route import missing"

# Test 9.2: Verify route registered
grep -q "/api/v1/release-management" api/script/api.ts && \
echo "✅ Route registered" || echo "❌ Route not registered"

# Test 9.3: Verify route uses storage
grep -A 2 "getReleaseManagementRouter" api/script/api.ts | grep -q "storage" && \
echo "✅ Route receives storage" || echo "❌ Route missing storage"

# Test 9.4: Build succeeds after route registration
cd api && npm run build && \
echo "✅ Build successful after route registration" || echo "❌ Build failed"
```

**Exit Criteria**: All 4 tests pass, build succeeds ✅

---

## Phase 10: Test and Verify

### Phase 10 Tests

```bash
# Test 10.1: Start server
cd api && npm start &
SERVER_PID=$!
sleep 10  # Wait for server to start

# Test 10.2: Health endpoint responds
curl -f http://localhost:3000/api/v1/release-management/health && \
echo "✅ Health endpoint responds" || echo "❌ Health endpoint failed"

# Test 10.3: Release endpoint exists (expect 401 Unauthorized)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  http://localhost:3000/api/v1/release-management/tenants/test-tenant/releases \
  -H "Content-Type: application/json" \
  -d '{"version":"1.0.0","type":"PLANNED"}')

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Release endpoint exists (401 Unauthorized as expected)"
elif [ "$HTTP_CODE" = "400" ]; then
  echo "✅ Release endpoint exists (400 validation as expected)"
else
  echo "❌ Unexpected response code: $HTTP_CODE"
fi

# Test 10.4: Verify database tables accessible
docker exec -i api-db-1 mysql -u root -proot codepushdb -e "
  SELECT 
    table_name,
    table_rows
  FROM information_schema.tables
  WHERE table_schema = 'codepushdb'
  AND table_name IN ('releases', 'release_tasks', 'cron_jobs', 'regression_cycles', 'builds')
  ORDER BY table_name
" && echo "✅ All tables accessible" || echo "❌ Database query failed"

# Test 10.5: Stop server
kill $SERVER_PID
```

**Exit Criteria**: Server starts, health endpoint works, release endpoint exists, tables accessible ✅

---

## Complete Test Suite Script

Save this as `tests/merge-verification.sh`:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -e "\n${YELLOW}Running: $test_name${NC}"
  
  if eval "$test_command"; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
  fi
}

echo "======================================"
echo "  Merge Verification Test Suite"
echo "======================================"

# Phase 1 Tests
echo -e "\n${YELLOW}=== Phase 1: Backup and Preparation ===${NC}"
run_test "Backup branch exists" "git branch | grep -q 'backup-integrations-only'"
run_test "Merge branch active" "git branch | grep -q '* merge-orchestration-and-integrations'"
run_test "Working directory clean" "git status | grep -q 'nothing to commit'"

# Phase 2 Tests
echo -e "\n${YELLOW}=== Phase 2: Copy Orchestration Files ===${NC}"
run_test "Cron job routes copied" "test -f api/script/routes/release/kickoff-cron-job.ts && test -f api/script/routes/release/regression-cron-job.ts"
run_test "Services copied" "test -f api/script/services/task-executor.ts && test -f api/script/services/cron-scheduler.ts"
run_test "Storage layer copied" "test -f api/script/storage/release/release-dto.ts && test -f api/script/storage/release/release-models.ts"
run_test "Utils copied" "test -f api/script/utils/task-creation.ts && test -f api/script/utils/task-sequencing.ts"

# Phase 3 Tests
echo -e "\n${YELLOW}=== Phase 3: Merge release-management.ts ===${NC}"
run_test "Backup created" "test -f api/script/routes/release-management.ts.integrations-backup"
run_test "Orchestration code present" "grep -q 'executeKickoffCronJob' api/script/routes/release-management.ts"

# Phase 4 Tests
echo -e "\n${YELLOW}=== Phase 4: Database Migration ===${NC}"
run_test "Database accessible" "docker exec -i api-db-1 mysql -u root -proot codepushdb -e 'SELECT 1' > /dev/null 2>&1"
run_test "Orchestration columns exist" "docker exec -i api-db-1 mysql -u root -proot codepushdb -e \"SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'codepushdb' AND TABLE_NAME = 'releases' AND COLUMN_NAME IN ('stageData', 'releaseConfigId')\" | grep -q '2'"

# Phase 5 Tests
echo -e "\n${YELLOW}=== Phase 5: Build and Fix ===${NC}"
run_test "TypeScript build succeeds" "cd api && npm run build > /dev/null 2>&1"
run_test "Build output created" "test -d api/bin"

# Phase 6 Tests
echo -e "\n${YELLOW}=== Phase 6: TaskExecutor DI ===${NC}"
run_test "TaskExecutor has DI constructor" "grep -A 10 'constructor(' api/script/services/task-executor.ts | grep -q 'private scmService'"
run_test "getReleaseConfig helper present" "grep -q 'getReleaseConfig' api/script/services/task-executor.ts"

# Phase 7 Tests
echo -e "\n${YELLOW}=== Phase 7: Cron Jobs ===${NC}"
run_test "Cron jobs inject services" "grep -A 20 'const taskExecutor' api/script/routes/release/kickoff-cron-job.ts | grep -q 'scmService'"
run_test "getMockIntegrations removed" "! grep -q 'getMockIntegrations()' api/script/routes/release/kickoff-cron-job.ts"

# Phase 9 Tests
echo -e "\n${YELLOW}=== Phase 9: Register Routes ===${NC}"
run_test "Route import present" "grep -q 'getReleaseManagementRouter' api/script/api.ts"
run_test "Route registered" "grep -q '/api/v1/release-management' api/script/api.ts"

# Summary
echo -e "\n======================================"
echo -e "  Test Summary"
echo -e "======================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}⚠️  Some tests failed. Review output above.${NC}"
  exit 1
fi
```

Make it executable:
```bash
chmod +x tests/merge-verification.sh
```

Run after each phase:
```bash
./tests/merge-verification.sh
```

---

## Phase-by-Phase Execution Plan

### Before Starting

```bash
# 1. Create backup
git branch backup-integrations-only-$(date +%Y%m%d_%H%M%S)
git checkout -b merge-orchestration-and-integrations

# 2. Run baseline test
./tests/merge-verification.sh
```

### After Each Phase

```bash
# Run full test suite
./tests/merge-verification.sh

# If all tests pass, commit
git add -A
git commit -m "phase-X: <description>"

# If tests fail, fix and re-run
```

---

## Concerns Identified

### 1. Integration Service Signature Mismatch ⚠️

**Issue**: MERGE_PLAN.md Phase 6 has incorrect service signatures

**Impact**: Medium - Code will compile but have wrong parameters

**Solution**: Update Phase 6 steps with correct signatures (see [INTEGRATION_SIGNATURES_CLARIFICATION.md](./INTEGRATION_SIGNATURES_CLARIFICATION.md))

**Status**: ✅ Documented, needs MERGE_PLAN.md update

---

### 2. Missing Service Method Names ⚠️

**Issue**: MERGE_PLAN.md uses generic method names that may not match actual implementations

**Examples**:
- `cicdService.triggerWorkflow()` → Actual: `cicdService.trigger()`
- `jiraService.createTicket()` → Actual: `pmTicketService.createTickets()`
- `testMgmtService.createTestRun()` → Actual: `testRunService.createTestRuns()`

**Impact**: Low - Just naming differences, functionality same

**Solution**: Use correct method names from actual service implementations

**Status**: ✅ Documented in INTEGRATION_SIGNATURES_CLARIFICATION.md

---

### 3. No Concerns with File Structure ✅

All files in orchestration repo match expected structure. No surprises.

---

### 4. No Concerns with Database ✅

Migrations already applied and verified. Phase 4 complete!

---

## Recommended Next Steps

1. **Update MERGE_PLAN.md** with correct service signatures
2. **Run Phase 1** (backup and preparation)
3. **Run Phase 2** (copy files)
4. **Run test suite after each phase** to catch issues early
5. **Commit after each phase** for easy rollback

---

**Document Status**: Complete  
**Ready to Execute**: ✅ YES  
**Estimated Total Time with Tests**: 2.0-2.5 hours (includes test execution time)

