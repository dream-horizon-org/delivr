# Release Process Flow - Comprehensive Guide

> **Last Updated:** 2024-12-XX  
> **Version:** 1.0  
> **Purpose:** Complete understanding of release process flows, stages, transitions, and decision points

---

## Table of Contents

1. [Overview](#overview)
2. [Release Lifecycle Phases](#release-lifecycle-phases)
3. [Stage 1: Kickoff](#stage-1-kickoff)
4. [Stage 2: Regression](#stage-2-regression)
5. [Stage 3: Post-Regression (Pre-Release)](#stage-3-post-regression-pre-release)
6. [Stage 4: Distribution (Submission)](#stage-4-distribution-submission)
7. [Build Upload Flows](#build-upload-flows)
8. [Task Execution Flows](#task-execution-flows)
9. [Approval Workflows](#approval-workflows)
10. [State Transitions](#state-transitions)
11. [Decision Points](#decision-points)

---

## Overview

The Release Process is a multi-stage workflow that orchestrates the creation, testing, and distribution of software releases. It consists of 4 main stages:

1. **Kickoff** - Initial setup and pre-regression builds
2. **Regression** - Multiple testing cycles with builds
3. **Post-Regression** - Pre-release builds and finalization
4. **Distribution** - Submission to app stores

### Key Concepts

- **Manual Mode** (`hasManualBuildUpload: true`): Users manually upload build artifacts
- **CI/CD Mode** (`hasManualBuildUpload: false`): Builds triggered automatically via CI/CD pipelines
- **Regression Cycles**: Multiple testing cycles within the Regression stage
- **Staging Table**: `release_uploads` table for unconsumed builds
- **Builds Table**: `builds` table for consumed builds linked to tasks

---

## Release Lifecycle Phases

### Phase Enum

```typescript
type Phase =
  | 'NOT_STARTED'                    // Release created, not started
  | 'KICKOFF'                        // Stage 1 running
  | 'AWAITING_REGRESSION'            // Stage 1 complete, waiting for Stage 2 trigger
  | 'REGRESSION'                     // Stage 2 running (current cycle active)
  | 'REGRESSION_AWAITING_NEXT_CYCLE' // Between regression cycles
  | 'AWAITING_POST_REGRESSION'       // Stage 2 complete, waiting for Stage 3 trigger
  | 'POST_REGRESSION'                // Stage 3 running
  | 'AWAITING_SUBMISSION'            // Stage 3 complete, waiting for Stage 4 trigger
  | 'SUBMISSION'                     // Stage 4 running, release IN_PROGRESS
  | 'SUBMITTED_PENDING_APPROVAL'     // Stage 4 running, release SUBMITTED
  | 'COMPLETED'                      // All stages complete
  | 'PAUSED_BY_USER'                 // User paused release
  | 'PAUSED_BY_FAILURE'              // Task failure paused release
  | 'ARCHIVED';                      // Release cancelled
```

### Phase Flow Diagram

```
NOT_STARTED
    ↓
KICKOFF (Stage 1)
    ↓
AWAITING_REGRESSION
    ↓
REGRESSION (Stage 2) ←→ REGRESSION_AWAITING_NEXT_CYCLE (multiple cycles)
    ↓
AWAITING_POST_REGRESSION
    ↓
POST_REGRESSION (Stage 3)
    ↓
AWAITING_SUBMISSION
    ↓
SUBMISSION (Stage 4)
    ↓
SUBMITTED_PENDING_APPROVAL
    ↓
COMPLETED
```

**Pause States** (can occur at any stage):
- `PAUSED_BY_USER` - User manually paused
- `PAUSED_BY_FAILURE` - Critical task failed

---

## Stage 1: Kickoff

### Purpose
Initialize the release by forking the branch, creating project management tickets, setting up test suites, and preparing pre-regression builds.

### Tasks (4 tasks)

1. **FORK_BRANCH**
   - Creates release branch from base branch
   - Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - External Data: `{ branch: string }`

2. **CREATE_PROJECT_MANAGEMENT_TICKET**
   - Creates Jira ticket (or equivalent)
   - Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - External Data: `{ ticketId: string, ticketUrl: string }`
   - Can run in parallel with FORK_BRANCH

3. **CREATE_TEST_SUITE**
   - Creates test suite in Test Management system
   - Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - External Data: `{ testSuiteId: string, testSuiteUrl: string }`
   - Can run in parallel with FORK_BRANCH

4. **TRIGGER_PRE_REGRESSION_BUILDS**
   - **Manual Mode**: Waits for user to upload builds → `AWAITING_MANUAL_BUILD`
   - **CI/CD Mode**: Triggers CI/CD pipeline → `AWAITING_CALLBACK`
   - Status: `PENDING` → `AWAITING_MANUAL_BUILD` / `AWAITING_CALLBACK` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - Builds: Creates `builds` entries when completed
   - **Dependency**: Waits for FORK_BRANCH to complete

### Stage Status Flow

```
PENDING
    ↓ (when first task starts)
IN_PROGRESS
    ↓ (when all tasks complete)
COMPLETED
```

### Build Upload Flow (Manual Mode)

1. **User uploads build** → `PUT /stages/KICK_OFF/builds/{platform}`
   - File stored in S3
   - Entry created in `release_uploads` staging table
   - `isUsed: false`, `usedByTaskId: null`

2. **Task checks staging table** (on cron tick)
   - If all platforms uploaded → Task status: `COMPLETED`
   - If missing platforms → Task status: `AWAITING_MANUAL_BUILD`
   - Consumes staging entries: `isUsed: true`, `usedByTaskId: taskId`
   - Creates entries in `builds` table

3. **Builds available in task** → `task.builds: BuildInfo[]`
   - Contains `artifactPath` for download links
   - Grouped by platform

### CI/CD Build Flow

1. **Task triggers CI/CD** → Status: `AWAITING_CALLBACK`
   - Creates build entries in `builds` table
   - `workflowStatus: RUNNING`, `buildUploadStatus: PENDING`

2. **CI/CD callback received** → Status: `IN_PROGRESS` → `COMPLETED`
   - Updates `workflowStatus: COMPLETED`, `buildUploadStatus: UPLOADED`
   - Sets `artifactPath` with S3 URL

3. **If callback fails** → Status: `FAILED`
   - `workflowStatus: FAILED`, `buildUploadStatus: FAILED`
   - Retry option available

### Stage Completion

- **Auto-transition**: If `autoTransitionToStage2: true` → Automatically starts Regression
- **Manual transition**: If `autoTransitionToStage2: false` → User must trigger manually
- **Phase change**: `KICKOFF` → `AWAITING_REGRESSION` → `REGRESSION`

---

## Stage 2: Regression

### Purpose
Execute multiple regression testing cycles, each with builds, test suite resets, RC tags, and release notes.

### Key Concepts

- **Regression Cycles**: Multiple testing cycles within one Regression stage
- **Regression Slots**: Scheduled times for regression cycles
- **Current Cycle**: The active cycle (`status: IN_PROGRESS`)
- **Upcoming Slot**: Next scheduled regression cycle
- **Approval**: Required before transitioning to Post-Regression

### Tasks (4 tasks per cycle)

1. **RESET_TEST_SUITE** (only for subsequent cycles, not first)
   - Resets test suite for new cycle
   - Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`

2. **CREATE_RC_TAG**
   - Creates RC tag (e.g., "RC1", "RC2")
   - Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - External Data: `{ tag: string, tagUrl: string }`

3. **CREATE_RELEASE_NOTES**
   - Creates release notes for the cycle
   - Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - External Data: `{ releaseNotesId: string }`

4. **TRIGGER_REGRESSION_BUILDS**
   - **Manual Mode**: Waits for user uploads → `AWAITING_MANUAL_BUILD`
   - **CI/CD Mode**: Triggers CI/CD → `AWAITING_CALLBACK`
   - Status: `PENDING` → `AWAITING_MANUAL_BUILD` / `AWAITING_CALLBACK` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - Builds: Linked to cycle via `regressionId`

### Cycle Lifecycle

```
NOT_STARTED (slot scheduled)
    ↓ (when slot time arrives)
IN_PROGRESS (tasks executing)
    ↓ (when all tasks complete)
DONE
    ↓ (or)
ABANDONED (user abandons cycle)
```

### Build Upload Flow (Manual Mode - Regression)

1. **Upcoming Slot Scenario**
   - User uploads builds before cycle starts
   - Entry in `release_uploads` staging table
   - `regressionId: null`, `isUsed: false`

2. **Cycle Starts**
   - Tasks created for the cycle
   - `TRIGGER_REGRESSION_BUILDS` task checks staging table
   - If builds found → Consumes them, sets `regressionId: cycleId`
   - If missing → Task status: `AWAITING_MANUAL_BUILD`

3. **Active Cycle Scenario**
   - If cycle is `IN_PROGRESS` → No upload widgets shown
   - Builds must be uploaded before cycle starts (upcoming slot)

4. **Builds in Cycle**
   - Builds linked to cycle via `regressionId`
   - Available in `availableBuilds` array in regression stage response
   - Displayed in cycle card

### CI/CD Build Flow (Regression)

1. **Task triggers CI/CD** → Status: `AWAITING_CALLBACK`
   - Creates build entries with `regressionId: cycleId`
   - `workflowStatus: RUNNING`

2. **CI/CD callback** → Status: `COMPLETED`
   - Updates build status
   - Builds visible in cycle

3. **Failed builds** → Status: `FAILED`
   - Retry option available
   - Can retry individual platform builds

### Approval Requirements

Before approving Regression stage, all requirements must be met:

1. **Test Management Passed**
   - Test run threshold passed
   - Checked via: `GET /test-management-run-status`
   - Status: `'PASSED'` required

2. **Cherry Pick Status OK**
   - No new cherry picks found
   - Branch HEAD matches latest regression cycle tag
   - Checked via: `GET /check-cherry-pick-status`
   - `cherryPickAvailable: false` required

3. **Cycles Completed**
   - No active cycles (`IN_PROGRESS` or `NOT_STARTED`)
   - No upcoming slots remaining
   - All cycles must be `DONE` or `ABANDONED`

### Approval Flow

1. **User clicks "Approve Regression"** → `POST /trigger-pre-release`
   - Validates all requirements
   - If `forceApprove: true` → Skips validation

2. **Approval succeeds**
   - Updates `stage2Status: COMPLETED`
   - Sets `autoTransitionToStage3: true`
   - Starts Stage 3 (Post-Regression)
   - Phase: `AWAITING_POST_REGRESSION` → `POST_REGRESSION`

3. **Response**
   ```json
   {
     "success": true,
     "message": "Regression stage approved and Post-Regression stage triggered successfully",
     "releaseId": "uuid",
     "approvedAt": "2024-12-20T10:00:00Z",
     "approvedBy": "account-id",
     "nextStage": "POST_REGRESSION"
   }
   ```

---

## Stage 3: Post-Regression (Pre-Release)

### Purpose
Create final release builds (TestFlight for iOS, AAB for Android), create release tags, and finalize release notes before distribution.

### Tasks (4 tasks)

1. **TRIGGER_TEST_FLIGHT_BUILD** (iOS only)
   - **Manual Mode**: User verifies TestFlight build → `POST /verify-testflight`
   - **CI/CD Mode**: Triggers CI/CD → `AWAITING_CALLBACK`
   - Status: `PENDING` → `AWAITING_MANUAL_BUILD` / `AWAITING_CALLBACK` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - Builds: Contains `testflightNumber` for TestFlight link

2. **CREATE_AAB_BUILD** (Android only)
   - **Manual Mode**: User uploads AAB → `PUT /stages/PRE_RELEASE/builds/ANDROID`
   - **CI/CD Mode**: Triggers CI/CD → `AWAITING_CALLBACK`
   - Status: `PENDING` → `AWAITING_MANUAL_BUILD` / `AWAITING_CALLBACK` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - Builds: Contains `internalTrackLink` for Play Store Internal Track

3. **CREATE_RELEASE_TAG**
   - Creates final release tag (e.g., "v1.0.0")
   - Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - External Data: `{ tag: string, tagUrl: string }`

4. **CREATE_FINAL_RELEASE_NOTES**
   - Creates final release notes
   - Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
   - External Data: `{ releaseNotesId: string }`

### TestFlight Verification Flow (Manual Mode)

1. **User uploads to TestFlight** (outside system)
   - Uploads build to App Store Connect manually

2. **User verifies in system** → `POST /stages/PRE_RELEASE/builds/ios/verify-testflight`
   - Request: `{ testflightBuildNumber: "12345", versionName: "1.2.3" }`
   - System verifies via App Store Connect API
   - Creates entry in `release_uploads` staging table
   - `testflightNumber: "12345"`, `artifactPath: null` (in TestFlight, not S3)

3. **Task consumes staging entry**
   - Marks staging entry as used
   - Creates entry in `builds` table
   - Task status: `COMPLETED`
   - Build contains `testflightNumber` for link generation

### AAB Upload Flow (Manual Mode)

1. **User uploads AAB** → `PUT /stages/PRE_RELEASE/builds/ANDROID`
   - File stored in S3
   - Entry in `release_uploads` staging table

2. **Task consumes staging entry**
   - Creates entry in `builds` table
   - May include `internalTrackLink` if Play Store integration configured
   - Task status: `COMPLETED`

### Build Display (Post-Regression)

- **iOS TestFlight**: Shows clickable link using `testflightNumber`
  - Link: `https://appstoreconnect.apple.com/testflight/builds/{testflightNumber}`
- **Android Internal Track**: Shows clickable link using `internalTrackLink`
  - Link: Direct Play Store Internal Track URL

### Project Management Approval

- **PM Status Check**: `GET /project-management-run-status`
  - Returns approval status per platform
  - `approved: boolean` indicates if PM approval granted

- **Approval Flow**:
  - If `approved: false` → User must request approval
  - If `approved: true` → Ready for stage completion

### Stage Completion

- **User triggers completion** → `POST /stages/post-regression/complete`
  - Validates all tasks completed
  - Validates PM approval (if required)
  - Transitions to Stage 4 (Distribution)
  - Phase: `POST_REGRESSION` → `AWAITING_SUBMISSION` → `SUBMISSION`

---

## Stage 4: Distribution (Submission)

### Purpose
Submit the release to app stores (Play Store, App Store) for distribution.

### Tasks

- **SUBMIT_TO_TARGET**: Submits release to configured app stores
  - Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`
  - External Data: `{ submissionId: string, storeLinks: {...} }`

### Submission Flow

1. **User triggers submission** → `POST /submission/submit`
   - Validates all prerequisites
   - Submits to stores via integrations

2. **Submission in progress**
   - Release status: `SUBMITTED`
   - Phase: `SUBMITTED_PENDING_APPROVAL`
   - Waiting for store approval

3. **Store approval**
   - Release status: `COMPLETED`
   - Phase: `COMPLETED`
   - Release date set

---

## Build Upload Flows

### Manual Build Upload Flow

```
User selects file
    ↓
PUT /stages/{stage}/builds/{platform}
    ↓
File uploaded to S3
    ↓
Entry created in release_uploads (staging table)
    - isUsed: false
    - usedByTaskId: null
    - regressionId: null (or cycleId for regression)
    ↓
Task checks staging table (on cron tick)
    ↓
If all platforms ready:
    - Marks staging entries: isUsed: true
    - Sets usedByTaskId: taskId
    - Creates entries in builds table
    - Task status: COMPLETED
Else:
    - Task status: AWAITING_MANUAL_BUILD
    - Sends Slack notification (once)
```

### CI/CD Build Flow

```
Task triggers CI/CD
    ↓
Task status: AWAITING_CALLBACK
    ↓
Build entries created in builds table
    - workflowStatus: RUNNING
    - buildUploadStatus: PENDING
    ↓
CI/CD pipeline executes
    ↓
CI/CD callback received
    ↓
Build entries updated
    - workflowStatus: COMPLETED
    - buildUploadStatus: UPLOADED
    - artifactPath: s3://...
    ↓
Task status: COMPLETED
```

### TestFlight Verification Flow

```
User uploads to TestFlight (outside system)
    ↓
User verifies in system
POST /stages/PRE_RELEASE/builds/ios/verify-testflight
    ↓
System verifies via App Store Connect API
    ↓
Entry created in release_uploads (staging table)
    - testflightNumber: "12345"
    - artifactPath: null (in TestFlight, not S3)
    - isUsed: false
    ↓
Task consumes staging entry
    ↓
Entry created in builds table
    - testflightNumber: "12345"
    - storeType: TESTFLIGHT
    - Task status: COMPLETED
```

---

## Task Execution Flows

### Task Status Flow

```
PENDING
    ↓ (when cron picks up task)
IN_PROGRESS
    ↓
COMPLETED / FAILED / SKIPPED
```

### Build Task Status Flow (Manual Mode)

```
PENDING
    ↓
AWAITING_MANUAL_BUILD (waiting for uploads)
    ↓ (when all platforms uploaded)
IN_PROGRESS (consuming staging entries)
    ↓
COMPLETED
```

### Build Task Status Flow (CI/CD Mode)

```
PENDING
    ↓
AWAITING_CALLBACK (CI/CD triggered)
    ↓ (when callback received)
IN_PROGRESS
    ↓
COMPLETED / FAILED
```

### Task Retry Flow

```
Task status: FAILED
    ↓
User clicks "Retry"
POST /tasks/{taskId}/retry
    ↓
Task status reset: PENDING
    ↓
Cron picks up task on next tick
    ↓
Task re-executes
```

---

## Approval Workflows

### Regression Approval

**Requirements:**
1. Test Management: `status === 'PASSED'`
2. Cherry Pick Status: `cherryPickAvailable === false`
3. Cycles Completed: No active cycles, no upcoming slots

**Flow:**
```
Check requirements
    ↓
If all met:
    - canApprove: true
    - "Approve Regression" button enabled
Else:
    - canApprove: false
    - Button disabled
    - Shows missing requirements
    ↓
User clicks "Approve Regression"
    ↓
POST /trigger-pre-release
    ↓
Validates requirements (unless forceApprove: true)
    ↓
Updates stage2Status: COMPLETED
    ↓
Sets autoTransitionToStage3: true
    ↓
Starts Stage 3
```

### Project Management Approval (Post-Regression)

**Flow:**
```
All tasks completed
    ↓
Check PM status
GET /project-management-run-status
    ↓
If approved: false:
    - Show "Request Approval" button
    - "Complete Post-Regression" disabled
Else:
    - Show approval status
    - "Complete Post-Regression" enabled
```

---

## State Transitions

### Release Status Transitions

```
PENDING → IN_PROGRESS (when kickoff starts)
    ↓
IN_PROGRESS → PAUSED (user pauses or task fails)
    ↓
PAUSED → IN_PROGRESS (user resumes or task retried)
    ↓
IN_PROGRESS → SUBMITTED (when submitted to stores)
    ↓
SUBMITTED → COMPLETED (when stores approve)
    ↓
Any → ARCHIVED (user cancels)
```

### Stage Status Transitions

```
PENDING → IN_PROGRESS (when first task starts)
    ↓
IN_PROGRESS → COMPLETED (when all tasks complete)
```

### Task Status Transitions

```
PENDING → IN_PROGRESS (when task starts)
    ↓
IN_PROGRESS → COMPLETED / FAILED / SKIPPED
    ↓
FAILED → PENDING (on retry)
```

### Regression Cycle Status Transitions

```
NOT_STARTED → IN_PROGRESS (when slot time arrives)
    ↓
IN_PROGRESS → DONE (when all tasks complete)
    ↓
IN_PROGRESS → ABANDONED (user abandons)
```

---

## Decision Points

### Manual vs CI/CD Mode

**Decision**: Set at release creation via `hasManualBuildUpload` flag

**Impact**:
- **Manual Mode**: Users upload builds manually, task status: `AWAITING_MANUAL_BUILD`
- **CI/CD Mode**: Builds triggered automatically, task status: `AWAITING_CALLBACK`

### Auto-Transition vs Manual Transition

**Decision**: Set in release configuration

**Stage 1 → Stage 2**:
- `autoTransitionToStage2: true` → Automatically starts Regression
- `autoTransitionToStage2: false` → User must trigger manually

**Stage 2 → Stage 3**:
- Always requires approval (no auto-transition)

**Stage 3 → Stage 4**:
- `autoTransitionToStage4: true` → Automatically starts Distribution
- `autoTransitionToStage4: false` → User must trigger manually

### Regression Cycles

**Decision**: Configured in release config (number of cycles, slot times)

**Flow**:
- First cycle starts automatically after Kickoff completion
- Subsequent cycles start at scheduled slot times
- User can abandon cycles
- User can skip remaining cycles

### Build Platform Selection

**Decision**: Set in `platformTargetMappings` at release creation

**Impact**:
- Determines which platforms need builds
- Determines which build tasks are created
- Determines upload widget visibility

---

## Key API Endpoints

### Stage APIs
- `GET /stages/kickoff` - Get Kickoff stage tasks
- `GET /stages/regression` - Get Regression stage (cycles, tasks, approval status)
- `GET /stages/post-regression` - Get Post-Regression stage tasks

### Build APIs
- `PUT /stages/{stage}/builds/{platform}` - Upload manual build
- `POST /stages/{stage}/builds/ios/verify-testflight` - Verify TestFlight build
- `GET /builds/artifacts` - List build artifacts
- `DELETE /builds/artifacts/{uploadId}` - Delete artifact

### Action APIs
- `POST /tasks/{taskId}/retry` - Retry failed task
- `POST /trigger-pre-release` - Approve Regression stage
- `POST /stages/post-regression/complete` - Complete Post-Regression stage

### Status APIs
- `GET /test-management-run-status` - Get test management status
- `GET /check-cherry-pick-status` - Get cherry pick status
- `GET /project-management-run-status` - Get PM approval status

---

## Summary

The Release Process is a structured workflow that:

1. **Kickoff**: Sets up the release with branch, tickets, tests, and pre-regression builds
2. **Regression**: Executes multiple testing cycles with builds and approvals
3. **Post-Regression**: Creates final release builds and prepares for distribution
4. **Distribution**: Submits to app stores for approval

**Key Features**:
- Supports both Manual and CI/CD build modes
- Multiple regression cycles with flexible scheduling
- Comprehensive approval workflows
- Build staging system for manual uploads
- Task retry and error handling
- State management across stages and cycles

---

**Note**: This document should be updated as the release process evolves and new features are added.


