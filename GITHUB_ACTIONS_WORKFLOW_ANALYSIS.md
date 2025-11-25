# GitHub Actions Workflow Implementation Analysis

## Overview
This document analyzes the GitHub Actions workflow creation flow, comparing:
1. Direct workflow API requirements
2. Release config workflow integration
3. UI field alignment with backend DTOs
4. Parameter mismatches and issues

---

## 1. Direct Workflow API (Standalone Workflow Creation)

### Backend Endpoint
**POST** `/api/v1/tenants/:tenantId/workflows`

### Backend Controller
`delivr-server-ota-managed/api/script/controllers/integrations/ci-cd/workflows/workflows.controller.ts`

### Required Parameters (CreateWorkflowDto)
```typescript
interface CreateWorkflowDto {
  providerType: CICDProviderType;        // Required: 'GITHUB_ACTIONS'
  integrationId: string;                 // Required: GitHub integration ID
  workflowUrl: string;                    // Required: Full workflow URL
  displayName: string;                   // Required: Human-readable name
  platform: Platform;                    // Required: 'ANDROID' | 'IOS'
  workflowType: WorkflowType;            // Required: 'PRE_REGRESSION_BUILD' | 'REGRESSION_BUILD' | 'TEST_FLIGHT_BUILD' | etc.
  parameters?: Record<string, unknown>;  // Optional: Workflow inputs/parameters
  providerIdentifiers?: Record<string, unknown>; // Optional: Additional provider metadata
}
```

### Validation (Line 30)
```typescript
const missingRequired = !body.providerType || !body.integrationId || 
                        !body.workflowUrl || !body.displayName || 
                        !body.platform || !body.workflowType;
```

### What Gets Stored
- `workflowUrl`: Full URL to the workflow file (e.g., `https://github.com/owner/repo/blob/main/.github/workflows/build.yml`)
- `parameters`: Workflow inputs stored as key-value pairs
- `providerIdentifiers`: Additional metadata (optional)

---

## 2. Release Config Workflow Integration

### Flow Overview
1. **UI** → User configures workflow in release config wizard
2. **BFF Transformation** → `release-config-payload.ts` transforms UI structure to backend format
3. **Backend Service** → `ReleaseConfigService.createConfig()` processes workflows
4. **Workflow Creation** → Workflows are created via the same workflow API

### UI Structure (GitHubActionsConfig)
```typescript
interface GitHubActionsConfig {
  type: 'GITHUB_ACTIONS';
  integrationId: string;        // ✅ Matches backend
  workflowId: string;           // ⚠️ Used for existing workflows
  workflowPath: string;         // ❌ MISMATCH: UI uses 'workflowPath'
  branch: string;               // ✅ Stored in parameters
  inputs: Record<string, string>; // ✅ Stored in parameters.inputs
}
```

### Backend DTO (CreateWorkflowDto)
```typescript
interface CreateWorkflowDto {
  providerType: 'GITHUB_ACTIONS';  // ✅ Matches
  integrationId: string;           // ✅ Matches
  workflowUrl: string;              // ❌ MISMATCH: Backend expects 'workflowUrl'
  displayName: string;              // ✅ From workflow.name
  platform: string;                 // ✅ From workflow.platform
  workflowType: string;             // ✅ Mapped from workflow.environment
  parameters: {
    workflowId?: string;           // ✅ From providerConfig.workflowId
    branch?: string;                // ✅ From providerConfig.branch
    inputs?: Record<string, string>; // ✅ From providerConfig.inputs
  };
  providerIdentifiers: {
    workflowId?: string;            // ✅ From providerConfig.workflowId
    workflowPath?: string;          // ✅ From providerConfig.workflowPath
  };
}
```

---

## 3. Transformation Logic Analysis

### Current Transformation (release-config-payload.ts:78-90)
```typescript
} else if (providerConfig.type === 'GITHUB_ACTIONS') {
  integrationId = providerConfig.integrationId || '';
  workflowUrl = providerConfig.workflowUrl || '';  // ❌ BUG: UI has 'workflowPath', not 'workflowUrl'
  parameters = {
    workflowId: providerConfig.workflowId,
    branch: providerConfig.branch,
    ...(providerConfig.inputs && { inputs: providerConfig.inputs }),
  };
  providerIdentifiers = {
    workflowId: providerConfig.workflowId,
    workflowPath: providerConfig.workflowPath,  // ✅ Correctly uses workflowPath
  };
}
```

### Issue Identified
**CRITICAL BUG**: Line 80 tries to read `providerConfig.workflowUrl`, but the UI only provides `providerConfig.workflowPath`. This will result in an empty `workflowUrl` being sent to the backend, causing workflow creation to fail validation.

---

## 4. Field Mapping Comparison

| UI Field (GitHubActionsConfig) | Backend Field (CreateWorkflowDto) | Status | Notes |
|--------------------------------|-----------------------------------|--------|-------|
| `integrationId` | `integrationId` | ✅ Match | Direct mapping |
| `workflowId` | `parameters.workflowId` | ✅ Match | Stored in parameters |
| `workflowPath` | `workflowUrl` | ❌ **MISMATCH** | **BUG: Transformation uses wrong field** |
| `branch` | `parameters.branch` | ✅ Match | Stored in parameters |
| `inputs` | `parameters.inputs` | ✅ Match | Stored in parameters |
| - | `providerIdentifiers.workflowPath` | ✅ Match | Uses UI workflowPath |
| - | `displayName` | ✅ Match | From workflow.name |
| - | `platform` | ✅ Match | From workflow.platform |
| - | `workflowType` | ✅ Match | Mapped from workflow.environment |

---

## 5. Parameter Flow Analysis

### When Using Existing Workflow
```typescript
// PipelineEditModal.tsx:228-236
finalProviderConfig = {
  type: BUILD_PROVIDERS.GITHUB_ACTIONS,
  integrationId: selectedWorkflow.integrationId,
  workflowId: selectedWorkflow.id,
  workflowPath: selectedWorkflow.workflowUrl,  // ✅ Uses workflowUrl from existing workflow
  branch: 'main',
  inputs: selectedWorkflow.parameters || {},
};
```

### When Creating New Workflow
```typescript
// GitHubActionsConfigForm.tsx
// User enters:
- integrationId: Selected from dropdown
- workflowPath: User enters (e.g., ".github/workflows/build.yml")
- branch: User enters (default: "main")
- inputs: User enters or fetches from GitHub API
```

### Transformation Issue
The transformation code expects `workflowUrl` but UI provides `workflowPath`. For new workflows, this will fail.

---

## 6. Required Parameters Summary

### For Direct Workflow API
1. ✅ `providerType`: 'GITHUB_ACTIONS'
2. ✅ `integrationId`: GitHub integration ID
3. ❌ `workflowUrl`: **MISSING** - UI provides `workflowPath` instead
4. ✅ `displayName`: From workflow name
5. ✅ `platform`: From workflow platform
6. ✅ `workflowType`: Mapped from environment

### For Release Config Flow
- Same requirements as direct API
- **Additional issue**: `workflowUrl` is empty due to field mismatch

---

## 7. Recommendations

### Fix Required
**File**: `app/.server/services/ReleaseConfig/release-config-payload.ts`

**Current Code (Line 80)**:
```typescript
workflowUrl = providerConfig.workflowUrl || '';
```

**Should Be**:
```typescript
// workflowPath from UI needs to be converted to full workflowUrl
// If workflowPath is a relative path, we need the full GitHub URL
// If it's already a full URL, use it directly
workflowUrl = providerConfig.workflowUrl || 
               providerConfig.workflowPath || 
               '';
```

**Better Solution**:
```typescript
// For GitHub Actions, workflowPath might be:
// 1. Relative path: ".github/workflows/build.yml"
// 2. Full URL: "https://github.com/owner/repo/blob/main/.github/workflows/build.yml"
// 3. Workflow file path: ".github/workflows/build.yml"

// We need to construct the full URL if only path is provided
// OR use workflowPath directly if it's already a URL
let workflowUrl = providerConfig.workflowUrl || providerConfig.workflowPath || '';

// If workflowPath is relative, we might need to construct full URL
// This requires integration details to get repo owner/name
// For now, assume workflowPath can be used directly if it's a URL
```

### Additional Considerations
1. **Workflow Path vs URL**: UI uses `workflowPath` which could be:
   - Relative path: `.github/workflows/build.yml`
   - Full URL: `https://github.com/owner/repo/blob/main/.github/workflows/build.yml`
   
2. **Backend Expectation**: Backend expects `workflowUrl` which should be a full URL

3. **Resolution Strategy**:
   - If `workflowPath` is a full URL → use it as `workflowUrl`
   - If `workflowPath` is relative → construct full URL from integration details
   - Fallback to `workflowUrl` if provided

---

## 8. Testing Checklist

- [ ] Create new GitHub Actions workflow via release config
- [ ] Use existing workflow in release config
- [ ] Verify workflowUrl is correctly populated
- [ ] Verify parameters are correctly stored
- [ ] Verify providerIdentifiers are correctly stored
- [ ] Test with relative workflowPath
- [ ] Test with full workflowPath URL
- [ ] Verify backend validation passes

---

## 9. Conclusion

### Issues Found
1. **CRITICAL**: Field mismatch - UI provides `workflowPath` but transformation looks for `workflowUrl`
2. **MINOR**: No handling for relative vs absolute workflow paths

### Alignment Status
- ✅ Most fields are correctly aligned
- ❌ `workflowPath` → `workflowUrl` transformation is broken
- ✅ Parameters structure matches backend expectations
- ✅ Provider identifiers structure matches backend expectations

### Next Steps
1. Fix the transformation to handle `workflowPath` → `workflowUrl` conversion
2. Add logic to handle relative vs absolute paths
3. Test workflow creation through release config flow
4. Verify backend receives correct `workflowUrl` value

