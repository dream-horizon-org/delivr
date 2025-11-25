# Backend Job Parameters API Analysis

## Backend Route Structure

### Route Definition
```typescript
POST /tenants/:tenantId/integrations/ci-cd/:integrationId/job-parameters
```

**Path Parameters:**
- `:tenantId` - Required (validated by `validateTenantId`)
- `:integrationId` - **REQUIRED** (validated by `validateIntegrationIdParam`)

**Request Body:**
- `workflowUrl` - Required (validated by `validateWorkflowParamFetchBody`)

---

## Middleware Chain

The route uses three middleware validators:

1. **`validateTenantId`** (line 11)
   - Validates `tenantId` path parameter exists and is non-empty

2. **`validateIntegrationIdParam`** (line 12)
   - **Validates `integrationId` path parameter exists and is non-empty**
   - Returns 400 if missing: `ERROR_MESSAGES.WORKFLOW_INTEGRATION_INVALID`

3. **`validateWorkflowParamFetchBody`** (line 13)
   - Validates `workflowUrl` in request body exists and is non-empty
   - Returns 400 if missing: `ERROR_MESSAGES.WORKFLOW_MIN_PARAMS_REQUIRED`

---

## Controller Implementation

### `getJobParameters` Function (workflow-actions.controller.ts:7-30)

```typescript
export const getJobParameters = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;  // ✅ From path parameter

  try {
    // 1. Fetch integration using integrationId
    const integration = await getIntegrationForTenant(tenantId, integrationId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ 
        success: RESPONSE_STATUS.FAILURE, 
        error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND 
      });
    }

    // 2. Get adapter based on integration's providerType
    const adapter = getWorkflowAdapter(integration.providerType);
    
    // 3. Extract workflowUrl from body
    const body = (req.body || {}) as { workflowUrl?: string };
    
    // 4. Call adapter to fetch parameters
    const result = await adapter.fetchParameters(tenantId, body);
    
    return res.status(HTTP_STATUS.OK).json({ 
      success: RESPONSE_STATUS.SUCCESS, 
      parameters: result.parameters, 
      error: null 
    });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      success: RESPONSE_STATUS.FAILURE, 
      error: message 
    });
  }
};
```

---

## Why `integrationId` is Required

### 1. **To Fetch Integration Record**
```typescript
const integration = await getIntegrationForTenant(tenantId, integrationId);
```
- Needs `integrationId` to look up the integration in the database
- Validates integration exists and belongs to the tenant

### 2. **To Determine Provider Type**
```typescript
const adapter = getWorkflowAdapter(integration.providerType);
```
- Integration record contains `providerType` (JENKINS or GITHUB_ACTIONS)
- Used to select the correct adapter (Jenkins vs GitHub Actions)

### 3. **To Access Provider Credentials**
- Integration record contains credentials/tokens needed to authenticate with the provider
- Jenkins: hostUrl, username, apiToken
- GitHub Actions: apiToken, hostUrl
- These are used by the adapter to fetch parameters from the provider

### 4. **Security/Validation**
- Ensures the integration belongs to the tenant
- Prevents accessing integrations from other tenants

---

## Request Flow

```
Frontend Request
  ↓
POST /api/v1/tenants/:tenantId/workflows/job-parameters
Body: { providerType, integrationId, url }
  ↓
BFF Route (Remix)
  ↓
CICDIntegrationService.fetchJobParameters()
  ↓
Provider Service (Jenkins/GitHub Actions)
  ↓
POST /tenants/:tenantId/integrations/ci-cd/:integrationId/job-parameters
Body: { workflowUrl }
  ↓
Backend Controller
  ↓
1. Validate integrationId (middleware)
2. Fetch integration by integrationId
3. Get providerType from integration
4. Get adapter for providerType
5. Call adapter.fetchParameters(tenantId, { workflowUrl })
  ↓
Adapter (Jenkins/GitHub Actions)
  ↓
Service Layer (fetchJobParameters/fetchWorkflowInputs)
  ↓
Provider API (Jenkins API / GitHub API)
```

---

## Validation Summary

### Backend Validates:
1. ✅ `tenantId` - Path parameter (required)
2. ✅ `integrationId` - **Path parameter (REQUIRED)**
3. ✅ `workflowUrl` - Request body (required)

### Frontend Must Send:
1. ✅ `providerType` - To route to correct service
2. ✅ `integrationId` - **To forward to backend as path parameter**
3. ✅ `url` - To forward as `workflowUrl` in body

---

## Conclusion

**YES, `integrationId` is absolutely required in the backend!**

- It's a **path parameter** (not optional)
- It's validated by middleware before the controller runs
- It's used to:
  - Fetch the integration record
  - Determine provider type
  - Access provider credentials
  - Validate tenant ownership

**The frontend changes are correct** - we must send `integrationId` in the request body, and the BFF route must forward it to the backend as a path parameter in the URL.

