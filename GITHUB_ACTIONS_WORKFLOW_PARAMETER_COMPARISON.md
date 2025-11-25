# GitHub Actions Workflow Parameter Comparison
## Backend API vs UI Implementation

---

## 1. Backend API Requirements

### Endpoint
**POST** `/api/v1/tenants/:tenantId/workflows`

### Backend DTO (CreateWorkflowDto)
```typescript
interface CreateWorkflowDto {
  id?: string;                    // Optional - backend generates if not provided
  tenantId: string;                // From URL params
  providerType: 'GITHUB_ACTIONS';  // ✅ Required
  integrationId: string;          // ✅ Required
  displayName: string;             // ✅ Required
  workflowUrl: string;             // ✅ Required - FULL URL expected
  providerIdentifiers?: {          // Optional
    workflowId?: string;
    workflowPath?: string;
  };
  platform: string;                // ✅ Required - 'ANDROID' | 'IOS'
  workflowType: string;            // ✅ Required - 'PRE_REGRESSION_BUILD' | 'REGRESSION_BUILD' | etc.
  parameters?: {                   // Optional
    workflowId?: string;
    branch?: string;
    inputs?: Record<string, string>;
  };
  createdByAccountId: string;      // From auth (req.user.id)
}
```

### Backend Validation (Line 30)
```typescript
const missingRequired = !body.providerType || 
                        !body.integrationId || 
                        !body.workflowUrl ||      // ⚠️ Expects workflowUrl
                        !body.displayName || 
                        !body.platform || 
                        !body.workflowType;
```

### Backend URL Parsing
The backend uses `parseGitHubWorkflowUrl()` which expects:
- **Full GitHub URL format**: `https://github.com/owner/repo/blob/main/.github/workflows/build.yml`
- **OR**: `https://github.com/owner/repo/actions/workflows/workflow-name.yml`

**Backend Code** (github-actions-workflow.service.ts:75):
```typescript
const parsed = parseGitHubWorkflowUrl(workflow.workflowUrl);
if (!parsed) {
  throw new Error(ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL);
}
```

---

## 2. UI Collection (GitHubActionsConfigForm)

### Fields Collected
```typescript
interface GitHubActionsConfig {
  type: 'GITHUB_ACTIONS';
  integrationId: string;        // ✅ From dropdown - matches backend
  workflowPath: string;         // ❌ PROBLEM: Relative path, not full URL
  workflowId: string;           // ⚠️ Optional - workflow file name
  branch: string;               // ✅ Default: 'main'
  inputs: Record<string, string>; // ✅ Workflow inputs
}
```

### UI Form Fields
1. **GitHub Repository** (Select) → `integrationId` ✅
2. **Workflow Path** (TextInput) → `workflowPath` ❌ (e.g., `.github/workflows/build.yml`)
3. **Workflow ID** (TextInput) → `workflowId` ⚠️ (e.g., `build.yml`)
4. **Branch** (TextInput) → `branch` ✅ (default: `main`)
5. **Inputs** (Dynamic) → `inputs` ✅

---

## 3. WorkflowCreateModal Transformation

### What Gets Sent to Backend
```typescript
// WorkflowCreateModal.tsx:226-240
if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
  workflowData.workflowUrl = providerConfig.workflowPath;  // ❌ PROBLEM!
  workflowData.parameters = {
    workflowId: providerConfig.workflowId || '',
    branch: providerConfig.branch || 'main',
    ...(providerConfig.inputs && { inputs: providerConfig.inputs }),
  };
  workflowData.providerIdentifiers = {
    workflowId: providerConfig.workflowId || '',
    workflowPath: providerConfig.workflowPath,
  };
}
```

### Issues Identified

#### ❌ CRITICAL ISSUE #1: workflowUrl vs workflowPath
- **Backend expects**: `workflowUrl` = Full GitHub URL
- **UI provides**: `workflowPath` = Relative path (e.g., `.github/workflows/build.yml`)
- **Current code sends**: `workflowUrl = workflowPath` (relative path)
- **Result**: Backend `parseGitHubWorkflowUrl()` will fail validation!

#### ⚠️ ISSUE #2: Missing URL Construction
The backend needs a full URL like:
```
https://github.com/owner/repo/blob/main/.github/workflows/build.yml
```

But UI only collects:
- `workflowPath`: `.github/workflows/build.yml`
- `branch`: `main`

**Missing**: Repository owner and name to construct full URL.

---

## 4. Parameter Mapping Comparison

| Backend Field | Backend Type | UI Field | UI Type | Status | Notes |
|---------------|--------------|----------|---------|--------|-------|
| `providerType` | `'GITHUB_ACTIONS'` | `provider` | `BUILD_PROVIDERS.GITHUB_ACTIONS` | ✅ Match | Hardcoded in service |
| `integrationId` | `string` | `config.integrationId` | `string` | ✅ Match | Direct mapping |
| `displayName` | `string` | `name` | `string` | ✅ Match | From TextInput |
| `workflowUrl` | `string` (Full URL) | `config.workflowPath` | `string` (Relative) | ❌ **MISMATCH** | **CRITICAL** |
| `platform` | `'ANDROID' \| 'IOS'` | `platform` | `'ANDROID' \| 'IOS'` | ✅ Match | From Select |
| `workflowType` | `'PRE_REGRESSION_BUILD' \| ...` | `environment` | `'PRE_REGRESSION' \| ...` | ✅ Match | Mapped via `environmentToWorkflowType` |
| `parameters.workflowId` | `string?` | `config.workflowId` | `string` | ✅ Match | Stored in parameters |
| `parameters.branch` | `string?` | `config.branch` | `string` | ✅ Match | Stored in parameters |
| `parameters.inputs` | `Record<string, string>?` | `config.inputs` | `Record<string, string>` | ✅ Match | Stored in parameters |
| `providerIdentifiers.workflowId` | `string?` | `config.workflowId` | `string` | ✅ Match | Stored in providerIdentifiers |
| `providerIdentifiers.workflowPath` | `string?` | `config.workflowPath` | `string` | ✅ Match | Stored in providerIdentifiers |

---

## 5. Detailed Field Analysis

### ✅ Correctly Mapped Fields

#### 1. `providerType`
- **Backend**: `'GITHUB_ACTIONS'`
- **UI**: `BUILD_PROVIDERS.GITHUB_ACTIONS` → `'GITHUB_ACTIONS'`
- **Status**: ✅ Correct

#### 2. `integrationId`
- **Backend**: `string` (required)
- **UI**: Selected from dropdown
- **Status**: ✅ Correct

#### 3. `displayName`
- **Backend**: `string` (required)
- **UI**: `name` from TextInput
- **Status**: ✅ Correct

#### 4. `platform`
- **Backend**: `'ANDROID' | 'IOS'`
- **UI**: Selected from dropdown
- **Status**: ✅ Correct

#### 5. `workflowType`
- **Backend**: `'PRE_REGRESSION_BUILD' | 'REGRESSION_BUILD' | 'TEST_FLIGHT_BUILD' | 'CUSTOM'`
- **UI**: `environment` → mapped via `environmentToWorkflowType`
- **Mapping**:
  - `PRE_REGRESSION` → `PRE_REGRESSION_BUILD` ✅
  - `REGRESSION` → `REGRESSION_BUILD` ✅
  - `TESTFLIGHT` → `TEST_FLIGHT_BUILD` ✅
  - `PRODUCTION` → `CUSTOM` ✅
- **Status**: ✅ Correct

#### 6. `parameters`
- **Backend**: `{ workflowId?, branch?, inputs? }`
- **UI**: All fields collected correctly
- **Status**: ✅ Correct

#### 7. `providerIdentifiers`
- **Backend**: `{ workflowId?, workflowPath? }`
- **UI**: Both fields collected
- **Status**: ✅ Correct

### ❌ Incorrectly Mapped Fields

#### 1. `workflowUrl` (CRITICAL)
- **Backend expects**: Full GitHub URL
  - Format: `https://github.com/owner/repo/blob/main/.github/workflows/build.yml`
  - OR: `https://github.com/owner/repo/actions/workflows/workflow-name.yml`
- **UI provides**: Relative path
  - Format: `.github/workflows/build.yml`
- **Current transformation**: 
  ```typescript
  workflowData.workflowUrl = providerConfig.workflowPath;  // ❌ Wrong!
  ```
- **Problem**: Backend `parseGitHubWorkflowUrl()` will return `null` for relative paths
- **Impact**: Workflow creation will fail validation

---

## 6. Required Fix

### Solution: Construct Full URL from Integration Details

We need to:
1. Fetch integration details to get repository owner/name
2. Construct full URL from `workflowPath` + `branch` + repo details

### Implementation Approach

**Option 1: Fetch Integration Details**
```typescript
// In WorkflowCreateModal or service layer
const integration = await getIntegration(integrationId);
// integration should have: owner, repo, baseUrl, etc.

// Construct full URL
const workflowUrl = `https://github.com/${integration.owner}/${integration.repo}/blob/${branch}/${workflowPath}`;
```

**Option 2: Accept Full URL in UI**
- Update UI to accept full GitHub URL
- Validate URL format
- Still allow relative path but convert it

**Option 3: Backend Accepts Relative Path**
- Modify backend to accept relative paths
- Backend constructs full URL from integration details
- Requires backend changes

### Recommended Fix

**Issue**: GitHub Actions CI/CD integration doesn't store `owner`/`repo` - only has `displayName`, `hostUrl`, `apiToken`.

**Solution Options**:

#### Option 1: Fetch SCM Integration (Recommended)
GitHub repository info (owner/repo) is stored in SCM integration, not CI/CD integration.

```typescript
// In WorkflowCreateModal.tsx or service layer
if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
  let workflowUrl = providerConfig.workflowPath;
  
  // If relative path, fetch SCM integration to get owner/repo
  if (!workflowUrl.startsWith('http')) {
    // Fetch SCM GitHub integration for this tenant
    const scmIntegration = await fetchSCMIntegration(tenantId);
    
    if (scmIntegration && scmIntegration.owner && scmIntegration.repo) {
      const branch = providerConfig.branch || scmIntegration.defaultBranch || 'main';
      workflowUrl = `https://github.com/${scmIntegration.owner}/${scmIntegration.repo}/blob/${branch}/${workflowPath}`;
    } else {
      // Fallback: Show error or ask user for full URL
      throw new Error('SCM GitHub integration required to construct workflow URL');
    }
  }
  
  workflowData.workflowUrl = workflowUrl;  // ✅ Now full URL
}
```

#### Option 2: Accept Full URL in UI (Simpler)
Update UI to accept full GitHub URL and validate format.

```typescript
// GitHubActionsConfigForm.tsx
// Change "Workflow Path" to accept either:
// - Relative: ".github/workflows/build.yml"
// - Full URL: "https://github.com/owner/repo/blob/main/.github/workflows/build.yml"

// In WorkflowCreateModal.tsx
if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
  let workflowUrl = providerConfig.workflowPath;
  
  // If relative, try to construct from SCM, otherwise require full URL
  if (!workflowUrl.startsWith('http')) {
    // Try SCM integration first
    const scmIntegration = await fetchSCMIntegration(tenantId);
    if (scmIntegration?.owner && scmIntegration?.repo) {
      const branch = providerConfig.branch || 'main';
      workflowUrl = `https://github.com/${scmIntegration.owner}/${scmIntegration.repo}/blob/${branch}/${workflowPath}`;
    } else {
      // Require full URL if SCM not available
      throw new Error('Please provide full GitHub workflow URL or connect SCM integration');
    }
  }
  
  workflowData.workflowUrl = workflowUrl;
}
```

#### Option 3: Backend Handles Relative Paths (Best Long-term)
Update backend to accept relative paths and construct URL from SCM integration.

**Backend Change**:
```typescript
// In workflows.controller.ts
// If workflowUrl is relative, fetch SCM integration and construct full URL
if (!workflowUrl.startsWith('http')) {
  const scmIntegration = await getSCMIntegration(tenantId);
  if (scmIntegration?.owner && scmIntegration?.repo) {
    const branch = body.parameters?.branch || scmIntegration.defaultBranch || 'main';
    workflowUrl = `https://github.com/${scmIntegration.owner}/${scmIntegration.repo}/blob/${branch}/${workflowUrl}`;
  }
}
```

**Recommendation**: Use **Option 1** (fetch SCM integration) for immediate fix, then implement **Option 3** (backend handles it) for better architecture.

---

## 7. Testing Checklist

- [ ] Test with relative `workflowPath`: `.github/workflows/build.yml`
- [ ] Test with full `workflowPath`: `https://github.com/owner/repo/blob/main/.github/workflows/build.yml`
- [ ] Verify backend receives full URL in `workflowUrl`
- [ ] Verify `parseGitHubWorkflowUrl()` succeeds
- [ ] Verify workflow creation succeeds
- [ ] Verify workflow can be triggered later

---

## 8. Summary

### ✅ Correctly Implemented
- `providerType` ✅
- `integrationId` ✅
- `displayName` ✅
- `platform` ✅
- `workflowType` (mapping) ✅
- `parameters` structure ✅
- `providerIdentifiers` structure ✅

### ❌ Issues Found
1. **CRITICAL**: `workflowUrl` receives relative path instead of full URL
   - Backend expects: `https://github.com/owner/repo/blob/branch/path`
   - UI sends: `.github/workflows/build.yml`
   - Fix: Construct full URL from integration details

### 🔧 Required Changes
1. **WorkflowCreateModal.tsx** (Line 230):
   - Construct full GitHub URL from `workflowPath` + integration details
   - OR fetch integration details and build URL

2. **Alternative**: Update backend to accept relative paths and construct URL internally

---

## 9. API Endpoint Verification

### ✅ Correct Endpoint Used
- **POST** `/api/v1/tenants/:tenantId/workflows` ✅
- Service: `CICDIntegrationService.createWorkflow()` ✅
- Backend route: `/tenants/:tenantId/workflows` ✅

### ✅ Authentication
- `userId` passed correctly ✅
- `tenantId` from URL params ✅

### ⚠️ Payload Issue
- Payload structure matches DTO ✅
- **BUT**: `workflowUrl` value is incorrect (relative vs full URL) ❌

---

## Conclusion

**Status**: ⚠️ **PARTIALLY ALIGNED** - One critical issue with `workflowUrl` field.

**Priority**: 🔴 **HIGH** - Workflow creation will fail until `workflowUrl` is fixed.

**Recommendation**: 
1. Fetch integration details to get repository owner/name
2. Construct full GitHub URL before sending to backend
3. OR update backend to handle relative paths

