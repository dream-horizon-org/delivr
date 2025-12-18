# Mock Database Schema

This document describes the complete database structure used by the mock API server. The structure **exactly mirrors** the backend PostgreSQL database schema.

## 📊 Database Tables

### 1. **`releases`** - Release Information
Primary table for release records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key (e.g., `rel_001`) |
| `releaseId` | string | Business ID (e.g., `REL-2025-001`) |
| `tenantId` | string | Organization ID |
| `branch` | string | Git branch name (e.g., `release/3.0.0`) |
| `version` | string | Version number (e.g., `3.0.0`) |
| `status` | string | Release status |
| `platformTargetMappings` | array | Platforms targeted by this release |
| `createdAt` | ISO 8601 | Creation timestamp |
| `updatedAt` | ISO 8601 | Last update timestamp |

**Platform Target Mappings Structure:**
```json
{
  "id": "ptm_001_android",
  "releaseId": "rel_001",
  "platform": "ANDROID" | "IOS",
  "version": "3.0.0"
}
```

### 2. **`store_distribution`** - Distribution Records
Maps releases to their store distribution process.

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key (e.g., `dist_001`) |
| `tenantId` | string | Organization ID |
| `releaseId` | string | **Foreign key** → `releases.id` |
| `status` | enum | `PENDING`, `PARTIALLY_SUBMITTED`, `SUBMITTED`, `PARTIALLY_RELEASED`, `RELEASED` |
| `createdAt` | ISO 8601 | When distribution was created |
| `updatedAt` | ISO 8601 | Last status update |

**Foreign Keys:**
- `releaseId` → `releases.id` (one-to-one)

### 3. **`android_submission_builds`** - Android Submissions
All Android submissions (current + historical).

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key (e.g., `asb_001`) |
| `distributionId` | string | **Foreign key** → `store_distribution.id` |
| `releaseId` | string | **Foreign key** → `releases.id` |
| `tenantId` | string | Organization ID |
| `storeType` | string | Always `PLAY_STORE` |
| `status` | enum | `PENDING`, `IN_REVIEW`, `APPROVED`, `LIVE`, `PAUSED`, `REJECTED`, `HALTED`, `CANCELLED` |
| `version` | string | Version number (e.g., `3.0.0`) |
| `versionCode` | integer | Android version code (e.g., `300`) |
| `rolloutPercentage` | number | 0-100 (supports decimals) |
| `inAppUpdatePriority` | integer | In-app update priority (0-5) |
| `releaseNotes` | string | Release notes for this submission |
| `artifactPath` | string | S3 path to AAB file |
| `internalTrackLink` | string\|null | Google Play internal testing link |
| `submittedAt` | ISO 8601\|null | When submitted to store |
| `submittedBy` | string\|null | User email who submitted |
| `statusUpdatedAt` | ISO 8601 | Last status change timestamp |
| `isCurrent` | boolean | **`true` = active, `false` = historical** |
| `createdAt` | ISO 8601 | Record creation time |
| `updatedAt` | ISO 8601 | Last update time |
| `actionHistory` | array | Audit trail of manual actions |

**Foreign Keys:**
- `distributionId` → `store_distribution.id` (many-to-one)
- `releaseId` → `releases.id` (many-to-one)

**Important:**
- `isCurrent = true`: This is the **active** submission for this distribution
- `isCurrent = false`: This is a **historical** submission (e.g., rejected then resubmitted)
- `isCurrent` maps to `isActive` in API responses

### 4. **`ios_submission_builds`** - iOS Submissions
All iOS submissions (current + historical).

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key (e.g., `isb_001`) |
| `distributionId` | string | **Foreign key** → `store_distribution.id` |
| `releaseId` | string | **Foreign key** → `releases.id` |
| `tenantId` | string | Organization ID |
| `storeType` | string | Always `APP_STORE` |
| `status` | enum | `PENDING`, `IN_REVIEW`, `APPROVED`, `LIVE`, `PAUSED`, `REJECTED`, `HALTED`, `CANCELLED` |
| `version` | string | Version number (e.g., `3.0.0`) |
| `releaseType` | enum | `AFTER_APPROVAL` or `MANUAL` |
| `phasedRelease` | boolean | `true` if phased rollout (automatic only) |
| `resetRating` | boolean | Whether to reset app rating |
| `rolloutPercentage` | number | 0-100 (Apple-controlled for phased) |
| `releaseNotes` | string | Release notes for this submission |
| `testflightNumber` | integer\|null | TestFlight build number |
| `submittedAt` | ISO 8601\|null | When submitted to store |
| `submittedBy` | string\|null | User email who submitted |
| `statusUpdatedAt` | ISO 8601 | Last status change timestamp |
| `isCurrent` | boolean | **`true` = active, `false` = historical** |
| `createdAt` | ISO 8601 | Record creation time |
| `updatedAt` | ISO 8601 | Last update time |
| `actionHistory` | array | Audit trail of manual actions |

**Foreign Keys:**
- `distributionId` → `store_distribution.id` (many-to-one)
- `releaseId` → `releases.id` (many-to-one)

**Important:**
- `isCurrent = true`: This is the **active** submission for this distribution
- `isCurrent = false`: This is a **historical** submission (e.g., rejected then resubmitted)
- `isCurrent` maps to `isActive` in API responses

## 🔗 Relationships

```
releases (1) ─────→ (1) store_distribution
   │                        │
   │                        │
   └────────┬───────────────┘
            │
            ├────→ (many) android_submission_builds
            │
            └────→ (many) ios_submission_builds
```

**Key Points:**
1. One `release` has **one** `store_distribution`
2. One `store_distribution` can have **multiple** `android_submission_builds` (historical + current)
3. One `store_distribution` can have **multiple** `ios_submission_builds` (historical + current)
4. Each distribution has **at most one** current (`isCurrent = true`) submission per platform
5. Historical submissions exist when a submission is rejected/cancelled and then resubmitted

## 📝 Sample Data Flow

### Scenario: Rejected then Resubmitted

**Step 1: Initial Submission**
```json
{
  "id": "asb_001",
  "distributionId": "dist_001",
  "status": "IN_REVIEW",
  "version": "3.0.0",
  "versionCode": 300,
  "isCurrent": true
}
```

**Step 2: Rejected by Store**
```json
{
  "id": "asb_001",
  "distributionId": "dist_001",
  "status": "REJECTED",
  "version": "3.0.0",
  "versionCode": 300,
  "isCurrent": false  // ❌ No longer current
}
```

**Step 3: Resubmission (New Record)**
```json
{
  "id": "asb_002",
  "distributionId": "dist_001",
  "status": "IN_REVIEW",
  "version": "3.0.0",
  "versionCode": 301,  // New version code
  "isCurrent": true    // ✅ New current submission
}
```

**Result:** Distribution `dist_001` now has 2 Android submissions:
- `asb_001` (historical, `isCurrent: false`)
- `asb_002` (current, `isCurrent: true`)

## 🎯 API Mapping

### `isCurrent` → `isActive`

The database field `isCurrent` is mapped to API field `isActive`:

**Database (PostgreSQL):**
```sql
SELECT isCurrent FROM android_submission_builds WHERE id = 'asb_001';
-- Returns: false
```

**API Response:**
```json
{
  "id": "asb_001",
  "isActive": false
}
```

### Platform Targeting

If a release only targets **Android**:
```json
{
  "id": "rel_002",
  "platformTargetMappings": [
    { "platform": "ANDROID", "version": "3.1.0" }
  ]
}
```

Then:
- `store_distribution` will have submissions only in `android_submission_builds`
- No records in `ios_submission_builds` for this distribution
- API will return `platforms: ["ANDROID"]`

## 🔍 Query Examples

### Get Distribution with All Submissions
```javascript
// Query from all 3 tables
const distribution = db.get('store_distribution').find({ id: 'dist_004' }).value();
const androidSubs = db.get('android_submission_builds').filter({ distributionId: 'dist_004' }).value();
const iosSubs = db.get('ios_submission_builds').filter({ distributionId: 'dist_004' }).value();

// Result: All submissions (current + historical) for both platforms
```

### Get Only Current Submissions
```javascript
const currentAndroid = db.get('android_submission_builds')
  .find({ distributionId: 'dist_004', isCurrent: true })
  .value();

const currentIos = db.get('ios_submission_builds')
  .find({ distributionId: 'dist_004', isCurrent: true })
  .value();

// Result: Only the active submissions
```

### Get Release Distribution
```javascript
const distribution = db.get('store_distribution').find({ releaseId: 'rel_001' }).value();
// Result: Distribution linked to release 'rel_001'
```

## ✅ Data Integrity Rules

1. **Referential Integrity:**
   - Every `store_distribution.releaseId` must exist in `releases.id`
   - Every `android_submission_builds.distributionId` must exist in `store_distribution.id`
   - Every `ios_submission_builds.distributionId` must exist in `store_distribution.id`

2. **Current Submission Rules:**
   - Each distribution can have **at most one** `isCurrent = true` submission per platform
   - If a submission is rejected/cancelled and resubmitted, the old one gets `isCurrent = false`
   - HALTED submissions remain `isCurrent = true` (terminal state, no resubmission)

3. **Platform Consistency:**
   - Only platforms in `release.platformTargetMappings` should have submissions
   - Android-only releases should have NO records in `ios_submission_builds`
   - iOS-only releases should have NO records in `android_submission_builds`

4. **Status Flow:**
   - Distribution status is calculated from submission statuses (backend handles this)
   - Distribution `updatedAt` should match the latest submission `statusUpdatedAt`

## 🚀 Complete User Journey Example

**Journey: Release 3.3.0 → Android Rejected → Resubmit → Approve → Release**

**1. Release Created:**
```json
// releases table
{
  "id": "rel_004",
  "branch": "release/3.3.0",
  "version": "3.3.0",
  "status": "SUBMITTED",
  "platformTargetMappings": [
    { "platform": "ANDROID" },
    { "platform": "IOS" }
  ]
}
```

**2. Distribution Created:**
```json
// store_distribution table
{
  "id": "dist_004",
  "releaseId": "rel_004",
  "status": "PENDING"
}
```

**3. Submit to Stores:**
```json
// android_submission_builds table
{
  "id": "asb_004_v1",
  "distributionId": "dist_004",
  "status": "IN_REVIEW",
  "versionCode": 330,
  "isCurrent": true
}

// ios_submission_builds table
{
  "id": "isb_004",
  "distributionId": "dist_004",
  "status": "IN_REVIEW",
  "isCurrent": true
}
```

**4. Android Rejected:**
```json
// android_submission_builds table (updated)
{
  "id": "asb_004_v1",
  "status": "REJECTED",
  "isCurrent": false  // ❌ No longer current
}

// iOS approved (separate flow)
{
  "id": "isb_004",
  "status": "APPROVED",
  "isCurrent": true
}
```

**5. Android Resubmitted:**
```json
// android_submission_builds table (new record)
{
  "id": "asb_004_v2",
  "distributionId": "dist_004",
  "status": "IN_REVIEW",
  "versionCode": 331,  // Incremented
  "isCurrent": true    // ✅ New current
}
```

**Final State:**
- Distribution `dist_004` has **3** total submissions:
  - 2 Android: `asb_004_v1` (historical), `asb_004_v2` (current)
  - 1 iOS: `isb_004` (current)

**API List Response (only current):**
```json
{
  "id": "dist_004",
  "platforms": ["ANDROID", "IOS"],
  "submissions": [
    { "id": "asb_004_v2", "platform": "ANDROID", "isActive": true },
    { "id": "isb_004", "platform": "IOS", "isActive": true }
  ]
}
```

**API Detail Response (current + historical):**
```json
{
  "id": "dist_004",
  "platforms": ["ANDROID", "IOS"],
  "submissions": [
    { "id": "asb_004_v1", "platform": "ANDROID", "isActive": false },
    { "id": "asb_004_v2", "platform": "ANDROID", "isActive": true },
    { "id": "isb_004", "platform": "IOS", "isActive": true }
  ]
}
```

---

## 📌 Summary

✅ **Proper relational database structure**
✅ **Foreign keys maintain referential integrity**
✅ **Separate tables for Android and iOS submissions**
✅ **Historical tracking via `isCurrent` flag**
✅ **Platform targeting based on release config**
✅ **Complete user journey support**
✅ **100% aligned with backend PostgreSQL schema**

