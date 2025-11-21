# JIRA Credentials Setup - Required Changes

## Focus: Enable JIRA Connection in Integration Page

This document outlines the **minimal changes** required to enable JIRA credential setup in the Integration page.

---

## Current Flow

```
User → Integration Page → Click "Connect JIRA" → JiraConnectionFlow Modal
  ↓
Enter credentials (baseUrl, email, apiToken, jiraType)
  ↓
Click "Verify" → POST /api/v1/tenants/:tenantId/integrations/jira/verify
  ↓
Click "Connect" → POST /api/v1/tenants/:tenantId/integrations/jira
```

---

## Required Changes

### 1. ✅ **ALREADY FIXED** - Verification Endpoint

**File**: `app/routes/api.v1.tenants.$tenantId.integrations.project-management.jira.verify.ts`

**Status**: Already updated to use correct method `verifyCredentials()`

---

### 2. **Enable JIRA in System Metadata** (Backend)

**Priority**: HIGH  
**Effort**: 2 minutes  

**File**: `/api/script/routes/management.ts`

**Location**: Line 106

**Change**:
```typescript
// BEFORE:
const PROJECT_MANAGEMENT = [
  { id: "jira", name: "Jira", requiresOAuth: true, isAvailable: false },
  { id: "linear", name: "Linear", requiresOAuth: true, isAvailable: false },
  { id: "asana", name: "Asana", requiresOAuth: true, isAvailable: false },
];

// AFTER:
const PROJECT_MANAGEMENT = [
  { id: "jira", name: "Jira", requiresOAuth: false, isAvailable: true },
  { id: "linear", name: "Linear", requiresOAuth: false, isAvailable: false },
  { id: "asana", name: "Asana", requiresOAuth: false, isAvailable: false },
];
```

**Why**: Makes JIRA visible in the Integration page UI.

---

### 3. **Fix BFF Service Endpoints** (Web Panel)

**Priority**: HIGH  
**Effort**: 30 minutes  

**File**: `app/.server/services/ReleaseManagement/integrations/jira-integration.ts`

#### Change 3.1: Update `verifyCredentials` endpoint

```typescript
// BEFORE:
async verifyCredentials(
  data: VerifyJiraRequest,
  userId: string
): Promise<JiraVerifyResponse> {
  try {
    return await this.post<JiraVerifyResponse>(
      `/integrations/project-management/verify`,  // ❌ Wrong
      {
        providerType: 'jira',
        ...data,
      },
      userId
    );
  } catch (error: any) {
    return {
      success: false,
      verified: false,
      error: error.message || 'Failed to verify Jira credentials',
    };
  }
}

// AFTER:
async verifyCredentials(
  data: VerifyJiraRequest,
  userId: string
): Promise<JiraVerifyResponse> {
  try {
    // Extract projectId from data or use a default
    const projectId = data.projectId || 'default-project';
    
    return await this.post<JiraVerifyResponse>(
      `/projects/${projectId}/integrations/project-management/verify`,  // ✅ Correct
      {
        providerType: 'JIRA',  // Backend expects uppercase
        config: data.config,
      },
      userId
    );
  } catch (error: any) {
    return {
      success: false,
      verified: false,
      error: error.message || 'Failed to verify Jira credentials',
    };
  }
}
```

#### Change 3.2: Update `createIntegration` endpoint

```typescript
// BEFORE:
async createIntegration(
  projectId: string,
  userId: string,
  data: any
): Promise<JiraIntegrationResponse> {
  try {
    return await this.post<JiraIntegrationResponse>(
      `/tenants/${projectId}/integrations/project-management/jira`,  // ❌ Wrong
      data,
      userId
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create Jira integration'
    };
  }
}

// AFTER:
async createIntegration(
  projectId: string,
  userId: string,
  data: {
    name: string;
    providerType: 'jira';
    config: {
      baseUrl: string;
      email: string;
      apiToken: string;
      jiraType: 'CLOUD' | 'SERVER' | 'DATA_CENTER';
    };
  }
): Promise<JiraIntegrationResponse> {
  try {
    return await this.post<JiraIntegrationResponse>(
      `/projects/${projectId}/integrations/project-management`,  // ✅ Correct
      {
        name: data.name,
        providerType: 'JIRA',  // Backend expects uppercase
        config: data.config,
      },
      userId
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create Jira integration'
    };
  }
}
```

#### Change 3.3: Update `listIntegrations` endpoint

```typescript
// BEFORE:
async listIntegrations(
  tenantId: string,
  userId: string
): Promise<JiraListResponse> {
  try {
    return await this.get<JiraListResponse>(
      `/tenants/${tenantId}/integrations/project-management/jira`,  // ❌ Wrong
      userId
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to list Jira integrations'
    };
  }
}

// AFTER:
async listIntegrations(
  projectId: string,
  userId: string
): Promise<JiraListResponse> {
  try {
    const response = await this.get<{ success: boolean; data: any[] }>(
      `/projects/${projectId}/integrations/project-management`,  // ✅ Correct
      userId
    );
    
    // Filter for JIRA integrations only
    const jiraIntegrations = response.data?.filter(
      (integration) => integration.providerType === 'JIRA'
    ) || [];
    
    return {
      success: response.success,
      data: jiraIntegrations,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to list Jira integrations'
    };
  }
}
```

#### Change 3.4: Update `deleteIntegration` endpoint

```typescript
// BEFORE:
async deleteIntegration(
  tenantId: string,
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    return await this.delete<{ success: boolean; message?: string }>(
      `/tenants/${tenantId}/integrations/project-management/jira`,  // ❌ Wrong
      userId
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete Jira integration'
    };
  }
}

// AFTER:
async deleteIntegration(
  projectId: string,
  integrationId: string,
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    return await this.delete<{ success: boolean; message?: string }>(
      `/projects/${projectId}/integrations/project-management/${integrationId}`,  // ✅ Correct
      userId
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete Jira integration'
    };
  }
}
```

---

### 4. **Update BFF Route Handlers** (Web Panel)

**Priority**: HIGH  
**Effort**: 20 minutes  

**File**: `app/routes/api.v1.tenants.$tenantId.integrations.jira.ts`

#### Change 4.1: Update `createJiraAction`

```typescript
const createJiraAction = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const service = new JiraIntegrationService();

    // Use tenantId as projectId
    const result = await service.createIntegration(
      tenantId,
      user.user.id,
      {
        name: body.name || body.displayName || 'Jira Integration',
        providerType: 'jira',
        config: {
          baseUrl: body.hostUrl || body.config?.baseUrl,
          email: body.email || body.username || body.config?.email,
          apiToken: body.apiToken || body.config?.apiToken,
          jiraType: body.jiraType || body.config?.jiraType || 'CLOUD',
        },
      }
    );

    return json(result, { status: result.success ? 201 : 500 });
  } catch (error) {
    console.error('[BFF-Jira-Create] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Jira integration',
      },
      { status: 500 }
    );
  }
};
```

#### Change 4.2: Update `deleteJiraAction`

```typescript
const deleteJiraAction = async ({
  params,
  request,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;
  const url = new URL(request.url);
  const integrationId = url.searchParams.get('integrationId');

  if (!tenantId || !integrationId) {
    return json(
      { success: false, error: 'Tenant ID and Integration ID required' },
      { status: 400 }
    );
  }

  try {
    const service = new JiraIntegrationService();
    const result = await service.deleteIntegration(
      tenantId,
      integrationId,  // ✅ Now passing integrationId
      user.user.id
    );

    return json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    console.error('[BFF-Jira-Delete] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete Jira integration',
      },
      { status: 500 }
    );
  }
};
```

---

### 5. **Update Type Definitions** (Web Panel)

**Priority**: MEDIUM  
**Effort**: 10 minutes  

**File**: `app/types/jira-integration.ts`

```typescript
// Add projectId to verify request
export interface VerifyJiraRequest {
  projectId?: string;  // Add this
  config: JiraIntegrationConfig;
}
```

---

### 6. **Ensure Backend Integration Controller Handles Verification**

**Priority**: HIGH  
**Effort**: 15 minutes (if not already implemented)  

**File**: `/api/script/controllers/integrations/project-management/integration/integration.controller.ts`

Check if verification endpoint exists and handles providerType properly:

```typescript
// Should have a method like:
const verifyIntegrationByConfig = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { providerType, config } = req.body;
  
  // Get provider
  const provider = ProviderFactory.getProvider(providerType);
  
  // Validate config
  const isValid = await provider.validateConfig(config);
  
  res.json({
    success: isValid,
    verified: isValid,
    message: isValid ? 'Configuration is valid' : 'Configuration is invalid'
  });
};
```

If this doesn't exist, you need to add it or use the existing `verifyIntegration` endpoint with a temporary integration.

---

## Testing Checklist

### Backend Tests

```bash
# 1. Check system metadata shows JIRA as available
curl http://localhost:3000/system/metadata

# Expected response should include:
# {
#   "integrations": {
#     "PROJECT_MANAGEMENT": [
#       { "id": "jira", "name": "Jira", "isAvailable": true }
#     ]
#   }
# }
```

### Frontend Tests

```bash
# 1. Start web panel
cd delivr-web-panel-managed
pnpm dev

# 2. Navigate to Integration page
# 3. Click "Connect" on JIRA card
# 4. Fill in credentials:
#    - Base URL: https://your-domain.atlassian.net
#    - Email: your-email@example.com
#    - API Token: (from Atlassian)
#    - JIRA Type: CLOUD

# 5. Click "Verify Credentials"
# Expected: Green success message

# 6. Click "Connect"
# Expected: Integration saved and appears in integration list
```

---

## Quick Implementation Order

1. **Backend Change** (2 min)
   - Update `management.ts` line 106 to enable JIRA

2. **BFF Service** (30 min)
   - Update all endpoint URLs in `jira-integration.ts`
   - Fix method signatures

3. **BFF Routes** (20 min)
   - Update route handlers in `api.v1.tenants.$tenantId.integrations.jira.ts`

4. **Types** (10 min)
   - Add `projectId` to `VerifyJiraRequest`

5. **Test** (30 min)
   - Verify the complete flow works end-to-end

**Total Time**: ~1.5 hours

---

## Files to Modify

### Backend (server-ota)
1. `/api/script/routes/management.ts` (Line 106)

### Frontend (web-panel)
1. `app/.server/services/ReleaseManagement/integrations/jira-integration.ts`
2. `app/routes/api.v1.tenants.$tenantId.integrations.jira.ts`
3. `app/types/jira-integration.ts`

---

## Common Issues & Solutions

### Issue 1: "Integration not found"
**Cause**: Endpoint mismatch  
**Solution**: Verify BFF is calling `/projects/:projectId/integrations/project-management`

### Issue 2: "Provider type JIRA not found"
**Cause**: Backend expects uppercase `JIRA`, not lowercase `jira`  
**Solution**: Change `providerType: 'jira'` to `providerType: 'JIRA'`

### Issue 3: "Verification fails but credentials are correct"
**Cause**: Verify endpoint not properly implemented  
**Solution**: Check backend controller has verification endpoint

### Issue 4: "JIRA not visible in Integration page"
**Cause**: System metadata returns `isAvailable: false`  
**Solution**: Update `management.ts` line 106

---

## Next Steps (After Credentials Work)

Once credentials setup is working:
1. ✅ Test integration listing
2. ✅ Test integration deletion
3. ✅ Move to Phase 2: Release configuration integration
4. ✅ Move to Phase 3: Ticket creation

---

**Document Version**: 1.0  
**Focus**: Credentials Setup Only  
**Estimated Time**: 1.5 hours  
**Status**: Ready for Implementation

