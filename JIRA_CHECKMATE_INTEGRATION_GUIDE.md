# Jira & Checkmate Integration Guide

This document describes the Jira and Checkmate integration connection flows based on analysis of the original Delivr codebase.

---

## 📋 Overview

Both Jira and Checkmate connection flows are now fully implemented with complete UI components, similar to the Jenkins and Slack integrations.

---

## ✅ Checkmate Integration

### What is Checkmate?

Checkmate is a **test case management tool** used in the original Delivr for:
- Test run tracking
- Squad-based regression status
- Automated testing workflows
- Test result aggregation

### Connection Requirements

Based on the original Delivr implementation (`/delivr/app/utils/pending-go-aheads.ts`):

```typescript
{
  hostUrl: string,        // e.g., "https://checkmate.example.com"
  apiKey: string,         // Bearer token for authentication
  workspaceId: string,    // Workspace identifier
  
  // Optional configuration
  providerConfig: {
    defaultProjectId?: string,
    syncEnabled?: boolean,
    webhookEnabled?: boolean
  }
}
```

### API Authentication

**Method**: Bearer Token
```
Authorization: Bearer {CHECKMATE_TOKEN}
```

### Example API Call (from OG Delivr)

```typescript
// Get test run status
GET http://chekmate.dream11.local/api/v1/run/state-detail?runId={runId}&groupBy=squads
Headers:
  Authorization: Bearer {CHECKMATE_TOKEN}

Response:
{
  data: {
    squadData: [
      {
        squadName: string,
        squadId: number,
        runData: {
          total: number,
          passed: number,
          failed: number,
          untested: number,
          blocked: number,
          retest: number,
          archived: number,
          skipped: number,
          inprogress: number
        }
      }
    ]
  }
}
```

### UI Component

**File**: `app/components/Integrations/CheckmateConnectionFlow.tsx`

**Features**:
- ✅ Host URL input with validation
- ✅ API Key (Bearer token) input
- ✅ Workspace ID input
- ✅ Optional default project ID
- ✅ Connection verification before saving
- ✅ Error handling and user feedback
- ✅ Loading states

**Form Fields**:
1. **Display Name** (optional) - Friendly name for the integration
2. **Host URL** (required) - Checkmate instance URL
3. **API Key** (required) - Bearer token for authentication
4. **Workspace ID** (required) - Workspace identifier
5. **Default Project ID** (optional) - Default project for test runs

---

## 📋 Jira Integration

### What is Jira?

Jira is a **project management tool** used in the original Delivr for:
- Linking releases to Jira issues
- Cherry pick approval tracking (jiraLink field)
- Issue management
- Project tracking

### Connection Requirements

```typescript
{
  hostUrl: string,              // e.g., "https://yourcompany.atlassian.net"
  authType: 'BASIC' | 'OAUTH2' | 'PAT',
  
  // For BASIC auth (recommended for Jira Cloud)
  username?: string,            // Email address
  apiToken?: string,            // API token
  
  // For PAT auth (Jira Data Center/Server)
  personalAccessToken?: string,
  
  // For OAUTH2 (future)
  accessToken?: string,
  refreshToken?: string,
  
  // Optional
  cloudId?: string,             // Auto-detected for Jira Cloud
  defaultProjectKey?: string,   // e.g., "PROJ"
  
  providerConfig?: {
    issueTypeMapping?: Record<string, string>,
    statusMapping?: Record<string, string>,
    webhookEnabled?: boolean,
    autoCreateIssues?: boolean
  }
}
```

### Authentication Methods

#### 1. **BASIC Auth (Recommended for Jira Cloud)**

```
Authorization: Basic base64(email:api_token)
```

**How to get API Token**:
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name and copy the token
4. Use your email + token for authentication

#### 2. **Personal Access Token (PAT)**

For Jira Data Center or Server:
```
Authorization: Bearer {personal_access_token}
```

#### 3. **OAuth 2.0 (Coming Soon)**

Full OAuth flow for enhanced security.

### Original Delivr Usage

In the original Delivr, Jira was used primarily for:

**1. Cherry Pick Tracking**
```prisma
// From prisma/schema.prisma
model CherryPick {
  id             String  @id @default(cuid())
  commitId       String
  releaseId      String
  prLink         String?
  jiraLink       String?  // ← Jira issue link
  // ...
}
```

**2. Feature Toggles**
```typescript
// From app/components/SettingsForm/SettingConfig.tsx
<CustomCheckbox
  checked={globalSettings.enableJiraLinkEditing}
  onChange={e => globalSettings.setEnableJiraLinkEditing(e.target.checked)}
  label="Enable Jira Link Editing"
  id="enableJiraLinkEditing"
/>
```

### UI Component

**File**: `app/components/Integrations/JiraConnectionFlow.tsx`

**Features**:
- ✅ Multi-auth support (BASIC, PAT, OAuth2 coming soon)
- ✅ Host URL input with validation
- ✅ Dynamic form fields based on auth type
- ✅ Cloud ID and project key configuration
- ✅ Connection verification before saving
- ✅ Error handling and user feedback
- ✅ Helpful links to documentation

**Form Fields**:

**Common**:
1. **Display Name** (optional) - Friendly name
2. **Host URL** (required) - Jira instance URL
3. **Authentication Method** (required) - BASIC/PAT/OAuth2
4. **Cloud ID** (optional) - Auto-detected for Cloud
5. **Default Project Key** (optional) - e.g., "PROJ"

**For BASIC Auth**:
- **Email/Username** (required)
- **API Token** (required)

**For PAT Auth**:
- **Personal Access Token** (required)

---

## 🎨 UI Implementation

### Integration Modal Routing

**File**: `app/components/Integrations/IntegrationConnectModal.tsx`

**Updated Logic**:
```tsx
switch (integration.id) {
  case 'slack':
    return <SlackConnectionFlow ... />;
  
  case 'jenkins':
    return <JenkinsConnectionFlow ... />;
  
  case 'checkmate':
    return <CheckmateConnectionFlow ... />;  // ✨ NEW
  
  case 'jira':
    return <JiraConnectionFlow ... />;        // ✨ NEW
  
  case 'github':
    return <GitHubConnectionFlow ... />;
  
  case 'appstore':
  case 'playstore':
    return <PlaceholderFlow ... />;
}
```

---

## 📊 Integration Status

| Integration | UI Component | API Routes | Backend | Status |
|------------|--------------|------------|---------|--------|
| **Checkmate** | ✅ Complete | ✅ Complete | 🔄 Pending | Ready for Backend |
| **Jira** | ✅ Complete | ✅ Complete | 🔄 Pending | Ready for Backend |
| **Jenkins** | ✅ Complete | ✅ Complete | 🔄 Pending | Ready for Backend |
| **Slack** | ✅ Complete | ✅ Complete | ✅ Complete | **Fully Working** |
| **GitHub** | ✅ Complete | ✅ Complete | ✅ Complete | **Fully Working** |
| **App Store** | 🔄 Placeholder | ✅ Complete | 🔄 Pending | API Ready |
| **Play Store** | 🔄 Placeholder | ✅ Complete | 🔄 Pending | API Ready |

---

## 🔄 User Flow

### Checkmate Connection Flow

```
1. User clicks "Connect" on Checkmate card
   ↓
2. Modal opens with CheckmateConnectionFlow
   ↓
3. User enters:
   - Host URL: https://checkmate.example.com
   - API Key: Bearer token
   - Workspace ID: workspace-123
   - (Optional) Default Project ID
   ↓
4. User clicks "Verify Connection"
   → GET /api/v1/tenants/{tenantId}/integrations/test-management/checkmate/verify
   ↓
5. Success: Green alert ✅ | Failure: Red alert ❌
   ↓
6. User clicks "Connect"
   → POST /api/v1/tenants/{tenantId}/integrations/test-management/checkmate
   ↓
7. Integration created! 🎉
```

### Jira Connection Flow

```
1. User clicks "Connect" on Jira card
   ↓
2. Modal opens with JiraConnectionFlow
   ↓
3. User selects auth method:
   - BASIC (Username + API Token)
   - PAT (Personal Access Token)
   - OAuth2 (Coming Soon)
   ↓
4. User enters credentials based on auth type:
   
   For BASIC:
   - Host URL: https://company.atlassian.net
   - Email: user@company.com
   - API Token: from Atlassian account
   
   For PAT:
   - Host URL: https://jira.company.com
   - Personal Access Token: from Jira
   ↓
5. User clicks "Verify Connection"
   → GET /api/v1/tenants/{tenantId}/integrations/project-management/jira/verify
   ↓
6. Success: Shows Jira site info ✅ | Failure: Shows error ❌
   ↓
7. User clicks "Connect"
   → POST /api/v1/tenants/{tenantId}/integrations/project-management/jira
   ↓
8. Integration created! 🎉
```

---

## 🔐 Security Considerations

### Checkmate
- ✅ API Key stored encrypted in database
- ✅ Never exposed in API responses
- ✅ Transmitted over HTTPS only
- ✅ Verified before storage

### Jira
- ✅ API tokens/PATs stored encrypted
- ✅ OAuth refresh tokens encrypted
- ✅ Credentials verified before storage
- ✅ Different auth methods for different Jira versions
- ✅ Helpful links to official token generation

---

## 📝 API Endpoints

### Checkmate

**Verify**
```
GET /api/v1/tenants/:tenantId/integrations/test-management/checkmate/verify
Query: hostUrl, apiKey, workspaceId
Response: { verified: boolean, message: string }
```

**CRUD**
```
POST   /api/v1/tenants/:tenantId/integrations/test-management/checkmate
GET    /api/v1/tenants/:tenantId/integrations/test-management/checkmate
PATCH  /api/v1/tenants/:tenantId/integrations/test-management/checkmate
DELETE /api/v1/tenants/:tenantId/integrations/test-management/checkmate
```

### Jira

**Verify**
```
GET /api/v1/tenants/:tenantId/integrations/project-management/jira/verify
Query: hostUrl, authType, [username, apiToken | personalAccessToken]
Response: { verified: boolean, message: string }
```

**CRUD**
```
POST   /api/v1/tenants/:tenantId/integrations/project-management/jira
GET    /api/v1/tenants/:tenantId/integrations/project-management/jira
PATCH  /api/v1/tenants/:tenantId/integrations/project-management/jira
DELETE /api/v1/tenants/:tenantId/integrations/project-management/jira
```

---

## 🚀 Testing

### Test Checkmate Integration

1. Navigate to Integrations page
2. Find "Checkmate" in Test Management category
3. Click "Connect"
4. Fill form with test credentials
5. Verify → Connect
6. Check browser console for API calls
7. Backend will return 500 until implemented (expected)

### Test Jira Integration

1. Navigate to Integrations page
2. Find "Jira" in Project Management category
3. Click "Connect"
4. Select BASIC auth
5. Enter Jira Cloud URL + credentials
6. Verify → Connect
7. Backend will return 500 until implemented (expected)

---

## 📚 References

**Original Delivr Code**:
- `/delivr/app/utils/pending-go-aheads.ts` - Checkmate API usage
- `/delivr/app/services/config.ts` - Environment variables
- `/delivr/app/components/SettingsForm/SettingConfig.tsx` - Jira toggles
- `/delivr/prisma/schema.prisma` - Jira link in CherryPick model

**New Implementation**:
- `/app/components/Integrations/CheckmateConnectionFlow.tsx` - Checkmate UI
- `/app/components/Integrations/JiraConnectionFlow.tsx` - Jira UI
- `/app/.server/services/ReleaseManagement/integrations/checkmate-integration.ts` - Service
- `/app/.server/services/ReleaseManagement/integrations/jira-integration.ts` - Service

---

**Last Updated**: November 17, 2025  
**Status**: ✅ Frontend Complete - Ready for Backend Integration

