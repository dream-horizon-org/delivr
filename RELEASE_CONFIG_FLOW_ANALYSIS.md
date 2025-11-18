# Release Configuration Flow Analysis

## Overview
This document provides a complete analysis of the Release Configuration flow in the delivr-web-panel-managed application, detailing what happens when a user submits configuration data.

---

## Architecture Components

### 1. Frontend Components
- **ConfigurationWizard** (`app/components/ReleaseConfig/Wizard/ConfigurationWizard.tsx`)
  - Main wizard orchestrator with 7 steps
  - Manages form state and validation
  - Auto-saves drafts to localStorage
  - Submits final configuration to API

### 2. Storage Layers
- **Client-side Draft Storage** (`app/utils/release-config-storage.ts`)
  - Uses browser localStorage for draft persistence
  - Validates configurations before submission
  - Manages temporary state during wizard flow

- **Server-side In-Memory Store** (`app/.server/stores/release-config-store.ts`)
  - Temporary storage using JavaScript Map
  - Thread-safe for concurrent requests
  - Persists until server restart (awaiting backend integration)

### 3. API Layer
- **BFF Route** (`app/routes/api.v1.tenants.$tenantId.release-config.tsx`)
  - Backend-for-frontend API layer
  - Handles CRUD operations
  - Will eventually proxy to delivr-server-ota

---

## Complete Data Flow: Configuration Submission

### Step 1: User Creates Configuration (Frontend)

```
ConfigurationWizard Component
├── Step 0: Basic Information
│   └── name, description, releaseType, isDefault
├── Step 1: Target Platforms
│   └── defaultTargets: [WEB, APP_STORE, PLAY_STORE]
├── Step 2: Build Pipelines
│   └── buildPipelines: [Jenkins/GitHub Actions configs]
├── Step 3: Test Management (Optional)
│   └── testManagement: { provider, settings }
├── Step 4: Scheduling
│   └── scheduling: { times, slots, working days }
├── Step 5: Communication (Optional)
│   └── communication: { slack, email }
└── Step 6: Review & Submit
```

**Auto-save behavior:**
- Every change triggers `useEffect` at line 135-137
- Calls `saveDraftConfig(organizationId, config)`
- Stores to localStorage key: `delivr_release_config_draft_{organizationId}`

### Step 2: Validation Before Submission

```typescript
// ConfigurationWizard.tsx:166-167
const validation = validateConfiguration(config);
return validation.isValid;
```

**Validation checks (release-config-storage.ts:309-346):**
1. ✓ Configuration name exists
2. ✓ At least one target platform selected
3. ✓ Build pipelines configured correctly
   - Android: Regression pipeline required
   - iOS: Regression + TestFlight required
4. ✓ Scheduling configured
   - Release time, kickoff time set
   - At least one working day
   - At least one regression slot
5. ✓ All pipeline provider configs complete

### Step 3: User Clicks "Finish" (Line 187-228)

```javascript
handleFinish() {
  // 1. Transform partial config to complete config
  const completeConfig: ReleaseConfiguration = {
    ...config,
    status: 'ACTIVE',  // Changed from 'DRAFT'
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // 2. Submit to API via fetch
  POST /api/v1/tenants/${organizationId}/release-config
  
  // 3. On success: clear draft from localStorage
  clearDraftConfig(organizationId);
  
  // 4. Navigate away or call parent callback
  await onSubmit(completeConfig);
}
```

### Step 4: API Route Receives Request (BFF Layer)

**File:** `app/routes/api.v1.tenants.$tenantId.release-config.tsx:98-123`

```typescript
POST /api/v1/tenants/:tenantId/release-config
├── Validate request body
│   ├── Check: name exists
│   ├── Check: defaultTargets exists
│   └── Check: buildPipelines exists
├── Ensure organizationId matches tenantId
├── Call createConfig(tenantId, config)
└── Return success response with configId
```

**Response format:**
```json
{
  "success": true,
  "configId": "config_1234567890_abc123",
  "configuration": { ...fullConfig },
  "message": "Configuration created successfully"
}
```

### Step 5: Server-side Store Persists Data

**File:** `app/.server/stores/release-config-store.ts:52-83`

```typescript
createConfig(tenantId, config) {
  // 1. Get or create tenant's config Map
  let orgConfigs = configStore.get(tenantId);
  if (!orgConfigs) {
    orgConfigs = new Map();
    configStore.set(tenantId, orgConfigs);
  }
  
  // 2. If isDefault=true, unset other defaults
  if (config.isDefault) {
    orgConfigs.forEach((c) => {
      if (c.isDefault) c.isDefault = false;
    });
  }
  
  // 3. Set timestamps
  config.createdAt = now;
  config.updatedAt = now;
  
  // 4. Store in Map: configStore[tenantId][configId] = config
  orgConfigs.set(config.id, config);
  
  return config;
}
```

**Data structure:**
```
configStore (Map)
└── tenantId: "org123" (Map)
    ├── "config_001" → ReleaseConfiguration
    ├── "config_002" → ReleaseConfiguration
    └── "config_003" → ReleaseConfiguration
```

### Step 6: Configuration Available for Use

The saved configuration is now available through:

1. **Settings Page** (`dashboard.$org.settings.release-config.tsx`)
   - Lists all configurations
   - Shows stats (total, active, draft, archived)
   - Allows edit, duplicate, archive, set default

2. **Release Creation** (`dashboard.$org.releases.create.tsx`)
   - Fetches active configurations
   - Auto-selects default configuration
   - Applies configuration to new releases

---

## Data Lifecycle

### Configuration States

```
DRAFT ──(submit)──> ACTIVE ──(archive)──> ARCHIVED
                      ↓
                  (edit/update)
                      ↓
                   ACTIVE
```

### Draft Management (Local Storage)

**Save draft:**
```typescript
saveDraftConfig(orgId, config)
└── localStorage["delivr_release_config_draft_org123"] = JSON.stringify(config)
```

**Load draft:**
```typescript
loadDraftConfig(orgId)
└── JSON.parse(localStorage["delivr_release_config_draft_org123"])
```

**Clear draft:**
```typescript
clearDraftConfig(orgId)
└── localStorage.removeItem("delivr_release_config_draft_org123")
```

---

## Complete Configuration Object Structure

```typescript
ReleaseConfiguration {
  id: "config_1700000000000_xyz789",
  organizationId: "org123",
  
  // Metadata
  name: "Standard Release Configuration",
  description: "Weekly planned releases",
  releaseType: "PLANNED",
  isDefault: true,
  status: "ACTIVE",
  
  // Platforms
  defaultTargets: ["WEB", "APP_STORE", "PLAY_STORE"],
  
  // Build Pipelines
  buildPipelines: [
    {
      id: "pipeline_1",
      name: "Android Regression",
      platform: "ANDROID",
      environment: "REGRESSION",
      provider: "JENKINS",
      enabled: true,
      providerConfig: {
        integrationId: "jenkins_001",
        jobUrl: "https://jenkins.example.com/job/android-regression",
        jobName: "android-regression",
        parameters: { branch: "main" }
      }
    },
    {
      id: "pipeline_2",
      name: "iOS TestFlight",
      platform: "IOS",
      environment: "TESTFLIGHT",
      provider: "GITHUB_ACTIONS",
      enabled: true,
      providerConfig: {
        integrationId: "github_001",
        workflowPath: ".github/workflows/ios-testflight.yml",
        parameters: { scheme: "Release" }
      }
    }
  ],
  
  // Test Management
  testManagement: {
    enabled: true,
    provider: "CHECKMATE",
    settings: {
      integrationId: "checkmate_001",
      workspaceId: "ws_123",
      autoCreateTestRuns: true
    }
  },
  
  // Scheduling
  scheduling: {
    releaseFrequency: "WEEKLY",
    defaultReleaseTime: "18:00",
    defaultKickoffTime: "10:00",
    kickoffLeadDays: 7,
    kickoffReminderEnabled: true,
    kickoffReminderTime: "09:00",
    kickoffReminderLeadDays: 1,
    workingDays: [1, 2, 3, 4, 5],
    timezone: "Asia/Kolkata",
    regressionSlots: [
      {
        id: "slot_1",
        name: "Morning Slot",
        startTime: "10:00",
        endTime: "14:00",
        maxConcurrent: 2
      }
    ]
  },
  
  // Communication
  communication: {
    slack: {
      enabled: true,
      integrationId: "slack_001",
      channels: ["#releases", "#qa-team"]
    },
    email: {
      enabled: true,
      notificationEmails: ["team@example.com"]
    }
  },
  
  // Timestamps
  createdAt: "2024-11-18T10:00:00.000Z",
  updatedAt: "2024-11-18T10:00:00.000Z"
}
```

---

## API Endpoints Summary

### GET `/api/v1/tenants/:tenantId/release-config`

**Query params:**
- `configId` - Get specific config
- `status` - Filter by ACTIVE, DRAFT, ARCHIVED

**Response:**
```json
{
  "success": true,
  "configurations": [...],
  "stats": {
    "total": 5,
    "active": 3,
    "draft": 1,
    "archived": 1,
    "hasDefault": true
  },
  "count": 5
}
```

### POST `/api/v1/tenants/:tenantId/release-config`

**Body:**
```json
{
  "config": { ...ReleaseConfiguration }
}
```

**Response:**
```json
{
  "success": true,
  "configId": "config_123",
  "configuration": { ...saved },
  "message": "Configuration created successfully"
}
```

### PUT `/api/v1/tenants/:tenantId/release-config`

**Body:**
```json
{
  "config": { 
    "id": "config_123",
    ...updates 
  }
}
```

**Response:**
```json
{
  "success": true,
  "configId": "config_123",
  "configuration": { ...updated },
  "message": "Configuration updated successfully"
}
```

### DELETE `/api/v1/tenants/:tenantId/release-config`

**Body:**
```json
{
  "configId": "config_123",
  "archive": true  // default: true (soft delete)
}
```

**Response:**
```json
{
  "success": true,
  "configuration": { ...archived },
  "message": "Configuration archived successfully"
}
```

---

## Integration Points

### How Configurations Are Used in Release Creation

**File:** `app/routes/dashboard.$org.releases.create.tsx:212-226`

```typescript
Release Creation Flow:
1. User selects configuration (or manual mode)
2. Configuration pre-populates:
   - releaseType
   - target platforms
   - build pipelines
   - test management settings
   - scheduling defaults
   - communication channels
3. User can customize any setting
4. Final release references configId
5. Backend applies merged configuration
```

---

## Future Backend Integration

**Current State:** In-memory Map (temporary)
**Future State:** PostgreSQL via delivr-server-ota

**Migration Plan:**
1. Keep API contract unchanged
2. Replace in-memory store with HTTP calls to delivr-server-ota
3. Add proper authentication/authorization
4. Add audit logging
5. Add configuration versioning

**Expected Backend Schema:**
```sql
release_configurations (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  status VARCHAR(20),
  is_default BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## Error Handling

### Frontend Validation Errors
```javascript
if (!canProceedFromStep(currentStep)) {
  // Prevent navigation
  // Show visual feedback in UI
}
```

### API Validation Errors
```json
{
  "success": false,
  "error": "Missing required fields (name, defaultTargets, buildPipelines)",
  "status": 400
}
```

### Network/Server Errors
```javascript
catch (error) {
  alert(`Failed to save configuration: ${error.message}`);
  setIsSubmitting(false);
  // Draft remains in localStorage for recovery
}
```

---

## Key Features

### ✅ Auto-save Drafts
- Saves to localStorage on every change
- Recovers draft if user navigates away
- Clears draft on successful submission

### ✅ Default Configuration
- Only one config can be default per org
- Setting new default unsets previous default
- Used automatically in release creation

### ✅ Validation
- Client-side validation before submission
- Server-side validation at API layer
- Comprehensive checks for all required fields

### ✅ Soft Delete (Archive)
- Archived configs not deleted permanently
- Can be restored by changing status
- Maintains data integrity for historical releases

### ✅ Configuration Reuse
- Save once, use for multiple releases
- Consistency across releases
- Easy updates propagate to future releases

---

## Summary

When a user submits Release Configuration data:

1. **Frontend collects** data through 7-step wizard
2. **Auto-saves** drafts to localStorage during editing
3. **Validates** complete configuration before submission
4. **POSTs** to `/api/v1/tenants/:tenantId/release-config`
5. **API validates** and calls server-side store
6. **Store persists** in memory Map (temporary)
7. **Returns** success with configId
8. **Frontend clears** draft from localStorage
9. **Configuration becomes** available for release creation
10. **Future releases** can use this configuration

The flow ensures data consistency, validation, and recoverability at every step.

