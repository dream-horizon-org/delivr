# LIVE State Test Scenarios

## 📊 Comprehensive Test Data Generated

20 distribution test scenarios covering all LIVE state variations for Android and iOS.

---

## 🤖 Android Rollout States

### Scenario 1: **4.1.0 - Android IN_PROGRESS at 5%**
```
Distribution: dist_live_001
Status: RELEASED (single platform, IN_PROGRESS = released)

Expected UI:
┌─────────────────────────────────────┐
│  🤖  4.1.0  Version Code: 401       │
│      [IN_PROGRESS]                  │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 5%            │
│ IN-APP PRIORITY     | 1 / 5         │
├─────────────────────────────────────┤
│ [Update Rollout]  [Pause Rollout]   │  ← Both buttons shown
└─────────────────────────────────────┘

Update Rollout Dialog:
- Slider: 0.01% to 100% (min 0.01%)
- Presets: [5%] [10%] [25%] [50%] [100%]
- Custom input: supports decimals (e.g., 12.5%, 33.33%)

Managed Publishing Warning:
- ⚠️ "For rollout control to work, Managed Publishing must be OFF in Play Store settings"
```

### Scenario 2: **4.2.0 - Android IN_PROGRESS at 25%**
```
Expected: Same as above, but rollout at 25%
Actions: Can update to 0.01%-100%, can pause
```

### Scenario 3: **4.3.0 - Android IN_PROGRESS at 50%**
```
Expected: Same as above, but rollout at 50%
Actions: Can update to 0.01%-100%, can pause
```

### Scenario 4: **4.4.0 - Android IN_PROGRESS at 75.5%** (Decimal!)
```
Expected: Rollout shows 75.5% (supports decimals)
Actions: Can update to 0.01%-100%, can pause
```

### Scenario 5: **4.5.0 - Android COMPLETED at 100%**
```
Distribution: dist_live_005
Status: RELEASED

Expected UI:
┌─────────────────────────────────────┐
│  🤖  4.5.0  Version Code: 405       │
│      [COMPLETED]                    │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 100%          │  ← Complete
│ IN-APP PRIORITY     | 5 / 5         │
├─────────────────────────────────────┤
│ [NO BUTTONS]                        │  ← Terminal state (complete)
└─────────────────────────────────────┘

Note: 
- ❌ No actions available (terminal state)
- ✅ Rollout complete at 100%
```

### Scenario 15: **4.15.0 - Android HALTED at 35%** (Rollout Paused)
```
Distribution: dist_live_015
Status: RELEASED

Expected UI:
┌─────────────────────────────────────┐
│  🤖  4.15.0  Version Code: 415      │
│      [HALTED] "Rollout Paused"      │  ← Displayed as "Rollout Paused"
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 35%           │  ← Paused at 35%
│ IN-APP PRIORITY     | 3 / 5         │
├─────────────────────────────────────┤
│ [Resume Rollout]                    │  ← Can resume
│ 🚨 Update Rollout BLOCKED           │  ← Cannot update while HALTED
└─────────────────────────────────────┘

Note: 
- ✅ Resume button available (resumable state)
- ✅ Rollout paused at 35%
- ✅ Action History shows "PAUSED" action with reason
- ⚠️ Displayed as "Rollout Paused" in UI (not "HALTED")
- 🚨 **CRITICAL**: Cannot update rollout percentage while HALTED
- 🚨 **Must RESUME first**, then can update rollout
- ❌ Update Rollout slider/button disabled or hidden
- ⚠️ Shows warning: "Must resume rollout before updating percentage"
```

### Scenario 16: **4.16.0 - Android SUBMITTED** (Awaiting Review)
```
Distribution: dist_live_016
Status: PARTIALLY_RELEASED (or SUBMITTED if single platform)

Expected UI:
┌─────────────────────────────────────┐
│  🤖  4.16.0  Version Code: 416      │
│      [SUBMITTED]                    │
├─────────────────────────────────────┤
│ STATUS MESSAGE:                     │
│ "Submitted to Play Store, awaiting  │
│  review and processing..."          │
├─────────────────────────────────────┤
│ [NO BUTTONS]                        │  ← Awaiting store
└─────────────────────────────────────┘

Note:
- ⏳ Backend polls Play Store daily for 5 days
- ⚠️ If status not IN_PROGRESS after 5 days → USER_ACTION_PENDING
```

### Scenario 17: **4.17.0 - Android USER_ACTION_PENDING** (Status Verification Failed)
```
Distribution: dist_live_017
Status: PARTIALLY_RELEASED (or SUBMITTED)

Expected UI:
┌─────────────────────────────────────┐
│  🤖  4.17.0  Version Code: 417      │
│      [USER_ACTION_PENDING] ⚠️       │
├─────────────────────────────────────┤
│ ⚠️ WARNING:                         │
│ "We couldn't verify the submission  │
│  status. Please check Play Store    │
│  Console and resubmit if needed."   │
│                                     │
│ "If no action taken within 10 days, │
│  this submission will be suspended."│
├─────────────────────────────────────┤
│ [Resubmit]                          │  ← Opens ResubmissionDialog
└─────────────────────────────────────┘

Note:
- ✅ Resubmit button available
- ⚠️ Creates NEW submission, marks old as SUSPENDED
- ⏱️ 10-day countdown to SUSPENDED
```

### Scenario 18: **4.18.0 - Android SUSPENDED** (Terminal)
```
Distribution: dist_live_018
Status: N/A (submission inactive)

Expected UI:
┌─────────────────────────────────────┐
│  🤖  4.18.0  Version Code: 418      │
│      [SUSPENDED] 🚫                 │
├─────────────────────────────────────┤
│ STATUS MESSAGE:                     │
│ "Submission suspended due to no     │
│  action within timeframe. This does │
│  not affect Play Store status."     │
├─────────────────────────────────────┤
│ [NO BUTTONS]                        │  ← Terminal state
└─────────────────────────────────────┘

Note:
- ❌ No actions available (terminal)
- ℹ️ Play Store status unaffected
- ✅ History shows suspension timestamp
```

### Scenario 19-20: **Decimal Rollouts**
```
4.19.0: 12.5% rollout (IN_PROGRESS)
4.20.0: 33.33% rollout (IN_PROGRESS)
4.21.0: 0.01% rollout (minimum, IN_PROGRESS)
4.22.0: 99.99% rollout (maximum before 100%, IN_PROGRESS)

Expected: Display precise decimal values
```

---

## 🍎 iOS LIVE States

### Scenario 6: **4.6.0 - iOS Phased LIVE at 1%**
```
Distribution: dist_live_006
Status: RELEASED

Expected UI:
┌─────────────────────────────────────┐
│  🍎  4.6.0                          │
│      [LIVE]                         │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 1%            │  ← Auto-progressing
│ RELEASE TYPE        | After Approval│
│ PHASED RELEASE      | Enabled       │
│ RESET RATING        | Disabled      │
├─────────────────────────────────────┤
│ [Update Rollout]  [Pause Rollout]  │  ← Both buttons shown
└─────────────────────────────────────┘

Update Rollout Dialog:
┌─────────────────────────────────────┐
│ 📱 iOS phased releases can only be  │
│    updated to 100% to complete      │
│    rollout early. Apple             │
│    automatically manages the 7-day  │
│    phased rollout.                  │
│                                     │
│ Current: 1%                         │
│                                     │
│ [Complete to 100%]  ← Only option   │
└─────────────────────────────────────┘
```

### Scenario 7-9: **iOS Phased at Various %**
```
4.7.0: 15% phased rollout
4.8.0: 50% phased rollout
4.9.0: 85% phased rollout

Expected: 
- ✅ Update Rollout button shown (can complete to 100%)
- ✅ Pause Rollout button shown
- ✅ Phased Release: Enabled
```

### Scenario 10: **4.10.0 - iOS Phased Completed Early to 100%**
```
Distribution: dist_live_010
Status: RELEASED

Expected UI:
┌─────────────────────────────────────┐
│  🍎  4.10.0                         │
│      [LIVE]                         │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 100%          │  ← Completed early
│ RELEASE TYPE        | After Approval│
│ PHASED RELEASE      | Enabled       │  ← Was phased
│ RESET RATING        | Disabled      │
├─────────────────────────────────────┤
│ [NO BUTTONS]                        │  ← Already at 100%
└─────────────────────────────────────┘

Note: 
- ❌ Update Rollout button HIDDEN (isComplete)
- ❌ Pause Rollout button HIDDEN (already 100%)
- ✅ Phased Release still shows "Enabled" (user chose to complete early)
- ❌ **CANNOT HALT** (iOS doesn't support halt per API spec L186-197)
```

### Scenario 11: **4.11.0 - iOS Manual LIVE at 100%**
```
Distribution: dist_live_011
Status: RELEASED

Expected UI:
┌─────────────────────────────────────┐
│  🍎  4.11.0                         │
│      [LIVE]                         │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 100%          │  ← Immediate
│ RELEASE TYPE        | After Approval│
│ PHASED RELEASE      | Disabled      │  ← Manual release
│ RESET RATING        | Disabled      │
├─────────────────────────────────────┤
│ [NO BUTTONS]                        │  ← No control
└─────────────────────────────────────┘

Note: 
- ❌ Update Rollout button HIDDEN (phasedRelease=false)
- ❌ Pause Rollout button HIDDEN (phasedRelease=false)
- ✅ Always 100% from start (manual release)
- ❌ **CANNOT HALT** (iOS doesn't support halt per API spec)
```

### Scenario 16: **4.16.0 - iOS Phased PAUSED at 45%**
```
Distribution: dist_live_016
Status: RELEASED

Expected UI:
┌─────────────────────────────────────┐
│  🍎  4.16.0                         │
│      [PAUSED]                       │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 45%           │  ← Paused
│ RELEASE TYPE        | After Approval│
│ PHASED RELEASE      | Enabled       │
│ RESET RATING        | Disabled      │
├─────────────────────────────────────┤
│ [Resume Rollout]                    │  ← Only Resume
│ 🚨 Complete Early BLOCKED           │  ← Cannot complete while PAUSED
└─────────────────────────────────────┘

Note: 
- ❌ Update Rollout button HIDDEN (isPaused)
- ❌ Pause Rollout button HIDDEN (already paused)
- ✅ Resume Rollout button shown
- ✅ Action History shows PAUSED action
- 🚨 **CRITICAL**: Cannot complete early (skip to 100%) while PAUSED
- 🚨 **Must RESUME first**, then can complete early
- ❌ "Complete Early (100%)" button disabled or hidden
- ⚠️ Shows warning: "Must resume rollout before completing"
```
- ✅ Resume Rollout button shown (can resume to LIVE)
- ✅ Action History shows "PAUSED" action
```

---

## 🔄 Both Platforms

### Scenario 12: **4.12.0 - Both LIVE, Android 10%, iOS Phased 25%**
```
Distribution: dist_live_012
Status: RELEASED (both platforms released)

Expected Android Tab:
┌─────────────────────────────────────┐
│  🤖  4.12.0  Version Code: 412      │
│      [IN_PROGRESS]                  │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 10%           │
├─────────────────────────────────────┤
│ [Update Rollout]  [Pause Rollout]   │
└─────────────────────────────────────┘

Expected iOS Tab:
┌─────────────────────────────────────┐
│  🍎  4.12.0                         │
│      [LIVE]                         │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 25%           │
│ PHASED RELEASE      | Enabled       │
├─────────────────────────────────────┤
│ [Update Rollout]  [Pause Rollout]  │
└─────────────────────────────────────┘
```

### Scenario 13: **4.13.0 - Both LIVE, Android 50%, iOS Manual 100%**
```
Distribution: dist_live_013
Status: RELEASED

Android: 50% rollout (can update, can pause)
iOS: 100% manual (no buttons)
```

### Scenario 14: **4.14.0 - Both LIVE at 100%**
```
Distribution: dist_live_014
Status: RELEASED

Android: 100% (no buttons - rollout complete)
iOS: 100% phased (no buttons)
```

### Scenario 17: **4.17.0 - Android LIVE 75%, iOS PAUSED 30%**
```
Distribution: dist_live_017
Status: RELEASED

Android: 75% IN_PROGRESS (can update, can pause)
iOS: 30% PAUSED (can resume only)
```

### Scenario 18: **4.18.0 - Android HALTED 60%, iOS LIVE 100%**
```
Distribution: dist_live_018
Status: RELEASED

Android: 60% HALTED (can resume, no update until resumed)
iOS: 100% manual (no buttons)
```

---

## 🔍 API Compliance Verification

### ✅ Android Rollout Update API
```bash
PATCH /api/v1/submissions/:submissionId/rollout?platform=ANDROID

# Valid requests:
{"rolloutPercentage": 5.0}      # ✅ Can set any %
{"rolloutPercentage": 25.5}     # ✅ Supports decimals
{"rolloutPercentage": 100.0}    # ✅ Can complete to 100%

# Can increase or decrease (per API spec L1119)
```

### ✅ iOS Phased Rollout Update API
```bash
PATCH /api/v1/submissions/:submissionId/rollout?platform=IOS

# Valid request (phased release enabled):
{"rolloutPercentage": 100.0}    # ✅ Can ONLY set to 100%

# Invalid request (phased release enabled):
{"rolloutPercentage": 50.0}     # ❌ 409 error (can only skip to 100%)

# Invalid request (manual release, phasedRelease=false):
{"rolloutPercentage": 100.0}    # ❌ 409 error (already at 100%)
```

### ✅ Pause API (Both Platforms)
```bash
PATCH /api/v1/submissions/:submissionId/rollout/pause?platform={ANDROID|IOS}

# iOS:
# Valid only if:
- Platform is IOS ✅
- Status is LIVE ✅
- phasedRelease is true ✅

# Android:
# Valid only if:
- Platform is ANDROID ✅
- Status is IN_PROGRESS ✅

# Result:
# iOS: LIVE → PAUSED
# Android: IN_PROGRESS → HALTED (HALT = PAUSE for Android)
```

### ✅ Resume API (Both Platforms)
```bash
PATCH /api/v1/submissions/:submissionId/rollout/resume?platform={ANDROID|IOS}

# iOS:
# Valid only if:
- Platform is IOS ✅
- Status is PAUSED ✅

# Android:
# Valid only if:
- Platform is ANDROID ✅
- Status is HALTED ✅

# Result:
# iOS: PAUSED → LIVE
# Android: HALTED → IN_PROGRESS
```

---

## 🎯 Key Test Points

### Android IN_PROGRESS
- ✅ Rollout Progress displayed correctly
- ✅ Update Rollout shows slider + presets + custom input
- ✅ Supports decimal percentages (12.5%, 33.3%)
- ✅ Can update to any % between 0.01% and 100%
- ✅ Pause Rollout available (IN_PROGRESS → HALTED)
- ✅ Update button hidden when rollout = 100%
- ✅ HALTED state is resumable (shows Resume button)
- 🚨 Cannot update rollout while HALTED (must resume first)
- ✅ Internal Track Link shown (if first submission)

### iOS Phased LIVE
- ✅ Rollout Progress displayed correctly
- ✅ Update Rollout shows "Complete to 100%" button only
- ✅ Cannot set partial percentages
- ✅ Pause Rollout available (phased only)
- ✅ Update button hidden when rollout = 100%
- ✅ Pause button hidden when rollout = 100%
- ✅ Phased Release shown as "Enabled"
- ❌ **NO HALT BUTTON** (iOS doesn't support halt)

### iOS Manual LIVE
- ✅ Rollout Progress shows 100%
- ❌ Update Rollout button HIDDEN (phasedRelease=false)
- ❌ Pause Rollout button HIDDEN (phasedRelease=false)
- ✅ Phased Release shown as "Disabled"
- ❌ **NO HALT BUTTON** (iOS doesn't support halt)

### iOS PAUSED
- ✅ Rollout Progress displayed correctly
- ❌ Update Rollout button HIDDEN (isPaused)
- ❌ Pause Rollout button HIDDEN (already paused)
- ✅ Resume Rollout button shown
- ✅ Action History shows PAUSED action
- 🚨 **Complete Early button DISABLED/HIDDEN** (must resume first)
- ⚠️ Warning message: "Must resume before completing rollout"
- ❌ **NO HALT BUTTON** (iOS doesn't support halt)

---

## 📝 Testing Checklist

### For Each Scenario:

#### Visual Verification
- [ ] Correct platform icon (🤖 or 🍎)
- [ ] Correct status badge color
- [ ] Correct rollout percentage display
- [ ] Platform-specific fields shown correctly
- [ ] Action buttons match expected state

#### Functional Verification
- [ ] Update Rollout dialog opens with correct UI
- [ ] Android: Slider, presets, custom input available
- [ ] iOS Phased: Only "Complete to 100%" button
- [ ] iOS Manual: Dialog doesn't open (button hidden)
- [ ] Pause/Resume work correctly (both platforms)
- [ ] Android: Pause button shown for IN_PROGRESS
- [ ] Android: Resume button shown for HALTED
- [ ] iOS: Pause button shown for LIVE (phased only)
- [ ] iOS: Resume button shown for PAUSED

#### API Compliance
- [ ] API calls use correct query parameter (`?platform=ANDROID|IOS`)
- [ ] API validates platform-specific rules
- [ ] API rejects invalid operations (e.g., halt on iOS)

---

## 🚀 Quick Test Commands

```bash
# List all LIVE distributions
curl http://localhost:4000/api/v1/distributions | jq '.data.distributions[] | select(.status == "RELEASED") | {id, branch, status}'

# Get specific LIVE distribution detail
curl http://localhost:4000/api/v1/distributions/dist_live_001 | jq '.data'

# Check Android LIVE submission
curl http://localhost:4000/api/v1/distributions/dist_live_001 | jq '.data.submissions[] | select(.platform == "ANDROID") | {version, status, rolloutPercentage}'

# Check iOS Phased submission
curl http://localhost:4000/api/v1/distributions/dist_live_006 | jq '.data.submissions[] | select(.platform == "IOS") | {version, status, rolloutPercentage, phasedRelease}'
```

---

## ✅ Summary

**20 comprehensive test scenarios generated:**
- 5 Android LIVE states (5%, 25%, 50%, 75.5%, 100%)
- 6 iOS LIVE states (1%, 15%, 50%, 85%, 100% phased, 100% manual)
- 4 Both platforms combinations
- 1 Android HALTED state
- 1 iOS PAUSED state
- 2 Mixed state combinations
- 2 Android decimal rollout examples

**All scenarios comply with API spec:**
- ✅ Android supports any percentage with decimals (0.01% to 100%)
- ✅ iOS phased can only update to 100%
- ✅ iOS manual has no rollout control
- ✅ **Both platforms support pause/resume**
- ✅ Android: Pause (IN_PROGRESS → HALTED), Resume (HALTED → IN_PROGRESS)
- ✅ iOS: Pause (LIVE → PAUSED, phased only), Resume (PAUSED → LIVE)
- 🚨 **HALTED = PAUSE for Android** (not a separate action or terminal state)

**Mock server ready for testing!** 🎯

