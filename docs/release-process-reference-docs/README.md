# Release Process Reference Documentation

This folder contains all reference documents for the Release Process UI implementation.

## Primary Documents

### 1. **RELEASE_PROCESS_API_CONTRACT.md** ⭐ (Primary API Contract)
- **Use this as the authoritative API contract**
- Contains all API endpoints, request/response structures
- Defines expected tasks for each stage (KICKOFF, REGRESSION, POST_REGRESSION)
- Task types and enums definitions
- Includes build management APIs (manual upload, TestFlight verification, artifacts listing)
- Includes status APIs (test management, project management, cherry pick status)
- Includes notification APIs and activity logs

### 2. **RELEASE_PROCESS_PLAN.md** (Main Implementation Plan)
- Complete implementation plan with phases
- Component architecture guidelines
- API routing strategy
- Implementation phases (Phase 1-5)

### 3. **RELEASE_STATUS_GUIDE.md** (Backend Status Guide)
- Backend implementation patterns for release status
- Phase-to-stage mapping
- Status transitions

### 4. **MANUAL_BUILD_UPLOAD_FLOW.md** (Build Upload Flow)
- Manual build upload implementation patterns
- Build upload workflow

### 5. **DISTRIBUTION_UI_FLOW_SPEC.md** (Distribution Flow)
- Distribution stage implementation patterns
- Distribution UI flow specifications

### 6. **RELEASE_PROCESS_FLOW.md** (Comprehensive Flow Guide)
- Complete understanding of release process flows, stages, transitions
- Decision points and state transitions
- Task execution flows and approval workflows

## Quick Reference

**For API Contract**: Use `RELEASE_PROCESS_API_CONTRACT.md`  
**For Implementation Plan**: Use `RELEASE_PROCESS_PLAN.md`  
**For Backend Patterns**: Use `RELEASE_STATUS_GUIDE.md`, `MANUAL_BUILD_UPLOAD_FLOW.md`, `DISTRIBUTION_UI_FLOW_SPEC.md`

## Archived Documents

Historical, deprecated, and duplicate documents have been moved to `docs/release-process-archive/`:

- **CLIENT_API_CONTRACT_UPDATED.md** - Deprecated (merged into RELEASE_PROCESS_API_CONTRACT.md)
- **MANUAL_BUILD_UPLOAD_API.md** - Duplicate (merged into RELEASE_PROCESS_API_CONTRACT.md)
- **MANUAL_BUILD_API.md** - Duplicate (merged into RELEASE_PROCESS_API_CONTRACT.md)
- **TEST_CASES_COMPREHENSIVE.md** - Historical test cases
- **RELEASE_PROCESS_IMPLEMENTATION_PLAN.md** - Old implementation plan (superseded by RELEASE_PROCESS_PLAN.md)
- **PHASE2_INTEGRATION_SUMMARY.md** - Historical phase summary
- **PHASE1_TESTING_GUIDE.md** - Historical testing guide
- **MOCK_RELEASE_UPDATE_SUMMARY.md** - Historical update summary
- **BACKEND_CONTRACT_UPDATE_SUMMARY.md** - Historical contract update
- **BACKEND_CONTRACT_ANALYSIS.md** - Historical analysis

## KICKOFF Stage Tasks (from RELEASE_PROCESS_API_CONTRACT.md)

According to the API contract, KICKOFF stage should have these 5 tasks:

1. `PRE_KICK_OFF_REMINDER` - Pre-kickoff reminder notification
2. `FORK_BRANCH` - Fork/create the release branch
3. `CREATE_PROJECT_MANAGEMENT_TICKET` - Create Jira/ticket in project management
4. `CREATE_TEST_SUITE` - Create test suite in test management
5. `TRIGGER_PRE_REGRESSION_BUILDS` - Trigger pre-regression builds

