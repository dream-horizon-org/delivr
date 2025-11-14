# Tenant Info API - With Integrations

## 📋 Overview

The tenant info API now returns all configured integrations in a unified array format, making it easy to display and manage all integration types in one place.

---

## 🎯 API Endpoint

**Endpoint:** `GET /tenants/:tenantId`  
**Authentication:** Required (Owner permission)

---

## 📤 Response Structure

### Complete Response

```json
{
  "organisation": {
    "id": "tenant_123",
    "displayName": "My Organization",
    "role": "Owner",
    "releaseManagement": {
      "setupComplete": true,
      "setupSteps": {
        "scmIntegration": true,
        "targetPlatforms": false,
        "pipelines": false,
        "communication": false
      },
      "integrations": [
        // Array of all integration objects
        {
          "type": "scm",
          "id": "scm_xyz",
          "scmType": "GITHUB",
          "displayName": "Main Repository",
          "owner": "my-org",
          "repo": "my-app",
          "repositoryUrl": "https://github.com/my-org/my-app",
          "defaultBranch": "main",
          "isActive": true,
          "verificationStatus": "VALID",
          "lastVerifiedAt": "2025-11-11T10:00:00Z",
          "createdAt": "2025-11-01T10:00:00Z",
          "updatedAt": "2025-11-11T10:00:00Z"
        },
        {
          "type": "targetPlatform",
          "id": "tp_abc",
          "platform": "APP_STORE",
          "displayName": "iOS App Store",
          "isActive": true,
          "verificationStatus": "VALID"
        },
        {
          "type": "pipeline",
          "id": "pipe_def",
          "pipelineType": "GITHUB_ACTIONS",
          "displayName": "iOS Build Pipeline",
          "isActive": true
        },
        {
          "type": "communication",
          "id": "comm_ghi",
          "communicationType": "SLACK",
          "displayName": "Engineering Channel",
          "isActive": true
        }
      ]
    }
  }
}
```

---

## 🔧 Integration Types

### 1. SCM Integration (GitHub/GitLab/Bitbucket)

```typescript
{
  type: 'scm',
  id: string,
  scmType: 'GITHUB' | 'GITLAB' | 'BITBUCKET',
  displayName: string,
  owner: string,
  repo: string,
  repositoryUrl: string,
  defaultBranch: string,
  isActive: boolean,
  verificationStatus: 'PENDING' | 'VALID' | 'INVALID' | 'EXPIRED',
  lastVerifiedAt?: string,
  createdAt: string,
  updatedAt: string
}
```

**Security:** `accessToken` and `webhookSecret` are **NOT** included in the response.

---

### 2. Target Platform (App Store / Play Store)

```typescript
{
  type: 'targetPlatform',
  id: string,
  platform: 'APP_STORE' | 'PLAY_STORE',
  displayName: string,
  isActive: boolean,
  verificationStatus: 'PENDING' | 'VALID' | 'INVALID' | 'EXPIRED'
}
```

**Status:** 🔴 Not implemented yet (returns empty for now)

---

### 3. Pipeline (CI/CD)

```typescript
{
  type: 'pipeline',
  id: string,
  pipelineType: 'GITHUB_ACTIONS' | 'JENKINS',
  displayName: string,
  isActive: boolean
}
```

**Status:** 🔴 Not implemented yet (returns empty for now)

---

### 4. Communication (Slack/Teams)

```typescript
{
  type: 'communication',
  id: string,
  communicationType: 'SLACK' | 'TEAMS' | 'EMAIL',
  displayName: string,
  isActive: boolean
}
```

**Status:** 🔴 Not implemented yet (returns empty for now)

---

## 💡 Usage Examples

### Frontend: Display All Integrations

```typescript
import { useTenantInfo } from '~/hooks/useTenantInfo';

function IntegrationsList() {
  const { data: tenantInfo } = useTenantInfo(tenantId);
  const integrations = tenantInfo?.releaseManagement?.integrations || [];

  return (
    <div>
      <h2>Configured Integrations</h2>
      {integrations.length === 0 ? (
        <p>No integrations configured</p>
      ) : (
        <ul>
          {integrations.map(integration => (
            <li key={integration.id}>
              <Badge>{integration.type}</Badge>
              {integration.displayName}
              {integration.type === 'scm' && (
                <span>({integration.scmType})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

### Frontend: Filter by Type

```typescript
import { Integration, SCMIntegration } from '~/.server/services/Codepush/types';

function SCMIntegrations() {
  const { data: tenantInfo } = useTenantInfo(tenantId);
  const integrations = tenantInfo?.releaseManagement?.integrations || [];
  
  // Filter only SCM integrations using TypeScript type guards
  const scmIntegrations = integrations.filter(
    (int): int is SCMIntegration => int.type === 'scm'
  );

  return (
    <div>
      <h3>GitHub Repositories</h3>
      {scmIntegrations.map(scm => (
        <div key={scm.id}>
          <h4>{scm.displayName}</h4>
          <p>Repository: {scm.owner}/{scm.repo}</p>
          <p>Branch: {scm.defaultBranch}</p>
          <Badge color={scm.verificationStatus === 'VALID' ? 'green' : 'red'}>
            {scm.verificationStatus}
          </Badge>
        </div>
      ))}
    </div>
  );
}
```

---

### Frontend: Check Setup Status

```typescript
function SetupCheck() {
  const { data: tenantInfo } = useTenantInfo(tenantId);
  const releaseManagement = tenantInfo?.releaseManagement;

  if (!releaseManagement?.setupComplete) {
    return <SetupWizard />;
  }

  // Show which integrations are configured
  const integrationsByType = {
    scm: releaseManagement.integrations.filter(i => i.type === 'scm').length,
    targetPlatform: releaseManagement.integrations.filter(i => i.type === 'targetPlatform').length,
    pipeline: releaseManagement.integrations.filter(i => i.type === 'pipeline').length,
    communication: releaseManagement.integrations.filter(i => i.type === 'communication').length,
  };

  return (
    <div>
      <h2>Integration Summary</h2>
      <ul>
        <li>SCM: {integrationsByType.scm} configured</li>
        <li>Target Platforms: {integrationsByType.targetPlatform} configured</li>
        <li>Pipelines: {integrationsByType.pipeline} configured</li>
        <li>Communication: {integrationsByType.communication} configured</li>
      </ul>
    </div>
  );
}
```

---

## 🔒 Security Considerations

### Sensitive Data Excluded

The API response **does NOT include**:
- `accessToken` (GitHub/GitLab tokens)
- `webhookSecret` (Webhook secrets)
- `privateKeys` (App Store credentials)
- `serviceAccountKeys` (Play Store credentials)
- Any other sensitive authentication data

These are stored in the database but intentionally excluded from API responses.

---

## 📊 Response States

### No Integrations
```json
{
  "organisation": {
    "releaseManagement": {
      "setupComplete": false,
      "setupSteps": { ... },
      "integrations": []  // Empty array
    }
  }
}
```

### Only SCM Configured
```json
{
  "organisation": {
    "releaseManagement": {
      "setupComplete": true,
      "setupSteps": {
        "scmIntegration": true,
        "targetPlatforms": false,
        "pipelines": false,
        "communication": false
      },
      "integrations": [
        { "type": "scm", ... }
      ]
    }
  }
}
```

### Multiple Integrations
```json
{
  "organisation": {
    "releaseManagement": {
      "setupComplete": true,
      "setupSteps": {
        "scmIntegration": true,
        "targetPlatforms": true,
        "pipelines": true,
        "communication": false
      },
      "integrations": [
        { "type": "scm", ... },
        { "type": "targetPlatform", ... },
        { "type": "pipeline", ... }
      ]
    }
  }
}
```

---

## 🚀 Future Additions

When new integration types are implemented, they'll be added to the same array:

```typescript
// Backend implementation example
const targetPlatforms = await storage.getTenantTargetPlatforms(tenantId);
targetPlatforms.forEach(tp => {
  integrations.push({
    type: 'targetPlatform',
    id: tp.id,
    platform: tp.platform,
    displayName: tp.displayName,
    isActive: tp.isActive,
    verificationStatus: tp.verificationStatus,
    // ... other fields
  });
});
```

No API contract changes needed! ✅

---

## 📝 TypeScript Types

### Frontend Types

```typescript
// From app/.server/services/Codepush/types.ts

export type IntegrationType = 'scm' | 'targetPlatform' | 'pipeline' | 'communication';

export type Integration = 
  | SCMIntegration 
  | TargetPlatformIntegration 
  | PipelineIntegration 
  | CommunicationIntegration;

export type Organization = {
  id: string;
  displayName: string;
  role: "Owner" | "Collaborator";
  releaseManagement?: {
    setupComplete: boolean;
    setupSteps: {
      scmIntegration: boolean;
      targetPlatforms: boolean;
      pipelines: boolean;
      communication: boolean;
    };
    integrations: Integration[];
  };
};
```

### Type Guards

```typescript
// Check if integration is SCM
function isSCMIntegration(int: Integration): int is SCMIntegration {
  return int.type === 'scm';
}

// Usage
if (isSCMIntegration(integration)) {
  console.log(integration.owner);  // ✅ TypeScript knows this exists
  console.log(integration.platform); // ❌ TypeScript error
}
```

---

## ✅ Benefits

### 1. **Unified Data Structure**
- Single array for all integration types
- Easy to iterate and display
- Consistent across all integration types

### 2. **Type Safety**
- TypeScript discriminated unions
- Type guards for filtering
- Compile-time safety

### 3. **Extensibility**
- Add new integration types without breaking changes
- API contract remains stable
- Frontend can gracefully handle new types

### 4. **Simplicity**
- No need for separate API calls per integration type
- Single source of truth
- Easy to cache and manage

---

## 🎯 Summary

**What changed:**
- Added `integrations` array to tenant info response
- Each integration has a `type` field
- All integration types in one unified array

**What's included:**
- ✅ SCM integrations (GitHub, GitLab, Bitbucket)
- 🔴 Target platforms (TODO)
- 🔴 Pipelines (TODO)
- 🔴 Communication (TODO)

**What's excluded:**
- ❌ Sensitive tokens and secrets
- ❌ Private keys and credentials

**Status:** ✅ Implemented and ready to use!

