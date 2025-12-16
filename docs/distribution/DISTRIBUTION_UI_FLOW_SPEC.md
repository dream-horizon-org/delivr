# Distribution Module - Complete UI Flow Specification

**Document Version**: 2.0  
**Last Updated**: December 15, 2025  
**Status**: ✅ Production Ready - Aligned with API Spec  
**Holy Grail Reference**: `DISTRIBUTION_API_SPEC.md`

**Known Limitation:**
- 🔴 **Rejection Details**: Backend not yet implemented - UI shows generic "Submission was rejected by the store" message
- ✅ All other features working as designed (artifacts, action history, releaseId usage)

---

## ⚡ Critical Architecture (FINAL - API-ALIGNED)

### 1. TWO SEPARATE MODULES (MOST IMPORTANT!)

```
┌───────────────────────────────────────────────────────────────┐
│ SIDEBAR STRUCTURE                                              │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ 📦 RELEASE MANAGEMENT MODULE                                   │
│    ├─ Release Dashboard                                        │
│    ├─ Releases List → Open Release                            │
│    │   └─ Route: /releases/{releaseId}?tab=distribution       │
│    │      └─ Distribution Tab: Submit + Monitor (LIMITED)     │
│    ├─ Configurations                                           │
│    └─ Workflows                                                │
│                                                                │
│ 🚀 DISTRIBUTION MANAGEMENT MODULE (SEPARATE SIBLING!)          │
│    ├─ Distributions List                                       │
│    │   └─ Route: /distributions                               │
│    └─ Distribution Management                                  │
│        └─ Route: /distributions/{distributionId}              │
│           └─ Full Management Page (COMPLETE CONTROL)          │
│                                                                │
│ ❗ These are TWO SEPARATE MODULES, not nested!                 │
│ ❗ Distribution routes use distributionId (not releaseId)      │
└───────────────────────────────────────────────────────────────┘
```

### 2. Distribution Lifecycle (5 States)

**From API Spec:**
```
PENDING → PARTIALLY_SUBMITTED → SUBMITTED → PARTIALLY_RELEASED → RELEASED
```

**Submission Lifecycle (8 States, Platform-Specific):**
```
PENDING → IN_REVIEW → APPROVED → LIVE
             ↓            ↓          ↓
         REJECTED     REJECTED    PAUSED (iOS phased only)
             ↓            ↓          ↓
         CANCELLED    CANCELLED   HALTED (emergency stop)
```

### 3. Auto-Created Submissions (CRITICAL!)

**From API Spec (Lines 15-27):**
```
1. Pre-Release Completes
   ↓
2. Backend AUTO-CREATES distribution entry (status: PENDING)
   ↓
3. Backend AUTO-CREATES submission entries (one per platform, status: PENDING)
   ↓
4. User navigates to Distribution Tab
   ↓
5. User submits to stores (updates submission from PENDING → IN_REVIEW)
```

**Key Points:**
- ✅ Submissions are **already created** with PENDING status
- ✅ User **fills in details** and **submits** existing submission
- ✅ API: `PUT /api/v1/submissions/:submissionId/submit`
- ❌ NOT creating new submissions for first-time submit

### 4. Release Page Distribution Tab (LIMITED)

```
Route: /dashboard/{org}/releases/{releaseId}?tab=distribution
Purpose: Submit + Monitor during release process

✅ CAN DO:
  • Submit to stores (first time) - updates PENDING submission
  • View submission status (manual refresh)
  • See if rejected/accepted

❌ CANNOT DO:
  • Rollout control (no slider)
  • Retry submission (resubmission)
  • Pause/Resume/Halt
  • View history
  • ANY management actions

→ Link: "Open in Distribution Management" 
   Navigates to: /distributions/{distributionId}
```

### 5. Distribution Management Page (FULL)

```
Route: /dashboard/{org}/distributions/{distributionId}
Purpose: Complete distribution management

✅ CAN DO EVERYTHING:
  • Submit to stores (if still PENDING)
  • View submission status
  • Rollout control (slider, update %)
  • Resubmission (if rejected) - creates NEW submission
  • Pause/Resume/Halt rollout
  • View complete history
  • ALL management actions

Entry Criteria: Distribution exists (created after pre-release)
Uses: distributionId as primary identifier
```

### 6. Complete Route Structure

**Route 1: Release Management (LIMITED)**
```
/dashboard/{org}/releases/{releaseId}?tab=distribution

Components:
├─ Stepper (shows stages)
├─ Distribution tab content
└─ Limited actions (submit + monitor only)
```

**Route 2: Distribution List**
```
/dashboard/{org}/distributions

Shows: ALL distributions across all releases
Empty State: No distributions yet (no release completed pre-release)
Click entry → Navigate to Route 3
```

**Route 3: Distribution Management (FULL)**
```
/dashboard/{org}/distributions/{distributionId}

Primary Key: distributionId (NOT releaseId)
Has: distribution.releaseId as reference field
Shows: Complete management for ONE distribution
```

---

## 📋 Table of Contents

1. [Entry Points & Navigation](#1-entry-points--navigation)
2. [Complete User Journeys](#2-complete-user-journeys)
3. [Pre-Release Stage Flow](#3-pre-release-stage-flow)
4. [Distribution Stage Flow](#4-distribution-stage-flow)
5. [Distribution Management Module](#5-distribution-management-module)
6. [Detailed UI States](#6-detailed-ui-states)
7. [Action Matrix](#7-action-matrix)
8. [Error Resolution Flows](#8-error-resolution-flows)
9. [Platform-Specific Rules](#9-platform-specific-rules)

---

## 1. Entry Points & Navigation

### 1.1 Two SEPARATE Modules (Siblings)

```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR STRUCTURE                                            │
│                                                              │
│ 📦 RELEASE MANAGEMENT MODULE                                 │
│    ├─ Release Dashboard                                      │
│    ├─ Releases List                                          │
│    ├─ Configurations                                         │
│    └─ Workflows                                              │
│                                                              │
│ 🚀 DISTRIBUTION MANAGEMENT MODULE (SEPARATE!)                │
│    └─ Distributions List                                     │
│                                                              │
│ These are SIBLING modules, not nested!                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Release Management Module

```
┌─────────────────────────────────────────────────────────────┐
│ RELEASE MANAGEMENT → Open Release                            │
│ Route: /dashboard/{org}/releases/{releaseId}                │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Stepper: [Pending] [Pre-Release] [Distribution]       │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ Tab: Distribution (?tab=distribution)                        │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ LIMITED VIEW:                                          │ │
│ │ ✅ Submit PENDING submissions (first time)             │ │
│ │ ✅ Monitor status (read-only)                          │ │
│ │ ❌ NO management actions                               │ │
│ │                                                         │ │
│ │ [Open in Distribution Management] ──┐                  │ │
│ │  (Link to full management)           │                 │ │
│ └──────────────────────────────────────┼─────────────────┘ │
└────────────────────────────────────────┼───────────────────┘
                                         │
                                         ↓
┌─────────────────────────────────────────────────────────────┐
│ DISTRIBUTION MANAGEMENT MODULE (SEPARATE PAGE)               │
│ Route: /dashboard/{org}/distributions/{distributionId}     │
│                                                              │
│ FULL MANAGEMENT VIEW:                                        │
│ ✅ Submit PENDING submissions                                │
│ ✅ Monitor status                                            │
│ ✅ Rollout control (slider, update percentage)              │
│ ✅ Resubmission (if rejected) - creates NEW submission      │
│ ✅ Pause/Resume/Halt                                         │
│ ✅ View history                                              │
│ ✅ ALL management actions                                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Distribution Management Module

```
┌─────────────────────────────────────────────────────────────┐
│ DISTRIBUTION MANAGEMENT → Distributions List                 │
│ Route: /dashboard/{org}/distributions                       │
│                                                              │
│ Shows: ALL distributions across all releases                 │
│ ├─ Backend auto-creates distribution after pre-release     │
│ ├─ Backend auto-creates submissions (PENDING status)       │
│ └─ If no releases completed → Shows empty state            │
│                                                              │
│ Empty State Triggers:                                        │
│ ❌ No distribution created yet                               │
│ ❌ No release completed pre-release                          │
│                                                              │
│ Click entry → Navigate to:                                   │
│ /dashboard/{org}/distributions/{distributionId}            │
│ (Full management page - uses distributionId)                │
└─────────────────────────────────────────────────────────────┘
```

**Critical Distinction:**

| Aspect | Release Management Module | Distribution Management Module |
|--------|---------------------------|--------------------------------|
| **Route** | `/releases/{id}?tab=distribution` | `/distributions/{distributionId}` |
| **Module Type** | Part of Release Management | **SEPARATE MODULE** (sibling) |
| **Primary Key** | releaseId | **distributionId** |
| **Purpose** | Complete release process | Dedicated distribution management |
| **Scope** | Single release (sequential flow) | All distributions (cross-release) |
| **Capabilities** | ✅ Submit PENDING<br>✅ Monitor<br>❌ NO management | ✅ Submit PENDING<br>✅ Monitor<br>✅ **FULL management** |
| **Navigation** | Tab within release page | Separate page via sidebar |

---

## 2. Complete User Journeys

### Journey 1: Manual Build (Happy Path)

```
START: Release in PRE_RELEASE status
│
├─ ENTRY: Click release → Stepper shows "Pre-Release" active
│   URL: /releases/{id}?tab=pre-release
│
├─ STEP 1: Upload AAB (Android)
│   ├─ Click "Upload AAB" button
│   ├─ File picker opens
│   ├─ Select .aab file (max 200MB)
│   ├─ Upload progress bar
│   ├─ Success: Shows "Internal Testing Link"
│   └─ Android build card turns GREEN
│
├─ STEP 2: Verify TestFlight (iOS)
│   ├─ Enter TestFlight build number (e.g., "17965")
│   ├─ Enter version name (e.g., "2.5.0")
│   ├─ Click "Verify"
│   ├─ API validates with App Store Connect
│   ├─ Success: Shows "TestFlight Link"
│   └─ iOS build card turns GREEN
│
├─ STEP 3: PM Approval (Required Gate)
│   ├─ If Jira integrated: Shows Jira ticket status
│   │   ├─ Status "DONE" → Auto-approved ✅
│   │   └─ Status "IN_PROGRESS" → Waiting ⏳
│   └─ If NO integration: Shows "Manual Approval" button
│       ├─ Click "Approve Release"
│       ├─ Dialog: Add comments (optional)
│       └─ Confirm → Approval granted ✅
│
├─ BACKEND AUTO-ACTIONS (User doesn't see this):
│   ├─ Creates distribution entry (status: PENDING)
│   ├─ Creates Android submission (status: PENDING)
│   └─ Creates iOS submission (status: PENDING)
│
├─ STEP 4: Navigate to Distribution Tab
│   ├─ All checks pass → "Go to Distribution" button ENABLED
│   ├─ Click button OR click Distribution step in stepper
│   ├─ URL changes: ?tab=distribution (SAME PAGE)
│   └─ Tab content switches to distribution
│
└─ DISTRIBUTION TAB CONTENT (see Journey 2)
```

### Journey 2: Submit to Stores (First Submission)

```
START: Just switched to Distribution tab (on release page)
URL: /releases/{id}?tab=distribution
PAGE: Still on Release Details Page (just different tab content)
│
├─ INITIAL STATE: Submissions exist in PENDING state
│   ├─ Stepper above: Shows "Distribution" as active step
│   ├─ Tab content shows: "Ready to Submit"
│   ├─ Shows: Submission cards with PENDING status
│   │   ├─ 🔵 Android - PENDING (Ready to Submit)
│   │   └─ 🔵 iOS - PENDING (Ready to Submit)
│   └─ Shows: "Submit to Stores" button (prominent)
│
├─ STEP 1: Click "Submit to Stores"
│   └─ Opens: SubmitToStoresDialog (modal)
│
├─ STEP 2: Configure Submission
│   │
│   ├─ Platform Selection
│   │   ├─ ☑ Android (checked by default if PENDING)
│   │   └─ ☑ iOS (checked by default if PENDING)
│   │
│   ├─ Android Options (if selected)
│   │   ├─ Track: [Internal | Alpha | Beta | Production] (default: Production)
│   │   ├─ Initial Rollout: Slider [0% - 100%] (supports decimals)
│   │   ├─ Priority: [0-5] (default: 0)
│   │   └─ Release Notes: Textarea (editable)
│   │
│   └─ iOS Options (if selected)
│       ├─ Release Type: "AFTER_APPROVAL" (read-only, always AFTER_APPROVAL)
│       ├─ Phased Release: Checkbox (default: checked)
│       ├─ Reset Rating: Checkbox (default: unchecked)
│       └─ Release Notes: Textarea (editable)
│
├─ STEP 3: Click "Submit"
│   ├─ For each selected platform:
│   │   ├─ API: PUT /api/v1/submissions/{submissionId}/submit
│   │   └─ Updates existing PENDING submission
│   └─ Three possible outcomes:
│
│   ├─ OUTCOME A: Success (200)
│   │   ├─ Dialog closes
│   │   ├─ Toast: "Submitted successfully"
│   │   ├─ Page reloads/revalidates
│   │   └─ Shows: Submission cards (status: IN_REVIEW)
│   │
│   ├─ OUTCOME B: Version Conflict (409 - VERSION_EXISTS)
│   │   ├─ Dialog closes
│   │   ├─ Opens: VersionConflictDialog
│   │   ├─ Shows:
│   │   │   ├─ "Version 2.5.0 already exists in Play Store (LIVE)"
│   │   │   └─ Resolution options:
│   │   │       ├─ Option 1: "Create new release (v2.5.1)" [Recommended]
│   │   │       └─ Option 2: "Delete draft" (only if status=DRAFT)
│   │   ├─ User selects option
│   │   └─ Navigate to appropriate action
│   │
│   └─ OUTCOME C: Exposure Conflict (409 - EXPOSURE_CONTROL_CONFLICT)
│       ├─ Dialog closes
│       ├─ Opens: ExposureControlDialog
│       ├─ Shows:
│       │   ├─ "Previous release v2.4.0 has active rollout at 25%"
│       │   └─ Resolution options:
│       │       ├─ Option 1: "Complete previous to 100% first" [Recommended]
│       │       ├─ Option 2: "Halt previous release"
│       │       └─ Option 3: "Proceed anyway (advanced)"
│       ├─ User selects option
│       └─ Execute selected action → Retry submission
│
└─ NEXT: Monitor Submissions (see Journey 3)
```

### Journey 3: Monitor Submission Status (Release Page - LIMITED VIEW)

**Context**: Just submitted, monitoring from Release Distribution tab (READ-ONLY)

```
START: Just submitted (monitoring from release page)
URL: /releases/{id}?tab=distribution
CONTEXT: Release Page Distribution Tab (LIMITED VIEW)
│
├─ INITIAL STATE: Shows Submission Status Cards (READ-ONLY)
│   │
│   ├─ Android Submission Card (Simplified)
│   │   ├─ Platform icon + version
│   │   ├─ Status badge (colored)
│   │   ├─ Current status text
│   │   ├─ Submission timestamp
│   │   └─ NO action buttons (read-only)
│   │
│   └─ iOS Submission Card (Simplified)
│       ├─ Platform icon + version
│       ├─ Status badge (colored)
│       ├─ Current status text
│       ├─ Submission timestamp
│       └─ NO action buttons (read-only)
│
├─ STATE 1: IN_REVIEW
│   ├─ Status badge: 🟡 Yellow "In Review"
│   ├─ Shows: "Submitted to store, awaiting approval"
│   ├─ Shows: Submission timestamp
│   ├─ Refresh: Manual (page focus) or refresh button
│   └─ Actions: ❌ NONE
│       └─ Message: "Manage this submission from Distribution Management"
│       └─ Link: [Open in Distribution Management]
│
├─ STATE 2: REJECTED
│   ├─ Status badge: 🔴 Red "Rejected"
│   ├─ Shows: Rejection reason (summary only)
│   ├─ Shows: Submission timestamp
│   └─ Actions: ❌ NONE
│       └─ Message: "Go to Distribution Management to re-submit"
│       └─ Link: [Open in Distribution Management]
│
├─ STATE 3: APPROVED or LIVE (Rolling Out)
│   ├─ Status badge: 🟢 Green "Approved" or "Live"
│   ├─ Shows: Current rollout % (e.g., "25%")
│   ├─ Shows: Rollout progress bar (read-only, no interaction)
│   ├─ Shows: Last updated timestamp
│   └─ Actions: ❌ NONE
│       └─ Message: "Manage rollout from Distribution Management"
│       └─ Link: [Open in Distribution Management]
│
└─ STATE 4: LIVE (100% Complete)
    ├─ Status badge: 🔵 Blue "Live"
    ├─ Shows: "100% Live"
    ├─ Shows: Completion timestamp
    ├─ If ALL platforms 100% → Shows: ReleaseCompleteView 🎉
    └─ Actions: ❌ NONE (terminal state, read-only)
```

**CRITICAL NOTES**:
- ❗ **NO ACTION BUTTONS** on release page distribution tab
- ❗ **NO Rollout Controls** (slider, pause, halt buttons)
- ❗ **NO ReSubmission Dialog** (can't retry from here)
- ❗ **READ-ONLY VIEW** - just status monitoring
- ✅ **Links to Distribution Management** for all actions
- ✅ **Manual refresh** or auto-refresh on page focus

### Journey 4: Managing Existing Submissions (From Distribution Management)

**Context**: Complete management from Distribution Management module

```
START: User wants to manage submissions
│
├─ ENTRY METHOD A: From Distribution Management Sidebar (Primary)
│   ├─ Sidebar → Click "Distributions" (separate module)
│   ├─ URL: /dashboard/{org}/distributions
│   ├─ See list of all distributions
│   │   ├─ v2.5.0 - Rolling Out (Android: 25%, iOS: 50%)
│   │   ├─ v2.4.5 - Released (Android: 100%, iOS: 100%)
│   │   ├─ v2.4.0 - Rejected (Android: Rejected, iOS: Released)
│   │   ├─ v2.3.5 - Ready to Submit (submissions: PENDING)
│   │   └─ ... (ALL distributions)
│   │
│   ├─ Click distribution entry (e.g., "v2.5.0")
│   └─ Navigate to: /dashboard/{org}/distributions/{distributionId}
│       (Uses distributionId, NOT releaseId!)
│
├─ ENTRY METHOD B: From Release Page Link
│   ├─ User on Release Page: /releases/{id}?tab=distribution
│   ├─ Clicks: "Open in Distribution Management" button
│   └─ Navigate to: /dashboard/{org}/distributions/{distributionId}
│       (Gets distributionId from API response)
│
├─ PAGE LOADS: Distribution Management Page (FULL Control)
│   Layout: Platform Tabs (NO STEPPER)
│   │
│   ├─ Android Submission Card (if exists)
│   │   ├─ Shows: Current status, rollout %, timestamp
│   │   └─ Actions: Based on current state (see Action Matrix)
│   │
│   └─ iOS Submission Card (if exists)
│       ├─ Shows: Current status, rollout %, timestamp
│       └─ Actions: Based on current state (see Action Matrix)
│
├─ USE CASE 1: Submit PENDING Submission
│   ├─ Submission status: PENDING
│   ├─ Click: "Submit to Stores" button
│   ├─ Opens: SubmitToStoresDialog (for this platform)
│   ├─ User fills details
│   ├─ Click: "Submit"
│   ├─ API: PUT /api/v1/submissions/{submissionId}/submit
│   └─ Success → Submission status changes to IN_REVIEW
│
├─ USE CASE 2: Fix Rejected Submission (Resubmission)
│   ├─ Submission status: REJECTED
│   ├─ Click: "Fix & Re-Submit" button
│   ├─ Opens: ReSubmissionDialog
│   │   ├─ **Form is PRE-FILLED with previous values**
│   │   ├─ Release Notes: (editable, shows previous)
│   │   ├─ Rollout %: (editable, shows previous)
│   │   ├─ Priority/Phased: (editable, shows previous)
│   │   └─ NEW BUILD OPTIONS:
│   │       ├─ iOS: New TestFlight build number field
│   │       └─ Android: New AAB file picker (multipart upload)
│   ├─ User edits metadata AND provides new artifact
│   ├─ Click: "Re-Submit"
│   ├─ API: POST /api/v1/distributions/{distributionId}/submissions
│   │   └─ Creates NEW submission with NEW submissionId
│   └─ Success → New submission with status IN_REVIEW
│
├─ USE CASE 3: Manage Active Rollout
│   ├─ Submission status: LIVE (50%)
│   ├─ Shows: RolloutControls component
│   │   ├─ Current: 50%
│   │   ├─ Progress bar: 50% (animated)
│   │   └─ Actions available (platform-specific):
│   │
│   ├─ ACTION A: Increase Rollout (Android or iOS Phased)
│   │   ├─ Android: User selects any % (supports decimals: 75.5)
│   │   ├─ iOS Phased: User can only select 100% (complete early)
│   │   ├─ iOS Manual: No rollout control (always 100%)
│   │   ├─ Click: "Update Rollout"
│   │   ├─ API: PATCH /api/v1/submissions/{submissionId}/rollout?platform={platform}
│   │   ├─ Optimistic update: Progress bar animates
│   │   └─ Success → Confirmed at new %
│   │
│   ├─ ACTION B: Pause Rollout (iOS Phased only)
│   │   ├─ Click: "Pause" button
│   │   ├─ Opens: PauseRolloutDialog
│   │   ├─ Required: Enter reason
│   │   ├─ Confirm → API: PATCH /api/v1/submissions/{submissionId}/rollout/pause?platform=IOS
│   │   └─ Success → Status changes to PAUSED
│   │
│   ├─ ACTION C: Resume Rollout (if paused)
│   │   ├─ Click: "Resume" button
│   │   ├─ Opens: ResumeRolloutDialog (simple confirmation)
│   │   ├─ Confirm → API: PATCH /api/v1/submissions/{submissionId}/rollout/resume?platform=IOS
│   │   └─ Success → Status returns to LIVE
│   │
│   └─ ACTION D: Emergency Halt (any platform, any state)
│       ├─ Click: "Emergency Halt" button (RED, always visible)
│       ├─ Opens: HaltRolloutDialog
│       │   ├─ Reason: (required field)
│       │   └─ Warning: "This requires a hotfix release"
│       ├─ Confirm → API: PATCH /api/v1/submissions/{submissionId}/rollout/halt?platform={platform}
│       └─ Success → Status changes to HALTED (terminal)
│
└─ USE CASE 4: View Submission History
    ├─ Click: "View History" link on any submission card
    ├─ Opens: SubmissionHistoryPanel (modal or panel)
    ├─ Shows: Timeline of all events
    │   ├─ SUBMITTED: "Submitted to Play Store" (timestamp, actor)
    │   ├─ APPROVED: "Approved by Play Store" (timestamp)
    │   ├─ ROLLOUT_UPDATED: "Rollout updated: 1% → 5%" (timestamp, actor)
    │   ├─ ROLLOUT_PAUSED: "Rollout paused: Monitoring metrics" (timestamp, actor)
    │   ├─ ROLLOUT_RESUMED: "Rollout resumed" (timestamp, actor)
    │   └─ ... (all historical events)
    ├─ Pagination: Load more if > 50 events
    └─ Close → Returns to submission cards view
```

---

## 3. Pre-Release Stage Flow

### 3.1 Page Load

**URL**: `/dashboard/{org}/releases/{releaseId}?tab=pre-release`

**API Calls on Load**:
```typescript
await Promise.all([
  DistributionService.getBuilds(releaseId),        // Get build status
  DistributionService.getPMStatus(releaseId),      // Get approval status
]);
```

**UI Sections**:
1. Build Status Cards (Android + iOS)
2. PM Approval Status
3. "Go to Distribution" button

### 3.2 Build Status Logic

**Android Build Card**:

| Build Exists? | Build Ready? | UI State | Actions |
|---------------|--------------|----------|---------|
| ❌ No | N/A | Empty State | "Upload AAB" button |
| ✅ Yes | ❌ No (Uploading) | Uploading State | Progress bar, no actions |
| ✅ Yes | ✅ Yes | Ready State | ✅ Green check, Internal Testing link |
| ✅ Yes | ❌ Failed | Error State | Error message, "Retry Upload" button |

**iOS Build Card**:

| Build Exists? | Build Ready? | UI State | Actions |
|---------------|--------------|----------|---------|
| ❌ No | N/A | Empty State | "Verify TestFlight" button |
| ✅ Yes | ❌ No (Processing) | Verifying State | Spinner, "TestFlight is processing..." |
| ✅ Yes | ✅ Yes | Ready State | ✅ Green check, TestFlight link |
| ✅ Yes | ❌ Failed | Error State | Error message, "Retry Verification" button |

### 3.3 Go to Distribution Button

**Button State Logic**:

```typescript
function canGoToDistribution(): boolean {
  const androidReady = androidBuild?.buildUploadStatus === 'UPLOADED';
  const iosReady = iosBuild?.buildUploadStatus === 'UPLOADED';
  const allBuildsReady = androidReady && iosReady;
  
  const approvalMet = pmStatus.approved === true;
  
  return allBuildsReady && approvalMet;
}
```

**Button Click Action**:
```typescript
onClick={() => {
  // Backend has already auto-created distribution + PENDING submissions
  navigate(`/dashboard/${org}/releases/${releaseId}?tab=distribution`);
}}
```

---

## 4. Distribution Stage Flow (Release Page - LIMITED)

### 4.1 Page Load

**URL**: `/dashboard/{org}/releases/{releaseId}?tab=distribution`

**API Calls on Load**:
```typescript
// Get distribution by releaseId
const distribution = await DistributionService.getDistributionByRelease(releaseId);
// API: GET /api/v1/releases/:releaseId/distribution

// Response includes:
// - distribution { id, releaseId, branch, status, platforms }
// - submissions [] (auto-created with PENDING status, each has its own version)
```

### 4.2 Initial State (Submissions in PENDING)

**UI**:
```
┌─────────────────────────────────────────────┐
│  Ready to Submit                             │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  🔵 Android - PENDING                 │  │
│  │  Version: 2.5.0 (Build 250)          │  │
│  │  Status: Ready to submit              │  │
│  │  Created: Dec 10, 2025 9:00 AM       │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  🔵 iOS - PENDING                     │  │
│  │  Version: 2.5.0 (Build 17965)        │  │
│  │  Status: Ready to submit              │  │
│  │  Created: Dec 10, 2025 9:00 AM       │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │   [Submit to Stores] (Large Button)  │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 4.3 After Submission

**UI**: Shows 1-2 Submission Cards (depending on platforms)

**Each Card Contains**:
- Platform icon + version
- Status badge (colored, animated)
- Submission timestamp
- Current rollout % (if LIVE)
- Rollout progress bar (read-only)
- Link to "Open in Distribution Management"
- NO action buttons

### 4.4 Submission Card: Two Versions

#### Version A: Release Page (Limited - Monitor Only)

| Status | Badge | Progress Bar | Actions | Notes |
|--------|-------|--------------|---------|-------|
| `PENDING` | 🔵 Ready | Hidden | ❌ None | Link to Distribution Management |
| `IN_REVIEW` | 🟡 In Review | Hidden | ❌ None | Link to Distribution Management |
| `REJECTED` | 🔴 Rejected | Hidden | ❌ None | Link to Distribution Management |
| `APPROVED` or `LIVE` | 🟢 Approved/Live | Read-only | ❌ None | Link to Distribution Management |
| `PAUSED` | 🟠 Paused | Static % | ❌ None | Link to Distribution Management |
| `LIVE` (100%) | 🔵 Live | 100% | ❌ None | Read-only |

#### Version B: Distribution Management (Full - All Actions)

| Status | Badge | Progress Bar | Actions Available |
|--------|-------|--------------|-------------------|
| `PENDING` | 🔵 Ready | Hidden | ✅ "Submit to Stores" |
| `IN_REVIEW` | 🟡 In Review | Hidden | ✅ View History only (wait for approval) |
| `REJECTED` | 🔴 Rejected | Hidden | ✅ "Fix & Re-Submit" (creates NEW submission) |
| `APPROVED` | 🟢 Approved | 0% | ✅ Start Rollout, Halt, History |
| `LIVE` (25%) | 🟢 Live | 25% (animated) | ✅ Update, Pause (iOS phased only), Halt, History |
| `PAUSED` | 🟠 Paused | Current % (static) | ✅ Resume, Halt, History |
| `LIVE` (100%) | 🔵 Live | 100% (complete) | ✅ History only |
| `HALTED` | 🔴 Halted | Current % (frozen) | ✅ History only (terminal state) |

**Key Differences**:
- ❌ **Release Page**: Read-only status display + link to distribution management
- ✅ **Distribution Management**: Full management with all action buttons

---

## 5. Distribution Management Module

### 5.1 Entry Point

**Sidebar**: Click "Distributions" (separate top-level module)

**URL**: `/dashboard/{org}/distributions`

### 5.2 Page Load - Distribution List

**API Call**:
```typescript
const response = await DistributionService.listDistributions();
// API: GET /api/v1/distributions

// Response:
{
  distributions: [...],  // Can be empty array
  pagination: { ... },
  stats: {
    totalDistributions: 47,
    totalSubmissions: 94,
    inReviewSubmissions: 8,
    releasedSubmissions: 27
  }
}
```

### 5.3 Empty State (No Distributions)

**Triggers When**: `distributions.length === 0`

**Meaning**: No release has ever completed pre-release

**UI**:
```
┌─────────────────────────────────────────────────────────────┐
│  No Distributions Yet                                        │
│                                                              │
│  📦 Distributions are created after completing pre-release  │
│                                                              │
│  To create your first distribution:                         │
│  1. Create a release                                         │
│  2. Complete pre-release stage (upload builds + approval)   │
│  3. Distribution will appear here automatically             │
│                                                              │
│  [View Releases]                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Distribution List (Populated)

**Display**: Table/Grid of Distribution Entries

**Entry Card Shows**:
- Release version (e.g., "2.5.0")
- Release branch (e.g., "release/2.5.0")
- Distribution status badge
- Platform summaries:
  - Android: Status + Current %
  - iOS: Status + Current %
- Last updated timestamp
- "Open" button → Navigates to `/distributions/{distributionId}`

**Example Entries**:

```
Entry 1 (Has Submissions - Rolling Out):
┌────────────────────────────────────────────────────────┐
│ v2.5.0                                 🟢 PARTIALLY_RELEASED   │
│ release/2.5.0                                          │
│                                                         │
│ 🟢 Android: Live (25%)                                 │
│ 🟡 iOS: In Review                                      │
│                                                         │
│ Updated: 2 minutes ago                  [Open]         │
└────────────────────────────────────────────────────────┘

Entry 2 (Has Submissions - PENDING):
┌────────────────────────────────────────────────────────┐
│ v2.4.0                        🔵 PENDING               │
│ release/2.4.0                                          │
│                                                         │
│ Ready to submit                                        │
│ 🔵 Android: Pending  🔵 iOS: Pending                   │
│                                                         │
│ Created: Dec 10, 2025           [Submit Now]           │
└────────────────────────────────────────────────────────┘

Entry 3 (Complete):
┌────────────────────────────────────────────────────────┐
│ v2.3.0                               🎉 RELEASED       │
│ release/2.3.0                                          │
│                                                         │
│ 🔵 Android: Live (100%)                                │
│ 🔵 iOS: Live (100%)                                    │
│                                                         │
│ Released: Dec 1, 2025               [View]             │
└────────────────────────────────────────────────────────┘
```

**Click Action**:
```typescript
onClick={() => {
  // Use distributionId, NOT releaseId
  navigate(`/dashboard/${org}/distributions/${distributionId}`);
}}
```

### 5.5 Distribution Management Page

**Route**: `/dashboard/{org}/distributions/{distributionId}`

**Primary Key**: `distributionId` (not releaseId!)

**API Calls on Load**:
```typescript
const distribution = await DistributionService.getDistribution(distributionId);
// API: GET /api/v1/distributions/:distributionId

// Response includes:
// - distribution { id, releaseId, branch, status, platforms }
// - submissions [] (all submissions including historical)
// - Each submission includes artifact details
```

**Page Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│ BREADCRUMB: Distributions > v2.5.0                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
│ Distribution Management                      [🔄 Refresh]   │
│                                                              │
│ v2.5.0 | release/2.5.0 | 🟢 PARTIALLY_RELEASED             │
│ Platforms: Android, iOS                                     │
│ Created: Nov 25, 2025                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PLATFORM TABS (Primary Navigation)                           │
│ ┌──────────┬──────────┐                                     │
│ │ Android  │   iOS    │                                     │
│ └──────────┴──────────┘                                     │
│                                                              │
│ [Tab Content Based on Selected Platform]                    │
└─────────────────────────────────────────────────────────────┘
```

### 5.6 Platform Tab States

**Each platform tab can be in one of these states:**

#### State 1: PENDING (Ready to Submit)
```
┌─────────────────────────────────────────────────────────────┐
│ Android Tab                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔵 PENDING - Ready to Submit                                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Submission Details                                  │    │
│  │                                                     │    │
│  │ Version: 2.5.0 (250)                               │    │
│  │ Created: Dec 10, 2025 9:00 AM                      │    │
│  │ Status: Ready to submit to Play Store              │    │
│  │                                                     │    │
│  │ Artifact: app-release.aab                          │    │
│  │ Internal Testing Link: Available                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [Submit to Play Store]                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### State 2: IN_REVIEW
```
┌─────────────────────────────────────────────────────────────┐
│ Android Tab                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🟡 IN REVIEW                                                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Submission Details                                  │    │
│  │                                                     │    │
│  │ Version: 2.5.0 (250)                               │    │
│  │ Track: Production                                   │    │
│  │ Submitted: Dec 10, 2025 3:30 PM                    │    │
│  │ Submitted by: prince@dream11.com                   │    │
│  │                                                     │    │
│  │ Status: Awaiting Play Store review                 │    │
│  │ • Typically takes 1-3 days                         │    │
│  │ • You'll be notified when status changes           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [View Submission History]                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### State 3: REJECTED
```
┌─────────────────────────────────────────────────────────────┐
│ Android Tab                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 REJECTED                                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Rejection Details                                   │    │
│  │                                                     │    │
│  │ Reason: App crashes on startup (Samsung Galaxy)    │    │
│  │ Guideline: 4.0 - Design                            │    │
│  │ Rejected: Dec 11, 2025 2:15 PM                     │    │
│  │                                                     │    │
│  │ [View Screenshot] [Read Full Details]              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Resolution Options:                                         │
│  • Fix metadata only (release notes, descriptions)          │
│  • Upload new build (if code changes needed)                │
│                                                              │
│  Note: Re-submission creates a NEW submission with new ID   │
│                                                              │
│  [Fix & Re-Submit]                                           │
│                                                              │
│  [View Submission History]                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### State 4: LIVE (Rolling Out)
```
┌─────────────────────────────────────────────────────────────┐
│ Android Tab                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🟢 LIVE (Rolling Out)                                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Submission Details                                  │    │
│  │                                                     │    │
│  │ Version: 2.5.0 (250)                               │    │
│  │ Track: Production                                   │    │
│  │ Approved: Dec 11, 2025 4:30 PM                     │    │
│  │ Current Rollout: 25%                                │    │
│  │                                                     │    │
│  │ ━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Rollout Controls (Android - Any %)                  │    │
│  │                                                     │    │
│  │ Quick Presets:                                      │    │
│  │ [1%] [5%] [10%] [25%] [50%] [100%]                │    │
│  │                                                     │    │
│  │ Custom (supports decimals):                         │    │
│  │ [Slider: 25.0 → 100.0]                             │    │
│  │                                                     │    │
│  │ [Update Rollout]                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Actions:                                                    │
│  [Emergency Halt] [View History]                             │
│                                                              │
│  Note: Android cannot pause (only halt for emergencies)     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### State 5: PAUSED (iOS Only)
```
┌─────────────────────────────────────────────────────────────┐
│ iOS Tab                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🟠 PAUSED                                                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Rollout Paused                                      │    │
│  │                                                     │    │
│  │ Current: 15% (paused)                               │    │
│  │ Paused: Dec 12, 2025 10:00 AM                      │    │
│  │ Reason: Monitoring crash reports                    │    │
│  │                                                     │    │
│  │ ━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (15% frozen)     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Actions:                                                    │
│  [Resume Rollout] [Emergency Halt] [View History]           │
│                                                              │
│  Note: Only iOS phased release can be paused               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Detailed UI States

### 6.1 SubmitToStoresDialog (Form)

**Trigger**: 
- Click "Submit to Stores" button (release page or distribution management)
- When submission is in PENDING status

**Form Fields**:

```typescript
type SubmitFormData = {
  // Platform selection (only show PENDING platforms)
  platforms: Array<'ANDROID' | 'IOS'>;  // Multi-select
  
  // Android options (shown if Android PENDING)
  android?: {
    rolloutPercentage: number; // 0-100, supports decimals (e.g., 5.5, 27.3)
    inAppUpdatePriority: 0 | 1 | 2 | 3 | 4 | 5;
    releaseNotes: string;
  };
  
  // iOS options (shown if iOS PENDING)
  ios?: {
    phasedRelease: boolean; // Enable 7-day phased rollout
    resetRating: boolean; // Reset app rating
    releaseNotes: string;
    // releaseType is always "AFTER_APPROVAL" (not shown in form)
  };
};
```

**Submit Flow**:
```typescript
async function handleSubmit(formData: SubmitFormData) {
  try {
    // For each selected platform, submit its PENDING submission
    for (const platform of formData.platforms) {
      const submission = submissions.find(s => 
        s.platform === platform && s.status === 'PENDING'
      );
      
      if (submission) {
        await DistributionService.submitSubmission(submission.id, {
          ...(platform === 'ANDROID' ? formData.android : formData.ios)
        });
        // API: PUT /api/v1/submissions/:submissionId/submit
      }
    }
    
    closeDialog();
    showToast({ type: 'success', message: 'Submitted successfully' });
    revalidate(); // Reload page data
  } catch (error) {
    if (error.code === 'VERSION_EXISTS') {
      closeDialog();
      openVersionConflictDialog(error.details);
    } else if (error.code === 'EXPOSURE_CONTROL_CONFLICT') {
      closeDialog();
      openExposureControlDialog(error.details);
    } else {
      showToast({ type: 'error', message: error.message });
    }
  }
}
```

### 6.2 ReSubmissionDialog (Rejection Recovery)

**Trigger**: Click "Fix & Re-Submit" on rejected submission

**Important**: Creates a **NEW submission** with **NEW submissionId**

**Form Fields** (Pre-filled from previous submission):

```typescript
type ReSubmissionFormData = {
  // Platform (not selectable - determined by rejected submission)
  platform: 'ANDROID' | 'IOS';
  
  // Version (user can update)
  version: string;
  
  // Android-specific (if platform === 'ANDROID')
  android?: {
    versionCode?: number; // Optional - extracted from AAB if not provided
    aabFile: File; // NEW AAB file upload (required for resubmission)
    rolloutPercentage: number; // Pre-filled, editable
    inAppUpdatePriority: number; // Pre-filled, editable
    releaseNotes: string; // Pre-filled, editable
  };
  
  // iOS-specific (if platform === 'IOS')
  ios?: {
    testflightNumber: number; // NEW TestFlight build (required)
    phasedRelease: boolean; // Pre-filled, editable
    resetRating: boolean; // Pre-filled, editable
    releaseNotes: string; // Pre-filled, editable
  };
};
```

**Pre-fill Logic**:
```typescript
// When dialog opens, pre-fill with previous submission data
const previousSubmission = submissions.find(s => s.status === 'REJECTED');

const initialValues = {
  platform: previousSubmission.platform,
  version: previousSubmission.version, // User can edit
  
  android: previousSubmission.platform === 'ANDROID' ? {
    // aabFile: user must provide NEW file
    rolloutPercentage: previousSubmission.rolloutPercentage || 5,
    inAppUpdatePriority: previousSubmission.inAppUpdatePriority || 0,
    releaseNotes: previousSubmission.releaseNotes || '',
  } : undefined,
  
  ios: previousSubmission.platform === 'IOS' ? {
    // testflightNumber: user must provide NEW number
    phasedRelease: previousSubmission.phasedRelease || true,
    resetRating: previousSubmission.resetRating || false,
    releaseNotes: previousSubmission.releaseNotes || '',
  } : undefined,
};
```

**Submit Flow**:
```typescript
async function handleReSubmit(formData: ReSubmissionFormData) {
  try {
    // API: POST /api/v1/distributions/:distributionId/submissions
    // Creates NEW submission with NEW ID
    const response = await DistributionService.createSubmission(
      distributionId,
      formData
    );
    
    closeDialog();
    showToast({ type: 'success', message: 'Re-submitted successfully' });
    revalidate(); // Reload page data - will show new submission
  } catch (error) {
    showToast({ type: 'error', message: error.message });
  }
}
```

### 6.3 RolloutControls Component

**Shows When**: Submission status = `APPROVED` or `LIVE`

**Platform-Specific Rules**:

#### Android Rollout Controls
```
┌─────────────────────────────────────────────────────────────┐
│  Current Rollout: 25%                                        │
│  ━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │
│                                                              │
│  Quick Presets: [1%] [5%] [10%] [25%] [50%] [100%]         │
│                                                              │
│  Custom (supports decimals):                                 │
│  [Slider: 25.0 → 100.0]                                     │
│  Input: [27.5]%                                              │
│                                                              │
│  [Update Rollout] [Emergency Halt]                           │
│                                                              │
│  Note: Can rollout to any % (supports decimals)            │
└─────────────────────────────────────────────────────────────┘
```

#### iOS Phased Release Controls
```
┌─────────────────────────────────────────────────────────────┐
│  Current Rollout: Day 3/7 (Automatic by Apple)              │
│  ━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                      │
│                                                              │
│  Automatic 7-day phased rollout in progress                 │
│                                                              │
│  Options:                                                    │
│  [Complete Rollout Early (100%)] - Skip to 100% now         │
│                                                              │
│  [Pause Rollout] [Emergency Halt]                            │
│                                                              │
│  Note: Cannot set custom % (Apple controls phasing)         │
└─────────────────────────────────────────────────────────────┘
```

#### iOS Manual Release (No Controls)
```
┌─────────────────────────────────────────────────────────────┐
│  Rollout: 100% (Immediate Release)                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100%                │
│                                                              │
│  Manual release: Immediately available to 100% of users     │
│                                                              │
│  No rollout controls available                              │
│                                                              │
│  [Emergency Halt] [View History]                             │
│                                                              │
│  Note: Already at 100%, no gradual rollout                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Action Matrix

### 7.1 Available Actions by Context

#### Release Page Distribution Tab (LIMITED)

| Submission Status | View Status | Actions Available | Notes |
|-------------------|-------------|-------------------|-------|
| `PENDING` | ✅ | ✅ Submit to Stores | Can submit PENDING submissions |
| `IN_REVIEW` | ✅ | ❌ None | Link to Distribution Management |
| `REJECTED` | ✅ | ❌ None | Link to Distribution Management |
| `APPROVED` or `LIVE` | ✅ | ❌ None | Link to Distribution Management |
| `PAUSED` | ✅ | ❌ None | Link to Distribution Management |
| `LIVE` (100%) | ✅ | ❌ None | Read-only |

**Purpose**: Submit once + Monitor status only

#### Distribution Management (FULL)

| Status | View | Submit | Resubmit | Update Rollout | Pause | Resume | Halt | History |
|--------|------|--------|----------|----------------|-------|--------|------|---------|
| `PENDING` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `IN_REVIEW` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `REJECTED` | ✅ | ❌ | ✅ (NEW) | ❌ | ❌ | ❌ | ❌ | ✅ |
| `APPROVED` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `LIVE` (active) | ✅ | ❌ | ❌ | ✅ | ✅* | ❌ | ✅ | ✅ |
| `PAUSED` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `LIVE` (100%) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `HALTED` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**\* Pause**: Only available for iOS phased release

**Purpose**: Complete post-submission management

---

## 8. Error Resolution Flows

### 8.1 Version Conflict (VERSION_EXISTS)

**Error**: Version already exists in store

**Dialog Flow**:
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  Version Conflict                                        │
│                                                              │
│  Version 2.5.0 already exists in Play Store (LIVE)          │
│                                                              │
│  Resolution Options:                                         │
│  ○ Create new release (v2.5.1) [Recommended]                │
│  ○ Delete draft version (only if status=DRAFT)              │
│                                                              │
│  [Cancel] [Resolve]                                          │
└─────────────────────────────────────────────────────────────┘
```

**Actions**:
- Option 1: Navigate to Create Release page with version pre-filled to `2.5.1`
- Option 2: Call API to delete draft → Retry submission

### 8.2 Exposure Control Conflict (EXPOSURE_CONTROL_CONFLICT)

**Error**: Previous release has active partial rollout

**Dialog Flow**:
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  Active Rollout Detected                                 │
│                                                              │
│  Previous release v2.4.0 has active rollout at 25%          │
│                                                              │
│  Impact: Submitting new version will affect current rollout │
│                                                              │
│  Resolution Options:                                         │
│  ○ Complete previous rollout to 100% first [Recommended]    │
│  ○ Halt previous release (users may be affected)            │
│  ○ Proceed anyway (advanced, manual store management)       │
│                                                              │
│  [Cancel] [Execute]                                          │
└─────────────────────────────────────────────────────────────┘
```

**Actions**:
- Option 1: Navigate to previous distribution → Complete rollout
- Option 2: Call API to halt previous release → Retry submission
- Option 3: Force submit (show additional warnings)

---

## 9. Platform-Specific Rules

### 9.1 Android (Play Store)

**Rollout Control**:
- ✅ Can rollout to **any percentage** (0-100)
- ✅ Supports **decimal values** (e.g., 5.5, 27.3, 99.9)
- ✅ Manual control of rollout percentage
- ✅ Can increase or decrease
- ❌ Cannot pause (only halt for emergencies)

**Typical Progression**: 5% → 10% → 25% → 50% → 100%

**API**:
```typescript
// Update rollout to any %
PATCH /api/v1/submissions/:submissionId/rollout?platform=ANDROID
{ rolloutPercentage: 27.3 }  // Supports decimals
```

### 9.2 iOS - Phased Release

**Rollout Control**:
- ✅ Automatic 7-day phased rollout by Apple
- ✅ Can update to **100% only** (to complete early)
- ❌ Cannot set partial percentages manually
- ✅ Can PAUSE/RESUME

**API**:
```typescript
// Complete early (skip to 100%)
PATCH /api/v1/submissions/:submissionId/rollout?platform=IOS
{ rolloutPercentage: 100 }  // Only 100 allowed

// Pause
PATCH /api/v1/submissions/:submissionId/rollout/pause?platform=IOS
{ reason: "Monitoring crash reports" }

// Resume
PATCH /api/v1/submissions/:submissionId/rollout/resume?platform=IOS
```

### 9.3 iOS - Manual Release

**Rollout Control**:
- ✅ **Always 100%** immediately upon release
- ❌ No rollout endpoint needed (already at 100%)
- ❌ Cannot pause
- ✅ Can halt (emergency only)

**API**: No rollout API calls (always 100%)

---

## 10. Complete Navigation Map

```
                     ┌──────────────────────────┐
                     │   SIDEBAR NAVIGATION     │
                     └──────────────────────────┘
                               │
                   ┌───────────┴───────────┐
                   │                       │
            ┌──────▼──────┐        ┌──────▼──────────┐
            │  Releases   │        │  Distributions  │
            └──────┬──────┘        └──────┬──────────┘
                   │                      │
                   │                      │
        ┌──────────▼──────────┐           │
        │ Release Page        │           │
        │ /releases/{id}      │           │
        └──────────┬──────────┘           │
                   │                      │
        ┌──────────▼──────────┐           │
        │ Distribution Tab    │           │
        │ ?tab=distribution   │           │
        │ (LIMITED)           │           │
        │ - Submit PENDING    │           │
        │ - Monitor status    │           │
        └──────────┬──────────┘           │
                   │                      │
                   │ [Open in Dist Mgmt] │
                   │ (uses distributionId)│
                   │                      │
        ┌──────────▼──────────────────────▼──────────┐
        │ Distribution Management Page               │
        │ /distributions/{distributionId}            │
        │ (FULL CONTROL - uses distributionId!)      │
        │                                            │
        │ ┌──────────────┬──────────────┐           │
        │ │ Android Tab  │   iOS Tab    │           │
        │ └──────────────┴──────────────┘           │
        └────────────────────────────────────────────┘
                               ▲
                               │
        ┌──────────────────────┴──────────────────────┐
        │ Distributions List                          │
        │ /distributions                               │
        │ (Shows all distributions, uses distributionId)│
        └─────────────────────────────────────────────┘
```

---

## 11. API Reference Summary

### First-Time Submission (PENDING → IN_REVIEW)
```
PUT /api/v1/submissions/:submissionId/submit
```

### Resubmission (Creates NEW submission)
```
POST /api/v1/distributions/:distributionId/submissions
```

### Update Rollout
```
PATCH /api/v1/submissions/:submissionId/rollout?platform=<ANDROID|IOS>
```

### Pause Rollout (iOS phased only)
```
PATCH /api/v1/submissions/:submissionId/rollout/pause?platform=IOS
```

### Resume Rollout
```
PATCH /api/v1/submissions/:submissionId/rollout/resume?platform=IOS
```

### Emergency Halt
```
PATCH /api/v1/submissions/:submissionId/rollout/halt?platform=<ANDROID|IOS>
```

### Cancel Submission
```
PATCH /api/v1/submissions/:submissionId/cancel?platform=<ANDROID|IOS>
```

### Get Distribution
```
GET /api/v1/distributions/:distributionId
GET /api/v1/releases/:releaseId/distribution
```

### List Distributions
```
GET /api/v1/distributions
```

---

## 12. Key Takeaways for Implementation

### ✅ Critical Points

1. **Distribution is auto-created** after pre-release completion
2. **Submissions are auto-created** with PENDING status (one per platform)
3. **First submission** uses `PUT /api/v1/submissions/:submissionId/submit`
4. **Resubmission** creates NEW submission via `POST /api/v1/distributions/:distributionId/submissions`
5. **Routes use distributionId** (not releaseId) for distribution management
6. **Release page** = LIMITED (submit PENDING + monitor only)
7. **Distribution management** = FULL (all actions)
8. **Platform-specific rollout rules**:
   - Android: Any % (decimals supported)
   - iOS Phased: 100% only or automatic
   - iOS Manual: Always 100%
9. **iOS releaseType** is always "AFTER_APPROVAL" (read-only)
10. **Empty state** when no distributions exist

---

**This specification is production-ready and perfectly aligned with DISTRIBUTION_API_SPEC.md (the holy grail)!** 🎯

