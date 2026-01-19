# ✅ UNIFIED COLLABORATORS ARCHITECTURE - COMPLETE

## Overview
Successfully simplified the Delivr architecture by **merging `user_tenant` into `collaborators`**, creating a single unified table for ALL collaboration (both app-level and tenant-level).

---

## Final Database Schema

### Tables (9 total)
```
✅ accounts         - User accounts
✅ tenants          - Organizations
✅ apps             - Applications (with accountId AND tenantId for dual compatibility)
✅ collaborators    - UNIFIED: Tenant-level AND App-level collaboration
✅ deployments      - Code deployments
✅ packages         - Deployment packages
✅ accessKeys       - API access keys
✅ AppPointers      - App version pointers
✅ termsAcceptances - Terms of service tracking
```

### The UNIFIED `collaborators` Table

```sql
CREATE TABLE collaborators (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(255) NOT NULL,
  accountId    VARCHAR(255) NOT NULL,
  appId        VARCHAR(255) NULL,      -- NULL for tenant-level
  tenantId     CHAR(36) NULL,          -- NULL for app-only-level
  permission   ENUM('Owner', 'Editor', 'Viewer', 'Collaborator'),
  isCreator    BOOLEAN DEFAULT FALSE,  -- TRUE for tenant creators
  createdAt    DATETIME NOT NULL,
  updatedAt    DATETIME NOT NULL,
  
  FOREIGN KEY (accountId) REFERENCES accounts(id),
  FOREIGN KEY (appId) REFERENCES apps(id),
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);
```

#### Collaboration Types

**Tenant-Level Collaborators** (Organization membership):
- `appId = NULL`
- `tenantId = <tenant_id>`
- `permission`: Owner, Editor, Viewer
- `isCreator = TRUE` for org creator

**App-Level Collaborators** (Legacy/specific app access):
- `appId = <app_id>`
- `tenantId = NULL` (or can also have tenantId for new flow)
- `permission`: Owner, Collaborator

---

## Current Data Distribution

```
Type             Permission    Count
─────────────────────────────────────
Tenant-level     Owner         7
App-level        Owner         7
App-level        Collaborator  1
─────────────────────────────────────
TOTAL                          15
```

---

## Code Changes Summary

### 1. **Removed `createUserTenant` Model**
   - Deleted the entire `user_tenant` table model
   - No longer needed!

### 2. **Updated `createCollaborators` Model**
   ```typescript
   - Added: isCreator (BOOLEAN)
   - Updated permission: ENUM('Owner', 'Editor', 'Viewer', 'Collaborator')
   - Made appId nullable
   ```

### 3. **Updated `createModelss` Associations**
   - Removed: UserTenant model
   - Removed: Account-Tenant many-to-many through UserTenant
   - Kept: Direct Tenant-Collaborator relationship

### 4. **Updated MODELS Constant**
   ```typescript
   - Removed: USER_TENANT
   - Kept: COLLABORATOR (unified)
   ```

### 5. **Updated All Methods**

   **`addApp()`** - Check tenant membership:
   ```typescript
   // OLD: MODELS.USER_TENANT with userId, tenantId
   // NEW: MODELS.COLLABORATOR with accountId, tenantId, appId=null
   ```

   **`getApps()`** - Fetch user's apps:
   ```typescript
   // OLD: Get tenants from USER_TENANT
   // NEW: Get tenants from COLLABORATOR where appId=null
   ```

   **`getTenants()`** - Fetch user's organizations:
   ```typescript
   // OLD: Query USER_TENANT with include Tenant
   // NEW: Query COLLABORATOR where appId=null, then fetch Tenants
   ```

   **`addTenant()`** - Create organization:
   ```typescript
   // OLD: Create USER_TENANT with role='org_admin', isCreator=true
   // NEW: Create COLLABORATOR with permission='Owner', isCreator=true, appId=null
   ```

---

## Migration Applied

**`006_unify_to_collaborators_only.sql`**
1. Made `appId` nullable in collaborators
2. Added `isCreator` field (conditional)
3. Expanded `permission` enum to include Editor, Viewer
4. Migrated all `user_tenant` data to `collaborators`
5. Dropped `user_tenant` table

---

## Dual Compatibility (V1 & V2)

### Apps Table
```
accountId (nullable) → V1: Direct account ownership
tenantId  (nullable) → V2: Tenant ownership
```

### Collaborators Table
```
appId=NULL, tenantId=X  → V2: Tenant-level collaborator
appId=X,    tenantId=Y  → V2: App within tenant (both set)
appId=X,    tenantId=NULL → V1: Legacy app-only collaborator
```

---

## Benefits of Unified Architecture

✅ **Simpler Schema**: One table instead of two
✅ **Less Code**: Fewer models, fewer joins
✅ **Easier Queries**: Single table for all collaboration
✅ **Backward Compatible**: Supports both old and new flows
✅ **Clearer Intent**: `appId=null` clearly indicates tenant-level
✅ **Consistent Permissions**: Same enum for all collaboration types

---

## API Behavior

### V1 Flow (Old - Backward Compatible)
```
User creates app → accountId set, tenantId=null
User invited to app → Collaborator entry with appId
```

### V2 Flow (New - Tenant-Centric)
```
User creates/joins org → Collaborator entry with tenantId, appId=null
User creates app in org → accountId AND tenantId set
Both tenant-level and app-level collaborators created
```

---

## Testing Checklist

- [x] Database migration successful
- [x] `user_tenant` table dropped
- [x] Code compiles without errors
- [x] All 15 collaborator records migrated correctly
- [x] Tenant-level collaborators have `appId=null`
- [x] App-level collaborators retained
- [ ] Integration tests with frontend
- [ ] Test creating new tenant
- [ ] Test creating new app in tenant
- [ ] Test permissions enforcement

---

## Next Steps

1. **Update Frontend** to use the new unified API
2. **Test End-to-End** flows for both V1 and V2
3. **Add API Routes** for:
   - Adding collaborators to tenants
   - Managing permissions
   - Transferring app ownership
4. **Document API** with new collaboration model
5. **Release Management**: Integrate the release management module

---

## Files Modified

### Database Migrations
- `migrations/001_unified_architecture.sql` ✅ (consolidated single migration)
- `migrations/001_unified_architecture_rollback.sql` ✅
- `migrations/README.md` ✅ (documentation)

### Code
- `api/script/storage/aws-storage.ts` ✅
  - Removed `createUserTenant()`
  - Updated `createCollaborators()`
  - Updated `createModelss()`
  - Updated `MODELS` constant
  - Updated `addApp()`
  - Updated `getApps()`
  - Updated `getTenants()`
  - Updated `addTenant()`

---

**Architecture Status**: ✅ **SIMPLIFIED & COMPLETE**

The system now uses a single, elegant `collaborators` table for all collaboration needs!

