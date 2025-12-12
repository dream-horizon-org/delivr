# Release Process Reference Documentation

This folder contains all reference documents for the Release Process UI implementation.

## Primary Documents

### 1. **CLIENT_API_CONTRACT.md** ⭐ (Primary API Contract)
- **Use this as the authoritative API contract**
- Contains all API endpoints, request/response structures
- Defines expected tasks for each stage (KICKOFF, REGRESSION, POST_REGRESSION)
- Task types and enums definitions

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

## Supporting Documents

### 6. **PHASE1_TESTING_GUIDE.md**
- Testing guide for Phase 1 infrastructure
- How to test API routing and mock server

### 12. **PHASE2_INTEGRATION_SUMMARY.md**
- Summary of Phase 2 component integration
- Integration patterns and data flow

## Quick Reference

**For API Contract**: Use `CLIENT_API_CONTRACT.md`  
**For Implementation Plan**: Use `RELEASE_PROCESS_PLAN.md`  
**For Backend Patterns**: Use `RELEASE_STATUS_GUIDE.md`, `MANUAL_BUILD_UPLOAD_FLOW.md`, `DISTRIBUTION_UI_FLOW_SPEC.md`

## KICKOFF Stage Tasks (from CLIENT_API_CONTRACT.md)

According to the API contract, KICKOFF stage should have these 5 tasks:

1. `PRE_KICK_OFF_REMINDER` - Pre-kickoff reminder notification
2. `FORK_BRANCH` - Fork/create the release branch
3. `CREATE_PROJECT_MANAGEMENT_TICKET` - Create Jira/ticket in project management
4. `CREATE_TEST_SUITE` - Create test suite in test management
5. `TRIGGER_PRE_REGRESSION_BUILDS` - Trigger pre-regression builds

