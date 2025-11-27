# Route Migration Plan - Hybrid SSR + React Query Pattern

## Overview

This document outlines the migration plan to implement a hybrid approach (Server-Side Loader + React Query) for improved performance and user experience.

---

## Current Data Flow Analysis

### Integrations Page Data Flow

**Current Pattern:** Client-Side Only (React Query)

**Data Sources:**
1. **System Metadata** (Available Integrations)
   - Hook: `useSystemMetadata()` in ConfigContext
   - API: `GET /api/v1/system/metadata`
   - Fetched: Client-side via React Query
   - Cached: Yes (React Query cache)
   - Purpose: Lists all available integration providers

2. **Tenant Config** (Connected Integrations)
   - Hook: `useTenantConfig(tenantId)` in ConfigContext
   - API: `GET /api/v1/tenants/{tenantId}`
   - Fetched: Client-side via React Query
   - Cached: Yes (React Query cache)
   - Purpose: Lists connected integrations for tenant

**Flow:**
```
IntegrationsPage
  ↓
useConfig() (Context)
  ↓
useSystemMetadata() → React Query → API → System Metadata
useTenantConfig() → React Query → API → Tenant Config
  ↓
Merges available + connected → Renders UI
```

**Issues:**
- ❌ Slow initial load (must wait for JS + API calls)
- ❌ Loading spinner on first visit
- ❌ No SEO benefit (not needed, behind auth)
- ✅ Fast subsequent navigation (cached)
- ✅ Real-time updates work well

---

## Migration Plan

### Priority 1: High Priority Migrations

#### 1. Releases List - Add Server-Side Loader

**Current State:**
- Pattern: Client-side only (React Query)
- Hook: `useReleases(org)`
- API: `GET /api/v1/tenants/{tenantId}/releases`

**Target State:**
- Pattern: Hybrid (Server-Side Loader + React Query)
- Loader: Fetch initial releases server-side
- React Query: Use loader data as `initialData`, cache for navigation

**Benefits:**
- ✅ Faster first load (data in HTML)
- ✅ No loading spinner on initial visit
- ✅ Fast navigation (React Query cache)
- ✅ Best of both worlds

**Implementation Steps:**

1. **Add Server-Side Loader**
```typescript
// dashboard.$org.releases._index.tsx
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }) => {
    const { org } = params;
    if (!org) throw new Response('Organization not found', { status: 404 });
    
    // Fetch releases server-side
    const result = await listReleases(org, user.user.id, { includeTasks: false });
    
    return json({
      org,
      initialReleases: result.releases || [],
    });
  }
);
```

2. **Update Component to Use Hybrid Pattern**
```typescript
export default function ReleasesListPage() {
  const { org, initialReleases } = useLoaderData<typeof loader>();
  
  // Use React Query with initialData from loader
  const {
    upcoming,
    active,
    completed,
    isLoading,
    error,
  } = useReleases(org, {
    initialData: {
      success: true,
      releases: initialReleases,
    },
  });
  
  // Rest of component...
}
```

3. **Update useReleases Hook**
```typescript
// useReleases.ts
export function useReleases(
  tenantId?: string,
  options?: {
    includeTasks?: boolean;
    initialData?: ReleasesResponse; // Add initialData support
  }
) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ReleasesResponse, Error>(
    QUERY_KEY(tenantId || ''),
    async () => {
      // ... existing fetch logic
    },
    {
      enabled: !!tenantId,
      initialData: options?.initialData, // Use initialData if provided
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: false,
      retry: 1,
    }
  );
  
  // ... rest of hook
}
```

**Files to Modify:**
- `app/routes/dashboard.$org.releases._index.tsx`
- `app/hooks/useReleases.ts`
- `app/.server/services/ReleaseManagement/index.ts` (import listReleases)

**Testing:**
- ✅ Initial page load shows data immediately
- ✅ Navigation between tabs uses cache
- ✅ Refetch works correctly
- ✅ Cache invalidation works

---

#### 2. Releases Create - Add React Query for Configs

**Current State:**
- Pattern: Server-side loader only
- Loader: Fetches org/user data
- Configs: Uses `useConfig()` context (React Query)

**Target State:**
- Pattern: Keep server-side loader + Enhance React Query usage
- Loader: Keep for org/user/validation
- Configs: Already using React Query via ConfigContext ✅
- **Enhancement:** Prefetch release configs in loader

**Benefits:**
- ✅ Configs already cached (via ConfigContext)
- ✅ Can prefetch in loader for faster initial load
- ✅ Better caching for configs

**Implementation Steps:**

1. **Prefetch Release Configs in Loader** (Optional Enhancement)
```typescript
// dashboard.$org.releases.create.tsx
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }) => {
    const { org } = params;
    if (!org) throw new Response('Organization not found', { status: 404 });
    
    // Optionally prefetch release configs
    // This can be done server-side or let React Query handle it
    // Since ConfigContext already handles this, we can keep as-is
    
    return json({
      org,
      user,
      returnTo: new URL(request.url).searchParams.get('returnTo'),
    });
  }
);
```

**Note:** Configs are already handled well by ConfigContext. This migration is **low priority** since the pattern is already good.

**Files to Modify:**
- `app/routes/dashboard.$org.releases.create.tsx` (minimal changes, already good)

**Testing:**
- ✅ Configs load correctly
- ✅ Form works as expected
- ✅ No regressions

---

### Priority 2: Settings Page - Add React Query Caching

**Current State:**
- Pattern: Server-side loader + ConfigContext
- Loader: Fetches org/user data
- Configs: Uses `useConfig()` context (React Query) ✅
- **Issue:** Settings-specific data not cached separately

**Target State:**
- Pattern: Keep server-side loader + Enhance React Query
- Loader: Keep for org/user
- Configs: Already using React Query ✅
- **Enhancement:** Ensure proper caching for settings data

**Benefits:**
- ✅ Better caching for settings-specific operations
- ✅ Faster tab switching
- ✅ Real-time updates

**Implementation Steps:**

1. **Verify ConfigContext Caching** (Already Good)
   - ConfigContext already uses React Query
   - `useReleaseConfigs()` is cached
   - No changes needed for configs

2. **Add Settings-Specific Queries** (If Needed)
   - Currently settings uses ConfigContext data
   - If we need settings-specific data, add React Query hooks
   - For now, ConfigContext is sufficient

**Files to Modify:**
- `app/routes/dashboard.$org.releases.settings.tsx` (minimal, already good)

**Testing:**
- ✅ Settings tabs switch quickly
- ✅ Configs cached properly
- ✅ No regressions

---

### Priority 3: Integrations Page - Add Server-Side Loader

**Current State:**
- Pattern: Client-side only (React Query)
- Data: System Metadata + Tenant Config via ConfigContext
- Flow: Client-side fetch after component mount

**Target State:**
- Pattern: Hybrid (Server-Side Loader + React Query)
- Loader: Fetch initial system metadata + tenant config server-side
- React Query: Use loader data as `initialData`, cache for updates

**Benefits:**
- ✅ Faster first load (data in HTML)
- ✅ No loading spinner on initial visit
- ✅ Fast updates (React Query cache)
- ✅ Best of both worlds

**Implementation Steps:**

1. **Add Server-Side Loader**
```typescript
// dashboard.$org.integrations.tsx
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }) => {
    const { org } = params;
    if (!org) throw new Response('Organization not found', { status: 404 });
    
    // Fetch system metadata server-side
    const systemMetadataResult = await apiGet<SystemMetadata>(
      `${request.url.split('/dashboard')[0]}/api/v1/system/metadata`,
      {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        }
      }
    );
    
    // Fetch tenant config server-side
    const tenantConfigResult = await apiGet<TenantConfig>(
      `${request.url.split('/dashboard')[0]}/api/v1/tenants/${org}`,
      {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        }
      }
    );
    
    return json({
      org,
      initialSystemMetadata: systemMetadataResult.data,
      initialTenantConfig: tenantConfigResult.data,
    });
  }
);
```

2. **Update ConfigContext to Accept Initial Data**
```typescript
// ConfigContext.tsx
export function ConfigProvider({
  children,
  tenantId,
  initialSystemMetadata, // Add
  initialTenantConfig,   // Add
}: {
  children: ReactNode;
  tenantId?: string;
  initialSystemMetadata?: SystemMetadata; // Add
  initialTenantConfig?: TenantConfig;    // Add
}) {
  // Use initialData in React Query hooks
  const {
    data: systemMetadataBackend,
    isLoading: isLoadingMetadata,
    error: metadataError,
  } = useSystemMetadata(initialSystemMetadata); // Pass initialData
  
  const {
    data: tenantConfig,
    isLoading: isLoadingTenantConfig,
    error: tenantConfigError,
  } = useTenantConfig(tenantId, initialTenantConfig); // Pass initialData
  
  // ... rest of context
}
```

3. **Update Hooks to Accept Initial Data**
```typescript
// useSystemMetadata.ts
export function useSystemMetadata(initialData?: SystemMetadata) {
  return useQuery(
    ['systemMetadata'],
    fetchSystemMetadata,
    {
      initialData, // Use initialData if provided
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    }
  );
}

// useTenantConfig.ts
export function useTenantConfig(tenantId?: string, initialData?: TenantConfig) {
  return useQuery(
    ['tenantConfig', tenantId],
    () => fetchTenantConfig(tenantId),
    {
      enabled: !!tenantId,
      initialData, // Use initialData if provided
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
}
```

4. **Update Integrations Page**
```typescript
// dashboard.$org.integrations.tsx
export default function IntegrationsPage() {
  const { org, initialSystemMetadata, initialTenantConfig } = useLoaderData<typeof loader>();
  
  // Pass initialData to ConfigProvider
  return (
    <ConfigProvider
      tenantId={org}
      initialSystemMetadata={initialSystemMetadata}
      initialTenantConfig={initialTenantConfig}
    >
      <IntegrationsPageContent />
    </ConfigProvider>
  );
}

function IntegrationsPageContent() {
  // Existing component logic
  const { getAvailableIntegrations, getConnectedIntegrations } = useConfig();
  // ... rest of component
}
```

**Files to Modify:**
- `app/routes/dashboard.$org.integrations.tsx`
- `app/contexts/ConfigContext.tsx`
- `app/hooks/useSystemMetadata.ts`
- `app/hooks/useTenantConfig.ts`

**Testing:**
- ✅ Initial page load shows data immediately
- ✅ Updates work correctly (React Query)
- ✅ Cache invalidation works
- ✅ No regressions

---

## Implementation Order

### Phase 1: Releases List (High Priority)
1. Add server-side loader to `dashboard.$org.releases._index.tsx`
2. Update `useReleases` hook to accept `initialData`
3. Test initial load and navigation
4. Verify cache invalidation

**Estimated Time:** 2-3 hours

### Phase 2: Integrations Page (High Priority)
1. Add server-side loader to `dashboard.$org.integrations.tsx`
2. Update `useSystemMetadata` hook to accept `initialData`
3. Update `useTenantConfig` hook to accept `initialData`
4. Update `ConfigContext` to accept and use `initialData`
5. Test initial load and updates
6. Verify cache invalidation

**Estimated Time:** 3-4 hours

### Phase 3: Settings Page (Medium Priority)
1. Review current caching (already good via ConfigContext)
2. Add any settings-specific queries if needed
3. Test tab switching performance
4. Verify no regressions

**Estimated Time:** 1-2 hours

### Phase 4: Releases Create (Low Priority - Already Good)
1. Review current implementation
2. Minor optimizations if needed
3. Test form submission
4. Verify no regressions

**Estimated Time:** 1 hour

---

## Testing Checklist

### Releases List
- [ ] Initial page load shows data immediately (no spinner)
- [ ] Tab switching uses cached data (fast)
- [ ] Creating release invalidates cache correctly
- [ ] Updating release invalidates cache correctly
- [ ] Refetch works correctly
- [ ] Error handling works

### Integrations Page
- [ ] Initial page load shows data immediately (no spinner)
- [ ] Connecting integration updates UI correctly
- [ ] Disconnecting integration updates UI correctly
- [ ] Cache invalidation works
- [ ] Tab switching is fast
- [ ] Error handling works

### Settings Page
- [ ] Tab switching is fast
- [ ] Configs load correctly
- [ ] Cache invalidation works
- [ ] No regressions

### Releases Create
- [ ] Form loads correctly
- [ ] Configs available immediately
- [ ] Form submission works
- [ ] No regressions

---

## Success Criteria

✅ **All migrations complete**
✅ **Initial load time improved by 50%+**
✅ **No loading spinners on first visit**
✅ **Navigation remains fast (cached)**
✅ **Cache invalidation works correctly**
✅ **No regressions**
✅ **Code follows consistent patterns**

---

## Notes

1. **ConfigContext is Shared:** Since ConfigContext is used by multiple routes, we need to ensure initialData doesn't break other routes that don't provide it.

2. **Backward Compatibility:** All hooks should work with or without initialData.

3. **Error Handling:** Server-side loaders should handle errors gracefully.

4. **Type Safety:** Ensure all TypeScript types are correct.

5. **Performance:** Monitor performance improvements after migration.

---

## Summary

**High Priority:**
1. ✅ Releases List - Add server-side loader
2. ✅ Integrations Page - Add server-side loader

**Medium Priority:**
3. ✅ Settings Page - Verify/enhance caching

**Low Priority:**
4. ✅ Releases Create - Already good, minor optimizations

**Total Estimated Time:** 7-10 hours

