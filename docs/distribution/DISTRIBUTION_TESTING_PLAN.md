# Distribution Module - Exhaustive Testing Plan

**Document Version:** 3.0  
**Last Updated:** December 15, 2025  
**Status:** ✅ Ready for Comprehensive Manual Testing  
**Purpose:** Granular test-by-test checklist for thorough QA

---

## 📋 Table of Contents

1. [Quick Setup](#quick-setup)
2. [Testing Checklist Master](#testing-checklist-master)
3. [Module 1: Release Page - Distribution Tab](#module-1-release-page---distribution-tab)
4. [Module 2: Distributions List Page](#module-2-distributions-list-page)
5. [Module 3: Distribution Management Page](#module-3-distribution-management-page)
6. [Module 4: Submit To Stores Dialog](#module-4-submit-to-stores-dialog)
7. [Module 5: Android Rollout Controls](#module-5-android-rollout-controls)
8. [Module 6: iOS Phased Release Controls](#module-6-ios-phased-release-controls)
9. [Module 7: iOS Manual Release Controls](#module-7-ios-manual-release-controls)
10. [Module 8: Resubmission Flow](#module-8-resubmission-flow)
11. [Module 9: Submission History](#module-9-submission-history)
12. [Module 10: Multi-Platform Management](#module-10-multi-platform-management)
13. [Module 11: Error Handling](#module-11-error-handling)
14. [Module 12: Field Validation](#module-12-field-validation)
15. [Module 13: Visual & UX](#module-13-visual--ux)
16. [Module 14: State Transitions](#module-14-state-transitions)
17. [Bug Tracking Template](#bug-tracking-template)

---

## Quick Setup

### Prerequisites
```bash
# 1. Check Node.js version
node --version  # Should be 18.18.0 (as per .nvmrc)

# 2. Install dependencies (if not already done)
cd /Users/princetripathi/workspace/delivr/delivr-web-panel-managed
pnpm install

# 3. Install mock server dependencies (if not already done)
cd mock-server
npm install
cd ..
```

### Start Services

#### Terminal 1: Mock Server
```bash
cd /Users/princetripathi/workspace/delivr/delivr-web-panel-managed/mock-server
npm start

# Verify: http://localhost:4000/health should return "OK" with 200 status
```

#### Terminal 2: Frontend Application
```bash
cd /Users/princetripathi/workspace/delivr/delivr-web-panel-managed
pnpm run dev

# Verify: http://localhost:3000 should load the application
```

### Verify API Connection
```bash
# Note: Replace tenant_1 with actual tenant ID

# Test 1: Get distributions list (query param for tenantId)
curl "http://localhost:4000/api/v1/distributions?tenantId=tenant_1" | jq '.'

# Test 2: Get submission WITH platform (should succeed)
curl "http://localhost:4000/api/v1/tenants/tenant_1/submissions/sub_android_001?platform=ANDROID" | jq '.'

# Test 3: Get submission WITHOUT platform (should fail with 400)
curl "http://localhost:4000/api/v1/tenants/tenant_1/submissions/sub_android_001" | jq '.'
# Expected: {"success":false,"error":{"code":"INVALID_PLATFORM",...}}

# Test 4: Reset to initial state
cd mock-server
node scenarios.js reset
```

### Browser Setup
- ✅ Open Chrome DevTools (F12)
- ✅ Console tab visible
- ✅ Network tab open
- ✅ Disable cache while DevTools open
- ✅ Preserve log enabled

---

## 5-Minute Smoke Test ⚡

**Run this FIRST before starting full testing!** This quick test verifies basic functionality.

### Purpose
Validate that the environment is set up correctly and core features work before investing time in comprehensive testing.

### Steps

1. **Navigate to Application**
   ```
   http://localhost:3000
   ```

2. **Test Distributions List**
   - [ ] Distributions list page loads
   - [ ] See list of distributions
   - [ ] Click on any distribution

3. **Test Distribution Detail Page**
   - [ ] Distribution detail page loads
   - [ ] See Android submission card
   - [ ] See iOS submission card
   - [ ] Both cards show status badges

4. **Test Submission Navigation**
   - [ ] Click on Android submission card
   - [ ] Submission detail page loads
   - [ ] See rollout controls (slider or schedule)

5. **Test Platform Parameter (CRITICAL)**
   - [ ] Open Browser DevTools → Network tab
   - [ ] Adjust Android rollout slider (if in LIVE state)
   - [ ] Click "Update Rollout" button
   - [ ] **Verify Network Request:**
     ```
     Request URL should include: ?platform=ANDROID
     ```
   - [ ] Response should be 200 OK

6. **Test API Error Handling**
   ```bash
   # In terminal, test platform validation (replace :tenantId)
   curl "http://localhost:4000/api/v1/tenants/:tenantId/submissions/sub_android_001"
   # Should return: {"success":false,"error":{"code":"INVALID_PLATFORM",...}}
   ```

7. **Test iOS Submission**
   - [ ] Navigate back to distribution detail
   - [ ] Click on iOS submission card
   - [ ] See iOS-specific controls (phased release schedule or 100% release)
   - [ ] If phased release: Verify 7-day schedule is displayed
   - [ ] If manual release: Verify shows 100% immediately

8. **Verify Field Names**
   - [ ] Open Network tab
   - [ ] Look at any submission response
   - [ ] **Verify iOS uses:** `testflightNumber` (NOT testflightBuildNumber)
   - [ ] **Verify Android uses:** `artifactPath` (NOT buildUrl)
   - [ ] **Verify Android uses:** `internalTrackLink` (NOT internalTestingLink)

### Pass Criteria

✅ **All 8 steps pass** → Proceed with full testing  
❌ **Any step fails** → Fix environment before continuing

### Common Issues

| Issue | Solution |
|-------|----------|
| Mock server not responding | Restart: `cd mock-server && npm start` |
| Frontend not loading | Clear cache, restart: `pnpm run dev` |
| API returns 404 | Check mock server logs, verify port 4000 |
| Platform parameter missing | Check browser Network tab, verify URL includes `?platform=...` |

---

## Testing Checklist Master

Track your progress through all modules:

```
Module 1: Release Page - Distribution Tab       [ ] 0/45 tests
Module 2: Distributions List Page               [ ] 0/38 tests
Module 3: Distribution Management Page          [ ] 0/52 tests
Module 4: Submit To Stores Dialog               [ ] 0/67 tests
Module 5: Android Rollout Controls              [ ] 0/48 tests
Module 6: iOS Phased Release Controls           [ ] 0/42 tests
Module 7: iOS Manual Release Controls           [ ] 0/28 tests
Module 8: Resubmission Flow                     [ ] 0/55 tests
Module 9: Submission History                    [ ] 0/32 tests
Module 10: Multi-Platform Management            [ ] 0/41 tests
Module 11: Error Handling                       [ ] 0/63 tests
Module 12: Field Validation                     [ ] 0/58 tests
Module 13: Visual & UX                          [ ] 0/72 tests
Module 14: State Transitions                    [ ] 0/45 tests

TOTAL: 686 test cases
```

---

## Module 1: Release Page - Distribution Tab

**Route:** `/dashboard/{org}/releases/{releaseId}?tab=distribution`

### Setup for Module 1
```bash
# Ensure release exists with PENDING submissions
node mock-server/scenarios.js active
# Navigate to: http://localhost:3000/dashboard/org/releases/{releaseId}?tab=distribution
```

### Test Group 1.1: Page Load & Initial State (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 1.1.1 | Page loads successfully | Navigate to distribution tab | Page renders without errors | [ ] |
| 1.1.2 | Tab is highlighted | Check tab navigation | "Distribution" tab is active/highlighted | [ ] |
| 1.1.3 | Breadcrumb displays | Check header | Shows "Releases > {releaseId} > Distribution" | [ ] |
| 1.1.4 | Release version visible | Check header | Displays correct version (e.g., "v2.7.0") | [ ] |
| 1.1.5 | Release branch visible | Check header | Displays branch name (e.g., "release/2.7.0") | [ ] |
| 1.1.6 | Distribution status badge | Check header | Shows current distribution status badge | [ ] |
| 1.1.7 | "Submit to Stores" button visible | Check main action | Primary button is prominently displayed | [ ] |
| 1.1.8 | "Open in Distribution Management" link visible | Check secondary action | Link is visible and properly styled | [ ] |
| 1.1.9 | Android submission card displays | Check content | Android card shows with PENDING status | [ ] |
| 1.1.10 | iOS submission card displays | Check content | iOS card shows with PENDING status | [ ] |
| 1.1.11 | Platform icons correct | Check cards | Android robot icon, iOS apple icon displayed | [ ] |
| 1.1.12 | Version numbers match | Check cards | Both cards show correct version | [ ] |
| 1.1.13 | Status badges correct | Check cards | Both show "PENDING" badge with gray color | [ ] |
| 1.1.14 | No action buttons on cards | Check cards | Cards are read-only, no rollout controls | [ ] |
| 1.1.15 | Help text displays | Check content | Shows "Ready to submit to stores" message | [ ] |

### Test Group 1.2: Submit to Stores Button (10 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 1.2.1 | Button text correct | Check button | Says "Submit to Stores" | [ ] |
| 1.2.2 | Button is primary style | Check button | Has primary/prominent styling (blue) | [ ] |
| 1.2.3 | Button hover state | Hover over button | Shows hover effect (darker shade) | [ ] |
| 1.2.4 | Button click opens dialog | Click button | Opens SubmitToStoresDialog | [ ] |
| 1.2.5 | Button disabled when no PENDING | When all submitted | Button is disabled/hidden | [ ] |
| 1.2.6 | Button tooltip when disabled | Hover disabled button | Shows "Already submitted" tooltip | [ ] |
| 1.2.7 | Button loading state | During API call | Shows spinner, text "Submitting..." | [ ] |
| 1.2.8 | Button keyboard accessible | Press Tab | Button gets focus indicator | [ ] |
| 1.2.9 | Button click via Enter key | Focus + press Enter | Opens dialog | [ ] |
| 1.2.10 | Button icon displays | Check button | Shows store/upload icon | [ ] |

### Test Group 1.3: Submission Cards - PENDING State (10 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 1.3.1 | Card background color | Check Android card | Light green background | [ ] |
| 1.3.2 | Card background color | Check iOS card | Light blue background | [ ] |
| 1.3.3 | Platform icon size | Check both cards | Icons are 32x32 or similar | [ ] |
| 1.3.4 | Status badge color PENDING | Check status badges | Gray badge with "PENDING" text | [ ] |
| 1.3.5 | Version text format | Check both cards | Shows "Version: v2.7.0" | [ ] |
| 1.3.6 | Build number Android | Check Android card | Shows versionCode (e.g., 270) | [ ] |
| 1.3.7 | TestFlight number iOS | Check iOS card | Shows testflightNumber | [ ] |
| 1.3.8 | No timestamps shown | Check both cards | submittedAt/statusUpdatedAt NOT shown | [ ] |
| 1.3.9 | Message displays | Check cards | Shows "Not yet submitted" or similar | [ ] |
| 1.3.10 | Cards have border | Check styling | Cards have subtle border | [ ] |

### Test Group 1.4: Submission Cards - After Submission (10 tests)

| ID | Test Case | Steps | Submit both platforms first | Expected Result | Pass/Fail |
|----|-----------|-------|---------------------------|-----------------|-----------|
| 1.4.1 | Status badge updates Android | Check Android card | Shows "IN_REVIEW" badge (yellow) | [ ] |
| 1.4.2 | Status badge updates iOS | Check iOS card | Shows "IN_REVIEW" badge (yellow) | [ ] |
| 1.4.3 | Submitted timestamp shows | Check both cards | Shows "Submitted: Dec 15, 2025 10:30 AM" | [ ] |
| 1.4.4 | Submitted by shows | Check both cards | Shows user email who submitted | [ ] |
| 1.4.5 | Rollout percentage Android | Check Android card | Shows "Rollout: 5.5%" if LIVE | [ ] |
| 1.4.6 | Progress bar Android | Check Android card | Shows progress bar if LIVE | [ ] |
| 1.4.7 | Rollout percentage iOS | Check iOS card | Shows "Rollout: 0%" initially | [ ] |
| 1.4.8 | No action buttons | Check both cards | Still read-only, no controls | [ ] |
| 1.4.9 | Card updates without refresh | After submission | Cards update automatically | [ ] |
| 1.4.10 | Link to management visible | Check cards | "Manage from Distribution Management" link | [ ] |

---

## Module 2: Distributions List Page

**Route:** `/dashboard/{org}/distributions`

### Setup for Module 2
```bash
node mock-server/scenarios.js five
# Navigate to: http://localhost:3000/dashboard/org/distributions
```

### Test Group 2.1: Page Load & Header (12 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.1.1 | Page title displays | Check header | Shows "Distribution Management" | [ ] |
| 2.1.2 | Breadcrumb correct | Check breadcrumb | Shows "Distributions" | [ ] |
| 2.1.3 | Stats cards render | Check top section | Shows 4 stats cards | [ ] |
| 2.1.4 | Total Distributions stat | Check stat card 1 | Shows correct count | [ ] |
| 2.1.5 | Total Submissions stat | Check stat card 2 | Shows correct count | [ ] |
| 2.1.6 | In Review Submissions stat | Check stat card 3 | Shows correct count | [ ] |
| 2.1.7 | Released Submissions stat | Check stat card 4 | Shows correct count | [ ] |
| 2.1.8 | Stats card icons | Check all cards | Each has appropriate icon | [ ] |
| 2.1.9 | Stats update on data change | Change scenario | Stats recalculate correctly | [ ] |
| 2.1.10 | Refresh button visible | Check header | Shows refresh icon button | [ ] |
| 2.1.11 | Refresh button works | Click refresh | Reloads data, shows loading state | [ ] |
| 2.1.12 | Page loads in < 2 seconds | Time page load | Meets performance target | [ ] |

### Test Group 2.2: Empty State (8 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.2.1 | Empty state displays | `node mock-server/scenarios.js empty` + navigate | Shows empty state illustration | [ ] |
| 2.2.2 | Empty state title | Check empty state | Shows "No Distributions Yet" | [ ] |
| 2.2.3 | Empty state description | Check empty state | Explains how distributions are created | [ ] |
| 2.2.4 | Empty state icon/image | Check empty state | Shows friendly illustration | [ ] |
| 2.2.5 | No stats cards shown | Check page | Stats section hidden in empty state | [ ] |
| 2.2.6 | No table/list shown | Check page | Distribution list hidden | [ ] |
| 2.2.7 | Instructions visible | Check empty state | Shows next steps to create distribution | [ ] |
| 2.2.8 | Link to releases page | Check empty state | Shows link to "Go to Releases" | [ ] |

### Test Group 2.3: Distribution List Items (18 tests)

| ID | Test Case | Steps | `node mock-server/scenarios.js five` | Expected Result | Pass/Fail |
|----|-----------|-------|-------------------------------------|-----------------|-----------|
| 2.3.1 | List renders | Check page | Shows list/table of 5 distributions | [ ] |
| 2.3.2 | List item structure | Check first item | Has all required fields visible | [ ] |
| 2.3.3 | Release version displays | Check each item | Shows version (e.g., "v2.7.0") | [ ] |
| 2.3.4 | Release branch displays | Check each item | Shows branch name | [ ] |
| 2.3.5 | Distribution status badge | Check each item | Shows correct status badge with color | [ ] |
| 2.3.6 | Android platform summary | Check items with Android | Shows "Android: LIVE (50%)" format | [ ] |
| 2.3.7 | iOS platform summary | Check items with iOS | Shows "iOS: IN_REVIEW" format | [ ] |
| 2.3.8 | Platform icons | Check all items | Shows Android/iOS icons | [ ] |
| 2.3.9 | Last updated timestamp | Check each item | Shows "Updated: X minutes ago" | [ ] |
| 2.3.10 | "Open" button visible | Check each item | Shows "Open" or "Manage" button | [ ] |
| 2.3.11 | "Open" button hover | Hover button | Shows hover effect | [ ] |
| 2.3.12 | "Open" button click | Click button | Navigates to detail page | [ ] |
| 2.3.13 | Row hover effect | Hover over row | Entire row highlights | [ ] |
| 2.3.14 | Row click | Click anywhere on row | Navigates to detail page (optional) | [ ] |
| 2.3.15 | Progress bars visible | Check LIVE submissions | Shows rollout progress bars | [ ] |
| 2.3.16 | Progress bar colors | Check progress bars | Green for LIVE, gray for others | [ ] |
| 2.3.17 | Status badge colors | Check all items | PENDING=gray, IN_REVIEW=yellow, LIVE=green, etc. | [ ] |
| 2.3.18 | List items sorted | Check order | Sorted by most recent first | [ ] |

---

## Module 3: Distribution Management Page

**Route:** `/dashboard/{org}/distributions/{distributionId}`

### Setup for Module 3
```bash
# Navigate from list page or direct URL
# Ensure distribution has both Android and iOS submissions
```

### Test Group 3.1: Page Layout & Header (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 3.1.1 | Page loads successfully | Navigate to page | No console errors, page renders | [ ] |
| 3.1.2 | Breadcrumb correct | Check breadcrumb | "Distributions > v2.7.0" | [ ] |
| 3.1.3 | Page title displays | Check header | "Distribution Management" | [ ] |
| 3.1.4 | Release version prominent | Check header | Large version number (e.g., "v2.7.0") | [ ] |
| 3.1.5 | Release branch displays | Check header | Shows "release/2.7.0" | [ ] |
| 3.1.6 | Distribution status badge | Check header | Shows current status with color | [ ] |
| 3.1.7 | Platforms list | Check header | Shows "Platforms: Android, iOS" | [ ] |
| 3.1.8 | Created timestamp | Check header | Shows "Created: Dec 10, 2025" | [ ] |
| 3.1.9 | Refresh button | Check header | Shows refresh icon button | [ ] |
| 3.1.10 | Refresh button works | Click refresh | Reloads data, loading indicator shows | [ ] |
| 3.1.11 | Back button/link | Check navigation | Shows "← Back to Distributions" | [ ] |
| 3.1.12 | Back button works | Click back | Navigates to list page | [ ] |
| 3.1.13 | Platform tabs visible | Check tab bar | Shows "Android" and "iOS" tabs | [ ] |
| 3.1.14 | Active tab indicator | Check tabs | One tab is highlighted/active | [ ] |
| 3.1.15 | Tab badges | Check tabs | Tabs show status badges (e.g., "LIVE 50%") | [ ] |

### Test Group 3.2: Platform Tabs Navigation (12 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 3.2.1 | Default tab selected | Page load | First available platform tab active | [ ] |
| 3.2.2 | Android tab click | Click "Android" tab | Tab becomes active | [ ] |
| 3.2.3 | Android content displays | After click | Android submission card shows | [ ] |
| 3.2.4 | iOS tab click | Click "iOS" tab | Tab becomes active | [ ] |
| 3.2.5 | iOS content displays | After click | iOS submission card shows | [ ] |
| 3.2.6 | Tab switch animation | Switch tabs | Smooth transition animation | [ ] |
| 3.2.7 | Tab keyboard navigation | Press Tab keys | Tabs receive focus | [ ] |
| 3.2.8 | Tab activation via Enter | Focus tab + press Enter | Tab activates | [ ] |
| 3.2.9 | Tab activation via Space | Focus tab + press Space | Tab activates | [ ] |
| 3.2.10 | Tab content lazy loads | Switch tabs | New content loads when needed | [ ] |
| 3.2.11 | URL doesn't change | Switch tabs | URL stays same (no navigation) | [ ] |
| 3.2.12 | Previous tab state preserved | Switch back | Previous tab content restored | [ ] |

### Test Group 3.3: Submission Card Display (25 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 3.3.1 | Card renders | Check active tab | Submission card displays | [ ] |
| 3.3.2 | Card header | Check card | Shows "Platform: Android" or "iOS" | [ ] |
| 3.3.3 | Status badge prominent | Check card header | Large status badge with color | [ ] |
| 3.3.4 | Version information | Check card | Shows version and build numbers | [ ] |
| 3.3.5 | Submitted timestamp | Check card | Shows "Submitted: {date}" | [ ] |
| 3.3.6 | Submitted by user | Check card | Shows submitter email | [ ] |
| 3.3.7 | Last updated timestamp | Check card | Shows "Last Updated: {relative time}" | [ ] |
| 3.3.8 | Release notes section | Check card | Shows release notes if available | [ ] |
| 3.3.9 | Rollout section visible | If LIVE | Shows current rollout percentage | [ ] |
| 3.3.10 | Progress bar displays | If LIVE | Shows visual progress bar | [ ] |
| 3.3.11 | Progress bar color | Check progress bar | Green for active, gray for others | [ ] |
| 3.3.12 | Progress bar animated | Watch progress bar | Animates smoothly on update | [ ] |
| 3.3.13 | Artifact information | Check card | Shows build URL (Android) or TF number (iOS) | [ ] |
| 3.3.14 | Internal testing link | Android only | Shows Play Store internal testing link | [ ] |
| 3.3.15 | Store link | If LIVE/RELEASED | Shows "View in Store" external link | [ ] |
| 3.3.16 | Store link opens new tab | Click store link | Opens in new tab/window | [ ] |
| 3.3.17 | Metrics section | If available | Shows download counts, ratings | [ ] |
| 3.3.18 | Card sections organized | Check layout | Clear sections with headers | [ ] |
| 3.3.19 | Card responsive | Resize window | Card adapts to screen size | [ ] |
| 3.3.20 | Card scrollable | Long content | Card scrolls if content exceeds height | [ ] |
| 3.3.21 | No submission state | If PENDING | Shows "Not submitted" message | [ ] |
| 3.3.22 | Submit button PENDING | If PENDING | Shows "Submit to Stores" button | [ ] |
| 3.3.23 | Rejection details | If REJECTED | Shows rejection reason card | [ ] |
| 3.3.24 | Resubmit button | If REJECTED | Shows "Fix & Re-Submit" button | [ ] |
| 3.3.25 | Halt warning banner | If HALTED | Shows red warning banner with reason | [ ] |

---

## Module 4: Submit To Stores Dialog

**Trigger:** Click "Submit to Stores" button from Release Page or Distribution Management Page

### Test Group 4.1: Dialog Open & Close (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 4.1.1 | Dialog opens on button click | Click "Submit to Stores" | Dialog modal opens | [ ] |
| 4.1.2 | Dialog centered on screen | Check position | Dialog is centered | [ ] |
| 4.1.3 | Dialog has backdrop | Check background | Semi-transparent overlay behind dialog | [ ] |
| 4.1.4 | Dialog title correct | Check header | "Submit to App Stores" | [ ] |
| 4.1.5 | Close button (X) visible | Check header | X button in top-right corner | [ ] |
| 4.1.6 | Close button works | Click X button | Dialog closes | [ ] |
| 4.1.7 | Close on backdrop click | Click outside dialog | Dialog closes | [ ] |
| 4.1.8 | Close on ESC key | Press ESC | Dialog closes | [ ] |
| 4.1.9 | Focus trapped in dialog | Press Tab | Focus stays within dialog | [ ] |
| 4.1.10 | Cancel button visible | Check footer | "Cancel" button present | [ ] |
| 4.1.11 | Cancel button works | Click Cancel | Dialog closes | [ ] |
| 4.1.12 | Dialog scrollable | Long content | Dialog scrolls if content long | [ ] |
| 4.1.13 | Dialog responsive | Resize window | Dialog adapts to screen size | [ ] |
| 4.1.14 | Dialog animation smooth | Open/close dialog | Smooth fade/scale animation | [ ] |
| 4.1.15 | Focus restored on close | Close dialog | Focus returns to trigger button | [ ] |

### Test Group 4.2: Platform Selection (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 4.2.1 | Platform checkboxes visible | Check dialog | Shows Android and iOS checkboxes | [ ] |
| 4.2.2 | Both platforms pre-selected | Initial state | Both checkboxes checked by default | [ ] |
| 4.2.3 | Android checkbox label | Check label | "Submit to Google Play Store" | [ ] |
| 4.2.4 | iOS checkbox label | Check label | "Submit to Apple App Store" | [ ] |
| 4.2.5 | Platform icons | Check checkboxes | Android/iOS icons next to labels | [ ] |
| 4.2.6 | Uncheck Android | Click Android checkbox | Checkbox unchecks, Android form hides | [ ] |
| 4.2.7 | Check Android again | Click Android checkbox | Checkbox checks, Android form shows | [ ] |
| 4.2.8 | Uncheck iOS | Click iOS checkbox | Checkbox unchecks, iOS form hides | [ ] |
| 4.2.9 | Check iOS again | Click iOS checkbox | Checkbox checks, iOS form shows | [ ] |
| 4.2.10 | Both unchecked state | Uncheck both | Submit button disabled | [ ] |
| 4.2.11 | Checkbox keyboard access | Tab to checkbox + Space | Checkbox toggles | [ ] |
| 4.2.12 | Only PENDING platforms shown | If one submitted | Only shows unchecked platform checkbox | [ ] |
| 4.2.13 | Disabled platform checkbox | If already submitted | Checkbox disabled with tooltip | [ ] |
| 4.2.14 | Checkbox styling | Check visual | Clear checkmark, proper colors | [ ] |
| 4.2.15 | Help text under checkboxes | Check content | Explains what happens on submit | [ ] |

### Test Group 4.3: Android Options Form (17 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 4.3.1 | Android section visible | Android checked | Android options panel shows | [ ] |
| 4.3.2 | Android section header | Check header | "Android Options" with icon | [ ] |
| 4.3.3 | Android section background | Check styling | Light green background | [ ] |
| 4.3.4 | Rollout percentage slider | Check field | Shows slider control 1-100 | [ ] |
| 4.3.5 | Slider default value | Check slider | Set to 100% by default | [ ] |
| 4.3.6 | Slider drag interaction | Drag slider | Value updates smoothly | [ ] |
| 4.3.7 | Slider step increments | Check slider | Supports 0.1 step (decimals) | [ ] |
| 4.3.8 | Slider value display | Check slider | Shows current value (e.g., "5.5%") | [ ] |
| 4.3.9 | Slider marks | Check slider | Shows marks at 1%, 5%, 25%, 50%, 100% | [ ] |
| 4.3.10 | In-App Priority dropdown | Check field | Dropdown with options 0-5 | [ ] |
| 4.3.11 | Priority options visible | Open dropdown | Shows "0 - Default" through "5 - Urgent" | [ ] |
| 4.3.12 | Priority default value | Check dropdown | Set to "0 - Default" | [ ] |
| 4.3.13 | Priority selection works | Select option | Value updates | [ ] |
| 4.3.14 | Priority help text | Check description | Explains in-app update priority | [ ] |
| 4.3.15 | Android form validation | Leave fields empty | Shows validation errors | [ ] |
| 4.3.16 | Android disabled state | When Android unchecked | Form is hidden/disabled | [ ] |
| 4.3.17 | Android form responsive | Resize window | Form adapts to width | [ ] |

### Test Group 4.4: iOS Options Form (20 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 4.4.1 | iOS section visible | iOS checked | iOS options panel shows | [ ] |
| 4.4.2 | iOS section header | Check header | "iOS Options" with icon | [ ] |
| 4.4.3 | iOS section background | Check styling | Light blue background | [ ] |
| 4.4.4 | Release Type field | Check field | Shows "Release Type" read-only field | [ ] |
| 4.4.5 | Release Type value | Check field | Shows "AFTER_APPROVAL" (non-editable) | [ ] |
| 4.4.6 | Release Type badge | Check field | Shows blue "Default" badge | [ ] |
| 4.4.7 | Release Type disabled | Try to edit | Field is disabled/read-only | [ ] |
| 4.4.8 | Release Type help text | Check description | Explains it's always AFTER_APPROVAL | [ ] |
| 4.4.9 | Phased Release checkbox | Check field | Shows "Enable Phased Release" checkbox | [ ] |
| 4.4.10 | Phased default checked | Check checkbox | Checked by default | [ ] |
| 4.4.11 | Phased checkbox toggle | Click checkbox | Toggles on/off | [ ] |
| 4.4.12 | Phased help text | Check description | Explains 7-day automatic rollout | [ ] |
| 4.4.13 | Reset Rating checkbox | Check field | Shows "Reset App Rating" checkbox | [ ] |
| 4.4.14 | Reset default unchecked | Check checkbox | Unchecked by default | [ ] |
| 4.4.15 | Reset checkbox toggle | Click checkbox | Toggles on/off | [ ] |
| 4.4.16 | Reset help text | Check description | Explains rating reset (optional) | [ ] |
| 4.4.17 | iOS form validation | Check fields | All optional except release notes | [ ] |
| 4.4.18 | iOS disabled state | When iOS unchecked | Form is hidden/disabled | [ ] |
| 4.4.19 | iOS form responsive | Resize window | Form adapts to width | [ ] |
| 4.4.20 | Checkbox keyboard access | Tab + Space | Checkboxes toggle via keyboard | [ ] |

---

## Module 5: Android Rollout Controls

**Location:** Distribution Management Page > Android Tab (when submission is LIVE)

### Setup for Module 5
```bash
# Ensure Android submission exists with status LIVE at 5%
# Navigate to distribution detail page, Android tab
```

### Test Group 5.1: Rollout Controls Display (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.1.1 | Rollout section visible | Check page | "Rollout Management" section displays | [ ] |
| 5.1.2 | Current rollout displays | Check header | Shows "Current Rollout: 5.0%" | [ ] |
| 5.1.3 | Current rollout prominent | Check styling | Large, bold text | [ ] |
| 5.1.4 | Progress bar displays | Check visual | Shows progress bar at 5% | [ ] |
| 5.1.5 | Progress bar color | Check progress bar | Green filled portion | [ ] |
| 5.1.6 | Progress bar percentage | Check progress bar | Exact width matches percentage | [ ] |
| 5.1.7 | Preset buttons visible | Check controls | Shows [1%] [5%] [10%] [25%] [50%] [100%] | [ ] |
| 5.1.8 | Preset buttons styled | Check buttons | Outlined style, evenly spaced | [ ] |
| 5.1.9 | Custom slider visible | Check controls | Shows slider 5 → 100 | [ ] |
| 5.1.10 | Slider current value | Check slider | Positioned at current 5% | [ ] |
| 5.1.11 | Slider disabled portions | Check slider | 0-5% range is grayed out/disabled | [ ] |
| 5.1.12 | Update Rollout button | Check controls | Shows "Update Rollout" button (disabled initially) | [ ] |
| 5.1.13 | Emergency Halt button | Check controls | Shows "Emergency Halt" button (red, always enabled) | [ ] |
| 5.1.14 | View History link | Check controls | Shows "View History" link | [ ] |
| 5.1.15 | Help text displays | Check section | Explains rollout can only increase | [ ] |

### Test Group 5.2: Preset Buttons Interaction (10 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.2.1 | Click 10% preset | Click "10%" button | Slider jumps to 10% | [ ] |
| 5.2.2 | Update button enables | After preset click | "Update Rollout" button becomes enabled | [ ] |
| 5.2.3 | Percentage display updates | After preset click | Shows "10%" in display | [ ] |
| 5.2.4 | Progress bar preview | After preset click | Progress bar updates optimistically | [ ] |
| 5.2.5 | Click 25% preset | Click "25%" button | Slider jumps to 25% | [ ] |
| 5.2.6 | Click 50% preset | Click "50%" button | Slider jumps to 50% | [ ] |
| 5.2.7 | Click 100% preset | Click "100%" button | Slider jumps to 100% | [ ] |
| 5.2.8 | Preset button hover | Hover button | Shows hover effect | [ ] |
| 5.2.9 | Disabled preset grayed | Presets below current | Lower presets are disabled/grayed | [ ] |
| 5.2.10 | Preset button keyboard | Tab to button + Enter | Activates preset | [ ] |

### Test Group 5.3: Slider Interaction (13 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.3.1 | Drag slider right | Drag handle right | Percentage increases | [ ] |
| 5.3.2 | Drag slider to 30% | Drag to 30% | Shows "30.0%" | [ ] |
| 5.3.3 | Try drag slider left | Try to drag below current | Cannot drag below current value | [ ] |
| 5.3.4 | Slider snaps back | Release below current | Snaps back to current value | [ ] |
| 5.3.5 | Slider decimal support | Drag to between marks | Shows decimal (e.g., "27.3%") | [ ] |
| 5.3.6 | Slider smooth dragging | Drag slider | Smooth continuous movement | [ ] |
| 5.3.7 | Slider arrow key | Focus + arrow right | Increases by 0.1% | [ ] |
| 5.3.8 | Slider arrow key left | Focus + arrow left | Cannot go below current | [ ] |
| 5.3.9 | Slider Page Up | Focus + Page Up | Increases by 10% | [ ] |
| 5.3.10 | Slider Page Down | Focus + Page Down | Cannot go below current | [ ] |
| 5.3.11 | Slider Home key | Focus + Home | Goes to current value (minimum) | [ ] |
| 5.3.12 | Slider End key | Focus + End | Goes to 100% | [ ] |
| 5.3.13 | Slider focus indicator | Tab to slider | Shows focus indicator | [ ] |

### Test Group 5.4: Update Rollout Action (10 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.4.1 | Update button disabled initially | Check button | Button is disabled | [ ] |
| 5.4.2 | Update button enables on change | Change percentage | Button becomes enabled | [ ] |
| 5.4.3 | Update button text | Check button | Says "Update Rollout" or "Apply Update" | [ ] |
| 5.4.4 | Click Update button | Set 25% + click | Sends API request | [ ] |
| 5.4.5 | API request correct | Check Network tab | `PATCH /api/v1/tenants/:tenantId/submissions/{id}/rollout?platform=ANDROID` | [ ] |
| 5.4.6 | Request body correct | Check payload | `{"rolloutPercentage": 25.0}` (float) | [ ] |
| 5.4.7 | Loading state during update | During API call | Button shows spinner | [ ] |
| 5.4.8 | Optimistic UI update | Immediately after click | Progress bar updates before API returns | [ ] |
| 5.4.9 | Success toast displays | After success | Shows "Rollout updated to 25%" toast | [ ] |
| 5.4.10 | UI updates after success | After API success | Current rollout shows 25%, slider minimum is now 25 | [ ] |

### Test Group 5.5: HALTED State - Update Blocked (10 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.5.1 | Pause rollout first | Click Halt | Status changes to HALTED | [ ] |
| 5.5.2 | Update controls disabled | Check UI after halt | Rollout slider disabled | [ ] |
| 5.5.3 | Update button hidden | Check UI | "Update Rollout" button hidden/disabled | [ ] |
| 5.5.4 | Try update via API | Call API with HALTED status | Returns 409 "Must resume first" | [ ] |
| 5.5.5 | Warning message shown | Check UI | Shows "Must resume before updating rollout" message | [ ] |
| 5.5.6 | Resume button visible | Check UI | "Resume" button prominently displayed | [ ] |
| 5.5.7 | Resume rollout | Click Resume | Status changes back to IN_PROGRESS | [ ] |
| 5.5.8 | Update controls re-enable | After resume | Rollout slider becomes enabled | [ ] |
| 5.5.9 | Can now update | Set new percentage | Update button enables | [ ] |
| 5.5.10 | Update works after resume | Click Update | Successfully updates rollout | [ ] |

---

## Module 6: iOS Phased Release Controls

**Location:** Distribution Management Page > iOS Tab (when submission is LIVE with phasedRelease=true)

### Setup for Module 6
```bash
# Ensure iOS submission exists with status LIVE, phasedRelease=true
# Should show automatic 7-day rollout
```

### Test Group 6.1: Phased Release Display (12 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.1.1 | Phased release section visible | Check page | "Phased Release Management" section displays | [ ] |
| 6.1.2 | Current day display | Check header | Shows "Day X of 7" | [ ] |
| 6.1.3 | Current percentage | Check header | Shows current auto percentage (e.g., "Day 1: ~1%") | [ ] |
| 6.1.4 | Progress bar displays | Check visual | Shows 7-segment progress bar | [ ] |
| 6.1.5 | Active day highlighted | Check progress bar | Current day segment highlighted | [ ] |
| 6.1.6 | Future days grayed | Check progress bar | Future days grayed out | [ ] |
| 6.1.7 | Schedule table | Check content | Shows 7-day schedule with percentages | [ ] |
| 6.1.8 | Schedule day labels | Check table | Day 1, Day 2, ... Day 7 | [ ] |
| 6.1.9 | Schedule percentages | Check table | ~1%, ~2%, ~5%, ~10%, ~20%, ~50%, 100% | [ ] |
| 6.1.10 | Pause button visible | Check controls | Shows "Pause Rollout" button | [ ] |
| 6.1.11 | Complete Early button | Check controls | Shows "Complete Early (100%)" button | [ ] |
| 6.1.12 | Emergency Halt button | Check controls | Shows "Emergency Halt" button (red) | [ ] |

### Test Group 6.2: Pause/Resume Actions (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.2.1 | Pause button text | Check button | Says "Pause Rollout" | [ ] |
| 6.2.2 | Pause button hover | Hover button | Shows hover effect | [ ] |
| 6.2.3 | Click Pause button | Click button | Shows confirmation dialog | [ ] |
| 6.2.4 | Pause confirmation dialog | Check dialog | "Are you sure you want to pause?" | [ ] |
| 6.2.5 | Pause dialog explains | Check dialog | Explains rollout will pause until resumed | [ ] |
| 6.2.6 | Confirm pause | Click Confirm | Sends PATCH request to pause endpoint | [ ] |
| 6.2.7 | API request correct | Check Network | `PATCH /api/v1/tenants/:tenantId/submissions/{id}/rollout/pause?platform=IOS` | [ ] |
| 6.2.8 | Success toast pause | After success | Shows "Rollout paused" toast | [ ] |
| 6.2.9 | Status badge updates | After pause | Shows "PAUSED" badge (orange) | [ ] |
| 6.2.10 | Pause button becomes Resume | After pause | Button text changes to "Resume Rollout" | [ ] |
| 6.2.11 | Resume button click | Click Resume | Shows confirmation dialog | [ ] |
| 6.2.12 | Resume confirmation | Check dialog | "Resume phased release rollout?" | [ ] |
| 6.2.13 | Confirm resume | Click Confirm | Sends PATCH request to resume endpoint | [ ] |
| 6.2.14 | Success toast resume | After success | Shows "Rollout resumed" toast | [ ] |
| 6.2.15 | Status back to LIVE | After resume | Status badge shows "LIVE" again | [ ] |

### Test Group 6.3: Complete Early Action (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.3.1 | Complete Early button text | Check button | "Complete Early (100%)" or "Release to 100%" | [ ] |
| 6.3.2 | Complete Early hover | Hover button | Shows hover effect | [ ] |
| 6.3.3 | Complete Early tooltip | Hover button | Shows "Skip remaining days, release to all users" | [ ] |
| 6.3.4 | Click Complete Early | Click button | Shows confirmation dialog | [ ] |
| 6.3.5 | Confirmation dialog warning | Check dialog | Shows warning icon | [ ] |
| 6.3.6 | Confirmation message | Check dialog | "Release to 100% of users immediately?" | [ ] |
| 6.3.7 | Dialog explains action | Check dialog | Explains cannot undo, will release to all | [ ] |
| 6.3.8 | Cancel button in dialog | Check dialog | Shows Cancel button | [ ] |
| 6.3.9 | Cancel works | Click Cancel | Dialog closes, no action taken | [ ] |
| 6.3.10 | Confirm button dangerous | Check dialog | Confirm button is warning/red style | [ ] |
| 6.3.11 | Confirm Complete Early | Click Confirm | Sends PATCH request with rolloutPercentage=100 | [ ] |
| 6.3.12 | API request correct | Check Network | `PATCH /api/v1/tenants/:tenantId/submissions/{id}/rollout?platform=IOS` with `{"rolloutPercentage": 100}` | [ ] |
| 6.3.13 | Success toast displays | After success | Shows "Released to 100% of users" | [ ] |
| 6.3.14 | Rollout shows 100% | After success | Current rollout displays 100% | [ ] |
| 6.3.15 | Phased controls disappear | After complete | Pause/Complete buttons disappear (rollout done) | [ ] |

### Test Group 6.4: PAUSED State - Update Blocked (10 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.4.1 | Pause phased release | Click Pause | Status changes to PAUSED | [ ] |
| 6.4.2 | Complete Early disabled | Check UI after pause | "Complete Early" button disabled | [ ] |
| 6.4.3 | Try complete via API | Call API with PAUSED status | Returns 409 "Must resume first" | [ ] |
| 6.4.4 | Warning message shown | Check UI | Shows "Must resume before completing rollout" message | [ ] |
| 6.4.5 | Resume button visible | Check UI | "Resume" button prominently displayed | [ ] |
| 6.4.6 | Pause reason shown | Check UI | Shows reason for pause | [ ] |
| 6.4.7 | Resume rollout | Click Resume | Status changes back to LIVE | [ ] |
| 6.4.8 | Complete Early re-enables | After resume | "Complete Early" button becomes enabled | [ ] |
| 6.4.9 | Can now complete | Check button | Complete Early button clickable | [ ] |
| 6.4.10 | Complete works after resume | Click Complete | Successfully releases to 100% | [ ] |

---

## Module 7: iOS Manual Release Controls

**Location:** Distribution Management Page > iOS Tab (when submission is LIVE with phasedRelease=false)

### Setup for Module 7
```bash
# Ensure iOS submission with phasedRelease=false (manual release)
# Should be at 100% immediately
```

### Test Group 7.1: Manual Release Display (10 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 7.1.1 | Manual release indicator | Check page | Shows "Manual Release" badge | [ ] |
| 7.1.2 | Rollout at 100% | Check display | Shows "Rollout: 100%" | [ ] |
| 7.1.3 | No phased controls | Check page | No pause/resume buttons | [ ] |
| 7.1.4 | No schedule shown | Check page | No 7-day schedule displayed | [ ] |
| 7.1.5 | Progress bar full | Check visual | Progress bar completely filled (green) | [ ] |
| 7.1.6 | Release date shown | Check content | Shows "Released: {date}" | [ ] |
| 7.1.7 | Only Halt button | Check controls | Only "Emergency Halt" button visible | [ ] |
| 7.1.8 | Halt button enabled | Check button | Button is enabled (can halt anytime) | [ ] |
| 7.1.9 | Status badge LIVE | Check status | Shows "LIVE" badge (green) | [ ] |
| 7.1.10 | Info text displays | Check content | Explains manual release is immediate 100% | [ ] |

### Test Group 7.2: Emergency Halt (Manual) (18 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 7.2.1 | Halt button visible | Check controls | "Emergency Halt" button present | [ ] |
| 7.2.2 | Halt button red | Check styling | Danger/red color styling | [ ] |
| 7.2.3 | Halt button icon | Check button | Shows stop/warning icon | [ ] |
| 7.2.4 | Halt button hover | Hover button | Shows hover effect | [ ] |
| 7.2.5 | Click Halt button | Click button | Opens halt confirmation dialog | [ ] |
| 7.2.6 | Halt dialog title | Check dialog | "Emergency Halt Distribution?" | [ ] |
| 7.2.7 | Halt dialog warning | Check dialog | Large warning icon, red theme | [ ] |
| 7.2.8 | Halt dialog explains | Check dialog | Explains distribution will stop immediately | [ ] |
| 7.2.9 | Reason field visible | Check dialog | Text area for halt reason | [ ] |
| 7.2.10 | Reason field required | Try submit empty | Shows validation error | [ ] |
| 7.2.11 | Reason field placeholder | Check field | Shows "Explain why halting..." | [ ] |
| 7.2.12 | Reason character count | Type text | Shows character count | [ ] |
| 7.2.13 | Cancel button | Check dialog | Shows "Cancel" button | [ ] |
| 7.2.14 | Cancel works | Click Cancel | Dialog closes, no action | [ ] |
| 7.2.15 | Halt button in dialog | Check dialog | Shows "Halt Distribution" danger button | [ ] |
| 7.2.16 | Confirm halt | Fill reason + click Halt | Sends PATCH request | [ ] |
| 7.2.17 | API request correct | Check Network | `PATCH /api/v1/tenants/:tenantId/submissions/{id}/rollout/halt?platform=IOS` with reason | [ ] |
| 7.2.18 | Success updates UI | After success | Status changes to "HALTED", shows reason | [ ] |

---

## Module 8: Resubmission Flow

**Location:** Distribution Management Page (when submission is REJECTED or CANCELLED)

### Setup for Module 8
```bash
# Set submission to REJECTED status with rejection reason
# Navigate to distribution detail page
```

### Test Group 8.1: Rejection Display (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 8.1.1 | Rejected status badge | Check page | Shows "REJECTED" badge (red) | [ ] |
| 8.1.2 | Rejection card visible | Check page | Prominent rejection details card | [ ] |
| 8.1.3 | Rejection card styling | Check card | Red/warning background color | [ ] |
| 8.1.4 | Rejection icon | Check card | Shows warning/error icon | [ ] |
| 8.1.5 | Rejection title | Check card | "Submission Rejected by Store" | [ ] |
| 8.1.6 | Rejection date | Check card | Shows "Rejected on: {date}" | [ ] |
| 8.1.7 | Rejection reason visible | Check card | Shows store's rejection reason | [ ] |
| 8.1.8 | Rejection reason formatted | Check card | Reason text is readable, formatted | [ ] |
| 8.1.9 | Store name mentioned | Check card | Shows which store rejected (Play/App Store) | [ ] |
| 8.1.10 | Original submission details | Check card | Shows original submission info | [ ] |
| 8.1.11 | Version number shown | Check card | Shows rejected version | [ ] |
| 8.1.12 | Build number shown | Check card | Shows rejected build | [ ] |
| 8.1.13 | Resubmit button visible | Check card | "Fix & Re-Submit" button prominent | [ ] |
| 8.1.14 | Help text displays | Check card | Guidance on how to proceed | [ ] |
| 8.1.15 | No rollout controls | Check page | Rollout section hidden | [ ] |

### Test Group 8.2: Resubmission Dialog Open (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 8.2.1 | Click Resubmit button | Click "Fix & Re-Submit" | Opens resubmission dialog | [ ] |
| 8.2.2 | Dialog title | Check dialog | "Re-Submit to {Store Name}" | [ ] |
| 8.2.3 | Dialog subtitle | Check dialog | Explains creating new submission | [ ] |
| 8.2.4 | Previous rejection shown | Check dialog | Shows previous rejection reason | [ ] |
| 8.2.5 | Instructions visible | Check dialog | Lists what needs to be provided | [ ] |
| 8.2.6 | Dialog has tabs | Check dialog | Tabs for different submission types | [ ] |
| 8.2.7 | Dialog scrollable | Long content | Dialog content scrolls | [ ] |
| 8.2.8 | Close button works | Click X | Dialog closes | [ ] |
| 8.2.9 | ESC key closes | Press ESC | Dialog closes | [ ] |
| 8.2.10 | Cancel button | Check footer | Shows "Cancel" button | [ ] |
| 8.2.11 | Submit button | Check footer | Shows "Re-Submit" button (disabled initially) | [ ] |
| 8.2.12 | Form fields pre-filled | Check form | Previous values pre-filled where possible | [ ] |
| 8.2.13 | Dialog responsive | Resize window | Dialog adapts to screen size | [ ] |
| 8.2.14 | Focus trapped | Press Tab | Focus stays in dialog | [ ] |
| 8.2.15 | Loading overlay works | During submission | Shows loading overlay | [ ] |

### Test Group 8.3: Android Resubmission Form (25 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 8.3.1 | AAB upload field visible | Check form | Shows file upload input | [ ] |
| 8.3.2 | Upload field label | Check label | "Upload New AAB File" | [ ] |
| 8.3.3 | Upload field required | Check validation | Marked as required | [ ] |
| 8.3.4 | Upload drag & drop zone | Check UI | Shows drag & drop area | [ ] |
| 8.3.5 | Click to upload | Click upload area | Opens file picker | [ ] |
| 8.3.6 | File picker filters | Check file picker | Filters to .aab files only | [ ] |
| 8.3.7 | Select AAB file | Choose .aab file | File name displays | [ ] |
| 8.3.8 | File size validation | Upload large file | Validates max size (e.g., 150MB) | [ ] |
| 8.3.9 | File type validation | Upload .apk | Shows error "Must be .aab file" | [ ] |
| 8.3.10 | File preview | After upload | Shows file name, size, icon | [ ] |
| 8.3.11 | Remove file button | After upload | Shows "X" button to remove | [ ] |
| 8.3.12 | Remove file works | Click X | Removes file, resets input | [ ] |
| 8.3.13 | Drag file over zone | Drag .aab file | Zone highlights | [ ] |
| 8.3.14 | Drop file in zone | Drop .aab file | File uploads | [ ] |
| 8.3.15 | Upload progress bar | During upload | Shows upload progress | [ ] |
| 8.3.16 | Rollout percentage field | Check form | Shows slider/input for rollout | [ ] |
| 8.3.17 | Rollout pre-filled | Check value | Pre-filled with previous value | [ ] |
| 8.3.18 | Rollout editable | Change value | Can modify rollout percentage | [ ] |
| 8.3.19 | Priority field visible | Check form | Shows in-app priority dropdown | [ ] |
| 8.3.20 | Priority pre-filled | Check value | Pre-filled with previous value | [ ] |
| 8.3.21 | Release notes field | Check form | Shows multiline text area | [ ] |
| 8.3.22 | Release notes pre-filled | Check value | Shows previous release notes | [ ] |
| 8.3.23 | Release notes editable | Edit text | Can modify release notes | [ ] |
| 8.3.24 | Form validation complete | Fill all fields | Submit button enables | [ ] |
| 8.3.25 | Submit button click | Click Submit | Sends multipart/form-data request | [ ] |

---

## Module 9: Submission History

**Location:** Distribution Management Page > "View History" link

### Setup for Module 9
```bash
# Ensure submission has multiple state changes
# Click "View History" link
```

### Test Group 9.1: History Panel Display (12 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 9.1.1 | History link visible | Check page | "View History" or "History" link displayed | [ ] |
| 9.1.2 | Click history link | Click link | Opens history panel/modal | [ ] |
| 9.1.3 | History panel title | Check panel | "Submission History" title | [ ] |
| 9.1.4 | Close button visible | Check panel | X button in corner | [ ] |
| 9.1.5 | Close button works | Click X | Panel closes | [ ] |
| 9.1.6 | Timeline view displays | Check panel | Shows vertical timeline | [ ] |
| 9.1.7 | Timeline items listed | Check panel | Lists all state changes | [ ] |
| 9.1.8 | Timeline chronological | Check order | Most recent at top | [ ] |
| 9.1.9 | Timeline scrollable | Long history | Panel scrolls | [ ] |
| 9.1.10 | Empty history message | No history | Shows "No history yet" | [ ] |
| 9.1.11 | Panel responsive | Resize window | Panel adapts to screen size | [ ] |
| 9.1.12 | Panel animation | Open/close | Smooth slide animation | [ ] |

### Test Group 9.2: Timeline Items Details (20 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 9.2.1 | Item icon displayed | Check timeline items | Each item has status icon | [ ] |
| 9.2.2 | Icon color coded | Check icons | Colors match status (green=success, red=error) | [ ] |
| 9.2.3 | Status label visible | Check items | Shows status name (e.g., "Submitted") | [ ] |
| 9.2.4 | Timestamp format | Check items | Shows "Dec 15, 2025 at 10:30 AM" | [ ] |
| 9.2.5 | Relative time shown | Recent items | Shows "2 hours ago" format | [ ] |
| 9.2.6 | Actor/user shown | Check items | Shows who performed action | [ ] |
| 9.2.7 | Actor is "Store" | For store actions | Shows "Store" or "Apple/Google" | [ ] |
| 9.2.8 | Actor is user email | For user actions | Shows user email | [ ] |
| 9.2.9 | Action description | Check items | Clear description of what happened | [ ] |
| 9.2.10 | Previous/new state | State changes | Shows "PENDING → IN_REVIEW" | [ ] |
| 9.2.11 | Rollout changes shown | Rollout updates | Shows "5% → 25%" | [ ] |
| 9.2.12 | Detailed info expandable | Complex items | Can click to expand details | [ ] |
| 9.2.13 | Expand shows metadata | Expand item | Shows full request/response data | [ ] |
| 9.2.14 | Collapse works | Click again | Collapses details | [ ] |
| 9.2.15 | Connection lines | Check timeline | Vertical lines connect items | [ ] |
| 9.2.16 | First item highlighted | Check timeline | Most recent item stands out | [ ] |
| 9.2.17 | Submission event | Check history | Shows initial submission event | [ ] |
| 9.2.18 | Approval event | If approved | Shows store approval event | [ ] |
| 9.2.19 | Rejection event | If rejected | Shows rejection with reason | [ ] |
| 9.2.20 | Halt event | If halted | Shows halt event with reason | [ ] |

---

## Module 10: Multi-Platform Management

**Location:** Distribution Management Page (with both Android & iOS submissions)

### Test Group 10.1: Simultaneous Platform Viewing (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 10.1.1 | Both tabs visible | Check page | Android and iOS tabs both present | [ ] |
| 10.1.2 | Tab badges independent | Check tabs | Each tab shows its own status | [ ] |
| 10.1.3 | Switch between tabs | Click tabs | Can switch back and forth smoothly | [ ] |
| 10.1.4 | Android state preserved | Switch to iOS, back to Android | Android state not lost | [ ] |
| 10.1.5 | iOS state preserved | Switch to Android, back to iOS | iOS state not lost | [ ] |
| 10.1.6 | Different statuses display | Check both tabs | Each platform can have different status | [ ] |
| 10.1.7 | Android at 50%, iOS at 10% | Set different rollouts | Both show correctly | [ ] |
| 10.1.8 | Update Android rollout | Update from Android tab | Only Android updates | [ ] |
| 10.1.9 | iOS tab unaffected | After Android update | iOS rollout unchanged | [ ] |
| 10.1.10 | Parallel submissions | Both LIVE | Both platforms manageable simultaneously | [ ] |
| 10.1.11 | One rejected, one live | Mixed states | Shows correct status for each | [ ] |
| 10.1.12 | Resubmit Android only | Android rejected | Can resubmit without affecting iOS | [ ] |
| 10.1.13 | Independent histories | View history | Each platform has separate history | [ ] |
| 10.1.14 | Halt one platform | Halt Android | iOS continues unaffected | [ ] |
| 10.1.15 | Tab notifications | Status changes | Badge updates to show new status | [ ] |

### Test Group 10.2: Cross-Platform Actions (13 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 10.2.1 | Submit both initially | From Submit dialog | Both platforms submit | [ ] |
| 10.2.2 | Submit only Android | Uncheck iOS | Only Android submits | [ ] |
| 10.2.3 | Submit only iOS | Uncheck Android | Only iOS submits | [ ] |
| 10.2.4 | Distribution status aggregates | Check header | Shows overall distribution status | [ ] |
| 10.2.5 | PARTIALLY_SUBMITTED | One submitted | Status shows "PARTIALLY_SUBMITTED" | [ ] |
| 10.2.6 | SUBMITTED | Both submitted | Status shows "SUBMITTED" | [ ] |
| 10.2.7 | PARTIALLY_RELEASED | One LIVE | Status shows "PARTIALLY_RELEASED" | [ ] |
| 10.2.8 | RELEASED | Both at 100% | Status shows "RELEASED" | [ ] |
| 10.2.9 | Refresh updates both | Click refresh | Both platforms reload data | [ ] |
| 10.2.10 | Error in one platform | Android fails | iOS continues working | [ ] |
| 10.2.11 | Success toast specific | Update Android | Toast says "Android rollout updated" | [ ] |
| 10.2.12 | Overall progress indicator | Check page | Shows combined progress (e.g., "1 of 2 platforms at 100%") | [ ] |
| 10.2.13 | Platform comparison view | Check UI | Shows side-by-side summary | [ ] |

### Test Group 10.3: Platform-Specific Differences (13 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 10.3.1 | Android shows AAB link | Android tab | "Download AAB" or "Internal Testing" link | [ ] |
| 10.3.2 | iOS shows TestFlight | iOS tab | TestFlight build number displayed | [ ] |
| 10.3.3 | Android rollout slider | Android tab | Shows 1-100% slider | [ ] |
| 10.3.4 | iOS phased schedule | iOS tab | Shows 7-day schedule if phased | [ ] |
| 10.3.5 | Android no pause button | Android tab | No pause button (not supported) | [ ] |
| 10.3.6 | iOS has pause button | iOS tab (phased) | Pause button visible | [ ] |
| 10.3.7 | Android in-app priority | Android tab | Shows priority 0-5 | [ ] |
| 10.3.8 | iOS no priority field | iOS tab | No in-app priority shown | [ ] |
| 10.3.9 | Android can halt anytime | Android tab | Halt button always enabled | [ ] |
| 10.3.10 | iOS halt anytime | iOS tab | Halt button always enabled | [ ] |
| 10.3.11 | Android decimal rollout | Android tab | Can set 27.3% | [ ] |
| 10.3.12 | iOS automatic percentages | iOS tab (phased) | Shows Apple's automatic percentages | [ ] |
| 10.3.13 | Platform icons correct | Both tabs | Android robot, iOS apple icons | [ ] |

---

## Module 11: Error Handling

**Location:** Throughout all pages/dialogs

### Test Group 11.1: Network Errors (18 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 11.1.1 | API server down | Stop mock server + navigate | Shows error state/message | [ ] |
| 11.1.2 | Error message clear | Check error | "Failed to load distributions" message | [ ] |
| 11.1.3 | Error icon displayed | Check error | Shows error icon/illustration | [ ] |
| 11.1.4 | Retry button visible | Check error state | Shows "Retry" or "Refresh" button | [ ] |
| 11.1.5 | Retry button works | Click Retry | Attempts to reload data | [ ] |
| 11.1.6 | Timeout error | Simulate slow API | Shows timeout message after wait | [ ] |
| 11.1.7 | Timeout message | Check error | "Request timed out. Please try again." | [ ] |
| 11.1.8 | Network console errors | Check console | No unhandled promise rejections | [ ] |
| 11.1.9 | Graceful degradation | Partial failure | Shows what loaded, error for rest | [ ] |
| 11.1.10 | Error toast appears | API error during action | Shows error toast notification | [ ] |
| 11.1.11 | Toast auto-dismisses | Wait 5 seconds | Toast disappears automatically | [ ] |
| 11.1.12 | Toast manually closable | Click X on toast | Toast closes immediately | [ ] |
| 11.1.13 | Multiple error toasts | Multiple errors | Toasts stack properly | [ ] |
| 11.1.14 | Error doesn't block UI | API error | Rest of UI remains functional | [ ] |
| 11.1.15 | Loading state ends | After error | Loading spinners disappear | [ ] |
| 11.1.16 | Buttons re-enable | After error | Action buttons become enabled again | [ ] |
| 11.1.17 | Error logs to console | Any error | Error details logged to console | [ ] |
| 11.1.18 | Error tracking | Check implementation | Errors sent to monitoring (if configured) | [ ] |

### Test Group 11.2: Validation Errors (25 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 11.2.1 | Empty release notes | Submit without notes | Shows validation error | [ ] |
| 11.2.2 | Error message red | Check error | Red text or border | [ ] |
| 11.2.3 | Error message inline | Check position | Error shows below field | [ ] |
| 11.2.4 | Error icon | Check error | Shows warning/error icon | [ ] |
| 11.2.5 | Error text specific | Check message | Says "Release notes are required" | [ ] |
| 11.2.6 | Focus on error field | Validation fails | Focus moves to first error field | [ ] |
| 11.2.7 | Submit button disabled | Validation errors | Cannot submit with errors | [ ] |
| 11.2.8 | Error clears on fix | Type release notes | Error message disappears | [ ] |
| 11.2.9 | Real-time validation | Type then clear | Error appears immediately | [ ] |
| 11.2.10 | Multiple errors shown | Multiple invalid fields | All errors shown at once | [ ] |
| 11.2.11 | Error summary | Multiple errors | Shows count "3 errors found" | [ ] |
| 11.2.12 | Rollout < 1% | Set Android rollout to 0 | Shows "Minimum 1%" error | [ ] |
| 11.2.13 | Rollout > 100% | Try to set 101% | Cannot set above 100% | [ ] |
| 11.2.14 | Invalid file type | Upload .txt file | Shows "Must be .aab file" | [ ] |
| 11.2.15 | File too large | Upload 200MB file | Shows "Maximum 150MB" error | [ ] |
| 11.2.16 | Invalid percentage format | Type "abc" | Shows "Must be a number" | [ ] |
| 11.2.17 | Negative percentage | Try -5% | Shows "Cannot be negative" | [ ] |
| 11.2.18 | Decimal validation | Android 5.567% | Validates decimal places | [ ] |
| 11.2.19 | Empty halt reason | Try halt without reason | Shows "Reason required" | [ ] |
| 11.2.20 | Reason too short | Type "a" | Shows "Minimum 10 characters" | [ ] |
| 11.2.21 | Special characters | Type symbols | Validates allowed characters | [ ] |
| 11.2.22 | Required field indicator | Check form fields | Required fields marked with * | [ ] |
| 11.2.23 | Error persists on tab switch | Error in Android, switch tabs | Error still there when return | [ ] |
| 11.2.24 | Accessibility | Screen reader | Error announced to screen reader | [ ] |
| 11.2.25 | Form dirty state | Made changes | Shows "Unsaved changes" warning if navigate away | [ ] |

### Test Group 11.2B: Platform Parameter Validation (8 tests)

**Purpose:** Verify all submission-specific API calls include required platform query parameter

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 11.2B.1 | Submit without platform | Call PUT /submissions/:id/submit (no platform param) | Returns 400 "Platform query parameter is required" | [ ] |
| 11.2B.2 | Submit with invalid platform | Call with ?platform=INVALID | Returns 400 "must be either ANDROID or IOS" | [ ] |
| 11.2B.3 | Rollout without platform | Call PATCH /submissions/:id/rollout (no platform) | Returns 400 "Platform query parameter is required" | [ ] |
| 11.2B.4 | Cancel without platform | Call PATCH /submissions/:id/cancel (no platform) | Returns 400 "Platform query parameter is required" | [ ] |
| 11.2B.5 | Pause with Android platform | Call PATCH /submissions/:id/rollout/pause?platform=ANDROID | Returns 400 "Android does not support pause/resume" | [ ] |
| 11.2B.6 | Resume with Android platform | Call PATCH /submissions/:id/rollout/resume?platform=ANDROID | Returns 400 "Android does not support pause/resume" | [ ] |
| 11.2B.7 | Halt without platform | Call PATCH /submissions/:id/rollout/halt (no platform) | Returns 400 "Platform query parameter is required" | [ ] |
| 11.2B.8 | Get submission without platform | Call GET /submissions/:id (no platform) | Returns 400 "Platform query parameter is required" | [ ] |

### Test Group 11.3: API Error Responses (20 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 11.3.1 | 400 Bad Request | Send invalid data | Shows error message from API | [ ] |
| 11.3.2 | 401 Unauthorized | Token expired | Redirects to login | [ ] |
| 11.3.3 | 403 Forbidden | No permission | Shows "Access denied" message | [ ] |
| 11.3.4 | 404 Not Found | Invalid distribution ID | Shows "Distribution not found" | [ ] |
| 11.3.5 | 409 Conflict | Concurrent update | Shows "Conflict. Please refresh and try again" | [ ] |
| 11.3.6 | 422 Validation Error | Invalid rollout value | Shows specific validation error | [ ] |
| 11.3.7 | 429 Rate Limit | Too many requests | Shows "Too many requests. Please wait." | [ ] |
| 11.3.8 | 500 Server Error | Server fails | Shows "Server error. Please try again." | [ ] |
| 11.3.9 | 503 Service Unavailable | Service down | Shows "Service temporarily unavailable" | [ ] |
| 11.3.10 | Error code displayed | Any error | Shows error code (e.g., "Error: INVALID_ROLLOUT") | [ ] |
| 11.3.11 | Error details expandable | Click "Details" | Shows full error response | [ ] |
| 11.3.12 | Error message from API | API returns message | Shows API's error message | [ ] |
| 11.3.13 | Fallback error message | No API message | Shows generic fallback message | [ ] |
| 11.3.14 | Duplicate submission | Submit twice | Shows "Already submitted" error | [ ] |
| 11.3.15 | Cannot decrease rollout | Try to decrease % | Shows "Rollout can only increase" error | [ ] |
| 11.3.16 | Cannot pause Android | Try to pause Android | Shows "Pause not supported for Android" | [ ] |
| 11.3.17 | Cannot edit HALTED | Try to update halted submission | Shows "Cannot modify halted submission" | [ ] |
| 11.3.18 | State transition error | Invalid state change | Shows "Invalid state transition" | [ ] |
| 11.3.19 | Error doesn't crash app | Any error | App remains functional | [ ] |
| 11.3.20 | Error recovery guidance | After error | Shows suggestion on how to proceed | [ ] |

---

## Module 12: Field Validation

**Location:** All forms throughout the module

### Test Group 12.1: Release Notes Validation (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 12.1.1 | Release notes required | Leave empty + submit | Shows "Required field" error | [ ] |
| 12.1.2 | Minimum length | Type 5 characters | Shows "Minimum 10 characters" error | [ ] |
| 12.1.3 | Maximum length | Type 5001 characters | Shows "Maximum 5000 characters" error | [ ] |
| 12.1.4 | Character counter | Type text | Shows "50 / 5000 characters" | [ ] |
| 12.1.5 | Counter updates | Type more | Counter increments in real-time | [ ] |
| 12.1.6 | Counter color warning | Near limit (4900+) | Counter turns orange/red | [ ] |
| 12.1.7 | Line breaks allowed | Press Enter | Allows multiline text | [ ] |
| 12.1.8 | Special characters | Type emojis, symbols | Allows unicode characters | [ ] |
| 12.1.9 | Leading/trailing spaces | Type with spaces | Trims spaces on submit | [ ] |
| 12.1.10 | HTML not allowed | Type <script> | Sanitizes HTML tags | [ ] |
| 12.1.11 | Markdown supported | Type **bold** | Shows preview with markdown formatting | [ ] |
| 12.1.12 | URL detection | Type URL | Auto-links URLs in preview | [ ] |
| 12.1.13 | Paste large text | Paste 10k chars | Truncates to 5000 | [ ] |
| 12.1.14 | Copy formatting preserved | Copy/paste formatted | Preserves line breaks | [ ] |
| 12.1.15 | Field resizable | Drag field corner | Text area expands | [ ] |

### Test Group 12.2: Rollout Percentage Validation (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 12.2.1 | Min value 1% | Set to 0% | Shows "Minimum 1%" or prevents setting | [ ] |
| 12.2.2 | Max value 100% | Try 101% | Cannot exceed 100% | [ ] |
| 12.2.3 | Decimal support Android | Set 5.5% | Accepts decimal value | [ ] |
| 12.2.4 | Decimal precision | Set 5.567% | Validates max 1 decimal place | [ ] |
| 12.2.5 | Integer iOS phased | Check iOS values | Shows whole numbers only | [ ] |
| 12.2.6 | Cannot decrease | Current 50%, try 25% | Shows error or prevents | [ ] |
| 12.2.7 | Must be greater | Current 5%, try 5% | Shows "Must increase" error | [ ] |
| 12.2.8 | Type in field | Manual input | Accepts typed number | [ ] |
| 12.2.9 | Invalid characters | Type "abc" | Shows error or prevents | [ ] |
| 12.2.10 | Negative number | Type -5 | Shows error or prevents | [ ] |
| 12.2.11 | Leading zeros | Type 05 | Normalizes to 5 | [ ] |
| 12.2.12 | Very small decimal | Type 0.1 | Rounds to 1% (minimum) | [ ] |
| 12.2.13 | Copy/paste value | Paste "75" | Accepts pasted value | [ ] |
| 12.2.14 | Empty field | Clear field | Shows "Required" error | [ ] |
| 12.2.15 | Percentage symbol | Type "50%" | Strips % symbol, accepts 50 | [ ] |

### Test Group 12.3: File Upload Validation (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 12.3.1 | File required | Submit without file | Shows "File required" error | [ ] |
| 12.3.2 | .aab files only | Upload .apk | Shows "Must be .aab file" error | [ ] |
| 12.3.3 | File extension check | Upload .zip | Rejects non-.aab files | [ ] |
| 12.3.4 | File size limit | Upload 200MB file | Shows "Maximum 150MB" error | [ ] |
| 12.3.5 | File size display | Upload 50MB | Shows "50 MB" in file info | [ ] |
| 12.3.6 | Invalid file format | Upload corrupt .aab | Shows "Invalid file format" error | [ ] |
| 12.3.7 | Drag & drop validation | Drag .txt file | Rejects on drop | [ ] |
| 12.3.8 | Multiple files | Drop 2 files | Shows "Select only one file" error | [ ] |
| 12.3.9 | File preview | Upload valid .aab | Shows file name and size | [ ] |
| 12.3.10 | Remove file | Click remove button | Clears file, resets validation | [ ] |
| 12.3.11 | Re-upload same file | Upload, remove, upload again | Accepts file again | [ ] |
| 12.3.12 | Upload progress | Upload large file | Shows progress bar 0-100% | [ ] |
| 12.3.13 | Upload cancel | Click cancel during upload | Cancels upload | [ ] |
| 12.3.14 | Upload error handling | Network fails during upload | Shows error, allows retry | [ ] |
| 12.3.15 | File name sanitization | File with special chars | Sanitizes file name | [ ] |

### Test Group 12.4: Halt Reason Validation (13 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 12.4.1 | Reason required | Try halt without reason | Shows "Reason required" error | [ ] |
| 12.4.2 | Minimum length | Type 5 characters | Shows "Minimum 10 characters" error | [ ] |
| 12.4.3 | Maximum length | Type 1001 characters | Shows "Maximum 1000 characters" error | [ ] |
| 12.4.4 | Character counter | Type text | Shows character count | [ ] |
| 12.4.5 | Whitespace only | Type only spaces | Shows "Cannot be only spaces" error | [ ] |
| 12.4.6 | Special characters allowed | Type !@#$%^ | Allows special characters | [ ] |
| 12.4.7 | Multiline allowed | Press Enter | Allows line breaks | [ ] |
| 12.4.8 | Markdown not processed | Type **bold** | Shows as plain text (no formatting) | [ ] |
| 12.4.9 | HTML sanitized | Type <script> | Sanitizes HTML | [ ] |
| 12.4.10 | URLs allowed | Type URL | Allows URLs in reason | [ ] |
| 12.4.11 | Emojis allowed | Type 😊 | Allows emoji characters | [ ] |
| 12.4.12 | Leading/trailing spaces | Type with spaces | Trims spaces on submit | [ ] |
| 12.4.13 | Paste long text | Paste 2000 chars | Truncates to 1000 | [ ] |

---

## Module 13: Visual & UX

**Location:** All pages/components

### Test Group 13.1: Loading States (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 13.1.1 | Page initial load | Navigate to page | Shows skeleton loaders | [ ] |
| 13.1.2 | Skeleton shape matches | Check skeletons | Skeleton matches final content shape | [ ] |
| 13.1.3 | Skeleton animation | Watch skeletons | Smooth shimmer/pulse animation | [ ] |
| 13.1.4 | Button loading state | Click action button | Button shows spinner | [ ] |
| 13.1.5 | Button text changes | During loading | Text changes to "Updating..." | [ ] |
| 13.1.6 | Button disabled while loading | Try click again | Button is disabled | [ ] |
| 13.1.7 | Spinner centered | Check button | Spinner centered in button | [ ] |
| 13.1.8 | Loading overlay dialog | During form submit | Shows overlay on dialog | [ ] |
| 13.1.9 | Progress bar accurate | File upload | Progress bar matches actual progress | [ ] |
| 13.1.10 | Loading doesn't block UI | Background loading | Can still interact with other elements | [ ] |
| 13.1.11 | Multiple loading states | Load + action | Can show page + button loading simultaneously | [ ] |
| 13.1.12 | Loading timeout | Wait 30s | Shows timeout message | [ ] |
| 13.1.13 | Loading cancellable | Long operation | Shows cancel button | [ ] |
| 13.1.14 | Cancel works | Click cancel | Cancels operation | [ ] |
| 13.1.15 | Smooth transition | Load complete | Smooth fade from skeleton to content | [ ] |

### Test Group 13.2: Responsive Design (20 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 13.2.1 | Desktop layout (1920x1080) | Set viewport | Layout optimal for desktop | [ ] |
| 13.2.2 | Laptop layout (1366x768) | Set viewport | Layout adapts properly | [ ] |
| 13.2.3 | Tablet landscape (1024x768) | Set viewport | Layout works on tablet | [ ] |
| 13.2.4 | Tablet portrait (768x1024) | Set viewport | Layout adapts to portrait | [ ] |
| 13.2.5 | Mobile landscape (812x375) | Set viewport | Layout works in landscape | [ ] |
| 13.2.6 | Mobile portrait (375x812) | Set viewport | Layout works in portrait | [ ] |
| 13.2.7 | Small mobile (320x568) | Set viewport | Layout works on small screens | [ ] |
| 13.2.8 | Navigation responsive | Mobile | Navigation collapses to hamburger | [ ] |
| 13.2.9 | Tables responsive | Mobile | Tables scroll horizontally | [ ] |
| 13.2.10 | Dialogs responsive | Mobile | Dialogs fullscreen on mobile | [ ] |
| 13.2.11 | Forms responsive | Mobile | Form inputs stack vertically | [ ] |
| 13.2.12 | Buttons responsive | Mobile | Buttons full-width on mobile | [ ] |
| 13.2.13 | Text readable | Mobile | Font sizes appropriate | [ ] |
| 13.2.14 | Touch targets 44px+ | Mobile | Buttons large enough to tap | [ ] |
| 13.2.15 | No horizontal scroll | All sizes | No unwanted horizontal scrolling | [ ] |
| 13.2.16 | Images scale | Resize | Images scale proportionally | [ ] |
| 13.2.17 | Platform tabs mobile | Mobile | Tabs usable on mobile | [ ] |
| 13.2.18 | Slider usable mobile | Mobile | Can drag slider on touch | [ ] |
| 13.2.19 | Orientation change | Rotate device | Layout adapts smoothly | [ ] |
| 13.2.20 | Zoom preserves layout | Zoom 200% | Layout doesn't break | [ ] |

### Test Group 13.3: Accessibility (20 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 13.3.1 | Keyboard navigation | Tab through page | All interactive elements reachable | [ ] |
| 13.3.2 | Focus indicators | Tab around | Clear focus indicators on all elements | [ ] |
| 13.3.3 | Focus order logical | Tab through | Focus moves in logical order | [ ] |
| 13.3.4 | Skip to content | Tab first | Shows "Skip to content" link | [ ] |
| 13.3.5 | ARIA labels | Check code | Buttons have aria-labels | [ ] |
| 13.3.6 | ARIA roles | Check code | Proper ARIA roles on elements | [ ] |
| 13.3.7 | Screen reader support | Use screen reader | Announces all content properly | [ ] |
| 13.3.8 | Alt text images | Check images | All images have alt text | [ ] |
| 13.3.9 | Form labels | Check forms | All inputs have labels | [ ] |
| 13.3.10 | Error announcements | Validation error | Errors announced to screen reader | [ ] |
| 13.3.11 | Status messages | Success/error | Status changes announced | [ ] |
| 13.3.12 | Live regions | Dynamic content | Live regions used for updates | [ ] |
| 13.3.13 | Color contrast | Check colors | Text meets WCAG AA contrast ratio | [ ] |
| 13.3.14 | Color not sole indicator | Check status | Status shown with text + color | [ ] |
| 13.3.15 | Heading hierarchy | Check headings | Proper H1, H2, H3 structure | [ ] |
| 13.3.16 | Landmark regions | Check code | Header, main, nav landmarks present | [ ] |
| 13.3.17 | Button semantics | Check code | Buttons use <button> element | [ ] |
| 13.3.18 | Link semantics | Check code | Links use <a> element | [ ] |
| 13.3.19 | ESC closes modals | Press ESC | All modals close | [ ] |
| 13.3.20 | Focus trap modals | Open modal + Tab | Focus trapped in modal | [ ] |

### Test Group 13.4: Visual Consistency (17 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 13.4.1 | Color scheme consistent | Check all pages | Same colors throughout | [ ] |
| 13.4.2 | Font family consistent | Check text | Same fonts throughout | [ ] |
| 13.4.3 | Font sizes consistent | Check headings | Consistent heading sizes | [ ] |
| 13.4.4 | Button styles consistent | Check buttons | Primary buttons look same everywhere | [ ] |
| 13.4.5 | Status badge colors | Check badges | Same colors for same statuses | [ ] |
| 13.4.6 | Icons consistent | Check icons | Same icon set throughout | [ ] |
| 13.4.7 | Spacing consistent | Check layout | Consistent padding/margins | [ ] |
| 13.4.8 | Border radius consistent | Check cards | Same border radius everywhere | [ ] |
| 13.4.9 | Shadow consistent | Check cards | Same shadow style everywhere | [ ] |
| 13.4.10 | Input style consistent | Check forms | All inputs styled same | [ ] |
| 13.4.11 | Error state consistent | Check errors | Same red color for all errors | [ ] |
| 13.4.12 | Success state consistent | Check success | Same green color for success | [ ] |
| 13.4.13 | Disabled state consistent | Check disabled | Same gray for disabled elements | [ ] |
| 13.4.14 | Loading state consistent | Check loaders | Same spinner/skeleton style | [ ] |
| 13.4.15 | Toast notifications | Check toasts | Same style for all toasts | [ ] |
| 13.4.16 | Modal style consistent | Check dialogs | All modals styled same | [ ] |
| 13.4.17 | Typography hierarchy | Check text | Clear visual hierarchy | [ ] |

---

## Module 14: State Transitions

**Location:** Throughout distribution flow

### Test Group 14.1: Submission Status Transitions (30 tests)

**Android Status Transitions:**

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 14.1.A1 | PENDING → SUBMITTED | Submit to Play Store | Status changes to SUBMITTED | [ ] |
| 14.1.A2 | SUBMITTED → IN_PROGRESS | Store approves | Status changes to IN_PROGRESS | [ ] |
| 14.1.A3 | IN_PROGRESS stays IN_PROGRESS | Increase rollout | Status remains IN_PROGRESS | [ ] |
| 14.1.A4 | IN_PROGRESS → HALTED | Pause rollout | Status changes to HALTED (displays "Rollout Paused") | [ ] |
| 14.1.A5 | HALTED → IN_PROGRESS | Resume rollout | Status changes back to IN_PROGRESS | [ ] |
| 14.1.A6 | IN_PROGRESS → COMPLETED | Rollout to 100% | Status changes to COMPLETED | [ ] |
| 14.1.A7 | COMPLETED is final | After completion | Cannot change from COMPLETED | [ ] |
| 14.1.A8 | SUBMITTED → USER_ACTION_PENDING | After 5 days (simulated) | Status changes to USER_ACTION_PENDING | [ ] |
| 14.1.A9 | USER_ACTION_PENDING allows resubmit | Click resubmit | Can create new submission | [ ] |
| 14.1.A10 | USER_ACTION_PENDING → SUSPENDED | After 10 more days (simulated) | Status changes to SUSPENDED | [ ] |
| 14.1.A11 | SUSPENDED is terminal | After suspension | Cannot perform any actions | [ ] |
| 14.1.A12 | New submission after resubmit | After resubmit from USER_ACTION_PENDING | Old marked SUSPENDED, new is SUBMITTED | [ ] |
| 14.1.A13 | Cannot cancel Android | Check actions | No Cancel button for Android | [ ] |

**iOS Status Transitions:**

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 14.1.I1 | PENDING → IN_REVIEW | Submit to App Store | Status changes to IN_REVIEW | [ ] |
| 14.1.I2 | IN_REVIEW → APPROVED | Apple approves | Status changes to APPROVED | [ ] |
| 14.1.I3 | APPROVED → LIVE | Release approved | Status changes to LIVE | [ ] |
| 14.1.I4 | LIVE stays LIVE | Increase rollout | Status remains LIVE | [ ] |
| 14.1.I5 | LIVE → PAUSED (phased) | Pause phased release | Status changes to PAUSED (displays "Rollout Paused") | [ ] |
| 14.1.I6 | PAUSED → LIVE (phased) | Resume phased release | Status changes back to LIVE | [ ] |
| 14.1.I7 | IN_REVIEW → REJECTED | Apple rejects | Status changes to REJECTED | [ ] |
| 14.1.I8 | IN_REVIEW → CANCELLED | Cancel submission | Status changes to CANCELLED | [ ] |
| 14.1.I9 | REJECTED allows resubmit | After rejection | Can create new submission | [ ] |
| 14.1.I10 | CANCELLED allows resubmit | After cancellation | Can create new submission | [ ] |
| 14.1.I11 | New submission after resubmit | After resubmit | Old marked inactive, new is IN_REVIEW | [ ] |

**Common Tests:**

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 14.1.C1 | Cannot go back | Any forward transition | Cannot revert to previous states | [ ] |
| 14.1.C2 | Badge color updates | Status changes | Badge color matches new status | [ ] |
| 14.1.C3 | Status history logs | Each transition | History records all transitions | [ ] |
| 14.1.C4 | Timestamp updates | Status changes | statusUpdatedAt updates | [ ] |
| 14.1.C5 | Actor recorded | User action | submittedBy records user email | [ ] |
| 14.1.C6 | Store action | Store approval | Actor shows "Store" or "System" | [ ] |

### Test Group 14.2: Distribution Status Transitions (15 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 14.2.1 | Initial: PENDING | After pre-release | Distribution status is PENDING | [ ] |
| 14.2.2 | PENDING → PARTIALLY_SUBMITTED | Submit Android only | Status changes | [ ] |
| 14.2.3 | PARTIALLY_SUBMITTED → SUBMITTED | Submit iOS too | Status changes | [ ] |
| 14.2.4 | SUBMITTED → PARTIALLY_RELEASED | Android goes LIVE | Status changes | [ ] |
| 14.2.5 | PARTIALLY_RELEASED → RELEASED | Both at 100% | Status changes | [ ] |
| 14.2.6 | Status in header | Check page header | Header badge matches status | [ ] |
| 14.2.7 | Status in list | Check list page | List item shows correct status | [ ] |
| 14.2.8 | Status color coded | Check badges | Colors match status type | [ ] |
| 14.2.9 | Overall progress | Check indicator | Shows "2/2 platforms submitted" | [ ] |
| 14.2.10 | Rollout aggregate | Check progress | Shows combined rollout (e.g., "75% average") | [ ] |
| 14.2.11 | One HALTED | Halt one platform | Distribution status reflects issue | [ ] |
| 14.2.12 | One REJECTED | One rejected | Distribution shows mixed state | [ ] |
| 14.2.13 | Both REJECTED | Both rejected | Distribution shows error state | [ ] |
| 14.2.14 | Can resubmit after reject | Fix and resubmit | New submission updates status | [ ] |
| 14.2.15 | History tracks dist status | Check history | Distribution status changes logged | [ ] |

### Test Group 14.3: UI State Management (10 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 14.3.1 | Form dirty state | Edit field | Form marked as dirty | [ ] |
| 14.3.2 | Unsaved warning | Navigate away | Shows "Unsaved changes" warning | [ ] |
| 14.3.3 | Stay on page | Click Stay | Remains on page | [ ] |
| 14.3.4 | Leave without saving | Click Leave | Navigates away, changes lost | [ ] |
| 14.3.5 | Save clears dirty | Submit form | Dirty state cleared | [ ] |
| 14.3.6 | Tab state preserved | Switch tabs | Previous tab state preserved | [ ] |
| 14.3.7 | Scroll position preserved | Scroll, navigate back | Scroll position restored | [ ] |
| 14.3.8 | Filter state preserved | Filter list, navigate back | Filters still applied | [ ] |
| 14.3.9 | Expanded state | Expand item, navigate back | Expansion state preserved | [ ] |
| 14.3.10 | Loading state ends | After any action | Loading indicators cleared | [ ] |

---

## Bug Tracking Template

### Bug Report Format

Use this template to report any issues found during testing:

```markdown
## Bug #XXX: [Brief Title]

**Module:** [e.g., Module 4: Submit To Stores Dialog]
**Test ID:** [e.g., 4.3.7]
**Severity:** [Critical / High / Medium / Low]
**Priority:** [P0 / P1 / P2 / P3]

### Description
[Clear description of the bug]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Screenshots/Videos
[Attach screenshots or videos]

### Environment
- Browser: [Chrome 120]
- OS: [macOS 14.1]
- Screen Size: [1920x1080]
- Mock Server: [Running/Stopped]

### Console Errors
```
[Paste console errors if any]
```

### Network Logs
- Request: [URL, method, payload]
- Response: [Status code, response body]

### Additional Notes
[Any other relevant information]

### Suggested Fix
[If known]
```

---

## Testing Completion Checklist

Use this at the end of testing:

```
COMPREHENSIVE TESTING COMPLETE

[ ] Module 1: Release Page - Distribution Tab (45 tests)
[ ] Module 2: Distributions List Page (38 tests)
[ ] Module 3: Distribution Management Page (52 tests)
[ ] Module 4: Submit To Stores Dialog (67 tests)
[ ] Module 5: Android Rollout Controls (48 tests)
[ ] Module 6: iOS Phased Release Controls (42 tests)
[ ] Module 7: iOS Manual Release Controls (28 tests)
[ ] Module 8: Resubmission Flow (55 tests)
[ ] Module 9: Submission History (32 tests)
[ ] Module 10: Multi-Platform Management (41 tests)
[ ] Module 11: Error Handling (63 tests)
[ ] Module 12: Field Validation (58 tests)
[ ] Module 13: Visual & UX (72 tests)
[ ] Module 14: State Transitions (45 tests)

TOTAL: 686 test cases

Pass Rate: _____ / 686 (_____%)

Bugs Found: _____
- Critical: _____
- High: _____
- Medium: _____
- Low: _____

Ready for Production: [ ] YES [ ] NO

Tested By: _______________
Date: _______________
Signature: _______________
```

---

## 🎉 Testing Complete!

This exhaustive testing plan covers **686 individual test cases** across **14 modules**, ensuring every UI element, interaction, validation, error case, and state transition is thoroughly tested.

**Happy Testing!** 🚀
