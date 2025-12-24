# Distribution Module - API Specification

**Version**: 1.0  
**Date**: December 14, 2025  
**Status**: ✅ **IMPLEMENTED & PRODUCTION READY**

**Known Gap (Future Enhancement):**
- 🔴 **Rejection Details** - Not yet implemented (backend team notified)
  - Fields: `rejectionReason: string`, `rejectionDetails: { guideline, description, screenshot }`
  - Will be added to submission objects in future update
  - Frontend has hardcoded fallback for now

---

## Overview

This document specifies the complete API contract for the Distribution module, which handles submitting builds to app stores (Play Store, App Store) and managing rollouts.

### Distribution Lifecycle

```
1. Pre-Release Completes
   ↓
2. Backend AUTO-CREATES distribution entry (status: PENDING)
   ↓
3. Backend AUTO-CREATES submission entries (one per platform, status: PENDING)
   ↓
4. User navigates to Distribution Step OR Distribution Management
   ↓
5. User submits to stores (updates submission status from PENDING → IN_REVIEW)
   ↓
6. User monitors and manages rollout
```

---

## Core Concepts

### Distribution
- **Created**: Automatically after pre-release completion
- **Purpose**: Container for all submissions for a release
- **Lifecycle**: PENDING → PARTIALLY_SUBMITTED → SUBMITTED → PARTIALLY_RELEASED → RELEASED
- **Status Calculation**: Backend only - Frontend never calculates, only displays
- **Relationship**: 1 Distribution : N Submissions
- **Important**: **Once RELEASED, the distribution status NEVER changes** (immutable terminal state)

#### Distribution Status Logic

**Key Concept**: For distribution status calculation, a submission is considered **"released"** when it reaches `APPROVED` status or beyond (`LIVE`, `PAUSED`, `HALTED`).

**Single Platform Distributions** (e.g., Android-only or iOS-only):
  - `PENDING`: Submission is PENDING
  - `SUBMITTED`: Submission is IN_REVIEW
  - `RELEASED`: Submission is APPROVED, LIVE, PAUSED, or HALTED
  - **No PARTIALLY_* statuses** (not applicable for single platform)

**Two Platform Distributions** (Android + iOS):
  - `PENDING`: Both submissions are PENDING
  - `PARTIALLY_SUBMITTED`: At least one submission is IN_REVIEW, the other is PENDING
  - `SUBMITTED`: Both submissions are IN_REVIEW (neither "released" yet)
  - `PARTIALLY_RELEASED`: At least one (but not all) submissions are "released" (APPROVED or beyond)
  - `RELEASED`: Both submissions are "released" (APPROVED, LIVE, PAUSED, or HALTED)
  
**Examples**:
  - Android: PENDING, iOS: PENDING → Distribution: `PENDING`
  - Android: IN_REVIEW, iOS: PENDING → Distribution: `PARTIALLY_SUBMITTED`
  - Android: IN_REVIEW, iOS: IN_REVIEW → Distribution: `SUBMITTED`
  - Android: APPROVED, iOS: IN_REVIEW → Distribution: `PARTIALLY_RELEASED`
  - Android: APPROVED, iOS: APPROVED → Distribution: `RELEASED`
  - Android: LIVE (50%), iOS: APPROVED → Distribution: `RELEASED`
  - Android: LIVE (100%), iOS: LIVE (100%) → Distribution: `RELEASED`
  - Android: HALTED (35%), iOS: LIVE (75%) → Distribution: `RELEASED`

### Submission
- **Created**: Automatically when distribution is created (one per configured platform)
- **Initial Status**: PENDING (not yet submitted to store)
- **Purpose**: Track single platform submission (Android OR iOS)
- **Lifecycle**: Platform-specific (see below)
- **Relationship**: 1 Submission : 1 Platform : 1 Store

#### Android Submission Lifecycle
```
PENDING → SUBMITTED → IN_PROGRESS ⇄ HALTED → COMPLETED
              ↓           ↑
         (5 days)    (resume)
              ↓
    USER_ACTION_PENDING
              ↓
         (10 days)
              ↓
         SUSPENDED (terminal)
```

**Status Definitions:**
- **PENDING**: Initial state, created with distribution, not yet submitted
- **SUBMITTED**: Promoted to Play Store, awaiting review/processing
- **IN_PROGRESS**: Approved by Play Store, actively rolling out (exposure < 100%)
- **HALTED**: Rollout paused by user (similar to iOS PAUSED), can resume
- **COMPLETED**: Rollout finished (exposure = 100%), terminal state
- **USER_ACTION_PENDING**: System couldn't verify status after 5 days, requires user action
- **SUSPENDED**: Dead-end state when user doesn't act within 10 days (doesn't affect Play Store)

**Rollout Control:**
- Manual staged rollout with **any percentage** (0.01-100, decimals supported)
- Examples: `0.01%`, `5%`, `15.5%`, `33.33%`, `99.9%`, `100%`
- User has full control over rollout percentage
- Minimum: `0.01%` (not zero)
- Backend converts to `userFraction = rolloutPercentage / 100`

**Pause/Resume:**
- ✅ **Can Pause**: Yes (IN_PROGRESS → HALTED)
- ✅ **Can Resume**: Yes (HALTED → IN_PROGRESS)
- ❌ **Cannot Cancel**: Not supported for Android

**Managed Publishing Recommendation:**
- For Exposure Control and Pause/Resume to work, **Managed Publishing must be OFF** in Play Store settings
- Show recommendation during submission flow

**Status Polling & Auto-Recovery:**
- After submission, backend polls Play Store daily for 5 days
- If status not IN_PROGRESS after 5 days → USER_ACTION_PENDING (enable resubmission)
- If no user action after 10 more days → SUSPENDED (terminal)
- SUSPENDED: No actions possible, entry marked inactive (Play Store unaffected)

#### iOS Submission Lifecycle
```
PENDING → IN_REVIEW → APPROVED → LIVE
             ↓            ↓          ↓
         REJECTED     REJECTED    PAUSED (phased rollout only)
             ↓            ↓          
         CANCELLED    CANCELLED
```

**Status Definitions:**
- **PENDING**: Initial state, created with distribution, not yet submitted
- **IN_REVIEW**: Submitted to App Store Connect, under Apple review
- **APPROVED**: Approved by Apple, ready for release or released
- **LIVE**: Released and available to users
- **PAUSED**: Phased release temporarily paused (displayed as "Rollout Paused" in UI)
- **REJECTED**: Rejected by Apple, requires fixes and resubmission
- **CANCELLED**: User cancelled submission before approval

**Rollout Control:**
- **Phased Release (phasedRelease = true)**: 
  - Automatic 7-day rollout by Apple
  - ✅ Can update to **100% only** (to complete early)
  - ✅ Can PAUSE/RESUME (displayed as "Rollout Paused" in UI)
  - **Pause Limits**: Maximum **30 days total pause time** (cumulative across all pauses)
  - **Pause Behavior**: Time paused is tracked cumulatively (e.g., pause for 10 days = 20 days remaining)
  - **Resume Behavior**: Phased release resumes from the day/percentage where it was paused
  - **Auto-Resume**: After 30 days of cumulative pause, the phased release will automatically resume
- **Manual Release (phasedRelease = false)**: 
  - ✅ **Always 100%** immediately upon release
  - ❌ No rollout control needed (already at 100%)
  - ❌ Cannot pause

**Can Pause**: ✅ Yes (only if phased release enabled)

**Can Cancel**: ✅ Yes (only when IN_REVIEW or APPROVED before release)

---

## Submission Actions & State Transitions

### Available Actions

| Action | From Status | To Status | Platform | Prerequisites | Result |
|--------|-------------|-----------|----------|---------------|--------|
| **Submit** | PENDING | SUBMITTED (Android) / IN_REVIEW (iOS) | Both | Submission details provided | Submission sent to store for review |
| **Cancel** | IN_REVIEW | CANCELLED | **iOS only** | - | Submission cancelled, becomes inactive, can resubmit |
| **Resubmit** | REJECTED, CANCELLED (iOS) / USER_ACTION_PENDING (Android) | SUBMITTED (Android) / IN_REVIEW (iOS) | Both | New submission details | Creates **new submission** (new ID), old marked SUSPENDED/inactive |
| **Pause** | IN_PROGRESS (Android) / LIVE (iOS) | HALTED (Android) / PAUSED (iOS) | Both | iOS: `phasedRelease = true` | Rollout paused (displayed as "Rollout Paused"), can resume later |
| **Resume** | HALTED (Android) / PAUSED (iOS) | IN_PROGRESS (Android) / LIVE (iOS) | Both | - | Rollout continues from current % |
| **Update Rollout** | IN_PROGRESS (Android) / LIVE (iOS) | Same status | Android / iOS Phased | - | Changes rollout percentage (platform-specific rules) |

### Action Rules

#### 1. Submit (`POST /api/v1/submissions/:submissionId/submit`)
- **Prerequisite**: Submission must be `PENDING`
- **Required**: Submission details (artifact, release notes, etc.)
- **Transition**: 
  - **Android**: PENDING → SUBMITTED
  - **iOS**: PENDING → IN_REVIEW
- **Effect**: 
  - Distribution status may change to `PARTIALLY_SUBMITTED` (if other platforms still PENDING)
  - Distribution status may change to `SUBMITTED` (if all platforms now in review/submitted)
- **Android Note**: After submission, backend will poll Play Store daily for 5 days to verify status

#### 2. Cancel (`POST /api/v1/submissions/:submissionId/cancel`)
- **Platform**: **iOS only** (Android does not support cancellation)
- **Prerequisite**: Submission must be `IN_REVIEW`
- **Required**: Cancellation reason (mandatory)
- **Transition**: IN_REVIEW → CANCELLED
- **Effect**: 
  - Submission becomes inactive (`isActive = false`)
  - Enables resubmission flow (create new submission)
  - Distribution status may revert based on remaining submissions
- **Android Note**: Cancel action is NOT available for Android submissions

#### 3. Resubmit (`POST /api/v1/submissions/:submissionId/resubmit`)
- **Prerequisite**: 
  - **iOS**: Submission must be `REJECTED` or `CANCELLED`
  - **Android**: Submission must be `USER_ACTION_PENDING`
- **Required**: New submission details (new artifact, updated release notes)
- **Creates**: **New submission entity** with new `submissionId`
- **Transition**:
  - **iOS**: REJECTED/CANCELLED → IN_REVIEW (new submission)
  - **Android**: USER_ACTION_PENDING → SUBMITTED (new submission)
- **Effect**: 
  - Old submission marked as `SUSPENDED` (Android) or inactive (`isActive = false` for iOS)
  - New submission is active (`isActive = true`)
  - Distribution status recalculated based on new submission
- **Android Note**: Resubmission is triggered when status polling fails after 5 days, allowing user to check Play Store manually and resubmit if needed

#### 4. Pause Rollout (`POST /api/v1/submissions/:submissionId/pause`)
- **Platform**: Both Android and iOS
- **Prerequisite**: 
  - **Android**: Submission status must be `IN_PROGRESS`
  - **iOS**: Submission status must be `LIVE` AND `phasedRelease` must be `true`
- **Required**: Pause reason (mandatory)
- **Transition**: 
  - **Android**: IN_PROGRESS → HALTED
  - **iOS**: LIVE → PAUSED
- **Effect**: 
  - Rollout paused at current percentage
  - Can be resumed later
  - Distribution status remains `RELEASED` (HALTED/PAUSED is considered "released")
- **UI Display**: Both Android HALTED and iOS PAUSED are displayed as "Rollout Paused" in the UI for consistency

#### 5. Resume Rollout (`POST /api/v1/submissions/:submissionId/resume`)
- **Platform**: Both Android and iOS
- **Prerequisite**: 
  - **Android**: Submission status must be `HALTED`
  - **iOS**: Submission status must be `PAUSED`
- **Required**: No additional parameters
- **Transition**: 
  - **Android**: HALTED → IN_PROGRESS
  - **iOS**: PAUSED → LIVE
- **Effect**: 
  - Rollout continues from current percentage
  - Distribution status remains `RELEASED`

#### 6. Update Rollout (`PATCH /api/v1/submissions/:submissionId/rollout?platform=<ANDROID|IOS>`)
- **Platform**: Android and iOS (Phased Release only)
- **Prerequisite**: 
  - **Android**: Submission status must be `IN_PROGRESS` (NOT `HALTED` - must resume first)
  - **iOS**: Submission status must be `LIVE` AND `phasedRelease = true` (NOT `PAUSED` - must resume first)
- **🚨 CRITICAL RULE**: **Cannot update rollout from HALTED (Android) or PAUSED (iOS) status**
  - Must first call **RESUME** endpoint to change status back to IN_PROGRESS/LIVE
  - Then can update rollout percentage
- **Required**: New rollout percentage in request body
- **Platform-Specific Rules**:
  - **Android**: Can update to any percentage (0.01-100, decimals allowed)
    - Examples: `15.5%`, `33.33%`, `99.9%`, `100%`
    - Minimum: `0.01%` (not zero)
  - **iOS Phased Release**: Can only update to `100%` (to complete early, cannot decrease)
  - **iOS Manual Release**: Always at `100%`, cannot update
- **Transition**: Status unchanged (IN_PROGRESS/LIVE remains same)
- **Effect**: `rolloutPercentage` updated, distribution status remains `RELEASED`
- **Note**: See detailed API specification in "### 6. Update Rollout Percentage" section

---

## Enums & Constants

### DistributionStatus

**Backend-Calculated Status** (Frontend displays only, does not calculate):

```typescript
enum DistributionStatus {
  PENDING = 'PENDING',                          // Initial state, no submissions made yet
  PARTIALLY_SUBMITTED = 'PARTIALLY_SUBMITTED',  // At least 1 submission made (not all)
  SUBMITTED = 'SUBMITTED',                      // All configured platforms submitted
  PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',    // At least 1 submission is LIVE (not all at 100%)
  RELEASED = 'RELEASED'                         // All submissions LIVE at 100% rollout
}
```

**State Machine Logic (Backend Only):**

| Current State | Trigger | Next State | Example |
|---------------|---------|------------|---------|
| `PENDING` | First submission made | `PARTIALLY_SUBMITTED` | Android submitted, iOS still pending |
| `PARTIALLY_SUBMITTED` | All platforms submitted | `SUBMITTED` | Both Android & iOS submitted |
| `PARTIALLY_SUBMITTED` | First submission goes LIVE | `PARTIALLY_RELEASED` | Android submitted goes LIVE, iOS still pending |
| `SUBMITTED` | First submission goes LIVE | `PARTIALLY_RELEASED` | Android LIVE, iOS still IN_REVIEW |
| `PARTIALLY_RELEASED` | Additional submission made | `PARTIALLY_RELEASED` | Stays same - still partially released |
| `PARTIALLY_RELEASED` | All submissions LIVE at 100% | `RELEASED` | Both platforms at 100% rollout |

**Key Points:**
- ✅ Backend calculates and returns this status
- ✅ Frontend ONLY displays the status (never calculates it)
- ✅ Status is derived from all submissions' states and rollout percentages
- ✅ `PARTIALLY_RELEASED` persists until ALL submissions reach 100%

### SubmissionStatus
```typescript
enum SubmissionStatus {
  // Common Statuses
  PENDING = 'PENDING',                       // Created but not yet submitted to store
  
  // Android-Specific Statuses
  SUBMITTED = 'SUBMITTED',                   // Android: Promoted to Play Store, awaiting review
  IN_PROGRESS = 'IN_PROGRESS',               // Android: Approved, actively rolling out (< 100%)
  COMPLETED = 'COMPLETED',                   // Android: Rollout complete (100%), terminal state
  USER_ACTION_PENDING = 'USER_ACTION_PENDING', // Android: Status verification failed, needs resubmission
  SUSPENDED = 'SUSPENDED',                   // Android: Terminal state (no action taken within 10 days)
  HALTED = 'HALTED',                         // Android: Rollout paused (resumable)
  
  // iOS-Specific Statuses
  IN_REVIEW = 'IN_REVIEW',                   // iOS: Submitted, awaiting Apple review
  APPROVED = 'APPROVED',                     // iOS: Apple approved, ready to release
  LIVE = 'LIVE',                             // iOS: Available to users (rollout in progress or complete)
  PAUSED = 'PAUSED',                         // iOS: Phased rollout paused by user (resumable)
  REJECTED = 'REJECTED',                     // iOS: Apple rejected, requires resubmission
  CANCELLED = 'CANCELLED'                    // iOS: User cancelled before/during review
}
```

**Platform-Specific Status Mapping:**

| Status | Platform | Description | Terminal? | Resumable? |
|--------|----------|-------------|-----------|------------|
| `PENDING` | Both | Initial state, not yet submitted | ❌ | N/A |
| `SUBMITTED` | Android | Promoted to Play Store, under review | ❌ | N/A |
| `IN_REVIEW` | iOS | Submitted to App Store Connect, under review | ❌ | N/A |
| `IN_PROGRESS` | Android | Approved, rolling out (< 100%) | ❌ | N/A |
| `APPROVED` | iOS | Approved by Apple, ready for release | ❌ | N/A |
| `LIVE` | iOS | Released and available to users | ❌ | N/A |
| `HALTED` | Android | Rollout paused (displayed as "Rollout Paused") | ❌ | ✅ Yes |
| `PAUSED` | iOS | Phased rollout paused (displayed as "Rollout Paused") | ❌ | ✅ Yes |
| `COMPLETED` | Android | Rollout complete (100%) | ✅ | ❌ |
| `USER_ACTION_PENDING` | Android | Status verification failed after 5 days | ❌ | ✅ (Resubmit) |
| `SUSPENDED` | Android | No action taken within 10 days | ✅ | ❌ |
| `REJECTED` | iOS | Rejected by Apple | ❌ | ✅ (Resubmit) |
| `CANCELLED` | iOS | User cancelled submission | ❌ | ✅ (Resubmit) |

**Key Notes:**
- **Android** uses: PENDING → SUBMITTED → IN_PROGRESS ⇄ HALTED → COMPLETED (with USER_ACTION_PENDING/SUSPENDED as fallback)
- **iOS** uses: PENDING → IN_REVIEW → APPROVED → LIVE ⇄ PAUSED (with REJECTED/CANCELLED as failure paths)
- **HALTED** (Android) and **PAUSED** (iOS) are both displayed as "Rollout Paused" in UI for consistency
- **Cancel** action is iOS-only; Android does not support cancellation
- **Resubmission** creates a new submission for both platforms (old one marked SUSPENDED/inactive)

### Platform
```typescript
enum Platform {
  ANDROID = 'ANDROID',
  IOS = 'IOS'
}
```

### Field Naming Standards

**Context-Aware Naming Rule:**
- In `/api/v1/distributions/:id` → use `id`, `status`
- In `/api/v1/submissions/:id` → use `id`, `status`
- Only prefix when mixing contexts in same response

**Field Name Standards:**
- Use **camelCase** (not snake_case)
- Use **rolloutPercentage** (not rollout_percentage) - float 0-100 (supports decimals)
- Use **releaseNotes** (not what's_New_Text)
- Use **inAppUpdatePriority** (Android only) - integer 0-5
- Use **statusUpdatedAt** (not approved_at or rejected_at or cancelled_at)
- Use **submittedBy** - email of user who submitted
- Use **resetRating** (iOS only, not resetRatings) - boolean

---

## API Endpoints

**⚠️ CRITICAL: All endpoints now require `tenantId` in the path for proper tenant isolation and validation.**

**Path Structure:** `/api/v1/tenants/:tenantId/...`

### 1. Get Distribution by Release

Get the complete distribution entry with all submissions for a specific release.

**Endpoint:**
```
GET /api/v1/tenants/:tenantId/releases/:releaseId/distribution
```

**Use Case:** 
- Release process distribution step (initial fetch on landing to Distribution Tab)
- Display distribution status and submissions in release workflow
- Check if distribution exists before allowing submit

**ID Usage Pattern:**
1. **Initial fetch**: Use `releaseId` to get distribution
2. **All subsequent operations**: Use returned `distributionId` (from `data.id`)
3. **Never use `releaseId` again** after initial fetch - all operations use `distributionId` and `submissionId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dist_123",
    "releaseId": "rel_456",
    "branch": "main",
    "status": "PENDING",
    "platforms": ["ANDROID", "IOS"],
    "createdAt": "2025-12-14T09:00:00Z",
    "updatedAt": "2025-12-14T09:00:00Z",
    "submissions": [
      {
        "id": "sub_789",
        "distributionId": "dist_123",
        "platform": "ANDROID",
        "storeType": "PLAY_STORE",
        "status": "IN_REVIEW",
        "version": "2.7.0",
        "versionCode": 270,
        "rolloutPercentage": 5,
        "inAppUpdatePriority": 0,
        "releaseNotes": "Bug fixes",
        "submittedAt": "2025-12-14T10:00:00Z",
        "submittedBy": "prince@dream11.com",
        "statusUpdatedAt": "2025-12-14T10:00:00Z",
        "createdAt": "2025-12-14T10:00:00Z",
        "updatedAt": "2025-12-14T10:00:00Z",
        "isActive": true,
        "artifact": {
          "artifactPath": "https://s3.amazonaws.com/presigned-url/app-release.aab",
          "internalTrackLink": "https://play.google.com/apps/testing/com.app"
        },
        "actionHistory": []
      },
      {
        "id": "sub_012",
        "distributionId": "dist_123",
        "platform": "IOS",
        "storeType": "APP_STORE",
        "status": "LIVE",
        "version": "2.7.0",
        "releaseType": "AFTER_APPROVAL",
        "phasedRelease": true,
        "resetRating": false,
        "rolloutPercentage": 15,
        "releaseNotes": "Bug fixes",
        "submittedAt": "2025-12-14T10:00:00Z",
        "submittedBy": "prince@dream11.com",
        "statusUpdatedAt": "2025-12-14T12:00:00Z",
        "createdAt": "2025-12-14T10:00:00Z",
        "updatedAt": "2025-12-14T12:00:00Z",
        "isActive": true,
        "artifact": {
          "testflightNumber": 56789
        },
        "actionHistory": [
          {
            "action": "PAUSED",
            "createdBy": "prince@dream11.com",
            "createdAt": "2025-12-14T11:00:00Z",
            "reason": "Found critical bug in production"
          },
          {
            "action": "RESUMED",
            "createdBy": "prince@dream11.com",
            "createdAt": "2025-12-14T11:30:00Z",
            "reason": "Bug fixed and verified"
          }
        ]
      }
    ]
  }
}
```

**Response When Distribution Just Created (Submissions Auto-Created with PENDING Status):**
```json
{
  "success": true,
  "data": {
    "id": "dist_123",
    "releaseId": "rel_456",
    "branch": "main",
    "status": "PENDING",
    "platforms": ["ANDROID", "IOS"],
    "createdAt": "2025-12-14T09:00:00Z",
    "updatedAt": "2025-12-14T09:00:00Z",
    "submissions": [
      {
        "id": "sub_abc",
        "distributionId": "dist_123",
        "platform": "ANDROID",
        "storeType": "PLAY_STORE",
        "status": "PENDING",
        "version": "2.7.0",
        "versionCode": 270,
        "rolloutPercentage": 0,
        "inAppUpdatePriority": 0,
        "releaseNotes": "",
        "submittedAt": null,
        "submittedBy": null,
        "statusUpdatedAt": "2025-12-14T09:00:00Z",
        "createdAt": "2025-12-14T09:00:00Z",
        "updatedAt": "2025-12-14T09:00:00Z",
        "isActive": true,
        "artifact": {
          "artifactPath": "https://s3.amazonaws.com/presigned-url/app-release.aab",
          "internalTrackLink": "https://play.google.com/apps/testing/com.app"
        },
        "actionHistory": []
      },
      {
        "id": "sub_def",
        "distributionId": "dist_123",
        "platform": "IOS",
        "storeType": "APP_STORE",
        "status": "PENDING",
        "version": "2.7.0",
        "releaseType": "AFTER_APPROVAL",
        "phasedRelease": false,
        "resetRating": false,
        "rolloutPercentage": 0,
        "releaseNotes": "",
        "submittedAt": null,
        "submittedBy": null,
        "statusUpdatedAt": "2025-12-14T09:00:00Z",
        "createdAt": "2025-12-14T09:00:00Z",
        "updatedAt": "2025-12-14T09:00:00Z",
        "isActive": true,
        "artifact": {
          "testflightNumber": 56789
        },
        "actionHistory": []
      }
    ]
  }
}
```

**Error Cases:**
- `404` - Distribution not found (pre-release not completed yet)
- `403` - Unauthorized (tenant validation failed)

**Response Fields:**

**Distribution Object** (top level `data`):
- `id`: Distribution ID
- `releaseId`: Associated release ID
- `branch`: Git branch
- `status`: Distribution status (PENDING → PARTIALLY_SUBMITTED → SUBMITTED → PARTIALLY_RELEASED → RELEASED)
- `platforms`: Array of platforms configured for this distribution
- `createdAt`: Distribution creation timestamp
- `updatedAt`: Last update timestamp

**`submissions`** Array: All submissions for this distribution
- **Auto-created** when distribution is created (one per configured platform)
- **Initial Status**: PENDING (not yet submitted to store)
- **Never empty**: Always has entries for each platform in `platforms` array
- Each submission includes:
  - Basic info: `id`, `distributionId`, `platform`, `storeType`, `status`, `version`
  - Rollout: `rolloutPercentage` (0-100)
  - Metadata: `releaseNotes`, `submittedAt`, `submittedBy`, `statusUpdatedAt`
  - **`isActive`**: `boolean` - Indicates if this is the current submission for the platform
    - **`true`**: Current/latest submission (PENDING, IN_REVIEW, APPROVED, LIVE, PAUSED, HALTED)
    - **`false`**: Historical submission (REJECTED or CANCELLED *after* user created a resubmission)
    - **Note**: HALTED remains `isActive: true` (terminal state, cannot resubmit within same distribution)
  - Platform-specific fields:
    - **Android**: `versionCode`, `inAppUpdatePriority` (0-5)
    - **iOS**: `releaseType` (always "AFTER_APPROVAL", display only), `phasedRelease`, `resetRating`
  - **`artifact`** Object (nested in each submission):
    - **Android**: 
      - `artifactPath`: Presigned S3 URL to download AAB
      - `internalTrackLink`: Google Play internal testing link (optional - only for first submission, not resubmissions)
    - **iOS**: 
      - `testflightNumber`: TestFlight build number
  - **`actionHistory`** Array (audit trail for manual actions):
    - `action`: Action type ("PAUSED" | "RESUMED" | "CANCELLED" | "HALTED")
    - `createdBy`: Email of user who performed the action
    - `createdAt`: ISO timestamp when action was performed
    - `reason`: User-provided reason for the action
    - Empty array `[]` if no actions have been taken
    - **Important**: `action` records what was done (e.g., "RESUMED"), while `status` shows current state (e.g., "LIVE")
    - **Example**: After RESUME, `status` = "LIVE", but `actionHistory` still logs the "RESUMED" action

**Important Field Notes:**
- **Distribution has NO version field**: Version information exists only in submissions
- **`inAppUpdatePriority`**: Android in-app update priority (0-5), not `priority`
- **`statusUpdatedAt`**: Last status change timestamp, not `statusChangedAt`
- **`submittedBy`**: Email of user who submitted
- **`resetRating`**: Boolean for iOS rating reset, not `resetRatings`
- **`releaseType`**: iOS only, always "AFTER_APPROVAL" (display-only field, non-editable, default value)
- **`artifact.artifactPath`**: S3 path or URL to AAB file (was `buildUrl`)
- **`artifact.internalTrackLink`**: Optional Google Play internal testing link (was `internalTestingLink`) - present only for first submission, not for resubmissions
- **`artifact.testflightNumber`**: iOS TestFlight build number (was `testflightBuildNumber`)
- **`actionHistory`**: Audit trail for PAUSED/RESUMED/CANCELLED/HALTED actions; empty array if none
  - Backend automatically populates this when actions occur
  - Logs the action taken (e.g., "RESUMED"), which may differ from current `status` (e.g., "LIVE")

**Notes:**
- ✅ **Preferred endpoint** for release process distribution step
- Returns complete distribution with nested submissions **in one call**
- **Submissions are auto-created** when distribution is created (one per platform)
- **Initial submission status**: PENDING (not yet submitted to store)
- Each submission includes its artifact info (build URLs, TestFlight numbers)
- **IMPORTANT**: No separate `artifacts` object at distribution level - **artifacts are per-submission**
  - ✅ Access artifacts via: `submission.artifact`
  - ❌ Distribution does NOT have an `artifacts` field
- No `availableActions` object - frontend calculates based on submission statuses
- **Submissions array is never empty** - always contains one entry per configured platform
- Used in release workflow to show distribution step progress

---

### 2. List All Distributions (Paginated)

Get paginated list of all distributions with submission summaries.

**Endpoint:**
```
GET /api/v1/distributions?tenantId=xxx
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `tenantId` | string | **Yes** | - | Tenant/Organization ID (required for multi-tenant support and validation) |
| `page` | integer | No | 1 | Page number (1-indexed) |
| `pageSize` | integer | No | 10 | Items per page (max: 100) |
| `status` | string | No | - | Filter by distribution status: `PENDING`, `PARTIALLY_SUBMITTED`, `SUBMITTED`, `PARTIALLY_RELEASED`, `RELEASED` |
| `platform` | string | No | - | Filter by platform: `ANDROID`, `IOS` |

**Example Requests:**
```bash
# Basic (all distributions)
GET /api/v1/distributions?tenantId=tenant_1

# With pagination
GET /api/v1/distributions?tenantId=tenant_1&page=1&pageSize=10

# Filter by status
GET /api/v1/distributions?tenantId=tenant_1&status=RELEASED

# Filter by platform
GET /api/v1/distributions?tenantId=tenant_1&platform=IOS

# Combined filters
GET /api/v1/distributions?tenantId=tenant_1&status=PENDING&platform=IOS&page=1&pageSize=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "distributions": [
      {
        "id": "dist_123",
        "releaseId": "rel_456",
        "branch": "release/2.7.0",
        "status": "PENDING",
        "platforms": ["ANDROID", "IOS"],
        "submissions": [
          {
            "id": "sub_789",
            "platform": "ANDROID",
            "status": "IN_REVIEW",
            "rolloutPercentage": 5,
            "statusUpdatedAt": "2025-12-14T10:30:00Z",
            "isActive": true
          },
          {
            "id": "sub_012",
            "platform": "IOS",
            "status": "APPROVED",
            "rolloutPercentage": 0,
            "statusUpdatedAt": "2025-12-14T10:00:00Z",
            "isActive": true
          }
        ],
        "createdAt": "2025-12-14T09:00:00Z",
        "statusUpdatedAt": "2025-12-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalPages": 5,
      "totalItems": 47,
      "hasMore": true
    },
    "stats": {
      "totalDistributions": 47,
      "totalSubmissions": 94,
      "inReviewSubmissions": 8,
      "releasedSubmissions": 27
    }
  }
}
```

**Response Fields:**

**Distribution Object** (each item in `distributions` array):
- `id`: Distribution ID (used for all subsequent operations in Distribution Management)
- `releaseId`: Release ID (used for linking back to the source release page)
- `branch`: Git branch name (e.g., "release/2.7.0")
- `status`: Distribution status (PENDING, PARTIALLY_SUBMITTED, SUBMITTED, PARTIALLY_RELEASED, RELEASED)
- `platforms`: Array of platforms (["ANDROID", "IOS"])
- `createdAt`: When distribution was created (ISO 8601 timestamp)
- `statusUpdatedAt`: **Max of all submissions' statusUpdatedAt** (most recent status change across all platforms)

**ID Usage Pattern:**
- ✅ **`releaseId`** is included for linking back to the source release page
- ✅ **`distributionId`** (from `id` field) drives all Distribution Management operations
- ✅ Each distribution's `id` is used for:
  - Submit to stores: `POST /distributions/:id/submit`
  - View details: `GET /distributions/:id`
  - All rollout operations (via submission IDs from nested `submissions` array)

**`submissions`** Array (nested in each distribution):
- **Returns ONLY the latest/current submission per platform** (not historical submissions)
- Each submission includes:
  - `id`: Submission ID
  - `platform`: ANDROID or IOS
  - `status`: Submission status (PENDING, IN_REVIEW, APPROVED, LIVE, PAUSED, REJECTED, HALTED, CANCELLED)
  - `rolloutPercentage`: Current rollout percentage (0-100)
  - `statusUpdatedAt`: Last status change timestamp for this submission
  - `isActive`: Always `true` in list view (since only current submissions are returned)

**`pagination`** Object:
- Standard pagination metadata

**`stats`** Object (at top level of `data`):
- `totalDistributions`: Total count of all distributions
- `totalSubmissions`: Total count of all submissions across all distributions
- `inReviewSubmissions`: Count of submissions with IN_REVIEW status
- `releasedSubmissions`: Count of submissions with LIVE status at 100% exposure

---

**Stats Calculation (CRITICAL):**
```javascript
// MUST calculate from ALL distributions (not just current page)
const allDistributions = await getAllDistributions();

// Total distributions
stats.totalDistributions = allDistributions.length;

// Total submissions across all distributions (only latest per platform)
stats.totalSubmissions = allDistributions.reduce((sum, d) => 
  sum + d.submissions.length, 0
);

// Count submissions with IN_REVIEW status
stats.inReviewSubmissions = allDistributions.reduce((sum, d) => 
  sum + d.submissions.filter(s => s.status === 'IN_REVIEW').length, 0
);

// Count submissions with LIVE status at 100% exposure
stats.releasedSubmissions = allDistributions.reduce((sum, d) => 
  sum + d.submissions.filter(s => 
    s.status === 'LIVE' && s.rolloutPercentage === 100
  ).length, 0
);
```

**Important Notes:**
- ✅ `submissions` array contains **ONLY the latest/current submission per platform**
- ✅ Historical/past submissions are NOT returned in the list endpoint
- ✅ Distribution's `statusUpdatedAt` is calculated as **max of all submissions' statusUpdatedAt**
- ✅ Stats are at the **top level** of `data` (not per distribution)
- ✅ Stats are calculated from **ALL distributions** (not just the current page)

---

### 3. Submit Existing Submission to Store

Submit an existing PENDING submission to the store (first-time submission).

**Use Case:** When distribution is created, submissions are auto-created with PENDING status. User fills in details and submits each submission individually.

**Endpoint:**
```
PUT /api/v1/tenants/:tenantId/submissions/:submissionId/submit?platform=<ANDROID|IOS>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant/Organization ID (required for tenant isolation and validation) |
| `submissionId` | string | **Yes** | Submission ID to submit |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to query (iOS and Android submissions are in separate tables) |

**Request Body (Android):**
```json
{
  "rolloutPercentage": 5,
  "inAppUpdatePriority": 0,
  "releaseNotes": "Bug fixes and performance improvements"
}
```

**Request Body (iOS):**
```json
{
  "phasedRelease": true,
  "resetRating": false,
  "releaseNotes": "Bug fixes and performance improvements"
}
```

**Request Fields:**

**For Android Submission:**
- `rolloutPercentage`: `float` (0-100, supports decimals like 5.5, 27.3) - Initial rollout percentage
- `inAppUpdatePriority`: `number` (0-5) - In-app update priority
- `releaseNotes`: `string` - Release notes for users

**For iOS Submission:**
- `phasedRelease`: `boolean` - Enable 7-day phased rollout
- `resetRating`: `boolean` - Reset app rating with this version
- `releaseNotes`: `string` - Release notes for users

**Notes:**
- ✅ Submission **already exists** with PENDING status (auto-created with distribution)
- ✅ Submission **already has platform and artifact** associated
- ⚠️ **MUST provide `platform` query parameter** - Required because iOS and Android submissions are stored in separate database tables
- ✅ Artifact (AAB/TestFlight build) is already linked from pre-release

**Response (Android):**
```json
{
  "success": true,
  "data": {
    "id": "sub_789",
    "distributionId": "dist_123",
    "platform": "ANDROID",
    "storeType": "PLAY_STORE",
    "status": "IN_REVIEW",
    "version": "2.7.0",
    "versionCode": 270,
    "rolloutPercentage": 5,
    "inAppUpdatePriority": 0,
    "releaseNotes": "Bug fixes and performance improvements",
    "submittedAt": "2025-12-14T10:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T10:00:00Z",
    "createdAt": "2025-12-14T09:00:00Z",
    "updatedAt": "2025-12-14T10:00:00Z",
    "artifact": {
      "artifactPath": "https://s3.amazonaws.com/presigned-url/app-release.aab",
      "internalTrackLink": "https://play.google.com/apps/testing/com.app"
    },
    "actionHistory": []
  }
}
```

**Response (iOS):**
```json
{
  "success": true,
  "data": {
    "id": "sub_012",
    "distributionId": "dist_123",
    "platform": "IOS",
    "storeType": "APP_STORE",
    "status": "IN_REVIEW",
    "version": "2.7.0",
    "releaseType": "AFTER_APPROVAL",
    "phasedRelease": true,
    "resetRating": false,
    "rolloutPercentage": 0,
    "releaseNotes": "Bug fixes and performance improvements",
    "submittedAt": "2025-12-14T10:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T10:00:00Z",
    "createdAt": "2025-12-14T09:00:00Z",
    "updatedAt": "2025-12-14T10:00:00Z",
    "artifact": {
      "testflightNumber": 56789
    },
    "actionHistory": []
  }
}
```

**What Happens:**
1. Backend finds submission by `submissionId` (already exists with PENDING status)
2. Validates submission is in PENDING state
3. Updates submission with provided details (rolloutPercentage, releaseNotes, etc.)
4. Changes `status` from PENDING → IN_REVIEW
5. Sets `submittedAt` = current timestamp
6. Sets `submittedBy` = current user email
7. Updates `statusUpdatedAt` = current timestamp
8. Calls store API (Google Play / App Store Connect) to submit
9. Returns updated submission object

**Critical Requirements:**
- ✅ Submission **must exist** and be in PENDING status
- ✅ Submission **already has artifact** linked (from pre-release)
- ✅ Only **updates details** and changes status to IN_REVIEW
- ✅ Returns **single submission object** (not array)
- ✅ Platform is known from submissionId (no need to specify)

**Error Cases:**
- `400` - Invalid request (invalid field values)
- `403` - Unauthorized (tenant validation failed)
- `404` - Submission not found
- `409` - Conflict (submission not in PENDING state, version conflict, already submitted)

---

### 4. Get Distribution Details

Get full details for a specific distribution with all submissions and artifacts.

**Endpoint:**
```
GET /api/v1/tenants/:tenantId/distributions/:distributionId
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant/Organization ID (required for tenant isolation and validation) |
| `distributionId` | string | **Yes** | Distribution ID to retrieve |

**Use Case:**
- Distribution management page
- View complete distribution history
- Access all submissions (current and historical)
- Check artifact details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dist_123",
    "releaseId": "rel_456",
    "branch": "main",
    "status": "PARTIALLY_RELEASED",
    "platforms": ["ANDROID", "IOS"],
    "createdAt": "2025-12-14T09:00:00Z",
    "updatedAt": "2025-12-14T12:00:00Z",
    "submissions": [
      {
        "id": "sub_789",
        "distributionId": "dist_123",
        "platform": "ANDROID",
        "storeType": "PLAY_STORE",
        "status": "LIVE",
        "version": "2.7.0",
        "versionCode": 270,
        "rolloutPercentage": 100,
        "inAppUpdatePriority": 0,
        "releaseNotes": "Bug fixes and performance improvements",
        "submittedAt": "2025-12-14T10:00:00Z",
        "submittedBy": "prince@dream11.com",
        "statusUpdatedAt": "2025-12-14T12:00:00Z",
        "createdAt": "2025-12-14T09:00:00Z",
        "updatedAt": "2025-12-14T12:00:00Z",
        "isActive": true,
        "artifact": {
          "artifactPath": "https://s3.amazonaws.com/presigned-url/app-release.aab",
          "internalTrackLink": "https://play.google.com/apps/testing/com.app"
        },
        "actionHistory": []
      },
      {
        "id": "sub_012",
        "distributionId": "dist_123",
        "platform": "IOS",
        "storeType": "APP_STORE",
        "status": "IN_REVIEW",
        "version": "2.7.0",
        "releaseType": "AFTER_APPROVAL",
        "phasedRelease": true,
        "resetRating": false,
        "rolloutPercentage": 0,
        "releaseNotes": "Bug fixes and performance improvements",
        "submittedAt": "2025-12-14T10:00:00Z",
        "submittedBy": "prince@dream11.com",
        "statusUpdatedAt": "2025-12-14T10:00:00Z",
        "createdAt": "2025-12-14T09:00:00Z",
        "updatedAt": "2025-12-14T10:00:00Z",
        "isActive": true,
        "artifact": {
          "testflightNumber": 56789
        },
        "actionHistory": []
      }
    ]
  }
}
```

**Response Fields:**

**Distribution Object** (top level `data`):
- `id`: Distribution ID
- `releaseId`: Associated release ID
- `branch`: Git branch
- `status`: Distribution status (PENDING → PARTIALLY_SUBMITTED → SUBMITTED → PARTIALLY_RELEASED → RELEASED)
- `platforms`: Array of platforms configured
- `createdAt`: Distribution creation timestamp
- `updatedAt`: Last update timestamp

**`submissions`** Array: **ALL submissions for this distribution** (current and historical)
- Includes both latest submissions and past submissions (if resubmitted after rejection/cancellation)
- Each submission includes:
  - Basic info: `id`, `distributionId`, `platform`, `storeType`, `status`, `version`
  - Rollout: `rolloutPercentage` (0-100)
  - Metadata: `releaseNotes`, `submittedAt`, `submittedBy`, `statusUpdatedAt`
  - Timestamps: `createdAt`, `updatedAt`
  - **`isActive`**: `boolean` - Indicates if this is the current submission for the platform
    - **`true`**: Current/latest submission (PENDING, IN_REVIEW, APPROVED, LIVE, PAUSED, HALTED)
    - **`false`**: Historical submission (REJECTED or CANCELLED *after* user created a resubmission)
    - **Note**: HALTED remains `isActive: true` (terminal state, cannot resubmit within same distribution)
  - Platform-specific fields:
    - **Android**: `versionCode`, `inAppUpdatePriority` (0-5)
    - **iOS**: `releaseType` (always "AFTER_APPROVAL"), `phasedRelease`, `resetRating`
  - **`artifact`** Object (nested in each submission):
    - **Android**: 
      - `artifactPath`: Presigned S3 URL to download AAB
      - `internalTrackLink`: Google Play internal testing link (optional)
    - **iOS**: 
      - `testflightNumber`: TestFlight build number
  - **`actionHistory`** Array (audit trail):
    - `action`: "PAUSED" | "RESUMED" | "CANCELLED" | "HALTED"
    - `createdBy`: Email of user who performed the action
    - `createdAt`: ISO timestamp
    - `reason`: User-provided reason
    - Empty array `[]` if no manual actions taken
    - **Note**: Logs actions taken (e.g., "RESUMED"), separate from current `status` (e.g., "LIVE")

**Notes:**
- ✅ Returns **ALL submissions** including historical ones (not just latest per platform)
- ✅ Each submission includes full artifact details and action history
- ✅ Identical structure to `GET /api/v1/releases/:releaseId/distribution`
- ✅ Use this endpoint for distribution management page
- ✅ Distribution has NO version field - version exists only in submissions

---

### 5. Get Submission Details

Get full details for a specific submission with artifact information.

**Endpoint:**
```
GET /api/v1/tenants/:tenantId/submissions/:submissionId?platform=<ANDROID|IOS>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant/Organization ID (required for tenant isolation and validation) |
| `submissionId` | string | **Yes** | Submission ID to retrieve |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to query (iOS and Android submissions are in separate tables) |

**Use Case:**
- Submission details page
- View complete submission information
- Access artifact details
- Check submission history

**Response (Android):**
```json
{
  "success": true,
  "data": {
    "id": "sub_789",
    "distributionId": "dist_123",
    "platform": "ANDROID",
    "storeType": "PLAY_STORE",
    "status": "LIVE",
    "version": "2.7.0",
    "versionCode": 270,
    "rolloutPercentage": 50,
    "inAppUpdatePriority": 0,
    "releaseNotes": "Bug fixes and performance improvements",
    "submittedAt": "2025-12-14T10:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T12:00:00Z",
    "createdAt": "2025-12-14T10:00:00Z",
    "updatedAt": "2025-12-14T14:00:00Z",
    "isActive": true,
    "artifact": {
      "artifactPath": "https://s3.amazonaws.com/presigned-url/app-release.aab",
      "internalTrackLink": "https://play.google.com/apps/testing/com.app"
    },
    "actionHistory": []
  }
}
```

**Response (iOS):**
```json
{
  "success": true,
  "data": {
    "id": "sub_012",
    "distributionId": "dist_123",
    "platform": "IOS",
    "storeType": "APP_STORE",
    "status": "LIVE",
    "version": "2.7.0",
    "releaseType": "AFTER_APPROVAL",
    "phasedRelease": true,
    "resetRating": false,
    "rolloutPercentage": 15,
    "releaseNotes": "Bug fixes and performance improvements",
    "submittedAt": "2025-12-14T10:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T12:00:00Z",
    "createdAt": "2025-12-14T10:00:00Z",
    "updatedAt": "2025-12-14T14:00:00Z",
    "isActive": true,
    "artifact": {
      "testflightNumber": 56789
    },
    "actionHistory": [
      {
        "action": "PAUSED",
        "createdBy": "prince@dream11.com",
        "createdAt": "2025-12-14T11:00:00Z",
        "reason": "Found critical bug in phased rollout"
      },
      {
        "action": "RESUMED",
        "createdBy": "prince@dream11.com",
        "createdAt": "2025-12-14T11:30:00Z",
        "reason": "Bug fixed and verified in TestFlight"
      }
    ]
  }
}
```

**Response Fields:**

**Common Fields** (all submissions):
- `id`: Submission ID
- `distributionId`: Parent distribution ID
- `platform`: ANDROID or IOS
- `storeType`: PLAY_STORE or APP_STORE
- `status`: Submission status (PENDING, IN_REVIEW, APPROVED, LIVE, PAUSED, REJECTED, HALTED, CANCELLED)
- `version`: Version number
- `rolloutPercentage`: Current rollout percentage (0-100)
- `releaseNotes`: Release notes for users
- `submittedAt`: When submitted to store (null if PENDING)
- `submittedBy`: Email of user who submitted (null if PENDING)
- `statusUpdatedAt`: Last status change timestamp
- `createdAt`: Submission creation timestamp
- `updatedAt`: Last update timestamp
- `isActive`: Boolean - `true` for current submission (PENDING, IN_REVIEW, APPROVED, LIVE, PAUSED, HALTED), `false` for historical submissions (REJECTED/CANCELLED after resubmission)

**Android-Specific Fields:**
- `versionCode`: Android version code (integer)
- `inAppUpdatePriority`: In-app update priority (0-5)

**iOS-Specific Fields:**
- `releaseType`: Always "AFTER_APPROVAL" (display-only)
- `phasedRelease`: Boolean - 7-day phased rollout enabled
- `resetRating`: Boolean - Reset app rating with this version

**`artifact`** Object (nested):
- **Android**: 
  - `artifactPath`: Presigned S3 URL to download AAB
  - `internalTrackLink`: Google Play internal testing link (optional - only for first submission)
- **iOS**: 
  - `testflightNumber`: TestFlight build number

**Notes:**
- ✅ Returns complete submission details with all fields
- ✅ Includes full artifact information
- ✅ Platform-specific fields included based on platform
- ✅ Consistent structure with other submission responses

---

### 6. Update Rollout Percentage

Increase/decrease rollout percentage for a submission (platform-specific rules apply).

**Endpoint:**
```
PATCH /api/v1/tenants/:tenantId/submissions/:submissionId/rollout?platform=<ANDROID|IOS>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant/Organization ID (required for tenant isolation and validation) |
| `submissionId` | string | **Yes** | Submission ID to update |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to update (iOS and Android submissions are in separate tables) |

**Request:**
```json
{
  "rolloutPercentage": 25.5
}
```

**Platform-Specific Rules:**

**Android:**
- ✅ Can rollout to **any percentage** between 0.01-100
- ✅ Supports **decimal values** (e.g., 0.01, 5.5, 27.3, 99.9)
- ✅ Manual control of rollout percentage (minimum: 0.01%)
- 📝 Typical progression: 5% → 10% → 25% → 50% → 100%

**✅ Correct iOS Behavior Matrix:**

| phasedRelease | Rollout % | Can Update? | Can Pause? | Why? |
|---------------|-----------|-------------|------------|------|
| `true` | 1-99% | ✅ Yes (to 100%) | ✅ Yes | Phased release with controls |
| `true` | 100% | ❌ No | ❌ No | Already complete |
| `false` | 100% | ❌ No | ❌ No | Manual release (instant 100%, no controls) |
| `false` | <100% | ❌ INVALID | ❌ INVALID | **This shouldn't exist!** (Prevented by validation) |

**iOS with Manual Release (phasedRelease = false):**
- ✅ **Always 100%** from the moment of release
- ❌ Cannot use rollout endpoint (already at 100%)
- 📝 Immediate full release to all users

**iOS with Phased Release (phasedRelease = true):**
- ✅ Can update to **100% only** (to complete rollout early)
- ❌ Cannot set partial percentages manually
- ✅ Automatic 7-day phased rollout by Apple
- 📝 Can PAUSE/RESUME or skip to 100%

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sub_789",
    "rolloutPercentage": 25.5,
    "statusUpdatedAt": "2025-12-14T14:00:00Z"
  }
}
```

**Validation:**
- **Android**: `0.01 <= rolloutPercentage <= 100` (float, can increase or decrease, minimum: 0.01%)
- **iOS Phased (phasedRelease = true)**: `rolloutPercentage === 100` (can only skip to 100% to complete early)
- **iOS Manual (phasedRelease = false)**: Returns `409` (already at 100%, no rollout needed)

**Error Cases:**
- `400` - Invalid percentage
- `403` - Unauthorized (tenant validation failed)
- `409` - iOS manual release (already at 100%)
- `409` - iOS phased with value != 100 (can only skip to 100%)

**Note:** If all platforms reach 100%, distribution status auto-updates to 'RELEASED'

---

### 7. Create New Submission (Resubmission)

Create a completely new submission after rejection or cancellation. User provides all details including new artifact.

**Use Case:** After a submission is rejected or cancelled, user wants to submit again with a new build/artifact.

**UX Flow:**
1. User clicks "Resubmit" on a rejected/cancelled submission
2. Frontend pre-fills form with previous submission data
3. User edits any fields and uploads new artifact (AAB or provides new TestFlight build)
4. User submits form
5. API creates a completely new submission with new ID

**Frontend Pre-fill Logic:**

**Fields to Copy (Auto-populated from previous submission):**
- ✅ `releaseNotes` - Copy previous release notes
- ✅ `inAppUpdatePriority` - Copy previous priority (Android only)
- ✅ `phasedRelease` - Copy previous phased release setting (iOS only)
- ✅ `resetRating` - Copy previous reset rating setting (iOS only)
- ✅ `rolloutPercentage` - Copy previous rollout percentage (Android only)

**Fields to Reset (User must provide new):**
- 🔄 `artifact` - **Must provide NEW artifact** (AAB file or TestFlight build number)
- 🔄 `version` - User can update version number
- 🔄 `versionCode` - Optional (extracted from AAB if not provided)
- 🔄 `status` - Will be IN_REVIEW (managed by backend)
- 🔄 All timestamps - Managed by backend (createdAt, submittedAt, etc.)

**Endpoint:**
```
POST /api/v1/tenants/:tenantId/distributions/:distributionId/submissions
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant/Organization ID (required for tenant isolation and validation) |
| `distributionId` | string | **Yes** | Distribution ID to create submission for |

**Request (Android):**
```json
{
  "platform": "ANDROID",
  "version": "2.7.1",
  "aabFile": "<multipart file upload>",
  "rolloutPercentage": 5.0,
  "inAppUpdatePriority": 1,
  "releaseNotes": "Fixed critical bugs from previous submission"
}
```

**Note:** `versionCode` is optional - backend will extract it from the AAB manifest if not provided.

**Request (iOS):**
```json
{
  "platform": "IOS",
  "version": "2.7.1",
  "testflightNumber": 56790,
  "phasedRelease": true,
  "resetRating": false,
  "releaseNotes": "Fixed issues from rejected build"
}
```

**Request Fields:**

**Common Fields** (both platforms):
- `platform`: `"ANDROID" | "IOS"` (required)
- `version`: `string` - Version number (e.g., "2.7.1") (required)
- `releaseNotes`: `string` (required)

**Android-Specific:**
- `versionCode`: `number` - Android version code (e.g., 271) (optional - extracted from AAB if not provided)
- `aabFile`: AAB bundle file (multipart/form-data upload) (required)
- `rolloutPercentage`: `float` (0-100) - Initial rollout percentage (required)
- `inAppUpdatePriority`: `number` (0-5) - In-app update priority (required)

**iOS-Specific:**
- `testflightNumber`: `number` - TestFlight build number (required)
- `phasedRelease`: `boolean` - Enable 7-day phased rollout (required)
- `resetRating`: `boolean` - Reset app rating (required)

**Content-Type:**
- Android: `multipart/form-data` (for AAB file upload)
- iOS: `application/json` (no file upload needed)

**Response (Android):**
```json
{
  "success": true,
  "data": {
    "id": "sub_new_123",
    "distributionId": "dist_123",
    "platform": "ANDROID",
    "storeType": "PLAY_STORE",
    "status": "IN_REVIEW",
    "version": "2.7.1",
    "versionCode": 271,
    "rolloutPercentage": 5.0,
    "inAppUpdatePriority": 1,
    "releaseNotes": "Fixed critical bugs from previous submission",
    "submittedAt": "2025-12-14T15:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T15:00:00Z",
    "createdAt": "2025-12-14T15:00:00Z",
    "updatedAt": "2025-12-14T15:00:00Z",
    "isActive": true,
    "artifact": {
      "artifactPath": "https://s3.amazonaws.com/new-build/app-release-v2.7.1.aab"
    },
    "actionHistory": []
  }
}
```

**Note:** For Android resubmissions, AAB is submitted **directly to production** (not internal testing), so `internalTrackLink` is NOT available.

**Response (iOS):**
```json
{
  "success": true,
  "data": {
    "id": "sub_new_456",
    "distributionId": "dist_123",
    "platform": "IOS",
    "storeType": "APP_STORE",
    "status": "IN_REVIEW",
    "version": "2.7.1",
    "releaseType": "AFTER_APPROVAL",
    "phasedRelease": true,
    "resetRating": false,
    "rolloutPercentage": 0.0,
    "releaseNotes": "Fixed issues from rejected build",
    "submittedAt": "2025-12-14T15:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T15:00:00Z",
    "createdAt": "2025-12-14T15:00:00Z",
    "updatedAt": "2025-12-14T15:00:00Z",
    "isActive": true,
    "artifact": {
      "testflightNumber": 56790
    },
    "actionHistory": []
  }
}
```

**What Happens:**
1. Backend creates a **completely new submission** with new ID
2. New artifact is uploaded/linked (new AAB or TestFlight build)
3. **Android**: AAB submitted **directly to production** (no internal testing track)
4. **iOS**: TestFlight build submitted to App Store review
5. Submission status: IN_REVIEW
6. Old submission remains in history (status: REJECTED or CANCELLED)
7. New submission becomes the active/current one for that platform

**Key Points:**
- ✅ Completely new submission (new ID, new artifact)
- ✅ Frontend pre-fills form with previous submission data for convenience
- ✅ User can edit any field before submitting
- ✅ User must provide new artifact (AAB file or TestFlight build)
- ✅ Immediately submitted to store (status: IN_REVIEW, not PENDING)
- ✅ Old submission preserved in history (status: REJECTED or CANCELLED)
- ✅ New submission becomes the active/current one for that platform
- ✅ Platform-specific payloads

---

### 8. Cancel Submission

Cancel an in-review submission.

**Endpoint:**
```
PATCH /api/v1/tenants/:tenantId/submissions/:submissionId/cancel?platform=<ANDROID|IOS>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant/Organization ID (required for tenant isolation and validation) |
| `submissionId` | string | **Yes** | Submission ID to cancel |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to update (iOS and Android submissions are in separate tables) |

**Request (Optional):**
```json
{
  "reason": "Found critical bug in this build"
}
```

**Request Fields:**
- `reason`: `string` (optional) - Reason for cancellation

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sub_789",
    "status": "CANCELLED",
    "statusUpdatedAt": "2025-12-14T15:00:00Z"
  }
}
```

---

### 9. Pause Rollout (Both Platforms)

Pause an active rollout.

**Endpoint:**
```
PATCH /api/v1/tenants/:tenantId/submissions/:submissionId/rollout/pause?platform=<ANDROID|IOS>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant/Organization ID (required for tenant isolation and validation) |
| `submissionId` | string | **Yes** | Submission ID to pause |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to update (iOS and Android submissions are in separate tables) |

**Request:**
```json
{
  "reason": "Critical bug detected"
}
```

**Request Fields:**
- `reason`: `string` (required) - Reason for pausing the rollout

**Response (Android):**
```json
{
  "success": true,
  "data": {
    "id": "sub_789",
    "status": "HALTED",
    "statusUpdatedAt": "2025-12-14T15:00:00Z"
  }
}
```

**Response (iOS):**
```json
{
  "success": true,
  "data": {
    "id": "sub_012",
    "status": "PAUSED",
    "statusUpdatedAt": "2025-12-14T15:00:00Z"
  }
}
```

**Notes:**
- **Android**: Status changes from `IN_PROGRESS` → `HALTED` (displayed as "Rollout Paused" in UI)
- **iOS**: Status changes from `LIVE` → `PAUSED` (displayed as "Rollout Paused" in UI)
- Both statuses are displayed identically in the UI for consistency

---

### 10. Resume Rollout (Both Platforms)

Resume a paused rollout.

**Endpoint:**
```
PATCH /api/v1/tenants/:tenantId/submissions/:submissionId/rollout/resume?platform=<ANDROID|IOS>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant/Organization ID (required for tenant isolation and validation) |
| `submissionId` | string | **Yes** | Submission ID to resume |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to update (iOS and Android submissions are in separate tables) |

**Response (Android):**
```json
{
  "success": true,
  "data": {
    "id": "sub_789",
    "status": "IN_PROGRESS",
    "statusUpdatedAt": "2025-12-14T15:30:00Z"
  }
}
```

**Response (iOS):**
```json
{
  "success": true,
  "data": {
    "id": "sub_012",
    "status": "LIVE",
    "statusUpdatedAt": "2025-12-14T15:30:00Z"
  }
}
```

**Notes:**
- **Android**: Status changes from `HALTED` → `IN_PROGRESS`
- **iOS**: Status changes from `PAUSED` → `LIVE`

---

### 11. Download Submission Artifact

Get a presigned URL to download the submission artifact (AAB for Android, IPA for iOS).

**Endpoint:**
```
GET /api/v1/tenants/:tenantId/submissions/:submissionId/artifact?platform=<ANDROID|IOS>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant/Organization ID (required for tenant isolation and validation) |
| `submissionId` | string | **Yes** | Submission ID to download artifact for |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to query and which artifact to return |

**Use Case:**
- User clicks "Download" button on submission card
- Client calls this API with submissionId and platform
- Backend returns presigned S3 URL
- Client opens presigned URL in new tab/window to trigger download

**Response (Android):**
```json
{
  "success": true,
  "data": {
    "presignedUrl": "https://s3.amazonaws.com/bucket/artifacts/app-release.aab?X-Amz-Algorithm=...",
    "expiresAt": "2025-12-14T17:00:00Z",
    "filename": "app-release-v2.7.0-270.aab"
  }
}
```

**Response (iOS):**
```json
{
  "success": true,
  "data": {
    "presignedUrl": "https://s3.amazonaws.com/bucket/artifacts/app.ipa?X-Amz-Algorithm=...",
    "expiresAt": "2025-12-14T17:00:00Z",
    "filename": "app-v2.7.0.ipa"
  }
}
```

**Response Fields:**
- `presignedUrl`: `string` - S3 presigned URL for downloading the artifact (valid for 1 hour)
- `expiresAt`: `string` (ISO 8601) - When the presigned URL expires
- `filename`: `string` - Suggested filename for download

**Error Response (Artifact Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "ARTIFACT_NOT_FOUND",
    "message": "No artifact found for this submission"
  }
}
```

---

## Database Schema

### store_distribution
```sql
CREATE TABLE store_distribution (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    releaseId VARCHAR(255) NOT NULL,
    status ENUM('PENDING', 'PARTIALLY_SUBMITTED', 'SUBMITTED', 'PARTIALLY_RELEASED', 'RELEASED') DEFAULT 'PENDING',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (releaseId) REFERENCES release(id),
    UNIQUE KEY (releaseId),
    INDEX idx_tenant_status (tenantId, status)
);
```

**Note:** `version` and `branch` fields are derived from the `release` table via the `releaseId` foreign key.

### android_submission_builds
```sql
CREATE TABLE android_submission_builds (
    id VARCHAR(255) PRIMARY KEY,
    distributionId VARCHAR(255) NOT NULL,
    buildId VARCHAR(255) NOT NULL,
    isCurrent BOOLEAN DEFAULT TRUE,  -- Maps to isActive in API responses
    
    -- Version
    version VARCHAR(20) NOT NULL,
    versionCode INT NOT NULL,
    
    -- Build
    buildType ENUM('MANUAL', 'CI_CD') NOT NULL,
    internalTrackLink VARCHAR(255) NULL,
    artifactPath TEXT NULL,
    
    -- Store
    storeType VARCHAR(20) NOT NULL DEFAULT 'PLAY_STORE',
    track VARCHAR(50) NULL,
    
    -- Status
    status ENUM('PENDING', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'HALTED', 'USER_ACTION_PENDING', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    rolloutPercentage DECIMAL(5,2) NOT NULL DEFAULT 0.01,  -- Minimum 0.01%, not 0
    
    -- Metadata
    releaseNotes TEXT NULL,
    inAppUpdatePriority INT NULL,
    createdBy VARCHAR(50) NOT NULL,
    actionHistory JSON NULL,  -- Audit trail: [{action, createdBy, createdAt, reason}]
    
    -- Timestamps
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    submittedAt TIMESTAMP NULL,
    submittedBy VARCHAR(255) NULL,
    statusUpdatedAt TIMESTAMP NULL,
    releasedAt TIMESTAMP NULL,
    
    FOREIGN KEY (distributionId) REFERENCES store_distribution(id),
    FOREIGN KEY (buildId) REFERENCES build(id),
    INDEX idx_current (distributionId, isCurrent),
    INDEX idx_status (status)
);
```

### ios_submission_builds
```sql
CREATE TABLE ios_submission_builds (
    id VARCHAR(255) PRIMARY KEY,
    distributionId VARCHAR(255) NOT NULL,
    buildId VARCHAR(255) NOT NULL,
    isCurrent BOOLEAN DEFAULT TRUE,  -- Maps to isActive in API responses
    
    -- Version
    testflightNumber VARCHAR(255) NULL,  -- Renamed from testflightBuildNumber
    version VARCHAR(20) NOT NULL,
    
    -- Build
    buildType ENUM('MANUAL', 'CI_CD') NOT NULL,
    
    -- Store
    storeType VARCHAR(20) NOT NULL DEFAULT 'APP_STORE',
    releaseType VARCHAR(20) NOT NULL DEFAULT 'AFTER_APPROVAL',
    
    -- Status
    status ENUM('PENDING', 'IN_REVIEW', 'APPROVED', 'LIVE', 'PAUSED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    rolloutPercentage DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    
    -- Metadata
    releaseNotes TEXT NULL,
    phasedRelease BOOLEAN NULL,
    resetRating BOOLEAN NULL,
    createdBy VARCHAR(50) NOT NULL,
    actionHistory JSON NULL,  -- Audit trail: [{action, createdBy, createdAt, reason}]
    
    -- Timestamps
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    submittedAt TIMESTAMP NULL,
    submittedBy VARCHAR(255) NULL,
    statusUpdatedAt TIMESTAMP NULL,
    releasedAt TIMESTAMP NULL,
    
    FOREIGN KEY (distributionId) REFERENCES store_distribution(id),
    FOREIGN KEY (buildId) REFERENCES build(id),
    INDEX idx_current (distributionId, isCurrent),
    INDEX idx_status (status)
);
```

---

## Error Response Format

**Standard Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VERSION_EXISTS",
    "message": "Version 2.7.0 already exists in Play Store",
    "category": "CONFLICT",
    "httpStatus": 409,
    "details": {
      "platform": "ANDROID",
      "version": "2.7.0",
      "existingStatus": "LIVE"
    }
  }
}
```

**Error Categories:**
- `VALIDATION` - Invalid input (400)
- `AUTH` - Authentication/authorization (401, 403)
- `NOT_FOUND` - Resource not found (404)
- `CONFLICT` - Business logic conflict (409)
- `EXTERNAL` - External service error (502, 503)
- `INTERNAL` - Server error (500)

---

## Implementation Checklist

### Phase 1: Core APIs
- [ ] `GET /api/v1/releases/:releaseId/distribution`
- [ ] `GET /api/v1/distributions` (with pagination & stats)
- [ ] `PUT /api/v1/distributions/:distributionId/submit`
- [ ] `GET /api/v1/distributions/:distributionId`
- [ ] `GET /api/v1/submissions/:submissionId`

### Phase 2: Rollout Control
- [ ] `PATCH /api/v1/submissions/:submissionId/rollout`
- [ ] `PATCH /api/v1/submissions/:submissionId/rollout/pause` (both Android and iOS)
- [ ] `PATCH /api/v1/submissions/:submissionId/rollout/resume` (both Android and iOS)

### Phase 3: Additional Features
- [ ] `POST /api/v1/distributions/:distributionId/submissions` (resubmission)
- [ ] `PATCH /api/v1/submissions/:submissionId/cancel`

### Database
- [ ] Create tables with correct schema
- [ ] Add indexes
- [ ] Add foreign keys
- [ ] Seed test data

---

## Testing Recommendations

### Unit Tests
- Distribution status calculation logic
- Stats aggregation (from all items, not page)
- Submission retry logic (`isCurrent` flag)

### Integration Tests
- Full submit flow (distribution → submissions)
- Pagination (verify stats consistent across pages)
- Rollout progression (5% → 25% → 50% → 100%)
- Error cases (version conflict, PM not approved)

### Load Tests
- List endpoint with 1000+ distributions
- Concurrent rollout updates
- Polling endpoint performance

---

## Architectural Clarifications (Important!)

### What's Included vs What's NOT

#### ✅ **Artifacts Belong to Submissions**
```json
{
  "distribution": {
    "id": "dist_123",
    "submissions": [
      {
        "id": "sub_123",
        "platform": "ANDROID",
        "artifact": {               // ← Artifact HERE (per submission)
          "artifactPath": "...",
          "internalTrackLink": "..."
        }
      }
    ]
  }
}
```
- ✅ Each submission has its own `artifact` object
- ❌ Distribution does NOT have an `artifacts` field
- ✅ Access via: `submission.artifact`

#### ✅ **Action History is Auto-Populated**
- Backend automatically logs: PAUSED, RESUMED, CANCELLED, HALTED
- `status` field = current state (e.g., "LIVE")
- `actionHistory` array = audit trail of actions taken
- Example: After RESUME, `status` = "LIVE" but `actionHistory` logs ["PAUSED", "RESUMED"]

#### ✅ **releaseId Usage Pattern**
- **List endpoint** (`GET /api/v1/distributions`): 
  - ❌ Does NOT include `releaseId`
  - ✅ Only includes `distributionId` (from `id` field)
- **Detail endpoint** (`GET /api/v1/releases/:releaseId/distribution`):
  - ✅ Includes both `id` (distributionId) and `releaseId`
  - Use `releaseId` for initial fetch, then use `distributionId` for everything else

#### 🔴 **Rejection Details (Not Yet Implemented)**
- Current: Only `status: "REJECTED"` is available
- Future: Will add `rejectionReason` and `rejectionDetails` fields
- Frontend: Has hardcoded fallback until backend implements
- No blocker for testing

---

**This specification is complete and ready for implementation.**

