# Distribution Module - Complete UI Flow Specification
**Document Version**: 1.0  
**Last Updated**: December 10, 2025  
**Status**: ✅ Ready for Implementation  
**References**: 
- `distribution-spec.md` (Bible #1)
- `distribution-api-specification.md` (Bible #2)
- `distribution-frontend-implementation-plan.md` (Bible #3)

---

## ⚡ Critical Clarifications (FINAL - CORRECT!)

### 1. TWO SEPARATE MODULES (MOST IMPORTANT!)

```
┌───────────────────────────────────────────────────────────────┐
│ SIDEBAR STRUCTURE                                              │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ 📦 RELEASE MANAGEMENT MODULE                                   │
│    ├─ Release Dashboard                                        │
│    ├─ Releases List → Open Release                            │
│    │   └─ Route: /releases/{id}?tab=distribution              │
│    │      └─ Distribution Tab: Submit + Monitor (LIMITED)     │
│    ├─ Configurations                                           │
│    └─ Workflows                                                │
│                                                                │
│ 🚀 DISTRIBUTION MANAGEMENT MODULE (SEPARATE SIBLING!)          │
│    └─ Distributions List → Open Distribution                  │
│        └─ Route: /distributions/{releaseId}                   │
│           └─ Full Management Page (COMPLETE CONTROL)          │
│                                                                │
│ ❗ These are TWO SEPARATE MODULES, not nested!                 │
└───────────────────────────────────────────────────────────────┘
```

### 2. Release Page Distribution Tab (LIMITED)

```
Route: /dashboard/{org}/releases/{releaseId}?tab=distribution
Purpose: Submit + Monitor during release process

✅ CAN DO:
  • Submit to stores (first time)
  • View submission status (manual refresh)
  • See if rejected/accepted

❌ CANNOT DO:
  • Rollout control (no slider)
  • Retry submission
  • Pause/Resume/Halt
  • View history
  • ANY management actions

→ Link: "Open in Distribution Management" 
   Navigates to: /distributions/{releaseId}
```

### 3. Distribution Management Page (FULL)

```
Route: /dashboard/{org}/distributions/{releaseId}
Purpose: Complete distribution management

✅ CAN DO EVERYTHING:
  • Submit to stores (initial OR additional platforms)
  • View submission status
  • Rollout control (slider, update %)
  • Retry submission (if rejected)
  • Pause/Resume/Halt rollout
  • View complete history
  • ALL management actions

Entry Criteria: Pre-release completed
Shows: Even if NO submissions yet (can submit from here)
```

### 4. Distribution List Criteria (CHANGED!)

```
OLD Rule (Wrong):
└─ Show ONLY releases with at least ONE submission

NEW Rule (Correct):
└─ Show ALL releases that completed pre-release
   ├─ Has submission? → Can manage it
   └─ No submission? → Can submit from here too

Purpose: Distribution management for ANY release past pre-release
```

### 2. Extra Commits = Information Card (Not Blocker)
```
✅ Purpose: Show cherry-picks/commits after regression for AWARENESS
❌ NOT a blocking step - just informational
✅ Flow: Have Artifact → See Cherry Picks (if any) → Approve
```

### 5. Distribution List Entry Criteria (UPDATED!)
```
✅ Show: ALL releases where releaseStatus indicates readiness for distribution
❌ Do NOT show: Releases still in PRE_RELEASE (not ready)
✅ Can submit from here: Yes (even if no submissions yet)

Backend filter:
WHERE releaseStatus IN ('READY_FOR_SUBMISSION', 'COMPLETED')
```

### 4. Release Page Distribution Tab Lifecycle (LIMITED)
```
Phase 1: No submissions → "Submit to Stores" button
Phase 2: Submitted → Status tracking ONLY (read-only cards)
Phase 3: Any action needed → Link to Distribution sidebar

❗ Release page is INTENTIONALLY LIMITED to submit + monitor
❌ NO management actions (rollout, retry, halt) available here
```

### 5. Distribution Sidebar Lifecycle (FULL)
```
Phase 1: View all distributions → Select one
Phase 2: See full submission details
Phase 3: ALL actions available:
  ├─ Rollout management (update %)
  ├─ Pause/Resume/Halt
  ├─ Re-submission (if rejected)
  ├─ View history
  └─ Complete management

❗ Distribution sidebar is the ONLY place for post-submission management
```

### 6. Visual Flow Summary

**Flow 1: Release Management Module (LIMITED)**:
```
Sidebar: Release Management
    ↓
Releases List
    ↓ (click release v2.5.0)
Release Page (/releases/{id})
    ↓
Stepper: [Pending] [Pre-Release] [Distribution]
    ↓ (click Distribution tab)
Distribution Tab (LIMITED VIEW)
    ├─ No submissions? → [Submit to Stores] button
    └─ Has submissions? → Status cards (READ-ONLY)
        ├─ Shows: Status, timestamp
        ├─ Manual refresh button
        └─ Link: "Open in Distribution Management" ──┐
                                                       │
Done with release process!                             │
                                                       ↓
┌──────────────────────────────────────────────────────────────┐
│ Flow 2: Distribution Management Module (FULL)                │
└──────────────────────────────────────────────────────────────┘

Sidebar: Distribution Management (SEPARATE MODULE!)
    ↓
Distributions List (/distributions)
    ├─ v2.5.0 - In Progress (Android: 25%, iOS: 50%)
    ├─ v2.4.5 - Completed (Android: 100%, iOS: 100%)
    ├─ v2.4.0 - Needs Action (Android: Rejected)
    └─ v2.3.0 - Ready to Submit (No submissions)
    ↓ (click any entry)
Distribution Management Page (/distributions/{releaseId})
    ├─ Release Info (version, branch, platforms)
    ├─ Can submit (if not submitted or partial)
    ├─ Submission Cards (FULL with all actions)
    ├─ Rollout Controls (slider, pause, halt)
    ├─ Re-submission Dialog (if rejected)
    ├─ View History Panel
    └─ ALL MANAGEMENT FEATURES

This is the ONLY place for complete management!
```

**Critical Architecture Rules**:
1. ✅ **Two SEPARATE modules** (siblings in sidebar)
2. ✅ **Release page**: Submit + Monitor (intentionally limited)
3. ✅ **Distribution page**: Complete management (full control)
4. ✅ **Can submit from BOTH** places
5. ✅ **Distribution list**: Shows all releases past pre-release (not just with submissions)
6. ✅ **Link between them**: Release page → Distribution management
7. ❌ **NO rollout/retry/pause from release page** - only from distribution page

---

## 🎯 Quick Reference Summary

### Architecture in 30 Seconds:
1. **Two separate modules** (siblings): Release Management & Distribution Management
2. **Three pages**: Release page (limited) → Distributions list → Distribution management page (full)
3. **Release page distribution tab**: Submit + Monitor only (no management)
4. **Distribution management page**: Complete control (all actions)
5. **Distribution list shows**: All releases past pre-release (not just with submissions)
6. **Can submit from both**: Release page OR distribution page
7. **Status polling**: Manual refresh on release page
8. **Routes**:
   - Release: `/releases/{id}?tab=distribution` (LIMITED)
   - List: `/distributions` (ENTRY)
   - Management: `/distributions/{releaseId}` (FULL)

---

## Table of Contents
1. [Entry Points & Navigation](#1-entry-points--navigation)
2. [Complete User Journeys](#2-complete-user-journeys)
3. [Pre-Release Stage Flow](#3-pre-release-stage-flow)
4. [Distribution Stage Flow](#4-distribution-stage-flow)
5. [Distribution Tab Flow](#5-distribution-tab-flow)
6. [Detailed UI States](#6-detailed-ui-states)
7. [Action Matrix](#7-action-matrix)
8. [Error Resolution Flows](#8-error-resolution-flows)

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
│ │ ✅ Submit to stores (first time)                       │ │
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
│ Route: /dashboard/{org}/distributions/{releaseId}          │
│                                                              │
│ FULL MANAGEMENT VIEW:                                        │
│ ✅ Submit to stores (initial or additional platforms)       │
│ ✅ Monitor status                                            │
│ ✅ Rollout control (slider, update percentage)              │
│ ✅ Retry submission (if rejected)                           │
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
│ Shows: ALL releases that completed pre-release               │
│ ├─ Submission exists? → Can manage                          │
│ └─ No submission? → Can submit from here                    │
│                                                              │
│ Entry Criteria:                                              │
│ ✅ Release status >= PRE_RELEASE (completed)                │
│ ❌ NOT limited to only releases with submissions            │
│                                                              │
│ Click entry → Navigate to:                                   │
│ /dashboard/{org}/distributions/{releaseId}                  │
│ (Full management page)                                       │
└─────────────────────────────────────────────────────────────┘
```

**Critical Distinction**:

| Aspect | Release Management Module | Distribution Management Module |
|--------|---------------------------|--------------------------------|
| **Route** | `/releases/{id}?tab=distribution` | `/distributions/{releaseId}` |
| **Module Type** | Part of Release Management | **SEPARATE MODULE** (sibling) |
| **Purpose** | Complete release process | Dedicated distribution management |
| **Scope** | Single release (sequential flow) | All distributions (cross-release) |
| **Capabilities** | ✅ Submit<br>✅ Monitor<br>❌ NO management | ✅ Submit (initial or additional)<br>✅ Monitor<br>✅ **FULL management** |
| **UI Components** | SubmitToStoresDialog<br>SubmissionCard (read-only)<br>Link to Distribution Management | SubmitToStoresDialog<br>SubmissionCard (full)<br>RolloutControls<br>ReSubmissionDialog<br>All action dialogs |
| **Entry Criteria** | Release exists | **Pre-release completed** |
| **When Used** | During release process | Managing distributions |
| **Navigation** | Tab within release page | Separate page via sidebar |

**Why Two Separate Modules?**:
- ✅ **Release module**: Focus on release process (submit + monitor)
- ✅ **Distribution module**: Dedicated management hub (complete control)
- ✅ **Clear separation**: Process completion vs ongoing management
- ✅ **Flexibility**: Manage any distribution from centralized location
- ✅ **Can submit from BOTH**: Release page OR distribution page

### 1.4 Complete Route Structure

**Route 1: Release Management (LIMITED)**
```
Route: /dashboard/{org}/releases/{releaseId}
Query: ?tab=pre-release | ?tab=distribution

Components:
├─ Stepper (shows stages)
├─ Pre-Release Tab: Upload builds, approve
└─ Distribution Tab: Submit + Monitor (LIMITED)
    ├─ Can submit to stores
    ├─ Can see status (read-only)
    └─ Link: "Open in Distribution Management"
```

**Route 2: Distribution Management List**
```
Route: /dashboard/{org}/distributions

Shows: ALL releases that completed pre-release
├─ v2.5.0 - In Progress (Android: 25%, iOS: 50%)
├─ v2.4.5 - Completed (Android: 100%, iOS: 100%)
├─ v2.4.0 - Needs Action (Android: Rejected)
└─ v2.3.0 - Ready to Submit (No submissions yet)

Click entry → Navigate to Route 3
```

**Route 3: Distribution Management Page (FULL)**
```
Route: /dashboard/{org}/distributions/{releaseId}

Shows: Complete distribution management for ONE release
├─ Release info (version, branch, platforms)
├─ Submission cards (full version with ALL actions)
├─ Can submit (initial or additional platforms)
├─ Can manage rollout (slider, pause, halt)
├─ Can retry (if rejected)
└─ Can view history

This is a SEPARATE page from release page!
```

**Key Points**: 
- ❗ **TWO separate routes** for distribution content
- ❗ **Release page** = `/releases/{id}?tab=distribution` (LIMITED)
- ❗ **Distribution page** = `/distributions/{releaseId}` (FULL)
- ❗ **Different pages**, different capabilities

### 1.5 Stepper Navigation Rules

**URL Pattern**: `/dashboard/{org}/releases/{releaseId}?tab={stage}`

| Stage | Status | URL | Clickable? | Shows |
|-------|--------|-----|------------|-------|
| **Pending** | `IN_PROGRESS`, `REGRESSION` | `?tab=pending` | ✅ Past stages | Overview only |
| **Pre-Release** | `PRE_RELEASE` | `?tab=pre-release` | ✅ Current/Past | Build upload, PM approval |
| **Distribution** | `READY_FOR_SUBMISSION`, `COMPLETED` | `?tab=distribution` | ✅ Current/Past | **Submissions, rollout controls** |

**Critical Rules**:
1. ✅ **Past/Current stages are clickable**
2. ❌ **Future stages are disabled**
3. ✅ **Clicking stage updates URL `?tab=` parameter**
4. ✅ **Tab content changes based on `?tab=` parameter**

### 1.4 Component Reusability - TWO CONTEXTS

**IMPORTANT**: The same components (SubmissionCard, RolloutControls, ReSubmissionDialog, etc.) are used in **TWO CONTEXTS**:

#### Context 1: First-Time Submission (Release Page)
```
Releases List → Open Release → Release Details Page
└─ Stepper shows stages (with tabs below)
   ├─ Tab: Pre-Release (builds, approval)
   └─ Tab: Distribution (submissions, rollout)
      ├─ First time: Shows "Submit to Stores" button
      ├─ After submit: Shows SubmissionCards + RolloutControls
      └─ User completes ENTIRE flow on this ONE page
```

#### Context 2: Managing Existing Submissions (Distribution Management Module)
```
Sidebar → "Distributions" Tab (separate module)
└─ Shows: ALL releases that completed pre-release
   ├─ Click any distribution entry
   ├─ Navigate to: /dashboard/{org}/distributions/{releaseId}
   └─ Shows: FULL management page (DIFFERENT from release page!)
      ├─ Platform Tabs (Android, iOS)
      ├─ SubmissionManagementCard (full actions)
      ├─ RolloutControls (slider, pause, halt)
      └─ ALL management dialogs
```

**Key Insight**: 
- ✅ **First-time flow: Release page** (LIMITED - submit + monitor)
- ✅ **Distribution module: Separate page** (FULL - complete management)
- ✅ **TWO VERSIONS of components**:
  - `SubmissionStatusCard` (read-only) for Release Page
  - `SubmissionManagementCard` (full actions) for Distribution Management
- ✅ **Different destinations**, different capabilities
- ❌ **NOT the same page** - intentionally separated!

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
├─ INFORMATION CARD: Extra Commits (if any)
│   ├─ Purpose: Visibility of cherry-picks/commits after regression
│   ├─ NOT a blocking step - just awareness
│   ├─ API fetches extra commits info
│   ├─ If extra commits exist:
│   │   ├─ Shows yellow info banner (not blocker)
│   │   ├─ Lists commits (sha, author, message)
│   │   ├─ Info: "These commits were added after regression"
│   │   └─ Recommendation: "Consider new regression cycle"
│   └─ User can still proceed to approve and distribute
│   
│   Flow: Have Artifact → See Cherry Picks (if any) → Approve
│
├─ STEP 4: Promote to Distribution
│   ├─ All checks pass → "Promote to Distribution" button ENABLED
│   ├─ Click button
│   ├─ URL changes: ?tab=distribution (SAME PAGE)
│   ├─ Tab content switches to distribution (no navigation away)
│   └─ Distribution tab content loads below stepper
│
└─ DISTRIBUTION TAB CONTENT (on same release page - see Journey 2)
```

### Journey 2: Submit to Stores (First Submission)

```
START: Just switched to Distribution tab (on same release page)
URL: /releases/{id}?tab=distribution
PAGE: Still on Release Details Page (just different tab content)
│
├─ INITIAL STATE: No submissions yet
│   ├─ Stepper above: Shows "Distribution" as active step
│   ├─ Tab content shows: "No submissions yet"
│   ├─ Shows: Build summary (Android: Ready, iOS: Ready)
│   └─ Shows: "Submit to Stores" button (big, prominent)
│
├─ STEP 1: Click "Submit to Stores"
│   └─ Opens: SubmitToStoresDialog (modal)
│
├─ STEP 2: Configure Submission
│   │
│   ├─ Platform Selection
│   │   ├─ ☑ Android (checked by default if available)
│   │   └─ ☑ iOS (checked by default if available)
│   │
│   ├─ Android Options (if selected)
│   │   ├─ Track: [Internal | Alpha | Beta | Production] (default: Production)
│   │   ├─ Initial Rollout: Slider [1% - 100%] (default: 100%)
│   │   ├─ Priority: [0-5] (default: 0)
│   │   └─ Release Notes: Textarea (editable)
│   │
│   └─ iOS Options (if selected)
│       ├─ Release Type: [Manual | After Approval | Scheduled] (default: After Approval)
│       ├─ Phased Release: Checkbox (default: checked)
│       └─ Release Notes: Textarea (editable)
│
├─ STEP 3: Click "Submit"
│   ├─ API: POST /releases/{id}/distribute
│   └─ Three possible outcomes:
│
│   ├─ OUTCOME A: Success (201)
│   │   ├─ Dialog closes
│   │   ├─ Toast: "Submitted successfully"
│   │   ├─ Page reloads/revalidates
│   │   └─ Shows: Submission cards (Android + iOS)
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
│   ├─ Polling: Every 10s (lightweight status check)
│   └─ Actions: ❌ NONE
│       └─ Message: "Manage this submission from Distribution tab"
│
├─ STATE 2: REJECTED
│   ├─ Status badge: 🔴 Red "Rejected"
│   ├─ Shows: Rejection reason (summary only)
│   ├─ Shows: Submission timestamp
│   └─ Actions: ❌ NONE
│       └─ Message: "Go to Distribution tab to re-submit"
│       └─ Link: [Open in Distribution Tab] → Navigate to distributions
│
├─ STATE 3: APPROVED or LIVE (Approved/Rolling Out)
│   ├─ Status badge: 🟢 Green "Approved" or "Live"
│   ├─ Shows: Current exposure % (e.g., "25%")
│   ├─ Shows: Rollout progress bar (read-only, no interaction)
│   ├─ Shows: Last updated timestamp
│   └─ Actions: ❌ NONE
│       └─ Message: "Manage rollout from Distribution tab"
│       └─ Link: [Open in Distribution Tab] → Navigate to distributions
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
- ✅ **Links to Distribution Sidebar** for management
- ✅ **Polling continues** to show live status updates

### Journey 4: Managing Existing Submissions (From Distribution Sidebar)

**Context**: Cross-release submission management (NOT first-time submission)

**Purpose of Distribution Sidebar**:
- ✅ **Manage existing submissions** across ALL releases
- ✅ **Quick access** to submissions needing attention
- ✅ **Centralized view** of all active distributions
- ❌ **NOT for first-time submission** (that happens on release page)

```
START: User wants to manage an EXISTING submission
│
├─ ENTRY METHOD A: From Distribution Management Sidebar (Primary)
│   ├─ Sidebar → Click "Distributions" (separate module)
│   ├─ URL: /dashboard/{org}/distributions
│   ├─ See list of all releases that completed pre-release
│   │   ├─ v2.5.0 - Rolling Out (Android: 25%, iOS: 50%)
│   │   ├─ v2.4.5 - Released (Android: 100%, iOS: 100%)
│   │   ├─ v2.4.0 - Rejected (Android: Rejected, iOS: Released)
│   │   ├─ v2.3.5 - Ready to Submit (No submissions yet)
│   │   └─ ... (ALL releases that completed pre-release)
│   │
│   ├─ Click distribution entry (e.g., "v2.5.0")
│   └─ Navigate to: /dashboard/{org}/distributions/{releaseId}
│       (This is DIFFERENT PAGE from release page!)
│
├─ ENTRY METHOD B: From Release Page Link
│   ├─ User on Release Page: /releases/{id}?tab=distribution
│   ├─ Clicks: "Open in Distribution Management" button
│   └─ Navigate to: /dashboard/{org}/distributions/{releaseId}
│
├─ PAGE LOADS: Distribution Management Page (FULL Control)
│   Layout: Platform Tabs (NO STEPPER)
│   │
│   ├─ Android Submission Card (if exists)
│   │   ├─ Shows: Current status, rollout %, timestamp
│   │   └─ Actions: Based on current state (see Journey 3)
│   │
│   └─ iOS Submission Card (if exists)
│       ├─ Shows: Current status, rollout %, timestamp
│       └─ Actions: Based on current state (see Journey 3)
│
├─ USE CASE 1: Fix Rejected Submission
│   ├─ Submission status: REJECTED
│   ├─ Click: "Fix & Re-Submit" button
│   ├─ Opens: ReSubmissionDialog
│   │   ├─ **Form is PRE-FILLED with previous values**
│   │   ├─ Release Notes: (editable, shows previous)
│   │   ├─ Descriptions: (editable, shows previous)
│   │   ├─ Keywords: (editable, shows previous)
│   │   └─ NEW BUILD OPTIONS:
│   │       ├─ Checkbox: "Upload new build (for code fixes)"
│   │       ├─ If checked (iOS): New TestFlight number field
│   │       └─ If checked (Android): New AAB file picker
│   ├─ User edits metadata OR uploads new build
│   ├─ Click: "Re-Submit"
│   ├─ API: POST /submissions/{id}/retry
│   └─ Success → Submission status returns to IN_REVIEW
│
├─ USE CASE 2: Manage Active Rollout
│   ├─ Submission status: LIVE (50%)
│   ├─ Shows: RolloutControls component
│   │   ├─ Current: 50%
│   │   ├─ Progress bar: 50% (animated)
│   │   └─ Actions available:
│   │
│   ├─ ACTION A: Increase Rollout
│   │   ├─ User selects: 75% (quick preset) or slider
│   │   ├─ Click: "Update Rollout"
│   │   ├─ API: PATCH /submissions/{id}/rollout
│   │   ├─ Optimistic update: Progress bar animates to 75%
│   │   └─ Success → Confirmed at 75%
│   │
│   ├─ ACTION B: Pause Rollout
│   │   ├─ Click: "Pause" button
│   │   ├─ Opens: PauseRolloutDialog
│   │   ├─ Optional: Enter reason
│   │   ├─ Confirm → API: POST /submissions/{id}/rollout/pause
│   │   └─ Success → Status changes to "PAUSED", actions change
│   │
│   ├─ ACTION C: Resume Rollout (if paused)
│   │   ├─ Click: "Resume" button
│   │   ├─ Opens: ResumeRolloutDialog (simple confirmation)
│   │   ├─ Confirm → API: POST /submissions/{id}/rollout/resume
│   │   └─ Success → Status returns to "ROLLING OUT"
│   │
│   └─ ACTION D: Emergency Halt
│       ├─ Click: "Emergency Halt" button (RED, always visible)
│       ├─ Opens: HaltRolloutDialog
│       │   ├─ Reason: (required field)
│       │   ├─ Severity: [Critical | High | Medium]
│       │   └─ Warning: "This requires a hotfix release"
│       ├─ Confirm → API: POST /submissions/{id}/rollout/halt
│       └─ Success → Release status → HALTED (terminal)
│
└─ USE CASE 3: View Submission History
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

**Key Insight**: 
- ✅ **EXACT SAME UI/UX** whether first-time or managing existing
- ✅ **ALL ACTIONS AVAILABLE** based on submission state, not context
- ✅ **FORMS ARE REUSABLE** - same components, different data source
- ✅ **NO SPECIAL "EDIT MODE"** - components handle both naturally

---

## 3. Pre-Release Stage Flow

### 3.1 Page Load

**URL**: `/dashboard/{org}/releases/{releaseId}?tab=pre-release`

**API Calls on Load**:
```typescript
await Promise.all([
  DistributionService.getBuilds(releaseId),        // Get build status
  DistributionService.getPMStatus(releaseId),      // Get approval status
  DistributionService.checkExtraCommits(releaseId) // Check for warnings
]);
```

**UI Sections**:
1. Build Status Cards (Android + iOS)
2. PM Approval Status
3. Extra Commits Warning (if applicable)
4. "Promote to Distribution" button

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

### 3.3 Extra Commits Information Card

**Purpose**: Show awareness of cherry-picks after regression

**UI**:
```
┌─────────────────────────────────────────────────────────────┐
│  ℹ️  Extra Commits Detected (Information Only)              │
│                                                              │
│  3 commits were added after the last regression:            │
│                                                              │
│  • abc123 - Fix crash on Android 12 (John Doe)              │
│  • def456 - Update API timeout (Jane Smith)                 │
│  • ghi789 - Add new analytics event (Bob Johnson)           │
│                                                              │
│  ℹ️  Recommendation: Consider new regression cycle          │
│                                                              │
│  Note: This is for awareness only. You can still proceed.   │
└─────────────────────────────────────────────────────────────┘
```

**Key Points**:
- ❗ **NOT a blocker** - user can still approve and distribute
- ✅ **Informational** - helps release lead make informed decision
- ✅ **Always visible** if extra commits exist
- ❌ **NO "Proceed Anyway" checkbox** - not required

### 3.4 Promote to Distribution Button

**Button State Logic**:

```typescript
function canPromoteToDistribution(): boolean {
  const androidReady = androidBuild?.buildUploadStatus === 'UPLOADED';
  const iosReady = iosBuild?.buildUploadStatus === 'UPLOADED';
  const allBuildsReady = androidReady && iosReady;
  
  const approvalMet = pmStatus.approved === true;
  
  // ❗ Extra commits is INFORMATION ONLY, not a blocker
  // User can proceed even if extra commits exist
  
  return allBuildsReady && approvalMet;
}
```

**Button Click Action**:
```typescript
onClick={() => {
  navigate(`/dashboard/${org}/releases/${releaseId}?tab=distribution`);
}}
```

---

## 4. Distribution Stage Flow

### 4.1 Page Load

**URL**: `/dashboard/{org}/releases/{releaseId}?tab=distribution`

**API Calls on Load**:
```typescript
await Promise.all([
  DistributionService.getDistributionStatus(releaseId), // Overall status
  DistributionService.getSubmissions(releaseId)         // All submissions
]);
```

### 4.2 Initial State (No Submissions)

**UI**:
```
┌─────────────────────────────────────────────┐
│  No Submissions Yet                          │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  Android Build: Ready ✅              │  │
│  │  iOS Build: Ready ✅                  │  │
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
- Current rollout % (if APPROVED or LIVE)
- Rollout progress bar (animated)
- Action buttons (context-dependent)
- Link to "View History"

### 4.4 Submission Card: Two Versions

#### Version A: Release Page (Limited - Monitor Only)

| Status | Badge | Progress Bar | Actions | Notes |
|--------|-------|--------------|---------|-------|
| `IN_REVIEW` | 🟡 In Review | Hidden | ❌ None | Link to Distribution tab |
| `REJECTED` | 🔴 Rejected | Hidden | ❌ None | Link to Distribution tab |
| `APPROVED` or `LIVE` | 🟢 Approved/Live | Read-only | ❌ None | Link to Distribution tab |
| `LIVE` (100%) | 🔵 Live | 100% | ❌ None | Read-only |

#### Version B: Distribution Sidebar (Full - All Actions)

| Status | Badge | Progress Bar | Actions Available |
|--------|-------|--------------|-------------------|
| `IN_REVIEW` | 🟡 In Review | Hidden | None (just wait + poll) |
| `REJECTED` | 🔴 Rejected | Hidden | ✅ "Fix & Re-Submit" |
| `APPROVED` (not started) | 🟢 Approved | 0% | ✅ Start Rollout, Halt, History |
| `LIVE` (1%) | 🟢 Live | 1% (animated) | ✅ Update, Pause, Halt, History |
| `LIVE` (50%) | 🟢 Live | 50% (animated) | ✅ Update, Pause, Halt, History |
| `LIVE` (PAUSED) | 🟠 Paused | Current % (static) | ✅ Resume, Halt, History |
| `LIVE` (100%) | 🔵 Live | 100% (complete) | ✅ History only |

**Key Differences**:
- ❌ **Release Page**: Read-only status display + link to distribution tab
- ✅ **Distribution Sidebar**: Full management with all action buttons

### 4.5 Complete Distribution Stage Flow (Step-by-Step)

**Objective**: This page handles the ENTIRE distribution lifecycle

#### Phase 1: Pre-Submission (No submissions exist)

**Page State**:
```
┌─────────────────────────────────────────────────────────────┐
│  Distribution Status: Not Started                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Builds Ready:                                        │  │
│  │  ✅ Android v2.5.0 (Build 250)                        │  │
│  │  ✅ iOS v2.5.0 (Build 17965)                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  No submissions yet. Submit your builds to app stores.      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        [Submit to Stores] (Large, Prominent)         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Actions**:
1. Click "Submit to Stores"
2. Opens: SubmitToStoresDialog
3. Fill form (platforms, tracks, rollout %, release notes)
4. Submit → Creates submissions
5. Page reloads → Shows Phase 2

#### Phase 2: Submission Tracking (Submissions exist, in review)

**Page State**:
```
┌─────────────────────────────────────────────────────────────┐
│  Distribution Status: In Review                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🟡 Android - IN_REVIEW                               │  │
│  │  Version: 2.5.0 (250)                                 │  │
│  │  Track: Production                                    │  │
│  │  Submitted: Dec 10, 2025 3:30 PM                      │  │
│  │  Status: Awaiting Play Store review...                │  │
│  │  • Polling every 10s for status updates               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🟡 iOS - IN_REVIEW                                   │  │
│  │  Version: 2.5.0 (17965)                               │  │
│  │  Release Type: After Approval                         │  │
│  │  Submitted: Dec 10, 2025 3:30 PM                      │  │
│  │  Status: Awaiting App Store review...                 │  │
│  │  • Polling every 10s for status updates               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Backend Polling**: 
- Frontend polls: `GET /submissions/{id}/status` every 10s
- Status changes: IN_REVIEW → APPROVED/LIVE (or REJECTED)
- UI updates automatically on status change

#### Phase 3: Rollout Management (Approved, rolling out)

**Page State** (after approval):
```
┌─────────────────────────────────────────────────────────────┐
│  Distribution Status: Rolling Out                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🟢 Android - LIVE                                    │  │
│  │  Version: 2.5.0 • Rollout: 25%                        │  │
│  │  ━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░                  │  │
│  │                                                        │  │
│  │  Rollout Controls:                                    │  │
│  │  Quick: [1%] [5%] [10%] [25%] [50%] [100%]           │  │
│  │  Custom: [Slider: 25 → 100] [Update Rollout]         │  │
│  │                                                        │  │
│  │  [Pause Rollout] [Emergency Halt]                     │  │
│  │  [View History]                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🟢 iOS - LIVE                                        │  │
│  │  Version: 2.5.0 • Phased Release: Day 3/7             │  │
│  │  ━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░                  │  │
│  │  Note: Apple manages phased release automatically     │  │
│  │                                                        │  │
│  │  [Emergency Halt] [View History]                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**All Actions Work Identically** whether:
- ✅ First time seeing this page
- ✅ Returning from Distribution tab
- ✅ Reopening after days/weeks

#### Phase 4: Rejection Recovery (If rejected)

**Page State** (if rejected):
```
┌─────────────────────────────────────────────────────────────┐
│  Distribution Status: Requires Action                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🔴 Android - REJECTED                                │  │
│  │  Version: 2.5.0                                        │  │
│  │                                                        │  │
│  │  Rejection Reason:                                     │  │
│  │  "App crashes on startup (Samsung Galaxy S21)"        │  │
│  │                                                        │  │
│  │  Details:                                              │  │
│  │  • Guideline: 4.0 - Design                            │  │
│  │  • Screenshot: [View]                                  │  │
│  │                                                        │  │
│  │  To resolve, you can:                                  │  │
│  │  1. Fix metadata (release notes, etc.) OR             │  │
│  │  2. Upload new build (if code changes needed)         │  │
│  │                                                        │  │
│  │  [Fix & Re-Submit]                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Click "Fix & Re-Submit"**:
```
Opens: ReSubmissionDialog
│
├─ Form Structure (PRE-FILLED):
│   │
│   ├─ Section 1: Metadata (editable)
│   │   ├─ Release Notes: [Pre-filled from previous]
│   │   ├─ Short Description: [Pre-filled]
│   │   ├─ Full Description: [Pre-filled]
│   │   └─ Keywords: [Pre-filled]
│   │
│   ├─ Section 2: New Build (optional)
│   │   ├─ Checkbox: "Code changes required (upload new build)"
│   │   ├─ If Android & checked:
│   │   │   └─ File picker: Upload new AAB
│   │   └─ If iOS & checked:
│   │       └─ Text input: New TestFlight build number
│   │
│   └─ Section 3: Actions
│       ├─ [Cancel] → Close dialog
│       └─ [Re-Submit] → API call
│
├─ Submit API: POST /submissions/{id}/retry
│   Request:
│   {
│     submissionId: "sub_123",
│     updates: {
│       releaseNotes: "Fixed crash on Samsung devices",
│       // ... other edited metadata
│     },
│     newBuildId: "build_456" // Only if new build uploaded
│   }
│
└─ Success:
    ├─ Dialog closes
    ├─ Toast: "Re-submitted successfully"
    ├─ Submission status → IN_REVIEW
    └─ Polling resumes (wait for approval)
```

---

## 3. Pre-Release Stage Flow

---

## 5. Distribution Tab Flow

### 5.1 Entry Point

**Sidebar**: Click "Distributions"

**URL**: `/dashboard/{org}/distributions`

### 5.2 Page Load

**API Call**:
```typescript
await DistributionService.listDistributions();
```

**Filtering Rule**: ❗ **CRITICAL** (FINAL!)
```typescript
// Show ALL releases where user can manage distributions
// Backend provides simple statuses - frontend just filters!

distributions.filter(dist => {
  return ['READY_FOR_SUBMISSION', 'COMPLETED'].includes(dist.releaseStatus);
});

// Release-Level Statuses (3 Total):
// - PRE_RELEASE: Before builds ready (NOT shown in Distribution List)
// - READY_FOR_SUBMISSION: Builds ready, PM approved (CAN SUBMIT)
// - COMPLETED: All submissions live (VIEW ONLY)

// Submission-Level Statuses (5 Total):
// - IN_REVIEW: Submitted, awaiting review
// - APPROVED: Store approved, can start rollout
// - LIVE: Rolling out or live in store
// - REJECTED: Store rejected
// - HALTED: Emergency halt

// ✅ Backend handles all complexity (pmApproved, hasBuilds, etc.)
// ✅ Frontend just checks releaseStatus field
// ✅ Simple and clean!
```

**Display**: Table/Grid of Distribution Entries

### 5.3 Distribution Entry Card

**Shows**:
- Release version (e.g., "2.5.0")
- Release branch (e.g., "release/2.5.0")
- Overall status badge
- Platform summaries:
  - Android: Status + Current %
  - iOS: Status + Current %
- Last updated timestamp
- "Open" button → Navigates to Release Distribution page

**Click Action**:
```typescript
onClick={() => {
  navigate(`/dashboard/${org}/releases/${releaseId}?tab=distribution`);
}}
```

### 5.4 Summary Cards

**Top of Page**:
```
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ Total: 5      │ Rolling Out: 2│ In Review: 1  │ Released: 1   │
└───────────────┴───────────────┴───────────────┴───────────────┘
```

### 5.5 Managing Submissions from Distribution Tab

**Critical**: When you click a distribution entry from the sidebar, it opens the **SAME** Release Distribution Page with the **SAME** components.

**Flow**:
```
Sidebar: Distributions → Click "v2.5.0" → Navigate to:
  /dashboard/{org}/releases/{releaseId}?tab=distribution
  
Same Page Loads, Showing:
  ├─ SubmissionCard (Android) - with ALL actions
  │   ├─ View status
  │   ├─ Retry (if rejected)
  │   ├─ Update rollout (if approved)
  │   ├─ Pause/Resume/Halt
  │   └─ View history
  │
  └─ SubmissionCard (iOS) - with ALL actions
      └─ Same actions as Android
```

**What You Can Do**:

1. **View Current Status** (always)
   - See current submission state
   - View rollout progress
   - Check last updated time

2. **Fix Rejected Submissions**
   - Click "Fix & Re-Submit"
   - Opens: ReSubmissionDialog (pre-filled with existing values)
   - Edit metadata (release notes, description, etc.)
   - Upload new build (optional)
   - Submit → Creates new submission attempt

3. **Manage Active Rollouts**
   - Update rollout percentage (1% → 100%)
   - Pause rollout (with reason)
   - Resume paused rollout
   - Emergency halt (requires reason + severity)

4. **View History**
   - Click "View History"
   - Opens: SubmissionHistoryPanel
   - Shows: All events (submitted, approved, rollout changes, etc.)
   - Timeline view with actors and timestamps

**Key Point**: 
- ❗ **NO DIFFERENCE** between new submission and managing existing submission
- **SAME UI components** handle both contexts
- **SAME actions available** based on submission status
- **SAME forms** work for create and edit flows

---

## 6. Detailed UI States

### 6.1 SubmitToStoresDialog (Form)

**Trigger**: Click "Submit to Stores" button

**Form Fields**:

```typescript
type SubmitFormData = {
  // Platform selection
  platforms: Array<'ANDROID' | 'IOS'>;  // Multi-select
  
  // Android options (shown if Android selected)
  android?: {
    track: 'INTERNAL' | 'ALPHA' | 'BETA' | 'PRODUCTION';
    rolloutPercentage: number; // 1-100
    priority: 0 | 1 | 2 | 3 | 4 | 5;
    releaseNotes: string;
  };
  
  // iOS options (shown if iOS selected)
  ios?: {
    releaseType: 'MANUAL_RELEASE' | 'AFTER_APPROVAL' | 'SCHEDULED';
    phasedRelease: boolean;
    releaseNotes: string;
  };
};
```

**Submit Flow**:
```typescript
async function handleSubmit(formData: SubmitFormData) {
  try {
    const response = await DistributionService.submitToStores(releaseId, formData);
    
    if (response.success) {
      closeDialog();
      showToast({ type: 'success', message: 'Submitted successfully' });
      revalidate(); // Reload page data
    }
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

**Form Fields** (Pre-filled from previous submission):

```typescript
type ReSubmissionFormData = {
  // Editable metadata
  releaseNotes: string;
  shortDescription?: string;
  fullDescription?: string;
  keywords?: string; // Comma-separated
  
  // Optional: New build (if code fixes needed)
  newBuild?: {
    ios?: {
      testflightBuildNumber: string; // New TestFlight number
    };
    android?: {
      aabFile: File; // New AAB file upload
    };
  };
};
```

**Submit Flow**:
```typescript
async function handleReSubmit(formData: ReSubmissionFormData) {
  try {
    const response = await DistributionService.retrySubmission(submissionId, formData);
    
    if (response.success) {
      closeDialog();
      showToast({ type: 'success', message: 'Re-submitted successfully' });
      revalidate(); // Reload page data
    }
  } catch (error) {
    showToast({ type: 'error', message: error.message });
  }
}
```

### 6.3 RolloutControls Component

**Shows When**: Submission status = `APPROVED` or `LIVE`

**UI**:
```
┌─────────────────────────────────────────────────────────────┐
│  Current Rollout: 25%                                        │
│  ━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │
│                                                              │
│  Quick Presets: [1%] [5%] [10%] [25%] [50%] [100%]         │
│                                                              │
│  Custom: [Slider: 25 → 100]                                 │
│                                                              │
│  [Update Rollout] [Pause] [Emergency Halt]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Action Matrix

### 7.1 Available Actions by Context

#### Release Page Distribution Tab (LIMITED)

| Submission Status | View Status | Actions Available | Notes |
|-------------------|-------------|-------------------|-------|
| `IN_REVIEW` | ✅ | ❌ None | Link to Distribution sidebar |
| `REJECTED` | ✅ | ❌ None | Link to Distribution sidebar |
| `APPROVED` or `LIVE` | ✅ | ❌ None | Link to Distribution sidebar |
| `LIVE` (100%) | ✅ | ❌ None | Read-only |

**Purpose**: Submit once + Monitor status only

#### Distribution Sidebar (FULL MANAGEMENT)

| Submission Status | View | Retry | Update Rollout | Pause | Resume | Halt | History |
|-------------------|------|-------|----------------|-------|--------|------|---------|
| `IN_REVIEW` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `REJECTED` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `APPROVED` | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `LIVE` (active) | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `LIVE` (paused) | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `LIVE` (100%) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Purpose**: Complete post-submission management

### 7.2 User Permissions

| Action | Requires Role | Notes |
|--------|--------------|-------|
| Upload AAB | Developer+ | All authenticated users |
| Verify TestFlight | Developer+ | All authenticated users |
| Approve Release (manual) | Release Lead/Pilot | Permission check |
| Submit to Stores | Developer+ | All authenticated users |
| Update Rollout | Developer+ | All authenticated users |
| Pause/Resume | Developer+ | All authenticated users |
| Emergency Halt | Release Lead/Pilot | Permission check + confirmation |

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
- Option 1: Navigate to previous release distribution page → Complete rollout
- Option 2: Call API to halt previous release → Retry submission
- Option 3: Force submit (show additional warnings)

---

## 9. Three-Page Architecture

### 9.1 Complete Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ PAGE 1: Release Page - Distribution Tab (LIMITED)           │
│ Route: /dashboard/{org}/releases/{releaseId}?tab=distribution│
├─────────────────────────────────────────────────────────────┤
│ Components:                                                  │
│ ├─ Stepper (shows stages)                                   │
│ ├─ Release info                                             │
│ └─ Distribution tab content:                                │
│    ├─ SubmitToStoresDialog (if no submissions)             │
│    ├─ SubmissionStatusCard (read-only, if has submissions) │
│    └─ Link: "Open in Distribution Management"              │
│                                                              │
│ Purpose: Submit + Monitor during release process            │
│ Capabilities: LIMITED (no management actions)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PAGE 2: Distributions List (ENTRY POINT)                    │
│ Route: /dashboard/{org}/distributions                       │
├─────────────────────────────────────────────────────────────┤
│ Components:                                                  │
│ ├─ Summary cards (Total, Rolling Out, Released, etc.)      │
│ └─ Distribution entry cards:                                │
│    ├─ Release version + branch                             │
│    ├─ Platform status summaries                            │
│    ├─ Last updated                                          │
│    └─ Click → Navigate to Page 3                           │
│                                                              │
│ Purpose: Central hub to access all distributions            │
│ Shows: All releases past pre-release                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PAGE 3: Distribution Management Page (FULL)                 │
│ Route: /dashboard/{org}/distributions/{releaseId}          │
├─────────────────────────────────────────────────────────────┤
│ Layout: NO STEPPER (different from release page)            │
│                                                              │
│ Header:                                                      │
│ ├─ Breadcrumb: Distributions > v2.5.0                      │
│ ├─ Title: Distribution Management                          │
│ ├─ Release Info: v2.5.0 | release/2.5.0                    │
│ ├─ Status Badge: IN PROGRESS                               │
│ ├─ Platforms: Android, iOS                                 │
│ └─ Dates: Created Nov 25 | Target Dec 10                   │
│                                                              │
│ Content: PLATFORM TABS (Primary Navigation)                 │
│ ├─ Tab: Android                                             │
│ │   ├─ Submission Status Card                              │
│ │   ├─ RolloutControls (if approved)                       │
│ │   ├─ Actions: Retry, Pause, Halt                         │
│ │   └─ History Panel                                        │
│ │                                                            │
│ └─ Tab: iOS                                                 │
│     ├─ Submission Status Card                              │
│     ├─ RolloutControls (if approved)                       │
│     ├─ Actions: Retry, Pause, Halt                         │
│     └─ History Panel                                        │
│                                                              │
│ Purpose: Complete distribution management (platform-focused)│
│ Capabilities: FULL (all actions available)                  │
│ Why Tabs?: Each platform has different workflows & controls │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Navigation Between Pages

```
Page 1 (Release Page)
    └─ Link: "Open in Distribution Management"
        └─ Navigate to: Page 3 (same releaseId)

Page 2 (Distributions List)
    └─ Click any entry
        └─ Navigate to: Page 3 (specific releaseId)

Page 3 (Distribution Management)
    └─ Can navigate back to:
        ├─ Page 2 (via breadcrumb/back button)
        └─ Page 1 (via "View Release" link if needed)
```

## 10. Distribution Management Page - Complete UI Design

### 10.1 Page Layout (No Stepper)

```
┌─────────────────────────────────────────────────────────────┐
│ DISTRIBUTION MANAGEMENT PAGE                                 │
│ Route: /dashboard/{org}/distributions/{releaseId}          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BREADCRUMB                                                   │
│ Distributions > v2.5.0                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Distribution Management                   [🔄 Refresh]│   │
│ │                                                       │   │
│ │ v2.5.0 | release/2.5.0 | 🟢 IN PROGRESS             │   │
│ │ Platforms: Android, iOS                               │   │
│ │ Created: Nov 25, 2025 | Target: Dec 10, 2025        │   │
│ └──────────────────────────────────────────────────────┘   │
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

### 10.2 Submission Status States (Per Platform)

Each platform tab can be in one of these states:

#### State 1: Not Submitted Yet
```
┌─────────────────────────────────────────────────────────────┐
│ Android Tab                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  No submission yet for Android                               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │  Ready to submit this release to Google Play Store │    │
│  │                                                     │    │
│  │  [Submit to Play Store]                            │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### State 2: In Review (IN_REVIEW)
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

#### State 3: Rejected
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
│  [Fix & Re-Submit]                                           │
│                                                              │
│  [View Submission History]                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### State 4: Rolling Out (LIVE)
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
│  │ Rollout Controls                                    │    │
│  │                                                     │    │
│  │ Quick Presets:                                      │    │
│  │ [1%] [5%] [10%] [25%] [50%] [100%]                │    │
│  │                                                     │    │
│  │ Custom: [Slider: 25 → 100]                         │    │
│  │                                                     │    │
│  │ [Update Rollout]                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Actions:                                                    │
│  [Pause Rollout] [Emergency Halt] [View History]            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### State 5: Paused
```
┌─────────────────────────────────────────────────────────────┐
│ Android Tab                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🟠 PAUSED                                                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Rollout Paused                                      │    │
│  │                                                     │    │
│  │ Current: 25% (paused)                               │    │
│  │ Paused: Dec 12, 2025 10:00 AM                      │    │
│  │ Reason: Monitoring crash reports                    │    │
│  │                                                     │    │
│  │ ━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░  (25% frozen)     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Actions:                                                    │
│  [Resume Rollout] [Emergency Halt] [View History]           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### State 6: Live (100%)
```
┌─────────────────────────────────────────────────────────────┐
│ Android Tab                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔵 LIVE (100%)                                              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Release Complete! 🎉                                │    │
│  │                                                     │    │
│  │ Version: 2.5.0 (250)                               │    │
│  │ Released: Dec 15, 2025 6:00 PM                     │    │
│  │ Rollout: 100% (Complete)                            │    │
│  │                                                     │    │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100%           │    │
│  │                                                     │    │
│  │ [View in Play Store] (external link)               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [View Submission History]                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Platform Tabs Behavior

**Why Tabs?**
- ✅ Each platform has different workflows (Play Store vs App Store)
- ✅ Different rollout controls (Android: granular %, iOS: phased release)
- ✅ Different submission metadata requirements
- ✅ Focused view - manage one platform at a time
- ✅ More space for controls and details

**Tab Badges**:
```
┌──────────────┬──────────────┐
│ Android 🟢25%│   iOS 🟡    │
└──────────────┴──────────────┘
  ↑           ↑      ↑
  Platform    Status Current%
```

**Tab Content**: Switches completely based on selected platform

### 10.4 Release Page Distribution Tab - Updated

```
┌─────────────────────────────────────────────────────────────┐
│ RELEASE PAGE - Distribution Tab (LIMITED)                    │
│ Route: /releases/{id}?tab=distribution                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ HEADER (Global Button)                                       │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Distribution Status                                   │   │
│ │                        [Open in Distribution Management] │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CONTENT                                                      │
│                                                              │
│  IF NO SUBMISSIONS:                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ No submissions yet                                  │    │
│  │                                                     │    │
│  │ Android Build: Ready ✅                             │    │
│  │ iOS Build: Ready ✅                                 │    │
│  │                                                     │    │
│  │ [Submit to Stores]                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  IF HAS SUBMISSIONS (Read-Only Cards):                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🟢 Android - Live (25%)                             │    │
│  │ Submitted: Dec 10, 2025 3:30 PM                    │    │
│  │ Last updated: 2 minutes ago                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🟡 iOS - In Review                                  │    │
│  │ Submitted: Dec 10, 2025 3:30 PM                    │    │
│  │ Last updated: 2 minutes ago                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Note: For rollout management, use Distribution Management  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Auto-refresh: On page focus (no explicit button needed)
```

### 10.5 Distribution List Entry - Updated

```
┌─────────────────────────────────────────────────────────────┐
│ DISTRIBUTIONS LIST                                           │
│ Route: /dashboard/{org}/distributions                       │
└─────────────────────────────────────────────────────────────┘

Entry 1 (Has Submissions):
┌────────────────────────────────────────────────────────┐
│ v2.5.0                                 🟢 IN PROGRESS   │
│ release/2.5.0                                          │
│                                                         │
│ 🟢 Android: Live (25%)                                 │
│ 🟡 iOS: In Review                                      │
│                                                         │
│ Updated: 2 minutes ago                  [Open]         │
└────────────────────────────────────────────────────────┘

Entry 2 (No Submissions - Nudge):
┌────────────────────────────────────────────────────────┐
│ v2.4.0                        🔵 READY TO SUBMIT       │
│ release/2.4.0                                          │
│                                                         │
│ No submissions yet - Click to submit                   │
│                                                         │
│ Platforms ready: Android ✅  iOS ✅                     │
│                                                         │
│ [Submit Now]                                            │
└────────────────────────────────────────────────────────┘

Entry 3 (Complete):
┌────────────────────────────────────────────────────────┐
│ v2.3.0                               🎉 COMPLETED      │
│ release/2.3.0                                          │
│                                                         │
│ 🔵 Android: Live (100%)                                │
│ 🔵 iOS: Live (100%)                                    │
│                                                         │
│ Released: Dec 1, 2025               [View]             │
└────────────────────────────────────────────────────────┘
```

## 11. Component Breakdown by Page

### 11.1 Release Page Distribution Tab (LIMITED)
**Purpose**: First-time submission + read-only monitoring

**Components**:
- `SubmissionStatusCard` (read-only) - shows status, no actions
- `SubmitToStoresForm` (only if no submissions yet)
- Manual refresh on page focus
- "Open in Distribution Management" button (global, at top)

**Restrictions**:
- ❌ No rollout controls
- ❌ No pause/resume/halt
- ❌ No retry submission
- ✅ Can submit for first time only
- ✅ Shows status updates

### 11.2 Distribution Management Page (FULL)
**Purpose**: Complete distribution control

**Components**:
- Platform Tabs (Android / iOS)
- Per-tab content:
  - `SubmissionManagementCard` (full functionality)
  - `RolloutControls` (slider, presets)
  - `ReSubmissionDialog` (if rejected)
  - `PauseRolloutDialog`
  - `ResumeRolloutDialog`
  - `HaltRolloutDialog`
  - `SubmissionHistoryPanel`

**Capabilities**:
- ✅ Submit new platforms
- ✅ Manage rollouts
- ✅ Retry submissions
- ✅ Pause/Resume/Halt
- ✅ View history
- ✅ All actions available

### 11.3 Distribution List Page
**Purpose**: Overview of all distributions

**Shows**:
- All releases that completed pre-release
- Includes releases with NO submissions (nudges user to submit)
- Status badges per platform
- Quick actions (Open/Submit Now)

## 12. Distribution Management - Status, Intent & Actions Matrix

### 12.1 All Possible Submission Statuses (Per Platform)

| Status | Display | Meaning | User Can |
|--------|---------|---------|----------|
| `NOT_SUBMITTED` | 🔵 Ready to Submit | No submission made yet | Submit for first time |
| `IN_REVIEW` | 🟡 In Review | Sent to store, awaiting review | View status, wait |
| `REJECTED` | 🔴 Rejected | Store rejected submission | Fix & resubmit |
| `APPROVED` | 🟢 Approved | Store approved, can start rollout | Start rollout, halt |
| `LIVE` | 🟢 Live (X%) | Rolling out to users | Increase %, pause, halt |
| `LIVE` (PAUSED) | 🟠 Paused | Rollout paused by user | Resume, halt |
| `HALTED` | 🔴 Halted | Emergency stop | View only (no actions) |
| `LIVE` (100%) | 🔵 Live (100%) | Fully live | View only |

### 12.2 User Intents & Available Actions

#### Intent 1: First-Time Submission
**When**: `NOT_SUBMITTED` status  
**User wants to**: Submit release to store for first time  
**Actions**:
- [Submit to Play Store] or [Submit to App Store]
- Opens `SubmitToStoresForm` dialog
- User fills: Track, Rollout %, Priority (Android) or Release Type, Phased (iOS)

#### Intent 2: Monitor Submission
**When**: `IN_REVIEW` status  
**User wants to**: Check if store approved yet  
**Actions**:
- [View Submission Details] (read-only)
- [View History]
- Auto-refresh shows latest status

#### Intent 3: Fix Rejection
**When**: `REJECTED` status  
**User wants to**: Fix issues and resubmit  
**Actions**:
- [View Rejection Details] (reason, guideline, screenshots)
- [Fix & Re-Submit]
  - Opens `ReSubmissionDialog`
  - Option A: Fix metadata only (release notes, description)
  - Option B: Upload new build (if code changes needed)

#### Intent 4: Increase Rollout
**When**: `APPROVED` or `LIVE` status, rollout < 100%  
**User wants to**: Gradually increase exposure  
**Actions**:
- Use `RolloutControls` slider or presets
- [Update Rollout] - increases from current % to new %
- Quick presets: 1%, 5%, 10%, 25%, 50%, 100%

#### Intent 5: Pause Rollout
**When**: `LIVE` status, rollout > 0%  
**User wants to**: Temporarily stop rollout (bug reports, monitoring)  
**Actions**:
- [Pause Rollout]
- Opens `PauseRolloutDialog`
- User provides reason (optional)
- Rollout freezes at current %

#### Intent 6: Resume Rollout
**When**: `PAUSED` status  
**User wants to**: Continue rollout after pause  
**Actions**:
- [Resume Rollout]
- Opens `ResumeRolloutDialog`
- Rollout continues from paused %

#### Intent 7: Emergency Halt
**When**: `APPROVED` or `LIVE` (including PAUSED) status  
**User wants to**: Stop rollout immediately (critical bug)  
**Actions**:
- [Emergency Halt]
- Opens `HaltRolloutDialog`
- User provides severity + reason
- Rollout stops permanently for this submission
- User must create new submission to re-release

#### Intent 8: View History
**When**: Any status  
**User wants to**: See audit trail of all actions  
**Actions**:
- [View Submission History]
- Shows timeline of all events:
  - Submission created
  - Status changes
  - Rollout % changes
  - Pause/Resume/Halt events
  - Rejection details

#### Intent 9: Add Platform
**When**: Release has only 1 platform submitted  
**User wants to**: Submit to another store  
**Actions**:
- [Submit Additional Platform] (global action)
- Opens `SubmitToStoresForm` with only unsubmitted platforms

### 12.3 Platform-Specific Differences

#### Android (Play Store)
- **Track Selection**: Internal, Alpha, Beta, Production
- **Rollout Control**: Granular % control (1-100%)
- **Priority**: 0-5 (in-app update urgency)
- **Typical Review Time**: 1-3 days
- **Rejection Handling**: Can update metadata without new build

#### iOS (App Store)
- **Release Type**: Manual, After Approval, Scheduled
- **Phased Release**: On/Off (7-day automatic rollout)
- **Rollout Control**: Limited (phased = gradual, non-phased = immediate)
- **Typical Review Time**: 24-48 hours
- **Rejection Handling**: Often requires new build

### 12.4 Action Availability Matrix

| Status | Submit | Retry | Increase % | Pause | Resume | Halt | View History |
|--------|--------|-------|------------|-------|--------|------|--------------|
| NOT_SUBMITTED | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| IN_REVIEW | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| REJECTED | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| APPROVED | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| LIVE (0-99%) | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| LIVE (PAUSED) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| HALTED | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| LIVE (100%) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 13. Complete User Flows

### 13.1 Flow 1: First-Time Submission (From Release Page)

```
1. User navigates: Releases List → Open Release v2.5.0
   └─ Shows stepper: [✓ Pending] [✓ Pre-Release] [→ Distribution]

2. User clicks: Distribution step or tab
   └─ Opens: /releases/{id}?tab=distribution

3. Page shows:
   ┌────────────────────────────────────────┐
   │ No submissions yet                      │
   │ Android Build: Ready ✅                 │
   │ iOS Build: Ready ✅                     │
   │ [Submit to Stores]                      │
   └────────────────────────────────────────┘

4. User clicks: [Submit to Stores]
   └─ Opens: SubmitToStoresForm dialog
   └─ User selects platforms, fills options
   └─ Clicks: [Submit]

5. Backend processes submission
   └─ If success: Shows read-only status cards
   └─ If error: Shows conflict resolution dialog

6. User sees:
   ┌────────────────────────────────────────┐
   │ 🟡 Android - In Review                 │
   │ 🟡 iOS - In Review                     │
   │                                         │
   │ [Open in Distribution Management] ←    │
   └────────────────────────────────────────┘

7. User clicks: [Open in Distribution Management]
   └─ Navigates to: /distributions/{releaseId}
   └─ Now has FULL control
```

### 13.2 Flow 2: Managing Rollout (From Distribution Sidebar)

```
1. User navigates: Sidebar → Distributions
   └─ Opens: /dashboard/{org}/distributions

2. Page shows list:
   ┌────────────────────────────────────────┐
   │ v2.5.0              🟢 IN PROGRESS     │
   │ 🟢 Android: Live (25%)                 │
   │ 🟡 iOS: In Review                      │
   │ [Open]                                  │
   └────────────────────────────────────────┘

3. User clicks: [Open]
   └─ Navigates to: /distributions/{releaseId}

4. Page shows Platform Tabs:
   ┌──────────────┬──────────────┐
   │ Android 🟢25%│   iOS 🟡    │
   └──────────────┴──────────────┘

5. User clicks: Android tab
   └─ Shows:
      • Submission status
      • Rollout slider (25%)
      • [Update Rollout] [Pause] [Halt]

6. User moves slider: 25% → 50%
   └─ Clicks: [Update Rollout]
   └─ Backend updates exposure
   └─ UI shows: 🟢 Live (50%)

7. User switches to iOS tab
   └─ Shows: 🟡 IN_REVIEW (still waiting for approval)
   └─ No actions available yet
```

### 13.3 Flow 3: Fixing Rejection

```
1. User opens: /distributions/{releaseId}
   └─ Android tab shows: 🔴 REJECTED

2. Page shows:
   ┌────────────────────────────────────────┐
   │ Rejection Details                       │
   │ Reason: App crashes on startup          │
   │ Guideline: 4.0 - Design                 │
   │ [View Screenshot] [Full Details]        │
   │                                         │
   │ [Fix & Re-Submit]                       │
   └────────────────────────────────────────┘

3. User clicks: [Fix & Re-Submit]
   └─ Opens: ReSubmissionDialog

4. User has options:
   Option A: Fix metadata only
   ├─ Update release notes
   ├─ Update description
   └─ [Re-Submit]

   Option B: Upload new build
   ├─ If Android: Upload new AAB
   ├─ If iOS: Provide new TestFlight build #
   └─ [Re-Submit]

5. User chooses option, fills form, clicks [Re-Submit]
   └─ Backend creates new submission
   └─ Status changes to: 🟡 In Review
```

### 13.4 Flow 4: Emergency Halt

```
1. User monitoring production: Notices critical bug

2. User rushes to: /distributions/{releaseId}
   └─ Android tab shows: 🟢 LIVE (75%)

3. User clicks: [Emergency Halt]
   └─ Opens: HaltRolloutDialog
   ┌────────────────────────────────────────┐
   │ ⚠️ Emergency Halt Rollout              │
   │                                         │
   │ Severity: [Critical ▼]                 │
   │ Reason: [User data loss on feature X] │
   │                                         │
   │ Impact: Rollout stops immediately      │
   │ Current 75% users remain affected      │
   │ Must create new release to fix         │
   │                                         │
   │ [Cancel] [Confirm Halt]                │
   └────────────────────────────────────────┘

4. User clicks: [Confirm Halt]
   └─ Backend halts rollout
   └─ Status changes to: 🔴 HALTED (75%)
   └─ No further actions possible
   └─ User must create new release with fix
```

### 13.5 Flow 5: Adding Second Platform

```
1. Release submitted to Android only

2. User opens: /distributions/{releaseId}
   └─ Shows tabs:
      ┌──────────────┬──────────────┐
      │ Android 🟢50%│   iOS ⚪     │
      └──────────────┴──────────────┘

3. User clicks: iOS tab
   └─ Shows:
      ┌────────────────────────────────────────┐
      │ No submission yet for iOS               │
      │ [Submit to App Store]                   │
      └────────────────────────────────────────┘

4. User clicks: [Submit to App Store]
   └─ Opens: SubmitToStoresForm (iOS only)
   └─ User fills iOS-specific options
   └─ Clicks: [Submit]

5. Backend processes iOS submission
   └─ iOS tab now shows: 🟡 IN_REVIEW
   └─ Android tab still shows: 🟢 LIVE (50%)

Both platforms now managed independently
```

### 13.6 Navigation Map

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
        └──────────┬──────────┘           │
                   │                      │
                   │ [Open in Dist Mgmt] │
                   │                      │
        ┌──────────▼──────────────────────▼──────────┐
        │ Distribution Management Page               │
        │ /distributions/{releaseId}                 │
        │ (FULL CONTROL)                             │
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
        │ (Shows all releases, click [Open] goes to   │
        │  Distribution Management Page)              │
        └─────────────────────────────────────────────┘
```

## 14. Implementation Summary

### 14.1 Three Pages, Three Purposes

| Page | Route | Purpose | Capabilities |
|------|-------|---------|--------------|
| **Release Page (Distribution Tab)** | `/releases/{id}?tab=distribution` | First-time submission + read-only monitoring | ✅ Submit once<br>✅ View status<br>❌ No management |
| **Distributions List** | `/distributions` | Overview of all distributions | ✅ See all releases<br>✅ Quick status<br>✅ Navigate to details |
| **Distribution Management** | `/distributions/{releaseId}` | Full distribution control | ✅ All actions<br>✅ Rollout control<br>✅ Retry/Pause/Halt |

### 14.2 Key Components to Create/Modify

#### New Components Needed:
1. `SubmissionStatusCard.tsx` (read-only, for Release Page)
2. `SubmissionManagementCard.tsx` (full actions, for Distribution Management)
3. `PlatformTab.tsx` (tab content container)
4. `DistributionHeader.tsx` (header with breadcrumb, release info, status)

#### Existing Components to Reuse:
- ✅ `SubmitToStoresForm` (works in both contexts)
- ✅ `RolloutControls` (only in Distribution Management)
- ✅ `ReSubmissionDialog` (only in Distribution Management)
- ✅ `PauseRolloutDialog` (only in Distribution Management)
- ✅ `ResumeRolloutDialog` (only in Distribution Management)
- ✅ `HaltRolloutDialog` (only in Distribution Management)
- ✅ `SubmissionHistoryPanel` (only in Distribution Management)

#### Routes to Create/Modify:
1. **Modify**: `dashboard.$org.releases.$releaseId.distribution.tsx`
   - Keep only LIMITED functionality
   - Add "Open in Distribution Management" button
   - Use `SubmissionStatusCard` (read-only)

2. **Create**: `dashboard.$org.distributions.$releaseId.tsx`
   - Full distribution management page
   - Platform tabs
   - Use `SubmissionManagementCard` (full actions)
   - All dialogs and controls

3. **Modify**: `dashboard.$org.distributions._index.tsx`
   - Show all releases past pre-release
   - Include "READY TO SUBMIT" nudge for non-submitted releases

### 14.3 Data Flow

```
API Layer
    ↓
    ├─ GET /releases/{id}/distribution/status
    │  └─ Used by: Release Page (read-only)
    │
    ├─ GET /distributions
    │  └─ Used by: Distributions List
    │
    └─ GET /releases/{id}/submissions
       └─ Used by: Distribution Management (full data)

All mutation APIs (submit, pause, halt, etc.) only callable from:
    Distribution Management Page
```

### 14.4 Implementation Checklist

#### Phase 1: Component Creation
- [ ] Create `SubmissionStatusCard.tsx` (read-only variant)
- [ ] Create `SubmissionManagementCard.tsx` (full actions variant)
- [ ] Create `PlatformTab.tsx` (tab content container)
- [ ] Create `DistributionHeader.tsx` (header component)

#### Phase 2: Route Updates
- [ ] Modify `dashboard.$org.releases.$releaseId.distribution.tsx`
  - [ ] Remove all mutation actions (pause, halt, retry)
  - [ ] Replace `SubmissionCard` with `SubmissionStatusCard`
  - [ ] Add "Open in Distribution Management" button
  - [ ] Keep only `SubmitToStoresForm` (if no submissions)
  - [ ] Implement auto-refresh on page focus

- [ ] Create `dashboard.$org.distributions.$releaseId.tsx`
  - [ ] Implement platform tabs
  - [ ] Add all mutation actions
  - [ ] Include all dialogs (Pause, Resume, Halt, ReSubmission)
  - [ ] Use `SubmissionManagementCard`

- [ ] Modify `dashboard.$org.distributions._index.tsx`
  - [ ] Update query to show all releases past pre-release
  - [ ] Add "READY TO SUBMIT" card for non-submitted releases
  - [ ] Update [Open] button navigation

#### Phase 3: Testing Scenarios
- [ ] Test first-time submission from Release Page
- [ ] Test "Open in Distribution Management" navigation
- [ ] Test rollout increase from Distribution Management
- [ ] Test pause/resume from Distribution Management
- [ ] Test emergency halt from Distribution Management
- [ ] Test fixing rejection from Distribution Management
- [ ] Test adding second platform from Distribution Management
- [ ] Test distributions list showing all release states
- [ ] Test auto-refresh on Release Page (page focus)
- [ ] Test platform tabs switching

#### Phase 4: Mock Server Updates
- [ ] Update mock data to support all statuses
- [ ] Add mock responses for all actions
- [ ] Test conflict scenarios (version exists, exposure conflict)
- [ ] Test rejection scenarios

### 14.5 Critical UX Rules

1. **Release Page = Read-Only After First Submit**
   - Can only submit once
   - After that, just monitors
   - No rollout controls
   - Clear CTA: "Open in Distribution Management"

2. **Distribution Management = Full Control**
   - Platform tabs are primary navigation
   - Each tab is independent (different statuses, actions)
   - All actions available per status
   - Complete audit trail (history)

3. **Distribution List = Overview + Nudge**
   - Shows all releases (submitted or not)
   - Nudges user to submit if ready but not submitted
   - Quick status at a glance
   - Navigates to Distribution Management for details

4. **Platform Tabs = Focused Management**
   - Android and iOS have different workflows
   - User manages one platform at a time
   - Tab badges show status + % at a glance
   - Content switches completely per tab

5. **Auto-refresh Strategy**
   - Release Page: On page focus (passive monitoring)
   - Distribution Management: Manual refresh button (active management)
   - Distribution List: On page load (overview)

## 15. Implementation Clarifications (CONFIRMED!)

### 15.1 Release Status for Distribution List
**Question**: What determines if a release shows in Distribution Management list?

**Answer**: ✅ **Simple status check** - Backend provides clean statuses!

```typescript
// Release-Level Statuses (Backend provides):
type ReleaseStatus = 
  | 'PRE_RELEASE'              // Before builds ready
  | 'READY_FOR_SUBMISSION'     // Builds ready, PM approved, can submit
  | 'COMPLETED';               // All submissions live

// Distribution List Query (SIMPLE!)
WHERE releaseStatus IN ('READY_FOR_SUBMISSION', 'COMPLETED')

// Submission-Level Statuses (Per platform):
type SubmissionStatus = 
  | 'IN_REVIEW'    // Submitted, awaiting review
  | 'APPROVED'     // Store approved
  | 'LIVE'         // Live in store
  | 'REJECTED'     // Store rejected
  | 'HALTED';      // Emergency halt

// Key Points:
// ✅ Backend handles ALL complexity (pmApproved, hasBuilds, etc.)
// ✅ Frontend just checks releaseStatus field
// ✅ No condition logic needed!
// ✅ When backend sets status to 'READY_FOR_SUBMISSION', it's ready
```

### 15.2 Platform Configuration Source
**Question**: Where do configured platforms come from?

**Answer**: ✅ Release record directly

```typescript
// Distribution Management Page Loader
const release = await ReleaseService.getRelease(releaseId);

// Platform information is in release record
const configuredPlatforms = release.platforms; // ['ANDROID', 'IOS'] or ['ANDROID']

// Use this to:
// 1. Show correct platform tabs
// 2. Validate submission requests
// 3. Display platform badges
```

**Properties**:
- ✅ **Fixed at creation** - cannot change after release created
- ✅ **Enforced by both**:
  - Backend: Validation layer (rejects platform changes)
  - UI: No "Add/Remove Platform" options shown

### 15.3 Multi-Platform Submission Timing
**Question**: Can user submit platforms separately?

**Answer**: ✅ **YES** - Independent submission lifecycle per platform

```typescript
// Scenario: Release configured for Android + iOS

// Day 1: Submit Android only
POST /releases/{id}/distribute
{
  platforms: ['ANDROID'],
  android: { ... }
}

// Result:
submissions: [
  { platform: 'ANDROID', status: 'IN_REVIEW' }
]

// Day 7: Submit iOS (Android already rolling out)
POST /releases/{id}/distribute
{
  platforms: ['IOS'],
  ios: { ... }
}

// Result:
submissions: [
  { platform: 'ANDROID', status: 'LIVE', exposurePercent: 25 },
  { platform: 'IOS', status: 'IN_REVIEW' }
]
```

**Key Points**:
- ✅ Each platform has independent lifecycle
- ✅ Can submit at different times
- ✅ Can manage rollouts independently
- ✅ No coupling between platform submissions

### 15.4 Data Flow Summary

```typescript
// Distribution Management Page Loader
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { releaseId, org } = params;
  
  // 1. Get release (includes platform configuration)
  const release = await ReleaseService.getRelease(releaseId);
  // → release.platforms: ['ANDROID', 'IOS']
  // → release.releaseStatus: 'PRE_RELEASE' | 'READY_FOR_SUBMISSION' | 'COMPLETED'
  
  // 2. Get all submissions for this release
  const submissions = await DistributionService.getSubmissions(releaseId);
  // → submissions: [{ platform: 'ANDROID', ... }, { platform: 'IOS', ... }]
  
  return json({
    release,
    configuredPlatforms: release.platforms, // ✅ From release record
    submissions: submissions.data.submissions,
  });
};

// In Component
function DistributionManagementPage() {
  const { release, configuredPlatforms, submissions } = useLoaderData();
  
  // Filter submissions by platform
  const androidSubmissions = submissions.filter(s => s.platform === 'ANDROID');
  const iosSubmissions = submissions.filter(s => s.platform === 'IOS');
  
  return (
    <Tabs>
      {configuredPlatforms.includes('ANDROID') && (
        <Tabs.Tab value="android">
          <PlatformTab 
            platform="ANDROID" 
            submissions={androidSubmissions} 
          />
        </Tabs.Tab>
      )}
      
      {configuredPlatforms.includes('IOS') && (
        <Tabs.Tab value="ios">
          <PlatformTab 
            platform="IOS" 
            submissions={iosSubmissions} 
          />
        </Tabs.Tab>
      )}
    </Tabs>
  );
}
```

## 16. Answers to Original Questions

### Q1: Distribution Management Page Layout
**Answer**: Option B - No stepper (different layout)
**Reasoning**: 
- Stepper is for release progression (Development → QA → Regression → Pre-Release → Distribution)
- Distribution Management is a **sibling module**, not part of release progression
- Focus is on **platform management**, not stage progression
- Each platform has independent lifecycle

### Q2: Partial Submissions on Distribution Page
**Answer**: Platform Tabs (user's suggestion)
**Reasoning**:
- Play Store and App Store have different workflows and controls
- User manages one platform at a time (focused view)
- More space for controls, history, and actions
- Clear visual hierarchy (tabs at top, content below)

**Example**:
```
┌──────────────┬──────────────┐
│ Android 🟢50%│   iOS ⚪     │  ← Tabs show status at a glance
└──────────────┴──────────────┘

Android Tab: Shows rollout controls, actions
iOS Tab: Shows "Not submitted" + [Submit to App Store] button
```

### Q3: Distribution List Entry (No Submissions)
**Answer**: Option B - "READY TO SUBMIT" nudge
**Reasoning**:
- Proactive UX - encourages user action
- Clear CTA: [Submit Now]
- Shows builds are ready (Android ✅ iOS ✅)
- User can initiate submission directly from list

### Q4: "Open in Distribution Management" Link
**Answer**: Option B - Global button at top
**Reasoning**:
- Single, clear CTA for full management
- Not per-submission (user manages entire release, not individual submissions)
- Prominent placement drives users to full features

### Q5: Distribution Management Page Header
**Answer**: Detailed header
**Content**:
```
Distribution Management
v2.5.0 | release/2.5.0 | 🟢 IN PROGRESS
Platforms: Android, iOS
Created: Nov 25, 2025 | Target: Dec 10, 2025
```
**Reasoning**:
- User needs context (which release, status, timeline)
- Shows platforms at a glance
- Target date creates urgency

### Q6: Manual Refresh UX on Release Page
**Answer**: Option B - Auto-refresh on page focus
**Reasoning**:
- Passive monitoring (not active management)
- User opens tab → sees latest status
- No explicit button clutter
- Low-frequency updates (review takes hours/days)

### Q7: Platform Tabs vs Cards
**Answer**: Platform Tabs (decided based on UX needs)
**Reasoning**:
- Each platform has **different workflows**:
  - Android: Track selection, granular rollout %, priority
  - iOS: Release type, phased release, limited rollout control
- User typically manages **one platform at a time**
- Tabs provide **more space** for:
  - Rollout controls
  - Submission history
  - Action buttons
  - Rejection details
- **Focused view** reduces cognitive load
- Tab badges show status + % at a glance

**Rejected Alternative (Cards)**:
- Would require side-by-side layout
- Limited space for controls
- User sees both platforms always (unnecessary)
- Harder to show detailed history per platform

## 16. Critical Design Principles

### 9.1 Distribution List Entry Rule (UPDATED!)

**NEW RULE**: Distribution list shows ALL releases that **completed pre-release**

```typescript
// API: GET /api/v1/distributions
// Backend filters:
const distributions = allReleases.filter(release => {
  // Show if release is ready for distribution management
  return ['READY_FOR_SUBMISSION', 'COMPLETED'].includes(release.releaseStatus);
});
```

**Why This Change?**
- ✅ Distribution module can **initiate submissions** (not just manage)
- ✅ User can submit from distribution page (if not done yet)
- ✅ Manage partial submissions (e.g., Android done, iOS pending)
- ❌ OLD rule was too restrictive (only showed existing submissions)

### 9.2 Component Architecture (CRITICAL)

**TWO DISTINCT IMPLEMENTATIONS**:

| Component | Release Page (Limited) | Distribution Sidebar (Full) |
|-----------|------------------------|------------------------------|
| **SubmitToStoresDialog** | ✅ Create submission | ✅ Create submission |
| **SubmissionCard** | ✅ **Read-only version**<br>• Status display<br>• Timestamp<br>• Link to sidebar<br>• NO action buttons | ✅ **Full version**<br>• Status display<br>• ALL action buttons<br>• Rollout controls<br>• Complete management |
| **RolloutControls** | ❌ NOT shown | ✅ Shown (slider, pause, halt) |
| **ReSubmissionDialog** | ❌ NOT shown | ✅ Shown (for rejected) |
| **PauseRolloutDialog** | ❌ NOT shown | ✅ Shown |
| **ResumeRolloutDialog** | ❌ NOT shown | ✅ Shown |
| **HaltRolloutDialog** | ❌ NOT shown | ✅ Shown |
| **SubmissionHistoryPanel** | ❌ NOT shown | ✅ Shown |

**Key Insights**:
- ❗ **TWO VERSIONS OF SubmissionCard**: Limited vs Full
- ❗ **MOST COMPONENTS** only appear on Distribution sidebar
- ❗ **RELEASE PAGE** = Submit + Monitor only (intentionally limited)
- ❗ **DISTRIBUTION SIDEBAR** = Complete management hub

### 9.3 Form Pre-Filling Strategy

**For ReSubmissionDialog**:
```typescript
// When opened for a REJECTED submission
const initialValues = {
  releaseNotes: submission.releaseNotes || '',
  shortDescription: submission.shortDescription || '',
  fullDescription: submission.fullDescription || '',
  keywords: submission.keywords?.join(', ') || '',
  // New build options default to unchecked
};

// User can:
// 1. Edit metadata only → Retry with same build
// 2. Edit metadata + upload new build → Retry with new build
```

**For SubmitToStoresDialog** (if we support "Edit Submission"):
```typescript
// If editing existing submission (future feature?)
const initialValues = {
  platforms: [submission.platform],
  android: submission.platform === 'ANDROID' ? {
    track: submission.track,
    rolloutPercentage: submission.exposurePercent,
    priority: submission.priority || 0,
    releaseNotes: submission.releaseNotes || '',
  } : undefined,
  // ... iOS options
};
```

### 9.4 Distribution Stage Page Logic

**Complete Decision Tree**:

```typescript
function renderDistributionStage(data: LoaderData) {
  const hasSubmissions = data.submissions.length > 0;
  const hasRejections = data.submissions.some(s => s.status === 'REJECTED');
  const isComplete = data.submissions.every(s => s.exposurePercent === 100);
  
  // CASE 1: No submissions yet
  if (!hasSubmissions) {
    return (
      <EmptyState>
        <BuildSummary builds={data.builds} />
        <Button onClick={openSubmitDialog}>Submit to Stores</Button>
      </EmptyState>
    );
  }
  
  // CASE 2: Has submissions - show cards
  return (
    <Stack>
      {/* Distribution Status Panel */}
      <DistributionStatusPanel 
        releaseStatus={data.distributionStatus.releaseStatus}
        overallProgress={data.distributionStatus.overallProgress}
      />
      
      {/* Submission Cards */}
      <Grid>
        {data.submissions.map(submission => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            
            // Actions (conditionally shown based on status)
            onRetry={handleRetry}              // If REJECTED
            onUpdateRollout={handleUpdateRollout} // If APPROVED or LIVE
            onPause={handlePause}              // If LIVE (active)
            onResume={handleResume}            // If LIVE (paused)
            onHalt={handleHalt}                // Always available
            onViewHistory={handleViewHistory}  // Always available
          />
        ))}
      </Grid>
      
      {/* Release Complete View (if all 100%) */}
      {isComplete && (
        <ReleaseCompleteView 
          releaseVersion={data.releaseVersion}
          platforms={data.submissions}
        />
      )}
      
      {/* Rejection Warning (if any rejected) */}
      {hasRejections && (
        <Alert color="red">
          One or more submissions were rejected. Click "Fix & Re-Submit" to resolve.
        </Alert>
      )}
    </Stack>
  );
}
```

---

## 10. Implementation Checklist

### 9.1 Navigation Fixes

- [ ] Fix stepper click navigation (read `?tab=` param)
- [ ] Make past/current steps clickable
- [ ] Disable future steps
- [ ] Update URL on tab change

### 9.2 Pre-Release Stage

- [ ] Load build status on page load
- [ ] Show upload/verify forms correctly
- [ ] Show PM approval status
- [ ] Show extra commits warning
- [ ] Enable/disable "Promote" button based on state
- [ ] Navigate to distribution on promote

### 9.3 Distribution Stage

- [ ] Show "No submissions" state initially
- [ ] Show "Submit to Stores" button prominently
- [ ] Open SubmitToStoresDialog on button click
- [ ] Handle version/exposure conflicts
- [ ] Show submission cards after submit
- [ ] Poll submission status every 10s
- [ ] Show rollout controls when approved
- [ ] Handle pause/resume/halt actions
- [ ] Show rejection recovery dialog
- [ ] Show release complete view at 100%

### 9.4 Distribution Management List

- [ ] **FILTER: Show ALL releases that completed pre-release** (not just with submissions)
- [ ] Show summary cards (Total, Rolling Out, Ready to Submit, etc.)
- [ ] Show distribution entry cards
  - [ ] With submissions → Show platform statuses + [Open]
  - [ ] No submissions → Show "READY TO SUBMIT" + [Submit Now]
- [ ] Navigate to `/distributions/{releaseId}` on click (NOT `/releases/{id}?tab=distribution`)
- [ ] Handle empty state (no distributions past pre-release)

### 9.5 Dialogs & Forms

- [ ] SubmitToStoresDialog (full form)
- [ ] VersionConflictDialog (resolution options)
- [ ] ExposureControlDialog (resolution options)
- [ ] ReSubmissionDialog (editable, pre-filled)
- [ ] PauseRolloutDialog (reason field)
- [ ] ResumeRolloutDialog (confirmation)
- [ ] HaltRolloutDialog (reason + severity)

---

## 10. Testing Scenarios

### Scenario 1: First-Time Submission (Happy Path)
1. Release in PRE_RELEASE
2. Navigate to pre-release tab
3. Upload AAB → Success
4. Verify TestFlight → Success
5. PM approval → Auto-approved
6. No extra commits
7. Click "Promote to Distribution"
8. Navigate to distribution tab
9. Click "Submit to Stores"
10. Fill form, submit
11. Success → Shows submission cards
12. Poll status → Changes to APPROVED then LIVE
13. Update rollout 1% → 5% → 10% → 100%
14. Shows release complete 🎉

### Scenario 2: Version Conflict
1. Navigate to distribution tab
2. Click "Submit to Stores"
3. Fill form, submit
4. **Error: VERSION_EXISTS**
5. Dialog shows resolution options
6. Select "Create new release"
7. Navigate to create release page

### Scenario 3: Rejection Recovery
1. Submission status changes to REJECTED (via polling)
2. Shows rejection reason
3. Click "Fix & Re-Submit"
4. Dialog opens with pre-filled form
5. Edit release notes
6. Upload new AAB (optional)
7. Submit
8. Success → Back to IN_REVIEW

---

**Ready for implementation with complete flow clarity!** 🎯

