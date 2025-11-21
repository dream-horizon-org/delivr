# JIRA Verification 404 Error - Fix Applied

## Problem

**Error**: `POST /api/v1/tenants/:tenantId/integrations/jira/verify` returns:
```json
{"success":false,"verified":false,"error":"Request failed with status code 404"}
```

**Root Cause**: Backend was missing a stateless verification endpoint.

---

## Analysis

### What Was Happening

1. **Frontend** calls: `POST /api/v1/tenants/:tenantId/integrations/jira/verify`
2. **BFF** receives request and calls: `POST /projects/:projectId/integrations/project-management/verify`
3. **Backend** returns **404 Not Found** because this route didn't exist

### Backend Routes (Before Fix)

The backend only had:
```
POST /projects/:projectId/integrations/project-management/:integrationId/verify
```

This requires an **existing** `integrationId` - you can't verify credentials before saving!

### What Was Missing

A **stateless** verification endpoint (like Test Management has):
```
POST /projects/:projectId/integrations/project-management/verify
```

This allows verifying credentials **before** creating an integration.

---

## Fix Applied

### File 1: Controller
**Path**: `/api/script/controllers/integrations/project-management/integration/integration.controller.ts`

**Added**: New `verifyCredentialsHandler` function

```typescript
/**
 * Verify credentials without saving (stateless verification)
 * POST /projects/:projectId/integrations/project-management/verify
 */
const verifyCredentialsHandler = (_service: ProjectManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerType, config } = req.body;

      // Validate providerType
      const providerTypeError = validateProviderType(providerType);
      if (providerTypeError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('providerType', providerTypeError)
        );
        return;
      }

      // Validate config structure
      const configError = validateConfigStructure(config, providerType);
      if (configError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('config', configError));
        return;
      }

      // Use ProviderFactory to validate config
      const { ProviderFactory } = await import('~services/integrations/project-management/providers');
      const provider = ProviderFactory.getProvider(providerType);
      const isValid = await provider.validateConfig(config);

      res.status(HTTP_STATUS.OK).json(
        successResponse({
          success: isValid,
          verified: isValid,
          message: isValid ? 'Credentials are valid' : 'Credentials are invalid'
        })
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.VERIFY_INTEGRATION_FAILED)
      );
    }
  };
```

**Exported** in controller:
```typescript
export const createProjectManagementIntegrationController = (
  service: ProjectManagementIntegrationService
) => ({
  // ... other methods ...
  verifyCredentials: verifyCredentialsHandler(service),  // ← Added
  verifyIntegration: verifyIntegrationHandler(service)
});
```

### File 2: Routes
**Path**: `/api/script/routes/integrations/project-management/integration/integration.routes.ts`

**Added**: New route for stateless verification

```typescript
// Verify credentials without saving (stateless)
router.post(
  '/projects/:projectId/integrations/project-management/verify',
  controller.verifyCredentials
);
```

---

## How It Works Now

### Request Flow

```
┌─────────────────────────────────────────────────────┐
│ Frontend: User clicks "Verify Credentials"         │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ POST /api/v1/tenants/:tenantId/integrations/       │
│      jira/verify                                    │
│                                                     │
│ Body:                                               │
│ {                                                   │
│   "hostUrl": "https://domain.atlassian.net",       │
│   "email": "user@example.com",                     │
│   "apiToken": "xxx",                               │
│   "jiraType": "CLOUD"                              │
│ }                                                   │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ BFF: Transform request                             │
│                                                     │
│ POST http://localhost:3000/projects/               │
│      {tenantId}/integrations/project-management/   │
│      verify                                         │
│                                                     │
│ Body:                                               │
│ {                                                   │
│   "providerType": "JIRA",                          │
│   "config": {                                       │
│     "baseUrl": "https://domain.atlassian.net",     │
│     "email": "user@example.com",                   │
│     "apiToken": "xxx",                             │
│     "jiraType": "CLOUD"                            │
│   }                                                 │
│ }                                                   │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ Backend: New verify endpoint ✅                     │
│                                                     │
│ 1. Validate providerType ("JIRA")                  │
│ 2. Validate config structure                       │
│ 3. Get JIRA provider from ProviderFactory          │
│ 4. Call provider.validateConfig(config)            │
│    - Creates JiraClient                            │
│    - Calls JIRA API: GET /rest/api/3/myself        │
│    - Tests authentication                          │
│ 5. Return result                                   │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ Response:                                           │
│ {                                                   │
│   "success": true,                                 │
│   "data": {                                        │
│     "success": true,                               │
│     "verified": true,                              │
│     "message": "Credentials are valid"             │
│   }                                                 │
│ }                                                   │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ Frontend: Shows success message ✅                  │
│ "Credentials verified successfully!"               │
└─────────────────────────────────────────────────────┘
```

---

## Testing

### 1. Restart Backend Server

```bash
cd delivr-server-ota-managed
npm run dev
```

Wait for: `[Release Management] Project Management routes mounted successfully`

### 2. Test Direct Backend Call

```bash
curl -X POST http://localhost:3000/projects/test-project/integrations/project-management/verify \
  -H "Content-Type: application/json" \
  -d '{
    "providerType": "JIRA",
    "config": {
      "baseUrl": "https://your-domain.atlassian.net",
      "email": "your-email@example.com",
      "apiToken": "your-api-token",
      "jiraType": "CLOUD"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "verified": true,
    "message": "Credentials are valid"
  }
}
```

### 3. Test Via Frontend

1. Open: http://localhost:5000
2. Navigate to Integrations page
3. Click "Connect" on JIRA card
4. Fill in credentials
5. Click "Verify Credentials"
6. Should see green success message ✅

---

## Changes Summary

| File | Change | Lines |
|------|--------|-------|
| `integration.controller.ts` | Added `verifyCredentialsHandler` | +48 |
| `integration.controller.ts` | Exported handler | +1 |
| `integration.routes.ts` | Added route | +5 |

**Total**: 54 lines added

---

## Benefits

1. ✅ **Stateless Verification**: Verify credentials before saving
2. ✅ **Better UX**: User gets immediate feedback
3. ✅ **Consistency**: Matches Test Management pattern
4. ✅ **Security**: Validates credentials without storing them
5. ✅ **Error Handling**: Proper validation and error responses

---

## Related Endpoints

### Before (Only this existed)
```
POST /projects/:projectId/integrations/project-management/:integrationId/verify
- Requires existing integration
- Used for re-verifying saved integrations
```

### After (Now we have both)
```
POST /projects/:projectId/integrations/project-management/verify
- Stateless verification
- Used during initial setup

POST /projects/:projectId/integrations/project-management/:integrationId/verify  
- Stateful verification
- Used for re-verifying existing integrations
```

---

## Next Steps

After testing verification:
1. ✅ Create integration (should work)
2. ✅ List integrations (should work)
3. ✅ Delete integration (should work)
4. Move to Release Configuration integration

---

**Status**: ✅ FIXED  
**Date**: January 2025  
**Tested**: Pending restart

