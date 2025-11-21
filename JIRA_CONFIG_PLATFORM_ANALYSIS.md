# JIRA Config Platform-Level Configuration - Gap Analysis

## Overview
Analysis of the differences between backend expectations for JIRA project management configuration (platform-specific) and current frontend implementation (global settings).

---

## 🎯 User Requirements

1. Each release config should have **platform-level** JIRA project setup
2. Platforms come from the **selected platforms** in earlier wizard steps
3. Each platform can have different:
   - Project Keys
   - Issue Types
   - Completion Status
   - Priority
   - Labels
   - Assignees

---

## 📊 Current State

### Backend DTO (Already Supports Platform-Level Config)

**Location**: `/api/script/types/integrations/project-management/configuration/configuration.interface.ts`

```typescript
export type CreateProjectManagementConfigDto = {
  projectId: string;                // Tenant ID
  integrationId: string;           // JIRA integration ID
  name: string;                     // Config name
  description?: string;
  platformConfigurations: PlatformConfiguration[]; // ✅ ARRAY of platform configs
  createdByAccountId?: string;
};

export type PlatformConfiguration = {
  platform: Platform;              // 'WEB' | 'IOS' | 'ANDROID'
  parameters: {
    projectKey: string;            // JIRA project key (e.g., "FE", "APP")
    issueType?: string;            // Epic, Story, Task, etc.
    completedStatus: string;       // "Done", "Released", etc.
    priority?: string;             // High, Medium, Low
    labels?: string[];             // Custom labels
    assignee?: string;             // Default assignee
    [key: string]: unknown;        // Provider-specific fields
  };
};

enum Platform {
  WEB = 'WEB',
  IOS = 'IOS',
  ANDROID = 'ANDROID'
}
```

**Example Backend Payload**:
```json
{
  "projectId": "tenant-123",
  "integrationId": "jira-int-456",
  "name": "Standard Release Config",
  "description": "Default configuration for all platform releases",
  "platformConfigurations": [
    {
      "platform": "WEB",
      "parameters": {
        "projectKey": "FE",
        "issueType": "Epic",
        "completedStatus": "Done",
        "priority": "High"
      }
    },
    {
      "platform": "IOS",
      "parameters": {
        "projectKey": "FE",
        "issueType": "Epic",
        "completedStatus": "Released",
        "priority": "High"
      }
    },
    {
      "platform": "ANDROID",
      "parameters": {
        "projectKey": "FE",
        "issueType": "Epic",
        "completedStatus": "Released",
        "priority": "High"
      }
    }
  ]
}
```

---

### Frontend Current Implementation (Global Settings Only)

**Location**: `/app/types/release-config.ts`

```typescript
export interface JiraProjectConfig {
  enabled: boolean;
  integrationId: string;
  projectKey: string;              // ❌ SINGLE project key (not platform-specific!)
  projectId?: string;
  issueTypeForRelease?: string;    // ❌ Global issue type
  createReleaseTicket?: boolean;
  linkBuildsToIssues?: boolean;
}
```

**Current UI**: `JiraProjectStep.tsx`
- Renders a single `JiraProjectConfigCard`
- One project key for all platforms
- No platform-specific configuration

---

## 🔴 Key Gaps

| Aspect | Backend Expects | Frontend Provides | Gap |
|--------|----------------|-------------------|-----|
| **Structure** | Array of platform configs | Single global config | ❌ Major |
| **Project Key** | Per-platform (FE, APP, MOBILE) | Single key | ❌ Major |
| **Issue Type** | Per-platform (Epic, Story, Task) | Single global type | ❌ Major |
| **Completion Status** | Per-platform (Done, Released, Closed) | Not captured | ❌ Major |
| **Priority** | Per-platform (High, Medium, Low) | Not captured | ❌ Major |
| **Labels** | Per-platform (array) | Not captured | ❌ Medium |
| **Assignee** | Per-platform | Not captured | ❌ Medium |
| **Platform Support** | WEB, IOS, ANDROID | Only ANDROID, IOS | ❌ Medium |
| **Config ID** | Backend returns `pmConfigId` | Not stored in frontend | ❌ Critical |

---

## 🎨 Proposed Solution

### 1. Update Frontend Types

**File**: `/app/types/release-config.ts`

```typescript
// ADD: Platform-specific JIRA configuration
export interface JiraPlatformConfig {
  platform: 'WEB' | 'IOS' | 'ANDROID';  // Match backend Platform enum
  projectKey: string;                    // e.g., "FE", "APP", "MOBILE"
  issueType?: string;                    // e.g., "Epic", "Story", "Task"
  completedStatus: string;               // e.g., "Done", "Released", "Closed"
  priority?: string;                     // e.g., "High", "Medium", "Low"
  labels?: string[];                     // Optional labels
  assignee?: string;                     // Optional default assignee
}

// UPDATE: JiraProjectConfig to support platform-level configs
export interface JiraProjectConfig {
  enabled: boolean;
  integrationId: string;                 // JIRA integration ID
  pmConfigId?: string;                   // ✨ NEW: Backend config ID (returned after creation)
  
  // Platform-specific configurations
  platformConfigurations: JiraPlatformConfig[];  // ✨ NEW: Array of platform configs
  
  // Global settings (still useful)
  createReleaseTicket?: boolean;         // Auto-create release tickets
  linkBuildsToIssues?: boolean;          // Link build info to issues
}
```

---

### 2. Update UI Component

**File**: `/app/components/ReleaseConfig/JiraProject/JiraProjectStep.tsx`

**Current Flow**:
```
[Enable JIRA] → [Select Integration] → [Enter Project Key] → Done
```

**New Flow**:
```
[Enable JIRA] → [Select Integration] → 
  FOR EACH PLATFORM (from earlier step):
    [Configure Platform]:
      - Project Key (required)
      - Issue Type (dropdown)
      - Completion Status (dropdown)
      - Priority (dropdown)
      - Labels (multi-select)
      - Assignee (text)
```

**Component Structure**:
```tsx
<JiraProjectStep 
  config={config.jiraProject}
  onChange={(jiraProject) => setConfig({ ...config, jiraProject })}
  availableIntegrations={availableIntegrations.jira}
  selectedPlatforms={config.platforms}  // ✨ NEW: Pass platforms from earlier step
/>

// Inside component:
{config.enabled && (
  <>
    <Select 
      label="JIRA Integration"
      data={availableIntegrations}
      value={config.integrationId}
    />
    
    {selectedPlatforms.map(platform => (
      <JiraPlatformConfigCard
        key={platform}
        platform={platform}
        config={getPlatformConfig(platform)}
        onChange={(platformConfig) => updatePlatformConfig(platform, platformConfig)}
      />
    ))}
  </>
)}
```

---

### 3. Create New Component

**File**: `/app/components/ReleaseConfig/JiraProject/JiraPlatformConfigCard.tsx`

```tsx
interface JiraPlatformConfigCardProps {
  platform: 'WEB' | 'IOS' | 'ANDROID';
  config: JiraPlatformConfig;
  onChange: (config: JiraPlatformConfig) => void;
}

export function JiraPlatformConfigCard({
  platform,
  config,
  onChange
}: JiraPlatformConfigCardProps) {
  return (
    <Card withBorder>
      <Text fw={600}>{platform} Configuration</Text>
      
      <TextInput
        label="Project Key"
        placeholder="e.g., FE, APP, MOBILE"
        value={config.projectKey}
        onChange={(e) => onChange({ ...config, projectKey: e.target.value })}
        required
      />
      
      <Select
        label="Issue Type"
        placeholder="Select issue type"
        data={['Epic', 'Story', 'Task', 'Bug']}
        value={config.issueType}
        onChange={(value) => onChange({ ...config, issueType: value || undefined })}
      />
      
      <Select
        label="Completion Status"
        placeholder="Status that indicates completion"
        data={['Done', 'Released', 'Closed', 'Resolved']}
        value={config.completedStatus}
        onChange={(value) => onChange({ ...config, completedStatus: value || 'Done' })}
        required
      />
      
      <Select
        label="Priority"
        placeholder="Default priority"
        data={['High', 'Medium', 'Low']}
        value={config.priority}
        onChange={(value) => onChange({ ...config, priority: value || undefined })}
      />
      
      <MultiSelect
        label="Labels"
        placeholder="Add labels"
        data={[]} // Can be empty or pre-populated
        value={config.labels || []}
        onChange={(value) => onChange({ ...config, labels: value })}
        searchable
        creatable
      />
      
      <TextInput
        label="Default Assignee"
        placeholder="Jira username or email"
        value={config.assignee}
        onChange={(e) => onChange({ ...config, assignee: e.target.value })}
      />
    </Card>
  );
}
```

---

### 4. Create Transformation Utility

**File**: `/app/utils/jira-config-transformer.ts`

```typescript
import type { JiraProjectConfig, JiraPlatformConfig } from '~/types/release-config';

/**
 * Transform frontend JiraProjectConfig to backend CreateProjectManagementConfigDto
 */
export function transformJiraConfigToBackendDTO(
  jiraConfig: JiraProjectConfig,
  tenantId: string,
  configName: string,
  userId?: string
) {
  if (!jiraConfig.enabled || !jiraConfig.integrationId) {
    return null;
  }

  return {
    projectId: tenantId,
    integrationId: jiraConfig.integrationId,
    name: configName,
    description: `JIRA project management configuration for ${configName}`,
    platformConfigurations: jiraConfig.platformConfigurations.map(pc => ({
      platform: pc.platform,
      parameters: {
        projectKey: pc.projectKey,
        issueType: pc.issueType,
        completedStatus: pc.completedStatus,
        priority: pc.priority,
        labels: pc.labels,
        assignee: pc.assignee,
      }
    })),
    createdByAccountId: userId,
  };
}

/**
 * Transform backend ProjectManagementConfig to frontend JiraProjectConfig
 */
export function transformBackendDTOToJiraConfig(
  backendConfig: any
): JiraProjectConfig {
  return {
    enabled: true,
    integrationId: backendConfig.integrationId,
    pmConfigId: backendConfig.id,
    platformConfigurations: backendConfig.platformConfigurations.map((pc: any) => ({
      platform: pc.platform,
      projectKey: pc.parameters.projectKey,
      issueType: pc.parameters.issueType,
      completedStatus: pc.parameters.completedStatus,
      priority: pc.parameters.priority,
      labels: pc.parameters.labels,
      assignee: pc.parameters.assignee,
    })),
    createReleaseTicket: true,
    linkBuildsToIssues: true,
  };
}
```

---

### 5. Update Wizard Submission Flow

**File**: `/app/components/ReleaseConfig/Wizard/ConfigurationWizard.tsx`

```typescript
const handleSubmit = async () => {
  setIsSubmitting(true);
  
  try {
    // 1. If JIRA is enabled, create PM config first
    let pmConfigId: string | undefined;
    
    if (config.jiraProject?.enabled && config.jiraProject.integrationId) {
      const pmConfigDTO = transformJiraConfigToBackendDTO(
        config.jiraProject,
        organizationId,
        config.name || 'Release Configuration',
        currentUserId
      );
      
      if (pmConfigDTO) {
        // Call backend to create PM config
        const response = await fetch(
          `/api/v1/tenants/${organizationId}/integrations/project-management/config`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pmConfigDTO),
          }
        );
        
        const result = await response.json();
        if (result.success) {
          pmConfigId = result.data.id;
          
          // Update config with pmConfigId
          config.jiraProject.pmConfigId = pmConfigId;
        }
      }
    }
    
    // 2. Now submit the release configuration
    await onSubmit(config as ReleaseConfiguration);
    
    clearDraftConfig(organizationId);
  } catch (error) {
    console.error('Failed to submit configuration:', error);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### 6. Update Default Config Creator

**File**: `/app/utils/default-config.ts`

```typescript
export function createDefaultJiraConfig(platforms: Platform[]): JiraProjectConfig {
  return {
    enabled: false,
    integrationId: '',
    platformConfigurations: platforms.map(platform => ({
      platform: platform === 'ANDROID' ? 'ANDROID' : platform === 'IOS' ? 'IOS' : 'WEB',
      projectKey: '',
      completedStatus: 'Done',
      priority: 'High',
    })),
    createReleaseTicket: true,
    linkBuildsToIssues: true,
  };
}
```

---

## 📋 Implementation Checklist

### Phase 1: Type Updates ✅
- [ ] Update `JiraProjectConfig` interface in `release-config.ts`
- [ ] Add `JiraPlatformConfig` interface
- [ ] Update `Platform` type to include 'WEB'
- [ ] Add `pmConfigId` field

### Phase 2: UI Components 🎨
- [ ] Create `JiraPlatformConfigCard` component
- [ ] Update `JiraProjectStep` to iterate over platforms
- [ ] Pass `selectedPlatforms` prop from wizard
- [ ] Add platform-specific form fields (issue type, completion status, priority, labels, assignee)
- [ ] Update validation logic

### Phase 3: Data Transformation 🔄
- [ ] Create `transformJiraConfigToBackendDTO()` utility
- [ ] Create `transformBackendDTOToJiraConfig()` utility
- [ ] Update `createDefaultJiraConfig()` to initialize platform configs

### Phase 4: API Integration 🔌
- [ ] Add BFF route for PM config creation
- [ ] Update wizard submission to create PM config first
- [ ] Store returned `pmConfigId` in release config
- [ ] Add error handling for PM config creation

### Phase 5: Storage & Persistence 💾
- [ ] Update localStorage schema to support new structure
- [ ] Update validation logic for platform-level configs
- [ ] Test draft save/load with new structure

### Phase 6: Testing & Polish ✨
- [ ] Test with single platform (Android only)
- [ ] Test with multiple platforms (Android + iOS)
- [ ] Test with all platforms (Web + Android + iOS)
- [ ] Test edit flow (load existing PM config)
- [ ] Add loading states
- [ ] Add error messages

---

## 🔗 Platform Mapping

| Frontend Platform | Backend Platform | Notes |
|-------------------|------------------|-------|
| `'ANDROID'` | `'ANDROID'` | ✅ Direct match |
| `'IOS'` | `'IOS'` | ✅ Direct match |
| N/A (not in frontend) | `'WEB'` | ⚠️ Frontend doesn't have WEB platform yet |

**Action**: Consider adding 'WEB' platform support to frontend if needed, or filter it out in transformations.

---

## 🎯 Key Benefits

1. **Platform Flexibility**: Each platform can have different JIRA projects
2. **Proper Backend Integration**: Matches backend's expected structure
3. **Scalability**: Easy to add more platform-specific fields
4. **Reusability**: PM configs can be reused across release configs
5. **Separation of Concerns**: PM config is managed separately from release config

---

## 📝 Example User Flow

### Step 1: Select Platforms
```
☑ Android
☑ iOS
☐ Web
```

### Step 2: Configure JIRA (Later in wizard)
```
Enable JIRA Integration: [x]
Select Integration: [My JIRA Cloud]

━━━ Android Configuration ━━━
Project Key: APP
Issue Type: Epic
Completion Status: Released
Priority: High

━━━ iOS Configuration ━━━
Project Key: APP
Issue Type: Epic
Completion Status: Released  
Priority: High
```

### Step 3: On Submit
1. Creates PM config with platform configurations
2. Receives `pmConfigId` from backend
3. Stores `pmConfigId` in release configuration
4. Saves release configuration

---

**Status**: 📋 Ready for Implementation
**Priority**: 🔴 High (Blocks proper JIRA integration)
**Estimated Effort**: 8-12 hours

