# Manual Build Upload & TestFlight Verification API Specification

This document specifies the API contracts for manual build upload, iOS TestFlight verification, and build artifact listing endpoints.

---

## Table of Contents

1. [Upload Manual Build](#1-upload-manual-build)
2. [Verify TestFlight Build](#2-verify-testflight-build)
3. [List Build Artifacts](#3-list-build-artifacts)

---

## 1. Upload Manual Build

Upload a build artifact manually for a specific platform during a release stage.

### Endpoint

```
PUT /tenants/{tenantId}/releases/{releaseId}/stages/{stage}/builds/{platform}
```

### Description

Used when `hasManualBuildUpload = true` on a release. This endpoint allows users to manually upload build artifacts instead of relying on CI/CD pipelines.

**Flow:**
1. Validates upload is allowed (hasManualBuildUpload, correct stage, platform configured)
2. Uploads artifact to S3 storage
3. Creates/updates entry in `release_uploads` staging table
4. Returns upload status including whether all platforms are ready

### Authentication

- **Required**: Yes
- **Permission**: Tenant Owner

### Path Parameters

| Parameter   | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `tenantId`  | string | Yes      | Unique tenant identifier |
| `releaseId` | string | Yes      | Unique release identifier (UUID) |
| `stage`     | string | Yes      | Release stage: `KICK_OFF`, `REGRESSION`, or `PRE_RELEASE` |
| `platform`  | string | Yes      | Platform: `IOS`, `ANDROID`, or `WEB` |

### Request

#### Content-Type

```
multipart/form-data
```

#### Form Fields

| Field      | Type | Required | Description |
|------------|------|----------|-------------|
| `artifact` | File | Yes      | Build artifact file (max 500MB) |

#### cURL Example

```bash
curl -X PUT \
  'https://api.example.com/release-management/tenants/{tenantId}/releases/{releaseId}/stages/KICK_OFF/builds/IOS' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: multipart/form-data' \
  -F 'artifact=@/path/to/build.ipa'
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "uploadId": "uuid-v4-upload-id",
    "platform": "IOS",
    "stage": "KICK_OFF",
    "downloadUrl": "https://s3.amazonaws.com/bucket/path/to/artifact.ipa",
    "internalTrackLink": null,
    "uploadedPlatforms": ["IOS"],
    "missingPlatforms": ["ANDROID", "WEB"],
    "allPlatformsReady": false
  }
}
```

#### Success Response - All Platforms Ready (200 OK)

```json
{
  "success": true,
  "data": {
    "uploadId": "uuid-v4-upload-id",
    "platform": "ANDROID",
    "stage": "KICK_OFF",
    "downloadUrl": "https://s3.amazonaws.com/bucket/path/to/artifact.apk",
    "internalTrackLink": "https://play.google.com/apps/internaltest/...",
    "uploadedPlatforms": ["IOS", "ANDROID", "WEB"],
    "missingPlatforms": [],
    "allPlatformsReady": true
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `data.uploadId` | string | UUID of the created upload record |
| `data.platform` | string | Platform that was uploaded (`IOS`, `ANDROID`, `WEB`) |
| `data.stage` | string | Stage the upload is for |
| `data.downloadUrl` | string | S3 download URL for the artifact |
| `data.internalTrackLink` | string \| null | Internal track link (Android AAB only) |
| `data.uploadedPlatforms` | string[] | List of platforms with uploads for this stage |
| `data.missingPlatforms` | string[] | List of platforms still pending upload |
| `data.allPlatformsReady` | boolean | `true` if all required platforms have been uploaded |

### Error Responses

#### 400 Bad Request - Missing Parameters

```json
{
  "success": false,
  "error": "Release ID is required"
}
```

```json
{
  "success": false,
  "error": "Stage is required (KICK_OFF, REGRESSION, PRE_RELEASE)"
}
```

```json
{
  "success": false,
  "error": "Platform is required"
}
```

#### 400 Bad Request - Invalid Stage

```json
{
  "success": false,
  "error": "Invalid buildStage: invalid_stage. Must be one of: KICK_OFF, REGRESSION, PRE_RELEASE"
}
```

#### 400 Bad Request - Invalid Platform

```json
{
  "success": false,
  "error": "Invalid platform: invalid_platform. Must be one of: ANDROID, IOS, WEB"
}
```

#### 400 Bad Request - Missing File

```json
{
  "success": false,
  "error": "Build artifact file is required"
}
```

#### 400 Bad Request - Validation Failure

```json
{
  "success": false,
  "error": "Manual build upload is not enabled for this release"
}
```

```json
{
  "success": false,
  "error": "Platform IOS is not configured for this release"
}
```

```json
{
  "success": false,
  "error": "Cannot upload to stage REGRESSION - current stage is KICK_OFF"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized: Account ID not found"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Manual upload service not configured"
}
```

```json
{
  "success": false,
  "error": "Failed to upload build",
  "message": "S3 upload failed: timeout"
}
```

### Notes

- Maximum file size: **500MB**
- Supported stages: `KICK_OFF`, `REGRESSION`, `PRE_RELEASE`
- Supported platforms: `IOS`, `ANDROID`, `WEB`
- For Android AAB files, an `internalTrackLink` may be returned
- **Staging Table**: Uploads are stored in `release_uploads` staging table, NOT directly in `builds` table
- **Task Consumption**: The `builds` table entry is created later when the task executes and consumes from staging

### Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. PUT /stages/:stage/builds/:platform                                   │
│    → Validates upload is allowed                                        │
│    → Uploads artifact to S3                                             │
│    → Creates entry in `release_uploads` staging table                   │
│    → Returns uploadId, downloadUrl, platform status                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Task executes (e.g., TRIGGER_PRE_REGRESSION_BUILDS)                   │
│    → Checks staging table (WHERE isUsed = false)                        │
│    → If all platforms ready:                                            │
│        - Marks staging entries: isUsed = true, usedByTaskId = taskId    │
│        - Creates `builds` table entries                                 │
│        - Task status: COMPLETED ✅                                       │
│    → If missing platforms:                                              │
│        - Task status: AWAITING_MANUAL_BUILD ⏳                           │
│        - Slack notification sent (once)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Verify TestFlight Build

Verify that an iOS build exists in Apple TestFlight and stage it for task consumption.

### Endpoint

```
POST /tenants/{tenantId}/releases/{releaseId}/stages/{stage}/builds/ios/verify-testflight
```

### Description

Verifies an iOS build exists in TestFlight via App Store Connect API and **stages the verified build** in the `release_uploads` staging table. This endpoint serves two purposes:

1. **Verification**: Confirms the build exists in TestFlight with matching build number and version
2. **Staging**: Creates an entry in the `release_uploads` staging table (NOT directly in `builds` table)

**Important Flow:**
- This endpoint stores in the **staging table** (`release_uploads`), NOT the `builds` table
- The actual `builds` table entry is created later when the task (e.g., `TRIGGER_TEST_FLIGHT_BUILD`) executes
- Task consumption happens when the cron job runs and processes pending tasks

This is used for manual TestFlight uploads where the user uploads their build to TestFlight outside of CI/CD and then verifies it through this endpoint.

### Authentication

- **Required**: Yes
- **Permission**: Tenant Owner

### Path Parameters

| Parameter   | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `tenantId`  | string | Yes      | Unique tenant identifier |
| `releaseId` | string | Yes      | Unique release identifier (UUID) |
| `stage`     | string | Yes      | Release stage: `KICK_OFF`, `REGRESSION`, or `PRE_RELEASE` |

### Request

#### Content-Type

```
application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `testflightBuildNumber` | string | Yes | The build number to verify in TestFlight |
| `versionName` | string | Yes | The version string to match (e.g., "1.2.3") |

#### Example Request

```json
{
  "testflightBuildNumber": "12345",
  "versionName": "1.2.3"
}
```

#### cURL Example

```bash
curl -X POST \
  'https://api.example.com/release-management/tenants/{tenantId}/releases/{releaseId}/stages/PRE_RELEASE/builds/ios/verify-testflight' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "testflightBuildNumber": "12345",
    "versionName": "1.2.3"
  }'
```

### Response

#### Success Response (200 OK)

Upon successful verification, a staging entry is created in the `release_uploads` table:

```json
{
  "success": true,
  "data": {
    "uploadId": "staging-uuid-123",
    "releaseId": "550e8400-e29b-41d4-a716-446655440000",
    "platform": "IOS",
    "stage": "PRE_RELEASE",
    "testflightNumber": "12345",
    "versionName": "1.2.3",
    "verified": true,
    "isUsed": false,
    "uploadedPlatforms": ["IOS"],
    "missingPlatforms": ["ANDROID"],
    "allPlatformsReady": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Success Response - All Platforms Ready (200 OK)

```json
{
  "success": true,
  "data": {
    "uploadId": "staging-uuid-123",
    "releaseId": "550e8400-e29b-41d4-a716-446655440000",
    "platform": "IOS",
    "stage": "PRE_RELEASE",
    "testflightNumber": "12345",
    "versionName": "1.2.3",
    "verified": true,
    "isUsed": false,
    "uploadedPlatforms": ["IOS", "ANDROID"],
    "missingPlatforms": [],
    "allPlatformsReady": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `data.uploadId` | string | Unique ID of the staging entry in `release_uploads` |
| `data.releaseId` | string | UUID of the associated release |
| `data.platform` | string | Always `IOS` for TestFlight builds |
| `data.stage` | string | Release stage (`KICK_OFF`, `REGRESSION`, `PRE_RELEASE`) |
| `data.testflightNumber` | string | The verified TestFlight build number |
| `data.versionName` | string | Version string of the build |
| `data.verified` | boolean | Always `true` on success (TestFlight verification passed) |
| `data.isUsed` | boolean | `false` until task consumes this entry |
| `data.uploadedPlatforms` | string[] | Platforms with uploads staged for this stage |
| `data.missingPlatforms` | string[] | Platforms still pending upload |
| `data.allPlatformsReady` | boolean | `true` if all required platforms have been staged |
| `data.createdAt` | string | ISO 8601 timestamp when staging entry was created |

### Staging Table Entry Created

When verification succeeds, a record is created in the `release_uploads` **staging table**:

| Column | Value |
|--------|-------|
| `id` | Auto-generated staging UUID |
| `tenantId` | From path parameter |
| `releaseId` | From path parameter |
| `platform` | `IOS` |
| `stage` | From path parameter (`KICK_OFF`, `REGRESSION`, `PRE_RELEASE`) |
| `artifactPath` | `null` (artifact is in TestFlight, not S3) |
| `testflightNumber` | `testflightBuildNumber` from request |
| `versionName` | `versionName` from request |
| `isUsed` | `false` (until task consumes it) |
| `usedByTaskId` | `null` (set when task consumes) |
| `usedByCycleId` | `null` (set for regression cycles) |

### When Task Consumes the Staging Entry

When the task (e.g., `TRIGGER_TEST_FLIGHT_BUILD`) executes:

1. **Checks staging table** for unused entries (`isUsed = false`)
2. **If found**: Marks staging entry as used, creates `builds` table entry
3. **If missing**: Sets task to `AWAITING_MANUAL_BUILD`, sends Slack notification

**Builds table entry created by task:**

| Column | Value |
|--------|-------|
| `id` | New build UUID |
| `tenantId` | From staging entry |
| `releaseId` | From staging entry |
| `platform` | `IOS` |
| `storeType` | `TESTFLIGHT` |
| `buildStage` | From staging entry |
| `buildType` | `MANUAL` |
| `buildUploadStatus` | `UPLOADED` |
| `testflightNumber` | From staging entry |
| `artifactPath` | `null` |
| `ciRunId` | `null` |
| `taskId` | ID of the consuming task |

### Error Responses

#### 400 Bad Request - Missing Fields

```json
{
  "success": false,
  "field": "releaseId",
  "error": "releaseId is required"
}
```

```json
{
  "success": false,
  "field": "testflightBuildNumber",
  "error": "testflightBuildNumber is required"
}
```

```json
{
  "success": false,
  "field": "versionName",
  "error": "versionName is required"
}
```

#### 400 Bad Request - Store Integration Issues

```json
{
  "success": false,
  "error": {
    "code": "STORE_INTEGRATION_NOT_FOUND",
    "message": "App Store Connect integration not found for tenant"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "STORE_INTEGRATION_INVALID",
    "message": "App Store Connect integration is not verified or invalid"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "VERSION_MISMATCH",
    "message": "TestFlight version does not match release version"
  }
}
```

#### 404 Not Found - Build Not Found

```json
{
  "success": false,
  "error": {
    "code": "TESTFLIGHT_BUILD_NOT_FOUND",
    "message": "TestFlight build not found in App Store Connect"
  }
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Store controllers not initialized"
}
```

```json
{
  "success": false,
  "error": "Failed to verify TestFlight build"
}
```

### Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TESTFLIGHT_BUILD_NOT_FOUND` | 404 | Build number not found in TestFlight |
| `VERSION_MISMATCH` | 400 | Build version doesn't match expected version |
| `STORE_INTEGRATION_NOT_FOUND` | 400 | No App Store Connect integration configured |
| `STORE_INTEGRATION_INVALID` | 400 | App Store Connect credentials are invalid or expired |

### Notes

- Requires a valid App Store Connect integration configured for the tenant
- The integration must be verified and have valid API credentials
- Build must be fully processed by Apple (not in `PROCESSING` state)
- This endpoint communicates with Apple's App Store Connect API
- **Staging Table**: Entry is created in `release_uploads` staging table, NOT directly in `builds` table
- **Task Consumption**: The `builds` table entry is created later when the task executes and consumes from staging
- The build will be stored with `buildType: MANUAL` to distinguish from CI/CD-created builds
- `artifactPath` is `null` because the actual artifact is stored in TestFlight, not S3
- Calling this endpoint again creates a new staging entry (previous unused entries remain available)

### Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. User uploads build to TestFlight (outside this system)               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. POST /verify-testflight                                               │
│    → Verifies build exists in App Store Connect                         │
│    → Creates entry in `release_uploads` staging table                   │
│    → Returns uploadId, verified=true, platform status                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Task executes (e.g., TRIGGER_TEST_FLIGHT_BUILD)                       │
│    → Checks staging table (WHERE isUsed = false)                        │
│    → If all platforms ready:                                            │
│        - Marks staging entries: isUsed = true, usedByTaskId = taskId    │
│        - Creates `builds` table entries                                 │
│        - Task status: COMPLETED ✅                                       │
│    → If missing platforms:                                              │
│        - Task status: AWAITING_MANUAL_BUILD ⏳                           │
│        - Slack notification sent                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. List Build Artifacts

List build artifacts from the `builds` table with presigned S3 download URLs.

### Endpoint

```
GET /tenants/{tenantId}/releases/{releaseId}/builds/artifacts
```

### Description

Retrieves all build artifacts for a release with optional filtering. Returns presigned S3 URLs for downloading artifacts directly.

**Note:** This endpoint reads from the `builds` table (consumed builds), NOT the `release_uploads` staging table.

### Authentication

- **Required**: Yes
- **Permission**: Tenant Owner

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Unique tenant identifier |
| `releaseId` | string | Yes | Unique release identifier (UUID) |

### Query Parameters

All query parameters are optional and can be combined for filtering.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | No | Filter by platform: `IOS`, `ANDROID`, `WEB` |
| `buildStage` | string | No | Filter by stage: `KICK_OFF`, `REGRESSION`, `PRE_RELEASE` |
| `storeType` | string | No | Filter by store: `APP_STORE`, `PLAY_STORE`, `TESTFLIGHT`, `WEB` |
| `buildType` | string | No | Filter by type: `MANUAL` or `CI_CD` |
| `regressionId` | string | No | Filter by regression cycle ID |
| `taskId` | string | No | Filter by task ID |
| `workflowStatus` | string | No | CI/CD status: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED` |
| `buildUploadStatus` | string | No | Upload status: `PENDING`, `UPLOADING`, `UPLOADED`, `FAILED` |

### cURL Example

```bash
# List all artifacts for a release
curl -X GET \
  'https://api.example.com/release-management/tenants/{tenantId}/releases/{releaseId}/builds/artifacts' \
  -H 'Authorization: Bearer <token>'

# Filter by platform and stage
curl -X GET \
  'https://api.example.com/release-management/tenants/{tenantId}/releases/{releaseId}/builds/artifacts?platform=ANDROID&buildStage=PRE_RELEASE' \
  -H 'Authorization: Bearer <token>'

# Filter by build type (manual uploads only)
curl -X GET \
  'https://api.example.com/release-management/tenants/{tenantId}/releases/{releaseId}/builds/artifacts?buildType=MANUAL' \
  -H 'Authorization: Bearer <token>'
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "build-uuid-123",
      "artifactPath": "s3://bucket/tenant-123/release-456/android/1.2.3/app-release.aab",
      "downloadUrl": "https://s3.amazonaws.com/bucket/...?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...",
      "artifactVersionName": "1.2.3",
      "buildNumber": "12345",
      "releaseId": "release-456",
      "platform": "ANDROID",
      "storeType": "PLAY_STORE",
      "buildStage": "PRE_RELEASE",
      "buildType": "CI_CD",
      "buildUploadStatus": "UPLOADED",
      "workflowStatus": "COMPLETED",
      "regressionId": null,
      "ciRunId": "github-actions-run-789",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    },
    {
      "id": "build-uuid-124",
      "artifactPath": null,
      "downloadUrl": null,
      "artifactVersionName": "1.2.3",
      "buildNumber": "67890",
      "releaseId": "release-456",
      "platform": "IOS",
      "storeType": "TESTFLIGHT",
      "buildStage": "PRE_RELEASE",
      "buildType": "MANUAL",
      "buildUploadStatus": "UPLOADED",
      "workflowStatus": null,
      "regressionId": null,
      "ciRunId": null,
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `data` | array | Array of build artifact objects |
| `data[].id` | string | Unique build ID |
| `data[].artifactPath` | string \| null | S3 path to artifact (`null` for TestFlight builds) |
| `data[].downloadUrl` | string \| null | Presigned S3 download URL (expires in 1 hour), `null` if no artifact |
| `data[].artifactVersionName` | string | Version string (e.g., "1.2.3") |
| `data[].buildNumber` | string \| null | Build number / version code |
| `data[].releaseId` | string | Associated release ID |
| `data[].platform` | string | Platform: `IOS`, `ANDROID`, `WEB` |
| `data[].storeType` | string \| null | Target store: `APP_STORE`, `PLAY_STORE`, `TESTFLIGHT`, `WEB` |
| `data[].buildStage` | string | Stage: `KICK_OFF`, `REGRESSION`, `PRE_RELEASE` |
| `data[].buildType` | string | Type: `MANUAL` or `CI_CD` |
| `data[].buildUploadStatus` | string | Upload status: `PENDING`, `UPLOADING`, `UPLOADED`, `FAILED` |
| `data[].workflowStatus` | string \| null | CI/CD workflow status (`null` for manual builds) |
| `data[].regressionId` | string \| null | Regression cycle ID (if regression build) |
| `data[].ciRunId` | string \| null | CI/CD run ID (`null` for manual builds) |
| `data[].createdAt` | string | ISO 8601 creation timestamp |
| `data[].updatedAt` | string | ISO 8601 last update timestamp |

#### Empty Response (200 OK)

When no builds match the filters:

```json
{
  "success": true,
  "data": []
}
```

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": "Release not found"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to list build artifacts",
  "message": "Database connection error"
}
```

### Notes

- **Data Source**: Reads from `builds` table (consumed builds from staging)
- **Download URLs**: Presigned S3 URLs expire after 1 hour
- **TestFlight Builds**: Will have `artifactPath: null` and `downloadUrl: null` (artifact is in TestFlight)
- **Manual vs CI/CD**: Use `buildType` filter to distinguish between upload sources
- **Regression Builds**: Use `regressionId` filter to get builds for a specific regression cycle
- **Ordering**: Results are ordered by `createdAt` descending (newest first)

---

