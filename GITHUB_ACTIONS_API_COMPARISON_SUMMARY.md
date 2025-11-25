# GitHub Actions Workflow API Comparison Summary

## Quick Answer: Are We Using Proper Backend APIs?

✅ **YES** - We're using the correct endpoint: `POST /api/v1/tenants/:tenantId/workflows`

❌ **NO** - Parameter mismatch: `workflowUrl` field has critical issue

---

## Parameter Comparison Table

| Backend Field | Backend Expects | UI Collects | Status | Issue |
|--------------|----------------|-------------|--------|-------|
| `providerType` | `'GITHUB_ACTIONS'` | `BUILD_PROVIDERS.GITHUB_ACTIONS` | ✅ | Correct |
| `integrationId` | `string` (required) | `config.integrationId` | ✅ | Correct |
| `displayName` | `string` (required) | `name` (TextInput) | ✅ | Correct |
| `workflowUrl` | **Full GitHub URL** (required) | `config.workflowPath` (relative) | ❌ **CRITICAL** | **Mismatch** |
| `platform` | `'ANDROID' \| 'IOS'` | `platform` (Select) | ✅ | Correct |
| `workflowType` | `'PRE_REGRESSION_BUILD' \| ...` | `environment` → mapped | ✅ | Correct |
| `parameters.workflowId` | `string?` | `config.workflowId` | ✅ | Correct |
| `parameters.branch` | `string?` | `config.branch` | ✅ | Correct |
| `parameters.inputs` | `Record<string, string>?` | `config.inputs` | ✅ | Correct |
| `providerIdentifiers.workflowId` | `string?` | `config.workflowId` | ✅ | Correct |
| `providerIdentifiers.workflowPath` | `string?` | `config.workflowPath` | ✅ | Correct |

---

## Critical Issue: workflowUrl

### Backend Expects:
```typescript
workflowUrl: "https://github.com/owner/repo/blob/main/.github/workflows/build.yml"
// OR
workflowUrl: "https://github.com/owner/repo/actions/workflows/workflow-name.yml"
```

### UI Provides:
```typescript
workflowPath: ".github/workflows/build.yml"  // ❌ Relative path
```

### Current Code (WorkflowCreateModal.tsx:230):
```typescript
workflowData.workflowUrl = providerConfig.workflowPath;  // ❌ Sends relative path!
```

### Problem:
Backend uses `parseGitHubWorkflowUrl()` which expects full URL. Relative paths will fail validation.

---

## Backend Validation

**File**: `workflows.controller.ts:30`
```typescript
const missingRequired = !body.providerType || 
                        !body.integrationId || 
                        !body.workflowUrl ||      // ⚠️ Will be empty/fail
                        !body.displayName || 
                        !body.platform || 
                        !body.workflowType;
```

**Result**: Workflow creation will **FAIL** with validation error.

---

## Solution Required

### Option 1: Fetch SCM Integration (Immediate Fix)
```typescript
// Get repository owner/repo from SCM integration
const scmIntegration = await fetchSCMIntegration(tenantId);
const branch = providerConfig.branch || 'main';
const workflowUrl = `https://github.com/${scmIntegration.owner}/${scmIntegration.repo}/blob/${branch}/${workflowPath}`;
```

### Option 2: Accept Full URL in UI
- Update form to accept full GitHub URL
- Validate URL format
- Still allow relative path but convert it

### Option 3: Backend Handles Relative Paths (Best)
- Update backend to accept relative paths
- Backend constructs full URL from SCM integration
- Requires backend changes

---

## Current Status

✅ **Correctly Implemented**:
- API endpoint ✅
- Authentication ✅
- Most parameters ✅
- Parameter structure ✅

❌ **Needs Fix**:
- `workflowUrl` construction (relative → full URL)

---

## Recommendation

**Priority**: 🔴 **HIGH** - Workflow creation will fail until fixed.

**Action**: Implement Option 1 (fetch SCM integration) for immediate fix, then consider Option 3 (backend handles it) for better architecture.

