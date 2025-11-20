# 🚀 Dynamic Configuration Implementation Plan

## 📋 Overview

**Current Problem:** All types, enums, and configurations are hardcoded in the frontend.

**Solution:** Fetch metadata/configuration from backend at app initialization and store in frontend state management.

**Benefits:**
- ✅ Backend controls available options (integrations, platforms, etc.)
- ✅ Easy to add new options without code changes
- ✅ Per-organization customization possible
- ✅ Single source of truth (backend)
- ✅ Type safety maintained via TypeScript types
- ✅ Better scalability and flexibility

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER LANDS ON APP                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         Root Loader / App Initialization                    │
│         (app/root.tsx or dashboard layout)                  │
│                                                             │
│  GET /api/v1/system/metadata                                │
│  GET /api/v1/tenants/{tenantId}/config                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Store in Frontend State                        │
│              (Zustand / Context)                            │
│                                                             │
│  • System Metadata (available options)                      │
│  • Tenant Configuration (enabled options)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Components Use Config Store                       │
│           (No hardcoded values)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 Backend API Structure

### 1. System Metadata API (Global Configuration)

**Endpoint:** `GET /api/v1/system/metadata`

**Purpose:** Returns all available options in the system (not tenant-specific)

**Response Structure:**

```typescript
{
  "releaseManagement": {
    // Integration Categories and Available Providers
    "integrations": {
      "SOURCE_CONTROL": [
        {
          "id": "github",
          "name": "GitHub",
          "description": "Connect your GitHub repository",
          "icon": "🐙",
          "isAvailable": true,
          "requiresOAuth": true,
          "configSchema": {
            "owner": { "type": "string", "required": true },
            "repo": { "type": "string", "required": true },
            "defaultBranch": { "type": "string", "required": false }
          }
        },
        {
          "id": "gitlab",
          "name": "GitLab",
          "description": "Integrate with GitLab",
          "icon": "🦊",
          "isAvailable": false,
          "comingSoon": true
        }
      ],
      "COMMUNICATION": [
        {
          "id": "slack",
          "name": "Slack",
          "description": "Send notifications to Slack",
          "icon": "💬",
          "isAvailable": true,
          "requiresOAuth": true
        }
      ],
      "CI_CD": [
        {
          "id": "jenkins",
          "name": "Jenkins",
          "description": "Trigger Jenkins builds",
          "icon": "🔨",
          "isAvailable": true,
          "requiresOAuth": false,
          "configSchema": {
            "hostUrl": { "type": "string", "required": true },
            "username": { "type": "string", "required": true },
            "apiToken": { "type": "string", "required": true, "sensitive": true }
          }
        },
        {
          "id": "github-actions",
          "name": "GitHub Actions",
          "description": "Trigger GitHub Actions workflows",
          "icon": "⚡",
          "isAvailable": true,
          "requiresOAuth": false
        }
      ],
      "TEST_MANAGEMENT": [
        {
          "id": "checkmate",
          "name": "Checkmate",
          "description": "Manage test cases and runs",
          "icon": "✅",
          "isAvailable": true
        },
        {
          "id": "testrail",
          "name": "TestRail",
          "description": "TestRail integration",
          "icon": "📊",
          "isAvailable": false,
          "comingSoon": true
        }
      ],
      "PROJECT_MANAGEMENT": [
        {
          "id": "jira",
          "name": "Jira",
          "description": "Link releases to Jira issues",
          "icon": "📋",
          "isAvailable": true
        }
      ],
      "APP_DISTRIBUTION": [
        {
          "id": "appstore",
          "name": "Apple App Store",
          "description": "Deploy to App Store",
          "icon": "🍎",
          "isAvailable": false,
          "comingSoon": true
        },
        {
          "id": "playstore",
          "name": "Google Play Store",
          "description": "Deploy to Play Store",
          "icon": "🤖",
          "isAvailable": false,
          "comingSoon": true
        }
      ]
    },
    
    // Available Platforms
    "platforms": [
      {
        "id": "ANDROID",
        "name": "Android",
        "description": "Build and distribute for Android devices",
        "icon": "🤖",
        "color": "#3DDC84",
        "isAvailable": true
      },
      {
        "id": "IOS",
        "name": "iOS",
        "description": "Build and distribute for iOS devices",
        "icon": "🍎",
        "color": "#000000",
        "isAvailable": true
      }
    ],
    
    // Available Targets per Platform
    "targets": {
      "ANDROID": [
        {
          "id": "PLAY_STORE",
          "name": "Google Play Store",
          "description": "Distribute to Play Store",
          "icon": "🤖",
          "isAvailable": true,
          "requiresCredentials": true
        },
        {
          "id": "WEB",
          "name": "Web",
          "description": "Deploy to web",
          "icon": "🌐",
          "isAvailable": true,
          "requiresCredentials": false
        }
      ],
      "IOS": [
        {
          "id": "APP_STORE",
          "name": "Apple App Store",
          "description": "Distribute to App Store",
          "icon": "🍎",
          "isAvailable": true,
          "requiresCredentials": true
        },
        {
          "id": "TESTFLIGHT",
          "name": "TestFlight",
          "description": "Internal testing via TestFlight",
          "icon": "✈️",
          "isAvailable": false,
          "comingSoon": true
        }
      ]
    },
    
    // Release Types
    "releaseTypes": [
      {
        "id": "PLANNED",
        "name": "Planned Release",
        "description": "Regular scheduled release",
        "icon": "📅",
        "color": "blue",
        "defaultScheduling": {
          "kickoffLeadDays": 2,
          "releaseFrequency": "BIWEEKLY"
        }
      },
      {
        "id": "HOTFIX",
        "name": "Hotfix Release",
        "description": "Urgent bug fix release",
        "icon": "🔥",
        "color": "orange",
        "defaultScheduling": {
          "kickoffLeadDays": 0,
          "releaseFrequency": "CUSTOM"
        }
      },
      {
        "id": "EMERGENCY",
        "name": "Emergency Release",
        "description": "Critical production issue",
        "icon": "🚨",
        "color": "red",
        "defaultScheduling": {
          "kickoffLeadDays": 0,
          "releaseFrequency": "CUSTOM"
        }
      }
    ],
    
    // Release Stages (Workflow Phases)
    "releaseStages": [
      {
        "id": "PRE_KICKOFF",
        "name": "Pre-Kickoff",
        "description": "Before branch fork-off",
        "order": 1,
        "color": "gray",
        "icon": "📋",
        "allowedActions": ["SCHEDULE", "PLAN"]
      },
      {
        "id": "KICKOFF",
        "name": "Kickoff",
        "description": "Branch fork-off and initial setup",
        "order": 2,
        "color": "blue",
        "icon": "🚀",
        "allowedActions": ["FORK_BRANCH", "SETUP_PIPELINES"]
      },
      {
        "id": "REGRESSION",
        "name": "Regression Testing",
        "description": "Build and test phase",
        "order": 3,
        "color": "yellow",
        "icon": "🧪",
        "allowedActions": ["TRIGGER_BUILDS", "RUN_TESTS", "CHERRY_PICK"]
      },
      {
        "id": "READY_FOR_RELEASE",
        "name": "Ready for Release",
        "description": "Builds approved, ready to release",
        "order": 4,
        "color": "green",
        "icon": "✅",
        "allowedActions": ["APPROVE", "SUBMIT_BUILDS"]
      },
      {
        "id": "RELEASED",
        "name": "Released",
        "description": "Live to production",
        "order": 5,
        "color": "green",
        "icon": "🎉",
        "allowedActions": ["MONITOR", "ROLLBACK"]
      }
    ],
    
    // Release Statuses (within stages)
    "releaseStatuses": [
      {
        "id": "KICKOFF_PENDING",
        "name": "Kickoff Pending",
        "description": "Scheduled, waiting for kickoff time",
        "stage": "PRE_KICKOFF",
        "color": "gray",
        "isInitial": true
      },
      {
        "id": "PENDING",
        "name": "Pending",
        "description": "Release pending action",
        "stage": "PRE_KICKOFF",
        "color": "gray"
      },
      {
        "id": "STARTED",
        "name": "Started",
        "description": "Release started, branch forked",
        "stage": "KICKOFF",
        "color": "blue"
      },
      {
        "id": "REGRESSION_IN_PROGRESS",
        "name": "Regression In Progress",
        "description": "Building and testing",
        "stage": "REGRESSION",
        "color": "yellow"
      },
      {
        "id": "BUILD_SUBMITTED",
        "name": "Build Submitted",
        "description": "Builds submitted to stores",
        "stage": "READY_FOR_RELEASE",
        "color": "green"
      },
      {
        "id": "RELEASED",
        "name": "Released",
        "description": "Live to users",
        "stage": "RELEASED",
        "color": "green",
        "isFinal": true
      },
      {
        "id": "CANCELLED",
        "name": "Cancelled",
        "description": "Release cancelled",
        "stage": null,
        "color": "red",
        "isFinal": true
      },
      {
        "id": "ARCHIVED",
        "name": "Archived",
        "description": "Historical record",
        "stage": "RELEASED",
        "color": "gray",
        "isFinal": true
      }
    ],
    
    // Build Environments
    "buildEnvironments": [
      {
        "id": "PRE_REGRESSION",
        "name": "Pre-Regression",
        "description": "Optional pre-testing build",
        "order": 1,
        "isRequired": false,
        "applicablePlatforms": ["ANDROID", "IOS"],
        "icon": "🔨"
      },
      {
        "id": "REGRESSION",
        "name": "Regression",
        "description": "Main testing build",
        "order": 2,
        "isRequired": true,
        "applicablePlatforms": ["ANDROID", "IOS"],
        "icon": "🧪"
      },
      {
        "id": "TESTFLIGHT",
        "name": "TestFlight",
        "description": "TestFlight distribution build",
        "order": 3,
        "isRequired": true,
        "applicablePlatforms": ["IOS"],
        "icon": "✈️"
      },
      {
        "id": "PRODUCTION",
        "name": "Production",
        "description": "Production build",
        "order": 4,
        "isRequired": false,
        "applicablePlatforms": ["ANDROID", "IOS"],
        "icon": "🚀"
      }
    ],
    
    // Build Providers
    "buildProviders": [
      {
        "id": "JENKINS",
        "name": "Jenkins",
        "description": "Jenkins CI/CD",
        "icon": "🔨",
        "isAvailable": true,
        "supportsParameterization": true
      },
      {
        "id": "GITHUB_ACTIONS",
        "name": "GitHub Actions",
        "description": "GitHub Actions workflows",
        "icon": "⚡",
        "isAvailable": true,
        "supportsParameterization": true
      },
      {
        "id": "MANUAL_UPLOAD",
        "name": "Manual Upload",
        "description": "Upload builds manually",
        "icon": "📤",
        "isAvailable": true,
        "supportsParameterization": false
      }
    ],
    
    // Test Management Providers
    "testManagementProviders": [
      {
        "id": "CHECKMATE",
        "name": "Checkmate",
        "description": "Checkmate test management",
        "icon": "✅",
        "isAvailable": true
      },
      {
        "id": "TESTRAIL",
        "name": "TestRail",
        "description": "TestRail test management",
        "icon": "📊",
        "isAvailable": false,
        "comingSoon": true
      },
      {
        "id": "ZEPHYR",
        "name": "Zephyr",
        "description": "Zephyr test management",
        "icon": "⚡",
        "isAvailable": false,
        "comingSoon": true
      },
      {
        "id": "NONE",
        "name": "No Test Management",
        "description": "Skip test management integration",
        "icon": "⏭️",
        "isAvailable": true
      }
    ]
  },
  
  // System-level settings
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

### 2. Tenant Configuration API (Tenant-Specific)

**Endpoint:** `GET /api/v1/tenants/{tenantId}/config`

**Purpose:** Returns tenant-specific configuration (what's enabled/connected)

**Response Structure:**

```typescript
{
  "tenantId": "tenant-123",
  "organization": {
    "id": "org-456",
    "name": "ACME Corp"
  },
  
  "releaseManagement": {
    // Connected integrations for this tenant
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
      ]
    },
    
    // Enabled platforms for this tenant
    "enabledPlatforms": ["ANDROID", "IOS"],
    
    // Enabled targets for this tenant
    "enabledTargets": {
      "ANDROID": ["PLAY_STORE", "WEB"],
      "IOS": ["APP_STORE"]
    },
    
    // Allowed release types for this tenant
    "allowedReleaseTypes": ["PLANNED", "HOTFIX"],
    
    // Custom settings
    "customSettings": {
      "defaultKickoffLeadDays": 2,
      "workingDays": [1, 2, 3, 4, 5],
      "timezone": "Asia/Kolkata",
      "versioningScheme": "SEMVER"
    }
  }
}
```

---

## 🗄️ Frontend State Management

### Option 1: Zustand Store (Recommended)

**File:** `app/stores/configStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
interface SystemMetadata {
  releaseManagement: {
    integrations: Record<string, IntegrationProvider[]>;
    platforms: PlatformOption[];
    targets: Record<string, TargetOption[]>;
    releaseTypes: ReleaseTypeOption[];
    releaseStages: ReleaseStageOption[];
    releaseStatuses: ReleaseStatusOption[];
    buildEnvironments: BuildEnvironmentOption[];
    buildProviders: BuildProviderOption[];
    testManagementProviders: TestManagementProviderOption[];
  };
  system: {
    version: string;
    features: Record<string, boolean>;
  };
}

interface TenantConfig {
  tenantId: string;
  organization: {
    id: string;
    name: string;
  };
  releaseManagement: {
    connectedIntegrations: Record<string, ConnectedIntegration[]>;
    enabledPlatforms: string[];
    enabledTargets: Record<string, string[]>;
    allowedReleaseTypes: string[];
    customSettings: Record<string, any>;
  };
}

interface ConfigState {
  // Data
  systemMetadata: SystemMetadata | null;
  tenantConfig: TenantConfig | null;
  
  // Loading states
  isLoadingMetadata: boolean;
  isLoadingTenantConfig: boolean;
  
  // Errors
  metadataError: string | null;
  tenantConfigError: string | null;
  
  // Actions
  fetchSystemMetadata: () => Promise<void>;
  fetchTenantConfig: (tenantId: string) => Promise<void>;
  
  // Selectors (derived data)
  getAvailableIntegrations: (category?: string) => IntegrationProvider[];
  getConnectedIntegrations: (category?: string) => ConnectedIntegration[];
  getAvailablePlatforms: () => PlatformOption[];
  getAvailableTargets: (platformId: string) => TargetOption[];
  getReleaseTypes: () => ReleaseTypeOption[];
  getReleaseStages: () => ReleaseStageOption[];
  getReleaseStatuses: (stage?: string) => ReleaseStatusOption[];
  getBuildEnvironments: (platformId?: string) => BuildEnvironmentOption[];
  getBuildProviders: () => BuildProviderOption[];
  getTestManagementProviders: () => TestManagementProviderOption[];
  
  // Helper methods
  isIntegrationConnected: (providerId: string) => boolean;
  isPlatformEnabled: (platformId: string) => boolean;
  isReleaseTypeAllowed: (releaseTypeId: string) => boolean;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      // Initial state
      systemMetadata: null,
      tenantConfig: null,
      isLoadingMetadata: false,
      isLoadingTenantConfig: false,
      metadataError: null,
      tenantConfigError: null,
      
      // Fetch system metadata
      fetchSystemMetadata: async () => {
        set({ isLoadingMetadata: true, metadataError: null });
        try {
          const response = await fetch('/api/v1/system/metadata');
          if (!response.ok) throw new Error('Failed to fetch system metadata');
          const data = await response.json();
          set({ systemMetadata: data, isLoadingMetadata: false });
        } catch (error) {
          set({ 
            metadataError: error instanceof Error ? error.message : 'Unknown error',
            isLoadingMetadata: false 
          });
        }
      },
      
      // Fetch tenant configuration
      fetchTenantConfig: async (tenantId: string) => {
        set({ isLoadingTenantConfig: true, tenantConfigError: null });
        try {
          const response = await fetch(`/api/v1/tenants/${tenantId}/config`);
          if (!response.ok) throw new Error('Failed to fetch tenant config');
          const data = await response.json();
          set({ tenantConfig: data, isLoadingTenantConfig: false });
        } catch (error) {
          set({ 
            tenantConfigError: error instanceof Error ? error.message : 'Unknown error',
            isLoadingTenantConfig: false 
          });
        }
      },
      
      // Selectors
      getAvailableIntegrations: (category) => {
        const metadata = get().systemMetadata;
        if (!metadata) return [];
        
        if (category) {
          return metadata.releaseManagement.integrations[category] || [];
        }
        
        return Object.values(metadata.releaseManagement.integrations).flat();
      },
      
      getConnectedIntegrations: (category) => {
        const config = get().tenantConfig;
        if (!config) return [];
        
        if (category) {
          return config.releaseManagement.connectedIntegrations[category] || [];
        }
        
        return Object.values(config.releaseManagement.connectedIntegrations).flat();
      },
      
      getAvailablePlatforms: () => {
        const metadata = get().systemMetadata;
        return metadata?.releaseManagement.platforms || [];
      },
      
      getAvailableTargets: (platformId) => {
        const metadata = get().systemMetadata;
        return metadata?.releaseManagement.targets[platformId] || [];
      },
      
      getReleaseTypes: () => {
        const metadata = get().systemMetadata;
        return metadata?.releaseManagement.releaseTypes || [];
      },
      
      getReleaseStages: () => {
        const metadata = get().systemMetadata;
        return metadata?.releaseManagement.releaseStages || [];
      },
      
      getReleaseStatuses: (stage) => {
        const metadata = get().systemMetadata;
        if (!metadata) return [];
        
        const statuses = metadata.releaseManagement.releaseStatuses;
        if (stage) {
          return statuses.filter(s => s.stage === stage);
        }
        return statuses;
      },
      
      getBuildEnvironments: (platformId) => {
        const metadata = get().systemMetadata;
        if (!metadata) return [];
        
        const environments = metadata.releaseManagement.buildEnvironments;
        if (platformId) {
          return environments.filter(e => 
            e.applicablePlatforms.includes(platformId)
          );
        }
        return environments;
      },
      
      getBuildProviders: () => {
        const metadata = get().systemMetadata;
        return metadata?.releaseManagement.buildProviders || [];
      },
      
      getTestManagementProviders: () => {
        const metadata = get().systemMetadata;
        return metadata?.releaseManagement.testManagementProviders || [];
      },
      
      // Helper methods
      isIntegrationConnected: (providerId) => {
        const connected = get().getConnectedIntegrations();
        return connected.some(i => i.providerId === providerId);
      },
      
      isPlatformEnabled: (platformId) => {
        const config = get().tenantConfig;
        return config?.releaseManagement.enabledPlatforms.includes(platformId) || false;
      },
      
      isReleaseTypeAllowed: (releaseTypeId) => {
        const config = get().tenantConfig;
        return config?.releaseManagement.allowedReleaseTypes.includes(releaseTypeId) || false;
      },
    }),
    {
      name: 'delivr-config-storage',
      partialize: (state) => ({
        systemMetadata: state.systemMetadata,
        tenantConfig: state.tenantConfig,
      }),
    }
  )
);
```

---

### Option 2: React Context (Alternative)

**File:** `app/contexts/ConfigContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Similar structure as Zustand but using Context API
const ConfigContext = createContext<ConfigState | null>(null);

export function ConfigProvider({ 
  children, 
  tenantId 
}: { 
  children: ReactNode; 
  tenantId?: string; 
}) {
  const [systemMetadata, setSystemMetadata] = useState<SystemMetadata | null>(null);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Fetch on mount
    Promise.all([
      fetchSystemMetadata(),
      tenantId ? fetchTenantConfig(tenantId) : Promise.resolve(),
    ]).finally(() => setIsLoading(false));
  }, [tenantId]);
  
  // ... implementation
  
  return (
    <ConfigContext.Provider value={/* ... */}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useConfig must be used within ConfigProvider');
  return context;
}
```

---

## 🔄 Integration Points

### 1. App Initialization (Root Loader)

**File:** `app/root.tsx` or `app/routes/dashboard.$org.tsx`

```typescript
import { useEffect } from 'react';
import { useConfigStore } from '~/stores/configStore';

export async function loader({ params }: LoaderFunctionArgs) {
  const { org } = params;
  
  // Can also fetch on server-side and pass to client
  return json({ org });
}

export default function DashboardLayout() {
  const { org } = useLoaderData<typeof loader>();
  const fetchSystemMetadata = useConfigStore(state => state.fetchSystemMetadata);
  const fetchTenantConfig = useConfigStore(state => state.fetchTenantConfig);
  
  // Fetch config on mount
  useEffect(() => {
    fetchSystemMetadata();
    if (org) {
      fetchTenantConfig(org);
    }
  }, [org]);
  
  return <Outlet />;
}
```

---

### 2. Usage in Components

#### Example: Integration List (Replaces hardcoded list)

**Before:**
```typescript
// app/config/integrations.ts
export function getAllIntegrations(): Integration[] {
  return [
    { id: 'github', name: 'GitHub', ... },
    { id: 'slack', name: 'Slack', ... },
    // ... hardcoded list
  ];
}
```

**After:**
```typescript
// app/routes/dashboard.$org.integrations.tsx
import { useConfigStore } from '~/stores/configStore';

export default function IntegrationsPage() {
  // Get available integrations from store (from backend)
  const getAvailableIntegrations = useConfigStore(
    state => state.getAvailableIntegrations
  );
  const getConnectedIntegrations = useConfigStore(
    state => state.getConnectedIntegrations
  );
  
  // Get all integrations by category
  const sourceControlIntegrations = getAvailableIntegrations('SOURCE_CONTROL');
  const communicationIntegrations = getAvailableIntegrations('COMMUNICATION');
  const cicdIntegrations = getAvailableIntegrations('CI_CD');
  
  // Merge with connection status
  const integrationsWithStatus = sourceControlIntegrations.map(integration => {
    const isConnected = getConnectedIntegrations('SOURCE_CONTROL')
      .some(c => c.providerId === integration.id);
    
    return {
      ...integration,
      status: isConnected ? 'CONNECTED' : 'NOT_CONNECTED',
    };
  });
  
  return (
    <div>
      {integrationsWithStatus.map(integration => (
        <IntegrationCard key={integration.id} integration={integration} />
      ))}
    </div>
  );
}
```

#### Example: Platform Selector (Dynamic platforms)

**Before:**
```typescript
const platformConfigs: PlatformConfig[] = [
  { id: 'ANDROID', name: 'Android', ... },
  { id: 'IOS', name: 'iOS', ... },
];
```

**After:**
```typescript
import { useConfigStore } from '~/stores/configStore';

export function PlatformSelector() {
  // Get platforms from store (from backend)
  const platforms = useConfigStore(state => state.getAvailablePlatforms());
  const getTargets = useConfigStore(state => state.getAvailableTargets);
  const isPlatformEnabled = useConfigStore(state => state.isPlatformEnabled);
  
  return (
    <div>
      {platforms.map(platform => {
        const targets = getTargets(platform.id);
        const isEnabled = isPlatformEnabled(platform.id);
        
        return (
          <PlatformCard 
            key={platform.id}
            platform={platform}
            targets={targets}
            disabled={!isEnabled}
          />
        );
      })}
    </div>
  );
}
```

#### Example: Release Type Selector (Dynamic types)

**Before:**
```typescript
<Select
  data={[
    { value: 'PLANNED', label: 'Planned Release' },
    { value: 'HOTFIX', label: 'Hotfix Release' },
    { value: 'EMERGENCY', label: 'Emergency Release' },
  ]}
/>
```

**After:**
```typescript
import { useConfigStore } from '~/stores/configStore';

export function BasicInfoForm() {
  const releaseTypes = useConfigStore(state => state.getReleaseTypes());
  const isReleaseTypeAllowed = useConfigStore(state => state.isReleaseTypeAllowed);
  
  // Filter to only allowed types for this tenant
  const allowedReleaseTypes = releaseTypes.filter(rt => 
    isReleaseTypeAllowed(rt.id)
  );
  
  return (
    <Select
      label="Release Type"
      data={allowedReleaseTypes.map(rt => ({
        value: rt.id,
        label: rt.name,
        description: rt.description,
      }))}
    />
  );
}
```

#### Example: Build Environment Selector (Dynamic environments)

**Before:**
```typescript
const environmentOptions = [
  { value: 'PRE_REGRESSION', label: 'Pre-Regression' },
  { value: 'REGRESSION', label: 'Regression' },
  { value: 'TESTFLIGHT', label: 'TestFlight' },
  { value: 'PRODUCTION', label: 'Production' },
];
```

**After:**
```typescript
import { useConfigStore } from '~/stores/configStore';

export function PipelineEditModal({ platform }: { platform: string }) {
  const getBuildEnvironments = useConfigStore(
    state => state.getBuildEnvironments
  );
  
  // Get environments applicable to this platform
  const environments = getBuildEnvironments(platform);
  
  return (
    <Select
      label="Environment"
      data={environments.map(env => ({
        value: env.id,
        label: env.name,
        description: env.description,
        disabled: !env.isAvailable,
      }))}
    />
  );
}
```

---

## 📦 TypeScript Types (Keep in Frontend)

**File:** `app/types/config.ts`

```typescript
// Keep types in frontend for type safety
// But values come from backend

export interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  isAvailable: boolean;
  requiresOAuth?: boolean;
  comingSoon?: boolean;
  configSchema?: Record<string, any>;
}

export interface PlatformOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isAvailable: boolean;
}

export interface TargetOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  isAvailable: boolean;
  requiresCredentials: boolean;
  comingSoon?: boolean;
}

export interface ReleaseTypeOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultScheduling?: {
    kickoffLeadDays: number;
    releaseFrequency: string;
  };
}

export interface ReleaseStageOption {
  id: string;
  name: string;
  description: string;
  order: number;
  color: string;
  icon: string;
  allowedActions: string[];
}

export interface ReleaseStatusOption {
  id: string;
  name: string;
  description: string;
  stage: string | null;
  color: string;
  isInitial?: boolean;
  isFinal?: boolean;
}

export interface BuildEnvironmentOption {
  id: string;
  name: string;
  description: string;
  order: number;
  isRequired: boolean;
  applicablePlatforms: string[];
  icon: string;
}

export interface BuildProviderOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  isAvailable: boolean;
  supportsParameterization: boolean;
}

export interface TestManagementProviderOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  isAvailable: boolean;
  comingSoon?: boolean;
}

export interface ConnectedIntegration {
  id: string;
  providerId: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  config: Record<string, any>;
  verificationStatus: 'VALID' | 'INVALID' | 'PENDING';
  connectedAt?: string;
  connectedBy?: string;
}
```

---

## 🚀 Migration Strategy

### Phase 1: Backend API Implementation (Week 1-2)

1. ✅ Create system metadata API endpoint
2. ✅ Create tenant config API endpoint
3. ✅ Populate database with initial metadata
4. ✅ Add caching layer (Redis) for metadata
5. ✅ Write API tests

### Phase 2: Frontend Store Setup (Week 2-3)

1. ✅ Create Zustand store (or Context)
2. ✅ Add TypeScript types
3. ✅ Implement fetch functions
4. ✅ Add error handling
5. ✅ Add loading states

### Phase 3: Component Migration (Week 3-5)

**Priority Order:**

1. **High Priority (Week 3)**
   - Integration list page
   - Platform selector
   - Release type selector

2. **Medium Priority (Week 4)**
   - Build environment selector
   - Test management provider selector
   - Release status displays

3. **Low Priority (Week 5)**
   - Onboarding flow
   - Configuration wizard
   - Various dropdowns

### Phase 4: Testing & Rollout (Week 5-6)

1. ✅ Integration tests
2. ✅ E2E tests with dynamic config
3. ✅ Performance testing (cache effectiveness)
4. ✅ Gradual rollout to tenants
5. ✅ Monitor and fix issues

---

## 🧪 Testing Strategy

### Backend Tests

```typescript
describe('System Metadata API', () => {
  it('should return all available integrations', async () => {
    const response = await request(app).get('/api/v1/system/metadata');
    expect(response.status).toBe(200);
    expect(response.body.releaseManagement.integrations).toBeDefined();
  });
  
  it('should return platforms with correct structure', async () => {
    const response = await request(app).get('/api/v1/system/metadata');
    const platforms = response.body.releaseManagement.platforms;
    expect(platforms).toBeInstanceOf(Array);
    expect(platforms[0]).toHaveProperty('id');
    expect(platforms[0]).toHaveProperty('name');
  });
});

describe('Tenant Config API', () => {
  it('should return tenant-specific configuration', async () => {
    const response = await request(app)
      .get('/api/v1/tenants/tenant-123/config');
    expect(response.status).toBe(200);
    expect(response.body.tenantId).toBe('tenant-123');
  });
  
  it('should only return connected integrations', async () => {
    const response = await request(app)
      .get('/api/v1/tenants/tenant-123/config');
    const connected = response.body.releaseManagement.connectedIntegrations;
    Object.values(connected).forEach((integrations: any) => {
      integrations.forEach((integration: any) => {
        expect(integration.status).toBe('CONNECTED');
      });
    });
  });
});
```

### Frontend Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useConfigStore } from '~/stores/configStore';

describe('Config Store', () => {
  beforeEach(() => {
    // Reset store
    useConfigStore.setState({
      systemMetadata: null,
      tenantConfig: null,
    });
  });
  
  it('should fetch system metadata', async () => {
    const { result } = renderHook(() => useConfigStore());
    
    await result.current.fetchSystemMetadata();
    
    await waitFor(() => {
      expect(result.current.systemMetadata).not.toBeNull();
    });
  });
  
  it('should return available integrations', async () => {
    const { result } = renderHook(() => useConfigStore());
    
    await result.current.fetchSystemMetadata();
    
    const integrations = result.current.getAvailableIntegrations('SOURCE_CONTROL');
    expect(integrations).toBeInstanceOf(Array);
    expect(integrations.length).toBeGreaterThan(0);
  });
});
```

---

## 📊 Performance Considerations

### Backend Caching

```typescript
// Cache system metadata (changes rarely)
const METADATA_CACHE_TTL = 3600; // 1 hour

async function getSystemMetadata() {
  const cacheKey = 'system:metadata:v1';
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const metadata = await fetchMetadataFromDB();
  
  // Cache for 1 hour
  await redis.setex(cacheKey, METADATA_CACHE_TTL, JSON.stringify(metadata));
  
  return metadata;
}

// Cache tenant config (changes occasionally)
const TENANT_CONFIG_CACHE_TTL = 300; // 5 minutes

async function getTenantConfig(tenantId: string) {
  const cacheKey = `tenant:${tenantId}:config`;
  
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const config = await fetchTenantConfigFromDB(tenantId);
  await redis.setex(cacheKey, TENANT_CONFIG_CACHE_TTL, JSON.stringify(config));
  
  return config;
}

// Invalidate cache when integration is connected/disconnected
async function invalidateTenantConfigCache(tenantId: string) {
  await redis.del(`tenant:${tenantId}:config`);
}
```

### Frontend Caching

```typescript
// Zustand persist middleware caches in localStorage
// Config is loaded once and reused

// Optional: Add stale-while-revalidate pattern
export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      // ... existing code
      
      // Add timestamp
      lastFetchedAt: null,
      
      fetchSystemMetadata: async () => {
        const lastFetched = get().lastFetchedAt;
        const now = Date.now();
        
        // Only refetch if older than 5 minutes
        if (lastFetched && (now - lastFetched) < 5 * 60 * 1000) {
          return;
        }
        
        set({ isLoadingMetadata: true });
        // ... fetch logic
        set({ lastFetchedAt: now });
      },
    }),
    {
      name: 'delivr-config-storage',
    }
  )
);
```

---

## 🔒 Security Considerations

1. **Sensitive Data:** Don't expose sensitive config (API keys, tokens) in metadata
2. **Access Control:** Tenant config should be tenant-scoped (validate tenantId)
3. **Cache Invalidation:** Invalidate cache when permissions change
4. **Validation:** Validate all config data on backend before using

---

## 📈 Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Adding Integration** | Code change + deploy | Add to DB + API returns it |
| **Adding Platform** | Code change + deploy | Add to DB + API returns it |
| **Tenant Customization** | Not possible | Fully customizable per tenant |
| **Type Safety** | ✅ Yes | ✅ Yes (types in frontend) |
| **Flexibility** | ❌ Low | ✅ High |
| **Maintenance** | ❌ High (many files) | ✅ Low (single source) |
| **Performance** | ✅ Good (static) | ✅ Good (cached) |

---

## 🎯 Next Steps

1. **Review this plan** with the team
2. **Create backend migration** to populate metadata
3. **Implement Phase 1** (Backend APIs)
4. **Set up Zustand store** (Frontend state)
5. **Start migrating components** one by one
6. **Test thoroughly** with different tenant configs
7. **Deploy gradually** with feature flags

---

**Document Version:** 1.0
**Last Updated:** 2025-01-20
**Status:** Implementation Plan - Ready for Review

