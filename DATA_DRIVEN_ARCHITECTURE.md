# Data-Driven Architecture

## Overview
The UI is now completely data-driven and makes NO assumptions about which integrations are connected. All provider options, validation, and features are determined by backend data.

## Architecture Principles

### 1. **No Hardcoded Assumptions**
- UI never assumes integrations are connected
- All providers shown are based on actual connected integrations
- Empty states shown when no integrations available

### 2. **Server-Side Data Mocking**
- Mock data lives in `.server.ts` files (server-only)
- UI receives same data structure as production
- Easy to swap mocks for real API calls

### 3. **Single Source of Truth**
- `TenantInfo` API provides all tenant data
- Integrations, configurations, settings all in one place
- Data flows down via context or props

## Key Components

### Tenant Context (`app/contexts/TenantContext.tsx`)
Provides tenant data to entire application:

```typescript
interface TenantInfo {
  id: string;
  name: string;
  integrations: Integration[];  // All integrations with status
  releaseConfigurations: ReleaseConfiguration[];
  settings?: any;
}
```

**Helper Functions:**
- `isIntegrationConnected(type)` - Check if specific integration is connected
- `getConnectedIntegrations(type)` - Get all connected integrations of type
- `hasAnyIntegration(types)` - Check if any of the types are connected

### Integration Status

Each integration has a status:
```typescript
type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
```

**CONNECTED** = Integration is configured and working
**DISCONNECTED** = Integration available but not configured
**ERROR** = Integration configured but has errors

### Data Transformation (`app/utils/integration-helpers.ts`)

Transforms raw integration data into UI-ready format:
```typescript
transformIntegrationsForUI(integrations): AvailableIntegrations
```

**Input:** All integrations (any status)
**Output:** Only CONNECTED integrations grouped by type

This ensures UI only shows working integrations.

### Server-Side Mocking (`app/utils/mock-tenant-data.server.ts`)

Provides mock data until real backend integrated:
- `getMockTenantInfo(tenantId)` - Get complete tenant info
- `getMockIntegrations(tenantId)` - Get integration list
- `connectIntegration()` - Simulate connecting integration

**Current Mock Scenario:**
- Jenkins: CONNECTED ✓
- GitHub: CONNECTED ✓
- Slack: DISCONNECTED ✗
- Jira: DISCONNECTED ✗
- Checkmate: DISCONNECTED ✗

This simulates a realistic scenario where only some integrations are configured.

## UI Response to Different Scenarios

### Scenario 1: No Integrations Connected
```
Jenkins: DISCONNECTED
GitHub: DISCONNECTED
Slack: DISCONNECTED
Jira: DISCONNECTED
Checkmate: DISCONNECTED
```

**UI Behavior:**
- Build Pipelines step shows "No integrations connected" alert
- Manual Upload is the only option
- Users guided to Integrations page

### Scenario 2: Some Integrations Connected
```
Jenkins: CONNECTED ✓
GitHub: CONNECTED ✓
Slack: DISCONNECTED
Jira: DISCONNECTED
Checkmate: DISCONNECTED
```

**UI Behavior:**
- Build Pipelines shows Jenkins and GitHub options
- Communication step shows only Email (Slack disabled)
- Jira step shows "Connect Jira" message
- Test Management shows "Connect Checkmate" message

### Scenario 3: All Integrations Connected
```
Jenkins: CONNECTED ✓
GitHub: CONNECTED ✓
Slack: CONNECTED ✓
Jira: CONNECTED ✓
Checkmate: CONNECTED ✓
```

**UI Behavior:**
- All options available
- Full feature set enabled
- No "connect integration" messages

## Draft Release Handling

### Problem
Previously clicking "New Release" immediately opened wizard, overwriting any draft.

### Solution
`DraftReleaseDialog` component shows when draft exists:

**Options:**
1. **Continue Draft** - Resume editing saved draft
2. **Start New** - Clear draft and start fresh
3. **Cancel** - Returns to previous page

**Flow:**
```
User clicks "New Release"
  ↓
Check localStorage for draft
  ↓
Draft exists? → Show Dialog
  ↓
User chooses:
  - Continue Draft → Open wizard with draft data
  - Start New → Clear draft, open fresh wizard
```

**URL Parameters:**
- `?edit=configId` - Edit existing saved config
- `?new=true` - Force new config (skip draft check)

## Data Flow

### Current Implementation (with mocks)

```
User Request
  ↓
Remix Loader (dashboard.$org.releases.configure)
  ↓
getMockTenantInfo(orgId) ← Server-side mock
  ↓
transformIntegrationsForUI() ← Filter to connected only
  ↓
Return to UI
  ↓
ConfigurationWizard receives availableIntegrations
  ↓
Each step shows only available options
```

### Future Implementation (with real backend)

```
User Request
  ↓
Remix Loader
  ↓
fetch('/api/tenants/${orgId}') ← Real API call
  ↓
transformIntegrationsForUI() ← Same transformation
  ↓
Return to UI
  ↓
(Everything else stays the same)
```

## Migration Path

### Phase 1: Current (Mock Data)
- All data from `mock-tenant-data.server.ts`
- Easy to test different scenarios
- UI behaves exactly as it will in production

### Phase 2: Hybrid (Some Real Data)
- Replace specific mocks with API calls
- Example: Real Jenkins integrations, mocked others
- Gradual migration

### Phase 3: Full Backend Integration
- Replace `getMockTenantInfo()` with real API
- Remove `.server.ts` mock files
- UI code unchanged!

## Integration Scenarios Testing

To test different scenarios, modify `getMockIntegrations()`:

### Test No Integrations
```typescript
export function getMockIntegrations(tenantId: string): Integration[] {
  return [
    { id: 'jenkins-1', type: 'JENKINS', name: 'Jenkins', status: 'DISCONNECTED' },
    // All DISCONNECTED
  ];
}
```

### Test Partial Integrations
```typescript
export function getMockIntegrations(tenantId: string): Integration[] {
  return [
    { id: 'jenkins-1', type: 'JENKINS', name: 'Jenkins', status: 'CONNECTED' },
    { id: 'slack-1', type: 'SLACK', name: 'Slack', status: 'DISCONNECTED' },
  ];
}
```

### Test All Integrations
```typescript
export function getMockIntegrations(tenantId: string): Integration[] {
  return [
    { id: 'jenkins-1', type: 'JENKINS', name: 'Jenkins', status: 'CONNECTED' },
    { id: 'github-1', type: 'GITHUB', name: 'GitHub', status: 'CONNECTED' },
    { id: 'slack-1', type: 'SLACK', name: 'Slack', status: 'CONNECTED' },
    { id: 'jira-1', type: 'JIRA', name: 'Jira', status: 'CONNECTED' },
    { id: 'checkmate-1', type: 'CHECKMATE', name: 'Checkmate', status: 'CONNECTED' },
  ];
}
```

## Empty States

Each wizard step handles missing integrations gracefully:

### Build Pipelines Step
```typescript
if (availableIntegrations.jenkins.length === 0 && 
    availableIntegrations.github.length === 0) {
  return <Alert>
    No build integrations connected. 
    <Link to="/integrations">Connect Jenkins or GitHub</Link>
  </Alert>
}
```

### Jira Step
```typescript
if (availableIntegrations.jira.length === 0) {
  return <Alert>
    Jira not connected. 
    <Link to="/integrations">Connect Jira</Link>
  </Alert>
}
```

### Test Management Step
```typescript
if (availableIntegrations.checkmate.length === 0) {
  return <Alert>
    No test management tools connected.
    <Link to="/integrations">Connect Checkmate</Link>
  </Alert>
}
```

## Benefits

### 1. **Flexibility**
- Easy to add new integration types
- UI automatically adapts to available integrations
- No code changes when integrations change

### 2. **Realistic Testing**
- Test with no integrations
- Test with partial integrations
- Test error scenarios

### 3. **Clean Separation**
- Data fetching in loaders (server)
- Data transformation in utilities
- UI rendering in components
- Clear boundaries

### 4. **Easy Backend Integration**
- Replace one function (`getMockTenantInfo`)
- Everything else stays the same
- No UI changes needed

### 5. **Better UX**
- Users see only what's available
- Clear guidance to connect missing integrations
- No confusing disabled options

## Files Structure

```
app/
├── contexts/
│   └── TenantContext.tsx          # Tenant data context
├── utils/
│   ├── integration-helpers.ts     # Transform integrations
│   └── mock-tenant-data.server.ts # Server-side mocks
├── components/
│   └── ReleaseConfig/
│       ├── DraftReleaseDialog.tsx # Draft handling
│       └── Wizard/
│           └── ConfigurationWizard.tsx
└── routes/
    └── dashboard.$org.releases.configure.tsx # Uses tenant data
```

## Next Steps

1. **Create Integrations Page**
   - UI to connect/disconnect integrations
   - Test connection status
   - Configure integration settings

2. **Real Backend API**
   - `/api/tenants/${id}` endpoint
   - Returns TenantInfo structure
   - Replace mock with fetch call

3. **Error Handling**
   - Handle `ERROR` integration status
   - Show reconnect options
   - Graceful degradation

4. **Context Provider**
   - Wrap app in TenantProvider
   - All components access via `useTenant()`
   - Centralized tenant data

5. **Caching Strategy**
   - Cache tenant info
   - Invalidate on integration changes
   - Optimistic updates

## Summary

The application is now fully data-driven:
- ✅ No hardcoded integration assumptions
- ✅ Server-side data mocking
- ✅ Graceful handling of missing integrations
- ✅ Draft release dialog
- ✅ Easy backend migration path
- ✅ Clear separation of concerns

UI responds dynamically to whatever integrations are connected, providing appropriate empty states and guidance when integrations are missing.

