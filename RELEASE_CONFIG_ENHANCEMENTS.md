# Release Configuration Enhancements

## Overview

This document describes the recent enhancements to the release configuration creation flow, specifically:

1. **Enhanced Slack Communication Configuration** - Support for global and stage-wise channel configuration
2. **Enhanced Checkmate Integration** - Platform-specific test management configuration with metadata API integration

---

## 1. Slack Communication Enhancement

### Features

#### Global vs Stage-wise Configuration

Users can now choose between two modes for Slack channel configuration:

**Global Mode:**
- Configure one set of channels for the entire release
- All stages use the same channels for notifications

**Stage-wise Mode:**
- Configure different channels for each release stage
- Supported stages:
  - Pre-Regression
  - Regression
  - TestFlight
  - Production

#### Channel Types

For each mode (global or stage), users can configure:
- **Releases Channel** - Release announcements and status updates
- **Builds Channel** - Build status and completion notifications
- **Regression Channel** - Regression test updates
- **Critical Alerts Channel** - Critical issues and urgent notifications

### Implementation

#### Type Definitions

```typescript
// app/types/release-config.ts

export type SlackChannelConfigMode = 'GLOBAL' | 'STAGE_WISE';

export interface SlackChannel {
  id: string;
  name: string;
}

export interface SlackChannelConfig {
  releases: string;
  builds: string;
  regression: string;
  critical: string;
}

export interface StageWiseSlackChannels {
  preRegression?: SlackChannelConfig;
  regression?: SlackChannelConfig;
  testflight?: SlackChannelConfig;
  production?: SlackChannelConfig;
}

export interface CommunicationConfig {
  slack?: {
    enabled: boolean;
    integrationId: string;
    mode: SlackChannelConfigMode;
    channels?: SlackChannelConfig; // For GLOBAL mode
    stageWiseChannels?: StageWiseSlackChannels; // For STAGE_WISE mode
  };
  email?: {
    enabled: boolean;
    notificationEmails: string[];
  };
}
```

#### API Route

**Fetch Slack Channels:**
```
GET /api/v1/integrations/:integrationId/channels
```

Returns list of available Slack channels for the selected integration.

#### Components

- **`SlackChannelConfigEnhanced`** - Main component for Slack configuration
  - Located: `app/components/ReleaseConfig/Communication/SlackChannelConfigEnhanced.tsx`
  - Features:
    - Integration selection
    - Automatic channel fetching
    - Mode selection (Global/Stage-wise)
    - Channel configuration UI

#### Usage Flow

1. User enables Slack integration in Communication step
2. Selects connected Slack workspace
3. System fetches available channels from Slack API
4. User chooses configuration mode (Global or Stage-wise)
5. User configures channels based on selected mode

---

## 2. Checkmate Integration Enhancement

### Features

#### Platform-specific Configuration

Users can now configure test management settings per platform:
- iOS App Store
- Android Play Store
- iOS TestFlight
- Android Internal Testing

#### Metadata-driven Configuration

For each platform, users can filter tests by:
- **Sections** - Organize tests by feature areas
- **Labels** - Tag tests with categories (e.g., Smoke, Regression)
- **Squads** - Assign tests to specific QA teams

#### Filter Types

- **AND** - All filters must match (strict filtering)
- **OR** - Any filter matches (flexible filtering)

### Implementation

#### Type Definitions

```typescript
// app/types/release-config.ts

export interface CheckmatePlatformConfiguration {
  platform: 'IOS_APP_STORE' | 'ANDROID_PLAY_STORE' | 'IOS_TESTFLIGHT' | 'ANDROID_INTERNAL_TESTING';
  sectionIds?: number[];
  labelIds?: number[];
  squadIds?: number[];
}

export interface CheckmateSettings {
  type: 'CHECKMATE';
  workspaceId: string;
  projectId: number;
  platformConfigurations: CheckmatePlatformConfiguration[];
  autoCreateRuns: boolean;
  runNameTemplate?: string;
  passThresholdPercent: number; // 0-100
  filterType: 'AND' | 'OR';
  rules: CheckmateRules;
}
```

#### API Routes

**Fetch Projects:**
```
GET /api/v1/integrations/:integrationId/metadata/projects
```

**Fetch Sections:**
```
GET /api/v1/integrations/:integrationId/metadata/sections?projectId=456
```

**Fetch Labels:**
```
GET /api/v1/integrations/:integrationId/metadata/labels?projectId=456
```

**Fetch Squads:**
```
GET /api/v1/integrations/:integrationId/metadata/squads?projectId=456
```

#### Components

- **`CheckmateConfigFormEnhanced`** - Enhanced Checkmate configuration form
  - Located: `app/components/ReleaseConfig/TestManagement/CheckmateConfigFormEnhanced.tsx`
  - Features:
    - Integration and project selection
    - Automatic metadata fetching
    - Platform configuration management
    - Validation rules configuration

#### Usage Flow

1. User enables test management in release config
2. Selects Checkmate as provider
3. Chooses Checkmate integration
4. Selects project from dropdown
5. System fetches sections, labels, and squads for that project
6. User adds platform configurations
7. For each platform:
   - Select platform type
   - Choose sections (optional, multi-select)
   - Choose labels (optional, multi-select)
   - Choose squads (optional, multi-select)
8. Configure test settings:
   - Pass threshold percentage
   - Filter type (AND/OR)
   - Auto-create test runs
9. Configure validation rules:
   - Max failed tests
   - Max untested cases
   - Require all platforms
   - Allow override

---

## API Contract

### Backend API Requirements

The frontend expects the following API endpoints to be implemented on the backend:

#### 1. Slack Channels API

```
GET /api/v1/integrations/:integrationId/channels

Response:
{
  "success": true,
  "data": [
    {
      "id": "C1234567890",
      "name": "general"
    },
    {
      "id": "C0987654321",
      "name": "releases"
    }
  ]
}
```

#### 2. Checkmate Projects API

```
GET /api/v1/integrations/:integrationId/metadata/projects

Response:
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 456,
        "name": "Mobile App Testing",
        "description": "Test cases for mobile apps"
      }
    ]
  }
}
```

#### 3. Checkmate Sections API

```
GET /api/v1/integrations/:integrationId/metadata/sections?projectId=456

Response:
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 101,
        "name": "Login Tests",
        "projectId": 456
      }
    ]
  }
}
```

#### 4. Checkmate Labels API

```
GET /api/v1/integrations/:integrationId/metadata/labels?projectId=456

Response:
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 201,
        "name": "Smoke",
        "projectId": 456
      }
    ]
  }
}
```

#### 5. Checkmate Squads API

```
GET /api/v1/integrations/:integrationId/metadata/squads?projectId=456

Response:
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 301,
        "name": "QA Team Alpha",
        "projectId": 456
      }
    ]
  }
}
```

---

## Files Created/Modified

### New Files

1. **API Routes**
   - `app/routes/api.v1.integrations.$integrationId.channels.ts`
   - `app/routes/api.v1.integrations.$integrationId.metadata.projects.ts`
   - `app/routes/api.v1.integrations.$integrationId.metadata.sections.ts`
   - `app/routes/api.v1.integrations.$integrationId.metadata.labels.ts`
   - `app/routes/api.v1.integrations.$integrationId.metadata.squads.ts`

2. **Components**
   - `app/components/ReleaseConfig/Communication/SlackChannelConfigEnhanced.tsx`
   - `app/components/ReleaseConfig/TestManagement/CheckmateConfigFormEnhanced.tsx`

### Modified Files

1. **Types**
   - `app/types/release-config.ts` - Updated CommunicationConfig and CheckmateSettings

2. **Components**
   - `app/components/ReleaseConfig/Communication/CommunicationConfig.tsx` - Uses new SlackChannelConfigEnhanced
   - `app/components/ReleaseConfig/TestManagement/TestManagementSelector.tsx` - Uses new CheckmateConfigFormEnhanced

3. **Utils**
   - `app/utils/default-config.ts` - Updated default configuration structure

---

## Testing Checklist

### Slack Configuration Testing

- [ ] Can enable Slack integration
- [ ] Can select Slack workspace
- [ ] Channels load successfully
- [ ] Can switch between Global and Stage-wise modes
- [ ] Global mode: Can configure all 4 channel types
- [ ] Stage-wise mode: Can configure channels for each stage
- [ ] Configuration saves correctly
- [ ] Configuration loads correctly when editing

### Checkmate Configuration Testing

- [ ] Can enable test management
- [ ] Can select Checkmate provider
- [ ] Can select Checkmate integration
- [ ] Projects load successfully
- [ ] Can select a project
- [ ] Sections, labels, and squads load for selected project
- [ ] Can add multiple platform configurations
- [ ] Can remove platform configurations
- [ ] Can configure sections/labels/squads per platform
- [ ] Can set pass threshold percentage
- [ ] Can select filter type (AND/OR)
- [ ] Can configure validation rules
- [ ] Configuration saves correctly
- [ ] Configuration loads correctly when editing

---

## Migration Notes

### Existing Configurations

Existing release configurations with the old Slack structure need to be migrated:

**Old Structure:**
```typescript
{
  slack: {
    enabled: true,
    integrationId: "slack-123",
    channels: {
      releases: "#releases",
      builds: "#builds",
      regression: "#regression",
      critical: "#critical"
    }
  }
}
```

**New Structure:**
```typescript
{
  slack: {
    enabled: true,
    integrationId: "slack-123",
    mode: "GLOBAL",
    channels: {
      releases: "C1234567890", // Now uses channel IDs
      builds: "C0987654321",
      regression: "C1122334455",
      critical: "C9988776655"
    }
  }
}
```

### Checkmate Configurations

Existing Checkmate configurations need to be migrated:

**Old Structure:**
```typescript
{
  type: 'CHECKMATE',
  workspaceId: "workspace-123",
  projectId: "project-456",
  autoCreateRuns: true,
  rules: { ... }
}
```

**New Structure:**
```typescript
{
  type: 'CHECKMATE',
  workspaceId: "workspace-123",
  projectId: 456, // Now a number
  platformConfigurations: [
    {
      platform: "IOS_APP_STORE",
      sectionIds: [101, 102],
      labelIds: [201],
      squadIds: [301]
    }
  ],
  autoCreateRuns: true,
  passThresholdPercent: 95.0,
  filterType: "AND",
  rules: { ... }
}
```

---

## Future Enhancements

### Slack
- Support for custom channel mappings per notification type
- Support for Slack threads for related notifications
- Support for Slack user mentions
- Support for rich message formatting

### Checkmate
- Support for test plan templates
- Support for test case prioritization
- Support for automatic test assignment
- Integration with CI/CD for automatic test triggering
- Real-time test execution tracking

---

## Support

For questions or issues, please refer to:
- [API Response Format](./API_RESPONSE_FORMAT.md)
- [Data Flow Diagram](./DATA_FLOW_DIAGRAM.md)
- [Implementation Usage](./IMPLEMENTATION_USAGE.md)

