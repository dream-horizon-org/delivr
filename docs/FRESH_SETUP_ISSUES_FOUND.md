# Fresh Setup Issues Found & Fixed

## 🔍 Problem
When setting up the repository from scratch, the database setup fails because:
1. Model definitions don't match migration expectations
2. Foreign key constraints conflict with nullable fields
3. Seed data has schema mismatches

## 🐛 Issues Identified

### Issue #1: Collaborator → App FK Constraint Conflict (CRITICAL)

**Location**: `api/script/storage/aws-storage.ts:302`

**Problem**:
```typescript
Collaborator.belongsTo(App, { foreignKey: 'appId' });
```

This creates a foreign key constraint on `collaborators.appId → apps.id`.

**Why This Breaks Fresh Setup**:
- Migration 001 says: `appId` should be **nullable** (for tenant-level collaborators)
- Having a FK constraint on a nullable field that can be NULL causes issues
- When `sequelize.sync()` runs, it tries to create this FK constraint
- Seed data might have collaborators without appId (tenant-level)

**Expected Behavior** (from migration 001):
- `appId` should be nullable
- NO foreign key constraint (collaborators can exist at tenant-level without an app)

**Fix**:
Remove the FK constraint by making the association optional:
```typescript
Collaborator.belongsTo(App, { 
  foreignKey: 'appId',
  constraints: false  // Don't create FK constraint
});
```

---

### Issue #2: Collaborator Model - accountId Missing FK Reference

**Location**: `api/script/storage/aws-storage.ts:129`

**Problem**:
```typescript
accountId: { type: DataTypes.STRING, allowNull: false },
```

No explicit `references` defined in the model, but FK is added later through association (line 301).

**Why This Could Cause Issues**:
- Inconsistent model definition
- FK constraint is added through association instead of model definition
- Better to be explicit in the model definition

**Expected Behavior**:
- accountId should explicitly reference `accounts.id`

**Fix**:
```typescript
accountId: { 
  type: DataTypes.STRING, 
  allowNull: false,
  references: {
    model: 'accounts',
    key: 'id',
  }
},
```

---

### Issue #3: Seed Data Schema Mismatch

**Location**: `api/script/storage/seedData.ts:26-27`

**Problem**:
```typescript
collaborators: [
  { email: "user1@example.com", accountId: "id_0", appId: "id_2", permission: "Owner", role: "Admin" },
  { email: "user2@example.com", accountId: "id_1", appId: "id_3", permission: "Owner", role: "Admin" },
],
```

**Issues**:
1. ❌ `role: "Admin"` - This field doesn't exist in the collaborator model
2. ❌ Missing `isCreator: false` - This field is required (NOT NULL, default: false)
3. ❌ Missing `tenantId` - Should be set for tenant-level collaborators

**Expected Behavior**:
Seed data should match model definition:
- Remove `role` field (doesn't exist)
- Add `isCreator` field (required)
- Consider adding tenant-level collaborators for testing

**Fix**:
```typescript
collaborators: [
  { 
    email: "user1@example.com", 
    accountId: "id_0", 
    appId: "id_2", 
    permission: "Owner", 
    isCreator: false 
  },
  { 
    email: "user2@example.com", 
    accountId: "id_1", 
    appId: "id_3", 
    permission: "Owner", 
    isCreator: false 
  },
],
```

---

## 🔧 Root Cause

The issue stems from a mismatch between:

1. **Migrations** (define the desired schema)
   - Say: `appId` nullable, no FK constraint
   
2. **Sequelize Models** (define how Sequelize creates tables)
   - Say: Create FK constraint via `belongsTo` association
   
3. **sequelize.sync()** (creates tables from models)
   - Uses model definitions + associations
   - Ignores migration intentions

When someone does a fresh setup:
1. `sequelize.sync({ alter: false })` runs (from seedData.ts:138)
2. Sequelize creates tables from model definitions
3. FK constraints are created from associations
4. This conflicts with migration expectations
5. **Setup fails or creates wrong schema**

---

## ✅ Solution Approach

### Option 1: Fix Models to Match Migrations (Recommended)
- Update model definitions to match migration intentions
- Remove problematic FK constraints
- Ensure fresh setup works without migrations
- Migrations become optional (for updates only)

### Option 2: Disable sequelize.sync() and Require Migrations
- Remove `sequelize.sync()` from seedData.ts
- Always require running migrations first
- More strict, but consistent

**We chose Option 1** because:
- Fresh setup should "just work"
- Migrations should be for schema updates, not initial setup
- Sequelize models should be the source of truth for fresh installs

---

## 📋 Changes Made

### 1. Fixed Collaborator Model
- ✅ Removed FK constraint from appId (made it constraint: false)
- ✅ Added explicit FK reference for accountId
- ✅ Updated associations to not enforce FK on appId

### 2. Fixed Seed Data
- ✅ Removed non-existent `role` field
- ✅ Added required `isCreator` field
- ✅ Ensured data matches model schema

### 3. Verified Fresh Setup
- ✅ Cleaned database completely
- ✅ Ran fresh setup without migrations
- ✅ Tables created correctly
- ✅ Seed data inserted successfully

---

## 🧪 Testing Fresh Setup

To test the fresh setup:

```bash
# 1. Clean database
docker exec -i api-db-1 mysql -u root -proot -e "DROP DATABASE IF EXISTS codepushdb; CREATE DATABASE codepushdb CHARACTER SET latin1 COLLATE latin1_bin;"

# 2. Run seed data (creates tables + seeds)
cd api
npx ts-node script/storage/seedData.ts

# 3. Verify tables created
docker exec -i api-db-1 mysql -u root -proot codepushdb -e "SHOW TABLES;"

# 4. Check collaborators table structure
docker exec -i api-db-1 mysql -u root -proot codepushdb -e "DESC collaborators;"

# 5. Check foreign keys
docker exec -i api-db-1 mysql -u root -proot codepushdb -e "
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'codepushdb'
  AND TABLE_NAME = 'collaborators'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
"
```

---

## 📝 Key Takeaways

1. **Models should match migration expectations** - Keep them in sync
2. **FK constraints on nullable fields need careful handling** - Use `constraints: false` when needed
3. **Seed data must match model schema** - No extra fields, include all required fields
4. **Fresh setup should work without migrations** - Migrations are for updates, not initial setup
5. **Test fresh setup regularly** - Catch these issues early

---

**Status**: ✅ Fixed and verified
**Date**: November 11, 2025

