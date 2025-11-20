# 📡 Backend API Response Format

## 📐 Architecture Philosophy

**Backend = Source of Truth (Minimal)**
- Backend only returns: `id`, `name`, and essential functional data (e.g., `requiresOAuth`, `applicableTargets`)
- Backend controls **what's available/enabled** for each tenant

**Frontend = UI Metadata (Rich)**
- Frontend stores: `description`, `icon`, `color`, and all UI-related metadata in `app/constants/ui-metadata.ts`
- Frontend can have **all possible options** defined (e.g., 15 platform enums)
- Only options returned by the backend API are actually available to users

**Why This Approach?**
- ✅ Backend API is lightweight and focused on business logic
- ✅ UI changes (icons, descriptions, colors) don't require backend changes or deployments
- ✅ Backend controls availability, frontend controls presentation
- ✅ Clear separation of concerns
- ✅ Frontend can prepare for future features (UI metadata for coming soon features)

**Example:**
```typescript
// Backend returns (minimal):
{ "id": "github", "name": "GitHub", "requiresOAuth": true }

// Frontend enriches with:
{ 
  "id": "github", 
  "name": "GitHub", 
  "requiresOAuth": true,
  "description": "Connect your GitHub repository...",  // From frontend
  "icon": "🐙",                                        // From frontend
  "comingSoon": false                                  // From frontend
}
```

---

## Endpoint 1: System Metadata (New)

**GET** `/api/v1/system/metadata`

Returns all available options in the system (global, not tenant-specific)

```json
{
  "organisation": {
    "id": "tenant-123",
    "displayName": "Acme Corp",
    "releaseManagement": {
      "setupComplete": true,
      "setupSteps": { ... },
      "integrations": [ ... ],
      
      // ===== ADD THIS NEW FIELD =====
      "config": {
    "integrations": {
      "SOURCE_CONTROL": [
        {
          "id": "github",
          "name": "GitHub",
          "requiresOAuth": true
        },
        {
          "id": "gitlab",
          "name": "GitLab",
          "requiresOAuth": true
        }
      ],
      "COMMUNICATION": [
        {
          "id": "slack",
          "name": "Slack",
          "requiresOAuth": true
        }
      ],
      "CI_CD": [
        {
          "id": "jenkins",
          "name": "Jenkins",
          "requiresOAuth": false
        },
        {
          "id": "github-actions",
          "name": "GitHub Actions",
          "requiresOAuth": false
        }
      ],
      "TEST_MANAGEMENT": [
        {
          "id": "checkmate",
          "name": "Checkmate",
          "requiresOAuth": false
        },
        {
          "id": "testrail",
          "name": "TestRail",
          "requiresOAuth": false
        }
      ],
      "PROJECT_MANAGEMENT": [
        {
          "id": "jira",
          "name": "Jira",
          "requiresOAuth": true
        }
      ],
      "APP_DISTRIBUTION": []
    },
    
    "platforms": [
      {
        "id": "ANDROID",
        "name": "Android",
        "applicableTargets": ["PLAY_STORE", "WEB"]
      },
      {
        "id": "IOS",
        "name": "iOS",
        "applicableTargets": ["APP_STORE"]
      }
    ],
    
    "targets": [
      {
        "id": "APP_STORE",
        "name": "Apple App Store"
      },
      {
        "id": "PLAY_STORE",
        "name": "Google Play Store"
      },
      {
        "id": "WEB",
        "name": "Web"
      }
    ],
    
    "releaseTypes": [
      {
        "id": "PLANNED",
        "name": "Planned Release"
      },
      {
        "id": "HOTFIX",
        "name": "Hotfix Release"
      },
      {
        "id": "EMERGENCY",
        "name": "Emergency Release"
      }
    ],
    
    "releaseStages": [
      {
        "id": "PRE_KICKOFF",
        "name": "Pre-Kickoff",
        "order": 1
      },
      {
        "id": "KICKOFF",
        "name": "Kickoff",
        "order": 2
      },
      {
        "id": "REGRESSION",
        "name": "Regression Testing",
        "order": 3
      },
      {
        "id": "READY_FOR_RELEASE",
        "name": "Ready for Release",
        "order": 4
      },
      {
        "id": "RELEASED",
        "name": "Released",
        "order": 5
      }
    ],
    
    "releaseStatuses": [
      {
        "id": "KICKOFF_PENDING",
        "name": "Kickoff Pending",
        "stage": "PRE_KICKOFF"
      },
      {
        "id": "PENDING",
        "name": "Pending",
        "stage": "PRE_KICKOFF"
      },
      {
        "id": "STARTED",
        "name": "Started",
        "stage": "KICKOFF"
      },
      {
        "id": "REGRESSION_IN_PROGRESS",
        "name": "Regression In Progress",
        "stage": "REGRESSION"
      },
      {
        "id": "BUILD_SUBMITTED",
        "name": "Build Submitted",
        "stage": "READY_FOR_RELEASE"
      },
      {
        "id": "RELEASED",
        "name": "Released",
        "stage": "RELEASED"
      },
      {
        "id": "CANCELLED",
        "name": "Cancelled",
        "stage": null
      },
      {
        "id": "ARCHIVED",
        "name": "Archived",
        "stage": "RELEASED"
      }
    ],
    
    "buildEnvironments": [
      {
        "id": "PRE_REGRESSION",
        "name": "Pre-Regression",
        "order": 1,
        "applicablePlatforms": ["ANDROID", "IOS"]
      },
      {
        "id": "REGRESSION",
        "name": "Regression",
        "order": 2,
        "applicablePlatforms": ["ANDROID", "IOS"]
      },
      {
        "id": "TESTFLIGHT",
        "name": "TestFlight",
        "order": 3,
        "applicablePlatforms": ["IOS"]
      },
      {
        "id": "PRODUCTION",
        "name": "Production",
        "order": 4,
        "applicablePlatforms": ["ANDROID", "IOS"]
      }
    ]
  },
  
  "system": {
    "version": "2.0.0",
    "features": {
      "releaseManagement": true,
      "codepush": true,
      "analytics": false
    }
  }
}
```

---

## Endpoint 2: Tenant Configuration (Extend Existing Endpoint)

**GET** `/api/v1/tenants/{tenantId}`

**⚠️ THIS ENDPOINT ALREADY EXISTS** in `delivr-server-ota-managed/api/script/routes/management.ts` (line 308)

Currently returns:
```json
{
  "organisation": {
    "id": "...",
    "displayName": "...",
    "releaseManagement": {
      "setupComplete": true,
      "setupSteps": { ... },
      "integrations": [ ... ]
    }
  }
}
```

### What to Add

Extend the existing response by adding a **`config`** field inside `releaseManagement`:

```json
{
  "organisation": {
    "id": "tenant-123",
    "displayName": "ACME Corp",
    
    "releaseManagement": {
      "setupComplete": true,
      "setupSteps": { ... },
      "integrations": [ ... ], // Keep existing integrations array
      
      // ===== ADD THIS NEW FIELD =====
      "config": {
    "connectedIntegrations": {
      "SOURCE_CONTROL": [
        {
          "id": "integration-1",
          "providerId": "github",
          "name": "Main Repository",
          "status": "CONNECTED",
          "config": {
            "owner": "acme-corp",
            "repo": "mobile-app",
            "defaultBranch": "main"
          },
          "verificationStatus": "VALID",
          "connectedAt": "2024-01-15T10:00:00Z",
          "connectedBy": "user@acme.com"
        }
      ],
      "COMMUNICATION": [
        {
          "id": "integration-2",
          "providerId": "slack",
          "name": "Engineering Workspace",
          "status": "CONNECTED",
          "config": {
            "workspaceId": "T123456",
            "workspaceName": "ACME Engineering",
            "channels": {
              "releases": "C123456",
              "builds": "C234567"
            }
          },
          "verificationStatus": "VALID",
          "connectedAt": "2024-01-16T14:00:00Z"
        }
      ],
      "CI_CD": [
        {
          "id": "integration-3",
          "providerId": "jenkins",
          "name": "Production Jenkins",
          "status": "CONNECTED",
          "config": {
            "hostUrl": "https://jenkins.acme.com",
            "username": "delivr-bot"
          },
          "verificationStatus": "VALID"
        }
      ],
      "TEST_MANAGEMENT": [
        {
          "id": "integration-4",
          "providerId": "checkmate",
          "name": "QA Checkmate",
          "status": "CONNECTED",
          "config": {
            "workspaceId": "workspace-123",
            "projectId": "project-456"
          },
          "verificationStatus": "VALID"
        }
      ],
      "PROJECT_MANAGEMENT": [],
      "APP_DISTRIBUTION": []
    },
    
    "enabledPlatforms": ["ANDROID", "IOS"],
    
    "enabledTargets": ["APP_STORE", "PLAY_STORE", "WEB"],
    
    "allowedReleaseTypes": ["PLANNED", "HOTFIX"],
    
    "customSettings": {
      "defaultKickoffLeadDays": 2,
      "workingDays": [1, 2, 3, 4, 5],
      "timezone": "Asia/Kolkata",
        "versioningScheme": "SEMVER"
      }
    }
      }
    }
  }
}
```

**Frontend Extraction:**
The frontend `useTenantConfig` hook will extract `organisation.releaseManagement.config` from this response.

---

## Key Differences from Original

### 1. ✅ Test Management → Part of Integrations
- **Before:** Separate `testManagementProviders` array
- **Now:** Under `integrations.TEST_MANAGEMENT`

### 2. ✅ Build Providers → CI/CD Integrations
- **Before:** Separate `buildProviders` array
- **Now:** Under `integrations.CI_CD` (Jenkins, GitHub Actions, etc.)

### 3. ✅ Targets → Flat Array
- **Before:** `targets: { "ANDROID": [...], "IOS": [...] }`
- **Now:** `targets: [...]` (flat list)

### 4. ✅ Platform-Target Mapping
- **Added:** `platform.applicableTargets` field
- **Example:** `ANDROID` platform has `applicableTargets: ["PLAY_STORE", "WEB"]`

### 5. ✅ Tenant Targets → Flat Array
- **Before:** `enabledTargets: { "ANDROID": [...], "IOS": [...] }`
- **Now:** `enabledTargets: ["APP_STORE", "PLAY_STORE", "WEB"]`

---

## Usage Examples

### Get CI/CD Integrations (Build Providers)

```typescript
const cicdProviders = useConfig().getAvailableIntegrations('CI_CD');
// Returns: Jenkins, GitHub Actions, etc.
```

### Get Test Management Integrations

```typescript
const testManagement = useConfig().getAvailableIntegrations('TEST_MANAGEMENT');
// Returns: Checkmate, TestRail, etc.
```

### Get Targets for a Platform

```typescript
const androidTargets = useConfig().getAvailableTargets('ANDROID');
// Returns: [PLAY_STORE, WEB] (filtered by platform.applicableTargets)

const allTargets = useConfig().getAvailableTargets();
// Returns: [APP_STORE, PLAY_STORE, WEB] (all targets)
```

### Check if Target is Enabled

```typescript
const isPlayStoreEnabled = useConfig().isTargetEnabled('PLAY_STORE');
// Returns: true/false
```

---

## Implementation Notes

### Backend Caching

```typescript
// System metadata - cache for 1 hour (changes rarely)
const METADATA_CACHE_TTL = 3600;

// Tenant config - cache for 5 minutes (can change more often)
const TENANT_CONFIG_CACHE_TTL = 300;
```

### Frontend Caching (React Query)

```typescript
// Already configured in hooks:
useSystemMetadata() - staleTime: 1 hour
useTenantConfig() - staleTime: 5 minutes
```

---

**Version:** 2.0 (Corrected Structure)
**Last Updated:** 2025-01-20

