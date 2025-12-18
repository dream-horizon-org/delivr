# Manual Build Upload Flow - Complete Release Orchestration Guide

> **Last Updated:** 2024-12-10  
> **Version:** 1.0  
> **Purpose:** Comprehensive guide for understanding manual build upload scenarios in Release Orchestration

---

## Table of Contents

1. [Legend](#legend)
2. [Overview](#overview)
3. [Unified Upload API](#unified-upload-api)
4. [Release Creation](#release-creation)
5. [Stage 1: Kick-off](#stage-1-kick-off)
6. [Stage 2: Regression](#stage-2-regression)
7. [Stage 3: Pre-Release](#stage-3-pre-release)
8. [Stage 4: Submission](#stage-4-submission)
9. [Upload Validation Rules](#upload-validation-rules)
10. [Stage Transition Summary](#stage-transition-summary)
11. [Key Points](#key-points)

---

## Legend

```
✅  = Task Completed
⏳  = Waiting for builds (AWAITING_MANUAL_BUILD)
🔔  = Slack notification sent
📤  = Manual upload available
━━  = Stage boundary
──  = Cycle boundary
```

---

## Overview

The Release Orchestration system supports two modes for build handling:

| Mode | Flag | Description |
|------|------|-------------|
| **CI/CD Mode** | `hasManualBuildUpload = false` | Builds triggered automatically via CI/CD pipeline |
| **Manual Mode** | `hasManualBuildUpload = true` | Users upload builds manually via API |

> **Important:** `hasManualBuildUpload` is a **RELEASE-level** flag, not per-stage.

---

## Unified Upload API

All manual uploads use a single unified API endpoint:

```
POST /releases/:releaseId/builds
Content-Type: multipart/form-data

Body:
{
  stage: 'PRE_REGRESSION' | 'REGRESSION' | 'PRE_RELEASE',
  platform: 'ANDROID' | 'IOS',
  file: <binary>
}

Response (Success):
{
  success: true,
  buildId: 'staging-uuid-123',
  message: 'Build uploaded to staging'
}

Response (Error - Upload not allowed):
{
  success: false,
  error: 'Upload window closed for this stage/cycle'
}
```

---

## Release Creation

```
+---------------------------------------------------------------------+
| POST /releases                                                       |
|                                                                      |
| Release created with:                                                |
|   - status: PENDING                                                  |
|   - hasManualBuildUpload: true/false  <-- PER RELEASE                |
|   - kickOffDate: 2024-01-15T10:00:00Z                                |
|   - regressionSlots: [{date: 01-16}, {date: 01-18}, {date: 01-20}]   |
|   - platforms: [ANDROID, IOS]                                        |
|                                                                      |
| Cron job created:                                                    |
|   - stage1Status: PENDING                                            |
|   - stage2Status: PENDING                                            |
|   - stage3Status: PENDING                                            |
|   - stage4Status: PENDING                                            |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 📤 UPLOAD WINDOW OPENS: STAGE 1 (PRE_REGRESSION) BUILDS              |
| (Only if hasManualBuildUpload = true)                                |
|                                                                      |
| User can upload builds BEFORE kick-off date:                         |
|   POST /releases/:id/builds                                          |
|   Body: { stage: 'PRE_REGRESSION', platform: 'ANDROID', file: ... }  |
|   Body: { stage: 'PRE_REGRESSION', platform: 'IOS', file: ... }      |
|                                                                      |
| ON UPLOAD -> Staging table entry CREATED:                            |
|   +----------------------------------------------------+             |
|   | id: staging-uuid-1                                 |             |
|   | tenantId: tenant-123                               |             |
|   | releaseId: release-456                             |             |
|   | stage: PRE_REGRESSION                              |             |
|   | platform: ANDROID                                  |             |
|   | artifactPath: s3://bucket/path/to/build.apk        |             |
|   | isUsed: false                                      |             |
|   | usedByTaskId: NULL                                 |             |
|   | usedByCycleId: NULL                                |             |
|   | createdAt: timestamp                               |             |
|   +----------------------------------------------------+             |
+---------------------------------------------------------------------+
```

---

## Stage 1: Kick-off

```
================================================================================
KICK-OFF DATE ARRIVES (2024-01-15T10:00:00Z)
================================================================================

+---------------------------------------------------------------------+
| Cron tick -> Stage 1 begins                                          |
|   - release.status: PENDING -> IN_PROGRESS                           |
|   - cronJob.stage1Status: PENDING -> IN_PROGRESS                     |
|                                                                      |
| Create Stage 1 tasks (in order):                                     |
|   1. FORK_BRANCH                                                     |
|   2. CREATE_PROJECT_MANAGEMENT_TICKET                                |
|   3. CREATE_TEST_SUITE                                               |
|   4. TRIGGER_PRE_REGRESSION_BUILDS  <-- NEEDS BUILDS                 |
|   5. SEND_KICKOFF_MESSAGE                                           |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| Execute tasks 1-3:                                                   |
|                                                                      |
| 1. FORK_BRANCH                                                       |
|    -> Check if branch exists (idempotent)                            |
|    -> Create release/7.0.0_android_6.7.0_ios branch                  |
|    -> Status: COMPLETED ✅                                            |
|                                                                      |
| 2. CREATE_PROJECT_MANAGEMENT_TICKET                                  |
|    -> Check if tickets exist (idempotent)                            |
|    -> Create tickets for each platform                               |
|    -> Status: COMPLETED ✅                                            |
|                                                                      |
| 3. CREATE_TEST_SUITE                                                 |
|    -> Check if test suites exist (idempotent)                        |
|    -> Create test suites for each platform                           |
|    -> Status: COMPLETED ✅                                            |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 4. TRIGGER_PRE_REGRESSION_BUILDS                                     |
|                                                                      |
| 📤 UPLOAD WINDOW CLOSES when this task STARTS executing              |
|                                                                      |
| Check release.hasManualBuildUpload:                                  |
|                                                                      |
| +---------------------------------------------------------------+   |
| | IF hasManualBuildUpload = FALSE (CI/CD Mode)                  |   |
| |                                                               |   |
| | -> Call CI/CD service to trigger builds for each platform     |   |
| | -> CREATE build records in `builds` table:                    |   |
| |                                                               |   |
| |    +----------------------------------------------------+     |   |
| |    | id: build-uuid-1                                   |     |   |
| |    | tenantId: tenant-123                               |     |   |
| |    | releaseId: release-456                             |     |   |
| |    | regressionId: NULL (Stage 1, not regression)       |     |   |
| |    | taskId: task-789                                   |     |   |
| |    | platform: ANDROID                                  |     |   |
| |    | storeType: PLAY_STORE                              |     |   |
| |    | buildStage: KICKOFF                               |     |   |
| |    | buildType: CI_CD                                   |     |   |
| |    | queueLocation: queue-url-from-cicd                 |     |   |
| |    | ciRunId: NULL (CI/CD updates when it starts)       |     |   |
| |    | workflowStatus: PENDING  <-- STARTS AS PENDING     |     |   |
| |    | buildUploadStatus: PENDING                         |     |   |
| |    | artifactPath: NULL (CI/CD updates)                 |     |   |
| |    +----------------------------------------------------+     |   |
| |                                                               |   |
| | -> Task status: PENDING -> AWAITING_CALLBACK                  |   |
| | -> Wait for CI/CD to update build records                     |   |
| +---------------------------------------------------------------+   |
|                                                                      |
| +---------------------------------------------------------------+   |
| | IF hasManualBuildUpload = TRUE (Manual Mode)                  |   |
| |                                                               |   |
| | Check staging table:                                          |   |
| |   SELECT * FROM build_uploads_staging                         |   |
| |   WHERE releaseId = ? AND stage = 'PRE_REGRESSION'            |   |
| |     AND isUsed = false                                        |   |
| |                                                               |   |
| | IF builds exist for ALL platforms:                            |   |
| |   -> UPDATE staging entries:                                  |   |
| |        isUsed = true                                          |   |
| |        usedByTaskId = taskId                                  |   |
| |   -> CREATE entries in `builds` table:                        |   |
| |                                                               |   |
| |    +----------------------------------------------------+     |   |
| |    | id: build-uuid-2                                   |     |   |
| |    | tenantId: tenant-123                               |     |   |
| |    | releaseId: release-456                             |     |   |
| |    | regressionId: NULL                                 |     |   |
| |    | taskId: task-789                                   |     |   |
| |    | platform: ANDROID                                  |     |   |
| |    | storeType: PLAY_STORE                              |     |   |
| |    | buildStage: KICKOFF                               |     |   |
| |    | buildType: MANUAL  <-- MANUAL TYPE                 |     |   |
| |    | queueLocation: NULL                                |     |   |
| |    | ciRunId: NULL                                      |     |   |
| |    | workflowStatus: NULL  <-- NOT APPLICABLE           |     |   |
| |    | buildUploadStatus: UPLOADED  <-- ALREADY UPLOADED  |     |   |
| |    | artifactPath: s3://bucket/path/from/staging        |     |   |
| |    +----------------------------------------------------+     |   |
| |                                                               |   |
| |   -> Task status: PENDING -> IN_PROGRESS -> COMPLETED ✅       |   |
| |                                                               |   |
| | IF builds MISSING for any platform:                           |   |
| |   -> Task status: PENDING -> AWAITING_MANUAL_BUILD ⏳          |   |
| |   -> 🔔 Slack notification (ONCE!):                           |   |
| |      "Missing PRE_REGRESSION builds for: ANDROID, IOS"        |   |
| |   -> Task returns (no error)                                  |   |
| |   -> Cron continues ticking                                   |   |
| +---------------------------------------------------------------+   |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| NEXT CRON TICK - CI/CD MODE (hasManualBuildUpload = false):          |
|                                                                      |
| Task status = AWAITING_CALLBACK                                      |
|                                                                      |
| READ build records from `builds` table (we don't update them):       |
|   SELECT * FROM builds WHERE taskId = ?                              |
|                                                                      |
| Check buildUploadStatus for all platforms:                           |
|                                                                      |
| IF ALL buildUploadStatus = 'UPLOADED':                               |
|   -> Task status: AWAITING_CALLBACK -> COMPLETED ✅                   |
|   -> Continue to next task                                           |
|                                                                      |
| IF ANY buildUploadStatus = 'FAILED':                                 |
|   -> Task status: AWAITING_CALLBACK -> FAILED ❌                      |
|   -> release.status: IN_PROGRESS -> PAUSED                           |
|   -> cronJob.pauseType: TASK_FAILURE                                 |
|   -> 🔔 Slack notification                                           |
|                                                                      |
| IF ANY still PENDING or RUNNING:                                     |
|   -> Do nothing, wait for next tick                                  |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| NEXT CRON TICK - MANUAL MODE (hasManualBuildUpload = true):          |
|                                                                      |
| Task status = AWAITING_MANUAL_BUILD                                  |
|                                                                      |
| Check staging table again (same query as before)                     |
|                                                                      |
| IF builds NOW exist for all platforms:                               |
|   -> Mark staging as used, create builds entries                     |
|   -> Task status: AWAITING_MANUAL_BUILD -> COMPLETED ✅               |
|                                                                      |
| IF still missing:                                                    |
|   -> Do nothing (notification already sent)                          |
|   -> Task stays AWAITING_MANUAL_BUILD ⏳                              |
|   -> Wait for next tick                                              |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 5. SEND_KICKOFF_MESSAGE                                             |
|    -> Send Slack message with build links                            |
|    -> Status: COMPLETED ✅                                            |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| STAGE 1 COMPLETE                                                     |
|                                                                      |
| -> cronJob.stage1Status: IN_PROGRESS -> COMPLETED                    |
+---------------------------------------------------------------------+
```

---

## Stage 2: Regression

### Automatic Transition from Stage 1

```
================================================================================
Stage 1 complete -> Stage 2 starts AUTOMATICALLY (NO APPROVAL GATE)
================================================================================

+---------------------------------------------------------------------+
| -> cronJob.stage2Status: PENDING -> IN_PROGRESS                      |
|                                                                      |
| Note: Cycle tasks are NOT created yet!                               |
|       They are created when each slot time arrives.                  |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 📤 UPLOAD WINDOW OPENS: CYCLE 1 (REGRESSION) BUILDS                  |
| (Only if hasManualBuildUpload = true)                                |
|                                                                      |
| User can NOW upload via unified API:                                 |
|   POST /releases/:id/builds                                          |
|   Body: { stage: 'REGRESSION', platform: 'ANDROID', file: ... }      |
|   Body: { stage: 'REGRESSION', platform: 'IOS', file: ... }          |
|                                                                      |
| ON UPLOAD -> Staging table entry CREATED:                            |
|   +----------------------------------------------------+             |
|   | id: staging-uuid-10                                |             |
|   | releaseId: release-456                             |             |
|   | stage: REGRESSION                                  |             |
|   | platform: ANDROID                                  |             |
|   | artifactPath: s3://bucket/path/to/build.apk        |             |
|   | isUsed: false                                      |             |
|   | usedByTaskId: NULL                                 |             |
|   | usedByCycleId: NULL                                |             |
|   +----------------------------------------------------+             |
+---------------------------------------------------------------------+
```

### Cycle 1

```
================================================================================
SLOT 1 TIME ARRIVES (2024-01-16T10:00:00Z)
================================================================================

+---------------------------------------------------------------------+
| Cron tick -> Slot 1 begins                                           |
|                                                                      |
| Create Regression Cycle 1:                                           |
|   - id: cycle-1                                                      |
|   - cycleNumber: 1                                                   |
|   - status: IN_PROGRESS                                              |
|                                                                      |
| Create Cycle 1 tasks (in order):                                     |
|   1. RESET_TEST_SUITE         (SKIPPED for Cycle 1)                  |
|   2. CREATE_RC_TAG                                                   |
|   3. CREATE_RELEASE_NOTES                                            |
|   4. TRIGGER_REGRESSION_BUILDS  <-- NEEDS BUILDS                     |
|   5. TRIGGER_AUTOMATION_RUNS    (TODO - future scope)                |
|   6. AUTOMATION_RUNS            (TODO - future scope)                |
|   7. SEND_REGRESSION_BUILD_MESSAGE                                   |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| Execute tasks 1-3:                                                   |
|                                                                      |
| 1. RESET_TEST_SUITE (SKIPPED for Cycle 1)                            |
|    -> Only runs for Cycle 2+                                         |
|    -> Status: SKIPPED                                                |
|                                                                      |
| 2. CREATE_RC_TAG                                                     |
|    -> Check if tag exists (idempotent)                               |
|    -> Create tag: rc-7.0.0_android_6.7.0_ios-cycle1                  |
|    -> Status: COMPLETED ✅                                            |
|                                                                      |
| 3. CREATE_RELEASE_NOTES                                              |
|    -> Generate release notes from commits                            |
|    -> Status: COMPLETED ✅                                            |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 4. TRIGGER_REGRESSION_BUILDS (Cycle 1)                               |
|                                                                      |
| 📤 UPLOAD WINDOW CLOSES FOR CYCLE 1 when this task STARTS executing  |
|                                                                      |
| +---------------------------------------------------------------+   |
| | IF hasManualBuildUpload = FALSE (CI/CD Mode)                  |   |
| |                                                               |   |
| | -> Call CI/CD service to trigger builds                       |   |
| | -> CREATE build records in `builds` table:                    |   |
| |                                                               |   |
| |    +----------------------------------------------------+     |   |
| |    | id: build-uuid-10                                  |     |   |
| |    | tenantId: tenant-123                               |     |   |
| |    | releaseId: release-456                             |     |   |
| |    | regressionId: cycle-1  <-- LINKED TO CYCLE         |     |   |
| |    | taskId: task-101                                   |     |   |
| |    | platform: ANDROID                                  |     |   |
| |    | storeType: PLAY_STORE                              |     |   |
| |    | buildStage: REGRESSION                             |     |   |
| |    | buildType: CI_CD                                   |     |   |
| |    | queueLocation: queue-url                           |     |   |
| |    | ciRunId: NULL                                      |     |   |
| |    | workflowStatus: PENDING  <-- STARTS AS PENDING     |     |   |
| |    | buildUploadStatus: PENDING                         |     |   |
| |    | artifactPath: NULL                                 |     |   |
| |    +----------------------------------------------------+     |   |
| |                                                               |   |
| | -> Task status: PENDING -> AWAITING_CALLBACK                  |   |
| +---------------------------------------------------------------+   |
|                                                                      |
| +---------------------------------------------------------------+   |
| | IF hasManualBuildUpload = TRUE (Manual Mode)                  |   |
| |                                                               |   |
| | Check staging table:                                          |   |
| |   SELECT * FROM build_uploads_staging                         |   |
| |   WHERE releaseId = ? AND stage = 'REGRESSION'                |   |
| |     AND isUsed = false                                        |   |
| |                                                               |   |
| | IF builds exist for ALL platforms:                            |   |
| |   -> UPDATE staging entries:                                  |   |
| |        isUsed = true                                          |   |
| |        usedByTaskId = task-101                                |   |
| |        usedByCycleId = cycle-1                                |   |
| |                                                               |   |
| |   -> CREATE entries in `builds` table:                        |   |
| |                                                               |   |
| |    +----------------------------------------------------+     |   |
| |    | id: build-uuid-11                                  |     |   |
| |    | tenantId: tenant-123                               |     |   |
| |    | releaseId: release-456                             |     |   |
| |    | regressionId: cycle-1  <-- LINKED TO CYCLE         |     |   |
| |    | taskId: task-101                                   |     |   |
| |    | platform: ANDROID                                  |     |   |
| |    | storeType: PLAY_STORE                              |     |   |
| |    | buildStage: REGRESSION                             |     |   |
| |    | buildType: MANUAL                                  |     |   |
| |    | queueLocation: NULL                                |     |   |
| |    | ciRunId: NULL                                      |     |   |
| |    | workflowStatus: NULL                               |     |   |
| |    | buildUploadStatus: UPLOADED                        |     |   |
| |    | artifactPath: s3://from/staging                    |     |   |
| |    +----------------------------------------------------+     |   |
| |                                                               |   |
| |   -> Task status: PENDING -> COMPLETED ✅                      |   |
| |                                                               |   |
| | IF builds MISSING:                                            |   |
| |   -> Task status: PENDING -> AWAITING_MANUAL_BUILD ⏳          |   |
| |   -> 🔔 Slack: "Cycle 1: Missing REGRESSION builds"           |   |
| |   -> Task returns, cron continues ticking                     |   |
| +---------------------------------------------------------------+   |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| NEXT CRON TICK (if task was AWAITING_MANUAL_BUILD):                  |
|                                                                      |
| Task status = AWAITING_MANUAL_BUILD                                  |
|                                                                      |
| Check staging table again (same query)                               |
|                                                                      |
| IF builds NOW exist for all platforms:                               |
|   -> Mark staging as used (usedByCycleId = cycle-1)                  |
|   -> Create builds entries                                           |
|   -> Task status: AWAITING_MANUAL_BUILD -> COMPLETED ✅               |
|                                                                      |
| IF still missing:                                                    |
|   -> Do nothing (notification already sent)                          |
|   -> Wait for next tick                                              |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| Execute tasks 5-7:                                                   |
|                                                                      |
| 5. TRIGGER_AUTOMATION_RUNS -> TODO (future scope)                    |
| 6. AUTOMATION_RUNS -> TODO (future scope)                            |
| 7. SEND_REGRESSION_BUILD_MESSAGE -> COMPLETED ✅                      |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| CYCLE 1 COMPLETE                                                     |
|                                                                      |
| -> regressionCycle.status: IN_PROGRESS -> COMPLETED                  |
|                                                                      |
| 📤 UPLOAD WINDOW OPENS FOR CYCLE 2 (if hasManualBuildUpload = true)  |
+---------------------------------------------------------------------+
```

### Between Cycles - Upload Window

```
+---------------------------------------------------------------------+
| 📤 UPLOAD WINDOW: CYCLE 2 (REGRESSION) BUILDS                        |
| (Only if hasManualBuildUpload = true)                                |
|                                                                      |
| User uploads via unified API:                                        |
|   POST /releases/:id/builds                                          |
|   Body: { stage: 'REGRESSION', platform: 'ANDROID', file: ... }      |
|                                                                      |
| ON UPLOAD -> NEW staging table entry CREATED:                        |
|   (Previous Cycle 1 entries are marked isUsed = true)                |
|                                                                      |
|   +----------------------------------------------------+             |
|   | id: staging-uuid-20                                |             |
|   | releaseId: release-456                             |             |
|   | stage: REGRESSION                                  |             |
|   | platform: ANDROID                                  |             |
|   | isUsed: false  <-- NEW ENTRY FOR CYCLE 2           |             |
|   | usedByCycleId: NULL                                |             |
|   +----------------------------------------------------+             |
+---------------------------------------------------------------------+
```

### Cycle 2

```
================================================================================
SLOT 2 TIME ARRIVES (2024-01-18T10:00:00Z)
================================================================================

+---------------------------------------------------------------------+
| Cron tick -> Slot 2 begins                                           |
|                                                                      |
| Create Regression Cycle 2:                                           |
|   - id: cycle-2                                                      |
|   - cycleNumber: 2                                                   |
|   - status: IN_PROGRESS                                              |
|                                                                      |
| Create Cycle 2 tasks (in order):                                     |
|   1. RESET_TEST_SUITE         (RUNS for Cycle 2+)                    |
|   2. CREATE_RC_TAG                                                   |
|   3. CREATE_RELEASE_NOTES                                            |
|   4. TRIGGER_REGRESSION_BUILDS  <-- NEEDS BUILDS                     |
|   5. TRIGGER_AUTOMATION_RUNS                                         |
|   6. AUTOMATION_RUNS                                                 |
|   7. SEND_REGRESSION_BUILD_MESSAGE                                   |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| Execute tasks:                                                       |
|                                                                      |
| 1. RESET_TEST_SUITE (RUNS for Cycle 2+)                              |
|    -> Reset test management status for new cycle                     |
|    -> Status: COMPLETED ✅                                            |
|                                                                      |
| 2. CREATE_RC_TAG                                                     |
|    -> Create tag: rc-7.0.0_android_6.7.0_ios-cycle2                  |
|    -> Status: COMPLETED ✅                                            |
|                                                                      |
| 3. CREATE_RELEASE_NOTES                                              |
|    -> Generate release notes (delta from Cycle 1)                    |
|    -> Status: COMPLETED ✅                                            |
|                                                                      |
| 4. TRIGGER_REGRESSION_BUILDS (Cycle 2)                               |
|    📤 UPLOAD WINDOW CLOSES FOR CYCLE 2 when task STARTS              |
|    -> Same logic as Cycle 1                                          |
|    -> Check staging (WHERE isUsed = false)                           |
|    -> If found: mark usedByCycleId = cycle-2, execute                |
|    -> If missing: AWAITING_MANUAL_BUILD + notification               |
|                                                                      |
| 5-7. Same as Cycle 1                                                 |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| CYCLE 2 COMPLETE                                                     |
|                                                                      |
| -> regressionCycle.status: IN_PROGRESS -> COMPLETED                  |
|                                                                      |
| 📤 UPLOAD WINDOW OPENS FOR CYCLE 3                                   |
+---------------------------------------------------------------------+
```

### Cycle 3 (Final)

```
================================================================================
SLOT 3 TIME ARRIVES (2024-01-20T10:00:00Z)
================================================================================

+---------------------------------------------------------------------+
| Same pattern as Cycle 2...                                           |
|                                                                      |
| After all tasks complete:                                            |
|   -> Cycle 3 status: COMPLETED                                       |
|   -> This was the LAST slot                                          |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| ALL REGRESSION CYCLES COMPLETE                                       |
|                                                                      |
| -> cronJob.stage2Status: IN_PROGRESS -> COMPLETED                    |
| -> Ready for Stage 3 (awaiting approval)                             |
+---------------------------------------------------------------------+
```

---

## Stage 3: Pre-Release

### Approval Gate: Stage 2 -> Stage 3

```
================================================================================
ALL REGRESSION CYCLES COMPLETE - APPROVAL GATE
================================================================================

+---------------------------------------------------------------------+
| APPROVAL GATE FOR STAGE 3                                            |
|                                                                      |
| -> cronJob.stage2Status: IN_PROGRESS -> COMPLETED                    |
| -> Stage 3 DOES NOT start automatically                              |
|                                                                      |
| Waiting for approval:                                                |
|   - Manual approval via API                                          |
|   - OR Cherry-pick approval gate check                               |
|   - OR PM approval (if configured)                                   |
|                                                                      |
| Until approved:                                                      |
|   -> cronJob.stage3Status remains PENDING                            |
|   -> Cron checks approval status each tick                           |
+---------------------------------------------------------------------+
                                   |
                          [APPROVAL GRANTED]
                                   |
                                   v
+---------------------------------------------------------------------+
| -> cronJob.stage3Status: PENDING -> IN_PROGRESS                      |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 📤 UPLOAD WINDOW OPENS: STAGE 3 (PRE_RELEASE) BUILDS                 |
| (Only if hasManualBuildUpload = true)                                |
|                                                                      |
| User uploads via unified API:                                        |
|   POST /releases/:id/builds                                          |
|   Body: { stage: 'PRE_RELEASE', platform: 'IOS', file: ... }         |
|   Body: { stage: 'PRE_RELEASE', platform: 'ANDROID', file: ... }     |
|                                                                      |
| ON UPLOAD -> Staging table entry CREATED                             |
+---------------------------------------------------------------------+
```

### Stage 3 Execution

```
+---------------------------------------------------------------------+
| Cron tick -> Stage 3 begins                                          |
|                                                                      |
| Create Stage 3 tasks (in order):                                     |
|   1. CREATE_RELEASE_TAG                                              |
|   2. TRIGGER_TEST_FLIGHT_BUILD (iOS)   <-- NEEDS BUILD               |
|   3. CREATE_AAB_BUILD (Android)        <-- NEEDS BUILD               |
|   4. PM_APPROVAL_GATE (if configured)                                |
|   5. SEND_PRE_RELEASE_MESSAGE                                        |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 1. CREATE_RELEASE_TAG                                                |
|    -> Check if tag exists (idempotent)                               |
|    -> Create tag: v7.0.0_android_6.7.0_ios                           |
|    -> Status: COMPLETED ✅                                            |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 2. TRIGGER_TEST_FLIGHT_BUILD (iOS)                                   |
|                                                                      |
| 📤 UPLOAD WINDOW CLOSES FOR iOS when this task STARTS                |
|                                                                      |
| +---------------------------------------------------------------+   |
| | IF hasManualBuildUpload = FALSE (CI/CD Mode)                  |   |
| | -> Trigger TestFlight build via CI/CD                         |   |
| | -> Task status: AWAITING_CALLBACK                             |   |
| | -> Wait for callback                                          |   |
| +---------------------------------------------------------------+   |
|                                                                      |
| +---------------------------------------------------------------+   |
| | IF hasManualBuildUpload = TRUE (Manual Mode)                  |   |
| |                                                               |   |
| | Check staging table:                                          |   |
| |   SELECT * FROM build_uploads_staging                         |   |
| |   WHERE releaseId = ? AND stage = 'PRE_RELEASE'               |   |
| |     AND platform = 'IOS' AND isUsed = false                   |   |
| |                                                               |   |
| | IF build exists:                                              |   |
| |   -> Mark used, create builds entry                           |   |
| |   -> Task status: COMPLETED ✅                                 |   |
| |                                                               |   |
| | IF build MISSING:                                             |   |
| |   -> Task status: AWAITING_MANUAL_BUILD ⏳                     |   |
| |   -> 🔔 Slack: "Missing TestFlight build for iOS"             |   |
| +---------------------------------------------------------------+   |
|                                                                      |
| builds table entry (if manual):                                      |
|   +----------------------------------------------------+             |
|   | id: build-uuid-30                                  |             |
|   | releaseId: release-456                             |             |
|   | regressionId: NULL  <-- NOT REGRESSION             |             |
|   | taskId: task-301                                   |             |
|   | platform: IOS                                      |             |
|   | storeType: APP_STORE                               |             |
|   | buildStage: PRE_RELEASE                            |             |
|   | buildType: MANUAL                                  |             |
|   | buildUploadStatus: UPLOADED                        |             |
|   | testflightNumber: NULL (can be set later)          |             |
|   +----------------------------------------------------+             |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 3. CREATE_AAB_BUILD (Android)                                        |
|                                                                      |
| 📤 UPLOAD WINDOW CLOSES FOR Android when this task STARTS            |
|                                                                      |
| Same logic as TRIGGER_TEST_FLIGHT_BUILD but for Android:             |
|   - Check staging for PRE_RELEASE + ANDROID                          |
|   - If found: execute                                                |
|   - If missing: AWAITING_MANUAL_BUILD + notification                 |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 4. PM_APPROVAL_GATE (if configured)                                  |
|                                                                      |
| -> Poll PM service for approval status                               |
| -> Wait until all platforms approved                                 |
| -> Task status: COMPLETED ✅ when approved                            |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| 5. SEND_PRE_RELEASE_MESSAGE                                          |
|    -> Send Slack message with release build links                    |
|    -> Status: COMPLETED ✅                                            |
+---------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| STAGE 3 COMPLETE                                                     |
|                                                                      |
| -> cronJob.stage3Status: IN_PROGRESS -> COMPLETED                    |
+---------------------------------------------------------------------+
```

---

## Stage 4: Submission

### Approval Gate: Stage 3 -> Stage 4

```
================================================================================
STAGE 3 COMPLETE - APPROVAL GATE
================================================================================

+---------------------------------------------------------------------+
| APPROVAL GATE FOR STAGE 4                                            |
|                                                                      |
| -> cronJob.stage3Status: COMPLETED                                   |
| -> Stage 4 DOES NOT start automatically                              |
|                                                                      |
| Waiting for:                                                         |
|   - Manual approval to submit                                        |
|   - OR automated submission check                                    |
|                                                                      |
| Until approved:                                                      |
|   -> cronJob.stage4Status remains PENDING                            |
+---------------------------------------------------------------------+
                                   |
                          [APPROVAL GRANTED]
                                   |
                                   v
+---------------------------------------------------------------------+
| STAGE 4: SUBMISSION (Future scope)                                   |
|                                                                      |
| -> Submit to App Store / Play Store                                  |
| -> release.status: IN_PROGRESS -> SUBMITTED                          |
| -> cronJob.stage4Status: COMPLETED                                   |
+---------------------------------------------------------------------+
```

---

## Upload Validation Rules

### Upload Windows by Stage

```
+----------------+---------------------------------------------------+
| STAGE          | UPLOAD ALLOWED WHEN                               |
+----------------+---------------------------------------------------+
| PRE_REGRESSION | YES: After release created                        |
| (Stage 1)      | YES: Before kick-off date                         |
|                | YES: While task AWAITING_MANUAL_BUILD             |
|                | NO:  After TRIGGER_PRE_REGRESSION task STARTS     |
+----------------+---------------------------------------------------+
| REGRESSION     | YES: After Stage 1 completes                      |
| (Stage 2)      | YES: Before slot time arrives                     |
|                | YES: While task AWAITING_MANUAL_BUILD             |
|                | NO:  After cycle's task STARTS (for THAT cycle)   |
|                | YES: After cycle completes (for NEXT cycle)       |
|                | NO:  After ALL cycles complete                    |
+----------------+---------------------------------------------------+
| PRE_RELEASE    | YES: After Stage 2->3 approval granted            |
| (Stage 3)      | YES: While task AWAITING_MANUAL_BUILD             |
|                | NO:  After PRE_RELEASE task STARTS                |
+----------------+---------------------------------------------------+
```

### Upload Window Timeline for Regression

```
+---------------------------------------------------------------------+
| REGRESSION UPLOAD WINDOWS                                            |
+---------------------------------------------------------------------+
|                                                                      |
| Timeline:                                                            |
|                                                                      |
|   Stage 1      Slot 1       Cycle 1      Slot 2       Cycle 2        |
|   Complete     Task Starts  Complete     Task Starts  Complete       |
|      |            |            |            |            |           |
|      v            v            v            v            v           |
|   [====WINDOW 1====]       [====WINDOW 2====]       [====...]        |
|                                                                      |
| WINDOW 1 (for Cycle 1):                                              |
|   START: When Stage 1 completes                                      |
|   END:   When Cycle 1's TRIGGER_REGRESSION_BUILDS task STARTS        |
|                                                                      |
| WINDOW 2 (for Cycle 2):                                              |
|   START: When Cycle 1 completes                                      |
|   END:   When Cycle 2's TRIGGER_REGRESSION_BUILDS task STARTS        |
|                                                                      |
| BLOCKED:                                                             |
|   - After task STARTS for that cycle                                 |
|   - After ALL cycles complete (Stage 2 done)                         |
+---------------------------------------------------------------------+
```

---

## Stage Transition Summary

```
+---------------------------------------------------------------------+
|                                                                      |
|  STAGE 1         STAGE 2           STAGE 3           STAGE 4         |
|  (Kick-off)      (Regression)      (Pre-Release)     (Submission)    |
|                                                                      |
|     |                |                  |                 |          |
|     v                v                  v                 v          |
|  [TASKS]    -->  [CYCLES]    -->    [TASKS]    -->    [TASKS]        |
|                       |                  |                 |          |
|     |                |                  |                 |          |
|     +--- AUTO -------+                  |                 |          |
|           (no gate)                     |                 |          |
|                      +--- APPROVAL -----+                 |          |
|                            GATE                           |          |
|                                         +--- APPROVAL ----+          |
|                                               GATE                   |
|                                                                      |
+---------------------------------------------------------------------+
```

---

## Key Points

### 1. Release-Level Flag

`hasManualBuildUpload` is a **RELEASE-level** flag (not per-stage). When `true`, ALL stages use manual upload mode.

### 2. Unified Upload API

Single API endpoint for all uploads:
```
POST /releases/:releaseId/builds
Body: { stage, platform, file }
```

### 3. CI/CD Mode Status Handling

- Creates build records with `workflowStatus: PENDING`
- CI/CD system updates `workflowStatus` and `buildUploadStatus`
- **We only READ status, never update it**

### 4. Manual Mode Status Handling

- Staging table entries created **ONLY when user uploads**
- Task checks staging, consumes if all platforms present
- Creates build records with:
  - `buildType: MANUAL`
  - `buildUploadStatus: UPLOADED`
  - `workflowStatus: NULL`

### 5. Stage Transitions

| Transition | Type |
|------------|------|
| Stage 1 → 2 | **AFTER_APPROVAL** (no approval gate) |
| Stage 2 → 3 | **APPROVAL GATE** required |
| Stage 3 → 4 | **APPROVAL GATE** required |

### 6. Regression Upload Windows

- **Opens:** When previous stage/cycle completes
- **Closes:** When `TRIGGER_REGRESSION_BUILDS` task **STARTS** for that cycle

### 7. Slack Notifications

Sent **ONCE** per task when builds are missing (not every cron tick)

### 8. Idempotency

All tasks are idempotent:
- `FORK_BRANCH`: Checks if branch exists
- `CREATE_RC_TAG`: Checks if tag exists
- `CREATE_TEST_SUITE`: Checks if test suite exists
- `TRIGGER_*_BUILDS`: Checks if builds already exist

---

## Database Tables

### `build_uploads_staging`

Temporary storage for manual uploads before consumption:

```sql
CREATE TABLE build_uploads_staging (
  id VARCHAR(255) PRIMARY KEY,
  tenantId VARCHAR(255) NOT NULL,
  releaseId VARCHAR(255) NOT NULL,
  platform ENUM('ANDROID', 'IOS', 'WEB') NOT NULL,
  stage ENUM('PRE_REGRESSION', 'REGRESSION', 'PRE_RELEASE') NOT NULL,
  artifactPath VARCHAR(1024) NOT NULL,
  isUsed BOOLEAN DEFAULT FALSE,
  usedByTaskId VARCHAR(255) NULL,
  usedByCycleId VARCHAR(255) NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  FOREIGN KEY (usedByTaskId) REFERENCES release_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (usedByCycleId) REFERENCES regression_cycles(id) ON DELETE SET NULL
);
```

### `builds`

Final build records after consumption:

```sql
CREATE TABLE builds (
  id VARCHAR(255) PRIMARY KEY,
  tenantId VARCHAR(255) NOT NULL,
  releaseId VARCHAR(255) NOT NULL,
  regressionId VARCHAR(255) NULL,
  taskId VARCHAR(255) NULL,
  platform ENUM('ANDROID', 'IOS', 'WEB') NOT NULL,
  storeType VARCHAR(50),
  buildStage ENUM('KICKOFF', 'REGRESSION', 'PRE_RELEASE'),
  buildType ENUM('CI_CD', 'MANUAL') NOT NULL,
  buildNumber VARCHAR(50),
  queueLocation VARCHAR(1024),
  ciRunId VARCHAR(255),
  workflowStatus ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'),
  buildUploadStatus ENUM('PENDING', 'UPLOADING', 'UPLOADED', 'FAILED'),
  artifactPath VARCHAR(1024),
  -- ... other fields
);
```

---

## Contact

For questions or clarifications, contact the Release Orchestration team.

