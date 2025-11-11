# Release Setup Architecture - Clarified

## Problem Statement

There was confusion about when to use which API:
- ❌ **Before:** Multiple API calls for the same information
- ❌ **Before:** Calling detailed setup-status API everywhere
- ✅ **After:** Single source of truth from tenant info

---

## Corrected Architecture

### 1. **Tenant Info API** (Primary Source)
**Endpoint:** `GET /tenants/:tenantId`

**Purpose:** High-level setup status for redirect logic

**Returns:**
```json
{
  "organisation": {
    "id": "tenant_123",
    "displayName": "My Org",
    "releaseManagement": {
      "setupComplete": true,          // ← Use this for redirects
      "setupSteps": {
        "scmIntegration": true,
        "targetPlatforms": false,
        "pipelines": false,
        "communication": false
      }
    }
  }
}
```

**When to use:**
- ✅ Redirect logic in releases layout
- ✅ Quick setup status checks
- ✅ Showing badge/indicator in UI

**When NOT to use:**
- ❌ Inside setup wizard (use setup service instead)
- ❌ For detailed progress tracking

---

### 2. **Setup Service** (Wizard Data)
**Location:** `app/.server/services/ReleaseManagement/setup.ts`

**Purpose:** Store and retrieve detailed wizard data

**Data Structure:**
```typescript
{
  tenantId: string,
  github: {
    repoUrl: string,
    token: string,        // ← Sensitive data
    owner: string,
    repoName: string,
    isVerified: boolean
  },
  appStoreConnect: {
    keyId: string,
    privateKey: string,   // ← Sensitive data
    ...
  },
  ...
}
```

**When to use:**
- ✅ Setup wizard step navigation
- ✅ Storing user input during setup
- ✅ Resuming incomplete setup

**When NOT to use:**
- ❌ For redirect logic
- ❌ For showing completion status

---

### 3. **Setup Status API** (Backend Only - Optional)
**Endpoint:** `GET /tenants/:tenantId/releases/setup-status`

**Purpose:** Detailed progress tracking and analytics (backend only)

**Status:** ⚠️ Available but not exposed to frontend (removed redundancy)

**Returns:**
```json
{
  "setupComplete": false,
  "progress": {
    "completed": 1,
    "total": 4,
    "percentage": 25
  },
  "steps": {
    "scm": {
      "completed": true,
      "required": true,
      "label": "GitHub Integration",
      "data": { owner: "...", repo: "..." }
    },
    ...
  },
  "nextStep": "targetPlatforms"
}
```

**When to use:**
- ✅ Admin dashboards (if needed in future)
- ✅ Backend analytics/reporting
- ✅ Debugging via API

**When NOT to use:**
- ❌ Frontend redirects (use tenant info instead)
- ❌ Setup wizard (use setup service instead)

**Note:** Frontend route removed to eliminate redundancy. Tenant info already includes setup status.

---

## Flow Diagrams

### Redirect Logic (Uses Tenant Info)
```
User navigates to /releases
          ↓
useTenantInfo(tenantId)  ← Single API call
          ↓
tenantInfo.releaseManagement.setupComplete?
          ↓
    ┌─────┴─────┐
  Yes           No
    ↓            ↓
  Show        Redirect
Dashboard    to Setup
```

### Setup Wizard (Uses Setup Service)
```
User on /releases/setup
          ↓
Load setupData from service (mock)
          ↓
Show current step with prefilled data
          ↓
User completes step
          ↓
saveSetupData(partialData)
          ↓
Update backend (create SCM integration, etc.)
          ↓
Invalidate tenant info cache
          ↓
Navigate to next step
```

---

## Code Example

### ✅ Correct: Redirect Logic
```typescript
// dashboard.$org.releases.tsx
import { useTenantInfo } from '~/hooks/useTenantInfo';

export default function ReleasesLayout() {
  const { org } = useParams();
  const { data: tenantInfo } = useTenantInfo(org);
  
  useEffect(() => {
    if (location.pathname.includes('/setup')) return;
    
    // Use tenant info (already fetched)
    if (tenantInfo && !tenantInfo.releaseManagement?.setupComplete) {
      navigate(`/dashboard/${org}/releases/setup`);
    }
  }, [tenantInfo]);
  
  return <Outlet />;
}
```

### ✅ Correct: Setup Wizard
```typescript
// dashboard.$org.releases.setup.tsx
export const loader = async ({ params }) => {
  const { org } = params;
  
  // Use setup service for wizard data
  const setupData = await getSetupData(org);
  const setupStatus = await getSetupStatus(org);
  
  if (setupStatus.isComplete) {
    return redirect(`/dashboard/${org}/releases`);
  }
  
  return json({ setupData, setupStatus });
};
```

### ❌ Wrong: Don't call setup-status API in layout
```typescript
// ❌ BAD - Too heavy for redirect logic
const { data } = useReleaseSetupStatus(org);
```

---

## API Call Frequency

| API | Frequency | Caching | Use Case | Frontend? |
|-----|-----------|---------|----------|-----------|
| **Tenant Info** | Every tenant switch | 30s | Redirects, badges | ✅ Yes |
| **Setup Service** | On setup page only | N/A | Wizard data | ✅ Yes (mock) |
| **Setup Status** | Backend only | N/A | Analytics/debugging | ❌ No (removed)

---

## Data Flow

### When Setup is Incomplete
```
1. User lands on /releases
2. Layout calls useTenantInfo(org)
   → GET /tenants/:tenantId
   → { releaseManagement: { setupComplete: false } }
3. Redirect to /releases/setup
4. Setup page loads setupData from service
5. User completes steps
6. Setup page updates backend (create SCM, etc.)
7. Setup page invalidates tenant info cache
8. Navigate to /releases
9. Layout re-fetches tenant info
   → { releaseManagement: { setupComplete: true } }
10. Show dashboard ✅
```

---

## Summary

### Single Source of Truth
- **Tenant Info API** = Setup complete? (yes/no)
- Use this for all redirect logic
- Don't call setup-status API in layouts

### Setup Wizard
- Uses setup service for detailed data
- Stores sensitive credentials
- Step-by-step progress

### Setup Status API
- Optional, for analytics
- Use only when needed
- Not for redirects

---

**Key Takeaway:** 
> Use `tenantInfo.releaseManagement.setupComplete` for redirects.  
> Don't call detailed setup-status API unless you need progress details.

✅ **Status:** Architecture clarified and fixed!

