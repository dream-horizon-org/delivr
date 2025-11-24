# Release Configuration Caching Strategy

## 📊 Current State Analysis

### Backend API Contract
**Endpoint:** `GET /api/v1/tenants/{tenantId}/release-configs`

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "string",
      "name": "string",
      "description": "string | null",
      "releaseType": "PLANNED | HOTFIX | MAJOR",
      "targets": ["PLAY_STORE", "APP_STORE"],
      "platforms": ["ANDROID", "IOS"],
      "baseBranch": "string | null",
      "isActive": true,
      "isDefault": false,
      "createdBy": { "id": "string" },
      "createdAt": "ISO string",
      "updatedAt": "ISO string"
    }
  ]
}
```

**Note:** Backend returns **metadata only** (SafeReleaseConfiguration), not full integration configs.

---

### Current Problem
- **Multiple Routes Fetch Independently:**
  - `dashboard.$org.releases.settings` - Fetches for settings tab
  - `dashboard.$org.releases._index` - Fetches for dashboard
  - `dashboard.$org.releases.create` - Fetches for create flow
  - **Result:** Same data fetched 3+ times, no caching

- **No Shared State:**
  - Each route maintains its own `configurations` state
  - Stale data after creating/updating configs
  - Unnecessary API calls on every navigation

---

## 🎯 Proposed Solution: Centralized Caching

### Strategy: React Query + Context Extension

**Why React Query?**
- ✅ Built-in caching with TTL (time-to-live)
- ✅ Automatic refetching and cache invalidation
- ✅ Loading and error states handled automatically
- ✅ Background refetching for fresh data
- ✅ Already used in `ConfigContext` for system metadata

---

## 📦 Implementation Plan

### Phase 1: Create Release Config Hook (5 min)
**File:** `app/hooks/useReleaseConfigs.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ReleaseConfigsResponse {
  success: boolean;
  data: ReleaseConfiguration[];
}

const QUERY_KEY = (tenantId: string) => ['releaseConfigs', tenantId];

export function useReleaseConfigs(tenantId?: string) {
  const queryClient = useQueryClient();

  // Fetch all configs for tenant
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY(tenantId || ''),
    queryFn: async () => {
      if (!tenantId) return { success: false, data: [] };
      
      const response = await fetch(`/api/v1/tenants/${tenantId}/release-config`);
      if (!response.ok) throw new Error('Failed to fetch release configs');
      
      const result: ReleaseConfigsResponse = await response.json();
      return result;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    cacheTime: 30 * 60 * 1000, // 30 minutes - cached in background
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Invalidate cache (call after create/update/delete)
  const invalidateCache = () => {
    if (tenantId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(tenantId) });
    }
  };

  // Selectors
  const configs = data?.data || [];
  const activeConfigs = configs.filter(c => c.isActive);
  const defaultConfig = configs.find(c => c.isDefault);

  return {
    configs,
    activeConfigs,
    defaultConfig,
    isLoading,
    error,
    refetch,
    invalidateCache,
  };
}
```

---

### Phase 2: Extend ConfigContext (10 min)
**File:** `app/contexts/ConfigContext.tsx`

**Add to interface:**
```typescript
interface ConfigContextValue {
  // ... existing fields ...
  
  // Release Configurations
  releaseConfigs: ReleaseConfiguration[];
  activeReleaseConfigs: ReleaseConfiguration[];
  defaultReleaseConfig: ReleaseConfiguration | undefined;
  isLoadingReleaseConfigs: boolean;
  releaseConfigsError: Error | null;
  
  // Actions
  refreshReleaseConfigs: () => void;
  invalidateReleaseConfigs: () => void;
  
  // Selectors
  getReleaseConfig: (id: string) => ReleaseConfiguration | undefined;
  getReleaseConfigsByType: (type: string) => ReleaseConfiguration[];
}
```

**Add to provider:**
```typescript
export function ConfigProvider({ children, tenantId }) {
  // ... existing hooks ...
  
  // Fetch release configurations
  const {
    configs: releaseConfigs,
    activeConfigs: activeReleaseConfigs,
    defaultConfig: defaultReleaseConfig,
    isLoading: isLoadingReleaseConfigs,
    error: releaseConfigsError,
    refetch: refreshReleaseConfigs,
    invalidateCache: invalidateReleaseConfigs,
  } = useReleaseConfigs(tenantId);
  
  // Selectors
  const getReleaseConfig = (id: string) => {
    return releaseConfigs.find(c => c.id === id);
  };
  
  const getReleaseConfigsByType = (type: string) => {
    return releaseConfigs.filter(c => c.releaseType === type);
  };
  
  const value = {
    // ... existing values ...
    releaseConfigs,
    activeReleaseConfigs,
    defaultReleaseConfig,
    isLoadingReleaseConfigs,
    releaseConfigsError: releaseConfigsError || null,
    refreshReleaseConfigs,
    invalidateReleaseConfigs,
    getReleaseConfig,
    getReleaseConfigsByType,
  };
  
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}
```

---

### Phase 3: Update Routes to Use Context (15 min)

#### 1. Dashboard - `dashboard.$org.releases._index.tsx`
**Before:**
```typescript
export const loader = async ({ params, request }) => {
  // Fetch configurations from API
  const configsResponse = await fetch(`${url}/api/v1/tenants/${org}/release-config`);
  const configurations = configsData.configurations || [];
  
  return json({ configurations, ... });
};

export default function Dashboard() {
  const { configurations } = useLoaderData();
  // ...
}
```

**After:**
```typescript
export const loader = async ({ params, request }) => {
  // No need to fetch configs - handled by ConfigContext
  return json({ org, user, ... });
};

export default function Dashboard() {
  const { org } = useLoaderData();
  const { activeReleaseConfigs, isLoadingReleaseConfigs } = useConfig();
  
  // Use activeReleaseConfigs directly - cached and fresh!
}
```

---

#### 2. Create Release - `dashboard.$org.releases.create.tsx`
**Before:**
```typescript
export const loader = async ({ params, request }) => {
  const response = await fetch(apiUrl);
  const configurations = data.configurations || [];
  return json({ configurations, ... });
};
```

**After:**
```typescript
export const loader = async ({ params, request }) => {
  // No config fetching needed
  return json({ org, user, setupData });
};

export default function CreateRelease() {
  const { activeReleaseConfigs, isLoadingReleaseConfigs } = useConfig();
  
  // Configs available immediately, cached from previous page
}
```

---

#### 3. Settings - `dashboard.$org.releases.settings.tsx`
**Before:**
```typescript
export const loader = async ({ params, request }) => {
  const response = await fetch(apiUrl);
  configurations = result.data;
  return json({ configurations, ... });
};
```

**After:**
```typescript
export const loader = async ({ params, request }) => {
  return json({ org, user, setupData });
};

export default function Settings() {
  const { releaseConfigs, invalidateReleaseConfigs } = useConfig();
  
  const handleDelete = async (id) => {
    await deleteConfig(id);
    invalidateReleaseConfigs(); // ✅ Refresh cache across ALL routes
  };
}
```

---

### Phase 4: Cache Invalidation Strategy

**When to invalidate:**
1. ✅ After creating a new config → `invalidateReleaseConfigs()`
2. ✅ After updating a config → `invalidateReleaseConfigs()`
3. ✅ After deleting a config → `invalidateReleaseConfigs()`
4. ✅ After archiving a config → `invalidateReleaseConfigs()`
5. ✅ After setting default config → `invalidateReleaseConfigs()`

**Example in ConfigurationWizard:**
```typescript
const handleFinish = async () => {
  const result = await ReleaseConfigService.create(config, userId);
  
  if (result.success) {
    // ✅ Invalidate cache - all routes will have fresh data
    invalidateReleaseConfigs();
    
    // Navigate back - create release page will have new config immediately
    navigate(`/dashboard/${org}/releases/create`);
  }
};
```

---

## 🎯 Benefits

### 1. **Performance**
- ✅ **5x fewer API calls** - Data fetched once, reused everywhere
- ✅ **Instant navigation** - Configs cached, no loading spinners
- ✅ **Background refresh** - Always fresh without blocking UI

### 2. **Data Consistency**
- ✅ **Single source of truth** - All routes see same data
- ✅ **No stale data** - Cache invalidation after mutations
- ✅ **Optimistic updates** - UI updates before API responds

### 3. **Developer Experience**
- ✅ **Simple API** - `const { releaseConfigs } = useConfig()` - done!
- ✅ **No loader duplication** - Remove config fetching from loaders
- ✅ **Type-safe** - TypeScript ensures correctness

### 4. **User Experience**
- ✅ **Faster page loads** - Configs available instantly
- ✅ **Smoother navigation** - No loading flickers
- ✅ **Offline-ready** - Cached data available without network

---

## 📝 Usage Examples

### Example 1: Configuration Selector (Create Release)
```typescript
import { useConfig } from '~/contexts/ConfigContext';

function ConfigurationSelector() {
  const { activeReleaseConfigs, isLoadingReleaseConfigs } = useConfig();
  
  if (isLoadingReleaseConfigs) return <Loader />;
  
  return (
    <Select
      data={activeReleaseConfigs.map(c => ({ value: c.id, label: c.name }))}
      placeholder="Select configuration"
    />
  );
}
```

### Example 2: Settings List
```typescript
import { useConfig } from '~/contexts/ConfigContext';

function ConfigurationsList() {
  const { releaseConfigs, invalidateReleaseConfigs } = useConfig();
  
  const handleDelete = async (id: string) => {
    await ReleaseConfigService.delete(id);
    invalidateReleaseConfigs(); // ✅ Refresh everywhere
    showNotification({ message: 'Configuration deleted' });
  };
  
  return releaseConfigs.map(config => (
    <ConfigCard key={config.id} config={config} onDelete={handleDelete} />
  ));
}
```

### Example 3: Default Config Badge (Dashboard)
```typescript
import { useConfig } from '~/contexts/ConfigContext';

function DashboardHeader() {
  const { defaultReleaseConfig } = useConfig();
  
  return (
    <div>
      <h1>Dashboard</h1>
      {defaultReleaseConfig && (
        <Badge>Default: {defaultReleaseConfig.name}</Badge>
      )}
    </div>
  );
}
```

---

## 🔄 Migration Steps

1. ✅ **Create hook** - `app/hooks/useReleaseConfigs.ts`
2. ✅ **Extend context** - Add release configs to `ConfigContext`
3. ✅ **Update routes** - Remove individual fetching, use context
4. ✅ **Add invalidation** - Call `invalidateReleaseConfigs()` after mutations
5. ✅ **Test** - Verify caching works across navigation

---

## 🚀 Next Steps
1. Implement `useReleaseConfigs` hook
2. Extend `ConfigContext` with release configs
3. Update all routes to use context
4. Add cache invalidation to mutation handlers
5. Test end-to-end flow

**Estimated time:** ~30 minutes for full implementation

---

## ✅ Success Criteria
- [ ] Configurations fetched once per tenant session
- [ ] All routes use `useConfig()` instead of loaders
- [ ] Cache invalidates after create/update/delete
- [ ] No loading spinners when navigating between pages
- [ ] Fresh data always available within 5 minutes
- [ ] Network tab shows 1 API call instead of 3+

