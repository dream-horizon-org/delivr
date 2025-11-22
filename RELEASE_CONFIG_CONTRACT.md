# Release Configuration Contract - Final Payload Structure

## Complete TypeScript Interface

```typescript
interface ReleaseConfiguration {
  // Metadata
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'EMERGENCY';
  isDefault: boolean;
  baseBranch?: string;
  
  // Platforms
  platforms: ('ANDROID' | 'IOS')[];
  defaultTargets: ('WEB' | 'PLAY_STORE' | 'APP_STORE')[];
  
  // ✨ NEW: Build Upload Method
  buildUploadStep: 'MANUAL' | 'CI_CD';
  
  // Build Pipelines (optional - only when buildUploadStep = 'CI_CD')
  buildPipelines: BuildPipelineJob[];
  
  // Test Management
  testManagement: {
    enabled: boolean;
    provider: 'checkmate' | 'testrail' | 'zephyr' | 'none';
    integrationId?: string;
    projectId?: string;
    providerConfig?: CheckmateSettings | TestRailSettings;
  };
  
  // ✨ UPDATED: JIRA Project Management (Platform-Level)
  jiraProject: {
    enabled: boolean;
    integrationId: string;
    pmConfigId?: string; // Backend PM config ID
    platformConfigurations: Array<{
      platform: 'WEB' | 'IOS' | 'ANDROID';
      projectKey: string;
      issueType?: string;
      completedStatus: string;
      priority?: string;
    }>;
    createReleaseTicket?: boolean;
    linkBuildsToIssues?: boolean;
  };
  
  // Scheduling
  scheduling: {
    releaseFrequency: 'WEEKLY' | 'BIWEEKLY' | 'TRIWEEKLY' | 'MONTHLY' | 'CUSTOM';
    customFrequencyDays?: number;
    firstReleaseKickoffDate: string; // ISO date
    initialVersions: Partial<Record<'ANDROID' | 'IOS', string>>;
    kickoffTime: string; // HH:MM
    kickoffReminderEnabled: boolean;
    kickoffReminderTime: string; // HH:MM
    targetReleaseTime: string; // HH:MM
    targetReleaseDateOffsetFromKickoff: number;
    workingDays: number[]; // 1-7 (Mon-Sun)
    timezone: string;
    regressionSlots: RegressionSlot[];
  };
  
  // Communication
  communication: {
    slack?: {
      enabled: boolean;
      integrationId: string;
      channelData: {
        releases: Array<{ id: string; name: string }>;
        builds: Array<{ id: string; name: string }>;
        regression: Array<{ id: string; name: string }>;
        critical: Array<{ id: string; name: string }>;
      };
    };
    email?: {
      enabled: boolean;
      notificationEmails: string[];
    };
  };
  
  // Status
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}
```

---

## Example Payload - Complete Configuration

```json
{
  "id": "config-abc-123",
  "organizationId": "org-xyz-789",
  "name": "Standard Mobile Release",
  "description": "Configuration for Android and iOS planned releases",
  "releaseType": "PLANNED",
  "isDefault": true,
  "baseBranch": "main",
  
  "platforms": ["ANDROID", "IOS"],
  "defaultTargets": ["PLAY_STORE", "APP_STORE"],
  
  "buildUploadStep": "MANUAL",
  
  "buildPipelines": [],
  
  "testManagement": {
    "enabled": true,
    "provider": "checkmate",
    "integrationId": "checkmate-int-456",
    "projectId": "12345",
    "providerConfig": {
      "type": "checkmate",
      "integrationId": "checkmate-int-456",
      "projectId": 12345,
      "platformConfigurations": [
        {
          "platform": "ANDROID",
          "sectionIds": [101, 102],
          "labelIds": [1, 2],
          "squadIds": [10]
        },
        {
          "platform": "IOS",
          "sectionIds": [201, 202],
          "labelIds": [3, 4],
          "squadIds": [20]
        }
      ],
      "autoCreateRuns": true,
      "runNameTemplate": "v{{version}} - {{platform}} - {{date}}",
      "passThresholdPercent": 80,
      "filterType": "AND"
    }
  },
  
  "jiraProject": {
    "enabled": true,
    "integrationId": "jira-int-789",
    "pmConfigId": "pm-config-111",
    "platformConfigurations": [
      {
        "platform": "ANDROID",
        "projectKey": "APP",
        "issueType": "Epic",
        "completedStatus": "Released",
        "priority": "High"
      },
      {
        "platform": "IOS",
        "projectKey": "APP",
        "issueType": "Epic",
        "completedStatus": "Released",
        "priority": "High"
      }
    ],
    "createReleaseTicket": true,
    "linkBuildsToIssues": true
  },
  
  "scheduling": {
    "releaseFrequency": "WEEKLY",
    "firstReleaseKickoffDate": "2025-12-01",
    "initialVersions": {
      "ANDROID": "1.0.0",
      "IOS": "1.0.0"
    },
    "kickoffTime": "10:00",
    "kickoffReminderEnabled": true,
    "kickoffReminderTime": "09:00",
    "targetReleaseTime": "18:00",
    "targetReleaseDateOffsetFromKickoff": 5,
    "workingDays": [1, 2, 3, 4, 5],
    "timezone": "Asia/Kolkata",
    "regressionSlots": [
      {
        "id": "slot-1",
        "name": "Day 2 Regression",
        "regressionSlotOffsetFromKickoff": 2,
        "time": "14:00",
        "config": {
          "regressionBuilds": true
        }
      },
      {
        "id": "slot-2",
        "name": "Day 4 Regression",
        "regressionSlotOffsetFromKickoff": 4,
        "time": "14:00",
        "config": {
          "regressionBuilds": true
        }
      }
    ]
  },
  
  "communication": {
    "slack": {
      "enabled": true,
      "integrationId": "slack-int-321",
      "channelData": {
        "releases": [
          { "id": "C01234ABCDE", "name": "releases" },
          { "id": "C11111AAAAA", "name": "mobile-releases" }
        ],
        "builds": [
          { "id": "C22222BBBBB", "name": "builds" }
        ],
        "regression": [
          { "id": "C33333CCCCC", "name": "qa-regression" }
        ],
        "critical": [
          { "id": "C44444DDDDD", "name": "critical-alerts" }
        ]
      }
    },
    "email": {
      "enabled": true,
      "notificationEmails": ["team@example.com", "qa@example.com"]
    }
  },
  
  "status": "ACTIVE",
  "createdAt": "2025-11-21T10:00:00Z",
  "updatedAt": "2025-11-21T10:00:00Z"
}
```

---

## Key Changes from Previous Version

### 1. ✨ NEW: `buildUploadStep` Field
```typescript
buildUploadStep: 'MANUAL' | 'CI_CD'
```
- **Default**: `'MANUAL'`
- **Purpose**: Determines how builds are uploaded
- **MANUAL**: Builds uploaded manually through dashboard
- **CI_CD**: Builds triggered automatically via pipelines (future)

### 2. ✨ UPDATED: JIRA Platform-Level Configuration
```typescript
jiraProject: {
  platformConfigurations: Array<{
    platform: 'WEB' | 'IOS' | 'ANDROID';
    projectKey: string;
    issueType?: string;
    completedStatus: string;
    priority?: string;
  }>;
}
```
- **Before**: Single `projectKey` for all platforms
- **After**: Array of platform-specific configurations
- **Benefit**: Each platform can have different JIRA projects

### 3. ✨ REMOVED: Labels and Assignee
- `labels?: string[]` - Removed from JIRA config
- `assignee?: string` - Removed from JIRA config
- **Reason**: Simplified UI, focus on core fields

### 4. Optional Fields Clarified
- `buildPipelines`: Empty array when `buildUploadStep = 'MANUAL'`
- `pmConfigId`: Set after backend creates PM configuration
- `description`: Optional for all configs

---

## Validation Rules

### Required Fields
- ✅ `name` - Must not be empty
- ✅ `platforms` - At least one platform
- ✅ `defaultTargets` - At least one target
- ✅ `buildUploadStep` - Must be 'MANUAL' or 'CI_CD'

### JIRA Configuration (if enabled)
- ✅ `integrationId` - Must reference valid JIRA integration
- ✅ `platformConfigurations` - At least one platform config
- ✅ Each platform config must have:
  - `projectKey` - Uppercase alphanumeric (e.g., "APP", "FE")
  - `completedStatus` - Required (e.g., "Done", "Released")

### Test Management (if enabled)
- ✅ `integrationId` - Must reference valid integration
- ✅ `projectId` - Required for Checkmate
- ✅ `platformConfigurations` - At least one platform

### Scheduling (optional but recommended)
- ✅ `firstReleaseKickoffDate` - Valid ISO date
- ✅ `kickoffTime` <= `targetReleaseTime`
- ✅ `kickoffReminderTime` <= `kickoffTime`
- ✅ `workingDays` - At least one day (1-7)

---

## API Endpoints

### Create Configuration
```
POST /api/v1/tenants/{tenantId}/release-config
Content-Type: application/json

Body: { config: ReleaseConfiguration }
```

### Update Configuration
```
PUT /api/v1/tenants/{tenantId}/release-config
Content-Type: application/json

Body: { config: ReleaseConfiguration }
```

### Get Configuration
```
GET /api/v1/tenants/{tenantId}/release-config?configId={configId}
```

### Create JIRA PM Config (Auto-called during release config creation)
```
POST /api/v1/tenants/{tenantId}/integrations/project-management/config
Content-Type: application/json

Body: {
  projectId: string,
  integrationId: string,
  name: string,
  platformConfigurations: Array<{
    platform: 'WEB' | 'IOS' | 'ANDROID',
    parameters: {
      projectKey: string,
      issueType?: string,
      completedStatus: string,
      priority?: string
    }
  }>
}
```

---

## Workflow Summary

1. **User fills wizard** → Frontend builds `ReleaseConfiguration` object
2. **JIRA enabled?** → Backend creates PM config, returns `pmConfigId`
3. **PM config ID added** → `jiraProject.pmConfigId` stored in release config
4. **Release config saved** → Complete config stored in database

---

**Status**: ✅ **Production Ready**
**Version**: 2.0 (with Manual Upload & Platform-Level JIRA)
**Last Updated**: November 21, 2025

