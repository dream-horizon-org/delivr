# JIRA Integration in Tenant API - Update Summary

## Overview
Updated the tenant metadata API (`GET /tenants/:tenantId`) in `management.ts` to include connected JIRA integrations alongside other integration types (SCM, Slack, CI/CD, Test Management, App Distribution).

## Changes Made

### 1. Added Project Management Repository Access
**File**: `api/script/routes/management.ts` (Line 463)

Added access to the project management integration repository:

```typescript
const projectManagementIntegrationRepository = (storage as any).projectManagementIntegrationRepository;
```

### 2. Fetch Project Management Integrations
**File**: `api/script/routes/management.ts` (Lines 486-497)

Added code to fetch all project management integrations (JIRA, Linear, Asana, etc.) for the tenant:

```typescript
// Project Management integrations (JIRA, Linear, Asana, etc.)
let projectManagementIntegrations: any[] = [];
if (projectManagementIntegrationRepository) {
  try {
    projectManagementIntegrations = await projectManagementIntegrationRepository.findAll({ 
      projectId: tenantId
    });
    console.log(`[TenantInfo] Found ${projectManagementIntegrations.length} project management integrations for tenant ${tenantId}`);
  } catch (error) {
    console.error('[TenantInfo] Error fetching project management integrations:', error);
  }
}
```

### 3. Add to Integrations Array
**File**: `api/script/routes/management.ts` (Lines 592-607)

Added project management integrations to the unified integrations array (sanitized - sensitive data excluded):

```typescript
// Add Project Management integrations (JIRA, Linear, Asana, etc.)
projectManagementIntegrations.forEach((integration: any) => {
  integrations.push({
    type: 'project_management',
    id: integration.id,
    providerType: integration.providerType,
    name: integration.name,
    projectId: integration.projectId,
    isEnabled: integration.isEnabled,
    verificationStatus: integration.verificationStatus,
    lastVerifiedAt: integration.lastVerifiedAt,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
    // Note: config (including apiToken, email) is intentionally excluded (never sent to client)
  });
});
```

### 4. Add to Tenant Config
**File**: `api/script/routes/management.ts` (Lines 714-730)

Updated the `tenantConfig.connectedIntegrations.PROJECT_MANAGEMENT` array with structured data:

```typescript
PROJECT_MANAGEMENT: projectManagementIntegrations.map((i: any) => ({
  id: i.id,
  providerId: i.providerType.toLowerCase(),
  name: i.name,
  status: i.isEnabled ? 'CONNECTED' : 'DISCONNECTED',
  config: {
    providerType: i.providerType,
    projectId: i.projectId,
    // Include non-sensitive config fields
    baseUrl: i.config?.baseUrl,
    jiraType: i.config?.jiraType, // JIRA-specific: CLOUD, SERVER, DATA_CENTER
    // Don't expose sensitive config data (like apiToken, email)
  },
  verificationStatus: i.verificationStatus || 'NOT_VERIFIED',
  connectedAt: i.createdAt,
  connectedBy: i.createdByAccountId || 'System',
})),
```

## API Response Structure

The tenant API now returns JIRA integrations in two places:

### 1. In the `integrations` array (flat list):
```json
{
  "integrations": [
    {
      "type": "project_management",
      "id": "pm_int_1234567890_abc123xyz",
      "providerType": "JIRA",
      "name": "My JIRA Integration",
      "projectId": "tenant_123",
      "isEnabled": true,
      "verificationStatus": "VALID",
      "lastVerifiedAt": "2025-11-21T10:30:00.000Z",
      "createdAt": "2025-11-20T08:00:00.000Z",
      "updatedAt": "2025-11-21T10:30:00.000Z"
    }
  ]
}
```

### 2. In `organisation.releaseManagement.config.connectedIntegrations.PROJECT_MANAGEMENT`:
```json
{
  "organisation": {
    "releaseManagement": {
      "config": {
        "connectedIntegrations": {
          "PROJECT_MANAGEMENT": [
            {
              "id": "pm_int_1234567890_abc123xyz",
              "providerId": "jira",
              "name": "My JIRA Integration",
              "status": "CONNECTED",
              "config": {
                "providerType": "JIRA",
                "projectId": "tenant_123",
                "baseUrl": "https://example.atlassian.net",
                "jiraType": "CLOUD"
              },
              "verificationStatus": "VALID",
              "connectedAt": "2025-11-20T08:00:00.000Z",
              "connectedBy": "user_123"
            }
          ]
        }
      }
    }
  }
}
```

## Security Considerations

✅ **Sensitive data is excluded from the API response:**
- `apiToken` - JIRA API token (never sent to client)
- `email` - JIRA account email (never sent to client)
- Any other provider-specific credentials

✅ **Only non-sensitive config fields are included:**
- `baseUrl` - JIRA instance URL
- `jiraType` - Type of JIRA (CLOUD, SERVER, DATA_CENTER)
- `providerType` - Provider type (JIRA, LINEAR, etc.)

## Frontend Usage

The frontend can now:

1. **Check if JIRA is connected:**
   ```typescript
   const jiraIntegrations = tenantData.organisation.releaseManagement.config.connectedIntegrations.PROJECT_MANAGEMENT;
   const hasJira = jiraIntegrations.length > 0;
   ```

2. **Get JIRA integration details:**
   ```typescript
   const jiraIntegration = jiraIntegrations.find(i => i.providerId === 'jira');
   if (jiraIntegration) {
     console.log('JIRA is connected:', jiraIntegration.name);
     console.log('Base URL:', jiraIntegration.config.baseUrl);
     console.log('Type:', jiraIntegration.config.jiraType);
     console.log('Status:', jiraIntegration.status);
   }
   ```

3. **Display in UI:**
   - Show connected JIRA integrations in the Integrations page
   - Show JIRA status in release configuration wizard
   - Use integration ID for creating releases with JIRA tickets

## Testing

To test the changes:

1. **Create a JIRA integration** (via BFF or directly):
   ```bash
   POST /projects/{projectId}/integrations/project-management
   {
     "name": "My JIRA",
     "providerType": "JIRA",
     "config": {
       "baseUrl": "https://example.atlassian.net",
       "email": "user@example.com",
       "apiToken": "your-api-token",
       "jiraType": "CLOUD"
     }
   }
   ```

2. **Fetch tenant data**:
   ```bash
   GET /tenants/{tenantId}
   ```

3. **Verify response includes JIRA integration**:
   - Check `integrations` array for `type: 'project_management'`
   - Check `organisation.releaseManagement.config.connectedIntegrations.PROJECT_MANAGEMENT`
   - Verify sensitive data (apiToken, email) is NOT present

## Related Files

- **Backend**: `api/script/routes/management.ts` (tenant API)
- **Repository**: `api/script/models/integrations/project-management/integration/integration.repository.ts`
- **Types**: `api/script/types/integrations/project-management/integration/integration.interface.ts`
- **Database**: `migrations/005_project_management_integration.sql`

## Next Steps

With JIRA integrations now available in the tenant API, the frontend can:

1. ✅ Display connected JIRA integrations in the Integrations page
2. ✅ Show JIRA connection status in release configuration
3. ✅ Use JIRA integration ID when creating releases
4. ✅ Allow users to select from connected JIRA integrations
5. ✅ Show verification status and last verified date

---

**Status**: ✅ Complete
**Date**: 2025-11-21

