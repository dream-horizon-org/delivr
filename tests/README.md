# Merge Verification Tests

Automated test suite for validating each phase of the orchestration + integrations merge.

## Quick Start

```bash
# Run all tests
./tests/merge-verification.sh

# Run specific phase
./tests/merge-verification.sh 6

# Run multiple phases (bash loop)
for phase in 1 2 3; do ./tests/merge-verification.sh $phase; done
```

## Test Coverage

| Phase | Tests | Description |
|-------|-------|-------------|
| Phase 1 | 3 tests | Backup and preparation |
| Phase 2 | 5 tests | Copy orchestration files |
| Phase 3 | 4 tests | Merge release-management.ts |
| Phase 4 | 4 tests | Database verification (already complete!) |
| Phase 5 | 3 tests | Build success |
| Phase 6 | 8 tests | TaskExecutor dependency injection |
| Phase 7 | 6 tests | Cron job updates |
| Phase 8 | 4 tests | Service signature verification |
| Phase 9 | 4 tests | Route registration |
| Phase 10 | 3 tests | End-to-end verification |

**Total: 44 automated tests**

## Usage Examples

### After Completing Phase 2 (Copy Files)

```bash
# Run Phase 2 tests only
./tests/merge-verification.sh 2

# Expected output:
# ==================================
# === Phase 2: Copy Orchestration Files ===
# ==================================
# ✅ 2.1: Cron job routes copied
# ✅ 2.2: Services copied
# ✅ 2.3: Storage layer copied
# ✅ 2.4: Utils copied
# ✅ 2.5: Integration interfaces NOT copied
# Phase 2 Summary: 5 passed, 0 failed
```

### After Completing Phase 6 (TaskExecutor DI)

```bash
# Run Phase 6 tests
./tests/merge-verification.sh 6

# If tests pass, update MERGE_PLAN.md
# Change: | **Phase 6** | ⏸️ Not Started | - | Update TaskExecutor for DI |
# To:     | **Phase 6** | ✅ **COMPLETE** | 2025-11-22 | Update TaskExecutor for DI |
```

### Run All Tests (Final Verification)

```bash
# Run complete test suite
./tests/merge-verification.sh

# Expected: All 44 tests pass ✅
```

## Test Output

### Success (Green)
```
✅ PASSED
```

### Failure (Red)
```
❌ FAILED
```

### Summary
```
====================================
  Test Summary
====================================
Passed: 42
Failed: 2
Total:  44

⚠️  Some tests failed. Review output above.
```

## Recommended Workflow

1. **Before Starting Phase N**:
   - Review MERGE_PLAN.md Phase N steps
   - Understand what changes are needed

2. **During Phase N**:
   - Make changes as documented
   - Run quick manual checks

3. **After Completing Phase N**:
   ```bash
   # Run phase tests
   ./tests/merge-verification.sh N
   
   # If all pass, commit
   git add -A
   git commit -m "phase-N: <description>"
   
   # Update MERGE_PLAN.md status
   # Change status from ⏸️ to ✅ COMPLETE
   ```

4. **If Tests Fail**:
   - Review test output for specific failures
   - Fix issues
   - Re-run tests
   - Repeat until all tests pass

## Individual Test Categories

### Phase 1: Backup Tests
- Backup branch exists
- Merge branch active
- Working directory clean

### Phase 2: File Copy Tests
- All cron job routes copied
- All services copied
- All storage files copied
- All utils copied
- Integration interfaces NOT copied (intentional skip)

### Phase 3: release-management.ts Tests
- Backup created
- Orchestration code present
- File size increased

### Phase 4: Database Tests (Verification)
- Database accessible
- Orchestration columns exist (releases)
- Task columns exist (release_tasks)
- cron_jobs table exists

### Phase 5: Build Tests
- TypeScript build succeeds
- Build output created
- No missing imports

### Phase 6: TaskExecutor Tests
- Constructor has DI parameters
- executeTask signature updated
- getReleaseConfig helper present
- SCM calls use tenantId
- IntegrationInstances removed
- Build succeeds

### Phase 7: Cron Job Tests
- All cron jobs inject services
- getMockIntegrations removed
- Build succeeds

### Phase 8: Service Signature Tests
- CI/CD service signature correct
- Project Management signature correct
- Test Management signature correct
- SCM service signature correct

### Phase 9: Route Tests
- Route import present
- Route registered
- Route receives storage
- Build succeeds

### Phase 10: End-to-End Tests
- Server starts
- Health endpoint responds
- Release endpoint exists
- Database tables accessible

## Troubleshooting

### Test Fails: "command not found"
```bash
# Make script executable
chmod +x tests/merge-verification.sh
```

### Test Fails: "docker: command not found"
- Ensure Docker is running
- Verify database container is up: `docker ps | grep api-db-1`

### Test Fails: "mysql: connection refused"
```bash
# Check database status
docker exec -i api-db-1 mysql -u root -proot -e "SELECT 1"

# Restart database if needed
docker restart api-db-1
```

### Test Fails: "npm: command not found" (Phase 5+)
```bash
# Ensure you're in api directory for npm commands
cd api && npm run build
```

### All Phase 6 Tests Fail
- Likely haven't completed Phase 6 implementation yet
- Review MERGE_PLAN.md Phase 6 steps
- Implement TaskExecutor DI first

## Exit Codes

- `0` = All tests passed ✅
- `1` = One or more tests failed ❌

## Notes

- Tests are **non-destructive** (read-only except for Phase 10 server start)
- Phase 4 tests are **verification only** (database already migrated)
- Phase 10 starts a temporary server and stops it after tests
- Tests output is colorized for easy scanning

## Related Documents

- [MERGE_PLAN.md](../MERGE_PLAN.md) - Single source of truth for merge
- [MERGE_TESTING_STRATEGY.md](../MERGE_TESTING_STRATEGY.md) - Detailed testing documentation
- [INTEGRATION_SIGNATURES_CLARIFICATION.md](../INTEGRATION_SIGNATURES_CLARIFICATION.md) - Service signatures

---

**Last Updated**: 2025-11-22  
**Total Tests**: 44  
**Estimated Run Time**: 2-3 minutes (all phases), 5-10 seconds (single phase)

