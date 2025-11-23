#!/bin/bash

# Merge Verification Test Suite
# Comprehensive tests for each phase of the orchestration + integrations merge
# Usage: ./tests/merge-verification.sh [phase_number]
#   - Run all tests: ./tests/merge-verification.sh
#   - Run specific phase: ./tests/merge-verification.sh 6

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0
PHASE_PASSED=0
PHASE_FAILED=0

# Phase to run (all if not specified)
TARGET_PHASE=${1:-"all"}

run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -e "\n${BLUE}Running: $test_name${NC}"
  
  if eval "$test_command" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
    ((PHASE_PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
    ((PHASE_FAILED++))
    return 1
  fi
}

should_run_phase() {
  local phase=$1
  if [ "$TARGET_PHASE" = "all" ] || [ "$TARGET_PHASE" = "$phase" ]; then
    return 0
  else
    return 1
  fi
}

echo "======================================"
echo "  Merge Verification Test Suite"
echo "======================================"
echo ""
echo "Target Phase: ${TARGET_PHASE}"
echo ""

# ============================================================================
# Phase 1: Backup and Preparation
# ============================================================================
if should_run_phase 1; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 1: Backup and Preparation ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  run_test "1.1: Backup branch exists" \
    "git branch | grep -q 'backup-integrations-only'"

  run_test "1.2: Merge branch exists and active" \
    "git branch | grep -q '* merge-orchestration-and-integrations'"

  run_test "1.3: Working directory clean" \
    "git status | grep -q 'working tree clean'"

  echo -e "\n${BLUE}Phase 1 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Phase 2: Copy Orchestration Files
# ============================================================================
if should_run_phase 2; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 2: Copy Orchestration Files ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  run_test "2.1: Cron job routes copied" \
    "test -f api/script/routes/release/kickoff-cron-job.ts && \
     test -f api/script/routes/release/regression-cron-job.ts && \
     test -f api/script/routes/release/post-regression-cron-job.ts && \
     test -f api/script/routes/release/release-types.ts"

  run_test "2.2: Services copied" \
    "test -f api/script/services/cron-lock-service.ts && \
     test -f api/script/services/cron-scheduler.ts && \
     test -f api/script/services/integration-mocks.ts && \
     test -f api/script/services/task-executor.ts"

  run_test "2.3: Storage layer copied" \
    "test -f api/script/storage/release/cron-job-dto.ts && \
     test -f api/script/storage/release/regression-cycle-dto.ts && \
     test -f api/script/storage/release/release-dto.ts && \
     test -f api/script/storage/release/release-models.ts && \
     test -f api/script/storage/release/release-tasks-dto.ts"

  run_test "2.4: Utils copied" \
    "test -f api/script/utils/regression-cycle-creation.ts && \
     test -f api/script/utils/task-creation.ts && \
     test -f api/script/utils/task-sequencing.ts && \
     test -f api/script/utils/time-utils.ts"

  run_test "2.5: Integration interfaces NOT copied (skipped as planned)" \
    "! test -f api/script/routes/release/integrations/scm-integration.interface.ts"

  # Count TypeScript files
  FILE_COUNT=$(find api/script/routes/release api/script/services api/script/storage/release api/script/utils \
    -type f -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
  echo -e "\n${BLUE}📊 Total TypeScript files after copy: $FILE_COUNT${NC}"

  echo -e "\n${BLUE}Phase 2 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Phase 3: Merge release-management.ts
# ============================================================================
if should_run_phase 3; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 3: Merge release-management.ts ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  run_test "3.1: Backup created" \
    "test -f api/script/routes/release-management.ts.integrations-backup"

  run_test "3.2: Orchestration code present (executeKickoffCronJob)" \
    "grep -q 'executeKickoffCronJob' api/script/routes/release-management.ts"

  run_test "3.3: Orchestration code present (Stage comments)" \
    "grep -q 'Stage 1' api/script/routes/release-management.ts && \
     grep -q 'Stage 2' api/script/routes/release-management.ts && \
     grep -q 'Stage 3' api/script/routes/release-management.ts"

  # Check file size increased
  if [ -f api/script/routes/release-management.ts.integrations-backup ]; then
    OLD_SIZE=$(wc -l < api/script/routes/release-management.ts.integrations-backup)
    NEW_SIZE=$(wc -l < api/script/routes/release-management.ts)
    if [ "$NEW_SIZE" -gt "$OLD_SIZE" ]; then
      echo -e "${GREEN}✅ File size increased: $OLD_SIZE → $NEW_SIZE lines${NC}"
      ((PASSED++))
      ((PHASE_PASSED++))
    else
      echo -e "${RED}❌ File size did not increase${NC}"
      ((FAILED++))
      ((PHASE_FAILED++))
    fi
  fi

  echo -e "\n${BLUE}Phase 3 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Phase 4: Database Migration (Already Complete!)
# ============================================================================
if should_run_phase 4; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 4: Database Migration ===${NC}"
  echo -e "${YELLOW}=== (Already Complete - Verification) ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  run_test "4.1: Database accessible" \
    "docker exec -i api-db-1 mysql -u root -proot codepushdb -e 'SELECT 1' > /dev/null 2>&1"

  run_test "4.2: Orchestration columns exist in releases table" \
    "docker exec -i api-db-1 mysql -u root -proot codepushdb -e \
     \"SELECT COUNT(*) as count FROM information_schema.COLUMNS \
      WHERE TABLE_SCHEMA = 'codepushdb' AND TABLE_NAME = 'releases' \
      AND COLUMN_NAME IN ('stageData', 'customIntegrationConfigs', 'preCreatedBuilds', 'releaseConfigId')\" \
     | grep -q '4'"

  run_test "4.3: release_tasks columns exist" \
    "docker exec -i api-db-1 mysql -u root -proot codepushdb -e \
     \"SELECT COUNT(*) as count FROM information_schema.COLUMNS \
      WHERE TABLE_SCHEMA = 'codepushdb' AND TABLE_NAME = 'release_tasks' \
      AND COLUMN_NAME IN ('stage', 'externalId', 'externalData')\" \
     | grep -q '3'"

  run_test "4.4: cron_jobs table exists" \
    "docker exec -i api-db-1 mysql -u root -proot codepushdb -e \"SHOW TABLES LIKE 'cron_jobs'\" \
     | grep -q 'cron_jobs'"

  echo -e "\n${BLUE}Phase 4 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Phase 5: Build and Fix TypeScript Errors
# ============================================================================
if should_run_phase 5; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 5: Build and Fix TypeScript Errors ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  run_test "5.1: TypeScript build succeeds" \
    "cd api && npm run build > /dev/null 2>&1"

  run_test "5.2: Build output (bin/) created" \
    "test -d api/bin"

  run_test "5.3: No missing imports in build" \
    "cd api && npm run build 2>&1 | grep -qv 'Cannot find module'"

  echo -e "\n${BLUE}Phase 5 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Phase 6: Update TaskExecutor for Dependency Injection
# ============================================================================
if should_run_phase 6; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 6: TaskExecutor DI ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  run_test "6.1: TaskExecutor constructor has DI (scmService)" \
    "grep -A 10 'constructor(' api/script/services/task-executor.ts | grep -q 'private scmService'"

  run_test "6.2: TaskExecutor constructor has DI (cicdService)" \
    "grep -A 10 'constructor(' api/script/services/task-executor.ts | grep -q 'private cicdService'"

  run_test "6.3: TaskExecutor constructor has DI (releaseConfigRepo)" \
    "grep -A 10 'constructor(' api/script/services/task-executor.ts | grep -q 'private releaseConfigRepo'"

  run_test "6.4: executeTask no longer accepts integrations parameter" \
    "grep -A 3 'executeTask(' api/script/services/task-executor.ts | grep -qv 'integrations:'"

  run_test "6.5: getReleaseConfig helper present" \
    "grep -q 'getReleaseConfig' api/script/services/task-executor.ts"

  run_test "6.6: SCM calls use tenantId" \
    "grep -A 5 'this.scmService' api/script/services/task-executor.ts | grep -q 'release.tenantId'"

  run_test "6.7: IntegrationInstances interface removed or commented" \
    "! grep -q 'export interface IntegrationInstances' api/script/services/task-executor.ts || \
     grep -q '// export interface IntegrationInstances' api/script/services/task-executor.ts"

  run_test "6.8: Build succeeds after TaskExecutor DI" \
    "cd api && npm run build > /dev/null 2>&1"

  echo -e "\n${BLUE}Phase 6 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Phase 7: Update Cron Jobs to Inject Services
# ============================================================================
if should_run_phase 7; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 7: Update Cron Jobs ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  run_test "7.1: kickoff-cron-job.ts injects scmService" \
    "grep -A 20 'const taskExecutor = new TaskExecutor' api/script/routes/release/kickoff-cron-job.ts | grep -q 'scmService'"

  run_test "7.2: kickoff-cron-job.ts injects releaseConfigRepo" \
    "grep -A 20 'const taskExecutor = new TaskExecutor' api/script/routes/release/kickoff-cron-job.ts | grep -q 'releaseConfigRepo'"

  run_test "7.3: regression-cron-job.ts injects services" \
    "grep -A 20 'const taskExecutor = new TaskExecutor' api/script/routes/release/regression-cron-job.ts | grep -q 'scmService'"

  run_test "7.4: post-regression-cron-job.ts injects services" \
    "grep -A 20 'const taskExecutor = new TaskExecutor' api/script/routes/release/post-regression-cron-job.ts | grep -q 'scmService'"

  run_test "7.5: getMockIntegrations() removed from all cron jobs" \
    "! grep -q 'getMockIntegrations()' api/script/routes/release/kickoff-cron-job.ts && \
     ! grep -q 'getMockIntegrations()' api/script/routes/release/regression-cron-job.ts && \
     ! grep -q 'getMockIntegrations()' api/script/routes/release/post-regression-cron-job.ts"

  run_test "7.6: Build succeeds after cron job DI" \
    "cd api && npm run build > /dev/null 2>&1"

  echo -e "\n${BLUE}Phase 7 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Phase 8: Verify Integration Service Signatures
# ============================================================================
if should_run_phase 8; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 8: Verify Service Signatures ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  run_test "8.1: CI/CD service has trigger method" \
    "grep -q 'trigger.*async.*tenantId' api/script/services/integrations/ci-cd/workflows/github-actions-workflow.service.ts || \
     grep -q 'trigger.*async.*tenantId' api/script/services/integrations/ci-cd/workflows/jenkins-workflow.service.ts"

  run_test "8.2: Project Management service has createTickets method" \
    "grep -q 'createTickets' api/script/services/integrations/project-management/ticket/ticket.service.ts"

  run_test "8.3: Test Management service has createTestRuns method" \
    "grep -q 'createTestRuns' api/script/services/integrations/test-management/test-run/test-run.service.ts"

  run_test "8.4: SCM service has forkOutBranch method with tenantId" \
    "grep -A 5 'forkOutBranch' api/script/services/integrations/scm/scm.service.ts | grep -q 'tenantId'"

  echo -e "\n${BLUE}Phase 8 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Phase 9: Register Orchestration Routes
# ============================================================================
if should_run_phase 9; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 9: Register Routes ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  run_test "9.1: Route import present in api.ts" \
    "grep -q 'getReleaseManagementRouter' api/script/api.ts"

  run_test "9.2: Route registered with /api/v1/release-management" \
    "grep -q '/api/v1/release-management' api/script/api.ts"

  run_test "9.3: Route receives storage parameter" \
    "grep -A 2 'getReleaseManagementRouter' api/script/api.ts | grep -q 'storage'"

  run_test "9.4: Build succeeds after route registration" \
    "cd api && npm run build > /dev/null 2>&1"

  echo -e "\n${BLUE}Phase 9 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Phase 10: Test and Verify
# ============================================================================
if should_run_phase 10; then
  echo -e "\n${YELLOW}==================================${NC}"
  echo -e "${YELLOW}=== Phase 10: Test and Verify ===${NC}"
  echo -e "${YELLOW}==================================${NC}"
  PHASE_PASSED=0
  PHASE_FAILED=0

  # Start server in background
  echo -e "${BLUE}Starting server...${NC}"
  cd api && npm start > /tmp/merge-test-server.log 2>&1 &
  SERVER_PID=$!
  sleep 10  # Wait for server to start

  run_test "10.1: Health endpoint responds" \
    "curl -f http://localhost:3000/api/v1/release-management/health 2>/dev/null"

  # Test release endpoint (expect 401 or 400, not 500)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    http://localhost:3000/api/v1/release-management/tenants/test-tenant/releases \
    -H "Content-Type: application/json" \
    -d '{"version":"1.0.0","type":"PLANNED"}' 2>/dev/null)

  if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✅ Release endpoint exists (response code: $HTTP_CODE)${NC}"
    ((PASSED++))
    ((PHASE_PASSED++))
  else
    echo -e "${RED}❌ Unexpected response code: $HTTP_CODE${NC}"
    ((FAILED++))
    ((PHASE_FAILED++))
  fi

  run_test "10.3: Database tables accessible" \
    "docker exec -i api-db-1 mysql -u root -proot codepushdb -e \
     \"SELECT table_name FROM information_schema.tables \
      WHERE table_schema = 'codepushdb' \
      AND table_name IN ('releases', 'release_tasks', 'cron_jobs', 'regression_cycles', 'builds')\" \
     | grep -q 'releases'"

  # Stop server
  echo -e "${BLUE}Stopping server...${NC}"
  kill $SERVER_PID 2>/dev/null || true

  echo -e "\n${BLUE}Phase 10 Summary: ${GREEN}$PHASE_PASSED passed${NC}, ${RED}$PHASE_FAILED failed${NC}"
fi

# ============================================================================
# Summary
# ============================================================================
echo -e "\n======================================"
echo -e "  Test Summary"
echo -e "======================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Total:  $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}⚠️  Some tests failed. Review output above.${NC}"
  exit 1
fi

