# Database Migrations

## Overview
This directory contains SQL migration scripts for the Delivr unified architecture.

## Migrations

### 001_unified_architecture.sql
**Status**: ✅ Applied  
**Date**: 2025-11-08

**What it does:**
1. **Accounts Table Updates**
   - Adds OAuth provider fields: `ssoId`, `azureAdId`, `gitHubId`, `microsoftId`
   - Adds profile fields: `firstName`, `lastName`, `picture`
   - Adds integration fields: `slackId`, `teamsId`

2. **Collaborators Table Updates** (Unified Collaboration)
   - Makes `appId` nullable (for tenant-level collaborators)
   - Adds `isCreator` field (marks tenant creators)
   - Expands `permission` enum: `Owner`, `Editor`, `Viewer`, `Collaborator`
   - Adds `tenantId` field with foreign key to tenants

3. **Apps Table** (Dual Compatibility)
   - Keeps both `accountId` (V1) and `tenantId` (V2)

**Result:**
- **Tenant-level collaborators**: `appId=NULL`, `tenantId=X`
- **App-level collaborators (V1)**: `appId=X`, `tenantId=NULL`
- **App-level collaborators (V2)**: `appId=X`, `tenantId=X`

### 001_unified_architecture_rollback.sql
Rollback script for the above migration. **WARNING**: This will remove data!

## Running Migrations

### Apply Migration
```bash
# From project root
docker exec -i api-db-1 mysql -u root -proot codepushdb < migrations/001_unified_architecture.sql
```

### Rollback Migration
```bash
# WARNING: This removes data!
docker exec -i api-db-1 mysql -u root -proot codepushdb < migrations/001_unified_architecture_rollback.sql
```

## Fresh Database Setup

For a fresh database, the migration is **idempotent** - it checks if columns/tables exist before creating them. You can run it multiple times safely.

## Architecture

### Final Schema
```
accounts (users)
  ├── OAuth fields (ssoId, azureAdId, gitHubId, microsoftId)
  └── Profile fields (firstName, lastName, picture, slackId, teamsId)

tenants (organizations)
  └── createdBy → accounts(id)

collaborators (UNIFIED - app + tenant level)
  ├── accountId → accounts(id)
  ├── appId → apps(id)          [nullable - NULL for tenant-level]
  ├── tenantId → tenants(id)    [nullable - NULL for app-only V1]
  ├── permission: Owner, Editor, Viewer, Collaborator
  └── isCreator: true for tenant creators

apps
  ├── accountId → accounts(id)  [nullable - V1 ownership]
  └── tenantId → tenants(id)    [nullable - V2 ownership]
```

### Collaboration Types

| Type | appId | tenantId | Use Case |
|------|-------|----------|----------|
| **Tenant-level** | NULL | UUID | Organization membership (Owner/Editor/Viewer) |
| **App V1** | UUID | NULL | Legacy app-only access |
| **App V2** | UUID | UUID | App within organization |

## Migration Strategy

✅ **Additive Only**: No data is removed or restructured  
✅ **Idempotent**: Can be run multiple times safely  
✅ **Backward Compatible**: Supports both old (V1) and new (V2) flows  
✅ **Zero Downtime**: Existing data remains intact  

## Verification

After running the migration:

```sql
-- Check accounts table has new columns
DESCRIBE accounts;

-- Check collaborators table structure
DESCRIBE collaborators;

-- See collaboration breakdown
SELECT 
  CASE 
    WHEN appId IS NULL AND tenantId IS NOT NULL THEN 'Tenant-level'
    WHEN appId IS NOT NULL AND tenantId IS NULL THEN 'App-level (V1)'
    WHEN appId IS NOT NULL AND tenantId IS NOT NULL THEN 'App-level (V2)'
    ELSE 'Other'
  END as type,
  permission,
  COUNT(*) as count
FROM collaborators
GROUP BY type, permission;
```

## Notes

- The database was already running with most of these changes applied through development
- This migration script is designed to work on both fresh databases and existing ones
- Previous intermediate migration scripts (001-006) have been consolidated into this single script

