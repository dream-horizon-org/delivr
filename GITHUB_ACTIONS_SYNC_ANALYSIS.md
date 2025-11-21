# GitHub Actions Integration - Backend vs Frontend Sync Analysis

## Overview
Analysis of GitHub Actions connection setup between backend and frontend implementations to ensure they are in sync.

---

## 🔧 Backend Implementation

### Routes
**Base Path:** `/tenants/:tenantId/integrations/ci-cd/connections`

```typescript
POST   /tenants/:tenantId/integrations/ci-cd/connections/:providerType/verify  // Verify credentials
POST   /tenants/:tenantId/integrations/ci-cd/connections/:providerType         // Create connection
GET    /tenants/:tenantId/integrations/ci-cd/connections/:integrationId        // Get connection
PATCH  /tenants/:tenantId/integrations/ci-cd/connections/:integrationId        // Update connection
DELETE /tenants/:tenantId/integrations/ci-cd/connections/:integrationId        // Delete connection
```

**Provider Type for GitHub Actions:** `GITHUB_ACTIONS`

### Data Structure

**TenantCICDIntegration:**
```typescript
{
  id: string;
  tenantId: string;
  providerType: 'JENKINS' | 'GITHUB_ACTIONS' | 'CIRCLE_CI' | 'GITLAB_CI';
  displayName: string;
  hostUrl: string;                    // e.g., "https://api.github.com"
  authType: 'BASIC' | 'BEARER' | 'HEADER';
  username?: string | null;
  apiToken?: string | null;          // Personal Access Token (sensitive)
  headerName?: string | null;
  headerValue?: string | null;       // (sensitive)
  providerConfig?: Record<string, unknown> | null;
  verificationStatus: 'PENDING' | 'VALID' | 'INVALID' | 'EXPIRED';
  lastVerifiedAt?: Date | null;
  verificationError?: string | null;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**SafeCICDIntegration (returned to frontend):**
```typescript
// Same as TenantCICDIntegration but WITHOUT apiToken and headerValue
```

### Create Integration DTO
```typescript
{
  displayName?: string;     // Optional - defaults to "GitHub Actions"
  apiToken: string;         // Required - PAT token
}
```

**Backend Logic:**
- Validates only ONE GitHub Actions connection per tenant
- Auto-sets:
  - `providerType`: `GITHUB_ACTIONS`
  - `hostUrl`: `https://api.github.com`
  - `authType`: `BEARER`
  - `verificationStatus`: Based on token verification
  - `lastVerifiedAt`: Current timestamp

**Token Scopes Required:**
- `repo`
- `workflow`
- `read:org`

---

## 💻 Frontend Implementation

### Component
**File:** `app/components/Integrations/GitHubActionsConnectionFlow.tsx`

### API Calls (ISSUE DETECTED ⚠️)

**Frontend is calling:**
```typescript
// Verify
POST /api/v1/tenants/${tenantId}/integrations/github-actions/verify
Body: { apiToken?: string }

// Create
POST /api/v1/tenants/${tenantId}/integrations/github-actions
Body: { displayName?, hostUrl, apiToken? }

// Update
PATCH /api/v1/tenants/${tenantId}/integrations/github-actions
Body: { displayName?, hostUrl, apiToken? }
```

**Backend expects:**
```typescript
// Verify
POST /tenants/${tenantId}/integrations/ci-cd/connections/GITHUB_ACTIONS/verify
Body: { displayName?, apiToken }

// Create
POST /tenants/${tenantId}/integrations/ci-cd/connections/GITHUB_ACTIONS
Body: { displayName?, apiToken }

// Update
PATCH /tenants/${tenantId}/integrations/ci-cd/connections/${integrationId}
Body: { displayName?, hostUrl?, authType?, apiToken?, etc. }
```

---

## 🚨 Issues Found

### 1. **API Path Mismatch** ❌

| Operation | Frontend Path | Backend Path | Status |
|-----------|---------------|--------------|--------|
| Verify | `/api/v1/tenants/:tenantId/integrations/github-actions/verify` | `/tenants/:tenantId/integrations/ci-cd/connections/GITHUB_ACTIONS/verify` | ❌ MISMATCH |
| Create | `/api/v1/tenants/:tenantId/integrations/github-actions` | `/tenants/:tenantId/integrations/ci-cd/connections/GITHUB_ACTIONS` | ❌ MISMATCH |
| Update | `/api/v1/tenants/:tenantId/integrations/github-actions` | `/tenants/:tenantId/integrations/ci-cd/connections/:integrationId` | ❌ MISMATCH |

### 2. **Update Endpoint Logic** ❌
- **Frontend**: Uses provider-specific path (doesn't pass integrationId)
- **Backend**: Requires integrationId in the path
- **Issue**: Frontend can't update existing connections properly

### 3. **hostUrl Field** ⚠️
- **Frontend**: Sends `hostUrl` in create/update
- **Backend**: GitHub Actions service hardcodes `hostUrl` to `PROVIDER_DEFAULTS.GITHUB_API`
- **Issue**: Frontend sends unnecessary field (but harmless)

### 4. **Missing Integration ID** ❌
- **Frontend**: Doesn't receive or store `integrationId` after creation
- **Backend**: Returns `SafeCICDIntegration` with `id` field
- **Issue**: Frontend can't make subsequent API calls (edit/delete)

---

## ✅ What's Working

1. **Data Structure**: Frontend form fields match backend DTO requirements
2. **Validation**: Token scopes documented correctly
3. **Verification Flow**: Frontend properly implements verify-then-connect pattern
4. **Security**: Token is never pre-populated in edit mode
5. **UX**: Clear messaging about optional token (SCM fallback)

---

## 🔧 Required Frontend Fixes

### 1. Update API Paths

```typescript
// ❌ OLD
const verifyUrl = `/api/v1/tenants/${tenantId}/integrations/github-actions/verify`;
const createUrl = `/api/v1/tenants/${tenantId}/integrations/github-actions`;
const updateUrl = `/api/v1/tenants/${tenantId}/integrations/github-actions`;

// ✅ NEW
const verifyUrl = `/api/v1/tenants/${tenantId}/integrations/ci-cd/connections/GITHUB_ACTIONS/verify`;
const createUrl = `/api/v1/tenants/${tenantId}/integrations/ci-cd/connections/GITHUB_ACTIONS`;
const updateUrl = `/api/v1/tenants/${tenantId}/integrations/ci-cd/connections/${integrationId}`;
```

### 2. Store Integration ID

```typescript
// After successful creation
const data = await response.json();
if (data.success) {
  // Store data.integration.id for future operations
  onConnect({
    ...data,
    integrationId: data.integration.id  // Make sure to pass this
  });
}
```

### 3. Remove Unnecessary hostUrl

```typescript
// ❌ OLD
const payload: any = {
  displayName: formData.displayName || 'GitHub Actions',
  hostUrl: formData.hostUrl,  // Backend ignores this
  apiToken: formData.apiToken
};

// ✅ NEW
const payload: any = {
  displayName: formData.displayName || 'GitHub Actions',
  apiToken: formData.apiToken  // Only required field
};
```

### 4. Update Component Props

```typescript
interface GitHubActionsConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: {
    id: string;              // ✅ Add this (integrationId)
    displayName?: string;
    verificationStatus?: string;
    lastVerifiedAt?: string;
    // Don't include apiToken (security)
  };
}
```

---

## 📊 Backend Expected vs Frontend Actual

### Create Request

| Field | Backend Expects | Frontend Sends | Status |
|-------|----------------|----------------|--------|
| `displayName` | Optional | ✅ Yes (optional) | ✅ OK |
| `apiToken` | Required | ✅ Yes | ✅ OK |
| `hostUrl` | Auto-set | ❌ Sends (ignored) | ⚠️ Unnecessary |

### Update Request

| Field | Backend Expects | Frontend Sends | Status |
|-------|----------------|----------------|--------|
| Integration ID | In URL path | ❌ Not provided | ❌ BROKEN |
| `displayName` | Optional | ✅ Yes | ✅ OK |
| `apiToken` | Optional | ✅ Yes (when provided) | ✅ OK |
| `hostUrl` | Optional | ❌ Sends | ⚠️ Unnecessary |

---

## 🎯 Summary

**Overall Sync Status:** ⚠️ **PARTIALLY SYNCED - NEEDS FIXES**

### Critical Issues (Must Fix):
1. ❌ API path mismatch for all operations
2. ❌ Update endpoint missing integrationId
3. ❌ Frontend doesn't store/use integrationId

### Minor Issues (Should Fix):
1. ⚠️ Sending unnecessary `hostUrl` field
2. ⚠️ Form field for `hostUrl` serves no purpose

### Working Correctly:
1. ✅ DTO structure matches
2. ✅ Verification flow works
3. ✅ Security practices (no token pre-population)
4. ✅ Token scopes documented
5. ✅ User experience (SCM fallback messaging)

---

## 🔄 Recommended Next Steps

1. **Update GitHubActionsConnectionFlow.tsx:**
   - Fix all API paths to match backend routes
   - Add integrationId handling for edit mode
   - Remove hostUrl field from form
   - Update props interface

2. **Update parent components:**
   - Ensure integrationId is stored after creation
   - Pass integrationId to edit mode

3. **Test flows:**
   - Create new GitHub Actions connection
   - Edit existing connection
   - Verify connection
   - Delete connection

4. **Consider:**
   - Creating a shared API client/service for CI/CD integrations
   - Using TypeScript types from backend (code generation)
   - Adding error handling for missing integrationId

---

**Date:** 2025-11-21  
**Status:** Analysis Complete - Fixes Required

