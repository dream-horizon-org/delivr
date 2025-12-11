# Distribution Module - Status Definitions
**Date**: December 10, 2025  
**Status**: ✅ **FINAL & CONFIRMED**

---

## 🎯 **Two-Level Status Architecture**

The Distribution module uses **two separate status hierarchies**:

1. **Release-Level Status** - Overall state of the release
2. **Submission-Level Status** - State of each platform submission

---

## 📋 **Release-Level Statuses** (3 Total)

```typescript
type ReleaseStatus = 
  | 'PRE_RELEASE'              // Before builds ready
  | 'READY_FOR_SUBMISSION'     // Builds ready, PM approved, can submit
  | 'COMPLETED';               // All submissions live
```

### Status Transitions

```
PRE_RELEASE
    ↓
    [Builds ready + PM approved]
    ↓
READY_FOR_SUBMISSION
    ↓
    [All submissions live]
    ↓
COMPLETED
```

### When Each Status Applies

| Status | When Set | Can Submit? | Shown in Distribution List? |
|--------|----------|-------------|----------------------------|
| `PRE_RELEASE` | Builds not ready OR PM not approved | ❌ No | ❌ No |
| `READY_FOR_SUBMISSION` | Builds ready + PM approved | ✅ Yes | ✅ Yes |
| `COMPLETED` | All platforms live (status = 'LIVE') | ❌ No (done) | ✅ Yes (view only) |

---

## 📋 **Submission-Level Statuses** (5 Total)

```typescript
type SubmissionStatus = 
  | 'IN_REVIEW'    // Submitted to store, awaiting review
  | 'APPROVED'     // Store approved, can start rollout
  | 'LIVE'         // Live in store (100% or partial rollout)
  | 'REJECTED'     // Store rejected, needs fixes
  | 'HALTED';      // Emergency halt
```

### Status Transitions

```
IN_REVIEW
    ↓
    ├─→ APPROVED → LIVE
    │
    ├─→ REJECTED (can retry)
    │
    └─→ HALTED (emergency)
```

### When Each Status Applies

| Status | When Set | Available Actions | Can Rollout? |
|--------|----------|------------------|--------------|
| `IN_REVIEW` | Just submitted | Wait | ❌ |
| `APPROVED` | Store approved | Start rollout | ✅ |
| `LIVE` | Rollout active | Pause/Resume/Halt/Increase % | ✅ |
| `REJECTED` | Store rejected | Retry submission | ❌ |
| `HALTED` | Emergency halt | None (need hotfix) | ❌ |

---

## 🔄 **Complete Status Flow Example**

### Scenario: Multi-Platform Release (Android + iOS)

#### Phase 1: Pre-Release
```typescript
Release {
  releaseStatus: 'PRE_RELEASE',
  submissions: []
}
// User: Building artifacts, getting PM approval
// Distribution List: ❌ Not shown
```

#### Phase 2: Ready to Submit
```typescript
Release {
  releaseStatus: 'READY_FOR_SUBMISSION',
  submissions: []
}
// User: Can now submit to stores!
// Distribution List: ✅ Shown (can submit)
```

#### Phase 3: Android Submitted
```typescript
Release {
  releaseStatus: 'READY_FOR_SUBMISSION',  // Still ready (iOS pending)
  submissions: [
    { platform: 'ANDROID', status: 'IN_REVIEW' }
  ]
}
// User: Waiting for Android review, can submit iOS
// Distribution List: ✅ Shown (can submit iOS)
```

#### Phase 4: Android Approved, iOS Submitted
```typescript
Release {
  releaseStatus: 'READY_FOR_SUBMISSION',
  submissions: [
    { platform: 'ANDROID', status: 'APPROVED' },
    { platform: 'IOS', status: 'IN_REVIEW' }
  ]
}
// User: Can start Android rollout, waiting for iOS
// Distribution List: ✅ Shown
```

#### Phase 5: Both Live (Rollout in Progress)
```typescript
Release {
  releaseStatus: 'READY_FOR_SUBMISSION',  // Still not 100%
  submissions: [
    { platform: 'ANDROID', status: 'LIVE', exposurePercent: 25 },
    { platform: 'IOS', status: 'LIVE', exposurePercent: 10 }
  ]
}
// User: Managing rollouts
// Distribution List: ✅ Shown
```

#### Phase 6: Completed (100% Rollout)
```typescript
Release {
  releaseStatus: 'COMPLETED',  // ✅ All platforms 100%
  submissions: [
    { platform: 'ANDROID', status: 'LIVE', exposurePercent: 100 },
    { platform: 'IOS', status: 'LIVE', exposurePercent: 100 }
  ]
}
// User: Release complete!
// Distribution List: ✅ Shown (view only)
```

---

## 🎯 **Frontend Implementation**

### Distribution List Filter

```typescript
// SIMPLE! Just check release status
function getDistributionList(releases: Release[]): Release[] {
  return releases.filter(release => 
    ['READY_FOR_SUBMISSION', 'COMPLETED'].includes(release.releaseStatus)
  );
}

// Backend handles ALL complexity:
// - PM approval checks
// - Builds readiness checks
// - Everything else
```

### Release Status Display

```typescript
// Get display properties for release status
function getReleaseStatusDisplay(status: ReleaseStatus) {
  switch (status) {
    case 'PRE_RELEASE':
      return {
        label: 'Pre-Release',
        color: 'gray',
        icon: 'IconBuildingFactory'
      };
    case 'READY_FOR_SUBMISSION':
      return {
        label: 'Ready to Submit',
        color: 'blue',
        icon: 'IconRocket'
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        color: 'green',
        icon: 'IconCircleCheck'
      };
  }
}
```

### Submission Status Display

```typescript
// Get display properties for submission status
function getSubmissionStatusDisplay(status: SubmissionStatus) {
  switch (status) {
    case 'IN_REVIEW':
      return {
        label: 'In Review',
        color: 'yellow',
        icon: 'IconClock',
        canRetry: false
      };
    case 'APPROVED':
      return {
        label: 'Approved',
        color: 'green',
        icon: 'IconCircleCheck',
        canRetry: false
      };
    case 'LIVE':
      return {
        label: 'Live',
        color: 'blue',
        icon: 'IconTrendingUp',
        canRetry: false
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        color: 'red',
        icon: 'IconAlertCircle',
        canRetry: true  // ✅ Can retry
      };
    case 'HALTED':
      return {
        label: 'Halted',
        color: 'red',
        icon: 'IconAlertTriangle',
        canRetry: false  // ❌ Need hotfix
      };
  }
}
```

---

## ✅ **Key Principles**

1. **Backend Owns Logic** ✅
   - Backend handles all complexity (PM approval, builds, etc.)
   - Backend provides clean status values
   - Frontend just displays what backend provides

2. **Two-Level Architecture** ✅
   - Release-level: Overall state (3 statuses)
   - Submission-level: Per-platform state (5 statuses)

3. **Simple Frontend** ✅
   - No derived conditions
   - No complex logic
   - Just check status field

4. **Clear Semantics** ✅
   - Each status has clear meaning
   - Easy to understand state transitions
   - Predictable behavior

---

## 📊 **Status Decision Matrix**

### "Should this release show in Distribution List?"

```typescript
releaseStatus === 'READY_FOR_SUBMISSION' → ✅ YES (can submit)
releaseStatus === 'COMPLETED' → ✅ YES (view only)
releaseStatus === 'PRE_RELEASE' → ❌ NO (not ready)
```

### "Can user submit from Distribution Management?"

```typescript
releaseStatus === 'READY_FOR_SUBMISSION' → ✅ YES
releaseStatus === 'COMPLETED' → ❌ NO (already done)
releaseStatus === 'PRE_RELEASE' → ❌ NO (not ready)
```

### "Can user retry a submission?"

```typescript
submissionStatus === 'REJECTED' → ✅ YES (retry with fixes)
submissionStatus === 'HALTED' → ❌ NO (need hotfix)
submissionStatus === 'IN_REVIEW' → ❌ NO (wait for review)
submissionStatus === 'APPROVED' → ❌ NO (already approved)
submissionStatus === 'LIVE' → ❌ NO (already live)
```

---

## 🎉 **Summary**

**Release Statuses**: `PRE_RELEASE` → `READY_FOR_SUBMISSION` → `COMPLETED`

**Submission Statuses**: `IN_REVIEW` → `APPROVED` → `LIVE` (or → `REJECTED`/`HALTED`)

**Distribution List**: Show releases with status `READY_FOR_SUBMISSION` or `COMPLETED`

**Simple & Clean!** ✅

