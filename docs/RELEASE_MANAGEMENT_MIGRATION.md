# 🚀 Release Management Migration Guide

## 📋 Overview

This migration adds **Release Management** functionality to the New Delivr system, creating **18 new tables** for managing software releases, builds, regression cycles, cherry-picks, and automation.

### Migration Files

| File | Purpose |
|------|---------|
| `002_release_management.sql` | Creates all 18 Release Management tables |
| `002_release_management_seed.sql` | Seeds reference data (platforms, targets) |
| `002_release_management_rollback.sql` | Drops all Release Management tables |

---

## 🗃️ Tables Created (18 Total)

### Core Tables (11)
1. **releases** - Main release information (tenant-scoped)
2. **release_tasks** - Kick-off, pre-release, and regression tasks
3. **release_builds** - Container for final builds
4. **builds** - Individual builds (iOS, Android, Web)
5. **pre_release_tasks** - Pre-release tasks container
6. **regression_cycles** - Regression test cycles
7. **rollouts** - Release rollout tracking
8. **rollout_stats** - Rollout statistics
9. **rollout_user_adoption** - User adoption metrics
10. **cherry_picks** - Cherry-pick PR requests
11. **state_history** - Audit trail for changes
12. **state_history_items** - Individual change items

### Automation Tables (2)
13. **cron_jobs** - Autopilot automation
14. **cron_change_logs** - Cron job change history

### Reference Tables (2)
15. **platforms** - iOS, Android (shared across tenants)
16. **targets** - Web, PlayStore, AppStore (shared)

### Settings Tables (2)
17. **release_settings** - Global release settings
18. **global_settings** - Global configuration

### Feature Tables (1)
19. **whats_new** - Release notes/announcements

---

## 🔑 Key Design Decisions

### Tenant-Centric Architecture
- **All releases belong to a tenant** via `tenantId` foreign key
- Users can only see releases from their tenants
- Permissions inherited from tenant roles (Owner/Editor/Viewer)

### Permission Model
| Tenant Role | Release Permissions |
|-------------|-------------------|
| **Owner** | Full access (create, edit, delete, assign pilot) |
| **Editor** | Create/edit releases, manage builds, cherry-picks |
| **Viewer** | Read-only access |
| **Release Pilot** | Special role, can edit status, approve builds |

### Changes from OG Delivr
| Aspect | OG Delivr | New Delivr |
|--------|-----------|------------|
| **User Field** | `userId` | `accountId` |
| **Scope** | Global | Tenant-based (`tenantId`) |
| **Permissions** | ADMIN/WRITE/READ | Owner/Editor/Viewer |
| **Database** | Prisma | Sequelize |

---

## 🚀 Running the Migration

### Prerequisites
```bash
# Ensure Docker containers are running
cd /Users/jatinkhemchandani/Desktop/delivr-server-ota-managed
docker-compose -f api/docker-compose.yml up -d

# Verify database is accessible
docker exec -it delivr-server-ota-managed-db-1 mysql -u root -p codepushdb
```

### Step 1: Run Main Migration (Create Tables)
```bash
# Execute migration from terminal
mysql -u root -p codepushdb < migrations/002_release_management.sql

# Or from Docker
docker exec -i delivr-server-ota-managed-db-1 mysql -u root -proot codepushdb < migrations/002_release_management.sql
```

**Expected Output:**
```
+-------------------------------------------------+
| Status                                          |
+-------------------------------------------------+
| Release Management tables created successfully! |
+-------------------------------------------------+
```

### Step 2: Seed Reference Data
```bash
# Execute seed script
mysql -u root -p codepushdb < migrations/002_release_management_seed.sql

# Or from Docker
docker exec -i delivr-server-ota-managed-db-1 mysql -u root -proot codepushdb < migrations/002_release_management_seed.sql
```

**Expected Output:**
```
+------------------+
| Status           |
+------------------+
| Platforms seeded:|
+------------------+

+------------------+----------+
| id               | name     |
+------------------+----------+
| platform_android | ANDROID  |
| platform_ios     | IOS      |
+------------------+----------+

+-------------------+
| Status            |
+-------------------+
| Targets seeded:   |
+-------------------+

+-------------------+------------+
| id                | name       |
+-------------------+------------+
| target_appstore   | APP_STORE  |
| target_playstore  | PLAY_STORE |
| target_web        | WEB        |
+-------------------+------------+
```

### Step 3: Verify Migration
```bash
# Check tables were created
mysql -u root -p codepushdb -e "SHOW TABLES LIKE 'release%'; SHOW TABLES LIKE 'platforms'; SHOW TABLES LIKE 'targets';"

# Count total tables (should have 18 new ones)
mysql -u root -p codepushdb -e "SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'codepushdb' AND table_name IN (
  'releases', 'release_tasks', 'release_builds', 'builds', 'pre_release_tasks',
  'regression_cycles', 'rollouts', 'rollout_stats', 'rollout_user_adoption',
  'cherry_picks', 'state_history', 'state_history_items', 'cron_jobs',
  'cron_change_logs', 'platforms', 'targets', 'release_settings',
  'global_settings', 'whats_new'
);"
```

**Expected:** `total_tables = 18`

---

## ⚙️ Rollback (If Needed)

**⚠️ WARNING: This will delete ALL Release Management data!**

```bash
# Rollback migration
mysql -u root -p codepushdb < migrations/002_release_management_rollback.sql

# Or from Docker
docker exec -i delivr-server-ota-managed-db-1 mysql -u root -proot codepushdb < migrations/002_release_management_rollback.sql
```

---

## 🔍 Verification Queries

### Check All Tables Exist
```sql
USE codepushdb;

SELECT 
  table_name,
  table_rows,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'codepushdb'
  AND table_name IN (
    'releases', 'release_tasks', 'release_builds', 'builds', 'pre_release_tasks',
    'regression_cycles', 'rollouts', 'rollout_stats', 'rollout_user_adoption',
    'cherry_picks', 'state_history', 'state_history_items', 'cron_jobs',
    'cron_change_logs', 'platforms', 'targets', 'release_settings',
    'global_settings', 'whats_new'
  )
ORDER BY table_name;
```

### Check Foreign Keys
```sql
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'codepushdb'
  AND TABLE_NAME LIKE 'release%'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
```

### Check Seed Data
```sql
-- Should return 2 platforms (ANDROID, IOS)
SELECT * FROM platforms;

-- Should return 3 targets (WEB, PLAY_STORE, APP_STORE)
SELECT * FROM targets;
```

---

## 📊 Sample Queries

### Create a Test Release
```sql
-- Assuming you have a tenant and account
INSERT INTO releases (
  id,
  tenantId,
  releaseKey,
  plannedDate,
  targetReleaseDate,
  version,
  baseVersion,
  releasePilotAccountId,
  lastUpdateByAccountId,
  createdByAccountId
) VALUES (
  'test-release-001',
  'YOUR_TENANT_ID',
  'R-2025-01',
  NOW() + INTERVAL 7 DAY,
  NOW() + INTERVAL 14 DAY,
  '1.0.0',
  '0.9.0',
  'YOUR_ACCOUNT_ID',
  'YOUR_ACCOUNT_ID',
  'YOUR_ACCOUNT_ID'
);
```

### Get Releases for a Tenant
```sql
SELECT 
  r.releaseKey,
  r.version,
  r.status,
  r.plannedDate,
  a.email as releasePilot
FROM releases r
LEFT JOIN accounts a ON r.releasePilotAccountId = a.id
WHERE r.tenantId = 'YOUR_TENANT_ID'
ORDER BY r.plannedDate DESC;
```

---

## 🎯 Next Steps

After successful migration:

1. ✅ **Phase 1 Complete** - Database tables created
2. ⏳ **Phase 2** - Extend Storage interface with Release methods
3. ⏳ **Phase 3** - Implement Release controllers (CRUD, Tasks, Builds)
4. ⏳ **Phase 4** - Create Release Management API routes
5. ⏳ **Phase 5** - Add integrations (Slack, GitHub, Jenkins, Jira)
6. ⏳ **Phase 6** - Build frontend Release Management module

---

## 🐛 Troubleshooting

### Error: "Can't connect to local MySQL server"
```bash
# Start Docker containers
docker-compose -f api/docker-compose.yml up -d

# Check database is running
docker ps | grep db
```

### Error: "Foreign key constraint fails"
```bash
# Ensure 001_unified_architecture.sql was run first
# It creates the tenants and accounts tables required by this migration
```

### Error: "Table already exists"
```bash
# Migration is idempotent (uses IF NOT EXISTS)
# Safe to re-run without dropping tables

# To completely reset:
mysql -u root -p codepushdb < migrations/002_release_management_rollback.sql
mysql -u root -p codepushdb < migrations/002_release_management.sql
mysql -u root -p codepushdb < migrations/002_release_management_seed.sql
```

---

## 📝 Notes

- **Empty Tables**: All tables start empty except `platforms` and `targets` (seeded)
- **No Historical Data**: This is a fresh start, no data migrated from OG Delivr
- **Tenant Isolation**: Each tenant's releases are completely isolated via `tenantId`
- **Idempotent**: Safe to re-run migration scripts (uses `IF NOT EXISTS`)
- **Foreign Keys**: All foreign keys properly set up with CASCADE/SET NULL/RESTRICT

---

**✅ Migration Complete!** You're ready to start implementing the Release Management storage layer.

