# Router Separation: DOTA vs Release Management

## Overview

We've separated the routing layer into two distinct modules to improve code organization and maintainability:

1. **DOTA Management Router** - Legacy CodePush/OTA features
2. **Release Management Router** - New Release Management features

## Architecture

### Before
```
┌─────────────────────────────────────┐
│      getManagementRouter()          │
│  (Everything in one router)         │
│                                     │
│  - Apps, Deployments, Packages      │
│  - Access Keys                      │
│  - Collaborators                    │
│  - Tenants                          │
│  - SCM Integrations (NEW)           │
│  - Releases (Future)                │
│  - Builds (Future)                  │
└─────────────────────────────────────┘
```

### After
```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  getManagementRouter()       │     │  getReleaseManagementRouter()│
│  (DOTA/OTA Features)         │     │  (Release Management)        │
│                              │     │                              │
│  - Apps                      │     │  - SCM Integrations          │
│  - Deployments               │     │  - Target Platforms          │
│  - Packages                  │     │  - Pipeline Integrations     │
│  - Access Keys               │     │  - Communication             │
│  - Collaborators             │     │  - Ticket Management         │
│  - Tenants                   │     │  - Releases CRUD             │
│                              │     │  - Builds                    │
│                              │     │  - Rollouts                  │
│                              │     │  - Cherry-picks              │
│                              │     │  - Analytics                 │
└──────────────────────────────┘     └──────────────────────────────┘
```

## File Structure

### DOTA Management
- **Router**: `api/script/routes/management.ts`
- **Export**: `api.ts` → `management()`
- **Mount**: `default-server.ts` → `app.use(auth, fileUpload, api.management())`
- **Purpose**: Legacy CodePush features (apps, deployments, packages)

### Release Management
- **Router**: `api/script/routes/release-management.ts`
- **Export**: `api.ts` → `releaseManagement()`
- **Mount**: `default-server.ts` → `app.use(auth, api.releaseManagement())`
- **Purpose**: New Release Management features

### Sub-routers (Modular)
- **SCM Integrations**: `api/script/routes/scm-integrations.ts`
  - Mounted inside Release Management router
  - Handles GitHub, GitLab, Bitbucket integrations
- **Future**: Target platforms, pipelines, communication, etc.

## Route Structure

### DOTA Management Routes
```
GET    /account
GET    /authenticated
POST   /accessKeys
GET    /accessKeys
PATCH  /accessKeys/:name
DELETE /accessKeys/:name
GET    /apps
POST   /apps
GET    /apps/:appName
PATCH  /apps/:appName
DELETE /apps/:appName
POST   /apps/:appName/transfer/:email
GET    /apps/:appName/collaborators
POST   /apps/:appName/collaborators/:email
PATCH  /apps/:appName/collaborators/:email
DELETE /apps/:appName/collaborators/:email
GET    /apps/:appName/deployments
POST   /apps/:appName/deployments
GET    /apps/:appName/deployments/:deploymentName
PATCH  /apps/:appName/deployments/:deploymentName
DELETE /apps/:appName/deployments/:deploymentName
... and more
```

### Release Management Routes
```
GET    /health

# SCM Integrations
POST   /tenants/:tenantId/integrations/scm/verify
POST   /tenants/:tenantId/integrations/scm
GET    /tenants/:tenantId/integrations/scm
PATCH  /tenants/:tenantId/integrations/scm
DELETE /tenants/:tenantId/integrations/scm

# Releases (TODO)
GET    /tenants/:tenantId/releases
POST   /tenants/:tenantId/releases
GET    /tenants/:tenantId/releases/:releaseId
PATCH  /tenants/:tenantId/releases/:releaseId
DELETE /tenants/:tenantId/releases/:releaseId

# Builds (TODO)
GET    /tenants/:tenantId/releases/:releaseId/builds
POST   /tenants/:tenantId/releases/:releaseId/builds

# Rollouts (TODO)
GET    /tenants/:tenantId/releases/:releaseId/rollout
PATCH  /tenants/:tenantId/releases/:releaseId/rollout

# Cherry-picks (TODO)
GET    /tenants/:tenantId/releases/:releaseId/cherry-picks
POST   /tenants/:tenantId/releases/:releaseId/cherry-picks

# Analytics (TODO)
GET    /tenants/:tenantId/releases/analytics
GET    /tenants/:tenantId/releases/:releaseId/adoption

# Setup (Implemented)
GET    /tenants/:tenantId/releases/setup-status
```

## Benefits of Separation

### 1. **Code Organization**
- Clear separation of concerns
- Easier to navigate and understand
- Related functionality grouped together

### 2. **Maintainability**
- Changes to Release Management don't affect DOTA
- Easier to onboard new developers
- Reduced risk of breaking existing features

### 3. **Scalability**
- Can add new Release Management features without bloating DOTA router
- Sub-routers (SCM, targets, pipelines) keep files manageable
- Future: Can split into microservices if needed

### 4. **Testing**
- Can test Release Management routes independently
- Mock dependencies more easily
- Focused unit/integration tests

### 5. **Deployment**
- Can version API endpoints separately
- Feature flags easier to implement
- Gradual rollout of new features

## Configuration

### DOTA Management Config
```typescript
export interface ManagementConfig {
  storage: storageTypes.Storage;
  redisManager: redis.RedisManager;
}
```

### Release Management Config
```typescript
export interface ReleaseManagementConfig {
  storage: storageTypes.Storage;
}
```

## Mounting in Server

```typescript
// In default-server.ts

// DOTA Management Routes (deployments, apps, packages)
app.use(
  auth.authenticate, 
  fileUploadMiddleware, 
  api.management({ storage, redisManager })
);

// Release Management Routes (releases, builds, integrations)
app.use(
  auth.authenticate, 
  api.releaseManagement({ storage })
);
```

## Migration Guide

### For Developers

**When adding DOTA features (apps, deployments, packages)**:
- ✅ Add routes to `api/script/routes/management.ts`
- ✅ Uses existing patterns (apps, deployments, packages)

**When adding Release Management features (releases, builds, integrations)**:
- ✅ Add routes to `api/script/routes/release-management.ts`
- ✅ OR create a new sub-router (like `scm-integrations.ts`)
- ✅ Follow tenant-centric patterns
- ✅ Use `tenantPermissions` middleware

### For Frontend Developers

**DOTA API calls** (no change):
```typescript
fetch('/apps/myApp/deployments')  // Still works
```

**Release Management API calls** (new):
```typescript
fetch('/tenants/TENANT_ID/integrations/scm/verify')
fetch('/tenants/TENANT_ID/releases')
fetch('/tenants/TENANT_ID/releases/REL_123/builds')
```

## Future Enhancements

### Planned Sub-Routers
1. ✅ **SCM Integrations** - `scm-integrations.ts` (Done)
2. ⏳ **Target Platforms** - `target-platforms.ts` (TODO)
3. ⏳ **Pipeline Integrations** - `pipelines.ts` (TODO)
4. ⏳ **Communication** - `communication.ts` (TODO)
5. ⏳ **Ticket Management** - `ticket-management.ts` (TODO)

### API Versioning
Consider adding version prefixes in the future:
```
/api/v1/dota/apps/...           (DOTA)
/api/v1/release-management/...  (Release Management)
```

## Testing

### Unit Tests
```typescript
// Test DOTA routes
describe('Management Router', () => {
  it('should create an app', async () => {
    // Test app creation
  });
});

// Test Release Management routes
describe('Release Management Router', () => {
  it('should verify SCM connection', async () => {
    // Test SCM verification
  });
});
```

### Integration Tests
```bash
# Test DOTA endpoints
curl http://localhost:3000/apps

# Test Release Management endpoints
curl http://localhost:3000/tenants/123/integrations/scm
```

## Summary

✅ **Separation Complete**
- DOTA and Release Management now have separate routers
- SCM integrations moved to Release Management
- Clear boundaries and responsibilities
- Easier to maintain and extend

📝 **Next Steps**
1. Implement remaining Release Management routes (releases, builds, etc.)
2. Create additional sub-routers as needed
3. Add comprehensive tests for both routers
4. Consider API versioning strategy

---

**Status**: ✅ Router separation complete and ready for development!

