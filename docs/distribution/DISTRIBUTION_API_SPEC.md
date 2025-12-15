# Distribution Module - API Specification

**Version**: 1.0  
**Date**: December 14, 2025  
**Status**: ✅ **IMPLEMENTED & PRODUCTION READY**

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
- **Status Logic**: 
  - `PENDING`: No submissions made yet
  - `PARTIALLY_SUBMITTED`: At least 1 (but not all) submissions made
  - `SUBMITTED`: All configured platforms submitted to stores
  - `PARTIALLY_RELEASED`: At least 1 submission is LIVE (not all at 100%)
  - `RELEASED`: All submissions LIVE at 100% rollout

### Submission
- **Created**: Automatically when distribution is created (one per configured platform)
- **Initial Status**: PENDING (not yet submitted to store)
- **Purpose**: Track single platform submission (Android OR iOS)
- **Lifecycle**: Platform-specific (see below)
- **Relationship**: 1 Submission : 1 Platform : 1 Store

#### Android Submission Lifecycle
```
PENDING → IN_REVIEW → APPROVED → LIVE
             ↓            ↓          ↓
         REJECTED     REJECTED    HALTED (emergency stop)
             ↓            ↓          ↓
         CANCELLED    CANCELLED   (terminal states)
```
- **Initial Status**: PENDING (created with distribution, not yet submitted)
- **Rollout Control**: Manual staged rollout with **any percentage** (0-100, supports decimals)
  - Examples: 5%, 10.5%, 27.3%, 50%, 99.9%, 100%
  - User has full control over rollout percentage
- **Can Pause**: ❌ No (but can halt in emergency)
- **Rollout Type**: Always manual staged rollout

#### iOS Submission Lifecycle
```
PENDING → IN_REVIEW → APPROVED → LIVE
             ↓            ↓          ↓
         REJECTED     REJECTED    PAUSED (phased rollout only)
             ↓            ↓          ↓
         CANCELLED    CANCELLED   HALTED (emergency stop)
```
- **Initial Status**: PENDING (created with distribution, not yet submitted)
- **Rollout Control**: 
  - **Phased Release (phasedRelease = true)**: 
    - Automatic 7-day rollout by Apple
    - ✅ Can update to **100% only** (to complete early)
    - ✅ Can PAUSE/RESUME
  - **Manual Release (phasedRelease = false)**: 
    - ✅ **Always 100%** immediately upon release
    - ❌ No rollout control needed (already at 100%)
    - ❌ Cannot pause
- **Can Pause**: ✅ Yes (only if phased release enabled)
- **Rollout Types**:
  - Phased Release: Automatic rollout over 7 days, can skip to 100%, pausable
  - Manual Release: Immediate 100%, no rollout control

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
  PENDING = 'PENDING',       // Created but not yet submitted to store
  IN_REVIEW = 'IN_REVIEW',   // Submitted, awaiting store review
  APPROVED = 'APPROVED',     // Store approved, ready to release
  LIVE = 'LIVE',             // Available to users (rollout in progress or complete)
  PAUSED = 'PAUSED',         // iOS only: Phased rollout paused by user
  REJECTED = 'REJECTED',     // Store rejected
  HALTED = 'HALTED',         // Emergency halt (terminal state)
  CANCELLED = 'CANCELLED'    // User cancelled before/during review
}
```

**Platform-Specific Notes**:
- **PENDING**: Initial status when submission is auto-created with distribution (not yet submitted to store)
- **PAUSED**: iOS only, only applicable when phased release is enabled
- **Android**: Uses staged rollout (manual % control), cannot pause
- **iOS Phased**: Automatic 7-day rollout, can pause/resume
- **iOS Manual**: Immediate release, cannot pause

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
- Use **rolloutPercent** (not rollout_percentage) - float 0-100 (supports decimals)
- Use **releaseNotes** (not what's_New_Text)
- Use **inAppPriority** (Android only) - integer 0-5
- Use **statusUpdatedAt** (not approved_at or rejected_at or cancelled_at)
- Use **submittedBy** - email of user who submitted
- Use **resetRating** (iOS only, not resetRatings) - boolean

---

## API Endpoints

### 1. Get Distribution by Release

Get the complete distribution entry with all submissions for a specific release.

**Endpoint:**
```
GET /api/v1/releases/:releaseId/distribution
```

**Use Case:** 
- Release process distribution step
- Display distribution status and submissions in release workflow
- Check if distribution exists before allowing submit

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
        "rolloutPercent": 5,
        "inAppPriority": 0,
        "releaseNotes": "Bug fixes",
        "submittedAt": "2025-12-14T10:00:00Z",
        "submittedBy": "prince@dream11.com",
        "statusUpdatedAt": "2025-12-14T10:00:00Z",
        "createdAt": "2025-12-14T10:00:00Z",
        "updatedAt": "2025-12-14T10:00:00Z",
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
        "releaseType": "AUTOMATIC",
        "phasedRelease": true,
        "resetRating": false,
        "rolloutPercent": 15,
        "releaseNotes": "Bug fixes",
        "submittedAt": "2025-12-14T10:00:00Z",
        "submittedBy": "prince@dream11.com",
        "statusUpdatedAt": "2025-12-14T12:00:00Z",
        "createdAt": "2025-12-14T10:00:00Z",
        "updatedAt": "2025-12-14T12:00:00Z",
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
        "rolloutPercent": 0,
        "inAppPriority": 0,
        "releaseNotes": "",
        "submittedAt": null,
        "submittedBy": null,
        "statusUpdatedAt": "2025-12-14T09:00:00Z",
        "createdAt": "2025-12-14T09:00:00Z",
        "updatedAt": "2025-12-14T09:00:00Z",
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
        "releaseType": "AUTOMATIC",
        "phasedRelease": false,
        "resetRating": false,
        "rolloutPercent": 0,
        "releaseNotes": "",
        "submittedAt": null,
        "submittedBy": null,
        "statusUpdatedAt": "2025-12-14T09:00:00Z",
        "createdAt": "2025-12-14T09:00:00Z",
        "updatedAt": "2025-12-14T09:00:00Z",
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
  - Rollout: `rolloutPercent` (0-100)
  - Metadata: `releaseNotes`, `submittedAt`, `submittedBy`, `statusUpdatedAt`
  - Platform-specific fields:
    - **Android**: `versionCode`, `inAppPriority` (0-5)
    - **iOS**: `releaseType` (always "AUTOMATIC", display only), `phasedRelease`, `resetRating`
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

**Important Field Notes:**
- **Distribution has NO version field**: Version information exists only in submissions
- **`inAppPriority`**: Android in-app update priority (0-5), not `priority`
- **`statusUpdatedAt`**: Last status change timestamp, not `statusChangedAt`
- **`submittedBy`**: Email of user who submitted
- **`resetRating`**: Boolean for iOS rating reset, not `resetRatings`
- **`releaseType`**: iOS only, always "AUTOMATIC" (display-only field, non-editable, default value)
- **`artifact.artifactPath`**: S3 path or URL to AAB file (was `buildUrl`)
- **`artifact.internalTrackLink`**: Optional Google Play internal testing link (was `internalTestingLink`) - present only for first submission, not for resubmissions
- **`artifact.testflightNumber`**: iOS TestFlight build number (was `testflightBuildNumber`)
- **`actionHistory`**: Audit trail for PAUSED/RESUMED/CANCELLED/HALTED actions; empty array if none

**Notes:**
- ✅ **Preferred endpoint** for release process distribution step
- Returns complete distribution with nested submissions **in one call**
- **Submissions are auto-created** when distribution is created (one per platform)
- **Initial submission status**: PENDING (not yet submitted to store)
- Each submission includes its artifact info (build URLs, TestFlight numbers)
- No separate `artifacts` object at distribution level - artifacts are per-submission
- No `availableActions` object - frontend calculates based on submission statuses
- **Submissions array is never empty** - always contains one entry per configured platform
- Used in release workflow to show distribution step progress

---

### 2. List All Distributions (Paginated)

Get paginated list of all distributions with submission summaries.

**Endpoint:**
```
GET /api/v1/distributions
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `pageSize` | integer | No | 10 | Items per page (max: 100) |
| `status` | string | No | - | Filter: PENDING, PARTIALLY_SUBMITTED, SUBMITTED, PARTIALLY_RELEASED, RELEASED |
| `platform` | string | No | - | Filter: ANDROID, IOS |

**Response:**
```json
{
  "success": true,
  "data": {
    "distributions": [
      {
        "id": "dist_123",
        "branch": "release/2.7.0",
        "status": "PENDING",
        "platforms": ["ANDROID", "IOS"],
        "submissions": [
          {
            "id": "sub_789",
            "platform": "ANDROID",
            "status": "IN_REVIEW",
            "rolloutPercent": 5,
            "statusUpdatedAt": "2025-12-14T10:30:00Z"
          },
          {
            "id": "sub_012",
            "platform": "IOS",
            "status": "APPROVED",
            "rolloutPercent": 0,
            "statusUpdatedAt": "2025-12-14T10:00:00Z"
          }
        ],
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
- `id`: Distribution ID
- `version`: Version number (e.g., "v2.7.0")
- `branch`: Git branch name (e.g., "release/2.7.0")
- `status`: Distribution status (PENDING, PARTIALLY_SUBMITTED, SUBMITTED, PARTIALLY_RELEASED, RELEASED)
- `platforms`: Array of platforms (["ANDROID", "IOS"])
- `statusUpdatedAt`: **Max of all submissions' statusUpdatedAt** (most recent status change across all platforms)

**`submissions`** Array (nested in each distribution):
- **Returns ONLY the latest/current submission per platform** (not historical submissions)
- Each submission includes:
  - `id`: Submission ID
  - `platform`: ANDROID or IOS
  - `status`: Submission status (PENDING, IN_REVIEW, APPROVED, LIVE, PAUSED, REJECTED, HALTED, CANCELLED)
  - `rolloutPercent`: Current rollout percentage (0-100)
  - `statusUpdatedAt`: Last status change timestamp for this submission

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
    s.status === 'LIVE' && s.rolloutPercent === 100
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
PUT /api/v1/submissions/:submissionId/submit?platform=<ANDROID|IOS>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to query (iOS and Android submissions are in separate tables) |

**Request Body (Android):**
```json
{
  "rolloutPercent": 5,
  "inAppPriority": 0,
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
- `rolloutPercent`: `float` (0-100, supports decimals like 5.5, 27.3) - Initial rollout percentage
- `inAppPriority`: `number` (0-5) - In-app update priority
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
    "rolloutPercent": 5,
    "inAppPriority": 0,
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
    "releaseType": "AUTOMATIC",
    "phasedRelease": true,
    "resetRating": false,
    "rolloutPercent": 0,
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
3. Updates submission with provided details (rolloutPercent, releaseNotes, etc.)
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
- `404` - Submission not found
- `409` - Conflict (submission not in PENDING state, version conflict, already submitted)

---

### 4. Get Distribution Details

Get full details for a specific distribution with all submissions and artifacts.

**Endpoint:**
```
GET /api/v1/distributions/:distributionId
```

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
        "rolloutPercent": 100,
        "inAppPriority": 0,
        "releaseNotes": "Bug fixes and performance improvements",
        "submittedAt": "2025-12-14T10:00:00Z",
        "submittedBy": "prince@dream11.com",
        "statusUpdatedAt": "2025-12-14T12:00:00Z",
        "createdAt": "2025-12-14T09:00:00Z",
        "updatedAt": "2025-12-14T12:00:00Z",
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
        "releaseType": "AUTOMATIC",
        "phasedRelease": true,
        "resetRating": false,
        "rolloutPercent": 0,
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
  - Rollout: `rolloutPercent` (0-100)
  - Metadata: `releaseNotes`, `submittedAt`, `submittedBy`, `statusUpdatedAt`
  - Timestamps: `createdAt`, `updatedAt`
  - Platform-specific fields:
    - **Android**: `versionCode`, `inAppPriority` (0-5)
    - **iOS**: `releaseType` (always "AUTOMATIC"), `phasedRelease`, `resetRating`
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
GET /api/v1/submissions/:submissionId?platform=<ANDROID|IOS>
```

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
    "rolloutPercent": 50,
    "inAppPriority": 0,
    "releaseNotes": "Bug fixes and performance improvements",
    "submittedAt": "2025-12-14T10:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T12:00:00Z",
    "createdAt": "2025-12-14T10:00:00Z",
    "updatedAt": "2025-12-14T14:00:00Z",
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
    "releaseType": "AUTOMATIC",
    "phasedRelease": true,
    "resetRating": false,
    "rolloutPercent": 15,
    "releaseNotes": "Bug fixes and performance improvements",
    "submittedAt": "2025-12-14T10:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T12:00:00Z",
    "createdAt": "2025-12-14T10:00:00Z",
    "updatedAt": "2025-12-14T14:00:00Z",
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
- `rolloutPercent`: Current rollout percentage (0-100)
- `releaseNotes`: Release notes for users
- `submittedAt`: When submitted to store (null if PENDING)
- `submittedBy`: Email of user who submitted (null if PENDING)
- `statusUpdatedAt`: Last status change timestamp
- `createdAt`: Submission creation timestamp
- `updatedAt`: Last update timestamp

**Android-Specific Fields:**
- `versionCode`: Android version code (integer)
- `inAppPriority`: In-app update priority (0-5)

**iOS-Specific Fields:**
- `releaseType`: Always "AUTOMATIC" (display-only)
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
PATCH /api/v1/submissions/:submissionId/rollout?platform=<ANDROID|IOS>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to update (iOS and Android submissions are in separate tables) |

**Request:**
```json
{
  "rolloutPercent": 25.5
}
```

**Platform-Specific Rules:**

**Android:**
- ✅ Can rollout to **any percentage** between 0-100
- ✅ Supports **decimal values** (e.g., 5.5, 27.3, 99.9)
- ✅ Manual control of rollout percentage
- 📝 Typical progression: 5% → 10% → 25% → 50% → 100%

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
    "rolloutPercent": 25.5,
    "statusUpdatedAt": "2025-12-14T14:00:00Z"
  }
}
```

**Validation:**
- **Android**: `0 <= rolloutPercent <= 100` (float, can increase or decrease)
- **iOS Phased (phasedRelease = true)**: `rolloutPercent === 100` (can only skip to 100% to complete early)
- **iOS Manual (phasedRelease = false)**: Returns `409` (already at 100%, no rollout needed)

**Error Cases:**
- `400` - Invalid percentage
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
- ✅ `inAppPriority` - Copy previous priority (Android only)
- ✅ `phasedRelease` - Copy previous phased release setting (iOS only)
- ✅ `resetRating` - Copy previous reset rating setting (iOS only)
- ✅ `rolloutPercent` - Copy previous rollout percentage (Android only)

**Fields to Reset (User must provide new):**
- 🔄 `artifact` - **Must provide NEW artifact** (AAB file or TestFlight build number)
- 🔄 `version` - User can update version number
- 🔄 `versionCode` - Optional (extracted from AAB if not provided)
- 🔄 `status` - Will be IN_REVIEW (managed by backend)
- 🔄 All timestamps - Managed by backend (createdAt, submittedAt, etc.)

**Endpoint:**
```
POST /api/v1/distributions/:distributionId/submissions
```

**Request (Android):**
```json
{
  "platform": "ANDROID",
  "version": "2.7.1",
  "aabFile": "<multipart file upload>",
  "rolloutPercent": 5.0,
  "inAppPriority": 1,
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
- `rolloutPercent`: `float` (0-100) - Initial rollout percentage (required)
- `inAppPriority`: `number` (0-5) - In-app update priority (required)

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
    "rolloutPercent": 5.0,
    "inAppPriority": 1,
    "releaseNotes": "Fixed critical bugs from previous submission",
    "submittedAt": "2025-12-14T15:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T15:00:00Z",
    "createdAt": "2025-12-14T15:00:00Z",
    "updatedAt": "2025-12-14T15:00:00Z",
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
    "releaseType": "AUTOMATIC",
    "phasedRelease": true,
    "resetRating": false,
    "rolloutPercent": 0.0,
    "releaseNotes": "Fixed issues from rejected build",
    "submittedAt": "2025-12-14T15:00:00Z",
    "submittedBy": "prince@dream11.com",
    "statusUpdatedAt": "2025-12-14T15:00:00Z",
    "createdAt": "2025-12-14T15:00:00Z",
    "updatedAt": "2025-12-14T15:00:00Z",
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
PATCH /api/v1/submissions/:submissionId/cancel?platform=<ANDROID|IOS>
```

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

### 9. Pause Rollout (iOS Only)

Pause an active rollout.

**Endpoint:**
```
PATCH /api/v1/submissions/:submissionId/rollout/pause?platform=IOS
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | Must be "IOS" - Required to identify which database table to update (iOS and Android submissions are in separate tables). Android does not support pause. |

**Request:**
```json
{
  "reason": "Critical bug detected"
}
```

**Request Fields:**
- `reason`: `string` (required) - Reason for pausing the rollout

**Response:**
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

---

### 10. Resume Rollout (iOS Only)

Resume a paused rollout.

**Endpoint:**
```
PATCH /api/v1/submissions/:submissionId/rollout/resume?platform=IOS
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | Must be "IOS" - Required to identify which database table to update (iOS and Android submissions are in separate tables). Android does not support resume. |

**Response:**
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

---

### 11. Emergency Halt

Immediately halt a release (cannot resubmit, must create new release).

**Endpoint:**
```
PATCH /api/v1/submissions/:submissionId/rollout/halt?platform=<ANDROID|IOS>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | "ANDROID" or "IOS" - Required to identify which database table to update (iOS and Android submissions are in separate tables) |

**Request:**
```json
{
  "reason": "Critical security vulnerability"
}
```

**Request Fields:**
- `reason`: `string` (required) - Reason for emergency halt

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sub_789",
    "status": "HALTED",
    "statusUpdatedAt": "2025-12-14T16:00:00Z"
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
    isCurrent BOOLEAN DEFAULT TRUE,
    
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
    status ENUM('PENDING', 'IN_REVIEW', 'APPROVED', 'LIVE', 'REJECTED', 'HALTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    rolloutPercent DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    
    -- Metadata
    releaseNotes TEXT NULL,
    inAppPriority INT NULL,
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
    isCurrent BOOLEAN DEFAULT TRUE,
    
    -- Version
    testflightNumber VARCHAR(255) NULL,  -- Renamed from testflightBuildNumber
    version VARCHAR(20) NOT NULL,
    
    -- Build
    buildType ENUM('MANUAL', 'CI_CD') NOT NULL,
    
    -- Store
    storeType VARCHAR(20) NOT NULL DEFAULT 'APP_STORE',
    releaseType VARCHAR(20) NOT NULL DEFAULT 'AUTOMATIC',
    
    -- Status
    status ENUM('PENDING', 'IN_REVIEW', 'APPROVED', 'LIVE', 'PAUSED', 'REJECTED', 'HALTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    rolloutPercent DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    
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
- [ ] `PATCH /api/v1/submissions/:submissionId/rollout/pause`
- [ ] `PATCH /api/v1/submissions/:submissionId/rollout/resume`
- [ ] `PATCH /api/v1/submissions/:submissionId/rollout/halt`

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

**This specification is complete and ready for implementation.**

