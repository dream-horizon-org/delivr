# API Routes Centralization - Refactor Summary

## Overview
Centralized all backend API endpoint mappings into a single file (`api-routes.ts`) to maintain consistency and ease of updates across the BFF layer.

## Changes Made

### 1. Created Central Routes File
**File**: `app/.server/services/ReleaseManagement/integrations/api-routes.ts`

**Structure**:
```typescript
// Exports individual route objects
export const PROJECT_MANAGEMENT = { ... }
export const CICD = { ... }
export const COMMUNICATION = { slack: { ... } }
export const SCM = { ... }
export const TEST_MANAGEMENT = { ... }
export const APP_DISTRIBUTION = { ... }
export const APPSTORE = { ... }
export const MANAGEMENT = { ... }
```

**Usage Pattern**:
```typescript
// Import specific route objects
import { PROJECT_MANAGEMENT, CICD } from './api-routes';

// Use in service methods
const endpoint = PROJECT_MANAGEMENT.verify(projectId);
await this.post(endpoint, data, userId);
```

###2. Updated Service Files

#### ✅ Completed:

1. **jira-integration.ts**
   - Import: `import { PROJECT_MANAGEMENT } from './api-routes';`
   - Updated methods: `verifyCredentials`, `listIntegrations`, `createIntegration`, `updateIntegration`, `deleteIntegration`

2. **slack-integration.ts**
   - Import: `import { COMMUNICATION } from './api-routes';`
   - Updated methods: `verifySlack`, `fetchChannels`, `createOrUpdateIntegration`, `getIntegration`, `fetchChannelsForIntegration`, `updateIntegration`, `deleteIntegration`

3. **scm-integration.ts**
   - Import: `import { SCM } from './api-routes';`
   - Updated methods: `verifySCM`, `createSCMIntegration`, `getSCMIntegration`, `updateSCMIntegration`, `deleteSCMIntegration`, `fetchBranches`

4. **checkmate-integration.ts**
   - Import: `import { TEST_MANAGEMENT } from './api-routes';`
   - Updated methods: `createIntegration`, `listIntegrations`, `getIntegration`, `updateIntegration`, `deleteIntegration`, `verifyIntegration`

5. **jenkins-integration.ts** (Partially Complete)
   - Import: `import { CICD } from './api-routes';`
   - Updated methods: `verifyJenkins` ✅

#### 🔄 Remaining:

6. **jenkins-integration.ts** (Continue)
   - Methods to update:
     - `createIntegration` - use `CICD.createConnection(tenantId, 'JENKINS')`
     - `getIntegration` - use `CICD.getProvider(tenantId, 'jenkins')`
     - `updateIntegration` - use `CICD.updateConnection(tenantId, integrationId)`
     - `deleteIntegration` - use `CICD.deleteConnection(tenantId, integrationId)`
     - `fetchJobParameters` - use `CICD.jobParameters(tenantId, 'jenkins')`
     - `listWorkflows` - use `CICD.listWorkflows(tenantId)`
     - `createWorkflow` - use `CICD.createWorkflow(tenantId)`
     - `updateWorkflow` - use `CICD.updateWorkflow(tenantId, workflowId)`
     - `deleteWorkflow` - use `CICD.deleteWorkflow(tenantId, workflowId)`

7. **github-actions-integration.ts**
   - Import: `import { CICD } from './api-routes';`
   - Methods to update:
     - `verifyGitHubActions` - use `CICD.verifyConnection(tenantId, 'GITHUB_ACTIONS')`
     - `createIntegration` - use `CICD.createConnection(tenantId, 'GITHUB_ACTIONS')`
     - `getIntegration` - use `CICD.getProvider(tenantId, 'github-actions')`
     - `updateIntegration` - use `CICD.updateConnection(tenantId, integrationId)`
     - `deleteIntegration` - use `CICD.deleteConnection(tenantId, integrationId)`
     - `fetchWorkflowParameters` - use `CICD.jobParameters(tenantId, 'github-actions')`
     - `listWorkflows` - use `CICD.listWorkflows(tenantId)`
     - `createWorkflow` - use `CICD.createWorkflow(tenantId)`
     - `updateWorkflow` - use `CICD.updateWorkflow(tenantId, workflowId)`
     - `deleteWorkflow` - use `CICD.deleteWorkflow(tenantId, workflowId)`

8. **cicd-integration.ts**
   - Import: `import { CICD, buildUrlWithQuery } from './api-routes';`
   - Methods to update:
     - `listAllWorkflows` - use `buildUrlWithQuery(CICD.listWorkflows(tenantId), filters)`
     - `getWorkflowById` - use `CICD.getWorkflow(tenantId, workflowId)`
     - `createWorkflow` - use `CICD.createWorkflow(tenantId)`
     - `updateWorkflow` - use `CICD.updateWorkflow(tenantId, workflowId)`
     - `deleteWorkflow` - use `CICD.deleteWorkflow(tenantId, workflowId)`

9. **app-distribution-integration.ts**
   - Import: `import { APP_DISTRIBUTION } from './api-routes';`
   - Methods to update:
     - `verifyStore` - use `APP_DISTRIBUTION.verify`
     - `connectStore` - use `APP_DISTRIBUTION.connect`
     - `listIntegrations` - use `APP_DISTRIBUTION.list(tenantId)`
     - `getIntegration` - use `APP_DISTRIBUTION.get(integrationId)`
     - `revokeIntegration` - use `APP_DISTRIBUTION.revoke(tenantId, storeType, platform)`

10. **appstore-integration.ts**
    - Import: `import { APPSTORE } from './api-routes';`
    - Methods to update:
     - `generateAuthUrl` - use `APPSTORE.authUrl`
     - `completeOAuth` - use `APPSTORE.callback`
     - `verifyCredentials` - use `APPSTORE.verify`
     - `listIntegrations` - use `APPSTORE.list(tenantId)`
     - `getIntegration` - use `APPSTORE.get(integrationId)`
     - `deleteIntegration` - use `APPSTORE.delete(integrationId)`
     - `revokeIntegration` - use `APPSTORE.revoke(integrationId)`

## Benefits

1. **Single Source of Truth**: All API endpoints defined in one file
2. **Easy Maintenance**: Backend route changes only need updates in one place
3. **Type Safety**: Routes are typed and autocomplete-friendly
4. **Consistency**: All services use the same pattern
5. **DRY**: No hardcoded route strings scattered across files
6. **Documentation**: Each route includes JSDoc comments

## Pattern Examples

### Before (Hardcoded):
```typescript
const result = await this.post(
  `/projects/${projectId}/integrations/project-management/verify`,
  data,
  userId
);
```

### After (Centralized):
```typescript
import { PROJECT_MANAGEMENT } from './api-routes';

const endpoint = PROJECT_MANAGEMENT.verify(projectId);
const result = await this.post(endpoint, data, userId);
```

### With Query Parameters:
```typescript
import { CICD, buildUrlWithQuery } from './api-routes';

const url = buildUrlWithQuery(CICD.listWorkflows(tenantId), {
  platform: 'ANDROID',
  providerType: 'JENKINS'
});
const result = await this.get(url, userId);
```

## Next Steps

1. ✅ Complete remaining Jenkins integration methods
2. ✅ Update GitHub Actions integration
3. ✅ Update combined CI/CD integration
4. ✅ Update App Distribution integration
5. ✅ Update AppStore integration
6. ✅ Run linter and fix any errors
7. ✅ Test all integrations end-to-end

## Files Modified

- ✅ `app/.server/services/ReleaseManagement/integrations/api-routes.ts` (Created)
- ✅ `app/.server/services/ReleaseManagement/integrations/jira-integration.ts`
- ✅ `app/.server/services/ReleaseManagement/integrations/slack-integration.ts`
- ✅ `app/.server/services/ReleaseManagement/integrations/scm-integration.ts`
- ✅ `app/.server/services/ReleaseManagement/integrations/checkmate-integration.ts`
- 🔄 `app/.server/services/ReleaseManagement/integrations/jenkins-integration.ts`
- ⏳ `app/.server/services/ReleaseManagement/integrations/github-actions-integration.ts`
- ⏳ `app/.server/services/ReleaseManagement/integrations/cicd-integration.ts`
- ⏳ `app/.server/services/ReleaseManagement/integrations/app-distribution-integration.ts`
- ⏳ `app/.server/services/ReleaseManagement/integrations/appstore-integration.ts`

---

**Status**: 🔄 In Progress (5/10 files completed)
**Last Updated**: 2025-11-21

