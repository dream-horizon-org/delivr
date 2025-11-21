# JIRA in Release Configuration - Flow Analysis

## Overview
This document analyzes how JIRA is integrated into the Release Configuration flow, identifies the current implementation, and explains the DTOs required for proper JIRA project management setup.

---

## 1. Current Frontend Flow (Release Configuration)

### 1.1 Release Configuration Wizard Steps

```
Step 1: Basic Info
  ↓
Step 2: Target Platforms (PLAY_STORE, APP_STORE, WEB)
  ↓
Step 3: Build Pipelines (Jenkins/GitHub Actions)
  ↓
Step 4: Test Management (Checkmate)
  ↓
Step 5: PROJECT MANAGEMENT (JIRA) ← WE ARE HERE
  ↓
Step 6: Communication (Slack)
  ↓
Step 7: Scheduling (Optional)
  ↓
Step 8: Review & Submit
```

### 1.2 JIRA Configuration in Release Config

**Location**: Step 5 - Project Management

**Component**: `JiraProjectStep.tsx` → `JiraProjectConfigCard.tsx`

**Current Data Structure** (Frontend):
```typescript
// From: app/types/release-config.ts

export interface JiraProjectConfig {
  enabled: boolean;                    // Toggle JIRA on/off
  integrationId: string;               // FK to JIRA integration
  projectKey: string;                  // e.g., "PROJ", "APP"
  projectId?: string;                  // Optional numeric ID
  issueTypeForRelease?: string;        // e.g., "Epic", "Release"
  createReleaseTicket?: boolean;       // Auto-create ticket on release creation
  linkBuildsToIssues?: boolean;        // Link builds to JIRA issues
}
```

**Embedded In**:
```typescript
export interface ReleaseConfiguration {
  id: string;
  organizationId: string;
  name: string;
  // ... other fields ...
  
  jiraProject: JiraProjectConfig;  // ← Embedded, not separate
  
  // ... other fields ...
}
```

### 1.3 Current Storage Mechanism

**Storage Type**: **Local Storage** (Browser)

**Storage Key**: `delivr_release_config_draft_{organizationId}`

**Flow**:
1. User configures JIRA in wizard Step 5
2. Config auto-saved to `localStorage` on every change
3. On final submit (Step 8), entire `ReleaseConfiguration` sent to:
   - **Endpoint**: `POST /api/v1/tenants/:tenantId/release-config`
   - **Payload**: `{ config: ReleaseConfiguration }`
4. BFF saves entire config to local storage/cache

**Problem**: JIRA config is NOT sent to backend's Project Management Config system!

---

## 2. Backend Flow (Project Management Configs)

### 2.1 Backend Architecture (2-Layer System)

```
Layer 1: INTEGRATIONS (Credentials)
  ↓
  project_management_integrations table
  - Stores connection credentials
  - baseUrl, email, apiToken, jiraType
  
Layer 2: CONFIGURATIONS (Reusable Configs)
  ↓
  project_management_configs table
  - Platform-specific settings
  - Multiple platforms per config
  - Linked to integration via integrationId
```

### 2.2 Backend DTO Structure

**Location**: `/api/script/types/integrations/project-management/configuration/`

```typescript
// Backend DTO for creating PM Config
export type CreateProjectManagementConfigDto = {
  projectId: string;                    // Tenant ID
  integrationId: string;                // FK to integration
  name: string;                         // Config name
  description?: string;
  platformConfigurations: PlatformConfiguration[];
  createdByAccountId?: string;
};

// Platform-specific configuration
export type PlatformConfiguration = {
  platform: Platform;                   // 'WEB' | 'PLAY_STORE' | 'APP_STORE'
  parameters: {
    projectKey: string;                 // JIRA project key
    issueType?: string;                 // Epic, Story, Task
    completedStatus: string;            // Status for completion
    priority?: string;                  // High, Medium, Low
    labels?: string[];
    assignee?: string;
    [key: string]: unknown;
  };
};

// Platform enum
type Platform = 'WEB' | 'PLAY_STORE' | 'APP_STORE';
```

### 2.3 Backend API Endpoints

```
POST   /projects/:projectId/project-management/configs
GET    /projects/:projectId/project-management/configs
GET    /projects/:projectId/project-management/configs/:configId
PUT    /projects/:projectId/project-management/configs/:configId
DELETE /projects/:projectId/project-management/configs/:configId
POST   /projects/:projectId/project-management/configs/:configId/verify
```

---

## 3. The Gap - Frontend vs Backend

### 3.1 Current State

| Aspect | Frontend | Backend | Match? |
|--------|----------|---------|--------|
| **Storage** | localStorage | MySQL DB | ❌ NO |
| **Structure** | Single `JiraProjectConfig` | Multi-platform configs | ❌ NO |
| **Platform Support** | Implicit (from release config) | Explicit per platform | ❌ NO |
| **Integration Link** | `integrationId` only | Full config CRUD | ⚠️ PARTIAL |
| **Validation** | Client-side only | Server-side validation | ❌ NO |
| **Reusability** | Per release | Reusable across releases | ❌ NO |

### 3.2 What's Missing

1. **No Backend Sync**
   - Frontend saves JIRA config to localStorage
   - Backend's PM Config system is unused
   - No persistence in database

2. **No Platform Mapping**
   - Frontend: Single config for all platforms
   - Backend: Expects per-platform configs
   - Need to map: `ReleaseConfiguration.defaultTargets` → `PlatformConfiguration[]`

3. **No Validation**
   - Frontend doesn't validate project keys against JIRA
   - Backend has validation endpoint but it's not called

4. **No Reusability**
   - Each release config embeds JIRA settings
   - Can't reuse JIRA configs across multiple release configs

---

## 4. Required DTOs for Proper Integration

### 4.1 Frontend DTO (Keep As-Is for UI)

```typescript
// app/types/release-config.ts
export interface JiraProjectConfig {
  enabled: boolean;
  integrationId: string;
  projectKey: string;                // Single project key for all platforms
  projectId?: string;
  issueTypeForRelease?: string;
  createReleaseTicket?: boolean;
  linkBuildsToIssues?: boolean;
}
```

**Why Keep**: Good for UI simplicity. Most orgs use same JIRA project for all platforms.

### 4.2 Backend DTO (Use Backend's Structure)

```typescript
// Should match backend's CreateProjectManagementConfigDto
export interface CreateJiraConfigRequest {
  projectId: string;                 // tenantId
  integrationId: string;
  name: string;                      // e.g., "Release Config - JIRA"
  description?: string;
  platformConfigurations: Array<{
    platform: 'WEB' | 'PLAY_STORE' | 'APP_STORE';
    parameters: {
      projectKey: string;
      issueType?: string;
      completedStatus: string;       // Default: "Done"
      priority?: string;
      labels?: string[];
    };
  }>;
}
```

### 4.3 Transformation DTO (Frontend → Backend)

```typescript
// Transformation function
export function transformJiraConfigToBackend(
  releaseConfig: Partial<ReleaseConfiguration>,
  tenantId: string
): CreateJiraConfigRequest | null {
  if (!releaseConfig.jiraProject?.enabled) {
    return null;
  }

  const jiraConfig = releaseConfig.jiraProject;
  const platforms = releaseConfig.defaultTargets || [];

  // Map platforms to PM platforms
  const platformConfigurations = platforms.map(target => ({
    platform: target, // 'WEB', 'PLAY_STORE', 'APP_STORE'
    parameters: {
      projectKey: jiraConfig.projectKey,
      issueType: jiraConfig.issueTypeForRelease || 'Epic',
      completedStatus: 'Done', // Default
      labels: ['release'],
    },
  }));

  return {
    projectId: tenantId,
    integrationId: jiraConfig.integrationId,
    name: `${releaseConfig.name} - JIRA Config`,
    description: `Auto-generated JIRA config for ${releaseConfig.name}`,
    platformConfigurations,
  };
}
```

---

## 5. Proper Integration Flow (End-to-End)

### 5.1 Current Flow (Partial)

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Connect JIRA Integration (Credentials)          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  User clicks "Connect JIRA" in Integrations page        │
│          ↓                                               │
│  Enters: baseUrl, email, apiToken, jiraType             │
│          ↓                                               │
│  POST /api/v1/tenants/:id/integrations/jira             │
│          ↓                                               │
│  Backend: Creates record in                             │
│           project_management_integrations               │
│          ↓                                               │
│  Returns: integrationId (e.g., "int-123")               │
│                                                          │
│  ✅ THIS WORKS (Just implemented)                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Configure JIRA in Release Config                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  User opens Release Config wizard → Step 5              │
│          ↓                                               │
│  Selects integration: "int-123"                         │
│  Enters project key: "PROJ"                             │
│  Enables: createReleaseTicket, linkBuildsToIssues      │
│          ↓                                               │
│  Config saved to localStorage                           │
│  {                                                       │
│    jiraProject: {                                       │
│      enabled: true,                                     │
│      integrationId: "int-123",                          │
│      projectKey: "PROJ",                                │
│      createReleaseTicket: true                          │
│    }                                                     │
│  }                                                       │
│          ↓                                               │
│  ❌ PROBLEM: Not synced to backend!                     │
│  ❌ Backend's project_management_configs unused         │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Create Release (Missing Integration)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  User creates new release                               │
│          ↓                                               │
│  POST /api/releases                                     │
│  {                                                       │
│    version: "1.2.0",                                    │
│    configId: "config-123" // Reference to release config│
│  }                                                       │
│          ↓                                               │
│  ❌ Backend doesn't create JIRA tickets                 │
│  ❌ No PM config to reference                           │
│  ❌ Release epicIds remain null                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Desired Flow (Complete)

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Connect JIRA Integration ✅                      │
│  (Same as current - works!)                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Configure JIRA in Release Config ✅             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  User configures in wizard Step 5                       │
│          ↓                                               │
│  Config saved to localStorage (existing)                │
│          ↓                                               │
│  On wizard "Finish" click (Step 8):                     │
│                                                          │
│  1. Transform JiraProjectConfig → Backend DTO           │
│     transformJiraConfigToBackend(config)                │
│                                                          │
│  2. Create PM Config in backend                         │
│     POST /projects/:tenantId/project-management/configs │
│     {                                                    │
│       integrationId: "int-123",                         │
│       name: "Standard Release - JIRA",                  │
│       platformConfigurations: [                         │
│         {                                               │
│           platform: "PLAY_STORE",                       │
│           parameters: {                                 │
│             projectKey: "PROJ",                         │
│             issueType: "Epic",                          │
│             completedStatus: "Done"                     │
│           }                                             │
│         },                                              │
│         {                                               │
│           platform: "APP_STORE",                        │
│           parameters: { ... }                           │
│         }                                               │
│       ]                                                 │
│     }                                                    │
│          ↓                                               │
│  3. Backend returns: pmConfigId                         │
│          ↓                                               │
│  4. Store pmConfigId in release config                  │
│     ReleaseConfiguration {                              │
│       ...                                               │
│       jiraProject: {                                    │
│         ...existing fields...                           │
│         pmConfigId: "pm-config-456" // ← NEW            │
│       }                                                  │
│     }                                                    │
│          ↓                                               │
│  5. Save release config to backend                      │
│     POST /api/v1/tenants/:id/release-config             │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Create Release with JIRA ✅                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  User creates new release                               │
│          ↓                                               │
│  POST /api/releases                                     │
│  {                                                       │
│    version: "1.2.0",                                    │
│    configId: "config-123",                              │
│    platforms: ["ANDROID", "IOS"]                        │
│  }                                                       │
│          ↓                                               │
│  Backend:                                               │
│  1. Load release config by configId                     │
│  2. Get pmConfigId from config.jiraProject              │
│  3. Load PM config from DB                              │
│  4. For each platform:                                  │
│     - Get integration credentials                       │
│     - Call JiraProvider.createTicket()                  │
│     - Store epicId in release                           │
│                                                          │
│  Result:                                                │
│  Release {                                              │
│    ...                                                  │
│    playStoreEpicId: "PROJ-123",  // ✅ Populated        │
│    iosEpicId: "PROJ-124"         // ✅ Populated        │
│  }                                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Requirements

### 6.1 Frontend Changes Needed

#### Change 1: Add pmConfigId to JiraProjectConfig type

```typescript
// app/types/release-config.ts
export interface JiraProjectConfig {
  enabled: boolean;
  integrationId: string;
  projectKey: string;
  projectId?: string;
  issueTypeForRelease?: string;
  createReleaseTicket?: boolean;
  linkBuildsToIssues?: boolean;
  
  pmConfigId?: string;  // ← ADD THIS: Link to backend PM config
}
```

#### Change 2: Create BFF Service for PM Configs

**New File**: `app/.server/services/ReleaseManagement/project-management-config.service.ts`

```typescript
export class ProjectManagementConfigService extends IntegrationService {
  /**
   * Create PM config in backend
   */
  async createConfig(
    projectId: string,
    userId: string,
    data: CreateJiraConfigRequest
  ) {
    return await this.post(
      `/projects/${projectId}/project-management/configs`,
      data,
      userId
    );
  }

  /**
   * Verify PM config (validates project keys)
   */
  async verifyConfig(
    projectId: string,
    configId: string,
    userId: string
  ) {
    return await this.post(
      `/projects/${projectId}/project-management/configs/${configId}/verify`,
      {},
      userId
    );
  }
}
```

#### Change 3: Update ConfigurationWizard to create PM config

**File**: `app/components/ReleaseConfig/Wizard/ConfigurationWizard.tsx`

**In `handleFinish()` method**:

```typescript
const handleFinish = async () => {
  setIsSubmitting(true);
  
  try {
    let pmConfigId: string | undefined;
    
    // 1. If JIRA is enabled, create PM config first
    if (config.jiraProject?.enabled) {
      const pmConfigData = transformJiraConfigToBackend(config, organizationId);
      
      if (pmConfigData) {
        const pmConfigService = new ProjectManagementConfigService();
        const result = await pmConfigService.createConfig(
          organizationId,
          userId,
          pmConfigData
        );
        
        if (result.success) {
          pmConfigId = result.data.id;
        }
      }
    }
    
    // 2. Update config with pmConfigId
    const completeConfig: ReleaseConfiguration = {
      ...config,
      jiraProject: {
        ...config.jiraProject,
        pmConfigId, // Link to backend config
      },
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
      createdAt: isEditMode ? config.createdAt! : new Date().toISOString(),
    } as ReleaseConfiguration;
    
    // 3. Save release config
    const response = await fetch(
      `/api/v1/tenants/${organizationId}/release-config`,
      {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: completeConfig }),
      }
    );
    
    // ... rest of existing code
  } catch (error) {
    // ... error handling
  }
};
```

#### Change 4: Create transformation utility

**New File**: `app/utils/jira-config-transform.ts`

```typescript
export function transformJiraConfigToBackend(
  config: Partial<ReleaseConfiguration>,
  tenantId: string
): CreateJiraConfigRequest | null {
  if (!config.jiraProject?.enabled || !config.defaultTargets) {
    return null;
  }

  const jiraConfig = config.jiraProject;
  
  const platformConfigurations = config.defaultTargets.map(target => ({
    platform: target as 'WEB' | 'PLAY_STORE' | 'APP_STORE',
    parameters: {
      projectKey: jiraConfig.projectKey,
      issueType: jiraConfig.issueTypeForRelease || 'Epic',
      completedStatus: 'Done',
      labels: ['release', config.name?.toLowerCase() || ''],
    },
  }));

  return {
    projectId: tenantId,
    integrationId: jiraConfig.integrationId,
    name: `${config.name || 'Release'} - JIRA Config`,
    description: `JIRA configuration for ${config.name}`,
    platformConfigurations,
  };
}
```

### 6.2 Backend Changes Needed

#### Change 1: Update release creation to use PM configs

**File**: `/api/script/services/release/release.service.ts` (or similar)

```typescript
async createRelease(data: CreateReleaseDto) {
  // 1. Create release record
  const release = await this.releaseRepo.create(data);
  
  // 2. If config has JIRA enabled, create tickets
  if (data.configId) {
    const releaseConfig = await this.getReleaseConfig(data.configId);
    
    if (releaseConfig.jiraProject?.enabled && releaseConfig.jiraProject.pmConfigId) {
      const epicIds = await this.createJiraTicketsForRelease(
        release,
        releaseConfig.jiraProject.pmConfigId
      );
      
      // 3. Update release with epic IDs
      await this.releaseRepo.update(release.id, {
        playStoreEpicId: epicIds.PLAY_STORE,
        iosEpicId: epicIds.APP_STORE,
        webEpicId: epicIds.WEB,
      });
    }
  }
  
  return release;
}

async createJiraTicketsForRelease(
  release: Release,
  pmConfigId: string
): Promise<Record<string, string>> {
  // 1. Load PM config
  const pmConfig = await this.pmConfigService.getConfig(pmConfigId);
  
  // 2. Load integration
  const integration = await this.pmIntegrationService.getIntegration(
    pmConfig.integrationId
  );
  
  // 3. Get provider
  const provider = ProviderFactory.getProvider(integration.providerType);
  
  const epicIds: Record<string, string> = {};
  
  // 4. Create ticket for each platform
  for (const platformConfig of pmConfig.platformConfigurations) {
    const result = await provider.createTicket(integration.config, {
      projectKey: platformConfig.parameters.projectKey,
      title: `Release ${release.version} - ${platformConfig.platform}`,
      description: `Tracking ticket for release ${release.version}`,
      issueType: platformConfig.parameters.issueType || 'Epic',
      labels: platformConfig.parameters.labels,
    });
    
    epicIds[platformConfig.platform] = result.ticketKey;
  }
  
  return epicIds;
}
```

---

## 7. Summary

### Current State
- ✅ JIRA credentials can be saved (integration layer)
- ✅ JIRA config can be entered in release wizard
- ❌ JIRA config NOT synced to backend PM config system
- ❌ JIRA tickets NOT created on release creation
- ❌ No validation of project keys

### Required DTOs

#### Frontend (UI Layer)
```typescript
JiraProjectConfig {
  enabled, integrationId, projectKey,
  issueTypeForRelease, createReleaseTicket,
  linkBuildsToIssues, pmConfigId // ← Add this
}
```

#### Backend Request (API Layer)
```typescript
CreateJiraConfigRequest {
  projectId, integrationId, name,
  platformConfigurations: [{
    platform, 
    parameters: { projectKey, issueType, completedStatus }
  }]
}
```

#### Transformation (Bridge Layer)
```typescript
transformJiraConfigToBackend(
  releaseConfig → CreateJiraConfigRequest
)
```

### Implementation Effort

| Task | Effort | Priority |
|------|--------|----------|
| Add pmConfigId to type | 5 min | HIGH |
| Create PM config service | 30 min | HIGH |
| Update wizard finish logic | 1 hour | HIGH |
| Create transform utility | 30 min | HIGH |
| Update release creation | 2 hours | HIGH |
| Add validation | 1 hour | MEDIUM |
| Testing | 2 hours | HIGH |

**Total**: ~7 hours

---

## 8. Benefits of Proper Integration

1. **Persistence**: JIRA configs stored in database, not just localStorage
2. **Validation**: Project keys validated against actual JIRA
3. **Reusability**: Same PM config can be referenced by multiple release configs
4. **Automation**: JIRA tickets auto-created on release creation
5. **Traceability**: Release → Epic IDs stored in database
6. **Consistency**: Frontend and backend models aligned

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Analysis Complete - Ready for Implementation

