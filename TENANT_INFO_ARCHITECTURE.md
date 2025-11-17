# Tenant Info Architecture

## 🎯 Overview

This document explains how tenant information is fetched and shared across the application, eliminating redundant API calls.

---

## 📊 Architecture Pattern: Layout Route Data Sharing

```
┌─────────────────────────────────────────┐
│   dashboard.$org.tsx (Parent Layout)   │
│   ✅ Fetches tenant info ONCE          │
│   GET /api/v1/tenants/:tenantId        │
└──────────────┬──────────────────────────┘
               │
               ├─── useRouteLoaderData('routes/dashboard.$org')
               │
    ┌──────────┼──────────┬──────────┬──────────┐
    │          │          │          │          │
    v          v          v          v          v
┌─────────┐ ┌────────┐ ┌──────┐ ┌──────────┐ ┌─────┐
│ Releases│ │ Setup  │ │ Apps │ │Integration│ │ ... │
│         │ │        │ │      │ │          │ │     │
└─────────┘ └────────┘ └──────┘ └──────────┘ └─────┘
     ↑
     │ Re-fetch ONLY after mutations
     └─── Action: CodepushService.getTenantInfo()
```

---

## 🔑 Key Components

### 1. **Parent Layout Loader** ✅
**File**: `app/routes/dashboard.$org.tsx`

```typescript
export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org: tenantId } = params;

  if (!tenantId) {
    throw new Response('Organization not found', { status: 404 });
  }

  try {
    // ✅ SINGLE SOURCE OF TRUTH - Called ONCE per org navigation
    const response = await CodepushService.getTenantInfo({
      userId: user.user.id,
      tenantId
    });

    return json({
      tenantId,
      organisation: response.data.organisation,
      user
    });
  } catch (error) {
    console.error('[OrgLayout] Error loading tenant info:', error);
    throw new Response('Failed to load organization', { status: 500 });
  }
});

export type OrgLayoutLoaderData = {
  tenantId: string;
  organisation: Organization;
  user: any;
};
```

**Backend API**: `GET ${DELIVR_BACKEND_URL}/api/v1/tenants/:tenantId`

---

### 2. **Child Routes Access Shared Data** ✅
**Pattern**: All child routes use `useRouteLoaderData` to access parent data

**Example**: `app/routes/dashboard.$org.releases.setup.tsx`
```typescript
import type { OrgLayoutLoaderData } from './dashboard.$org';

export default function ReleaseSetupPage() {
  // ✅ NO API CALL - Use parent's data
  const orgData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  
  if (!orgData) {
    throw new Error('Organization data not loaded');
  }

  const { tenantId, organisation } = orgData;
  
  // Use organisation.releaseManagement, etc.
}
```

**Other child routes using this pattern**:
- ✅ `dashboard.$org.releases.tsx`
- ✅ `dashboard.$org.integrations.tsx`
- ✅ `dashboard.$org.releases.setup.tsx`

---

### 3. **Re-fetch After Mutations** ✅
**When**: Only when data changes (e.g., completing a setup step)

**Example**: `app/routes/dashboard.$org.releases.setup.tsx` (action)
```typescript
export const action = authenticateActionRequest({
  [ActionMethods.POST]: async ({ request, params, user }) => {
    const { org } = params;
    
    if (actionType === 'save') {
      // User just completed a setup step (e.g., connected GitHub)
      // ✅ Re-fetch to get UPDATED setupComplete status
      const response = await CodepushService.getTenantInfo({ 
        tenantId: org,
        userId: user.user.id 
      });
      const organisation = response.data.organisation;
      
      if (organisation.releaseManagement?.setupComplete) {
        return redirect(`/dashboard/${org}/releases`);
      }
      
      return json({ success: true });
    }
  }
});
```

**Why this is OK**:
- ✅ Only happens AFTER a mutation (save action)
- ✅ Checks if setup is NOW complete
- ✅ Necessary for conditional redirect logic

---

## ❌ Deleted Legacy Components

### 1. **`useTenantInfo.ts` Hook** ❌ DELETED
- **Reason**: Redundant - All components now use `useRouteLoaderData`
- **Was using**: React Query to fetch `/api/v1/tenants/:tenantId/info`
- **Replaced by**: Parent layout loader data

### 2. **`api.v1.tenants.$tenantId.info.ts` BFF Route** ❌ DELETED
- **Reason**: Only used by deleted hook
- **Was proxying**: `GET /api/v1/tenants/:tenantId` from backend
- **Replaced by**: Direct loader call in parent layout

---

## 📈 Performance Improvement

### Before (Redundant Calls)
```
User navigates to /dashboard/org123/releases/setup
  ├─ Layout loader:    GET /api/v1/tenants/org123  ❌
  ├─ Setup loader:     GET /api/v1/tenants/org123  ❌ (redundant)
  └─ useTenantInfo():  GET /api/v1/tenants/org123  ❌ (redundant)

Total: 3 API calls for same data
```

### After (Optimized)
```
User navigates to /dashboard/org123/releases/setup
  └─ Layout loader:    GET /api/v1/tenants/org123  ✅

User completes setup step
  └─ Setup action:     GET /api/v1/tenants/org123  ✅ (revalidate)

Total: 1 initial call + 1 revalidation after mutation
```

**Improvement**: ~67% reduction in redundant API calls

---

## 🎯 Benefits

1. **Single Source of Truth**
   - All tenant data comes from parent layout
   - No conflicts between different data sources

2. **Better Performance**
   - Eliminated redundant API calls
   - Faster page loads
   - Reduced server load

3. **Simplified State Management**
   - No React Query needed for this data
   - No complex cache invalidation
   - Remix handles data flow automatically

4. **Type Safety**
   - Single `OrgLayoutLoaderData` type
   - All child routes strongly typed

---

## 🔧 How to Add New Child Routes

### Pattern to Follow
```typescript
import { useRouteLoaderData } from '@remix-run/react';
import type { OrgLayoutLoaderData } from './dashboard.$org';

export default function MyNewOrgPage() {
  // ✅ Access parent data
  const orgData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  
  if (!orgData) {
    throw new Error('Organization data not loaded');
  }

  const { tenantId, organisation, user } = orgData;
  
  // Use the data...
  return (
    <div>
      <h1>{organisation.displayName}</h1>
      {/* ... */}
    </div>
  );
}
```

### ❌ Don't Do This
```typescript
// ❌ BAD - Creates redundant API call
export const loader = async () => {
  const response = await CodepushService.getTenantInfo({ ... });
  return json({ tenant: response.data.organisation });
};
```

---

## 🚀 Backend API Details

### Endpoint
```
GET ${DELIVR_BACKEND_URL}/api/v1/tenants/:tenantId
```

### Request Headers
```typescript
{
  "userId": string
}
```

### Response
```typescript
{
  organisation: {
    id: string;
    displayName: string;
    role: string;
    isAdmin: boolean;
    releaseManagement?: {
      setupComplete: boolean;
      setupSteps: {
        scmConnected: boolean;
        targetPlatformsConfigured: boolean;
        pipelinesConfigured: boolean;
        communicationConfigured: boolean;
      };
      integrations: Array<{
        type: 'scm' | 'target-platform' | 'pipeline' | 'communication';
        // ... integration-specific fields
      }>;
    };
  };
}
```

### Backend Implementation
**File**: `delivr-server-ota-managed/api/script/routes/management.ts`

```typescript
router.get("/tenants/:tenantId", 
  tenantPermissions.requireTenantMembership({ storage }),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    // Fetch tenant details with release management setup status
    // ...
  }
);
```

---

## 📝 Summary

- ✅ **1 Parent Layout** fetches tenant info ONCE
- ✅ **N Child Routes** access shared data via `useRouteLoaderData`
- ✅ **Re-fetch ONLY** after mutations that change tenant state
- ❌ **NO redundant hooks** or BFF routes
- 🚀 **67% fewer API calls** for tenant info

This architecture follows Remix best practices and provides optimal performance while maintaining simplicity.


