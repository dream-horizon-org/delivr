# JIRA Integration Flow Analysis & Integration Guide

## Executive Summary
This document analyzes the JIRA integration implementation in both **delivr-server-ota** (backend) and **delivr-web-panel** (BFF/frontend), identifies gaps, and provides end-to-end integration steps.

**Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Backend infrastructure exists but integration is incomplete.

---

## 1. SERVER-OTA Architecture (Backend)

### 1.1 Database Schema

#### **Table: `project_management_integrations`**
```sql
Stores JIRA connection credentials (Layer 1)
├── id: VARCHAR(255) PRIMARY KEY
├── projectId: VARCHAR(255) - Tenant/Project identifier
├── name: VARCHAR(255) - User-friendly name
├── providerType: ENUM('JIRA', 'LINEAR', 'ASANA', 'MONDAY', 'CLICKUP')
├── config: JSON - Provider-specific config
│   ├── baseUrl: string
│   ├── email: string
│   ├── apiToken: string (encrypted)
│   └── jiraType: 'CLOUD' | 'SERVER' | 'DATA_CENTER'
├── isEnabled: BOOLEAN
├── verificationStatus: ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED')
├── lastVerifiedAt: TIMESTAMP
├── createdByAccountId: VARCHAR(255)
└── timestamps
```

#### **Table: `project_management_configs`**
```sql
Reusable configurations for project management (Layer 2)
├── id: VARCHAR(255) PRIMARY KEY
├── projectId: VARCHAR(255)
├── integrationId: VARCHAR(255) - FK to integrations
├── name: VARCHAR(255) - Config name (e.g., "Frontend Release")
├── description: TEXT
├── platformConfigurations: JSON[]
│   └── [
│       {
│         "platform": "WEB" | "PLAY_STORE" | "APP_STORE",
│         "parameters": {
│           "projectKey": "PROJ",
│           "issueType": "Epic",
│           "completedStatus": "Done",
│           "priority": "High",
│           "labels": ["release"]
│         }
│       }
│     ]
├── isActive: BOOLEAN
└── timestamps
```

#### **Table: `releases` (Existing)**
```sql
Release tracking with JIRA epic IDs
├── webEpicId: VARCHAR(255) - Stores JIRA epic ID for WEB
├── playStoreEpicId: VARCHAR(255) - Stores JIRA epic ID for Play Store  
└── iosEpicId: VARCHAR(255) - Stores JIRA epic ID for iOS/App Store
```

### 1.2 API Routes

#### **Integration Management** (Layer 1 - Credentials)
```
POST   /projects/:projectId/integrations/project-management
GET    /projects/:projectId/integrations/project-management
GET    /projects/:projectId/integrations/project-management/:integrationId
PUT    /projects/:projectId/integrations/project-management/:integrationId
DELETE /projects/:projectId/integrations/project-management/:integrationId
POST   /projects/:projectId/integrations/project-management/:integrationId/verify
```

#### **Configuration Management** (Layer 2 - Reusable Configs)
```
POST   /projects/:projectId/project-management/configs
GET    /projects/:projectId/project-management/configs
GET    /projects/:projectId/project-management/configs/:configId
PUT    /projects/:projectId/project-management/configs/:configId
DELETE /projects/:projectId/project-management/configs/:configId
POST   /projects/:projectId/project-management/configs/:configId/verify
```

#### **Ticket Operations** (Stateless)
```
POST /project-management/tickets/create
GET  /project-management/tickets/check-status
```

### 1.3 Service Layer

#### **JiraProvider** (`jira.provider.ts`)
```typescript
- validateConfig(config): Promise<boolean>
- createTicket(config, params): Promise<TicketResult>
- getTicketStatus(config, ticketKey): Promise<TicketStatusResult>
- isTicketCompleted(config, ticketKey, completedStatus): Promise<boolean>
- getProjects(config): Promise<Array<{key, name}>>
```

#### **JiraClient** (`jira.client.ts`)
```typescript
- testConnection(): Promise<void>
- getProjects(): Promise<JiraProjectResponse[]>
- createIssue(params): Promise<JiraIssueResponse>
- getIssue(issueKey): Promise<JiraIssueResponse>
```

### 1.4 Key Features
✅ Credential storage & management  
✅ Multi-provider support (JIRA, Linear, Asana)  
✅ Platform-specific configurations (WEB, PLAY_STORE, APP_STORE)  
✅ Config verification against JIRA API  
✅ Stateless ticket creation  
✅ Ticket status checking  
✅ Project key validation  
❌ NOT storing tickets in DB (stateless by design)

---

## 2. WEB-PANEL Architecture (BFF + Frontend)

### 2.1 BFF Service Layer

#### **JiraIntegrationService** (`jira-integration.ts`)
```typescript
Location: app/.server/services/ReleaseManagement/integrations/

Methods:
- verifyCredentials(data, userId): Promise<JiraVerifyResponse>
- getIntegration(tenantId, userId): Promise<JiraIntegrationResponse>
- createIntegration(data): Promise<JiraIntegrationResponse>
- updateIntegration(data): Promise<JiraIntegrationResponse>
- deleteIntegration(tenantId, userId): Promise<Response>
```

**Implementation**: Proxies to server-ota backend via HTTP

### 2.2 BFF API Routes

```typescript
// Connection Management
POST   /api/v1/tenants/:tenantId/integrations/jira
GET    /api/v1/tenants/:tenantId/integrations/jira
PATCH  /api/v1/tenants/:tenantId/integrations/jira
DELETE /api/v1/tenants/:tenantId/integrations/jira

// Verification
POST   /api/v1/tenants/:tenantId/integrations/jira/verify

// Project Management Endpoint (Alternative)
GET    /api/v1/tenants/:tenantId/integrations/project-management/jira
POST   /api/v1/tenants/:tenantId/integrations/project-management/jira
GET    /api/v1/tenants/:tenantId/integrations/project-management/jira/verify
```

### 2.3 Frontend Components

#### **Connection Flow**
- **`JiraConnectionFlow.tsx`**: Connection wizard
  - Form fields: displayName, hostUrl, email, apiToken, jiraType
  - Two-step: Verify → Connect
  - Calls verify endpoint, then create endpoint

#### **Release Configuration**
- **`JiraProjectConfig.tsx`**: Configuration UI
  - Enable/disable toggle
  - Integration selector
  - Project key input
  - Issue type configuration
  - Auto-create release ticket option
  - Link builds to issues option

- **`JiraProjectStep.tsx`**: Wizard step component
  - Wraps JiraProjectConfig
  - Used in release configuration wizard

### 2.4 Type Definitions

#### **Release Config Types** (`release-config.ts`)
```typescript
export interface JiraProjectConfig {
  enabled: boolean;
  integrationId: string;
  projectKey: string;
  projectId?: string;
  issueTypeForRelease?: string;
  createReleaseTicket?: boolean;
  linkBuildsToIssues?: boolean;
}

export interface ReleaseConfiguration {
  // ... other fields
  jiraProject: JiraProjectConfig; // ⚠️ Stored as part of release config
}
```

---

## 3. Gap Analysis

### 3.1 ✅ What's Working

1. **Backend Infrastructure**
   - Database schema fully defined
   - API routes created
   - Service layer complete (JiraProvider, JiraClient)
   - Verification logic working
   - Ticket creation/status checking functional

2. **Frontend Connection Flow**
   - JIRA connection modal
   - Credential verification
   - Integration listing

3. **Release Configuration UI**
   - JIRA project configuration card
   - Enable/disable functionality
   - Project key configuration

### 3.2 ❌ What's Missing

#### **CRITICAL GAPS**

1. **⚠️ Endpoint Mismatch**
   - Frontend uses: `/api/v1/tenants/:tenantId/integrations/jira`
   - Backend expects: `/projects/:projectId/integrations/project-management`
   - **Problem**: BFF routes point to wrong backend endpoints

2. **⚠️ Data Model Mismatch**
   - Backend: Two-layer model (Integration + Config)
   - Frontend: Single-layer model (embedded in ReleaseConfiguration)
   - **Problem**: Frontend stores JIRA config in release config, not using backend's reusable config system

3. **❌ Configuration Layer Not Used**
   - Backend `project_management_configs` table exists but unused by frontend
   - Platform-specific configurations not leveraged
   - **Problem**: Can't have reusable JIRA configs across releases

4. **❌ Ticket Creation Not Integrated**
   - Backend has ticket creation service
   - Frontend doesn't call ticket creation endpoints
   - Release creation flow doesn't create JIRA epics
   - **Problem**: `webEpicId`, `playStoreEpicId`, `iosEpicId` fields in releases remain empty

5. **❌ System Metadata**
   - Server returns JIRA as unavailable (`isAvailable: false`) in system metadata
   - **Location**: `routes/management.ts:106`
   - **Problem**: UI might hide JIRA integration option

6. **❌ Missing Encryption**
   - API tokens should be encrypted before storage
   - No encryption util integration in JIRA service
   - **Problem**: Security vulnerability

7. **❌ No Release-to-JIRA Linkage**
   - Release creation doesn't trigger JIRA ticket creation
   - No webhook/event system to sync release status to JIRA
   - **Problem**: Manual sync required

---

## 4. End-to-End Integration Flow

### 4.1 Current State (Partially Working)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. INTEGRATION SETUP (✅ Working)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User                     Web Panel                  Server-OTA  │
│   │                          │                           │       │
│   │─── Open Integrations ───>│                           │       │
│   │                          │                           │       │
│   │<── Integration Modal ────│                           │       │
│   │                          │                           │       │
│   │─ Enter Credentials ─────>│                           │       │
│   │    (hostUrl, email,      │                           │       │
│   │     apiToken, jiraType)  │                           │       │
│   │                          │                           │       │
│   │─── Click Verify ────────>│                           │       │
│   │                          │── POST /verify ──────────>│       │
│   │                          │   { config: {...} }       │       │
│   │                          │                           │       │
│   │                          │                      [JiraClient]  │
│   │                          │                      testConnection()
│   │                          │                           │       │
│   │                          │<── { verified: true } ────│       │
│   │                          │                           │       │
│   │<── ✅ Verified ──────────│                           │       │
│   │                          │                           │       │
│   │─── Click Connect ───────>│                           │       │
│   │                          │── POST /integrations ────>│       │
│   │                          │   { name, providerType,   │       │
│   │                          │     config: {...} }       │       │
│   │                          │                           │       │
│   │                          │                     [Insert DB]   │
│   │                          │        project_management_        │
│   │                          │        integrations table         │
│   │                          │                           │       │
│   │                          │<── { success, data } ─────│       │
│   │                          │                           │       │
│   │<── ✅ Connected ─────────│                           │       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. RELEASE CONFIGURATION (⚠️ Partially Working)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User                     Web Panel                  Server-OTA  │
│   │                          │                           │       │
│   │─ Configure Release ─────>│                           │       │
│   │                          │                           │       │
│   │─ Enable JIRA ───────────>│                           │       │
│   │─ Select Integration ────>│                           │       │
│   │─ Enter Project Key ─────>│                           │       │
│   │   (e.g., "PROJ")         │                           │       │
│   │                          │                           │       │
│   │─ Save Configuration ────>│                           │       │
│   │                          │                           │       │
│   │                     [localStorage]                          │
│   │                     Stores config as:                        │
│   │                     {                                        │
│   │                       jiraProject: {                         │
│   │                         enabled: true,                       │
│   │                         integrationId: "...",                │
│   │                         projectKey: "PROJ",                  │
│   │                         createReleaseTicket: true            │
│   │                       }                                      │
│   │                     }                                        │
│   │                          │                           │       │
│   │<── ✅ Config Saved ──────│                           │       │
│   │                          │                           │       │
│   │   ⚠️ Problem: Config stored locally, not synced to backend  │
│   │   ⚠️ Backend's `project_management_configs` table unused    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. RELEASE CREATION (❌ Not Integrated)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User                     Web Panel                  Server-OTA  │
│   │                          │                           │       │
│   │─ Create Release ────────>│                           │       │
│   │   (version, date, etc)   │                           │       │
│   │                          │                           │       │
│   │                          │── POST /releases ────────>│       │
│   │                          │   { version, date,        │       │
│   │                          │     platforms: [...] }    │       │
│   │                          │                           │       │
│   │                          │                     [Create        │
│   │                          │                      Release]      │
│   │                          │                           │       │
│   │                          │                           │       │
│   │   ❌ MISSING: JIRA ticket creation not triggered             │
│   │   ❌ Should call: POST /project-management/tickets/create    │
│   │   ❌ Should store epic IDs in: webEpicId, playStoreEpicId,   │
│   │       iosEpicId fields                                       │
│   │                          │                           │       │
│   │                          │<── { releaseId } ─────────│       │
│   │                          │                           │       │
│   │<── Release Created ──────│                           │       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Desired State (Fully Integrated)

```
┌─────────────────────────────────────────────────────────────────┐
│ 3. RELEASE CREATION (✅ Fully Integrated)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User                     Web Panel                  Server-OTA  │
│   │                          │                           │       │
│   │─ Create Release ────────>│                           │       │
│   │   (v1.2.0, 2025-01-15)   │                           │       │
│   │                          │                           │       │
│   │                          │── POST /releases ────────>│       │
│   │                          │   { version: "1.2.0",     │       │
│   │                          │     date: "2025-01-15",   │       │
│   │                          │     platforms: ["ANDROID",│       │
│   │                          │                 "IOS"],   │       │
│   │                          │     jiraConfig: {         │       │
│   │                          │       enabled: true,      │       │
│   │                          │       integrationId: "...",│       │
│   │                          │       projectKey: "PROJ", │       │
│   │                          │       createTicket: true  │       │
│   │                          │     }                     │       │
│   │                          │   }                       │       │
│   │                          │                           │       │
│   │                          │                   [Create Release]│
│   │                          │                      INSERT INTO  │
│   │                          │                       releases     │
│   │                          │                           │       │
│   │                          │           [Check if JIRA enabled] │
│   │                          │                           │       │
│   │                          │               [For each platform] │
│   │                          │                           │       │
│   │                          │           ┌───────────────┴──┐   │
│   │                          │           │ ANDROID Platform │   │
│   │                          │           └───────────────┬──┘   │
│   │                          │                           │       │
│   │                          │            [Get Integration]      │
│   │                          │             SELECT * FROM         │
│   │                          │         project_management_       │
│   │                          │         integrations              │
│   │                          │         WHERE id = ...            │
│   │                          │                           │       │
│   │                          │            [JiraProvider]         │
│   │                          │            createTicket({         │
│   │                          │              projectKey: "PROJ",  │
│   │                          │              title: "Release      │
│   │                          │                v1.2.0 - ANDROID", │
│   │                          │              description: "...",  │
│   │                          │              issueType: "Epic",   │
│   │                          │              labels: ["release"]  │
│   │                          │            })                     │
│   │                          │                           │       │
│   │                          │            [JiraClient]           │
│   │                          │             POST /rest/api/3/     │
│   │                          │              issue                │
│   │                          │                           │       │
│   │                          │               JIRA API            │
│   │                          │            ┌──────────────┴──┐   │
│   │                          │            │  Create Issue    │   │
│   │                          │            │  PROJ-123       │   │
│   │                          │            └──────────────┬──┘   │
│   │                          │                           │       │
│   │                          │<── { key: "PROJ-123",     │       │
│   │                          │      id: "10001",         │       │
│   │                          │      url: "..." }         │       │
│   │                          │                           │       │
│   │                          │          [Update Release] │       │
│   │                          │           UPDATE releases │       │
│   │                          │           SET playStoreEpicId =   │
│   │                          │             "PROJ-123"            │
│   │                          │                           │       │
│   │                          │           ┌───────────────┴──┐   │
│   │                          │           │   IOS Platform   │   │
│   │                          │           └───────────────┬──┘   │
│   │                          │                           │       │
│   │                          │          [Repeat for iOS] │       │
│   │                          │          Create: PROJ-124 │       │
│   │                          │          Store in:        │       │
│   │                          │            iosEpicId      │       │
│   │                          │                           │       │
│   │                          │<── { success: true,       │       │
│   │                          │      releaseId: "...",    │       │
│   │                          │      jiraTickets: {       │       │
│   │                          │        playStore: {       │       │
│   │                          │          key: "PROJ-123", │       │
│   │                          │          url: "..."       │       │
│   │                          │        },                 │       │
│   │                          │        appStore: {        │       │
│   │                          │          key: "PROJ-124", │       │
│   │                          │          url: "..."       │       │
│   │                          │        }                  │       │
│   │                          │      }                    │       │
│   │                          │    }                      │       │
│   │                          │                           │       │
│   │<── ✅ Release Created ───│                           │       │
│   │    With JIRA Tickets:    │                           │       │
│   │    - PROJ-123 (Android)  │                           │       │
│   │    - PROJ-124 (iOS)      │                           │       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Steps

### Phase 1: Fix BFF-to-Backend Connection (High Priority)

#### Step 1.1: Update BFF Service to use correct endpoints

**File**: `app/.server/services/ReleaseManagement/integrations/jira-integration.ts`

```typescript
// Change from:
// `/tenants/${tenantId}/integrations/project-management/jira`

// To:
// `/projects/${tenantId}/integrations/project-management`

async createIntegration(
  projectId: string,
  userId: string,
  data: CreateJiraIntegrationRequest
): Promise<JiraIntegrationResponse> {
  try {
    return await this.post<JiraIntegrationResponse>(
      `/projects/${projectId}/integrations/project-management`,
      {
        name: data.name,
        providerType: 'JIRA',
        config: {
          baseUrl: data.config.baseUrl,
          email: data.config.email,
          apiToken: data.config.apiToken,
          jiraType: data.config.jiraType
        }
      },
      userId
    );
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create JIRA integration'
    };
  }
}
```

#### Step 1.2: Enable JIRA in system metadata

**File**: `api/script/routes/management.ts:106`

```typescript
// Change from:
const PROJECT_MANAGEMENT = [
  { id: "jira", name: "Jira", requiresOAuth: true, isAvailable: false },
  // ...
];

// To:
const PROJECT_MANAGEMENT = [
  { id: "jira", name: "Jira", requiresOAuth: false, isAvailable: true },
  // ...
];
```

#### Step 1.3: Add encryption for API tokens

**File**: `app/.server/services/ReleaseManagement/integrations/jira-integration.ts`

```typescript
import { encrypt, decrypt } from '~/utils/encryption';

async createIntegration(...) {
  // Encrypt API token before sending to backend
  const encryptedToken = await encrypt(data.config.apiToken);
  
  return await this.post<JiraIntegrationResponse>(
    `/projects/${projectId}/integrations/project-management`,
    {
      ...data,
      config: {
        ...data.config,
        apiToken: encryptedToken
      }
    },
    userId
  );
}
```

### Phase 2: Integrate JIRA Configs with Release Creation

#### Step 2.1: Create PM Config when saving release config

**New File**: `app/.server/services/ReleaseManagement/project-management-config.service.ts`

```typescript
export class ProjectManagementConfigService extends IntegrationService {
  async createConfig(
    projectId: string,
    userId: string,
    data: {
      name: string;
      integrationId: string;
      platformConfigurations: Array<{
        platform: 'WEB' | 'PLAY_STORE' | 'APP_STORE';
        parameters: {
          projectKey: string;
          issueType?: string;
          completedStatus: string;
        };
      }>;
    }
  ) {
    return await this.post(
      `/projects/${projectId}/project-management/configs`,
      data,
      userId
    );
  }
}
```

#### Step 2.2: Update release config save logic

**File**: `app/routes/api.v1.tenants.$tenantId.releases.configure.tsx`

```typescript
export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { tenantId } = params;
  const config = await request.json();
  
  // 1. Save release configuration to localStorage (existing)
  await saveReleaseConfig(tenantId, config);
  
  // 2. If JIRA is enabled, create/update PM config in backend
  if (config.jiraProject?.enabled) {
    const pmConfigService = new ProjectManagementConfigService();
    
    // Convert release config to PM config format
    const platformConfigs = config.platforms.map((platform: string) => ({
      platform: mapPlatformToTarget(platform), // ANDROID -> PLAY_STORE
      parameters: {
        projectKey: config.jiraProject.projectKey,
        issueType: config.jiraProject.issueTypeForRelease || 'Epic',
        completedStatus: 'Done'
      }
    }));
    
    await pmConfigService.createConfig(tenantId, userId, {
      name: `${config.name} - JIRA Config`,
      integrationId: config.jiraProject.integrationId,
      platformConfigurations: platformConfigs
    });
  }
  
  return json({ success: true });
};
```

### Phase 3: Auto-Create JIRA Tickets on Release Creation

#### Step 3.1: Create ticket creation service in BFF

**New File**: `app/.server/services/ReleaseManagement/project-management-ticket.service.ts`

```typescript
export class ProjectManagementTicketService extends IntegrationService {
  async createTickets(
    data: {
      projectId: string;
      integrationId: string;
      tickets: Array<{
        platform: 'WEB' | 'PLAY_STORE' | 'APP_STORE';
        projectKey: string;
        title: string;
        description: string;
        issueType: string;
        labels?: string[];
      }>;
    },
    userId: string
  ) {
    return await this.post(
      `/project-management/tickets/create`,
      data,
      userId
    );
  }
}
```

#### Step 3.2: Integrate with release creation flow

**File**: `api/script/routes/release-management.ts` (or dedicated release creation controller)

```typescript
router.post('/releases', async (req: Request, res: Response) => {
  const { 
    version, 
    plannedDate, 
    platforms,
    jiraConfig // New: Include JIRA config
  } = req.body;
  
  // 1. Create release in DB
  const release = await storage.createRelease({
    version,
    plannedDate,
    platforms,
    // ... other fields
  });
  
  // 2. If JIRA is enabled, create tickets
  if (jiraConfig?.enabled && jiraConfig?.createReleaseTicket) {
    const jiraTickets = await createJiraTicketsForRelease({
      releaseId: release.id,
      version: release.version,
      platforms: platforms,
      integrationId: jiraConfig.integrationId,
      projectKey: jiraConfig.projectKey,
      issueType: jiraConfig.issueTypeForRelease || 'Epic'
    });
    
    // 3. Update release with epic IDs
    await storage.updateRelease(release.id, {
      webEpicId: jiraTickets.WEB?.ticketKey,
      playStoreEpicId: jiraTickets.PLAY_STORE?.ticketKey,
      iosEpicId: jiraTickets.APP_STORE?.ticketKey
    });
  }
  
  res.json({ success: true, release });
});

async function createJiraTicketsForRelease(params) {
  const { version, platforms, integrationId, projectKey, issueType } = params;
  
  // Get integration config
  const integration = await storage.getProjectManagementIntegration(integrationId);
  const provider = ProviderFactory.getProvider(integration.providerType);
  
  const tickets = {};
  
  for (const platform of platforms) {
    const target = mapPlatformToTarget(platform); // ANDROID -> PLAY_STORE
    
    const result = await provider.createTicket(integration.config, {
      projectKey: projectKey,
      title: `Release v${version} - ${target}`,
      description: `Release tracking ticket for ${version} on ${target}`,
      issueType: issueType,
      labels: ['release', version.toLowerCase()]
    });
    
    tickets[target] = result;
  }
  
  return tickets;
}
```

### Phase 4: Display JIRA Tickets in UI

#### Step 4.1: Show epic links in release detail view

**File**: `app/components/Pages/components/ReleaseDetailCard/index.tsx`

```typescript
export function ReleaseDetailCard({ release }) {
  return (
    <Card>
      {/* ... existing fields ... */}
      
      {/* New: JIRA Epic Links */}
      {(release.playStoreEpicId || release.iosEpicId || release.webEpicId) && (
        <Stack gap="xs">
          <Text fw={600} size="sm">JIRA Epics</Text>
          {release.playStoreEpicId && (
            <Anchor 
              href={getJiraUrl(release.playStoreEpicId)} 
              target="_blank"
              size="sm"
            >
              Play Store: {release.playStoreEpicId}
            </Anchor>
          )}
          {release.iosEpicId && (
            <Anchor 
              href={getJiraUrl(release.iosEpicId)} 
              target="_blank"
              size="sm"
            >
              App Store: {release.iosEpicId}
            </Anchor>
          )}
        </Stack>
      )}
    </Card>
  );
}
```

### Phase 5: Testing & Validation

```bash
# 1. Test JIRA connection
curl -X POST http://localhost:5000/api/v1/tenants/test-tenant/integrations/jira/verify \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://your-domain.atlassian.net",
    "email": "your-email@example.com",
    "apiToken": "your-api-token",
    "jiraType": "CLOUD"
  }'

# 2. Create integration
curl -X POST http://localhost:5000/api/v1/tenants/test-tenant/integrations/jira \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test JIRA",
    "hostUrl": "https://your-domain.atlassian.net",
    "email": "your-email@example.com",
    "apiToken": "your-api-token",
    "jiraType": "CLOUD"
  }'

# 3. Create release with JIRA
curl -X POST http://localhost:3000/releases \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.2.0",
    "plannedDate": "2025-01-15",
    "platforms": ["ANDROID", "IOS"],
    "jiraConfig": {
      "enabled": true,
      "integrationId": "integration-id",
      "projectKey": "PROJ",
      "createReleaseTicket": true
    }
  }'

# 4. Verify tickets created
curl http://localhost:3000/releases/release-id
# Should return playStoreEpicId and iosEpicId
```

---

## 6. Summary

### Current State
- ✅ Backend infrastructure complete
- ✅ Frontend connection UI complete
- ⚠️ BFF partially implemented
- ❌ Release integration missing

### Required Changes
1. **Fix BFF endpoints** (2-4 hours)
2. **Enable JIRA in metadata** (5 minutes)
3. **Add encryption** (1 hour)
4. **Integrate PM configs** (4-6 hours)
5. **Auto-create tickets** (6-8 hours)
6. **UI updates** (2-3 hours)

**Total Effort**: ~20-25 hours

### Dependencies
- Encryption utils: `app/utils/encryption.ts`
- Server-OTA APIs must be accessible from web-panel
- Database migrations already run
- JIRA API credentials for testing

---

## 7. References

### Backend Files
- `/api/script/services/integrations/project-management/providers/jira/`
- `/api/script/routes/integrations/project-management/`
- `/migrations/005_project_management_integration.sql`

### Frontend Files
- `/app/.server/services/ReleaseManagement/integrations/jira-integration.ts`
- `/app/components/Integrations/JiraConnectionFlow.tsx`
- `/app/components/ReleaseConfig/JiraProject/`
- `/app/types/jira-integration.ts`
- `/app/types/release-config.ts`

### API Documentation
- Server-OTA: `http://localhost:3000/api/docs` (if available)
- JIRA REST API: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Author**: AI Assistant  
**Status**: Ready for Implementation

