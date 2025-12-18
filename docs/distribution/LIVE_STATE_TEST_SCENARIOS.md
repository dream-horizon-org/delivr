# LIVE State Test Scenarios

## 📊 Comprehensive Test Data Generated

20 distribution test scenarios covering all LIVE state variations for Android and iOS.

---

## 🤖 Android LIVE States

### Scenario 1: **4.1.0 - Android LIVE at 5%**
```
Distribution: dist_live_001
Status: RELEASED (single platform, LIVE = released)

Expected UI:
┌─────────────────────────────────────┐
│  🤖  4.1.0  Version Code: 401       │
│      [LIVE]                         │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 5%            │
│ IN-APP PRIORITY     | 1 / 5         │
├─────────────────────────────────────┤
│ [Update Rollout]  [Emergency Halt]  │  ← Both buttons shown
└─────────────────────────────────────┘

Update Rollout Dialog:
- Slider: 5% to 100%
- Presets: [25%] [50%] [75%] [100%]
- Custom input: supports decimals (e.g., 12.5%)
```

### Scenario 2: **4.2.0 - Android LIVE at 25%**
```
Expected: Same as above, but rollout at 25%
Actions: Can update to 26%-100%, can halt
```

### Scenario 3: **4.3.0 - Android LIVE at 50%**
```
Expected: Same as above, but rollout at 50%
Actions: Can update to 51%-100%, can halt
```

### Scenario 4: **4.4.0 - Android LIVE at 75.5%** (Decimal!)
```
Expected: Rollout shows 75.5% (supports decimals)
Actions: Can update to 75.6%-100%, can halt
```

### Scenario 5: **4.5.0 - Android LIVE at 100%**
```
Distribution: dist_live_005
Status: RELEASED

Expected UI:
┌─────────────────────────────────────┐
│  🤖  4.5.0  Version Code: 405       │
│      [LIVE]                         │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 100%          │  ← Complete
│ IN-APP PRIORITY     | 5 / 5         │
├─────────────────────────────────────┤
│ [Emergency Halt]                    │  ← Only Halt available (no Update)
└─────────────────────────────────────┘

Note: 
- ❌ Update Rollout button HIDDEN (isComplete)
- ✅ Emergency Halt still available
```

### Scenario 15: **4.15.0 - Android HALTED at 35%**
```
Distribution: dist_live_015
Status: RELEASED

Expected UI:
┌─────────────────────────────────────┐
│  🤖  4.15.0  Version Code: 415      │
│      [HALTED]                       │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 35%           │  ← Frozen
│ IN-APP PRIORITY     | 3 / 5         │
├─────────────────────────────────────┤
│ [NO BUTTONS]                        │  ← Terminal state
└─────────────────────────────────────┘

Note: 
- ❌ No actions available (terminal state)
- ✅ Rollout frozen at 35%
- ✅ Action History shows "HALTED" action
```

### Scenario 19-20: **Decimal Rollouts**
```
4.19.0: 12.5% rollout
4.20.0: 33.3% rollout

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
└─────────────────────────────────────┘

Note: 
- ❌ Update Rollout button HIDDEN (isPaused)
- ❌ Pause Rollout button HIDDEN (already paused)
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
│      [LIVE]                         │
├─────────────────────────────────────┤
│ ROLLOUT PROGRESS    | 10%           │
├─────────────────────────────────────┤
│ [Update Rollout]  [Emergency Halt]  │
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

Android: 50% rollout (can update, can halt)
iOS: 100% manual (no buttons)
```

### Scenario 14: **4.14.0 - Both LIVE at 100%**
```
Distribution: dist_live_014
Status: RELEASED

Android: 100% (only Halt available)
iOS: 100% phased (no buttons)
```

### Scenario 17: **4.17.0 - Android LIVE 75%, iOS PAUSED 30%**
```
Distribution: dist_live_017
Status: RELEASED

Android: 75% LIVE (can update, can halt)
iOS: 30% PAUSED (can resume only)
```

### Scenario 18: **4.18.0 - Android HALTED 60%, iOS LIVE 100%**
```
Distribution: dist_live_018
Status: RELEASED

Android: 60% HALTED (terminal, no buttons)
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

### ✅ iOS Pause API (iOS Only)
```bash
PATCH /api/v1/submissions/:submissionId/rollout/pause?platform=IOS

# Valid only if:
- Platform is IOS ✅
- Status is LIVE ✅
- phasedRelease is true ✅

# Android:
PATCH /api/v1/submissions/:submissionId/rollout/pause?platform=ANDROID
# ❌ 400/409 error (Android does not support pause per API spec L1346)
```

### ✅ iOS Resume API (iOS Only)
```bash
PATCH /api/v1/submissions/:submissionId/rollout/resume?platform=IOS

# Valid only if:
- Platform is IOS ✅
- Status is PAUSED ✅

# Android:
PATCH /api/v1/submissions/:submissionId/rollout/resume?platform=ANDROID
# ❌ 400/409 error (Android does not support resume per API spec L1384)
```

### ✅ Halt API (Android Only per API spec L186-197)
```bash
PATCH /api/v1/submissions/:submissionId/rollout/halt?platform=ANDROID

# Valid only if:
- Platform is ANDROID ✅
- Status is LIVE ✅

# iOS:
PATCH /api/v1/submissions/:submissionId/rollout/halt?platform=IOS
# ❌ 400/409 error (iOS does NOT support halt per API spec L186-197)
```

---

## 🎯 Key Test Points

### Android LIVE
- ✅ Rollout Progress displayed correctly
- ✅ Update Rollout shows slider + presets + custom input
- ✅ Supports decimal percentages (12.5%, 33.3%)
- ✅ Can update to any % between current and 100%
- ✅ Emergency Halt available (unless already HALTED)
- ✅ Update button hidden when rollout = 100%
- ✅ HALTED state is terminal (no actions)
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
- [ ] Pause/Resume work correctly (iOS only)
- [ ] Halt works correctly (Android only)
- [ ] No Halt button for iOS (any state)

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
- ✅ Android supports any percentage with decimals
- ✅ iOS phased can only update to 100%
- ✅ iOS manual has no rollout control
- ✅ **iOS DOES NOT SUPPORT HALT** (per API spec L186-197)
- ✅ Android supports halt (terminal state)
- ✅ iOS supports pause/resume (phased only)

**Mock server ready for testing!** 🎯

