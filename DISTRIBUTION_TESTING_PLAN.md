# Distribution Testing Plan
**Focus**: Distribution Step + Distribution Management (Standalone)  
**Out of Scope**: Pre-Release (being handled by teammate)  
**Date**: December 12, 2025

---

## 🎯 What We're Testing

### ✅ IN SCOPE (Our Work)
1. **Distribution Step** - Last step in release process
   - Submit to Stores dialog
   - Distribution status monitoring (read-only)
   - Link to full management

2. **Distribution Management** - Standalone sidebar module
   - Distributions list page
   - Full management page (rollout controls)
   - All rollout actions (update, pause, resume, halt)
   - Submission history
   - Re-submission after rejection

### ❌ OUT OF SCOPE (Teammate's Work)
- Pre-Release tab
- Build uploads (Android AAB)
- TestFlight verification (iOS)
- PM approval
- Extra commits warning

---

## 🚀 Quick Start: Running the App

### Option 1: With Mock Server (Recommended for Testing)
```bash
cd /Users/princetripathi/workspace/delivr/delivr-web-panel-managed
npm run dev:with-mock
```

This starts:
- Frontend dev server on `http://localhost:3000`
- Mock backend server on `http://localhost:3001`

### Option 2: With Real Backend
```bash
npm run dev
```

---

## 🧪 Test Scenarios

### **Scenario 1: Distribution Step in Release Process**

#### Setup
1. Navigate to: `http://localhost:3000/dashboard/[org]/releases`
2. Click on any release
3. Navigate to distribution step (depends on teammate's stepper implementation)

#### Test Cases

**TC-1.1: Submit to Stores Dialog Opens**
- **Action**: Click "Submit to Stores" button
- **Expected**: Dialog opens with platform checkboxes

**TC-1.2: Submit Android Only**
- **Action**: 
  1. Select Android checkbox
  2. Fill in:
     - Track: Production
     - Initial Rollout: 5%
     - Priority: 5
     - Release Notes: "Bug fixes and improvements"
  3. Click "Submit"
- **Expected**:
  - Dialog closes
  - Status card appears for Android
  - Shows "IN_REVIEW" or "LIVE" status
  - Shows 5% rollout

**TC-1.3: Submit iOS Only**
- **Action**:
  1. Select iOS checkbox
  2. Fill in:
     - Release Type: After Approval
     - Phased Release: Yes
     - What's New: "Performance improvements"
  3. Click "Submit"
- **Expected**:
  - Dialog closes
  - Status card appears for iOS
  - Shows "IN_REVIEW" status
  - Shows 0% rollout (phased controlled by Apple)

**TC-1.4: Submit Both Platforms**
- **Action**: Select both Android + iOS, fill options, submit
- **Expected**: Both status cards appear

**TC-1.5: Version Conflict Handling**
- **Action**: Try to submit version that already exists in store
- **Expected**: Version conflict dialog appears with options

**TC-1.6: Active Rollout Prevention**
- **Action**: Try to submit Android when there's already an active rollout (0-99%)
- **Expected**: Warning dialog prevents submission

**TC-1.7: Navigate to Full Management**
- **Action**: Click "Open in Distribution Management" link
- **Expected**: Navigates to `/dashboard/[org]/distributions/[releaseId]`

**TC-1.8: Manual Status Refresh**
- **Action**: Click refresh button
- **Expected**: Status cards update with latest data

---

### **Scenario 2: Distribution Management List**

#### Setup
1. Navigate to: `http://localhost:3000/dashboard/[org]/distributions`

#### Test Cases

**TC-2.1: List Loads Successfully**
- **Expected**:
  - Shows all releases in distribution phase
  - Displays version, status, progress for each
  - Shows platform-specific progress (Android X%, iOS Y%)

**TC-2.2: Status Filtering**
- **Action**: Click status filter tabs (In Progress, Needs Action, Completed)
- **Expected**: List filters correctly

**TC-2.3: Navigate to Management**
- **Action**: Click on a distribution row
- **Expected**: Navigates to `/dashboard/[org]/distributions/[releaseId]`

---

### **Scenario 3: Distribution Management (Full Control)**

#### Setup
1. Navigate to: `http://localhost:3000/dashboard/[org]/distributions/[releaseId]`

#### Test Cases

**TC-3.1: Page Loads Successfully**
- **Expected**:
  - Shows release version in header
  - Shows platform tabs (Android, iOS)
  - Shows breadcrumbs navigation
  - Shows current submission status

**TC-3.2: Platform Tab Switching**
- **Action**: Switch between Android and iOS tabs
- **Expected**: 
  - Tab content updates
  - Shows platform-specific submission
  - Shows platform-specific controls

**TC-3.3: Rollout Update (Slider)**
- **Action**:
  1. Move slider from current % (e.g., 5%) to higher % (e.g., 25%)
  2. Click "Update Rollout"
- **Expected**:
  - Loading state shown
  - Success message displayed
  - Progress bar updates to 25%
  - History event added

**TC-3.4: Rollout Update (Preset Buttons)**
- **Action**: Click preset button (e.g., "50%")
- **Expected**:
  - Slider updates to 50%
  - "Update Rollout" button becomes enabled
  - Clicking it applies the change

**TC-3.5: Rollout Validation**
- **Action**: Try to decrease rollout percentage (e.g., from 25% to 10%)
- **Expected**: Error message (rollout can only increase)

**TC-3.6: Complete Rollout (100%)**
- **Action**: Update rollout to 100%
- **Expected**:
  - Rollout completes
  - Status changes to "COMPLETED"
  - Controls disable (no more actions available)
  - Congratulations message shown

**TC-3.7: Pause Rollout**
- **Action**:
  1. Click "Pause Rollout" button
  2. Enter reason (optional): "Monitoring for issues"
  3. Click "Pause"
- **Expected**:
  - Status changes to "PAUSED"
  - Rollout controls disable
  - "Resume" button appears
  - History event added

**TC-3.8: Resume Rollout**
- **Action**:
  1. Click "Resume Rollout" button
  2. Enter reason (optional): "All clear"
  3. Click "Resume"
- **Expected**:
  - Status changes back to "LIVE"
  - Rollout controls re-enable
  - History event added

**TC-3.9: Emergency Halt**
- **Action**:
  1. Click "Emergency Halt" button
  2. Select severity: CRITICAL
  3. Enter reason: "Critical crash detected"
  4. Click "Halt Rollout"
- **Expected**:
  - Status changes to "HALTED"
  - All controls disable
  - Red alert shown
  - History event added with severity

**TC-3.10: Submission History**
- **Action**: Scroll to history section
- **Expected**:
  - Shows timeline of all events
  - Each event shows:
    - Timestamp
    - Event type (submitted, rollout updated, paused, etc.)
    - Actor (who performed action)
    - Reason (if provided)
    - Previous/new state changes

**TC-3.11: History Pagination**
- **Action**: Click "Load More" in history (if more than 20 events)
- **Expected**: Loads next page of events

**TC-3.12: Rejected Submission View**
- **Setup**: Need a submission with status "REJECTED"
- **Expected**:
  - Shows rejection details
  - Shows rejection reason from store
  - Shows "Retry Submission" button

**TC-3.13: Re-Submit After Rejection**
- **Action**:
  1. Click "Retry Submission"
  2. Update metadata (optional):
     - Release notes
     - Description
  3. Select new build (optional)
  4. Click "Re-Submit"
- **Expected**:
  - New submission created
  - Status changes to "PENDING" or "IN_REVIEW"
  - History shows retry event

**TC-3.14: Submit Additional Platform**
- **Setup**: Only one platform submitted (e.g., Android)
- **Action**:
  1. Click "Submit to Stores" button
  2. Select iOS (Android disabled/unavailable)
  3. Fill iOS options
  4. Submit
- **Expected**:
  - iOS tab appears
  - New submission created
  - Can switch between Android and iOS tabs

---

### **Scenario 4: Edge Cases & Error Handling**

#### Test Cases

**TC-4.1: Network Error During Submission**
- **Action**: Simulate network failure, try to submit
- **Expected**: Error message displayed, form remains open for retry

**TC-4.2: Network Error During Rollout Update**
- **Action**: Simulate network failure, try to update rollout
- **Expected**: Error message displayed, can retry

**TC-4.3: Invalid Rollout Percentage**
- **Action**: Try to set rollout to 101%
- **Expected**: Validation error (max 100%)

**TC-4.4: Missing Required Fields**
- **Action**: Try to submit without filling required fields
- **Expected**: Validation errors shown for each field

**TC-4.5: Concurrent Submissions**
- **Setup**: Two users submit to same release simultaneously
- **Expected**: Second submission shows conflict dialog or queues

**TC-4.6: Unauthorized Actions**
- **Setup**: User without proper role
- **Action**: Try to halt rollout (requires specific role)
- **Expected**: 403 error or action disabled

**TC-4.7: Stale Data Refresh**
- **Action**: Leave page open for 5+ minutes, try to perform action
- **Expected**: System detects stale data, prompts to refresh

**TC-4.8: Empty State**
- **Setup**: Release with no submissions yet
- **Expected**: Empty state shown with "Submit to Stores" CTA

---

## 🔍 Visual/UI Testing

### Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on laptop (1366x768)
- [ ] Test on tablet (768x1024)
- [ ] All modals are centered and accessible
- [ ] Scrolling works properly in long forms/history

### Component States
- [ ] Loading states show spinners
- [ ] Disabled states are clearly indicated
- [ ] Error states show red/error styling
- [ ] Success states show green/success styling
- [ ] Empty states show helpful messages

### Accessibility
- [ ] All buttons have clear labels
- [ ] Tab navigation works throughout
- [ ] Modals can be closed with ESC key
- [ ] Form validation errors are announced
- [ ] Color contrast meets standards

---

## 📊 Mock Server Testing

### Mock Data Available
The mock server (`mock-server/server.js`) provides:
- Sample releases
- Sample submissions (various statuses)
- Sample builds
- Sample history events

### Mock Endpoints
```
GET    /api/v1/releases/:id/distribute
POST   /api/v1/releases/:id/distribute
GET    /api/v1/releases/:id/submissions
GET    /api/v1/submissions/:id
GET    /api/v1/submissions/:id/status
GET    /api/v1/submissions/:id/history
PATCH  /api/v1/submissions/:id/rollout
POST   /api/v1/submissions/:id/rollout/pause
POST   /api/v1/submissions/:id/rollout/resume
POST   /api/v1/submissions/:id/rollout/halt
```

### Mock Server Verification
```bash
# Check if mock server is running
curl http://localhost:3001/api/v1/releases/test-release-id/distribute

# Should return JSON with distribution status
```

---

## ✅ Success Criteria

### Functionality
- [ ] All submit scenarios work
- [ ] All rollout control scenarios work
- [ ] All navigation flows work
- [ ] Error handling works correctly
- [ ] History tracking works

### Performance
- [ ] Page loads < 2 seconds
- [ ] Actions respond < 1 second
- [ ] Smooth animations (no jank)
- [ ] No memory leaks (use Chrome DevTools)

### Code Quality
- [ ] Zero TypeScript errors
- [ ] Zero linter warnings
- [ ] Zero console errors
- [ ] Zero bad practices (`any`, `as unknown`)

### User Experience
- [ ] Intuitive navigation
- [ ] Clear feedback for all actions
- [ ] Helpful error messages
- [ ] Smooth transitions between states

---

## 🐛 Bug Report Template

If you find issues, report them like this:

```
**Bug ID**: [Brief description]
**Location**: [Route or component]
**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**: [What should happen]
**Actual Behavior**: [What actually happens]
**Screenshots**: [If applicable]
**Console Errors**: [If any]
**Priority**: [High/Medium/Low]
```

---

## 🚀 Next Steps After Testing

1. **If all tests pass**:
   - ✅ Mark implementation as production-ready
   - Document any known limitations
   - Plan deployment strategy

2. **If bugs found**:
   - Fix critical bugs immediately
   - Document medium/low priority bugs
   - Create follow-up tasks

3. **Integration with teammate's work**:
   - Wait for pre-release implementation
   - Integrate the full flow
   - Test end-to-end

---

## 📝 Testing Notes Section

Use this space to track your testing progress:

### Test Run #1 - [Date]
**Tester**: [Name]
**Environment**: Dev with Mock Server
**Results**:
- [ ] Scenario 1: PASS / FAIL
- [ ] Scenario 2: PASS / FAIL
- [ ] Scenario 3: PASS / FAIL
- [ ] Scenario 4: PASS / FAIL

**Bugs Found**: [List here]

**Comments**: [Any observations]

---

**Ready to start testing!** 🧪

Start with: `npm run dev:with-mock` and begin with Scenario 1!

