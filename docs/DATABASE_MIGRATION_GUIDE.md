# Database Migration Guide

A practical guide for running SQL migrations and fixing common database issues in the Delivr project.

## 🚀 Quick Start

### Running Migrations

```bash
# 1. Connect to MySQL in Docker
docker exec -it delivr-mysql mysql -u root -p

# 2. Enter password when prompted
# Default: root

# 3. Switch to database
USE codepushdb;

# 4. Run migration
SOURCE /path/to/migration.sql;
```

## 📁 Migration Files

### Current Migrations

```
migrations/
├── 001_unified_architecture.sql              # Accounts & collaborators schema
├── 001_unified_architecture_rollback.sql     # Rollback for 001
├── 002_release_management.sql                # Release Management tables (unused)
├── 003_tenant_scm_integrations_simple.sql    # SCM integrations table ✅
└── 003_tenant_scm_integrations_rollback.sql  # Rollback for 003
```

### Active Migrations

1. **001_unified_architecture.sql** - Adds OAuth fields to accounts, expands collaborators
2. **003_tenant_scm_integrations_simple.sql** - Creates SCM integration table

## 🔧 Running Migrations Step-by-Step

### Option 1: Via Docker (Recommended)

```bash
# Navigate to project directory
cd /Users/jatinkhemchandani/Desktop/delivr-server-ota-managed

# Run migration
docker exec -i delivr-mysql mysql -u root -proot codepushdb < migrations/003_tenant_scm_integrations_simple.sql

# Check for errors
echo $?  # Should return 0 if successful
```

### Option 2: Interactive MySQL Shell

```bash
# Enter MySQL shell
docker exec -it delivr-mysql mysql -u root -proot codepushdb

# Run migration interactively
mysql> SOURCE /var/lib/mysql-files/003_tenant_scm_integrations_simple.sql;

# Or paste SQL directly
mysql> CREATE TABLE IF NOT EXISTS tenant_scm_integrations (...);
```

### Option 3: From Host Machine

```bash
# If MySQL is exposed on port 3306
mysql -h localhost -P 3306 -u root -proot codepushdb < migrations/003_tenant_scm_integrations_simple.sql
```

## 🐛 Common Issues & Fixes

### Issue 1: Foreign Key Constraint Errors

#### Error Message
```
ERROR 1215 (HY000): Cannot add foreign key constraint
```

#### Causes & Solutions

**A. Character Set Mismatch**

```sql
-- ❌ PROBLEM: Different character sets
-- Parent table (tenants)
id CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin

-- Child table (tenant_scm_integrations)
tenantId CHAR(36) CHARACTER SET utf8mb4  -- ❌ Mismatch!

-- ✅ SOLUTION: Match character sets exactly
ALTER TABLE tenant_scm_integrations
MODIFY COLUMN tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin;
```

**B. Referenced Column Doesn't Exist**

```sql
-- Check parent table structure
DESC tenants;
SHOW CREATE TABLE tenants;

-- Ensure the column you're referencing exists
-- Foreign key must reference PRIMARY KEY or UNIQUE column
```

**C. Table Doesn't Exist Yet**

```sql
-- ❌ PROBLEM: Referencing table not created yet
CREATE TABLE child (
  parent_id INT,
  FOREIGN KEY (parent_id) REFERENCES parent(id)  -- parent doesn't exist!
);

-- ✅ SOLUTION: Create parent table first
CREATE TABLE parent (id INT PRIMARY KEY);
CREATE TABLE child (
  parent_id INT,
  FOREIGN KEY (parent_id) REFERENCES parent(id)
);

-- OR: Remove foreign keys from CREATE and add later
CREATE TABLE child (parent_id INT);
ALTER TABLE child 
  ADD CONSTRAINT fk_parent 
  FOREIGN KEY (parent_id) REFERENCES parent(id);
```

**D. Data Type Mismatch**

```sql
-- ❌ PROBLEM: Different data types
-- Parent: id INT
-- Child: parent_id VARCHAR(36)  -- ❌ Type mismatch!

-- ✅ SOLUTION: Match data types exactly
ALTER TABLE child MODIFY COLUMN parent_id INT;
```

### Issue 2: Reserved Keyword Errors

#### Error Message
```
ERROR 1064 (42000): You have an error in your SQL syntax near 'delayed'
```

#### Solution
```sql
-- ❌ PROBLEM: 'delayed' is a MySQL reserved keyword
CREATE TABLE releases (
  delayed BOOLEAN  -- ❌ Reserved word!
);

-- ✅ SOLUTION: Rename the column
CREATE TABLE releases (
  isDelayed BOOLEAN  -- ✅ Good!
);

-- OR: Use backticks (not recommended)
CREATE TABLE releases (
  `delayed` BOOLEAN
);
```

### Issue 3: Invalid Default Values

#### Error Message
```
ERROR 1067 (42000): Invalid default value for 'plannedDate'
```

#### Solution
```sql
-- ❌ PROBLEM: TIMESTAMP requires default or NULL
CREATE TABLE releases (
  plannedDate TIMESTAMP NOT NULL  -- ❌ No default!
);

-- ✅ SOLUTION 1: Use DATETIME instead
CREATE TABLE releases (
  plannedDate DATETIME DEFAULT NULL
);

-- ✅ SOLUTION 2: Add default
CREATE TABLE releases (
  plannedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ SOLUTION 3: Allow NULL
CREATE TABLE releases (
  plannedDate TIMESTAMP NULL
);
```

### Issue 4: Table Already Exists

#### Error Message
```
ERROR 1050 (42S01): Table 'tenant_scm_integrations' already exists
```

#### Solution
```bash
# Check if table exists
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "SHOW TABLES LIKE 'tenant_scm_integrations';"

# Drop table if needed (⚠️ Data loss!)
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "DROP TABLE IF EXISTS tenant_scm_integrations;"

# Or use CREATE TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS tenant_scm_integrations (...);
```

## 🔍 Verification Commands

### Check Table Structure

```sql
-- Show all tables
SHOW TABLES;

-- Describe table structure
DESC tenant_scm_integrations;

-- Show complete CREATE statement
SHOW CREATE TABLE tenant_scm_integrations;

-- Show indexes
SHOW INDEX FROM tenant_scm_integrations;
```

### Check Foreign Keys

```sql
-- MySQL 5.7+ (our version)
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'codepushdb'
  AND TABLE_NAME = 'tenant_scm_integrations'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Check specific constraint
SELECT * FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'codepushdb'
  AND TABLE_NAME = 'tenant_scm_integrations'
  AND CONSTRAINT_TYPE = 'FOREIGN KEY';
```

### Check Character Sets

```sql
-- Check table character set
SELECT 
  TABLE_NAME, 
  TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'codepushdb';

-- Check column character sets
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CHARACTER_SET_NAME,
  COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'codepushdb'
  AND TABLE_NAME IN ('tenants', 'tenant_scm_integrations');
```

### Check Data

```sql
-- Count rows
SELECT COUNT(*) FROM tenant_scm_integrations;

-- View recent data
SELECT * FROM tenant_scm_integrations ORDER BY createdAt DESC LIMIT 5;

-- Check for orphaned records (no matching parent)
SELECT t.* 
FROM tenant_scm_integrations t
LEFT JOIN tenants ON t.tenantId = tenants.id
WHERE tenants.id IS NULL;
```

## 🔄 Rollback Migrations

### Rollback SCM Integration

```bash
# Run rollback script
docker exec -i delivr-mysql mysql -u root -proot codepushdb < migrations/003_tenant_scm_integrations_rollback.sql

# Verify table is dropped
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "SHOW TABLES LIKE 'tenant_scm_integrations';"
```

### Manual Rollback

```sql
-- Drop foreign keys first
ALTER TABLE tenant_scm_integrations DROP FOREIGN KEY tenant_scm_integrations_ibfk_1;
ALTER TABLE tenant_scm_integrations DROP FOREIGN KEY tenant_scm_integrations_ibfk_2;

-- Then drop table
DROP TABLE IF EXISTS tenant_scm_integrations;
```

## 🛠️ Troubleshooting

### Can't Connect to MySQL

```bash
# Check if MySQL container is running
docker ps | grep mysql

# Check logs
docker logs delivr-mysql

# Restart container
docker restart delivr-mysql

# Check port mapping
docker port delivr-mysql
```

### Permission Denied

```sql
-- Grant permissions (run as root)
GRANT ALL PRIVILEGES ON codepushdb.* TO 'root'@'%';
FLUSH PRIVILEGES;
```

### Database Doesn't Exist

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS codepushdb 
  CHARACTER SET latin1 
  COLLATE latin1_bin;

-- Verify
SHOW DATABASES LIKE 'codepushdb';
```

### Check MySQL Version

```bash
# Via Docker
docker exec delivr-mysql mysql --version

# Via SQL
docker exec -it delivr-mysql mysql -u root -proot -e "SELECT VERSION();"
```

## 📊 Current Schema Status

### What's Applied

1. ✅ **001_unified_architecture.sql**
   - Added OAuth fields to `accounts` table
   - Expanded `collaborators` permission enum
   - Made `collaborators` support tenant-level collaboration

2. ✅ **003_tenant_scm_integrations_simple.sql**
   - Created `tenant_scm_integrations` table
   - One-to-one relationship with `tenants`
   - Foreign keys to `tenants` and `accounts`

### What's NOT Applied

- ❌ **002_release_management.sql** - Skipped (too complex, using hybrid approach instead)

## 📝 Best Practices

### Before Running Migrations

```bash
# 1. Backup database
docker exec delivr-mysql mysqldump -u root -proot codepushdb > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration syntax
docker exec -i delivr-mysql mysql -u root -proot codepushdb --dry-run < migration.sql

# 3. Check current schema
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "SHOW TABLES;"
```

### After Running Migrations

```bash
# 1. Verify tables created
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "SHOW TABLES;"

# 2. Check for errors in logs
docker logs delivr-mysql --tail 50

# 3. Test application startup
npm run start
```

### Writing New Migrations

```sql
-- Always use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS my_table (...);

-- Always provide rollback
-- File: XXX_my_migration_rollback.sql
DROP TABLE IF EXISTS my_table;

-- Match character sets exactly
-- Check parent table first:
SHOW CREATE TABLE parent_table;

-- Then match in child table
CREATE TABLE child_table (
  parent_id CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin
);

-- Add foreign keys at the end
ALTER TABLE child_table
  ADD CONSTRAINT fk_name
  FOREIGN KEY (parent_id) REFERENCES parent_table(id);
```

## 🎯 Quick Reference

### One-Line Commands

```bash
# Run migration
docker exec -i delivr-mysql mysql -u root -proot codepushdb < migrations/003_tenant_scm_integrations_simple.sql

# Rollback migration
docker exec -i delivr-mysql mysql -u root -proot codepushdb < migrations/003_tenant_scm_integrations_rollback.sql

# Show all tables
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "SHOW TABLES;"

# Describe table
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "DESC tenant_scm_integrations;"

# Check foreign keys
docker exec -it delivr-mysql mysql -u root -proot codepushdb -e "SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='codepushdb' AND REFERENCED_TABLE_NAME='tenants';"

# Backup database
docker exec delivr-mysql mysqldump -u root -proot codepushdb > backup.sql

# Restore database
docker exec -i delivr-mysql mysql -u root -proot codepushdb < backup.sql
```

## 🔗 Related Files

- Migration scripts: `/migrations/*.sql`
- Models: `/api/script/storage/*.ts`
- Controllers: `/api/script/storage/integrations/*/`
- Documentation: `/docs/MIGRATION_VS_SYNC_EXPLAINED.md`

---

**Last Updated**: Based on SCM integration implementation (Migration 003)

