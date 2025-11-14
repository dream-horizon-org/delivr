# Release Setup Detection - Quick Reference

## 🎯 What Was Implemented

An automatic detection and redirect system for release management setup.

**Flow:**
1. User lands on `/dashboard/:org/releases`
2. System checks if release management is set up
3. **If setup complete** → Show releases dashboard ✅
4. **If setup incomplete** → Redirect to setup wizard 🔧

---

## 📋 API Endpoints

### 1. Get Tenant Info with Setup Status
```
GET /tenants/:tenantId
Headers: userId

Response:
{
  "organisation": {
    "id": "tenant_123",
    "displayName": "My Org",
    "releaseManagement": {
      "setupComplete": true/false,
      "setupSteps": {
        "scmIntegration": true/false,
        "targetPlatforms": true/false,
        "pipelines": true/false,
        "communication": true/false
      }
    }
  }
}
```

### 2. Get Detailed Setup Status
```
GET /tenants/:tenantId/releases/setup-status
Headers: userId

Response:
{
  "setupComplete": false,
  "progress": {
    "completed": 1,
    "total": 4,
    "percentage": 25,
    "requiredCompleted": 1,
    "requiredTotal": 2
  },
  "steps": {
    "scm": { completed, required, label, description, data },
    "targetPlatforms": { ... },
    "pipelines": { ... },
    "communication": { ... }
  },
  "nextStep": "targetPlatforms"
}
```

---

## 🔧 Setup Requirements

### Required Steps (must complete for access)
- ✅ **SCM Integration** - GitHub/GitLab connected
- 🔴 **Target Platforms** - App Store or Play Store configured (TODO)

### Optional Steps (nice to have)
- 🔵 **CI/CD Pipelines** - Jenkins/GitHub Actions (TODO)
- 🔵 **Communication** - Slack/Teams (TODO)

**Current:** Only SCM required  
**Future:** SCM + Target Platforms required

---

## 💻 Frontend Usage

### Using the Hooks

```typescript
import { useReleaseSetupStatus } from '~/hooks/useReleaseSetupStatus';

function MyComponent() {
  const { org } = useParams();
  const { data, isLoading, error } = useReleaseSetupStatus(org);

  if (isLoading) return <Loader />;
  if (error) return <Error />;
  
  if (!data?.setupComplete) {
    // Redirect to setup
    navigate(`/dashboard/${org}/releases/setup`);
  }

  return <Dashboard />;
}
```

### Available Hooks
```typescript
// Get tenant info with setup flag
useTenantInfo(tenantId: string | undefined)

// Get detailed setup status
useReleaseSetupStatus(tenantId: string | undefined)
```

---

## 🚀 Testing the Flow

### Test Setup Incomplete
1. Remove SCM integration from database:
   ```sql
   DELETE FROM tenant_scm_integrations WHERE tenantId = 'your-tenant-id';
   ```
2. Navigate to `/dashboard/:org/releases`
3. **Expected:** Auto-redirect to `/dashboard/:org/releases/setup`

### Test Setup Complete
1. Add SCM integration via setup wizard
2. Navigate to `/dashboard/:org/releases`
3. **Expected:** Show releases dashboard

### Test Loading States
1. Throttle network in DevTools
2. Navigate to releases page
3. **Expected:** See loading spinner with message

---

## 📁 Files to Know

### Backend
- `api/script/routes/management.ts` - Tenant info endpoint
- `api/script/routes/release-management.ts` - Setup status endpoint

### Frontend
- `app/hooks/useTenantInfo.ts` - Tenant info hook
- `app/hooks/useReleaseSetupStatus.ts` - Setup status hook
- `app/routes/dashboard.$org.releases.tsx` - Auto-redirect logic
- `app/routes/api.v1.tenants.$tenantId.info.ts` - API proxy
- `app/routes/api.v1.tenants.$tenantId.release-setup-status.ts` - API proxy

---

## 🐛 Common Issues

### Infinite Redirect Loop
**Cause:** Setup page also checks setup status  
**Fix:** Skip redirect logic on `/releases/setup` page

### Stale Cache
**Cause:** React Query caching  
**Fix:** Invalidate cache after completing setup
```typescript
queryClient.invalidateQueries(['release-setup-status', tenantId]);
```

### 404 on API Routes
**Cause:** Routes not registered  
**Fix:** Restart dev server

---

## 🎨 User Experience

### Loading State
```
┌────────────────────┐
│   [Spinner Icon]   │
│                    │
│ Checking release   │
│ management setup...│
└────────────────────┘
```

### Redirecting State
```
┌────────────────────┐
│   [Spinner Icon]   │
│                    │
│ Redirecting to     │
│ setup wizard...    │
└────────────────────┘
```

### Error State
```
┌────────────────────┐
│   [Error Icon]     │
│                    │
│ Failed to check    │
│ setup status       │
│                    │
│ Please try again   │
└────────────────────┘
```

---

## 🔄 Flow Chart

```
User Navigates
      ↓
/dashboard/:org/releases
      ↓
[Layout Component Loads]
      ↓
useReleaseSetupStatus()
      ↓
┌─────┴─────┐
│ Loading?  │ → Yes → Show Spinner
└─────┬─────┘
      No
      ↓
┌─────┴─────┐
│  Error?   │ → Yes → Show Error
└─────┬─────┘
      No
      ↓
┌─────┴──────────┐
│ Setup Complete?│
└─────┬──────────┘
      │
  ┌───┴───┐
Yes       No
  │       │
  ↓       ↓
Render   Redirect
Outlet   to Setup
  │         │
  ↓         ↓
Show      Show
Dashboard Wizard
```

---

## ✅ Checklist for Adding New Setup Steps

When adding a new integration check (e.g., Target Platforms):

1. **Backend:**
   - [ ] Create database table
   - [ ] Add controller methods
   - [ ] Update setup status endpoint
   - [ ] Test API response

2. **Frontend:**
   - [ ] Update types in `Codepush/types.ts`
   - [ ] Update setup wizard UI
   - [ ] Test redirect logic

3. **Documentation:**
   - [ ] Update this document
   - [ ] Add to API reference
   - [ ] Update flow diagrams

---

## 📞 Quick Commands

```bash
# Restart server with fresh build
cd api && npm run build && docker exec -it api-app-1 pm2 restart dota-server

# Check setup status manually
curl http://localhost:3010/tenants/TENANT_ID/releases/setup-status \
  -H "userId: USER_ID"

# Test redirect in browser
open http://localhost:3000/dashboard/TENANT_ID/releases
```

---

## 🎯 Summary

**What it does:**
- Automatically checks if release management is set up
- Redirects to setup wizard if incomplete
- Shows progress during setup

**Current state:**
- ✅ SCM integration check working
- 🔴 Target platform check (TODO)
- 🔴 Pipeline check (TODO)
- 🔴 Communication check (TODO)

**Next steps:**
1. Implement target platform checks
2. Make target platforms required
3. Add optional pipeline checks
4. Add optional communication checks

---

**Status:** ✅ Core functionality complete  
**Ready for:** Testing and iteration

