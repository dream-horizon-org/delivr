# Database Migration Cheat Sheet

Quick reference for common database operations.

## 🚀 Running Migrations

```bash
# Run migration (one-liner)
docker exec -i delivr-mysql mysql -u root -proot codepushdb < migrations/003_tenant_scm_integrations_simple.sql

# Run migration (interactive)
docker exec -it delivr-mysql mysql -u root -proot codepushdb
mysql> SOURCE /path/to/migration.sql;
```

## 🔍 Quick Checks

```bash
# Show all tables
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "SHOW TABLES;"

# Describe table
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "DESC tenant_scm_integrations;"

# Check foreign keys
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "
SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA='codepushdb' AND REFERENCED_TABLE_NAME IS NOT NULL;"

# Count rows
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "SELECT COUNT(*) FROM tenant_scm_integrations;"
```

## 🐛 Common Fixes

### Fix Foreign Key Error (Character Set Mismatch)
```sql
-- Check parent table character set
SHOW CREATE TABLE tenants;

-- Match child table to parent
ALTER TABLE tenant_scm_integrations
MODIFY COLUMN tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin;
```

### Drop Table Safely
```bash
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "DROP TABLE IF EXISTS tenant_scm_integrations;"
```

### Backup Before Migration
```bash
docker exec delivr-mysql mysqldump -u root -proot codepushdb > backup_$(date +%Y%m%d).sql
```

## 🔄 Rollback

```bash
# Rollback last migration
docker exec -i delivr-mysql mysql -u root -proot codepushdb < migrations/003_tenant_scm_integrations_rollback.sql
```

## 📊 Current Migrations

```bash
cd /Users/jatinkhemchandani/Desktop/delivr-server-ota-managed/migrations

# List migrations
ls -la *.sql

# Applied:
# ✅ 001_unified_architecture.sql
# ✅ 003_tenant_scm_integrations_simple.sql

# Not Applied:
# ❌ 002_release_management.sql (skipped)
```

## 🎯 Environment

- **Database**: `codepushdb`
- **User**: `root`
- **Password**: `root`
- **Container**: `delivr-mysql`
- **MySQL Version**: 5.7

---

📖 Full guide: [DATABASE_MIGRATION_GUIDE.md](docs/DATABASE_MIGRATION_GUIDE.md)

