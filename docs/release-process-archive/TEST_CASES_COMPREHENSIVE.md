# Release Process Test Cases - Comprehensive Guide

> **Last Updated:** 2024-12-XX  
> **Version:** 1.0  
> **Purpose:** Comprehensive test cases for all release process stages to ensure proper UI behavior and data handling

---

## Table of Contents

1. [Overview](#overview)
2. [Test Case Naming Convention](#test-case-naming-convention)
3. [Quick Reference Tables](#quick-reference-tables)
4. [Pre-Kickoff Stage Test Cases](#pre-kickoff-stage-test-cases)
5. [Kickoff Stage Test Cases](#kickoff-stage-test-cases)
6. [Regression Stage Test Cases](#regression-stage-test-cases)
7. [Post-Regression Stage Test Cases](#post-regression-stage-test-cases)
8. [Test Data Structure](#test-data-structure)
9. [Mock Data Generation Guide](#mock-data-generation-guide)

---

## Overview

This document defines comprehensive test cases for the Release Process UI across all stages. Each test case includes:

- **Test ID**: Unique identifier following naming convention
- **Scenario**: Description of the test scenario
- **Release State**: Required release configuration
- **Task States**: State of all tasks in the stage
- **Build States**: State of builds (for manual/CI-CD modes)
- **Expected UI Behavior**: What should be displayed/available

### Test Modes

- **Manual Mode** (`hasManualBuildUpload = true`): Users upload builds manually
- **CI/CD Mode** (`hasManualBuildUpload = false`): Builds triggered automatically via CI/CD

### Platform Variations

- **Android Only**: `platforms: ['ANDROID']`
- **iOS Only**: `platforms: ['IOS']`
- **Both Platforms**: `platforms: ['ANDROID', 'IOS']`

---

## Test Case Naming Convention

Format: `{STAGE}-{MODE}-{NUMBER}`

- **STAGE**: `PRE`, `KO` (Kickoff), `REG` (Regression), `POST` (Post-Regression)
- **MODE**: `M` (Manual), `C` (CI/CD), `P` (Platform variations)
- **NUMBER**: Sequential number (01, 02, etc.)

Examples:
- `PRE-1`: Pre-Kickoff test case 1
- `KO-M-1`: Kickoff Manual mode test case 1
- `REG-C-2`: Regression CI/CD mode test case 2
- `POST-P-1`: Post-Regression Platform variation test case 1

---

## Quick Reference Tables

### Pre-Kickoff Stage Test Cases

| ID | Scenario | Release State | Expected UI Behavior | Branch Name |
|---|---|---|---|---|
| **PRE-1** | Release just created | `phase: NOT_STARTED`, `status: UPCOMING` | Show PreKickoffStage with "Waiting for kickoff" | `test-pre-1-release-just-created` |
| **PRE-2** | Release with future kickoff date | `phase: NOT_STARTED`, `kickoffDate: future` | Show PreKickoffStage with countdown/date info | `test-pre-2-future-kickoff-date` |
| **PRE-3** | Release ready but not started | `phase: NOT_STARTED`, all config valid | Show PreKickoffStage, no actions available | `test-pre-3-ready-not-started` |

---

### Kickoff Stage Test Cases - Manual Mode

| ID | Scenario | Task States | Build States | Expected UI | Branch Name |
|---|---|---|---|---|---|
| **KO-M-1** | All tasks pending | All 4 tasks: `PENDING` | No builds | Show all tasks, no upload widgets | `test-ko-m-1-all-tasks-pending` |
| **KO-M-2** | Build task awaiting upload | `TRIGGER_PRE_REGRESSION_BUILDS: AWAITING_MANUAL_BUILD` | No builds in staging | Show upload widgets for all platforms | `test-ko-m-2-build-task-awaiting-upload` |
| **KO-M-3** | Partial builds uploaded | `TRIGGER_PRE_REGRESSION_BUILDS: AWAITING_MANUAL_BUILD` | Android uploaded, iOS missing | Show upload widget for iOS only | `test-ko-m-3-partial-builds-uploaded` |
| **KO-M-4** | All builds uploaded | `TRIGGER_PRE_REGRESSION_BUILDS: COMPLETED` | All platforms uploaded and consumed | No upload widgets, task completed | `test-ko-m-4-all-builds-uploaded` |
| **KO-M-5** | One task failed | `FORK_BRANCH: FAILED`, others `COMPLETED` | N/A | Show retry button on failed task | `test-ko-m-5-one-task-failed` |
| **KO-M-6** | All tasks completed | All 4 tasks: `COMPLETED` | All builds uploaded | Ready for auto-transition to Regression | `test-ko-m-6-all-tasks-completed` |

---

### Kickoff Stage Test Cases - CI/CD Mode

| ID | Scenario | Task States | Build States | Expected UI | Branch Name |
|---|---|---|---|---|---|
| **KO-C-1** | All tasks pending | All 4 tasks: `PENDING` | No builds | Show all tasks, no upload widgets | `test-ko-c-1-all-tasks-pending` |
| **KO-C-2** | Build task in progress | `TRIGGER_PRE_REGRESSION_BUILDS: AWAITING_CALLBACK` | Builds: `workflowStatus: RUNNING` | Show build status, no upload widgets | `test-ko-c-2-build-task-in-progress` |
| **KO-C-3** | Build task failed | `TRIGGER_PRE_REGRESSION_BUILDS: FAILED` | Builds: `workflowStatus: FAILED` | Show error, retry option | `test-ko-c-3-build-task-failed` |
| **KO-C-4** | All tasks completed | All 4 tasks: `COMPLETED` | All builds: `workflowStatus: COMPLETED` | Ready for auto-transition | `test-ko-c-4-all-tasks-completed` |

---

### Kickoff Stage Test Cases - Platform Variations

| ID | Scenario | Platforms | Expected Behavior | Branch Name |
|---|---|---|---|---|
| **KO-P-1** | Android only | `platforms: ['ANDROID']` | Upload widget shows only Android | `test-ko-p-1-android-only` |
| **KO-P-2** | iOS only | `platforms: ['IOS']` | Upload widget shows only iOS | `test-ko-p-2-ios-only` |
| **KO-P-3** | Both platforms | `platforms: ['ANDROID', 'IOS']` | Upload widgets for both | `test-ko-p-3-both-platforms` |

---

### Regression Stage Test Cases - Manual Mode

| ID | Scenario | Cycles | Current Cycle | Upcoming Slot | Available Builds | Expected UI | Branch Name |
|---|---|---|---|---|---|---|---|
| **REG-M-1** | First slot upcoming (no cycles) | `[]` | `null` | `[{date: future}]` | `[]` | Show upload widgets for all platforms | `test-reg-m-1-first-slot-upcoming` |
| **REG-M-2** | First slot active | `[{status: 'IN_PROGRESS'}]` | `cycle-1` | `null` | `[]` | Show current cycle, no upload widgets | `test-reg-m-2-first-slot-active` |
| **REG-M-3** | First completed, second upcoming | `[{status: 'DONE'}]` | `null` | `[{date: future}]` | `[]` | Show completed cycle + upload widgets | `test-reg-m-3-first-completed-second-upcoming` |
| **REG-M-4** | First completed, second active | `[{DONE}, {IN_PROGRESS}]` | `cycle-2` | `null` | `[]` | Show both cycles, no upload widgets | `test-reg-m-4-first-completed-second-active` |
| **REG-M-5** | Second upcoming, first completed | `[{status: 'DONE'}]` | `null` | `[{date: future}]` | `[]` | Show completed cycle + upload widgets | `test-reg-m-5-second-upcoming-first-completed` |
| **REG-M-6** | Slot time passed, builds not uploaded | `[{status: 'DONE'}]` | `null` | `[{date: past}]` | `[]` | Show upload widgets (window still open) | `test-reg-m-6-slot-time-passed-builds-not-uploaded` |
| **REG-M-7** | All cycles completed | `[{DONE}, {DONE}]` | `null` | `null` | `[]` | Show all cycles, no upload widgets, ready for approval | `test-reg-m-7-all-cycles-completed` |
| **REG-M-8** | Partial builds uploaded for next cycle | `[{status: 'DONE'}]` | `null` | `[{date: future}]` | `[{platform: 'ANDROID'}]` | Show upload widget for iOS only | `test-reg-m-8-partial-builds-uploaded-next-cycle` |
| **REG-M-9** | All builds uploaded for next cycle | `[{status: 'DONE'}]` | `null` | `[{date: future}]` | `[{ANDROID}, {IOS}]` | Show "All builds ready" message | `test-reg-m-9-all-builds-uploaded-next-cycle` |
| **REG-M-10** | Cycle abandoned | `[{status: 'ABANDONED'}]` | `null` | `[{date: future}]` | `[]` | Show abandoned cycle, upload widgets | `test-reg-m-10-cycle-abandoned` |
| **REG-M-11** | Android build failed in cycle | `IN_PROGRESS` | `cycle-1` | N/A | Android: `FAILED`, iOS: `UPLOADED` | Show cycle with failed build, retry option | `test-reg-m-11-android-build-failed` |
| **REG-M-12** | Both builds failed | `IN_PROGRESS` | `cycle-1` | N/A | Both: `FAILED` | Show cycle with both failed, retry options | `test-reg-m-12-both-builds-failed` |
| **REG-M-13** | One platform missing upload | `IN_PROGRESS` | `cycle-1` | N/A | Android: `UPLOADED`, iOS: missing | Show warning for missing platform | `test-reg-m-13-one-platform-missing` |
| **REG-M-14** | 3 cycles: done, active, upcoming | `[DONE, IN_PROGRESS, null]` | `cycle-2` | `[{date: future}]` | `[]` | Show all 3 states correctly | `test-reg-m-14-three-cycles-states` |
| **REG-M-15** | 5 past cycles, 1 active | `[DONE×5, IN_PROGRESS]` | `cycle-6` | `null` | `[]` | Show active + accordion for past cycles | `test-reg-m-15-many-past-cycles` |
| **REG-M-16** | All cycles completed (3 cycles) | `[DONE, DONE, DONE]` | `null` | `null` | `[]` | Show all in accordion, ready for approval | `test-reg-m-16-all-cycles-completed-three` |

---

### Regression Stage Test Cases - CI/CD Mode

| ID | Scenario | Cycles | Build States | Expected UI | Branch Name |
|---|---|---|---|---|---|
| **REG-C-1** | First cycle active | `[{status: 'IN_PROGRESS'}]` | Builds: `workflowStatus: RUNNING` | Show cycle, build status, no upload widgets | `test-reg-c-1-first-cycle-active` |
| **REG-C-2** | Build failed in cycle | `[{status: 'IN_PROGRESS'}]` | Android: `FAILED`, iOS: `RUNNING` | Show failed build, retry option | `test-reg-c-2-build-failed` |
| **REG-C-3** | All cycles completed | `[{DONE}, {DONE}]` | All builds: `COMPLETED` | Show cycles, ready for approval | `test-reg-c-3-all-cycles-completed` |
| **REG-C-4** | Multiple cycles with mixed states | `[DONE, IN_PROGRESS]` | Mixed build states | Show all cycles with correct states | `test-reg-c-4-multiple-cycles-mixed` |

---

### Post-Regression Stage Test Cases - Manual Mode

| ID | Scenario | Task States | Build States | Expected UI | Branch Name |
|---|---|---|---|---|---|
| **POST-M-1** | All tasks pending | All 4 tasks: `PENDING` | No builds | Show all tasks, no upload widgets | `test-post-m-1-all-tasks-pending` |
| **POST-M-2** | TestFlight task awaiting upload | `TRIGGER_TEST_FLIGHT_BUILD: AWAITING_MANUAL_BUILD` | No iOS build | Show upload widget for iOS | `test-post-m-2-testflight-awaiting-upload` |
| **POST-M-3** | AAB task awaiting upload | `CREATE_AAB_BUILD: AWAITING_MANUAL_BUILD` | No Android build | Show upload widget for Android | `test-post-m-3-aab-awaiting-upload` |
| **POST-M-4** | Both build tasks awaiting | Both build tasks: `AWAITING_MANUAL_BUILD` | No builds | Show upload widgets for both platforms | `test-post-m-4-both-build-tasks-awaiting` |
| **POST-M-5** | Partial builds uploaded | TestFlight: `IN_PROGRESS`, AAB: `AWAITING_MANUAL_BUILD` | iOS uploaded | Show upload widget for Android only | `test-post-m-5-partial-builds-uploaded` |
| **POST-M-6** | All tasks completed | All 4 tasks: `COMPLETED` | All builds uploaded | Show completion, ready for promotion | `test-post-m-6-all-tasks-completed` |
| **POST-M-7** | PM approval pending | All tasks: `COMPLETED`, `pmStatus.approved: false` | N/A | Show PM approval section, "Request Approval" button | `test-post-m-7-pm-approval-pending` |
| **POST-M-8** | PM approval granted | All tasks: `COMPLETED`, `pmStatus.approved: true` | N/A | Show PM approval status, ready for promotion | `test-post-m-8-pm-approval-granted` |
| **POST-M-9** | One task failed | `CREATE_RELEASE_TAG: FAILED` | N/A | Show retry button on failed task | `test-post-m-9-one-task-failed` |
| **POST-M-10** | Extra commits warning | `extraCommits.hasExtraCommits: true` | N/A | Show ExtraCommitsWarning component | `test-post-m-10-extra-commits-warning` |

---

### Post-Regression Stage Test Cases - CI/CD Mode

| ID | Scenario | Task States | Build States | Expected UI | Branch Name |
|---|---|---|---|---|---|
| **POST-C-1** | All tasks pending | All 4 tasks: `PENDING` | No builds | Show all tasks, no upload widgets | `test-post-c-1-all-tasks-pending` |
| **POST-C-2** | Build tasks in progress | Build tasks: `AWAITING_CALLBACK` | Builds: `workflowStatus: RUNNING` | Show build status, no upload widgets | `test-post-c-2-build-tasks-in-progress` |
| **POST-C-3** | Build tasks failed | Build tasks: `FAILED` | Builds: `workflowStatus: FAILED` | Show error, retry options | `test-post-c-3-build-tasks-failed` |
| **POST-C-4** | All tasks completed | All 4 tasks: `COMPLETED` | All builds: `COMPLETED` | Ready for promotion | `test-post-c-4-all-tasks-completed` |

---

### Post-Regression Stage Test Cases - Platform Variations

| ID | Scenario | Platforms | Expected Behavior | Branch Name |
|---|---|---|---|---|
| **POST-P-1** | Android only | `platforms: ['ANDROID']` | Show only AAB task, no TestFlight | `test-post-p-1-android-only` |
| **POST-P-2** | iOS only | `platforms: ['IOS']` | Show only TestFlight task, no AAB | `test-post-p-2-ios-only` |
| **POST-P-3** | Both platforms | `platforms: ['ANDROID', 'IOS']` | Show both build tasks | `test-post-p-3-both-platforms` |

---

## Pre-Kickoff Stage Test Cases

### PRE-1: Release Just Created

**Scenario**: Release has been created but kickoff hasn't started yet

**Release State**:
```json
{
  "phase": "NOT_STARTED",
  "status": "UPCOMING",
  "kickoffDate": null
}
```

**Expected UI**:
- Show `PreKickoffStage` component
- Display "Waiting for kickoff" message
- No actions available
- No tasks displayed

**Branch Name**: `test-pre-1-release-just-created`

---

### PRE-2: Release with Future Kickoff Date

**Scenario**: Release has a scheduled kickoff date in the future

**Release State**:
```json
{
  "phase": "NOT_STARTED",
  "status": "UPCOMING",
  "kickoffDate": "2024-12-25T10:00:00Z"
}
```

**Expected UI**:
- Show `PreKickoffStage` component
- Display kickoff date information
- Show countdown or date info
- No actions available

**Branch Name**: `test-pre-2-future-kickoff-date`

---

### PRE-3: Release Ready but Not Started

**Scenario**: Release configuration is complete and valid, but not yet kicked off

**Release State**:
```json
{
  "phase": "NOT_STARTED",
  "status": "UPCOMING",
  "branch": "release/v1.0.0",
  "platformTargetMappings": [
    {"platform": "ANDROID", "version": "1.0.0"},
    {"platform": "IOS", "version": "1.0.0"}
  ]
}
```

**Expected UI**:
- Show `PreKickoffStage` component
- Display release information
- No actions available until kickoff

**Branch Name**: `test-pre-3-ready-not-started`

---

## Kickoff Stage Test Cases

### Manual Mode

#### KO-M-1: All Tasks Pending

**Scenario**: Kickoff stage just started, all tasks are in pending state

**Release State**:
```json
{
  "phase": "KICKOFF",
  "hasManualBuildUpload": true,
  "platformTargetMappings": [
    {"platform": "ANDROID"},
    {"platform": "IOS"}
  ]
}
```

**Task States**:
- `FORK_BRANCH`: `PENDING`
- `CREATE_PROJECT_MANAGEMENT_TICKET`: `PENDING`
- `CREATE_TEST_SUITE`: `PENDING`
- `TRIGGER_PRE_REGRESSION_BUILDS`: `PENDING`

**Build States**: No builds in staging

**Expected UI**:
- Show all 4 tasks in pending state
- No upload widgets visible
- Tasks displayed in order

**Branch Name**: `test-ko-m-1-all-tasks-pending`

---

#### KO-M-2: Build Task Awaiting Upload

**Scenario**: Build task is waiting for manual uploads

**Task States**:
- `FORK_BRANCH`: `COMPLETED`
- `CREATE_PROJECT_MANAGEMENT_TICKET`: `COMPLETED`
- `CREATE_TEST_SUITE`: `COMPLETED`
- `TRIGGER_PRE_REGRESSION_BUILDS`: `AWAITING_MANUAL_BUILD`

**Build States**: No builds in staging table

**Expected UI**:
- Show upload widgets for both Android and iOS
- Build task shows "Awaiting manual build" status
- Other tasks show completed

**Branch Name**: `test-ko-m-2-build-task-awaiting-upload`

---

#### KO-M-3: Partial Builds Uploaded

**Scenario**: Android build uploaded, iOS still missing

**Task States**:
- `TRIGGER_PRE_REGRESSION_BUILDS`: `AWAITING_MANUAL_BUILD`

**Build States**:
```json
[
  {
    "platform": "ANDROID",
    "buildUploadStatus": "UPLOADED",
    "isUsed": false
  }
]
```

**Expected UI**:
- Show upload widget for iOS only
- Android widget should show "Uploaded" or be hidden
- Build task still shows "Awaiting manual build"

**Branch Name**: `test-ko-m-3-partial-builds-uploaded`

---

#### KO-M-4: All Builds Uploaded

**Scenario**: All required platform builds have been uploaded

**Task States**:
- `TRIGGER_PRE_REGRESSION_BUILDS`: `IN_PROGRESS`

**Build States**:
```json
[
  {
    "platform": "ANDROID",
    "buildUploadStatus": "UPLOADED",
    "isUsed": false
  },
  {
    "platform": "IOS",
    "buildUploadStatus": "UPLOADED",
    "isUsed": false
  }
]
```

**Expected UI**:
- No upload widgets visible (all platforms have builds)
- Build task shows "Completed"
- Builds visible in task.builds array with download links

**Branch Name**: `test-ko-m-4-all-builds-uploaded`

---

#### KO-M-5: One Task Failed

**Scenario**: Fork branch task failed, others completed

**Task States**:
- `FORK_BRANCH`: `FAILED`
- `CREATE_PROJECT_MANAGEMENT_TICKET`: `COMPLETED`
- `CREATE_TEST_SUITE`: `COMPLETED`
- `TRIGGER_PRE_REGRESSION_BUILDS`: `PENDING`

**Expected UI**:
- Failed task shows error message
- Retry button visible on failed task
- Other tasks show completed status

**Branch Name**: `test-ko-m-5-one-task-failed`

---

#### KO-M-6: All Tasks Completed

**Scenario**: All kickoff tasks completed, ready for regression

**Task States**:
- All 4 tasks: `COMPLETED`

**Build States**: All builds uploaded and used

**Expected UI**:
- All tasks show completed status
- Stage shows "Completed"
- Ready for auto-transition to Regression stage

**Branch Name**: `test-ko-m-6-all-tasks-completed`

---

### CI/CD Mode

#### KO-C-1: All Tasks Pending

**Scenario**: Kickoff stage just started in CI/CD mode

**Release State**:
```json
{
  "phase": "KICKOFF",
  "hasManualBuildUpload": false
}
```

**Task States**: All 4 tasks: `PENDING`

**Build States**: No builds created yet

**Expected UI**:
- Show all tasks in pending state
- No upload widgets (CI/CD mode)
- Tasks displayed in order

**Branch Name**: `test-ko-c-1-all-tasks-pending`

---

#### KO-C-2: Build Task In Progress

**Scenario**: Build task waiting for CI/CD callback

**Task States**:
- `TRIGGER_PRE_REGRESSION_BUILDS`: `AWAITING_CALLBACK`

**Build States**:
```json
[
  {
    "platform": "ANDROID",
    "buildType": "CI_CD",
    "workflowStatus": "RUNNING",
    "buildUploadStatus": "PENDING"
  },
  {
    "platform": "IOS",
    "buildType": "CI_CD",
    "workflowStatus": "RUNNING",
    "buildUploadStatus": "PENDING"
  }
]
```

**Expected UI**:
- Show build status for each platform
- No upload widgets
- Build task shows "Awaiting callback"

**Branch Name**: `test-ko-c-2-build-task-in-progress`

---

#### KO-C-3: Build Task Failed

**Scenario**: CI/CD build failed

**Task States**:
- `TRIGGER_PRE_REGRESSION_BUILDS`: `FAILED`

**Build States**:
```json
[
  {
    "platform": "ANDROID",
    "workflowStatus": "FAILED",
    "buildUploadStatus": "FAILED"
  }
]
```

**Expected UI**:
- Show error message
- Retry button available
- Build status shows failed

**Branch Name**: `test-ko-c-3-build-task-failed`

---

#### KO-C-4: All Tasks Completed

**Scenario**: All kickoff tasks completed in CI/CD mode

**Task States**: All 4 tasks: `COMPLETED`

**Build States**: All builds: `workflowStatus: COMPLETED`, `buildUploadStatus: UPLOADED`

**Expected UI**:
- All tasks show completed
- Ready for auto-transition to Regression

**Branch Name**: `test-ko-c-4-all-tasks-completed`

---

### Platform Variations

#### KO-P-1: Android Only

**Scenario**: Release configured for Android platform only

**Release State**:
```json
{
  "platformTargetMappings": [
    {"platform": "ANDROID", "version": "1.0.0"}
  ]
}
```

**Expected UI**:
- Upload widget shows only Android (in manual mode)
- Build task references only Android

**Branch Name**: `test-ko-p-1-android-only`

---

#### KO-P-2: iOS Only

**Scenario**: Release configured for iOS platform only

**Release State**:
```json
{
  "platformTargetMappings": [
    {"platform": "IOS", "version": "1.0.0"}
  ]
}
```

**Expected UI**:
- Upload widget shows only iOS (in manual mode)
- Build task references only iOS

**Branch Name**: `test-ko-p-2-ios-only`

---

#### KO-P-3: Both Platforms

**Scenario**: Release configured for both Android and iOS

**Release State**:
```json
{
  "platformTargetMappings": [
    {"platform": "ANDROID", "version": "1.0.0"},
    {"platform": "IOS", "version": "1.0.0"}
  ]
}
```

**Expected UI**:
- Upload widgets for both platforms (in manual mode)
- Build task references both platforms

**Branch Name**: `test-ko-p-3-both-platforms`

---

## Regression Stage Test Cases

### Manual Mode - Cycle States

#### REG-M-1: First Slot Upcoming (No Cycles)

**Scenario**: Kickoff completed, first regression slot is upcoming, no cycles exist yet

**Release State**:
```json
{
  "phase": "REGRESSION",
  "hasManualBuildUpload": true,
  "platformTargetMappings": [
    {"platform": "ANDROID"},
    {"platform": "IOS"}
  ]
}
```

**Cycles**: `[]`

**Current Cycle**: `null`

**Upcoming Slot**: `[{date: "2024-12-25T10:00:00Z"}]`

**Available Builds**: `[]`

**Expected UI**:
- Show "Next regression slot" alert with date
- Show upload widgets for all platforms (Android + iOS)
- No cycles displayed
- Message: "Upload builds to prepare for the next regression cycle"

**Branch Name**: `test-reg-m-1-first-slot-upcoming`

---

#### REG-M-2: First Slot Active

**Scenario**: First regression cycle is currently active

**Cycles**:
```json
[
  {
    "id": "cycle-1",
    "status": "IN_PROGRESS",
    "cycleTag": "RC1",
    "isLatest": true,
    "createdAt": "2024-12-20T10:00:00Z"
  }
]
```

**Current Cycle**: `cycle-1`

**Upcoming Slot**: `null`

**Available Builds**: `[]`

**Expected UI**:
- Show current cycle card with tasks
- No upload widgets (active cycle in progress)
- Cycle shows "In Progress" status

**Branch Name**: `test-reg-m-2-first-slot-active`

---

#### REG-M-3: First Completed, Second Upcoming

**Scenario**: First cycle completed, second slot is upcoming

**Cycles**:
```json
[
  {
    "id": "cycle-1",
    "status": "DONE",
    "cycleTag": "RC1",
    "isLatest": true,
    "createdAt": "2024-12-20T10:00:00Z",
    "completedAt": "2024-12-20T15:00:00Z"
  }
]
```

**Current Cycle**: `null`

**Upcoming Slot**: `[{date: "2024-12-25T10:00:00Z"}]`

**Available Builds**: `[]`

**Expected UI**:
- Show completed cycle (can be in accordion if past)
- Show upload widgets for all platforms
- Show "Next regression slot" alert
- Message: "Upload builds for next cycle"

**Branch Name**: `test-reg-m-3-first-completed-second-upcoming`

---

#### REG-M-4: First Completed, Second Active

**Scenario**: First cycle completed, second cycle is active

**Cycles**:
```json
[
  {
    "id": "cycle-1",
    "status": "DONE",
    "cycleTag": "RC1",
    "isLatest": false,
    "createdAt": "2024-12-20T10:00:00Z",
    "completedAt": "2024-12-20T15:00:00Z"
  },
  {
    "id": "cycle-2",
    "status": "IN_PROGRESS",
    "cycleTag": "RC2",
    "isLatest": true,
    "createdAt": "2024-12-25T10:00:00Z"
  }
]
```

**Current Cycle**: `cycle-2`

**Upcoming Slot**: `null`

**Available Builds**: `[]`

**Expected UI**:
- Show current active cycle (RC2)
- Show past cycles in accordion (RC1)
- No upload widgets (active cycle in progress)

**Branch Name**: `test-reg-m-4-first-completed-second-active`

---

#### REG-M-5: Second Upcoming, First Completed

**Scenario**: First cycle completed, second slot is upcoming (same as REG-M-3 but different wording)

**Cycles**: Same as REG-M-3

**Expected UI**: Same as REG-M-3

**Branch Name**: `test-reg-m-5-second-upcoming-first-completed`

---

#### REG-M-6: Slot Time Passed, Builds Not Uploaded

**Scenario**: Slot timing has passed, but builds for second slot haven't been uploaded yet

**Cycles**:
```json
[
  {
    "id": "cycle-1",
    "status": "DONE",
    "cycleTag": "RC1",
    "createdAt": "2024-12-20T10:00:00Z",
    "completedAt": "2024-12-20T15:00:00Z"
  }
]
```

**Current Cycle**: `null`

**Upcoming Slot**: `[{date: "2024-12-24T10:00:00Z"}]` (past date)

**Available Builds**: `[]`

**Expected UI**:
- Show upload widgets (window may still be open)
- Show completed cycle
- Alert about upcoming slot (even if time passed)

**Branch Name**: `test-reg-m-6-slot-time-passed-builds-not-uploaded`

---

#### REG-M-7: All Cycles Completed

**Scenario**: All regression cycles are completed, no upcoming slots

**Cycles**:
```json
[
  {
    "id": "cycle-1",
    "status": "DONE",
    "cycleTag": "RC1",
    "isLatest": false,
    "createdAt": "2024-12-20T10:00:00Z",
    "completedAt": "2024-12-20T15:00:00Z"
  },
  {
    "id": "cycle-2",
    "status": "DONE",
    "cycleTag": "RC2",
    "isLatest": true,
    "createdAt": "2024-12-25T10:00:00Z",
    "completedAt": "2024-12-25T15:00:00Z"
  }
]
```

**Current Cycle**: `null`

**Upcoming Slot**: `null`

**Available Builds**: `[]`

**Expected UI**:
- Show all cycles in accordion (past cycles)
- No upload widgets
- Approval section visible
- "Approve Regression" button enabled (if requirements met)

**Branch Name**: `test-reg-m-7-all-cycles-completed`

---

#### REG-M-8: Partial Builds Uploaded for Next Cycle

**Scenario**: First cycle completed, Android build uploaded for next cycle, iOS missing

**Cycles**: Same as REG-M-3

**Available Builds**:
```json
[
  {
    "platform": "ANDROID",
    "buildUploadStatus": "UPLOADED",
    "regressionId": null,
    "isUsed": false
  }
]
```

**Expected UI**:
- Show upload widget for iOS only
- Android should show "Uploaded" or be hidden
- Message: "Upload builds for next cycle"

**Branch Name**: `test-reg-m-8-partial-builds-uploaded-next-cycle`

---

#### REG-M-9: All Builds Uploaded for Next Cycle

**Scenario**: First cycle completed, all required builds uploaded for next cycle

**Cycles**: Same as REG-M-3

**Available Builds**:
```json
[
  {
    "platform": "ANDROID",
    "buildUploadStatus": "UPLOADED",
    "regressionId": null
  },
  {
    "platform": "IOS",
    "buildUploadStatus": "UPLOADED",
    "regressionId": null
  }
]
```

**Expected UI**:
- Show "All required builds have been uploaded" success message
- No upload widgets
- Message: "Builds are ready for the next cycle"

**Branch Name**: `test-reg-m-9-all-builds-uploaded-next-cycle`

---

#### REG-M-10: Cycle Abandoned

**Scenario**: First cycle was abandoned, second slot is upcoming

**Cycles**:
```json
[
  {
    "id": "cycle-1",
    "status": "ABANDONED",
    "cycleTag": "RC1",
    "isLatest": false,
    "createdAt": "2024-12-20T10:00:00Z"
  }
]
```

**Current Cycle**: `null`

**Upcoming Slot**: `[{date: "2024-12-25T10:00:00Z"}]`

**Available Builds**: `[]`

**Expected UI**:
- Show abandoned cycle in past cycles accordion
- Show upload widgets for next cycle
- Abandoned cycle shows "Abandoned" status badge

**Branch Name**: `test-reg-m-10-cycle-abandoned`

---

### Manual Mode - Build Failures

#### REG-M-11: Android Build Failed in Cycle

**Scenario**: Active cycle has Android build failed, iOS successful

**Cycles**:
```json
[
  {
    "id": "cycle-1",
    "status": "IN_PROGRESS",
    "cycleTag": "RC1"
  }
]
```

**Current Cycle**: `cycle-1`

**Build States**:
```json
[
  {
    "platform": "ANDROID",
    "regressionId": "cycle-1",
    "buildUploadStatus": "FAILED"
  },
  {
    "platform": "IOS",
    "regressionId": "cycle-1",
    "buildUploadStatus": "UPLOADED"
  }
]
```

**Expected UI**:
- Show cycle with failed Android build
- Retry option for failed build
- iOS build shows success

**Branch Name**: `test-reg-m-11-android-build-failed`

---

#### REG-M-12: Both Builds Failed

**Scenario**: Active cycle has both platform builds failed

**Cycles**: Same as REG-M-11

**Build States**: Both builds: `buildUploadStatus: FAILED`

**Expected UI**:
- Show cycle with both failed builds
- Retry options for both
- Error messages displayed

**Branch Name**: `test-reg-m-12-both-builds-failed`

---

#### REG-M-13: One Platform Missing Upload

**Scenario**: Active cycle missing one platform build upload

**Cycles**: Same as REG-M-11

**Build States**:
```json
[
  {
    "platform": "ANDROID",
    "regressionId": "cycle-1",
    "buildUploadStatus": "UPLOADED"
  }
  // iOS build missing
]
```

**Expected UI**:
- Show warning for missing iOS build
- Cycle shows incomplete status
- May show upload widget if window still open

**Branch Name**: `test-reg-m-13-one-platform-missing`

---

### Manual Mode - Multiple Cycles

#### REG-M-14: Three Cycles - Done, Active, Upcoming

**Scenario**: Three cycles: first done, second active, third upcoming

**Cycles**:
```json
[
  {
    "id": "cycle-1",
    "status": "DONE",
    "cycleTag": "RC1",
    "isLatest": false
  },
  {
    "id": "cycle-2",
    "status": "IN_PROGRESS",
    "cycleTag": "RC2",
    "isLatest": true
  }
]
```

**Current Cycle**: `cycle-2`

**Upcoming Slot**: `[{date: "2024-12-30T10:00:00Z"}]`

**Expected UI**:
- Show active cycle (RC2)
- Show past cycle in accordion (RC1)
- Show upcoming slot info
- No upload widgets (active cycle)

**Branch Name**: `test-reg-m-14-three-cycles-states`

---

#### REG-M-15: Five Past Cycles, One Active

**Scenario**: Many past cycles, one currently active

**Cycles**: 5 cycles with `status: DONE`, 1 with `status: IN_PROGRESS`

**Expected UI**:
- Show active cycle prominently
- Show past cycles in accordion (collapsed by default)
- Accordion shows count: "Past Cycles (5)"

**Branch Name**: `test-reg-m-15-many-past-cycles`

---

#### REG-M-16: All Cycles Completed (3 Cycles)

**Scenario**: Three regression cycles, all completed

**Cycles**: 3 cycles, all with `status: DONE`

**Current Cycle**: `null`

**Upcoming Slot**: `null`

**Expected UI**:
- Show all cycles in accordion
- No upload widgets
- Approval section visible
- Ready for approval

**Branch Name**: `test-reg-m-16-all-cycles-completed-three`

---

### CI/CD Mode

#### REG-C-1: First Cycle Active

**Scenario**: First regression cycle active in CI/CD mode

**Release State**:
```json
{
  "hasManualBuildUpload": false
}
```

**Cycles**:
```json
[
  {
    "id": "cycle-1",
    "status": "IN_PROGRESS",
    "cycleTag": "RC1"
  }
]
```

**Build States**:
```json
[
  {
    "platform": "ANDROID",
    "regressionId": "cycle-1",
    "buildType": "CI_CD",
    "workflowStatus": "RUNNING"
  },
  {
    "platform": "IOS",
    "regressionId": "cycle-1",
    "buildType": "CI_CD",
    "workflowStatus": "RUNNING"
  }
]
```

**Expected UI**:
- Show current cycle
- Show build status (running)
- No upload widgets (CI/CD mode)
- Build status indicators

**Branch Name**: `test-reg-c-1-first-cycle-active`

---

#### REG-C-2: Build Failed in Cycle

**Scenario**: CI/CD build failed in active cycle

**Cycles**: Same as REG-C-1

**Build States**:
```json
[
  {
    "platform": "ANDROID",
    "workflowStatus": "FAILED",
    "buildUploadStatus": "FAILED"
  },
  {
    "platform": "IOS",
    "workflowStatus": "RUNNING"
  }
]
```

**Expected UI**:
- Show failed build with error
- Retry option available
- Other builds show running status

**Branch Name**: `test-reg-c-2-build-failed`

---

#### REG-C-3: All Cycles Completed

**Scenario**: All regression cycles completed in CI/CD mode

**Cycles**: 2 cycles, both `status: DONE`

**Build States**: All builds: `workflowStatus: COMPLETED`

**Expected UI**:
- Show all cycles
- No upload widgets
- Ready for approval

**Branch Name**: `test-reg-c-3-all-cycles-completed`

---

#### REG-C-4: Multiple Cycles with Mixed States

**Scenario**: Multiple cycles with various build states

**Cycles**: Mix of `DONE` and `IN_PROGRESS` cycles

**Build States**: Mixed `COMPLETED`, `RUNNING`, `FAILED`

**Expected UI**:
- Show all cycles with correct states
- Build status indicators for each
- No upload widgets

**Branch Name**: `test-reg-c-4-multiple-cycles-mixed`

---

## Post-Regression Stage Test Cases

### Manual Mode

#### POST-M-1: All Tasks Pending

**Scenario**: Post-regression stage just started, all tasks pending

**Task States**:
- `TRIGGER_TEST_FLIGHT_BUILD`: `PENDING`
- `CREATE_AAB_BUILD`: `PENDING`
- `CREATE_RELEASE_TAG`: `PENDING`
- `CREATE_FINAL_RELEASE_NOTES`: `PENDING`

**Expected UI**:
- Show all 4 tasks in pending state
- No upload widgets yet

**Branch Name**: `test-post-m-1-all-tasks-pending`

---

#### POST-M-2: TestFlight Task Awaiting Upload

**Scenario**: TestFlight build task waiting for iOS build upload

**Task States**:
- `TRIGGER_TEST_FLIGHT_BUILD`: `AWAITING_MANUAL_BUILD`
- Other tasks: `PENDING`

**Build States**: No iOS build in staging

**Expected UI**:
- Show upload widget for iOS (TestFlight)
- Task shows "Awaiting manual build"

**Branch Name**: `test-post-m-2-testflight-awaiting-upload`

---

#### POST-M-3: AAB Task Awaiting Upload

**Scenario**: AAB build task waiting for Android build upload

**Task States**:
- `CREATE_AAB_BUILD`: `AWAITING_MANUAL_BUILD`
- Other tasks: `PENDING`

**Build States**: No Android build in staging

**Expected UI**:
- Show upload widget for Android (AAB)
- Task shows "Awaiting manual build"

**Branch Name**: `test-post-m-3-aab-awaiting-upload`

---

#### POST-M-4: Both Build Tasks Awaiting

**Scenario**: Both TestFlight and AAB tasks waiting for uploads

**Task States**:
- `TRIGGER_TEST_FLIGHT_BUILD`: `AWAITING_MANUAL_BUILD`
- `CREATE_AAB_BUILD`: `AWAITING_MANUAL_BUILD`
- Other tasks: `PENDING`

**Build States**: No builds in staging

**Expected UI**:
- Show upload widgets for both iOS and Android
- Both build tasks show "Awaiting manual build"

**Branch Name**: `test-post-m-4-both-build-tasks-awaiting`

---

#### POST-M-5: Partial Builds Uploaded

**Scenario**: TestFlight build uploaded, AAB still waiting

**Task States**:
- `TRIGGER_TEST_FLIGHT_BUILD`: `IN_PROGRESS`
- `CREATE_AAB_BUILD`: `AWAITING_MANUAL_BUILD`

**Build States**:
```json
[
  {
    "platform": "IOS",
    "buildUploadStatus": "UPLOADED",
    "isUsed": false
  }
]
```

**Expected UI**:
- Show upload widget for Android only
- iOS task shows "In Progress"
- Android task shows "Awaiting manual build"

**Branch Name**: `test-post-m-5-partial-builds-uploaded`

---

#### POST-M-6: All Tasks Completed

**Scenario**: All post-regression tasks completed

**Task States**: All 4 tasks: `COMPLETED`

**Build States**: All builds uploaded and used

**Expected UI**:
- All tasks show completed
- Show "Ready for Distribution" card
- "Complete Post-Regression" button enabled

**Branch Name**: `test-post-m-6-all-tasks-completed`

---

#### POST-M-7: PM Approval Pending

**Scenario**: All tasks completed but PM approval not granted

**Task States**: All tasks: `COMPLETED`

**PM Status**:
```json
{
  "approved": false,
  "allTicketsDone": false
}
```

**Expected UI**:
- Show PM approval section
- "Request Approval" button visible
- "Complete Post-Regression" button disabled
- Show approval status

**Branch Name**: `test-post-m-7-pm-approval-pending`

---

#### POST-M-8: PM Approval Granted

**Scenario**: All tasks completed and PM approval granted

**Task States**: All tasks: `COMPLETED`

**PM Status**:
```json
{
  "approved": true,
  "allTicketsDone": true
}
```

**Expected UI**:
- Show PM approval status (approved)
- "Complete Post-Regression" button enabled
- Ready for promotion

**Branch Name**: `test-post-m-8-pm-approval-granted`

---

#### POST-M-9: One Task Failed

**Scenario**: Create release tag task failed

**Task States**:
- `CREATE_RELEASE_TAG`: `FAILED`
- Other tasks: `COMPLETED`

**Expected UI**:
- Failed task shows error
- Retry button on failed task
- Other tasks show completed

**Branch Name**: `test-post-m-9-one-task-failed`

---

#### POST-M-10: Extra Commits Warning

**Scenario**: Extra commits detected after release branch creation

**Extra Commits**:
```json
{
  "hasExtraCommits": true,
  "extraCommits": [
    {"commitId": "abc123", "message": "Fix bug"}
  ]
}
```

**Expected UI**:
- Show `ExtraCommitsWarning` component
- Display list of extra commits
- "Acknowledge" or "Proceed" button

**Branch Name**: `test-post-m-10-extra-commits-warning`

---

### CI/CD Mode

#### POST-C-1: All Tasks Pending

**Scenario**: Post-regression stage just started in CI/CD mode

**Release State**: `hasManualBuildUpload: false`

**Task States**: All 4 tasks: `PENDING`

**Expected UI**:
- Show all tasks
- No upload widgets

**Branch Name**: `test-post-c-1-all-tasks-pending`

---

#### POST-C-2: Build Tasks In Progress

**Scenario**: Build tasks waiting for CI/CD callback

**Task States**:
- `TRIGGER_TEST_FLIGHT_BUILD`: `AWAITING_CALLBACK`
- `CREATE_AAB_BUILD`: `AWAITING_CALLBACK`

**Build States**:
```json
[
  {
    "platform": "IOS",
    "buildType": "CI_CD",
    "workflowStatus": "RUNNING"
  },
  {
    "platform": "ANDROID",
    "buildType": "CI_CD",
    "workflowStatus": "RUNNING"
  }
]
```

**Expected UI**:
- Show build status for each platform
- No upload widgets
- Tasks show "Awaiting callback"

**Branch Name**: `test-post-c-2-build-tasks-in-progress`

---

#### POST-C-3: Build Tasks Failed

**Scenario**: CI/CD builds failed

**Task States**:
- `TRIGGER_TEST_FLIGHT_BUILD`: `FAILED`
- `CREATE_AAB_BUILD`: `FAILED`

**Build States**: All builds: `workflowStatus: FAILED`

**Expected UI**:
- Show error messages
- Retry options
- Build status shows failed

**Branch Name**: `test-post-c-3-build-tasks-failed`

---

#### POST-C-4: All Tasks Completed

**Scenario**: All post-regression tasks completed in CI/CD mode

**Task States**: All 4 tasks: `COMPLETED`

**Build States**: All builds: `workflowStatus: COMPLETED`

**Expected UI**:
- All tasks completed
- Ready for promotion

**Branch Name**: `test-post-c-4-all-tasks-completed`

---

### Platform Variations

#### POST-P-1: Android Only

**Scenario**: Release configured for Android only

**Release State**:
```json
{
  "platformTargetMappings": [
    {"platform": "ANDROID"}
  ]
}
```

**Expected UI**:
- Show only AAB build task
- No TestFlight task
- Upload widget for Android only (manual mode)

**Branch Name**: `test-post-p-1-android-only`

---

#### POST-P-2: iOS Only

**Scenario**: Release configured for iOS only

**Release State**:
```json
{
  "platformTargetMappings": [
    {"platform": "IOS"}
  ]
}
```

**Expected UI**:
- Show only TestFlight build task
- No AAB task
- Upload widget for iOS only (manual mode)

**Branch Name**: `test-post-p-2-ios-only`

---

#### POST-P-3: Both Platforms

**Scenario**: Release configured for both platforms

**Release State**:
```json
{
  "platformTargetMappings": [
    {"platform": "ANDROID"},
    {"platform": "IOS"}
  ]
}
```

**Expected UI**:
- Show both build tasks
- Upload widgets for both (manual mode)

**Branch Name**: `test-post-p-3-both-platforms`

---

## Test Data Structure

### Release Object Structure

```typescript
interface TestRelease {
  id: string;                    // Unique release ID
  branch: string;                // Branch name (test case identifier)
  phase: Phase;                  // Current phase
  status: ReleaseStatus;         // Release status
  hasManualBuildUpload: boolean; // Manual vs CI/CD mode
  platformTargetMappings: Array<{
    platform: Platform;
    version: string;
  }>;
  kickoffDate?: string;          // ISO 8601
  targetReleaseDate?: string;    // ISO 8601
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### Task Object Structure

```typescript
interface TestTask {
  id: string;
  taskId: string;
  taskType: TaskType;
  stage: TaskStage;
  taskStatus: TaskStatus;
  taskConclusion: TaskConclusion;
  regressionId?: string;         // For regression tasks
  createdAt: string;
  updatedAt: string;
}
```

### Cycle Object Structure

```typescript
interface TestCycle {
  id: string;
  releaseId: string;
  status: RegressionCycleStatus;
  cycleTag: string | null;
  isLatest: boolean;
  createdAt: string;
  completedAt: string | null;
}
```

### Build Object Structure

```typescript
interface TestBuild {
  id: string;
  platform: Platform;
  buildType: 'MANUAL' | 'CI_CD';
  buildUploadStatus: 'PENDING' | 'UPLOADED' | 'FAILED';
  workflowStatus?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  regressionId?: string;         // For regression builds
  taskId?: string;               // For stage builds
  isUsed?: boolean;              // For staging builds
  artifactPath?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Mock Data Generation Guide

### Step 1: Create Base Release

For each test case, create a release with:
- Unique `id` (UUID)
- `branch` matching test case branch name
- Appropriate `phase` and `status`
- `hasManualBuildUpload` flag set correctly
- `platformTargetMappings` based on test case

### Step 2: Create Tasks

Create tasks based on stage:
- **Kickoff**: 4 tasks (FORK_BRANCH, CREATE_PROJECT_MANAGEMENT_TICKET, CREATE_TEST_SUITE, TRIGGER_PRE_REGRESSION_BUILDS)
- **Regression**: 4 tasks per cycle (RESET_TEST_SUITE, CREATE_RC_TAG, CREATE_RELEASE_NOTES, TRIGGER_REGRESSION_BUILDS)
- **Post-Regression**: 4 tasks (TRIGGER_TEST_FLIGHT_BUILD, CREATE_AAB_BUILD, CREATE_RELEASE_TAG, CREATE_FINAL_RELEASE_NOTES)

Set `taskStatus` according to test case scenario.

### Step 3: Create Cycles (Regression Only)

For regression test cases:
- Create cycles with appropriate `status`
- Set `isLatest` flag correctly
- Link tasks to cycles via `regressionId`

### Step 4: Create Builds

For manual mode:
- Create builds in `buildUploadsStaging` table
- Set `isUsed: false` for available builds
- Set `regressionId` for cycle builds
- Set `taskId` for stage builds

For CI/CD mode:
- Create builds in `builds` table
- Set `workflowStatus` and `buildUploadStatus`
- Link to cycles/tasks appropriately

### Step 5: Set Upcoming Slots (Regression)

For regression test cases with upcoming slots:
- Ensure `upcomingSlot` array in regression stage response
- Set dates appropriately (future for upcoming, past for passed)

### Step 6: Set Approval Status (Regression)

For regression test cases:
- Set `approvalStatus.canApprove` based on requirements
- Set `approvalRequirements` flags appropriately

### Step 7: Set PM Status (Post-Regression)

For post-regression test cases:
- Set `pmStatus.approved` flag
- Set `pmStatus.allTicketsDone` flag

---

## Test Case Summary

| Stage | Manual Mode | CI/CD Mode | Platform Variations | Total |
|-------|-------------|------------|---------------------|-------|
| Pre-Kickoff | 3 | - | - | 3 |
| Kickoff | 6 | 4 | 3 | 13 |
| Regression | 16 | 4 | - | 20 |
| Post-Regression | 10 | 4 | 3 | 17 |
| **Total** | **35** | **12** | **6** | **53** |

---

## Next Steps

1. **Generate Mock Data**: Create JSON files for each test case
2. **Update Mock Server**: Add test releases to `mock-server/data/db.json`
3. **Verify UI**: Test each scenario in the UI
4. **Document Issues**: Track any discrepancies between expected and actual behavior

---

**Note**: This document will be updated as test cases are implemented and verified.

