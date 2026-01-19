# ✅ NEW DELIVR ARCHITECTURE - IMPLEMENTATION COMPLETE

## 🎯 What Changed

### **Architecture Shift: App-Centric → Tenant-Centric**

**OLD (App-Centric):**
```
User → Apps (via collaborators table)
```

**NEW (Tenant-Centric):**
```
User → Tenant/Organization → Apps
     ↓ (via user_metadata)
   Roles: org_admin, editor, viewer
```

---

## 📊 Database Changes

### **New Table: `user_metadata`**
```sql
CREATE TABLE user_metadata (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  role ENUM('org_admin', 'editor', 'viewer') NOT NULL DEFAULT 'editor',
  is_creator BOOLEAN NOT NULL DEFAULT FALSE,
  created_at FLOAT NOT NULL,
  updated_at FLOAT,
  
  UNIQUE KEY unique_user_tenant (user_id, tenant_id)
);
```

### **Updated Table: `accounts`**
New columns added:
- `ssoId` - Google SSO ID (for OG Delivr integration)
- `azureAdId`, `gitHubId`, `microsoftId` - OAuth providers
- `firstName`, `lastName`, `picture` - User profile
- `slackId`, `teamsId` - Integration IDs
- `updatedAt` - Last update timestamp

---

## 🔑 Permission Model

### **3 Tenant-Level Roles:**

| Role | Can Do |
|------|--------|
| **org_admin** | Everything (org owner, immutable) |
| **editor** | Create/manage apps, deployments, packages |
| **viewer** | Read-only access |

### **Permission Hierarchy:**
```
org_admin (level 3) > editor (level 2) > viewer (level 1)
```

---

## 🛠️ Implementation Details

### **1. Models Created**
- ✅ `createUserMetadata()` in `aws-storage.ts`
- ✅ Added to `MODELS` constant
- ✅ Registered in `createModelss()`
- ✅ Associations with Account and Tenant

### **2. Storage Methods Updated**

#### **getTenants(accountId)**
- **OLD**: Checked app collaborators
- **NEW**: Queries `user_metadata` table
- Returns tenants with user's role

#### **addTenant(accountId, tenant)**
- **NEW** method
- Creates tenant
- Automatically assigns creator as `org_admin` with `isCreator=true`

#### **getApps(accountId)**
- **OLD**: Queried `collaborators` table
- **NEW**: Gets tenants from `user_metadata`, then apps from those tenants
- Users see all apps in their organizations

#### **addApp(accountId, app)**
- **NEW**: Requires `tenantId` (no auto-creation)
- Checks user has `editor` or `org_admin` role
- Viewers cannot create apps
- Still creates `collaborator` entry for backward compatibility

### **3. Middleware Created**
File: `api/script/middleware/tenant-permissions.ts`

**Functions:**
- `getUserTenantRole(storage, userId, tenantId)` - Get user's role
- `requireTenantMembership(config)` - Must be tenant member
- `requireEditor(config)` - Must be editor or admin
- `requireOrgAdmin(config)` - Must be org admin

### **4. API Routes**

#### **Existing (Updated):**
```
GET  /tenants           → Returns user's organizations (via user_metadata)
POST /tenants           → Create organization (user becomes org_admin)
DELETE /tenants/:id     → Delete organization
GET  /apps              → Returns apps from user's organizations
POST /apps              → Create app (requires editor+ role, tenant required)
```

---

## 📝 Migration Script

**File:** `migrations/001_add_user_metadata_table.sql`

**What it does:**
1. Adds new columns to `accounts` table
2. Creates `user_metadata` table
3. Migrates existing tenant creators to `org_admin` role
4. Optionally migrates app collaborators to tenant-level roles

**Run migration:**
```bash
cd /Users/jatinkhemchandani/Desktop/delivr-server-ota-managed
mysql -u root -p codepushdb < migrations/001_add_user_metadata_table.sql
```

**Rollback:**
```bash
mysql -u root -p codepushdb < migrations/001_add_user_metadata_table_rollback.sql
```

---

## 🚀 How to Use (Frontend)

### **1. Create Organization**
```typescript
POST /tenants
{
  "displayName": "My Organization"
}

// Response:
{
  "organisation": {
    "id": "abc123",
    "displayName": "My Organization",
    "role": "Owner",
    "createdBy": "user123",
    "createdTime": 1699545600000
  }
}
```

### **2. Get User's Organizations**
```typescript
GET /tenants

// Response:
{
  "organisations": [
    {
      "id": "abc123",
      "displayName": "My Organization",
      "role": "Owner",  // org_admin → "Owner"
      "createdBy": "user123",
      "createdTime": 1699545600000
    }
  ]
}
```

### **3. Create App (Must have tenant)**
```typescript
POST /apps
{
  "name": "MyApp",
  "tenantId": "abc123"  // REQUIRED!
}

// Error if no tenantId:
{
  "error": "Tenant ID is required. Please create or join an organization first."
}

// Error if viewer:
{
  "error": "You need editor or admin permissions to create apps."
}
```

### **4. Get Apps**
```typescript
GET /apps

// Returns ALL apps from ALL organizations user belongs to
{
  "apps": [
    {
      "id": "app1",
      "name": "MyApp",
      "tenantId": "abc123",
      "tenantName": "My Organization",
      ...
    }
  ]
}
```

---

## ⚙️ Backend Code Usage

### **Check Permissions in Routes:**
```typescript
import { requireEditor, requireOrgAdmin } from '../middleware/tenant-permissions';

// Require editor or admin
router.post("/apps", requireEditor({ storage }), (req, res) => {
  // User has editor+ permissions
  const tenantRole = (req as any).tenantRole; // { role: 'editor', isCreator: false }
});

// Require org admin only
router.delete("/tenants/:tenantId", requireOrgAdmin({ storage }), (req, res) => {
  // User is org admin
});
```

### **Manual Permission Check:**
```typescript
import { getUserTenantRole } from '../middleware/tenant-permissions';

const userRole = await getUserTenantRole(storage, userId, tenantId);

if (userRole && userRole.role === 'org_admin') {
  // User is admin
} else if (userRole && userRole.role === 'editor') {
  // User is editor
} else {
  // User is viewer or not a member
}
```

---

## 🔄 Backward Compatibility

### **Collaborators Table:**
- ✅ Still exists
- ✅ Still populated when apps are created
- ✅ Existing frontend code works
- ⚠️ Deprecated - will eventually use user_metadata only

### **Migration Path:**
1. ✅ Run SQL migration
2. ✅ Existing users get mapped to `org_admin` role
3. ✅ Existing app collaborators mapped to `editor` role
4. ✅ Frontend can continue using old endpoints
5. 🔄 Gradually update frontend to use tenant-first flow

---

## 🧪 Testing

### **Test Flow:**
1. Create account
2. Create organization (becomes org_admin)
3. Create app in organization
4. Invite users to organization (as editor/viewer)
5. Verify permissions work correctly

### **Test Commands:**
```bash
# Build
cd api && npm run build

# Run tests
npm test

# Start server
npm start
```

---

## 🎯 Next Steps for Release Management

Now that the tenant-centric architecture is in place:

### **Ready to add:**
1. `releases` table (belongs to tenant)
2. `builds` table
3. `release_tasks` table
4. `platforms` table
5. `targets` table
6. etc.

### **All release tables will:**
- Belong to a tenant
- Use same permission model (org_admin, editor, viewer)
- Share same user_metadata table

---

## 📋 Summary

✅ **Tenant is now the parent entity**
✅ **Users join organizations first**
✅ **Apps belong to organizations**
✅ **3-tier permission model (org_admin, editor, viewer)**
✅ **Migration script ready**
✅ **Backward compatible**
✅ **Build passing**
✅ **Ready for release management integration**

---

**Status:** ✅ Complete
**Date:** 2025-11-08
**Build:** ✅ Passing

