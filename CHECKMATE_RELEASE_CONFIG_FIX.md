# Checkmate Release Configuration Fix

## Problem
After connecting a Checkmate integration:
1. ✅ Integration showed as "Connected" in the Integrations page (fixed in previous update)
2. ❌ Release Configuration form still showed "No Checkmate integration found"

## Root Cause

The Release Configuration route (`dashboard.$org.releases.configure.tsx`) was using **mock/hardcoded data** instead of fetching real tenant integrations from the API.

### Data Flow Issues

1. **Mock Data Usage**: The route called `getMockTenantInfo()` which returned hardcoded integrations with `status: 'DISCONNECTED'`
2. **Filtering Problem**: `transformIntegrationsForUI()` filters for `status === 'CONNECTED'`, so mock disconnected integrations were filtered out
3. **Missing Metadata**: Even if connected, the integration metadata (orgId, baseUrl) wasn't being passed
4. **State Initialization**: `CheckmateConfigFormEnhanced` wasn't initializing from existing config

## Complete Fix

### Backend Changes (`delivr-server-ota-managed`)

#### File: `api/script/routes/management.ts`

**Added non-sensitive config fields to TEST_MANAGEMENT response**:

```typescript
TEST_MANAGEMENT: testManagementIntegrations.map((i: any) => ({
  id: i.id,
  providerId: i.providerType.toLowerCase(),
  name: i.name,
  status: 'CONNECTED',
  config: {
    providerType: i.providerType,
    projectId: i.projectId,
    // Include non-sensitive config fields
    baseUrl: i.config?.baseUrl,
    orgId: i.config?.orgId,
    // Don't expose sensitive data (authToken)
  },
  connectedAt: i.createdAt,
  connectedBy: i.createdByAccountId || 'System',
})),
```

### Frontend Changes (`delivr-web-panel-managed`)

#### 1. File: `app/routes/dashboard.$org.releases.configure.tsx`

**Replaced mock data with real API calls**:

```typescript
// BEFORE: Mock data
const tenantInfo = await getMockTenantInfo(org);

// AFTER: Real API call
const apiUrl = `${url.protocol}//${url.host}/api/v1/tenants/${org}`;
const response = await fetch(apiUrl);
const data = await response.json();

// Transform backend response to TenantInfo format
const config = data.organisation?.releaseManagement?.config;
config.connectedIntegrations.TEST_MANAGEMENT?.forEach((int: any) => {
  integrations.push({
    id: int.id,
    type: int.providerId.toUpperCase(),
    name: int.name,
    status: int.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED',
    connectedAt: int.connectedAt,
    metadata: {
      workspaceId: int.config?.orgId || int.config?.workspaceId,
      baseUrl: int.config?.baseUrl,
      projectId: int.config?.projectId,
      ...int.config
    },
  });
});
```

#### 2. File: `app/utils/integration-helpers.ts`

**Updated interface and mapping**:

```typescript
// Updated interface
checkmate: Array<{ 
  id: string; 
  name: string; 
  workspaceId?: string;
  baseUrl?: string;
  orgId?: string;
}>;

// Updated mapping
checkmate: connected
  .filter(i => i.type === 'CHECKMATE')
  .map(i => ({
    id: i.id,
    name: i.name,
    workspaceId: i.metadata?.workspaceId || i.metadata?.orgId,
    baseUrl: i.metadata?.baseUrl,
    orgId: i.metadata?.orgId,
  })),
```

#### 3. File: `app/components/ReleaseConfig/TestManagement/CheckmateConfigForm.tsx`

**Updated to use integration ID as primary identifier**:

```typescript
// Use ID as the value (most stable identifier)
<Select
  data={availableIntegrations.map(i => ({
    value: i.id,  // Changed from i.workspaceId
    label: i.name,
  }))}
  onChange={(val) => {
    const selected = availableIntegrations.find(int => int.id === val);
    onChange({ 
      ...config, 
      workspaceId: val || '',
      ...(selected?.orgId && { orgId: selected.orgId }),
    });
  }}
/>
```

#### 4. File: `app/components/ReleaseConfig/TestManagement/CheckmateConfigFormEnhanced.tsx`

**Added initialization from existing config**:

```typescript
// Initialize selectedIntegrationId from config on mount
useEffect(() => {
  if (config.workspaceId && availableIntegrations.length > 0 && !selectedIntegrationId) {
    const integration = availableIntegrations.find(
      i => i.id === config.workspaceId || i.workspaceId === config.workspaceId
    );
    if (integration) {
      setSelectedIntegrationId(integration.id);
    }
  }
}, [config.workspaceId, availableIntegrations, selectedIntegrationId]);

// Store integration ID in config
const handleIntegrationChange = (integrationId: string) => {
  setSelectedIntegrationId(integrationId);
  onChange({
    ...config,
    workspaceId: integrationId,  // Store ID, not workspace ID
    projectId: 0,
    platformConfigurations: [],
  });
};
```

## Data Flow (After Fix)

### 1. User Creates Checkmate Integration
```
POST /api/v1/projects/{projectId}/integrations/test-management
↓
Saved to project_test_management_integrations table
{
  id: "uuid",
  providerType: "CHECKMATE",
  config: {
    baseUrl: "https://checkmate.example.com",
    authToken: "encrypted_token",
    orgId: 123
  }
}
```

### 2. Integrations Page Loads
```
GET /api/v1/tenants/{tenantId}
↓
Returns:
releaseManagement.config.connectedIntegrations.TEST_MANAGEMENT: [
  {
    id: "uuid",
    providerId: "checkmate",
    name: "Checkmate Production",
    status: "CONNECTED",
    config: {
      baseUrl: "https://checkmate.example.com",
      orgId: 123
    }
  }
]
↓
ConfigContext processes and shows as "Connected" ✅
```

### 3. Release Configuration Page Loads
```
GET /api/v1/tenants/{tenantId}  (same endpoint)
↓
Transform to TenantInfo format
{
  integrations: [
    {
      id: "uuid",
      type: "CHECKMATE",
      name: "Checkmate Production",
      status: "CONNECTED",
      metadata: {
        workspaceId: 123,  // Mapped from orgId
        baseUrl: "https://checkmate.example.com",
        orgId: 123
      }
    }
  ]
}
↓
transformIntegrationsForUI filters connected & maps
{
  checkmate: [
    {
      id: "uuid",
      name: "Checkmate Production",
      workspaceId: 123,
      baseUrl: "https://checkmate.example.com",
      orgId: 123
    }
  ]
}
↓
TestManagementSelector receives non-empty array ✅
↓
CheckmateConfigFormEnhanced shows integration selector ✅
```

### 4. User Selects Integration
```
User selects "Checkmate Production"
↓
CheckmateConfigFormEnhanced:
  - Sets selectedIntegrationId = "uuid"
  - Stores integration ID in config.workspaceId
  - Fetches projects: GET /api/v1/integrations/uuid/metadata/projects
  - Displays project dropdown ✅
```

## Testing Checklist

- ✅ Create Checkmate integration
- ✅ Verify integration shows as "Connected" in Integrations page
- ✅ Navigate to Release Configuration
- ✅ Enable Test Management
- ✅ Select Checkmate as provider
- ✅ See Checkmate integration in dropdown (not "No integration found")
- ✅ Select integration → Projects load
- ✅ Select project → Sections/Labels/Squads load
- ✅ Add platform configurations
- ✅ Save configuration

## Key Takeaways

1. **Always use real API data in production routes** - Mock data is only for development/demos
2. **Pass necessary metadata through API layers** - Non-sensitive config fields should be available to frontend
3. **Initialize form state from existing config** - Forms should handle both new and edit modes
4. **Use stable identifiers** - Integration ID is more stable than workspace/org IDs
5. **Fallback gracefully** - Support multiple field names during transition periods

## Files Modified

### Backend
- `api/script/routes/management.ts` - Added config fields to TEST_MANAGEMENT response

### Frontend
- `app/routes/dashboard.$org.releases.configure.tsx` - Replaced mock with real API
- `app/utils/integration-helpers.ts` - Updated interface and mapping
- `app/components/ReleaseConfig/TestManagement/CheckmateConfigForm.tsx` - Fixed ID handling
- `app/components/ReleaseConfig/TestManagement/CheckmateConfigFormEnhanced.tsx` - Added initialization

