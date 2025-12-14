# Distribution Module - Implementation Plan

**Version:** 1.0  
**Date:** December 14, 2025  
**Status:** 🚧 **IMPLEMENTATION IN PROGRESS**  
**Approach:** Senior Software Engineer Level - Zero Mistakes - Production Ready

---

## 📚 Reference Documents

This implementation plan is based on:

1. **DISTRIBUTION_API_SPEC.md** (Holy Grail - 1,353 lines)
   - Complete API specification with 11 endpoints
   - Request/response schemas
   - Platform-specific rules
   - Database schemas

2. **DISTRIBUTION_UI_FLOW_SPEC.md** (1,496 lines)
   - Complete user journeys
   - UI states and components
   - Action availability matrix
   - Two-module architecture

3. **DISTRIBUTION_TESTING_PLAN.md** (1,192 lines)
   - 9 test scenarios
   - 100+ test cases
   - Platform-specific test matrices
   - Mock server commands

---

## 📊 Current Implementation Analysis

### ✅ What's Already Done

**Components (45+ files in `app/components/distribution/`):**
- ✅ All UI components exist
- ✅ Dialogs implemented (Submit, Resubmit, Pause, Resume, Halt, Cancel)
- ✅ Forms implemented (SubmitToStoresForm, UploadAABForm, etc.)
- ✅ Display components (Status cards, badges, progress bars)
- ✅ Custom hooks (useFormState, useRolloutState, useWarningState)

**Routes (Partial):**
- ✅ Distribution list page exists
- ✅ Distribution management page exists (wrong param name)
- ✅ Release page distribution tab exists
- ⚠️ API routes partially implemented with WRONG endpoints

### 🔴 Critical Issues (MUST FIX FIRST)

#### Issue 1: Wrong First-Time Submit API Route
```
Current:  app/routes/api.v1.distributions.$distributionId.submit.ts ❌
Required: app/routes/api.v1.submissions.$submissionId.submit.ts ✅

Impact: BLOCKING - First-time submission completely broken
Reference: DISTRIBUTION_API_SPEC.md lines 476-601
```

#### Issue 2: Wrong Resubmission API Route
```
Current:  app/routes/api.v1.submissions.$submissionId.retry.ts ❌
Required: app/routes/api.v1.distributions.$distributionId.submissions.ts ✅

Impact: BLOCKING - Resubmission after rejection broken
Reference: DISTRIBUTION_API_SPEC.md lines 913-1047
```

#### Issue 3: Wrong Page Route Parameter
```
Current:  app/routes/dashboard.$org.distributions.$releaseId.tsx ❌
Required: app/routes/dashboard.$org.distributions.$distributionId.tsx ✅

Impact: BREAKING - URL structure and navigation broken
Reference: DISTRIBUTION_UI_FLOW_SPEC.md lines 31, 95, 101, 140
```

#### Issue 4: Obsolete API Routes
```
Should Delete:
- app/routes/api.v1.submissions.$submissionId.status.ts (polling removed)
- app/routes/api.v1.submissions.$submissionId.edit.ts (not in spec)

Reference: DISTRIBUTION_API_SPEC.md (these endpoints don't exist in spec)
```

---

## 🎯 Implementation Phases

### PHASE 1: Fix Critical Route Issues (Day 1) - P0 BLOCKING

**Goal:** Align all route structures with API specification

#### 1.1 Create First-Time Submit API Route

**File to Create:** `app/routes/api.v1.submissions.$submissionId.submit.ts`

**Reference:** DISTRIBUTION_API_SPEC.md lines 476-601

**Implementation:**
```typescript
// Method: PUT
// Endpoint: /api/v1/submissions/:submissionId/submit

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';

// Request body (varies by platform)
interface SubmitRequest {
  // Android
  rolloutPercent?: number;        // Float 0-100 (decimals allowed)
  inAppPriority?: number;         // 0-5
  releaseNotes?: string;
  
  // iOS
  phasedRelease?: boolean;
  resetRating?: boolean;
  releaseNotes?: string;
}

// Response includes updated submission + artifact details
async function submitSubmission({ params, request, user }: ActionFunctionArgs) {
  const { submissionId } = params;
  const body = await request.json();
  
  // 1. Validate submission exists and is in PENDING state
  // 2. Update submission with user-provided details
  // 3. Change status from PENDING → IN_REVIEW
  // 4. Return updated submission with artifact details
  
  const result = await DistributionService.submitSubmission(
    submissionId,
    body,
    user
  );
  
  return json(result);
}

export const action = authenticateActionRequest({ PUT: submitSubmission });
```

**Acceptance Criteria:**
- [ ] Route responds to PUT method only
- [ ] Validates submissionId exists
- [ ] Validates submission is in PENDING state
- [ ] Accepts platform-specific fields (Android vs iOS)
- [ ] Returns submission object with artifact details
- [ ] Returns 409 if submission not PENDING
- [ ] Returns 404 if submission not found

**Components to Update:**
- `app/components/distribution/SubmitToStoresForm.tsx`
  - Change API call from `PUT /distributions/:id/submit`
  - To: `PUT /submissions/:submissionId/submit` (per platform)
  - Submit Android and iOS separately (2 API calls if both selected)

---

#### 1.2 Create Resubmission API Route

**File to Create:** `app/routes/api.v1.distributions.$distributionId.submissions.ts`

**Reference:** DISTRIBUTION_API_SPEC.md lines 913-1047

**Implementation:**
```typescript
// Method: POST
// Endpoint: /api/v1/distributions/:distributionId/submissions
// Content-Type: multipart/form-data (Android) or application/json (iOS)

import { unstable_parseMultipartFormData } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';

// Request (Android - multipart)
interface AndroidResubmissionRequest {
  platform: 'ANDROID';
  version: string;
  versionCode?: number;           // Optional (extracted from AAB)
  aabFile: File;                  // Multipart upload
  rolloutPercent?: number;
  inAppPriority?: number;
  releaseNotes?: string;
}

// Request (iOS - JSON)
interface IOSResubmissionRequest {
  platform: 'IOS';
  version: string;
  testflightBuildNumber: number;
  phasedRelease?: boolean;
  resetRating?: boolean;
  releaseNotes?: string;
}

// Response: NEW submission object
async function createResubmission({ params, request, user }: ActionFunctionArgs) {
  const { distributionId } = params;
  
  const contentType = request.headers.get('content-type');
  
  let body;
  if (contentType?.includes('multipart/form-data')) {
    // Android AAB upload
    body = await unstable_parseMultipartFormData(request, uploadHandler);
  } else {
    // iOS JSON
    body = await request.json();
  }
  
  // 1. Validate distribution exists
  // 2. Upload artifact (Android) or validate TestFlight build (iOS)
  // 3. Create NEW submission (not update existing)
  // 4. Set status to IN_REVIEW (submitted directly)
  // 5. Return new submission object
  
  const result = await DistributionService.createResubmission(
    distributionId,
    body,
    user
  );
  
  return json(result, { status: 201 });
}

export const action = authenticateActionRequest({ POST: createResubmission });
```

**Acceptance Criteria:**
- [ ] Route responds to POST method only
- [ ] Handles multipart/form-data for Android
- [ ] Handles application/json for iOS
- [ ] Creates NEW submission (new submissionId)
- [ ] Android: Uploads AAB file
- [ ] Android: versionCode optional (extracted from AAB)
- [ ] Android: No internalTestingLink in response (direct to production)
- [ ] iOS: Validates TestFlight build number
- [ ] Returns 201 with new submission object
- [ ] Pre-fills form with previous submission data on frontend

**Components to Update:**
- `app/components/distribution/ReSubmissionDialog.tsx`
  - Change API call from `POST /submissions/:id/retry`
  - To: `POST /distributions/:distributionId/submissions`
  - Handle multipart upload for Android AAB
  - Pre-fill form with previous submission data
  - Support editing metadata before submission

---

#### 1.3 Fix Page Route Parameter

**File to Rename:** 
```
FROM: app/routes/dashboard.$org.distributions.$releaseId.tsx
TO:   app/routes/dashboard.$org.distributions.$distributionId.tsx
```

**Reference:** DISTRIBUTION_UI_FLOW_SPEC.md lines 31, 95, 101, 140

**Changes Required:**

1. **Rename the file**
2. **Update all param references in the file:**
   ```typescript
   // OLD
   const { org, releaseId } = params;
   
   // NEW
   const { org, distributionId } = params;
   ```

3. **Update loader logic:**
   ```typescript
   // OLD
   const distribution = await DistributionService.getByReleaseId(releaseId);
   
   // NEW
   const distribution = await DistributionService.getByDistributionId(distributionId);
   ```

**Acceptance Criteria:**
- [ ] File renamed to use $distributionId
- [ ] All params use distributionId
- [ ] Loader fetches by distributionId
- [ ] Breadcrumbs show correct route
- [ ] URL structure: `/distributions/:distributionId`

**Navigation Links to Update:**
- `app/components/distribution/DistributionListRow.tsx`
  ```typescript
  // OLD
  to={`/dashboard/${org}/distributions/${distribution.releaseId}`}
  
  // NEW
  to={`/dashboard/${org}/distributions/${distribution.id}`}
  ```

- `app/components/distribution/EmptyDistributions.tsx` (if has link)
- Any "View Distribution" or "Open in Distribution Management" buttons

---

#### 1.4 Delete Obsolete Routes

**Files to Delete:**

1. `app/routes/api.v1.submissions.$submissionId.status.ts`
   - Reason: Polling API removed from spec
   - Reference: DISTRIBUTION_API_SPEC.md (endpoint doesn't exist)

2. `app/routes/api.v1.submissions.$submissionId.edit.ts`
   - Reason: Not in API spec
   - Reference: DISTRIBUTION_API_SPEC.md (endpoint doesn't exist)

**Acceptance Criteria:**
- [ ] Both files deleted
- [ ] No components reference these routes
- [ ] No broken imports

---

### PHASE 2: Verify & Fix Existing API Routes (Day 2) - P0 CRITICAL

**Goal:** Ensure all existing API routes match the specification exactly

#### 2.1 Core APIs Verification

##### 2.1.1 GET /api/v1/releases/:releaseId/distribution

**File:** `app/routes/api.v1.releases.$releaseId.distribute.ts`  
**Reference:** DISTRIBUTION_API_SPEC.md lines 154-343

**Checklist:**
- [ ] Returns full distribution object
- [ ] Returns ALL submissions (current + historical)
- [ ] Returns artifact details for each submission
- [ ] Includes platform-specific fields (Android vs iOS)
- [ ] Returns 404 if release not found
- [ ] Returns 404 if distribution not found

**Response Structure to Verify:**
```typescript
{
  success: true,
  data: {
    id: string,
    releaseId: string,
    version: string,
    branch: string,
    status: DistributionStatus,
    platforms: Platform[],
    createdAt: string,
    updatedAt: string,
    submissions: [
      {
        id: string,
        distributionId: string,
        platform: Platform,
        storeType: StoreType,
        status: SubmissionStatus,
        version: string,
        // ... all submission details
        artifact: {
          // Android or iOS artifact details
        }
      }
    ]
  }
}
```

---

##### 2.1.2 GET /api/v1/distributions

**File:** `app/routes/api.v1.distributions.ts`  
**Reference:** DISTRIBUTION_API_SPEC.md lines 344-474

**Checklist:**
- [ ] Returns list of distributions
- [ ] Returns ONLY latest submission per platform
- [ ] Includes stats: totalDistributions, totalSubmissions, inReviewSubmissions, releasedSubmissions
- [ ] Supports pagination (page, limit)
- [ ] Supports filtering by status
- [ ] Distribution statusUpdatedAt = max of all submissions' statusUpdatedAt
- [ ] NO releaseId, submittedAt, lastUpdated in list items

**Response Structure to Verify:**
```typescript
{
  success: true,
  data: {
    distributions: [
      {
        id: string,
        version: string,
        branch: string,
        status: DistributionStatus,
        statusUpdatedAt: string,  // Max of all submissions
        submissions: [            // Only latest per platform
          {
            id: string,
            platform: Platform,
            status: SubmissionStatus,
            rolloutPercent: number,
            statusUpdatedAt: string
          }
        ]
      }
    ],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    },
    stats: {
      totalDistributions: number,
      totalSubmissions: number,
      inReviewSubmissions: number,
      releasedSubmissions: number
    }
  }
}
```

---

##### 2.1.3 GET /api/v1/distributions/:distributionId

**File:** `app/routes/api.v1.distributions.$distributionId.ts` (create if missing)  
**Reference:** DISTRIBUTION_API_SPEC.md lines 602-714

**Checklist:**
- [ ] File exists (create if missing)
- [ ] Returns full distribution details
- [ ] Returns ALL submissions (current + historical)
- [ ] Returns artifact details for each submission
- [ ] Includes all platform-specific fields
- [ ] Returns 404 if not found

**Note:** Same response structure as GET /releases/:releaseId/distribution

---

##### 2.1.4 GET /api/v1/submissions/:submissionId

**File:** `app/routes/api.v1.submissions.$submissionId.ts`  
**Reference:** DISTRIBUTION_API_SPEC.md lines 715-826

**Checklist:**
- [ ] Returns complete submission details
- [ ] Returns artifact details
- [ ] Includes all platform-specific fields
- [ ] Returns 404 if not found

**Response Structure to Verify:**
```typescript
{
  success: true,
  data: {
    id: string,
    distributionId: string,
    platform: Platform,
    storeType: StoreType,
    status: SubmissionStatus,
    version: string,
    // ... all submission fields
    artifact: {
      // Platform-specific artifact details
    }
  }
}
```

---

#### 2.2 Rollout Management APIs

##### 2.2.1 PATCH /api/v1/submissions/:submissionId/rollout

**File:** `app/routes/api.v1.submissions.$submissionId.rollout.ts`  
**Reference:** DISTRIBUTION_API_SPEC.md lines 827-912

**Checklist:**
- [ ] Accepts `rolloutPercent` as float
- [ ] Android: Accepts any value 0-100 (decimals)
- [ ] Android: Validates can only increase
- [ ] iOS Phased: ONLY accepts 100 (complete early)
- [ ] iOS Phased: Rejects any other value with 409
- [ ] iOS Manual: Returns 409 (already at 100%)
- [ ] Response: `{ id, rolloutPercent, statusUpdatedAt }`
- [ ] Updates status to RELEASED when 100%

**Platform-Specific Validation:**
```typescript
if (platform === 'ANDROID') {
  // Accept any float 0-100
  if (rolloutPercent < 0 || rolloutPercent > 100) {
    return json({ error: 'Invalid rollout percent' }, { status: 400 });
  }
  
  // Validate can only increase
  if (rolloutPercent < currentPercent) {
    return json({ error: 'Rollout can only increase' }, { status: 400 });
  }
}

if (platform === 'IOS' && phasedRelease === true) {
  // Only accept 100
  if (rolloutPercent !== 100) {
    return json({ error: 'iOS phased can only skip to 100%' }, { status: 409 });
  }
}

if (platform === 'IOS' && phasedRelease === false) {
  // Already at 100%, no rollout needed
  return json({ error: 'Manual release already at 100%' }, { status: 409 });
}
```

---

##### 2.2.2 PATCH /api/v1/submissions/:submissionId/rollout/pause

**File:** Create `app/routes/api.v1.submissions.$submissionId.rollout.pause.ts`  
**Reference:** DISTRIBUTION_API_SPEC.md lines 1081-1113

**Implementation:**
```typescript
// Method: PATCH
// iOS Phased Release ONLY

interface PauseRequest {
  reason: string;  // Required
}

interface PauseResponse {
  id: string;
  status: 'PAUSED';
  statusUpdatedAt: string;
}

async function pauseRollout({ params, request, user }: ActionFunctionArgs) {
  const { submissionId } = params;
  const { reason } = await request.json();
  
  // 1. Validate submission exists and is LIVE
  // 2. Validate platform is iOS with phasedRelease = true
  // 3. Update status to PAUSED
  // 4. Store reason
  
  const result = await DistributionService.pauseRollout(
    submissionId,
    reason,
    user
  );
  
  return json(result);
}

export const action = authenticateActionRequest({ PATCH: pauseRollout });
```

**Acceptance Criteria:**
- [ ] File created
- [ ] Accepts PATCH method only
- [ ] Requires `reason` in request body
- [ ] Only works for iOS phased release
- [ ] Returns 409 if not iOS phased
- [ ] Returns 409 if not LIVE status
- [ ] Updates status to PAUSED
- [ ] Returns simplified response: `{ id, status, statusUpdatedAt }`

---

##### 2.2.3 PATCH /api/v1/submissions/:submissionId/rollout/resume

**File:** Create `app/routes/api.v1.submissions.$submissionId.rollout.resume.ts`  
**Reference:** DISTRIBUTION_API_SPEC.md lines 1114-1136

**Implementation:**
```typescript
// Method: PATCH
// iOS Phased Release ONLY
// No request body needed

interface ResumeResponse {
  id: string;
  status: 'LIVE';
  statusUpdatedAt: string;
}

async function resumeRollout({ params, user }: ActionFunctionArgs) {
  const { submissionId } = params;
  
  // 1. Validate submission exists and is PAUSED
  // 2. Validate platform is iOS with phasedRelease = true
  // 3. Update status back to LIVE
  
  const result = await DistributionService.resumeRollout(submissionId, user);
  
  return json(result);
}

export const action = authenticateActionRequest({ PATCH: resumeRollout });
```

**Acceptance Criteria:**
- [ ] File created
- [ ] Accepts PATCH method only
- [ ] No request body needed
- [ ] Only works for iOS phased release
- [ ] Returns 409 if not iOS phased
- [ ] Returns 409 if not PAUSED status
- [ ] Updates status to LIVE
- [ ] Returns simplified response: `{ id, status, statusUpdatedAt }`

---

##### 2.2.4 PATCH /api/v1/submissions/:submissionId/rollout/halt

**File:** Create `app/routes/api.v1.submissions.$submissionId.rollout.halt.ts`  
**Reference:** DISTRIBUTION_API_SPEC.md lines 1137-1169

**Implementation:**
```typescript
// Method: PATCH
// Emergency halt - works for all platforms

interface HaltRequest {
  reason: string;  // Required (no severity field)
}

interface HaltResponse {
  id: string;
  status: 'HALTED';
  statusUpdatedAt: string;
}

async function haltRollout({ params, request, user }: ActionFunctionArgs) {
  const { submissionId } = params;
  const { reason } = await request.json();
  
  // 1. Validate submission exists and is LIVE
  // 2. Update status to HALTED (terminal state)
  // 3. Store reason
  
  const result = await DistributionService.haltRollout(
    submissionId,
    reason,
    user
  );
  
  return json(result);
}

export const action = authenticateActionRequest({ PATCH: haltRollout });
```

**Acceptance Criteria:**
- [ ] File created
- [ ] Accepts PATCH method only
- [ ] Requires `reason` in request body
- [ ] NO `severity` field (removed from spec)
- [ ] Works for all platforms (Android, iOS Phased, iOS Manual)
- [ ] Returns 409 if not LIVE status
- [ ] Updates status to HALTED (terminal state)
- [ ] Returns simplified response: `{ id, status, statusUpdatedAt }`

---

#### 2.3 Submission Management APIs

##### 2.3.1 PATCH /api/v1/submissions/:submissionId/cancel

**File:** `app/routes/api.v1.submissions.$submissionId.cancel.ts`  
**Reference:** DISTRIBUTION_API_SPEC.md lines 1048-1080

**Checklist:**
- [ ] Accepts PATCH method (not DELETE)
- [ ] Accepts optional `reason` in request body
- [ ] Works for submissions in PENDING, IN_REVIEW, APPROVED states
- [ ] Returns 409 if already in terminal state
- [ ] Updates status to CANCELLED
- [ ] Returns simplified response: `{ id, status, statusUpdatedAt }`

**Request Body:**
```typescript
interface CancelRequest {
  reason?: string;  // Optional
}
```

---

### PHASE 3: Update Component API Calls (Day 3) - P1 HIGH

**Goal:** Update all components to use correct API endpoints with exact request/response formats

#### 3.1 SubmitToStoresForm.tsx

**File:** `app/components/distribution/SubmitToStoresForm.tsx`  
**Reference:** DISTRIBUTION_UI_FLOW_SPEC.md lines 1030-1069

**Changes Required:**

1. **API Endpoint Change:**
   ```typescript
   // OLD (WRONG)
   PUT /api/v1/distributions/${distributionId}/submit
   
   // NEW (CORRECT)
   PUT /api/v1/submissions/${submissionId}/submit
   ```

2. **Submit Per Platform:**
   ```typescript
   // Submit Android and iOS SEPARATELY (2 API calls if both selected)
   
   if (selectedPlatforms.includes('ANDROID')) {
     const androidSubmission = submissions.find(s => 
       s.platform === 'ANDROID' && s.status === 'PENDING'
     );
     
     await fetch(`/api/v1/submissions/${androidSubmission.id}/submit`, {
       method: 'PUT',
       body: JSON.stringify({
         rolloutPercent: androidOptions.rolloutPercent,
         inAppPriority: androidOptions.inAppPriority,
         releaseNotes: androidOptions.releaseNotes
       })
     });
   }
   
   if (selectedPlatforms.includes('IOS')) {
     const iosSubmission = submissions.find(s => 
       s.platform === 'IOS' && s.status === 'PENDING'
     );
     
     await fetch(`/api/v1/submissions/${iosSubmission.id}/submit`, {
       method: 'PUT',
       body: JSON.stringify({
         phasedRelease: iosOptions.phasedRelease,
         resetRating: iosOptions.resetRating,
         releaseNotes: iosOptions.releaseNotes
       })
     });
   }
   ```

3. **Handle PENDING Submissions:**
   ```typescript
   // Backend has already created submissions with PENDING status
   // Show only platforms with PENDING submissions as selectable
   
   const pendingSubmissions = submissions.filter(s => s.status === 'PENDING');
   const availablePlatforms = pendingSubmissions.map(s => s.platform);
   ```

**Acceptance Criteria:**
- [ ] Uses correct API endpoint per platform
- [ ] Submits Android and iOS separately
- [ ] Shows only PENDING submissions
- [ ] Sends platform-specific fields
- [ ] Handles response with artifact details
- [ ] Shows success message per platform
- [ ] Handles errors gracefully

---

#### 3.2 ReSubmissionDialog.tsx

**File:** `app/components/distribution/ReSubmissionDialog.tsx`  
**Reference:** DISTRIBUTION_API_SPEC.md lines 913-1047

**Changes Required:**

1. **API Endpoint Change:**
   ```typescript
   // OLD (WRONG)
   POST /api/v1/submissions/${submissionId}/retry
   
   // NEW (CORRECT)
   POST /api/v1/distributions/${distributionId}/submissions
   ```

2. **Pre-fill Form:**
   ```typescript
   // When dialog opens, pre-fill with previous submission data
   const [formData, setFormData] = useState({
     // Copy from previous submission
     releaseNotes: previousSubmission.releaseNotes,
     rolloutPercent: previousSubmission.rolloutPercent,
     inAppPriority: previousSubmission.inAppPriority,
     phasedRelease: previousSubmission.phasedRelease,
     resetRating: previousSubmission.resetRating,
     
     // Reset artifact (must provide new)
     aabFile: null,
     testflightBuildNumber: null
   });
   ```

3. **Handle Multipart Upload (Android):**
   ```typescript
   if (platform === 'ANDROID') {
     const formData = new FormData();
     formData.append('platform', 'ANDROID');
     formData.append('version', version);
     formData.append('aabFile', aabFile);  // File object
     if (versionCode) formData.append('versionCode', versionCode);
     formData.append('rolloutPercent', rolloutPercent);
     formData.append('inAppPriority', inAppPriority);
     formData.append('releaseNotes', releaseNotes);
     
     await fetch(`/api/v1/distributions/${distributionId}/submissions`, {
       method: 'POST',
       body: formData  // multipart/form-data
     });
   }
   ```

4. **Handle JSON (iOS):**
   ```typescript
   if (platform === 'IOS') {
     await fetch(`/api/v1/distributions/${distributionId}/submissions`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         platform: 'IOS',
         version: version,
         testflightBuildNumber: testflightBuildNumber,
         phasedRelease: phasedRelease,
         resetRating: resetRating,
         releaseNotes: releaseNotes
       })
     });
   }
   ```

**Acceptance Criteria:**
- [ ] Uses correct API endpoint
- [ ] Pre-fills form with previous submission data
- [ ] Allows editing all fields before submit
- [ ] Handles multipart upload for Android AAB
- [ ] Handles JSON for iOS
- [ ] versionCode optional for Android
- [ ] Response shows NEW submission ID (not same as old)
- [ ] No internalTestingLink for Android resubmission
- [ ] Handles errors gracefully

---

#### 3.3 RolloutControls.tsx

**File:** `app/components/distribution/RolloutControls.tsx`  
**Reference:** DISTRIBUTION_UI_FLOW_SPEC.md lines 1206-1232

**Changes Required:**

1. **Platform-Specific UI:**
   ```typescript
   // Android
   if (platform === 'ANDROID') {
     return (
       <>
         <Slider
           min={0}
           max={100}
           step={0.1}  // Decimals allowed
           value={rolloutPercent}
           onChange={handleChange}
         />
         <PresetButtons presets={[1, 5, 10, 25, 50, 100]} />
         <Button onClick={handleUpdate}>Update Rollout</Button>
         <Button color="red" onClick={handleHalt}>Emergency Halt</Button>
       </>
     );
   }
   
   // iOS Phased
   if (platform === 'IOS' && phasedRelease === true) {
     return (
       <>
         <Text>Day {currentDay}/7 (Automatic by Apple)</Text>
         <ProgressBar value={rolloutPercent} />
         <Button onClick={() => handleUpdate(100)}>Complete Early (100%)</Button>
         {status === 'LIVE' && (
           <Button onClick={handlePause}>Pause Rollout</Button>
         )}
         {status === 'PAUSED' && (
           <Button onClick={handleResume}>Resume Rollout</Button>
         )}
         <Button color="red" onClick={handleHalt}>Emergency Halt</Button>
       </>
     );
   }
   
   // iOS Manual
   if (platform === 'IOS' && phasedRelease === false) {
     return (
       <>
         <Text>100% (Immediate Release)</Text>
         <Text size="sm" c="dimmed">No rollout control available</Text>
         <Button color="red" onClick={handleHalt}>Emergency Halt</Button>
       </>
     );
   }
   ```

2. **Validation Logic:**
   ```typescript
   const validateRollout = (newPercent: number): string | null => {
     if (platform === 'ANDROID') {
       if (newPercent < 0 || newPercent > 100) {
         return 'Must be between 0 and 100';
       }
       if (newPercent < currentPercent) {
         return 'Rollout can only increase';
       }
       return null;
     }
     
     if (platform === 'IOS' && phasedRelease === true) {
       if (newPercent !== 100) {
         return 'iOS phased release can only skip to 100%';
       }
       return null;
     }
     
     if (platform === 'IOS' && phasedRelease === false) {
       return 'Manual release already at 100%';
     }
     
     return null;
   };
   ```

**Acceptance Criteria:**
- [ ] Shows correct UI per platform type
- [ ] Android: Slider with 0.1 step (decimals)
- [ ] Android: Validates can only increase
- [ ] iOS Phased: Only "Complete Early (100%)" button
- [ ] iOS Phased: Shows Pause/Resume buttons
- [ ] iOS Manual: No controls, only shows 100%
- [ ] All platforms: Emergency Halt button
- [ ] Validation matches platform rules

---

#### 3.4 Dialog Components

##### PauseRolloutDialog.tsx
- [ ] API: `PATCH /api/v1/submissions/:submissionId/rollout/pause`
- [ ] Required field: `reason`
- [ ] Only show for iOS phased release + LIVE status

##### ResumeRolloutDialog.tsx
- [ ] API: `PATCH /api/v1/submissions/:submissionId/rollout/resume`
- [ ] No request body needed
- [ ] Only show for iOS phased release + PAUSED status

##### HaltRolloutDialog.tsx
- [ ] API: `PATCH /api/v1/submissions/:submissionId/rollout/halt`
- [ ] Required field: `reason` (NO severity field)
- [ ] Show for all platforms + LIVE status

##### CancelSubmissionDialog.tsx
- [ ] API: `PATCH /api/v1/submissions/:submissionId/cancel`
- [ ] Optional field: `reason`
- [ ] Show for PENDING, IN_REVIEW, APPROVED statuses

---

#### 3.5 Navigation Links

**Files to Update:**

1. **DistributionListRow.tsx**
   ```typescript
   // OLD
   <Link to={`/dashboard/${org}/distributions/${distribution.releaseId}`}>
   
   // NEW
   <Link to={`/dashboard/${org}/distributions/${distribution.id}`}>
   ```

2. **EmptyDistributions.tsx** (if applicable)

3. **Any "Open in Distribution Management" links**
   ```typescript
   // Always link using distributionId, not releaseId
   <Link to={`/distributions/${distributionId}`}>
   ```

4. **Breadcrumbs**
   ```typescript
   // Ensure breadcrumbs show correct route
   Distributions > v2.5.0 (not Release > v2.5.0)
   ```

**Acceptance Criteria:**
- [ ] All links use `distributionId`
- [ ] No links use `releaseId` for distribution management
- [ ] Breadcrumbs correct
- [ ] Back buttons navigate correctly

---

### PHASE 4: Platform-Specific Logic (Day 4) - P1 HIGH

**Goal:** Implement and enforce platform-specific rules throughout the UI

**Reference:** DISTRIBUTION_API_SPEC.md lines 46-82, DISTRIBUTION_UI_FLOW_SPEC.md lines 1206-1232

#### 4.1 Platform Rules Summary

**Android (Play Store):**
- Rollout: Any percentage 0-100 (decimals: 0.1, 5.5, 27.3, etc.)
- Direction: Can only increase (not decrease)
- Pause: ❌ Not available
- Halt: ✅ Available (emergency)
- UI: Slider + preset buttons + Update button

**iOS Phased Release:**
- Rollout: Automatic 7-day by Apple
- Manual control: Can ONLY set to 100% (complete early)
- Pause: ✅ Available
- Resume: ✅ Available
- Halt: ✅ Available (emergency)
- UI: Progress display + "Complete Early (100%)" button + Pause/Resume buttons

**iOS Manual Release:**
- Rollout: Always 100% (immediate)
- Control: ❌ None available
- Halt: ✅ Available (emergency)
- UI: Read-only display showing 100% + Halt button only

#### 4.2 Implementation Locations

**Create:** `app/utils/platform-rules.ts`

```typescript
export type Platform = 'ANDROID' | 'IOS';

export interface PlatformRules {
  canAdjustRollout: boolean;
  canSetPartialRollout: boolean;
  canOnlyCompleteEarly: boolean;
  canPause: boolean;
  allowsDecimals: boolean;
  minPercent: number;
  maxPercent: number;
  allowedSteps: number[];
}

export function getPlatformRules(
  platform: Platform,
  phasedRelease?: boolean
): PlatformRules {
  if (platform === 'ANDROID') {
    return {
      canAdjustRollout: true,
      canSetPartialRollout: true,
      canOnlyCompleteEarly: false,
      canPause: false,
      allowsDecimals: true,
      minPercent: 0,
      maxPercent: 100,
      allowedSteps: [0.1, 1, 5, 10, 25, 50, 100]
    };
  }
  
  if (platform === 'IOS' && phasedRelease === true) {
    return {
      canAdjustRollout: true,
      canSetPartialRollout: false,
      canOnlyCompleteEarly: true,
      canPause: true,
      allowsDecimals: false,
      minPercent: 100,
      maxPercent: 100,
      allowedSteps: [100]
    };
  }
  
  if (platform === 'IOS' && phasedRelease === false) {
    return {
      canAdjustRollout: false,
      canSetPartialRollout: false,
      canOnlyCompleteEarly: false,
      canPause: false,
      allowsDecimals: false,
      minPercent: 100,
      maxPercent: 100,
      allowedSteps: [100]
    };
  }
  
  throw new Error('Invalid platform configuration');
}

export function validateRolloutUpdate(
  platform: Platform,
  phasedRelease: boolean,
  currentPercent: number,
  newPercent: number
): { valid: boolean; error?: string } {
  const rules = getPlatformRules(platform, phasedRelease);
  
  if (!rules.canAdjustRollout) {
    return { valid: false, error: 'Rollout cannot be adjusted for this platform' };
  }
  
  if (newPercent < rules.minPercent || newPercent > rules.maxPercent) {
    return { 
      valid: false, 
      error: `Rollout must be between ${rules.minPercent}% and ${rules.maxPercent}%` 
    };
  }
  
  if (platform === 'ANDROID' && newPercent < currentPercent) {
    return { valid: false, error: 'Rollout can only increase' };
  }
  
  if (rules.canOnlyCompleteEarly && newPercent !== 100) {
    return { 
      valid: false, 
      error: 'iOS phased release can only skip to 100%' 
    };
  }
  
  return { valid: true };
}
```

**Acceptance Criteria:**
- [ ] Utility functions created
- [ ] All platform rules documented
- [ ] Validation logic centralized
- [ ] Used consistently across all components

---

### PHASE 5: Status Flow Implementation (Day 5) - P1 HIGH

**Goal:** Implement 5-state distribution flow and 8-state submission flow

**Reference:** DISTRIBUTION_API_SPEC.md lines 89-137

#### 5.1 Distribution Status (5 States)

**File:** `app/types/distribution.types.ts`

```typescript
export enum DistributionStatus {
  PENDING = 'PENDING',                          // Created, not submitted yet
  PARTIALLY_SUBMITTED = 'PARTIALLY_SUBMITTED',  // Some platforms submitted
  SUBMITTED = 'SUBMITTED',                      // All platforms submitted
  PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',    // Some platforms live
  RELEASED = 'RELEASED'                         // All platforms 100% live
}
```

**Status Derivation Logic:**

**Create:** `app/utils/distribution-status.utils.ts`

```typescript
export function deriveDistributionStatus(
  submissions: Submission[]
): DistributionStatus {
  if (submissions.length === 0) {
    return DistributionStatus.PENDING;
  }
  
  const allPending = submissions.every(s => s.status === 'PENDING');
  if (allPending) {
    return DistributionStatus.PENDING;
  }
  
  const allSubmitted = submissions.every(s => 
    ['IN_REVIEW', 'APPROVED', 'LIVE', 'PAUSED', 'REJECTED', 'HALTED', 'CANCELLED'].includes(s.status)
  );
  const someSubmitted = submissions.some(s => 
    ['IN_REVIEW', 'APPROVED', 'LIVE', 'PAUSED', 'REJECTED', 'HALTED', 'CANCELLED'].includes(s.status)
  );
  
  if (someSubmitted && !allSubmitted) {
    return DistributionStatus.PARTIALLY_SUBMITTED;
  }
  
  if (allSubmitted) {
    const anyLive = submissions.some(s => ['LIVE', 'PAUSED'].includes(s.status));
    const allCompleted = submissions.every(s => 
      (s.status === 'LIVE' && s.rolloutPercent === 100) || s.status === 'REJECTED' || s.status === 'HALTED' || s.status === 'CANCELLED'
    );
    
    if (!anyLive) {
      return DistributionStatus.SUBMITTED;
    }
    
    if (anyLive && !allCompleted) {
      return DistributionStatus.PARTIALLY_RELEASED;
    }
    
    if (allCompleted) {
      return DistributionStatus.RELEASED;
    }
  }
  
  return DistributionStatus.PENDING;
}
```

**Acceptance Criteria:**
- [ ] Enum updated with 5 states
- [ ] Status derivation logic implemented
- [ ] Logic matches spec exactly
- [ ] Used in all distribution displays

---

#### 5.2 Submission Status (8 States)

**File:** `app/types/distribution.types.ts`

```typescript
export enum SubmissionStatus {
  PENDING = 'PENDING',       // Created but not yet submitted to store
  IN_REVIEW = 'IN_REVIEW',   // Submitted, store reviewing
  APPROVED = 'APPROVED',     // Approved, ready to release
  LIVE = 'LIVE',             // Live in store (0-100%)
  PAUSED = 'PAUSED',         // iOS phased only: rollout paused
  REJECTED = 'REJECTED',     // Rejected by store
  HALTED = 'HALTED',         // Emergency halt by user
  CANCELLED = 'CANCELLED'    // Cancelled by user
}
```

**Status Badge Colors:**

**File:** `app/constants/distribution.constants.ts`

```typescript
export const SUBMISSION_STATUS_COLORS = {
  PENDING: 'blue',
  IN_REVIEW: 'yellow',
  APPROVED: 'cyan',
  LIVE: 'green',
  PAUSED: 'orange',
  REJECTED: 'red',
  HALTED: 'red',
  CANCELLED: 'gray'
} as const;

export const SUBMISSION_STATUS_LABELS = {
  PENDING: 'Ready to Submit',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  LIVE: 'Live',
  PAUSED: 'Paused',
  REJECTED: 'Rejected',
  HALTED: 'Halted',
  CANCELLED: 'Cancelled'
} as const;
```

**Status Icons:**

**File:** `app/utils/distribution-icons.utils.tsx`

```typescript
import { 
  IconClock, 
  IconEye, 
  IconCheck, 
  IconRocket, 
  IconPlayerPause,
  IconX,
  IconAlertCircle,
  IconBan
} from '@tabler/icons-react';

export function getSubmissionStatusIcon(status: SubmissionStatus) {
  switch (status) {
    case 'PENDING':
      return <IconClock />;
    case 'IN_REVIEW':
      return <IconEye />;
    case 'APPROVED':
      return <IconCheck />;
    case 'LIVE':
      return <IconRocket />;
    case 'PAUSED':
      return <IconPlayerPause />;
    case 'REJECTED':
      return <IconX />;
    case 'HALTED':
      return <IconAlertCircle />;
    case 'CANCELLED':
      return <IconBan />;
    default:
      return <IconClock />;
  }
}
```

**Acceptance Criteria:**
- [ ] Enum updated with 8 states
- [ ] All status colors defined
- [ ] All status labels defined
- [ ] All status icons defined
- [ ] Used consistently across all submission displays

---

#### 5.3 Update UI Components

**Components to Update:**

1. **DistributionStatusPanel.tsx**
   - [ ] Use 5-state distribution flow
   - [ ] Show correct badge color
   - [ ] Show correct icon

2. **SubmissionStatusCard.tsx**
   - [ ] Use 8-state submission flow
   - [ ] Show correct badge color
   - [ ] Show correct icon
   - [ ] Include PAUSED status with pause icon

3. **PlatformSubmissionCard.tsx**
   - [ ] Use 8-state submission flow
   - [ ] Show correct badge color
   - [ ] Show correct icon

4. **SubmissionCard.tsx**
   - [ ] Use 8-state submission flow
   - [ ] Enable/disable actions based on status

---

### PHASE 6: Auto-Created Submissions (Day 6) - P1 HIGH

**Goal:** Handle PENDING submissions that are auto-created by backend

**Reference:** DISTRIBUTION_API_SPEC.md lines 15-27, DISTRIBUTION_UI_FLOW_SPEC.md lines 56-75

#### 6.1 Backend Behavior (Documented)

```
1. Pre-Release Completes
   ↓
2. Backend AUTO-CREATES distribution entry (status: PENDING)
   ↓
3. Backend AUTO-CREATES submission entries (one per platform, status: PENDING)
   ↓
4. User navigates to Distribution Tab
   ↓
5. User sees submissions already exist (PENDING status)
   ↓
6. User fills details & submits (PENDING → IN_REVIEW)
```

#### 6.2 Release Page - Distribution Tab

**File:** `app/routes/dashboard.$org.releases.$releaseId.distribution.tsx`

**Implementation:**

```typescript
export async function loader({ params, user }: LoaderFunctionArgs) {
  const { org, releaseId } = params;
  
  // Fetch distribution (backend has already created it)
  const distribution = await DistributionService.getByReleaseId(releaseId);
  
  // Submissions already exist with PENDING status
  const submissions = distribution.submissions;
  
  return json({
    org,
    distribution,
    submissions,  // Will have PENDING status
    hasPendingSubmissions: submissions.some(s => s.status === 'PENDING')
  });
}

// UI Component
export default function DistributionTab() {
  const { distribution, submissions, hasPendingSubmissions } = useLoaderData();
  
  if (hasPendingSubmissions) {
    return (
      <>
        <Alert color="blue">
          Ready to submit to stores. Fill in details and submit.
        </Alert>
        
        {submissions.map(submission => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            showPendingBadge={submission.status === 'PENDING'}
          />
        ))}
        
        <Button onClick={openSubmitDialog}>
          Submit to Stores
        </Button>
      </>
    );
  }
  
  // ... rest of the component
}
```

**Acceptance Criteria:**
- [ ] Loader fetches distribution (already exists)
- [ ] Loader fetches submissions (already exist with PENDING)
- [ ] UI shows "Ready to Submit" message for PENDING
- [ ] UI shows submission cards with PENDING badge
- [ ] "Submit to Stores" button enabled
- [ ] Submit dialog pre-selects platforms with PENDING submissions
- [ ] All management actions disabled for PENDING

---

#### 6.3 Submit Dialog Behavior

**File:** `app/components/distribution/SubmitToStoresForm.tsx`

```typescript
// When dialog opens
const pendingSubmissions = submissions.filter(s => s.status === 'PENDING');

// Show only platforms with PENDING submissions
const availablePlatforms = pendingSubmissions.map(s => s.platform);

// Pre-select all available platforms by default
const [selectedPlatforms, setSelectedPlatforms] = useState(availablePlatforms);

// On submit
async function handleSubmit() {
  for (const platform of selectedPlatforms) {
    const submission = pendingSubmissions.find(s => s.platform === platform);
    
    // Update existing PENDING submission (not create new)
    await submitSubmission(submission.id, formData);
  }
}
```

**Acceptance Criteria:**
- [ ] Only shows platforms with PENDING submissions
- [ ] Pre-selects all available platforms
- [ ] Submits to existing submission IDs
- [ ] Updates status from PENDING → IN_REVIEW
- [ ] Does NOT create new submissions

---

#### 6.4 Empty State Handling

**File:** `app/components/distribution/EmptyDistributions.tsx`

```typescript
export function EmptyDistributions() {
  return (
    <EmptyState
      icon={<IconPackage size={48} />}
      title="No Distributions Yet"
      description="Distributions are created after completing pre-release. Complete a release's pre-release stage to see distributions here."
      action={
        <Button component={Link} to="/dashboard/releases">
          View Releases
        </Button>
      }
    />
  );
}
```

**Condition:** Show empty state when `distributions.length === 0`

**Acceptance Criteria:**
- [ ] Shows when no distributions exist
- [ ] Clear message about when distributions are created
- [ ] Link to releases page
- [ ] NO stats cards shown

---

### PHASE 7: Two-Module Architecture (Day 7) - P1 HIGH

**Goal:** Implement LIMITED view on release page vs FULL view on distribution management page

**Reference:** DISTRIBUTION_UI_FLOW_SPEC.md lines 12-99, 246-262

#### 7.1 Release Page - Distribution Tab (LIMITED)

**File:** `app/routes/dashboard.$org.releases.$releaseId.distribution.tsx`

**Capabilities:**
```typescript
const RELEASE_PAGE_CAPABILITIES = {
  canSubmitPending: true,       // First-time submit only
  canViewStatus: true,          // Read-only monitoring
  canSeeRejection: true,        // View rejection details
  
  canManageRollout: false,      // NO slider/controls
  canPauseResume: false,        // NO pause/resume
  canHalt: false,               // NO halt
  canRetry: false,              // NO resubmission
  canViewHistory: false,        // NO history panel
  canCancel: false              // NO cancel
} as const;
```

**UI Implementation:**
```typescript
export default function DistributionTab() {
  const { distribution, submissions } = useLoaderData();
  
  return (
    <Stack>
      {/* Header */}
      <Group justify="space-between">
        <Title order={3}>Distribution</Title>
        <Button
          component={Link}
          to={`/distributions/${distribution.id}`}
          variant="light"
        >
          Open in Distribution Management
        </Button>
      </Group>
      
      {/* PENDING: Show submit dialog */}
      {hasPending && (
        <>
          <Alert>Ready to submit to stores</Alert>
          <Button onClick={openSubmitDialog}>Submit to Stores</Button>
        </>
      )}
      
      {/* Read-only status display */}
      {submissions.map(submission => (
        <Paper key={submission.id} p="md">
          <SubmissionStatusCard 
            submission={submission}
            readOnly={true}  // No action buttons
          />
          
          {/* Show basic info only */}
          <Text>Status: {submission.status}</Text>
          {submission.status === 'LIVE' && (
            <Text>Rollout: {submission.rolloutPercent}%</Text>
          )}
          
          {/* NO rollout controls */}
          {/* NO pause/resume/halt buttons */}
          {/* NO history */}
        </Paper>
      ))}
      
      {/* Link to full management */}
      <Alert>
        For advanced management (rollout control, pause, halt), use 
        <Anchor component={Link} to={`/distributions/${distribution.id}`}>
          Distribution Management
        </Anchor>
      </Alert>
    </Stack>
  );
}
```

**Acceptance Criteria:**
- [ ] Can submit PENDING submissions only
- [ ] Shows status (read-only)
- [ ] Shows rollout percentage (read-only, no control)
- [ ] Shows rejection details if rejected
- [ ] NO rollout slider/controls
- [ ] NO pause/resume/halt buttons
- [ ] NO resubmit button
- [ ] NO history panel
- [ ] Prominent link to full distribution management

---

#### 7.2 Distribution Management Page (FULL)

**File:** `app/routes/dashboard.$org.distributions.$distributionId.tsx`

**Capabilities:**
```typescript
const DISTRIBUTION_MGMT_CAPABILITIES = {
  canSubmitPending: true,       // First-time submit
  canViewStatus: true,          // Full status details
  canSeeRejection: true,        // Rejection details
  
  canManageRollout: true,       // Full rollout controls
  canPauseResume: true,         // Pause/resume (iOS phased)
  canHalt: true,                // Emergency halt
  canRetry: true,               // Resubmission after rejection
  canViewHistory: true,         // Full history timeline
  canCancel: true               // Cancel submission
} as const;
```

**UI Implementation:**
```typescript
export default function DistributionManagement() {
  const { distribution, submissions } = useLoaderData();
  const [activeTab, setActiveTab] = useState<Platform>('ANDROID');
  
  const currentSubmission = submissions.find(s => s.platform === activeTab);
  
  return (
    <Container>
      {/* Breadcrumbs */}
      <Breadcrumbs>
        <Anchor component={Link} to="/distributions">Distributions</Anchor>
        <Text>{distribution.version}</Text>
      </Breadcrumbs>
      
      {/* Header with distribution details */}
      <DistributionOverview distribution={distribution} />
      
      {/* Platform tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="ANDROID">Android</Tabs.Tab>
          <Tabs.Tab value="IOS">iOS</Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value={activeTab}>
          {currentSubmission ? (
            <>
              {/* Full submission details */}
              <SubmissionStatusCard submission={currentSubmission} />
              
              {/* PENDING: Submit button */}
              {currentSubmission.status === 'PENDING' && (
                <Button onClick={openSubmitDialog}>Submit</Button>
              )}
              
              {/* LIVE: Full rollout controls */}
              {currentSubmission.status === 'LIVE' && (
                <RolloutControls
                  submission={currentSubmission}
                  platform={activeTab}
                  onUpdate={handleRolloutUpdate}
                  onPause={handlePause}    // iOS phased only
                  onResume={handleResume}  // iOS phased only
                  onHalt={handleHalt}
                />
              )}
              
              {/* REJECTED: Retry button */}
              {currentSubmission.status === 'REJECTED' && (
                <Button onClick={openRetryDialog}>Fix & Re-Submit</Button>
              )}
              
              {/* History panel */}
              <SubmissionHistoryPanel 
                submissionId={currentSubmission.id}
              />
              
              {/* Cancel button (if applicable) */}
              {canCancel(currentSubmission.status) && (
                <Button color="red" onClick={openCancelDialog}>
                  Cancel Submission
                </Button>
              )}
            </>
          ) : (
            <EmptyState message="No submission for this platform" />
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
```

**Acceptance Criteria:**
- [ ] Route uses `distributionId` parameter
- [ ] Shows full distribution details
- [ ] Platform tabs for Android/iOS
- [ ] All submission actions available
- [ ] Full rollout controls (platform-specific)
- [ ] Pause/Resume/Halt buttons
- [ ] Resubmit after rejection
- [ ] Full history timeline
- [ ] Cancel button (when applicable)

---

### PHASE 8: Type Safety (Day 8) - P2 MEDIUM

**Goal:** Ensure complete type safety with zero `any` types

#### 8.1 Update Type Definitions

**File:** `app/types/distribution.types.ts`

**Checklist:**
- [ ] DistributionStatus enum (5 states)
- [ ] SubmissionStatus enum (8 states)
- [ ] Platform enum
- [ ] StoreType enum
- [ ] All request types match API spec
- [ ] All response types match API spec
- [ ] Artifact types (Android vs iOS)
- [ ] No `any` types anywhere

**Key Types to Verify:**

```typescript
// Ensure these match API spec exactly
export interface Distribution {
  id: string;
  releaseId: string;
  version: string;
  branch: string;
  status: DistributionStatus;
  platforms: Platform[];
  createdAt: string;
  updatedAt: string;
  submissions: Submission[];
}

export interface Submission {
  id: string;
  distributionId: string;
  platform: Platform;
  storeType: StoreType;
  status: SubmissionStatus;
  version: string;
  rolloutPercent: number;  // Float, not int
  // ... all other fields
  artifact: AndroidArtifact | IOSArtifact;
}

export interface AndroidArtifact {
  buildUrl: string;
  internalTestingLink?: string;  // Not present in resubmissions
}

export interface IOSArtifact {
  testflightBuildNumber: number;
}
```

---

#### 8.2 Fix Type Imports

**Run:** 
```bash
# Find all `any` types
grep -r "any" app/components/distribution/ app/routes/api.v1.*distribution* app/routes/api.v1.*submission*

# Fix each occurrence
```

**Acceptance Criteria:**
- [ ] Zero `any` types
- [ ] All function params typed
- [ ] All return types specified
- [ ] Proper null handling (`| null`, `| undefined`)
- [ ] No type assertions (`as`)

---

#### 8.3 Response Type Validation

**Ensure API responses match types:**

```typescript
// In API routes
import { z } from 'zod';

const SubmitRequestSchema = z.object({
  rolloutPercent: z.number().min(0).max(100).optional(),
  inAppPriority: z.number().min(0).max(5).optional(),
  releaseNotes: z.string().optional(),
  phasedRelease: z.boolean().optional(),
  resetRating: z.boolean().optional()
});

// Validate request
const body = SubmitRequestSchema.parse(await request.json());
```

**Acceptance Criteria:**
- [ ] Request validation with Zod
- [ ] Response types match interfaces
- [ ] Runtime validation for critical fields

---

### PHASE 9: Testing & Validation (Days 9-10) - P0 CRITICAL

**Goal:** Complete comprehensive testing using DISTRIBUTION_TESTING_PLAN.md

**Reference:** DISTRIBUTION_TESTING_PLAN.md (all 1,192 lines)

#### 9.1 Setup Testing Environment

```bash
# Start mock server
cd /Users/princetripathi/workspace/delivr/delivr-web-panel-managed
npm run dev:with-mock
```

**Verify:**
- [ ] Frontend: http://localhost:3000
- [ ] Mock Server: http://localhost:3001
- [ ] Health check: `curl http://localhost:3001/health`

---

#### 9.2 Test Scenario 1: Release Page - Distribution Tab (LIMITED)

**Reference:** DISTRIBUTION_TESTING_PLAN.md lines 53-115

**Test Cases:**
- [ ] TC-1.1: Page Load - PENDING Submissions Exist
- [ ] TC-1.2: Submit Android Only
- [ ] TC-1.3: Submit iOS Only
- [ ] TC-1.4: Submit Both Platforms
- [ ] TC-1.5: Version Conflict Handling
- [ ] TC-1.6: Active Rollout Prevention
- [ ] TC-1.7: Navigate to Full Management
- [ ] TC-1.8: Manual Status Refresh

---

#### 9.3 Test Scenario 2: Distribution List

**Reference:** DISTRIBUTION_TESTING_PLAN.md lines 117-138

**Test Cases:**
- [ ] TC-2.1: List Loads Successfully
- [ ] TC-2.2: Status Filtering (if applicable)
- [ ] TC-2.3: Navigate to Management
- [ ] TC-2.4: Empty State (when no distributions)

**Mock Scenarios:**
```bash
# Test empty state
node mock-server/scenarios.js empty

# Test with data
node mock-server/scenarios.js active

# Test pagination
node mock-server/scenarios.js many
```

---

#### 9.4 Test Scenario 3-9: Full Management

**Reference:** DISTRIBUTION_TESTING_PLAN.md lines 140-717

**Test Scenarios:**
- [ ] Scenario 3: Full Management Page Load
- [ ] Scenario 4: Android Rollout (8 test cases)
- [ ] Scenario 5: iOS Phased Rollout (8 test cases)
- [ ] Scenario 6: iOS Manual Rollout (5 test cases)
- [ ] Scenario 7: Resubmission After Rejection
- [ ] Scenario 8: Submission History
- [ ] Scenario 9: Multi-Platform Management

**Platform-Specific Test Matrices:**
- [ ] Android Matrix (8 tests) - DISTRIBUTION_TESTING_PLAN.md lines 718-728
- [ ] iOS Phased Matrix (8 tests) - DISTRIBUTION_TESTING_PLAN.md lines 732-742
- [ ] iOS Manual Matrix (5 tests) - DISTRIBUTION_TESTING_PLAN.md lines 746-755

---

#### 9.5 Edge Cases Testing

**Reference:** DISTRIBUTION_TESTING_PLAN.md lines 758-868

**Categories:**
- [ ] Network Errors (7 test cases)
- [ ] Validation Errors (4 test cases)
- [ ] Concurrent Operations (2 test cases)
- [ ] Empty & Loading States (3 test cases)

---

#### 9.6 Visual/UI Testing

**Reference:** DISTRIBUTION_TESTING_PLAN.md lines 870-955

**Checklists:**
- [ ] Responsive Design (4 breakpoints)
- [ ] Component States (5 state types)
- [ ] Accessibility (4 categories)
- [ ] Animation & Performance (2 categories)

---

#### 9.7 Final Validation

**Run:**
```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

**Acceptance Criteria:**
- [ ] Zero TypeScript errors
- [ ] Zero linter warnings
- [ ] Build succeeds
- [ ] All 100+ test cases pass
- [ ] All platform-specific tests pass
- [ ] All edge cases handled
- [ ] Visual/UI checks complete

---

## ✅ Definition of Done

### Code Quality
- [ ] Zero TypeScript errors (`npm run type-check`)
- [ ] Zero linter warnings (`npm run lint`)
- [ ] Zero console errors in browser
- [ ] No `any` types used anywhere
- [ ] All `.cursorrules` followed
- [ ] Code reviewed and approved

### Functionality
- [ ] All 4 critical route issues fixed
- [ ] All 11 API routes match spec exactly
- [ ] All components use correct APIs
- [ ] Platform-specific rules enforced (Android/iOS Phased/iOS Manual)
- [ ] Status flows work correctly (5-state + 8-state)
- [ ] Auto-created PENDING submissions handled correctly
- [ ] Two-module architecture (LIMITED vs FULL) working

### API Alignment
- [ ] First-time submit: `PUT /submissions/:submissionId/submit`
- [ ] Resubmission: `POST /distributions/:distributionId/submissions`
- [ ] Page route: `/distributions/:distributionId`
- [ ] All 11 endpoints match DISTRIBUTION_API_SPEC.md
- [ ] Request/response formats exact match
- [ ] Platform-specific validation enforced

### Testing
- [ ] All 100+ test cases from DISTRIBUTION_TESTING_PLAN.md pass
- [ ] All platform-specific test matrices pass (Android, iOS Phased, iOS Manual)
- [ ] All edge cases handled (network errors, validation, concurrency)
- [ ] Visual/UI/accessibility checks complete
- [ ] E2E flows complete successfully

### Documentation
- [ ] API calls documented in component comments
- [ ] Complex logic has explanatory comments
- [ ] No outdated comments
- [ ] Type definitions documented

---

## 🚦 Execution Order

### Day 1: CRITICAL FIXES (BLOCKING)
**Priority:** P0 - Nothing else works until this is done

1. Create `api.v1.submissions.$submissionId.submit.ts`
2. Create `api.v1.distributions.$distributionId.submissions.ts`
3. Rename `dashboard.$org.distributions.$releaseId.tsx` → `$distributionId.tsx`
4. Delete obsolete routes
5. Update `SubmitToStoresForm.tsx` and `ReSubmissionDialog.tsx`
6. Update all navigation links

**Verification:** Can submit to stores + can resubmit after rejection

---

### Day 2: API ROUTES VERIFICATION
**Priority:** P0

1. Verify all 11 endpoints exist
2. Create missing routes (pause, resume, halt)
3. Fix any response format mismatches
4. Test each endpoint with mock server

**Verification:** All API endpoints respond correctly

---

### Day 3: COMPONENT UPDATES
**Priority:** P1

1. Update all 7 dialog components
2. Update RolloutControls.tsx
3. Fix all navigation links
4. Update breadcrumbs

**Verification:** All components call correct APIs

---

### Day 4: PLATFORM LOGIC
**Priority:** P1

1. Create `platform-rules.ts` utility
2. Implement Android rollout rules
3. Implement iOS Phased rollout rules
4. Implement iOS Manual rollout rules
5. Add validation logic

**Verification:** Platform-specific rules enforced

---

### Day 5: STATUS FLOWS
**Priority:** P1

1. Update DistributionStatus enum (5 states)
2. Update SubmissionStatus enum (8 states)
3. Implement status derivation logic
4. Update all badge colors and icons
5. Update all status displays

**Verification:** Status flows match spec

---

### Day 6: AUTO-CREATED SUBMISSIONS
**Priority:** P1

1. Update Release Page distribution tab
2. Handle PENDING submission display
3. Update Submit dialog for PENDING
4. Implement empty state

**Verification:** PENDING submissions handled correctly

---

### Day 7: TWO-MODULE ARCHITECTURE
**Priority:** P1

1. Implement LIMITED view on release page
2. Implement FULL view on distribution management
3. Differentiate capabilities
4. Add prominent navigation between views

**Verification:** Two modules distinct and working

---

### Day 8: TYPE SAFETY
**Priority:** P2

1. Update all type definitions
2. Fix all `any` types
3. Add Zod validation
4. Run type check

**Verification:** Zero TypeScript errors

---

### Days 9-10: COMPREHENSIVE TESTING
**Priority:** P0

1. Setup mock server
2. Run all 9 test scenarios
3. Complete all 100+ test cases
4. Test all platform matrices
5. Test edge cases
6. Visual/UI testing
7. Final validation

**Verification:** All tests pass + production ready

---

## 📚 Quick Reference

**API Spec:** `docs/distribution/DISTRIBUTION_API_SPEC.md` (Holy Grail)  
**UI Flows:** `docs/distribution/DISTRIBUTION_UI_FLOW_SPEC.md`  
**Testing:** `docs/distribution/DISTRIBUTION_TESTING_PLAN.md`

**Start Here:** Phase 1.1 - Create first-time submit API route

---

**Status:** 🚧 **READY TO IMPLEMENT**  
**Date:** December 14, 2025  
**Approach:** Senior Software Engineer - Zero Mistakes - Production Ready

