# REJECTED & CANCELLED Status Verification

## 📋 Status Overview

### REJECTED Status
- **Trigger**: Store (Google Play/App Store) rejects the submission
- **Behavior**: 
  - Submission becomes **inactive** (`isActive: false`)
  - User can **resubmit** with a new build
  - Shows in **Past Submissions** (history)
  - **Active Submission** section is **empty** with **Resubmit** button

### CANCELLED Status
- **Trigger**: User cancels the submission while in review
- **Behavior**:
  - Submission becomes **inactive** (`isActive: false`)
  - User can **resubmit** with a new build
  - Shows in **Past Submissions** (history)
  - **Active Submission** section is **empty** with **Resubmit** button

---

## ✅ Expected UI Behavior

### When Submission is REJECTED or CANCELLED

**Active Submission Section:**
```
┌─────────────────────────────────────────────────┐
│  Latest Android Submission                       │
├─────────────────────────────────────────────────┤
│                                                  │
│        No active Android submission              │
│        [Resubmit] (blue button)                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Past Submissions Section:**
```
┌─────────────────────────────────────────────────┐
│  Android Submission History                      │
├─────────────────────────────────────────────────┤
│  ● 5.0.0 (500)  [REJECTED] ❌                   │
│    Submitted: Dec 14, 2025                       │
│    Reason: App crashes on launch...              │
│                                                  │
│  ● 4.9.0 (490)  [LIVE] ✅ 100%                  │
│    Submitted: Dec 10, 2025                       │
└─────────────────────────────────────────────────┘
```

---

## 🧪 Test Scenarios

### Scenario 1: Android REJECTED (Single Platform)

**Distribution ID:** `dist_rejected_android`  
**Test URL:** `/dashboard/EkgmIbgGQx/distributions/dist_rejected_android`

**Initial State:**
- ❌ Android submission **REJECTED** (version 5.0.0, code 500)
- Rejection reason: "App crashes on launch. Please fix the critical bug and resubmit."
- `isActive: false` (submission is inactive)

**Expected UI:**
- ✅ **Android Tab:**
  - Latest Submission: **Empty with Resubmit button**
  - History: Shows rejected submission with rejection reason
- ✅ **Resubmit Button:**
  - Visible in empty state
  - Opens `ReSubmissionDialog` when clicked
  - Allows uploading new AAB file

---

### Scenario 2: iOS CANCELLED (Single Platform)

**Distribution ID:** `dist_cancelled_ios`  
**Test URL:** `/dashboard/EkgmIbgGQx/distributions/dist_cancelled_ios`

**Initial State:**
- ❌ iOS submission **CANCELLED** (version 5.1.0)
- Cancel reason: "Found a critical bug, need to fix before releasing"
- `isActive: false` (submission is inactive)

**Expected UI:**
- ✅ **iOS Tab:**
  - Latest Submission: **Empty with Resubmit button**
  - History: Shows cancelled submission with action history
- ✅ **Resubmit Button:**
  - Visible in empty state
  - Opens `ReSubmissionDialog` when clicked
  - Allows entering new TestFlight build number

---

### Scenario 3: Both Platforms - Android REJECTED + iOS CANCELLED

**Distribution ID:** `dist_both_rejected`  
**Test URL:** `/dashboard/EkgmIbgGQx/distributions/dist_both_rejected`

**Initial State:**
- ❌ Android: **REJECTED** (version 5.2.0, code 520)
  - Rejection reason: "App violates Google Play policies. Please review and fix."
- ❌ iOS: **CANCELLED** (version 5.2.0)
  - Cancel reason: "Need to match Android version after rejection"
- Both `isActive: false`

**Expected UI:**
- ✅ **Android Tab:**
  - Latest Submission: **Empty with Resubmit button**
  - History: Shows rejected submission
- ✅ **iOS Tab:**
  - Latest Submission: **Empty with Resubmit button**
  - History: Shows cancelled submission
- ✅ Both tabs allow independent resubmission

---

### Scenario 4: Multiple Resubmissions (History)

**Distribution ID:** `dist_multi_resubmit`  
**Test URL:** `/dashboard/EkgmIbgGQx/distributions/dist_multi_resubmit`

**Submission History:**
1. **v1** (versionCode 530): ❌ **REJECTED** - "Missing required permissions declaration"
2. **v2** (versionCode 531): ❌ **CANCELLED** - "Found another bug during review"
3. **v3** (versionCode 532): 🔄 **IN_REVIEW** (current active submission)

**Expected UI:**
- ✅ **Latest Submission:** Shows v3 (IN_REVIEW) with **Cancel** button
- ✅ **History:** Shows v1 (REJECTED) and v2 (CANCELLED)
- ✅ User can **Cancel** current submission if needed
- ✅ If v3 gets rejected/cancelled, **Resubmit** button appears again

---

## 🎯 Implementation Details

### 1. Empty State with Resubmit Button

**Location:** `dashboard.$org.distributions.$distributionId.tsx` (Lines 764-781 for Android, 840-857 for iOS)

```typescript
{!latestAndroidSubmission ? (
  <Paper p="xl" radius="md" withBorder>
    <Stack align="center" gap="md">
      <Text c="dimmed" ta="center">
        {DISTRIBUTION_MANAGEMENT_UI.EMPTY_STATES.NO_ACTIVE_ANDROID_SUBMISSION}
      </Text>
      {/* Show Resubmit button if there's a rejected/cancelled submission */}
      {historicalAndroidSubmissions.length > 0 && 
       (historicalAndroidSubmissions[0].status === SubmissionStatus.REJECTED || 
        historicalAndroidSubmissions[0].status === SubmissionStatus.CANCELLED) && (
        <Button
          variant="filled"
          color="blue"
          leftSection={<IconRefresh size={16} />}
          onClick={handleOpenAndroidResubmitDialog}
        >
          {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.RESUBMIT}
        </Button>
      )}
    </Stack>
  </Paper>
) : (
  <LatestSubmissionCard ... />
)}
```

### 2. LatestSubmissionCard Logic

**Location:** `LatestSubmissionCard.tsx` (Lines 114)

```typescript
const canResubmit = isRejected || isCancelled;
```

### 3. isActive Flag

**Database:**
```json
{
  "id": "asb_rejected_001",
  "isCurrent": false,  // ❌ Inactive after rejection
  "status": "REJECTED"
}
```

**API Response:**
```json
{
  "id": "asb_rejected_001",
  "isActive": false,  // Mapped from isCurrent
  "status": "REJECTED"
}
```

---

## 🔍 Verification Checklist

### Visual Checks
- [ ] **Empty State:** Shows centered text + Resubmit button
- [ ] **Resubmit Button:** Blue, filled variant, with refresh icon
- [ ] **History Timeline:** Shows rejected/cancelled submissions with reasons
- [ ] **Badge Colors:** Correct colors for REJECTED (red) and CANCELLED (gray)

### Functional Checks
- [ ] **Click Resubmit:** Opens `ReSubmissionDialog`
- [ ] **Android Resubmit:** Allows AAB file upload
- [ ] **iOS Resubmit:** Allows TestFlight build number input
- [ ] **After Resubmit:** New submission becomes active, old one stays in history
- [ ] **Multiple Resubmits:** History shows all previous attempts

### Edge Cases
- [ ] **No History:** If no historical submissions, Resubmit button should NOT appear
- [ ] **Mixed Statuses:** Only show Resubmit if latest historical submission is REJECTED/CANCELLED
- [ ] **Both Platforms:** Each platform's Resubmit button works independently

---

## 📊 Mock Data Reference

All test data is in `mock-server/data/db.json`:

| Distribution ID | Android Status | iOS Status | Test Focus |
|----------------|----------------|------------|------------|
| `dist_rejected_android` | REJECTED | N/A | Android resubmit flow |
| `dist_cancelled_ios` | N/A | CANCELLED | iOS resubmit flow |
| `dist_both_rejected` | REJECTED | CANCELLED | Both platforms inactive |
| `dist_multi_resubmit` | IN_REVIEW (v3) | N/A | Multiple resubmission history |

---

## 🎬 Testing Flow

1. **Start Mock Server:**
   ```bash
   npm run dev:mock
   ```

2. **Navigate to Test Distribution:**
   - `/dashboard/EkgmIbgGQx/distributions/dist_rejected_android`

3. **Verify Empty State:**
   - "Latest Android Submission" section shows empty state
   - **Resubmit** button is visible and styled correctly

4. **Click Resubmit:**
   - Dialog opens
   - Can upload AAB (Android) or enter build number (iOS)

5. **Check History:**
   - Scroll down to "Android Submission History"
   - See rejected submission with reason
   - Badge color is red for REJECTED

6. **Repeat for All Scenarios:**
   - Test all 4 distributions
   - Test both Android and iOS tabs
   - Test multiple resubmissions scenario

---

## ✅ Success Criteria

**A distribution status is correctly implemented if:**

1. ✅ **Empty State:** When submission is REJECTED/CANCELLED, active section is empty
2. ✅ **Resubmit Button:** Appears in empty state, opens resubmission dialog
3. ✅ **History:** Shows inactive submissions with correct status badges and reasons
4. ✅ **isActive Flag:** Rejected/cancelled submissions have `isActive: false`
5. ✅ **Independent Platforms:** Android and iOS can resubmit independently
6. ✅ **Multiple Resubmits:** Full history is preserved and visible

---

## 🚀 Next Steps After Testing

If all checks pass:
- ✅ REJECTED and CANCELLED statuses are fully verified
- ✅ Resubmission flow is ready for production
- ✅ Can move to testing other statuses or features

If issues found:
- 🐛 Document the issue
- 🔧 Fix the implementation
- 🔄 Re-test

