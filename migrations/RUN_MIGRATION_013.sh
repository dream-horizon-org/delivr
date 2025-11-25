#!/bin/bash

# ============================================================================
# Migration 013: Platform Targets Column
# Quick execution script
# ============================================================================

set -e  # Exit on error

echo "=========================================="
echo "Migration 013: Platform Targets Column"
echo "=========================================="
echo ""

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-root}"
DB_NAME="${DB_NAME:-codepushdb}"
MIGRATION_FILE="013_add_platform_targets_column.sql"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# Step 1: Pre-Migration Checks
# ============================================================================

echo "Step 1: Pre-Migration Checks"
echo "----------------------------"

# Check if MySQL is accessible
if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME" 2>/dev/null; then
    echo -e "${RED}Error: Cannot connect to MySQL database${NC}"
    echo "Please check your database credentials"
    exit 1
fi

echo -e "${GREEN}✓ Database connection successful${NC}"

# Check if table exists
TABLE_CHECK=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -se "
    SELECT COUNT(*) 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = '$DB_NAME' 
      AND TABLE_NAME = 'release_configurations'
")

if [ "$TABLE_CHECK" -eq "0" ]; then
    echo -e "${RED}Error: release_configurations table does not exist${NC}"
    exit 1
fi

echo -e "${GREEN}✓ release_configurations table exists${NC}"

# Check if platformTargets column already exists
COLUMN_CHECK=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -se "
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = '$DB_NAME' 
      AND TABLE_NAME = 'release_configurations'
      AND COLUMN_NAME = 'platformTargets'
")

if [ "$COLUMN_CHECK" -gt "0" ]; then
    echo -e "${YELLOW}⚠ Warning: platformTargets column already exists${NC}"
    echo "Migration may have already been run."
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled"
        exit 0
    fi
fi

echo ""

# ============================================================================
# Step 2: Backup
# ============================================================================

echo "Step 2: Creating Backup"
echo "----------------------"

BACKUP_FILE="backup_release_configs_$(date +%Y%m%d_%H%M%S).sql"

echo "Creating backup: $BACKUP_FILE"
mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" release_configurations > "$BACKUP_FILE" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}Error: Backup failed${NC}"
    exit 1
fi

echo ""

# ============================================================================
# Step 3: Show Preview
# ============================================================================

echo "Step 3: Preview Current Data"
echo "----------------------------"

CONFIG_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -se "
    SELECT COUNT(*) FROM release_configurations
")

echo "Total configurations: $CONFIG_COUNT"
echo ""

if [ "$CONFIG_COUNT" -gt "0" ]; then
    echo "Sample of current data:"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -e "
        SELECT id, name, platforms, targets 
        FROM release_configurations 
        LIMIT 3
    "
fi

echo ""

# ============================================================================
# Step 4: Confirmation
# ============================================================================

echo "Step 4: Confirmation"
echo "-------------------"

echo -e "${YELLOW}You are about to run migration 013${NC}"
echo "This will:"
echo "  1. Add platformTargets column"
echo "  2. Migrate $CONFIG_COUNT configurations"
echo "  3. Keep old columns for compatibility"
echo ""
echo "Backup saved to: $BACKUP_FILE"
echo ""

read -p "Do you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

echo ""

# ============================================================================
# Step 5: Run Migration
# ============================================================================

echo "Step 5: Running Migration"
echo "------------------------"

echo "Executing: $MIGRATION_FILE"

if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$MIGRATION_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Migration completed successfully${NC}"
else
    echo -e "${RED}Error: Migration failed${NC}"
    echo "You can restore from backup: $BACKUP_FILE"
    exit 1
fi

echo ""

# ============================================================================
# Step 6: Verification
# ============================================================================

echo "Step 6: Verification"
echo "-------------------"

# Check column exists
COLUMN_EXISTS=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -se "
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = '$DB_NAME' 
      AND TABLE_NAME = 'release_configurations'
      AND COLUMN_NAME = 'platformTargets'
")

if [ "$COLUMN_EXISTS" -eq "0" ]; then
    echo -e "${RED}✗ platformTargets column not found${NC}"
    exit 1
else
    echo -e "${GREEN}✓ platformTargets column exists${NC}"
fi

# Check migrated data
MIGRATED_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -se "
    SELECT COUNT(*) 
    FROM release_configurations 
    WHERE platformTargets IS NOT NULL
")

echo "Migrated configurations: $MIGRATED_COUNT / $CONFIG_COUNT"

if [ "$MIGRATED_COUNT" -eq "$CONFIG_COUNT" ]; then
    echo -e "${GREEN}✓ All configurations migrated${NC}"
else
    echo -e "${YELLOW}⚠ Some configurations not migrated${NC}"
    echo "This may be expected if some configs had NULL targets"
fi

echo ""

# Show sample
if [ "$MIGRATED_COUNT" -gt "0" ]; then
    echo "Sample migrated data:"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" -e "
        SELECT 
          id,
          name,
          JSON_EXTRACT(platformTargets, '$[0]') as first_platform_target
        FROM release_configurations 
        WHERE platformTargets IS NOT NULL
        LIMIT 3
    "
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "=========================================="
echo "Migration 013 Complete!"
echo "=========================================="
echo ""
echo "✓ Column added: platformTargets"
echo "✓ Data migrated: $MIGRATED_COUNT configurations"
echo "✓ Backup saved: $BACKUP_FILE"
echo ""
echo "Next steps:"
echo "1. Update backend ReleaseConfigService to use platformTargets"
echo "2. Test release config creation/editing"
echo "3. Monitor logs for any issues"
echo ""
echo "See: migrations/013_MIGRATION_GUIDE.md for details"
echo ""

