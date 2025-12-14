# Distribution Module - Complete Testing Plan

**Document Version:** 2.0  
**Last Updated:** December 14, 2025  
**Status:** ✅ Production Ready  
**References:** `DISTRIBUTION_API_SPEC.md`, `DISTRIBUTION_UI_FLOW_SPEC.md`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Mock Server Commands](#mock-server-commands)
4. [Test Scenarios](#test-scenarios)
5. [Platform-Specific Testing](#platform-specific-testing)
6. [Edge Cases & Error Handling](#edge-cases--error-handling)
7. [Visual/UI Testing](#visualui-testing)
8. [Success Criteria](#success-criteria)
9. [Bug Reporting](#bug-reporting)

---

## 1. Overview

### 🎯 What We're Testing

#### ✅ IN SCOPE (Distribution Module)

**1. Release Page - Distribution Tab (LIMITED VIEW)**
- Route: `/dashboard/{org}/releases/{releaseId}?tab=distribution`
- Submit to Stores dialog (first-time only)
- Distribution status monitoring (read-only)
- Link to full distribution management
- Manual refresh capability

**2. Distribution Management Module - Distributions List**
- Route: `/dashboard/{org}/distributions`
- Shows all distributions (with/without submissions)
- Status badges and progress indicators
- Navigation to full management
- Empty state when no distributions exist

**3. Distribution Management Module - Full Management Page**
- Route: `/dashboard/{org}/distributions/{distributionId}`
- Platform tabs (Android, iOS)
- Complete submission management
- Rollout controls (platform-specific)
- Resubmission after rejection
- Pause/Resume/Halt actions
- Submission history timeline
- All management dialogs

#### ❌ OUT OF SCOPE
- Pre-Release tab (separate implementation)
- Build uploads (Android AAB)
- TestFlight verification (iOS)
- PM approval
- Extra commits warning

### 🔑 Key Features to Test

1. **5-State Distribution Flow**: `PENDING → PARTIALLY_SUBMITTED → SUBMITTED → PARTIALLY_RELEASED → RELEASED`
2. **8 Submission Statuses**: `PENDING`, `IN_REVIEW`, `APPROVED`, `LIVE`, `PAUSED`, `REJECTED`, `HALTED`, `CANCELLED`
3. **Auto-Created Submissions**: Backend creates PENDING submissions after pre-release
4. **Platform-Specific Rules**: Different behaviors for Android, iOS Phased, iOS Manual
5. **Two-Module Architecture**: Limited view on release page vs. full control on distribution page
6. **Resubmission Flow**: Creates NEW submission with NEW artifact

---

## 2. Quick Start

### 🚀 Running the Application

#### Option 1: With Mock Server (Recommended)
```bash
cd /Users/princetripathi/workspace/delivr/delivr-web-panel-managed
npm run dev:with-mock
```

**Starts:**
- Frontend dev server: `http://localhost:3000`
- Mock backend server: `http://localhost:3001`

#### Option 2: With Real Backend
```bash
npm run dev
```

### 🔍 Verify Setup

```bash
# Check frontend is running
curl http://localhost:3000

# Check mock server is responding
curl http://localhost:3001/api/v1/distributions

# Check health endpoint
curl http://localhost:3001/health
```

---

## 3. Mock Server Commands

### ⚡ Quick Scenario Commands

Run these commands to switch between different test scenarios:

```bash
# Navigate to project root first
cd /Users/princetripathi/workspace/delivr/delivr-web-panel-managed

# 1. Empty State (no distributions)
node mock-server/scenarios.js empty

# 2. Active State (2 distributions)
node mock-server/scenarios.js active

# 3. Five Distributions (no pagination needed)
node mock-server/scenarios.js five

# 4. Many Distributions (20 - tests pagination)
node mock-server/scenarios.js many

# 5. Submissions with Progress (tests rollout bars)
node mock-server/scenarios.js submissions

# 6. Mixed Statuses (colorful badges)
node mock-server/scenarios.js mixed

# 7. Reset to Default
node mock-server/scenarios.js reset
```

**After each command:** Refresh browser or wait for hot reload

### 🎯 Recommended Testing Order

```bash
# 1. TEST LOADING STATE
# Open DevTools (F12) → Network → Throttling → "Slow 3G"
# Refresh browser → See spinner

# 2. TEST EMPTY RESPONSE
node mock-server/scenarios.js empty
# Refresh → See "No Distributions Yet" empty state

# 3. TEST API FAILURE
# Stop mock server (Ctrl+C in mock server terminal)
# Refresh → See red error alert with Retry button
# Restart mock server: npm run mock

# 4. TEST 5 DISTRIBUTIONS
node mock-server/scenarios.js five
# Refresh → See table with 5 rows, NO pagination

# 5. TEST PAGINATION (Many distributions)
node mock-server/scenarios.js many
# Refresh → See pagination controls, "Showing 1-10 of 20"

# 6. TEST ROLLOUT UI
node mock-server/scenarios.js submissions
# Refresh → See progress bars (10%, 50%, 100%)

# 7. RESET WHEN DONE
node mock-server/scenarios.js reset
```

### 📊 Verify API Responses

```bash
# See all distributions
curl http://localhost:3001/api/v1/distributions | jq '.'

# Count distributions
curl -s http://localhost:3001/api/v1/distributions | jq '.data.distributions | length'

# Get specific distribution
curl http://localhost:3001/api/v1/distributions/{distributionId} | jq '.'

# Get submission details
curl http://localhost:3001/api/v1/submissions/{submissionId} | jq '.'
```

---

## 4. Test Scenarios

### **Scenario 1: Release Page - Distribution Tab (LIMITED VIEW)**

#### Setup
1. Navigate to: `http://localhost:3000/dashboard/{org}/releases`
2. Click on any release with status `READY_FOR_SUBMISSION`
3. Click "Distribution" tab (or it auto-loads if it's the current stage)

#### Test Cases

**TC-1.1: Page Load - PENDING Submissions Exist**
- **Expected**:
  - Shows "Ready to Submit" message
  - Shows submission cards with PENDING status (one per platform)
  - Shows "Submit to Stores" button (prominent)
  - Shows "Open in Distribution Management" link

**TC-1.2: Submit to Stores Dialog Opens**
- **Action**: Click "Submit to Stores" button
- **Expected**: 
  - Dialog opens with platform checkboxes
  - Only PENDING platforms are selectable
  - Form fields appropriate for each platform

**TC-1.3: Submit Android (First Time)**
- **Action**: 
  1. Select Android checkbox
  2. Fill in:
     - Initial Rollout: 5.5% (test decimals)
     - In-App Priority: 3
     - Release Notes: "Bug fixes and improvements"
  3. Click "Submit"
- **Expected**:
  - API: `PUT /api/v1/submissions/{androidSubmissionId}/submit`
  - Dialog closes
  - Toast: "Submitted successfully"
  - Android card updates: status changes to `IN_REVIEW`
  - Shows submission timestamp
  - NO action buttons (read-only view)

**TC-1.4: Submit iOS (First Time)**
- **Action**:
  1. Select iOS checkbox
  2. Verify: Release Type shows "AUTOMATIC" (read-only)
  3. Fill in:
     - Phased Release: Yes
     - Reset Rating: No
     - Release Notes: "Performance improvements"
  4. Click "Submit"
- **Expected**:
  - API: `PUT /api/v1/submissions/{iosSubmissionId}/submit`
  - Dialog closes
  - iOS card updates: status `IN_REVIEW`
  - Shows 0% rollout (phased controlled by Apple)

**TC-1.5: Submit Both Platforms**
- **Action**: Select both Android + iOS, fill options, submit
- **Expected**: 
  - Both submissions sent
  - Both cards update to `IN_REVIEW`
  - Both show timestamps

**TC-1.6: Read-Only Status Display**
- **After submission**:
  - Shows submission cards (Android and/or iOS)
  - Each card displays:
    - Platform icon + version
    - Status badge (colored)
    - Submission timestamp
    - Current rollout % (if LIVE)
    - Progress bar (if LIVE, read-only)
  - NO action buttons visible
  - Message: "Manage from Distribution Management"

**TC-1.7: Navigate to Full Management**
- **Action**: Click "Open in Distribution Management" link/button
- **Expected**: Navigates to `/dashboard/{org}/distributions/{distributionId}`
- **Note**: Uses `distributionId` not `releaseId`

**TC-1.8: Manual Status Refresh**
- **Action**: Refresh page or re-focus tab
- **Expected**: Status cards update with latest data
- **Note**: No automatic polling, only manual refresh

**TC-1.9: Version Conflict Handling**
- **Setup**: Mock returns 409 VERSION_EXISTS
- **Action**: Try to submit
- **Expected**: 
  - VersionConflictDialog opens
  - Shows conflict details
  - Offers resolution options

**TC-1.10: Exposure Control Conflict**
- **Setup**: Mock returns 409 EXPOSURE_CONTROL_CONFLICT
- **Action**: Try to submit
- **Expected**:
  - ExposureControlDialog opens
  - Shows active rollout warning
  - Offers resolution options

---

### **Scenario 2: Distribution Management - List Page**

#### Setup
1. Navigate to: `http://localhost:3000/dashboard/{org}/distributions`

#### Test Cases

**TC-2.1: Empty State**
- **Setup**: `node mock-server/scenarios.js empty`
- **Expected**:
  - Shows empty state illustration
  - Message: "No Distributions Yet"
  - Explanation: "Distributions are created after completing pre-release"
  - Instructions: How to create first distribution
  - NO stats cards
  - NO table/grid

**TC-2.2: List Loads Successfully**
- **Setup**: `node mock-server/scenarios.js active`
- **Expected**:
  - Shows stats cards at top:
    - Total Distributions: X
    - Total Submissions: Y
    - In Review Submissions: Z
    - Released Submissions: W
  - Shows distribution entries in table/grid
  - Each entry shows:
    - Release version (e.g., "2.5.0")
    - Release branch (e.g., "release/2.5.0")
    - Distribution status badge
    - Platform summaries (Android: status + %, iOS: status + %)
    - Last updated timestamp
    - "Open" button

**TC-2.3: Entry Shows Submissions Exist**
- **Expected for entry with submissions**:
  - Shows platform statuses
  - Shows rollout percentages
  - Color-coded status badges
  - Progress indicators if rolling out

**TC-2.4: Entry Shows NO Submissions (PENDING)**
- **Expected for entry without submissions**:
  - Status badge: "PENDING - Ready to Submit"
  - Message: "No submissions yet - Click to submit"
  - Shows ready platforms: "Android ✅ iOS ✅"
  - Button: "Submit Now"

**TC-2.5: Navigate to Full Management**
- **Action**: Click "Open" button on any entry
- **Expected**: Navigates to `/dashboard/{org}/distributions/{distributionId}`

**TC-2.6: Pagination (Many Items)**
- **Setup**: `node mock-server/scenarios.js many`
- **Expected**:
  - Shows pagination controls
  - Shows "Showing 1-10 of 20"
  - Page number buttons appear
  - Can navigate between pages

**TC-2.7: Mixed Statuses Display**
- **Setup**: `node mock-server/scenarios.js mixed`
- **Expected**:
  - Variety of colored status badges
  - Different progress bar states
  - Different platform combinations

---

### **Scenario 3: Distribution Management - Full Control Page**

#### Setup
1. Navigate to: `http://localhost:3000/dashboard/{org}/distributions/{distributionId}`

#### Test Cases

**TC-3.1: Page Loads Successfully**
- **Expected**:
  - Breadcrumb: "Distributions > v2.5.0"
  - Header shows:
    - "Distribution Management" title
    - Release version + branch
    - Distribution status badge
    - Platforms
    - Created timestamp
    - Refresh button
  - Platform tabs (Android, iOS) if configured
  - Tab badges show current status + percentage

**TC-3.2: Platform Tab Switching**
- **Action**: Switch between Android and iOS tabs
- **Expected**: 
  - Tab content updates completely
  - Shows platform-specific submission card
  - Shows platform-specific controls
  - Maintains URL (no navigation)

**TC-3.3: Submit PENDING Submission from Here**
- **Setup**: Distribution with PENDING submission
- **Action**: Click "Submit to Stores" button
- **Expected**: Same flow as TC-1.3/TC-1.4

---

### **Scenario 4: Rollout Management (Android)**

#### Setup
- Distribution with Android submission in `LIVE` status at 5%

#### Test Cases

**TC-4.1: Rollout Controls Display**
- **Expected**:
  - Shows current rollout: 5%
  - Shows progress bar (animated, 5% filled)
  - Shows quick preset buttons: [1%] [5%] [10%] [25%] [50%] [100%]
  - Shows custom slider (5 → 100)
  - Shows "Update Rollout" button
  - Shows "Emergency Halt" button (always visible, red)
  - Shows "View History" link

**TC-4.2: Update Rollout via Slider**
- **Action**:
  1. Drag slider from 5% to 25%
  2. Click "Update Rollout"
- **Expected**:
  - API: `PATCH /api/v1/submissions/{submissionId}/rollout`
  - Request body: `{ "rolloutPercent": 25.0 }`
  - Optimistic UI update (progress bar animates to 25%)
  - Toast: "Rollout updated successfully"
  - History event added

**TC-4.3: Update Rollout via Preset**
- **Action**: Click "50%" preset button
- **Expected**:
  - Slider jumps to 50%
  - "Update Rollout" button highlights
  - Clicking it applies 50%

**TC-4.4: Decimal Percentage Support (Android Only)**
- **Action**: Manually enter 27.5% in slider or input
- **Expected**:
  - Accepts decimal value
  - Updates to 27.5%
  - Progress bar shows 27.5%

**TC-4.5: Validation - Cannot Decrease**
- **Action**: Try to set 10% (lower than current 25%)
- **Expected**:
  - Validation error: "Rollout can only increase"
  - Slider snaps back to current %
  - "Update Rollout" button disabled

**TC-4.6: Complete Rollout to 100%**
- **Action**: Update rollout to 100%
- **Expected**:
  - Status updates to `RELEASED`
  - Progress bar: 100% (complete animation)
  - Controls disable
  - Congratulations message shown
  - "View in Store" external link appears

**TC-4.7: Emergency Halt (Android)**
- **Action**:
  1. Click "Emergency Halt" button (red)
  2. Dialog opens
  3. Enter reason: "Critical crash in payment flow"
  4. Click "Confirm Halt"
- **Expected**:
  - API: `PATCH /api/v1/submissions/{submissionId}/rollout/halt`
  - Request body: `{ "reason": "..." }`
  - Status changes to `HALTED`
  - All controls disable (terminal state)
  - Red alert banner shown
  - History event added with reason

---

### **Scenario 5: Rollout Management (iOS Phased Release)**

#### Setup
- Distribution with iOS submission in `LIVE` status
- `phasedRelease: true`
- Rollout at Day 3/7 (Apple's automatic rollout)

#### Test Cases

**TC-5.1: Phased Rollout Display**
- **Expected**:
  - Shows: "Day 3/7 (Automatic by Apple)"
  - Shows progress bar (automatic progression)
  - Shows message: "Apple manages phased release automatically"
  - Shows ONLY "Complete Rollout Early (100%)" button
  - Shows "Pause Rollout" button
  - Shows "Emergency Halt" button

**TC-5.2: Complete Early (Skip to 100%)**
- **Action**: Click "Complete Rollout Early (100%)"
- **Expected**:
  - API: `PATCH /api/v1/submissions/{submissionId}/rollout`
  - Request body: `{ "rolloutPercent": 100 }`
  - Skips remaining days
  - Immediately goes to 100%
  - Status updates to `RELEASED`

**TC-5.3: Pause Rollout (iOS Phased Only)**
- **Action**:
  1. Click "Pause Rollout" button
  2. Dialog opens
  3. Enter reason: "Monitoring crash reports"
  4. Click "Pause"
- **Expected**:
  - API: `PATCH /api/v1/submissions/{submissionId}/rollout/pause`
  - Request body: `{ "reason": "..." }`
  - Status changes to `PAUSED`
  - Progress bar freezes at current %
  - "Resume" button appears
  - History event added

**TC-5.4: Resume Rollout**
- **Action**:
  1. Click "Resume Rollout" button
  2. Dialog opens (simple confirmation)
  3. Click "Resume"
- **Expected**:
  - API: `PATCH /api/v1/submissions/{submissionId}/rollout/resume`
  - Status returns to `LIVE`
  - Rollout continues from paused %
  - History event added

**TC-5.5: Cannot Set Partial % (iOS Phased)**
- **Expected**:
  - NO slider control
  - NO preset buttons (except 100%)
  - Message: "Cannot set custom % (Apple controls phasing)"

---

### **Scenario 6: Rollout Management (iOS Manual Release)**

#### Setup
- Distribution with iOS submission in `LIVE` status
- `phasedRelease: false`
- Rollout: 100% (immediate)

#### Test Cases

**TC-6.1: Manual Release Display**
- **Expected**:
  - Shows: "100% (Immediate Release)"
  - Progress bar: 100% complete
  - Message: "Manual release: Immediately available to 100% of users"
  - Shows: "No rollout controls available"
  - Shows ONLY: "Emergency Halt" and "View History"
  - NO pause button (cannot pause manual release)
  - NO slider or presets

**TC-6.2: Emergency Halt Only Action**
- **Action**: Click "Emergency Halt"
- **Expected**: Same as TC-4.7 (halts at 100%)

---

### **Scenario 7: Resubmission After Rejection**

#### Setup
- Distribution with submission in `REJECTED` status

#### Test Cases

**TC-7.1: Rejection Display**
- **Expected**:
  - Status badge: 🔴 "REJECTED"
  - Shows rejection details card:
    - Rejection reason from store
    - Guideline violated
    - Rejection timestamp
  - Shows "Fix & Re-Submit" button
  - Shows "View History" link

**TC-7.2: Open Resubmission Dialog**
- **Action**: Click "Fix & Re-Submit"
- **Expected**:
  - ReSubmissionDialog opens
  - Form is PRE-FILLED with previous submission data:
    - Release notes (editable)
    - Rollout % (editable)
    - Priority/Phased settings (editable)
  - Shows artifact upload section:
    - iOS: "New TestFlight Build Number" input
    - Android: "New AAB File" file picker
  - Both artifact AND metadata can be edited

**TC-7.3: Resubmit with Metadata Changes Only**
- **Action**:
  1. Update release notes: "Fixed crash on Samsung devices"
  2. Do NOT upload new artifact
  3. Click "Re-Submit"
- **Expected**:
  - API: `POST /api/v1/distributions/{distributionId}/submissions`
  - Request includes: platform, version, metadata
  - Uses same artifact (no new build uploaded)
  - Creates NEW submission with NEW submissionId
  - New submission status: `IN_REVIEW`
  - Old submission remains in history

**TC-7.4: Resubmit with New Artifact (Android)**
- **Action**:
  1. Update metadata
  2. Upload new AAB file (multipart)
  3. versionCode: (optional - extracted from AAB)
  4. Click "Re-Submit"
- **Expected**:
  - API: `POST /api/v1/distributions/{distributionId}/submissions`
  - Content-Type: multipart/form-data
  - Uploads new AAB
  - Creates NEW submission
  - New artifact details in response (NO internalTestingLink for resubmission)

**TC-7.5: Resubmit with New Artifact (iOS)**
- **Action**:
  1. Update metadata
  2. Enter new TestFlight build number: "17966"
  3. Click "Re-Submit"
- **Expected**:
  - API: `POST /api/v1/distributions/{distributionId}/submissions`
  - Request includes new testflightBuildNumber
  - Creates NEW submission
  - New artifact details in response

---

### **Scenario 8: Submission History**

#### Setup
- Distribution with submission that has multiple events

#### Test Cases

**TC-8.1: View History**
- **Action**: Click "View History" link
- **Expected**:
  - SubmissionHistoryPanel opens (modal or side panel)
  - Shows timeline of events in chronological order (newest first)
  - Each event displays:
    - Event type (submitted, approved, rollout updated, paused, etc.)
    - Timestamp (human-readable)
    - Actor (who performed action)
    - Reason (if provided)
    - State changes (e.g., "Rollout: 5% → 25%")

**TC-8.2: History Event Types**
- **Expected to see events for**:
  - `SUBMITTED`: "Submitted to Play Store"
  - `APPROVED`: "Approved by Play Store"
  - `ROLLOUT_UPDATED`: "Rollout updated: 5% → 25%"
  - `ROLLOUT_PAUSED`: "Rollout paused: [reason]"
  - `ROLLOUT_RESUMED`: "Rollout resumed"
  - `ROLLOUT_HALTED`: "Emergency halt: [reason]"
  - `REJECTED`: "Rejected by store: [reason]"
  - `RESUBMITTED`: "Re-submitted after rejection"

**TC-8.3: History Pagination**
- **Setup**: Submission with > 50 events
- **Expected**:
  - Shows first 50 events
  - "Load More" button at bottom
  - Clicking loads next 50

**TC-8.4: Close History**
- **Action**: Click close button or outside panel
- **Expected**: Panel closes, returns to submission view

---

### **Scenario 9: Multi-Platform Management**

#### Setup
- Distribution configured for both Android and iOS

#### Test Cases

**TC-9.1: Independent Platform Submission**
- **Action**: Submit Android only (skip iOS)
- **Expected**:
  - Android submission created and visible
  - iOS tab still shows "No submission yet"
  - iOS "Submit to App Store" button remains

**TC-9.2: Submit Second Platform Later**
- **Setup**: Android already submitted
- **Action**: 
  1. Switch to iOS tab
  2. Click "Submit to App Store"
  3. Fill iOS options
  4. Submit
- **Expected**:
  - iOS submission created independently
  - Both tabs now have submissions
  - Each platform managed independently

**TC-9.3: Independent Rollout Management**
- **Expected**:
  - Android at 25%, iOS at 10%
  - Updating Android doesn't affect iOS
  - Pausing iOS doesn't affect Android
  - Each has own history timeline

**TC-9.4: Distribution Status Updates**
- **Scenario**: 
  - Android: 25% (LIVE)
  - iOS: IN_REVIEW
- **Expected Distribution Status**: `PARTIALLY_SUBMITTED`

- **Scenario**:
  - Android: LIVE (25%)
  - iOS: LIVE (10%)
- **Expected Distribution Status**: `PARTIALLY_RELEASED`

- **Scenario**:
  - Android: RELEASED (100%)
  - iOS: RELEASED (100%)
- **Expected Distribution Status**: `RELEASED`

---

## 5. Platform-Specific Testing

### Android (Play Store) - Complete Test Matrix

| Test ID | Scenario | Rollout % | Action | Expected Result |
|---------|----------|-----------|--------|-----------------|
| AND-1 | Initial submit | 5.5% | Submit with decimal | ✅ Accepts 5.5% |
| AND-2 | Increase rollout | 5% → 25% | Update via slider | ✅ Updates to 25% |
| AND-3 | Increase rollout | 25% → 50.7% | Update with decimal | ✅ Accepts 50.7% |
| AND-4 | Decrease attempt | 50% → 10% | Try to decrease | ❌ Validation error |
| AND-5 | Complete rollout | Any% → 100% | Update to 100% | ✅ Status → RELEASED |
| AND-6 | Pause attempt | 50% | Click pause | ❌ Button not available |
| AND-7 | Emergency halt | Any% | Click halt + reason | ✅ Status → HALTED |
| AND-8 | Resubmission | REJECTED | Upload new AAB | ✅ New submission created |

### iOS Phased Release - Complete Test Matrix

| Test ID | Scenario | Action | Expected Result |
|---------|----------|--------|-----------------|
| IOS-P-1 | Initial submit | Submit with phased=true | ✅ 7-day automatic rollout |
| IOS-P-2 | View progress | Check Day 3/7 | ✅ Shows automatic progress |
| IOS-P-3 | Set partial % | Try to set 50% | ❌ Not allowed (Apple controls) |
| IOS-P-4 | Complete early | Update to 100% | ✅ Skips to 100% |
| IOS-P-5 | Pause rollout | Click pause + reason | ✅ Status → PAUSED |
| IOS-P-6 | Resume rollout | Click resume | ✅ Status → LIVE |
| IOS-P-7 | Emergency halt | Click halt + reason | ✅ Status → HALTED |
| IOS-P-8 | Resubmission | New TestFlight build | ✅ New submission created |

### iOS Manual Release - Complete Test Matrix

| Test ID | Scenario | Action | Expected Result |
|---------|----------|--------|-----------------|
| IOS-M-1 | Initial submit | Submit with phased=false | ✅ Immediately 100% |
| IOS-M-2 | Check rollout | View rollout controls | ❌ No controls (already 100%) |
| IOS-M-3 | Pause attempt | Look for pause button | ❌ Button not available |
| IOS-M-4 | Emergency halt | Click halt + reason | ✅ Status → HALTED (at 100%) |
| IOS-M-5 | Resubmission | New TestFlight build | ✅ New submission created |

---

## 6. Edge Cases & Error Handling

### Network & API Errors

**TC-E-1: Network Failure During Submit**
- **Setup**: Disconnect network or stop mock server
- **Action**: Try to submit
- **Expected**:
  - Loading spinner shows
  - After timeout: Error toast
  - Dialog remains open (can retry)
  - "Retry" button appears

**TC-E-2: Network Failure During Rollout Update**
- **Setup**: Disconnect during update
- **Action**: Try to update rollout
- **Expected**:
  - Optimistic update reverted
  - Error message shown
  - Can retry immediately

**TC-E-3: 500 Server Error**
- **Setup**: Mock returns 500
- **Action**: Any action
- **Expected**:
  - Error message: "Something went wrong. Please try again."
  - "Retry" button
  - No data loss

**TC-E-4: 401 Unauthorized**
- **Setup**: Mock returns 401
- **Expected**:
  - Redirect to login
  - Toast: "Session expired"

**TC-E-5: 403 Forbidden**
- **Setup**: User without proper permissions
- **Action**: Try to halt rollout
- **Expected**:
  - Action button disabled OR
  - Error: "You don't have permission"

### Validation Errors

**TC-V-1: Missing Required Fields**
- **Action**: Submit without filling required fields
- **Expected**:
  - Validation errors shown inline
  - Form cannot submit
  - Fields highlighted in red

**TC-V-2: Invalid Rollout Percentage**
- **Action**: Try to set rollout to 101%
- **Expected**: Validation error "Must be between 0 and 100"

**TC-V-3: Invalid Rollout Percentage (Negative)**
- **Action**: Try to set -5%
- **Expected**: Validation error "Must be positive"

**TC-V-4: Empty Release Notes**
- **Action**: Submit with empty release notes
- **Expected**: Validation error "Release notes required"

### Concurrent Operations

**TC-C-1: Concurrent Submissions**
- **Setup**: Two users submit simultaneously
- **Expected**:
  - First succeeds
  - Second shows conflict dialog
  - Can retry or cancel

**TC-C-2: Stale Data**
- **Setup**: Leave page open 10+ minutes
- **Action**: Try to perform action
- **Expected**:
  - Detects stale data
  - Shows warning: "Data may be outdated"
  - Prompts to refresh
  - Auto-refreshes on action

### Empty & Loading States

**TC-S-1: Empty State - No Distributions**
- **Setup**: `node mock-server/scenarios.js empty`
- **Expected**:
  - Friendly empty state
  - Clear message
  - Instructions

**TC-S-2: Loading State - Initial Load**
- **Setup**: Slow network (DevTools → Throttling → Slow 3G)
- **Expected**:
  - Skeleton loaders OR
  - Loading spinner
  - No content flash

**TC-S-3: Loading State - Action in Progress**
- **Action**: Click "Update Rollout"
- **Expected**:
  - Button shows loading state
  - Spinner inside button
  - Button disabled during load

---

## 7. Visual/UI Testing

### Responsive Design Checklist

```
□ Desktop (1920x1080)
  □ All content fits
  □ No horizontal scroll
  □ Optimal spacing

□ Laptop (1366x768)
  □ Comfortable viewing
  □ No cramped UI

□ Tablet (768x1024)
  □ Layout adapts
  □ Touch targets adequate

□ All Modals
  □ Centered on screen
  □ Scrollable if content long
  □ ESC key closes
```

### Component States Checklist

```
□ Loading States
  □ Skeleton loaders smooth
  □ Spinners visible
  □ Progress indicators accurate

□ Disabled States
  □ Visual indication (opacity, cursor)
  □ Tooltips explain why disabled

□ Error States
  □ Red/error styling
  □ Clear error messages
  □ Actionable (retry/fix)

□ Success States
  □ Green/success styling
  □ Confirmation messages
  □ Smooth transitions

□ Empty States
  □ Helpful illustrations
  □ Clear messaging
  □ Next steps provided
```

### Accessibility Checklist

```
□ Keyboard Navigation
  □ All interactive elements focusable
  □ Focus indicators visible
  □ Logical tab order
  □ ESC closes modals

□ Screen Reader
  □ All buttons have clear labels
  □ Form inputs have labels
  □ Error messages announced
  □ Status changes announced

□ Color Contrast
  □ Text meets WCAG AA (4.5:1)
  □ Status badges readable
  □ Error messages clear

□ Focus Management
  □ Modal opens: focus trapped
  □ Modal closes: focus restored
  □ Actions complete: focus moves logically
```

### Animation & Performance

```
□ Smooth Transitions
  □ Status changes animate
  □ Progress bars animate smoothly
  □ Modal open/close smooth
  □ No jank (60fps)

□ Performance
  □ Page loads < 2 seconds
  □ Actions respond < 1 second
  □ No memory leaks
  □ No excessive re-renders
```

---

## 8. Success Criteria

### Functionality ✅

```
□ All submit scenarios work
□ All rollout control scenarios work
□ All navigation flows work
□ Error handling works correctly
□ History tracking works
□ Platform-specific rules enforced
□ Validation works correctly
□ Empty states display properly
□ Loading states display properly
```

### Performance ⚡

```
□ Initial page load < 2 seconds
□ Action response < 1 second
□ Smooth animations (60fps)
□ No memory leaks
□ No excessive API calls
```

### Code Quality 💎

```
□ Zero TypeScript errors
□ Zero linter warnings
□ Zero console errors
□ No `any` types used
□ No `as unknown` casts
□ Proper error boundaries
```

### User Experience 🎨

```
□ Intuitive navigation
□ Clear feedback for all actions
□ Helpful error messages
□ Smooth state transitions
□ Consistent design system
□ Accessible to all users
```

### Documentation 📚

```
□ API spec matches implementation
□ UI flow spec matches implementation
□ Testing plan covers all scenarios
□ Known issues documented
```

---

## 9. Bug Reporting

### Bug Report Template

```markdown
**Bug ID**: [Brief descriptive title]
**Severity**: [Critical / High / Medium / Low]
**Location**: [Route or component path]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**: 
[What should happen]

**Actual Behavior**: 
[What actually happens]

**Screenshots**: 
[Attach if applicable]

**Console Errors**: 
[Copy any errors from DevTools console]

**Network Response**: 
[Copy API response if relevant]

**Environment**:
- Browser: [Chrome/Firefox/Safari + version]
- OS: [macOS/Windows/Linux]
- Mock Server: [Yes/No]

**Additional Context**:
[Any other relevant information]
```

### Severity Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Critical** | App crashes, data loss, security issue | Cannot submit to stores at all |
| **High** | Core feature broken, no workaround | Rollout update fails always |
| **Medium** | Feature broken, workaround exists | History doesn't load, but can manage rollout |
| **Low** | Minor issue, cosmetic | Button text cut off |

---

## 10. Testing Tracking

### Test Run Template

```markdown
### Test Run #[Number] - [Date]

**Tester**: [Name]
**Environment**: 
- [ ] Dev with Mock Server
- [ ] Dev with Real Backend
- [ ] Staging
- [ ] Production

**Browser**: [Chrome/Firefox/Safari] [Version]

**Scenarios Tested**:
- [ ] Scenario 1: Release Page (LIMITED) - PASS / FAIL
- [ ] Scenario 2: Distributions List - PASS / FAIL
- [ ] Scenario 3: Full Management - PASS / FAIL
- [ ] Scenario 4: Android Rollout - PASS / FAIL
- [ ] Scenario 5: iOS Phased - PASS / FAIL
- [ ] Scenario 6: iOS Manual - PASS / FAIL
- [ ] Scenario 7: Resubmission - PASS / FAIL
- [ ] Scenario 8: History - PASS / FAIL
- [ ] Scenario 9: Multi-Platform - PASS / FAIL

**Bugs Found**: 
[List bug IDs or "None"]

**Performance Notes**:
- Page load time: [X seconds]
- Action response time: [X milliseconds]
- Memory usage: [X MB]

**Comments**: 
[Any observations or suggestions]

**Sign-off**: 
- [ ] Ready for production
- [ ] Needs fixes (see bugs)
```

---

## 11. Next Steps

### After Testing is Complete

#### ✅ All Tests Pass
1. Mark implementation as production-ready
2. Document any known limitations
3. Create deployment plan
4. Schedule production rollout
5. Set up monitoring/alerting

#### ❌ Bugs Found
1. **Critical bugs**: Stop testing, fix immediately
2. **High priority bugs**: Fix before proceeding
3. **Medium/Low bugs**: Document, create follow-up tasks
4. Re-run failed test scenarios after fixes

### Integration Testing
1. Coordinate with pre-release implementation team
2. Test complete end-to-end flow
3. Verify data consistency across stages
4. Test real backend integration
5. Perform load testing

---

## 12. Quick Reference Commands

```bash
# Start testing environment
npm run dev:with-mock

# Switch test scenarios
node mock-server/scenarios.js empty
node mock-server/scenarios.js active
node mock-server/scenarios.js many
node mock-server/scenarios.js submissions

# Check API responses
curl http://localhost:3001/api/v1/distributions | jq '.'

# Check specific distribution
curl http://localhost:3001/api/v1/distributions/{id} | jq '.'

# Reset mock data
node mock-server/scenarios.js reset

# Run linter
npm run lint

# Run type check
npm run type-check

# Build for production
npm run build
```

---

## 📞 Support

For questions or issues during testing:
1. Check `DISTRIBUTION_API_SPEC.md` for API details
2. Check `DISTRIBUTION_UI_FLOW_SPEC.md` for UI flows
3. Check console for error messages
4. Report bugs using the template above

---

**Status:** ✅ **READY FOR COMPREHENSIVE TESTING!**

**Start with:** `npm run dev:with-mock` → Navigate to distributions list → Begin Scenario 1!

---

**Document Version:** 2.0  
**Last Updated:** December 14, 2025  
**Maintained By:** Release Management Team
