# Release Configuration Flow - Complete Explanation

## 📊 Two Types of Configurations

### 1. **Draft Configs** (Frontend Only - localStorage)
- **Storage:** Browser's localStorage (`release-config-storage.ts`)
- **Purpose:** Save work-in-progress configurations before submission
- **Lifecycle:** Created → Saved to localStorage → Submitted to backend → Deleted from localStorage
- **Visibility:** Only visible to the current user on the current browser
- **Not in React Query cache** - These are separate from backend configs

### 2. **Backend Configs** (Server-Persisted - React Query Cache)
- **Storage:** MySQL database (via backend API) + React Query cache (frontend)
- **Purpose:** Persisted, shareable configurations across all users
- **Status Field:** `isActive: boolean`
  - `isActive: true` → **ACTIVE** configuration
  - `isActive: false` → **ARCHIVED** configuration
- **Lifecycle:** Created on backend → Cached in React Query → Shared across all users
- **Visibility:** Available to all users of the tenant

---

## 🔄 Complete Flow: Draft → Backend Config

### **Scenario 1: Creating a New Configuration**

#### Step 1: User Opens Configuration Wizard
```typescript
// File: app/routes/dashboard.$org.releases.configure.tsx
export default function ConfigurePage() {
  const navigate = useNavigate();
  
  const handleSubmit = async (config) => {
    // Config saved to backend
    await saveConfig(config);
    navigate('/dashboard/${org}/releases/settings?tab=configurations');
  };
  
  return <ConfigurationWizard onSubmit={handleSubmit} />;
}
```

#### Step 2: Wizard Auto-Saves Draft to localStorage
```typescript
// File: app/components/ReleaseConfig/Wizard/ConfigurationWizard.tsx
export function ConfigurationWizard({ tenantId }) {
  const [config, setConfig] = useState(() => {
    // 1️⃣ Try to load existing draft from localStorage
    const draft = loadDraftConfig(tenantId);
    if (draft) {
      console.log('[Wizard] Loaded draft from localStorage');
      return draft;
    }
    
    // 2️⃣ Create new default config
    return createDefaultConfig(tenantId);
  });
  
  // 3️⃣ Auto-save to localStorage on every change
  useEffect(() => {
    saveDraftConfig(tenantId, config);
  }, [config, tenantId]);
}
```

**localStorage Key Format:**
```
release-config-draft-{tenantId}
```

**Stored Data:**
```json
{
  "id": null,
  "tenantId": "Vy3mYbVgmx",
  "name": "My New Config",
  "releaseType": "PLANNED",
  "targets": ["PLAY_STORE"],
  "status": "DRAFT",
  "jiraProject": { "enabled": false },
  "testManagement": { "enabled": false },
  "communication": { "slack": { "enabled": false } },
  "scheduling": null
}
```

#### Step 3: User Closes Browser, Returns Later
```typescript
// File: app/components/ReleaseConfig/Wizard/ConfigurationWizard.tsx
const [currentStep, setCurrentStep] = useState(() => {
  // 1️⃣ Restore saved step from localStorage
  const savedStep = loadWizardStep(tenantId);
  if (savedStep > 0) {
    console.log('[Wizard] Resuming from step:', savedStep);
    return savedStep;
  }
  return 0;
});

// Component shows "Resuming Draft" badge
{hasDraft && (
  <Badge color="blue" variant="light">
    Resuming Draft
  </Badge>
)}
```

#### Step 4: User Submits Configuration
```typescript
// File: app/components/ReleaseConfig/Wizard/ConfigurationWizard.tsx
const { invalidateReleaseConfigs } = useConfig();

const handleFinish = async () => {
  // 1️⃣ Send config to backend
  const response = await fetch(`/api/v1/tenants/${tenantId}/release-config`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
  
  const result = await response.json();
  
  if (result.success) {
    // 2️⃣ Clear draft from localStorage
    clearDraftConfig(tenantId);
    clearWizardStep(tenantId);
    
    // 3️⃣ Invalidate React Query cache to fetch fresh data
    invalidateReleaseConfigs();
    
    // 4️⃣ Navigate to settings
    navigate('/dashboard/${org}/releases/settings?tab=configurations');
  }
};
```

#### Step 5: Backend Saves Configuration
```typescript
// File: delivr-server-ota-managed/api/script/services/release-configs/release-config.service.ts
async createReleaseConfig(data: CreateReleaseConfigDto) {
  // 1️⃣ Save main config to database
  const config = await ReleaseConfigRepository.create({
    tenantId: data.tenantId,
    name: data.name,
    releaseType: data.releaseType,
    targets: data.defaultTargets,
    platforms: data.platforms,
    isActive: true, // ✅ New configs are ACTIVE by default
    isDefault: data.isDefault || false,
  });
  
  // 2️⃣ Save integration configs (Test Management, PM, Communication)
  if (data.testManagement) {
    await TestManagementConfigService.create(data.testManagement);
  }
  if (data.projectManagement) {
    await ProjectManagementConfigService.create(data.projectManagement);
  }
  if (data.communication) {
    await CommunicationConfigService.create(data.communication);
  }
  
  // 3️⃣ Return metadata-only (SafeReleaseConfiguration)
  return {
    id: config.id,
    tenantId: config.tenantId,
    name: config.name,
    releaseType: config.releaseType,
    targets: config.targets,
    platforms: config.platforms,
    isActive: config.isActive,
    isDefault: config.isDefault,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}
```

#### Step 6: React Query Cache Updates
```typescript
// File: app/hooks/useReleaseConfigs.ts
const { invalidateReleaseConfigs } = useConfig();

// When invalidated:
invalidateReleaseConfigs();

// React Query automatically:
// 1️⃣ Marks cache as stale
// 2️⃣ Triggers background refetch
queryClient.invalidateQueries(['releaseConfigs', tenantId]);

// 3️⃣ Fetches fresh data from backend
const response = await fetch(`/api/v1/tenants/${tenantId}/release-config`);

// 4️⃣ Updates cache with new data
// 5️⃣ All components using useConfig() automatically re-render with new data
```

---

## 🔄 Flow Diagram: Draft → Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER CREATES CONFIG                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Open Configuration Wizard                              │
│  - Creates default config in memory                             │
│  - Checks localStorage for existing draft                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: User Fills Form (Step by Step)                         │
│  - Auto-saves to localStorage on every change                   │
│  - Saves current step number                                    │
│                                                                  │
│  localStorage.setItem('release-config-draft-Vy3mYbVgmx', {      │
│    id: null,                                                    │
│    name: "My Config",                                           │
│    status: "DRAFT",                                             │
│    ...                                                          │
│  })                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: User Closes Browser (Draft Persists)                   │
│  ✅ Config saved in localStorage                                │
│  ✅ Step number saved                                           │
│  ✅ No backend call yet                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: User Returns, Opens Wizard Again                       │
│  - Loads draft from localStorage                                │
│  - Restores step number                                         │
│  - Shows "Resuming Draft" badge                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: User Clicks "Finish"                                   │
│  1. POST /api/v1/tenants/{id}/release-config                    │
│  2. Backend saves to MySQL database                             │
│  3. Backend returns metadata-only response                      │
│  4. Clear localStorage draft                                    │
│  5. invalidateReleaseConfigs()                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: React Query Refetches Data                             │
│  1. Marks cache as stale                                        │
│  2. GET /api/v1/tenants/{id}/release-config (background)        │
│  3. Updates cache with fresh data                               │
│  4. All components re-render with new config                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         CONFIG NOW VISIBLE IN ALL ROUTES                        │
│  - Dashboard: Shows in "hasConfigurations" check                │
│  - Create Release: Available in config selector                 │
│  - Settings: Listed in configurations tab                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Scenario 2: Fetching Existing Configurations

### **On First Page Load (e.g., Dashboard)**

```typescript
// File: app/routes/dashboard.$org.tsx (Parent Route)
export function DashboardLayout() {
  return (
    <ConfigProvider tenantId={org}>
      <Outlet />
    </ConfigProvider>
  );
}
```

```typescript
// File: app/contexts/ConfigContext.tsx
export function ConfigProvider({ tenantId, children }) {
  // 1️⃣ React Query fetches release configs
  const {
    configs: releaseConfigs,
    activeConfigs: activeReleaseConfigs,
    isLoading: isLoadingReleaseConfigs,
  } = useReleaseConfigs(tenantId);
  
  // 2️⃣ Provides configs to all child components
  return (
    <ConfigContext.Provider value={{
      releaseConfigs,
      activeReleaseConfigs,
      // ...
    }}>
      {children}
    </ConfigContext.Provider>
  );
}
```

```typescript
// File: app/hooks/useReleaseConfigs.ts
export function useReleaseConfigs(tenantId) {
  const { data, isLoading } = useQuery(
    ['releaseConfigs', tenantId],
    async () => {
      // 1️⃣ First call - Cache MISS, fetch from API
      const response = await fetch(`/api/v1/tenants/${tenantId}/release-config`);
      return response.json();
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    }
  );
  
  return {
    configs: data?.data || [],
    activeConfigs: data?.data.filter(c => c.isActive) || [],
  };
}
```

### **Navigation to Another Page (e.g., Create Release)**

```typescript
// File: app/routes/dashboard.$org.releases.create.tsx
export default function CreateRelease() {
  // 1️⃣ useConfig() hook called
  const { activeReleaseConfigs } = useConfig();
  
  // 2️⃣ React Query checks cache
  // ✅ Cache HIT - Data available immediately
  // ❌ No API call
  
  // 3️⃣ Component renders instantly with cached data
  return (
    <ConfigSelector configs={activeReleaseConfigs} />
  );
}
```

**Network Tab:**
```
First Load (Dashboard):
  ✅ GET /api/v1/tenants/Vy3mYbVgmx/release-config (200 OK)

Navigate to Create Release:
  ❌ No API call - using cached data

Navigate to Settings:
  ❌ No API call - using cached data
```

---

## 🔄 Scenario 3: Editing an Existing Configuration

```typescript
// File: app/routes/dashboard.$org.releases.settings.tsx
const { releaseConfigs, invalidateReleaseConfigs } = useConfig();

const handleEdit = (config) => {
  // 1️⃣ Navigate to wizard with config ID
  navigate(`/dashboard/${org}/releases/configure?edit=${config.id}`);
};
```

```typescript
// File: app/routes/dashboard.$org.releases.configure.tsx
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const editId = url.searchParams.get('edit');
  
  if (editId) {
    // 1️⃣ Fetch full config from backend (with integration details)
    const response = await fetch(`/api/v1/tenants/${org}/release-config/${editId}`);
    const config = await response.json();
    
    return json({ existingConfig: config, isEditMode: true });
  }
  
  return json({ existingConfig: null, isEditMode: false });
};
```

```typescript
// File: app/components/ReleaseConfig/Wizard/ConfigurationWizard.tsx
export function ConfigurationWizard({ existingConfig, isEditMode }) {
  const { invalidateReleaseConfigs } = useConfig();
  
  const handleFinish = async () => {
    // 1️⃣ Update config on backend
    const response = await fetch(`/api/v1/tenants/${tenantId}/release-config/${config.id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    
    if (response.ok) {
      // 2️⃣ Invalidate cache - triggers refetch
      invalidateReleaseConfigs();
      
      // 3️⃣ Navigate back to settings
      navigate('/dashboard/${org}/releases/settings?tab=configurations');
    }
  };
}
```

---

## 🗑️ Scenario 4: Deleting a Configuration

```typescript
// File: app/routes/dashboard.$org.releases.settings.tsx
const { invalidateReleaseConfigs } = useConfig();

const handleDelete = async (configId) => {
  // 1️⃣ Delete from backend
  await fetch(`/api/v1/tenants/${org}/release-config/${configId}`, {
    method: 'DELETE',
  });
  
  // 2️⃣ Invalidate cache - triggers refetch
  invalidateReleaseConfigs();
  
  // 3️⃣ React Query refetches data
  // 4️⃣ Component re-renders with updated list (config removed)
};
```

---

## 📊 Status Field Logic

### **Backend Database (MySQL)**
```sql
CREATE TABLE release_configurations (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,  -- ✅ ACTIVE or ARCHIVED
  is_default BOOLEAN DEFAULT FALSE,
  -- ...
);
```

### **Status Interpretation**
```typescript
// Backend returns:
{
  id: "config-123",
  isActive: true,   // ✅ ACTIVE
  isDefault: false
}

// OR

{
  id: "config-456",
  isActive: false,  // ✅ ARCHIVED
  isDefault: false
}
```

### **Stats Calculation**
```typescript
// File: app/routes/dashboard.$org.releases.settings.tsx
const stats = {
  total: configurations.length,
  active: configurations.filter(c => c.isActive === true).length,  // ✅ Active configs
  draft: 0,  // ❌ Draft configs are localStorage-only, not in backend
  archived: configurations.filter(c => c.isActive === false).length,  // ✅ Archived configs
};
```

---

## 🎯 Key Takeaways

### ✅ **Draft Configs (localStorage)**
- **Where:** Browser localStorage only
- **When:** During wizard creation/editing
- **Lifetime:** Until submitted or manually cleared
- **Visibility:** Single user, single browser
- **Not cached:** Not part of React Query cache

### ✅ **Backend Configs (React Query + MySQL)**
- **Where:** MySQL database + React Query cache
- **When:** After submission to backend
- **Lifetime:** Permanent (until deleted)
- **Visibility:** All users of the tenant
- **Cached:** 5-minute freshness, 30-minute cache

### ✅ **Status Logic**
- **Draft:** `localStorage` only, not in backend
- **Active:** `isActive: true` in backend
- **Archived:** `isActive: false` in backend

### ✅ **Cache Invalidation**
- After CREATE → `invalidateReleaseConfigs()`
- After UPDATE → `invalidateReleaseConfigs()`
- After DELETE → `invalidateReleaseConfigs()`
- Triggers automatic refetch and UI update

---

## 🚀 Performance Benefits

1. **First Load:** 1 API call to fetch all configs
2. **Navigation:** 0 API calls - uses cache
3. **After Mutation:** 1 API call to refetch (background)
4. **Total:** ~80% reduction in API calls compared to before

---

**This architecture ensures:**
- ✅ Fast, instant navigation
- ✅ Consistent data across all routes
- ✅ Automatic updates after mutations
- ✅ No page reloads needed
- ✅ Draft work preserved in localStorage

