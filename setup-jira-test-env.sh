#!/bin/bash

# ============================================================================
# Jira Integration Test Environment Setup
# Automatically creates test data in database for running tests
# ============================================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Print functions
success() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; }
info() { echo -e "${BLUE}ℹ $1${NC}"; }
header() { echo -e "\n${YELLOW}═══ $1 ═══${NC}\n"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-root}"
DB_NAME="${DB_NAME:-codepushdb}"

TEST_USER_ID="${TEST_USER_ID:-test_user_123}"
TEST_TENANT_ID="${TEST_TENANT_ID:-test_tenant_123}"
TEST_ACCOUNT_EMAIL="${TEST_ACCOUNT_EMAIL:-test@example.com}"
TEST_ACCOUNT_NAME="${TEST_ACCOUNT_NAME:-Test User}"
TEST_TENANT_NAME="${TEST_TENANT_NAME:-Test Organization}"

header "JIRA INTEGRATION TEST ENVIRONMENT SETUP"

info "Configuration:"
echo "  Database Host: $DB_HOST"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  Test User ID: $TEST_USER_ID"
echo "  Test Tenant ID: $TEST_TENANT_ID"
echo ""

# ============================================================================
# Check Prerequisites
# ============================================================================
header "CHECKING PREREQUISITES"

info "Checking if MySQL is accessible..."
if command -v mysql &> /dev/null; then
    success "MySQL client is installed"
else
    fail "MySQL client is not installed"
    echo "Install with: brew install mysql (macOS) or apt-get install mysql-client (Linux)"
    exit 1
fi

info "Testing database connection..."
if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    success "Database connection successful"
else
    fail "Cannot connect to database"
    echo "Please check your database credentials:"
    echo "  DB_HOST=$DB_HOST"
    echo "  DB_USER=$DB_USER"
    echo "  DB_PASSWORD=$DB_PASSWORD"
    exit 1
fi

info "Checking if database exists..."
if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME;" &> /dev/null; then
    success "Database '$DB_NAME' exists"
else
    fail "Database '$DB_NAME' does not exist"
    warn "Creating database..."
    mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"
    success "Database created"
fi

# ============================================================================
# Check if migrations are needed
# ============================================================================
header "CHECKING DATABASE SCHEMA"

info "Checking if required tables exist..."

# Check for accounts table
ACCOUNTS_EXISTS=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SHOW TABLES LIKE 'accounts';" | grep -c "accounts" || echo "0")

# Check for tenants table  
TENANTS_EXISTS=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SHOW TABLES LIKE 'tenants';" | grep -c "tenants" || echo "0")

# Check for collaborators table
COLLABORATORS_EXISTS=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SHOW TABLES LIKE 'collaborators';" | grep -c "collaborators" || echo "0")

# Check for jira_integrations table
JIRA_INTEGRATIONS_EXISTS=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SHOW TABLES LIKE 'jira_integrations';" | grep -c "jira_integrations" || echo "0")

# Check for jira_configurations table
JIRA_CONFIGURATIONS_EXISTS=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SHOW TABLES LIKE 'jira_configurations';" | grep -c "jira_configurations" || echo "0")

if [ "$ACCOUNTS_EXISTS" = "0" ] || [ "$TENANTS_EXISTS" = "0" ] || [ "$COLLABORATORS_EXISTS" = "0" ]; then
    fail "Core tables are missing"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "MIGRATIONS REQUIRED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Please run database migrations first:"
    echo ""
    echo "1. Navigate to migrations directory:"
    echo "   cd migrations"
    echo ""
    echo "2. Run migrations:"
    echo "   mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME < 001_unified_architecture.sql"
    echo "   mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME < 002_release_management.sql"
    echo "   mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME < 003_tenant_scm_integrations_simple.sql"
    echo "   mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME < 004_jira_epic_management.sql"
    echo ""
    echo "3. Re-run this script:"
    echo "   ./setup-jira-test-env.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
else
    success "Core tables exist"
fi

if [ "$JIRA_INTEGRATIONS_EXISTS" = "0" ] || [ "$JIRA_CONFIGURATIONS_EXISTS" = "0" ]; then
    fail "Jira tables are missing"
    echo ""
    echo "Run Jira migration:"
    echo "  cd migrations"
    echo "  mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME < 004_jira_epic_management.sql"
    exit 1
else
    success "Jira tables exist"
fi

# ============================================================================
# Create Test Data
# ============================================================================
header "CREATING TEST DATA"

info "Creating test account..."
mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" <<EOF
INSERT INTO accounts (id, email, name)
VALUES (
  '$TEST_USER_ID',
  '$TEST_ACCOUNT_EMAIL',
  '$TEST_ACCOUNT_NAME'
)
ON DUPLICATE KEY UPDATE 
  email = VALUES(email),
  name = VALUES(name);
EOF

ACCOUNT_CHECK=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SELECT COUNT(*) as count FROM accounts WHERE id='$TEST_USER_ID';" | tail -n1)

if [ "$ACCOUNT_CHECK" = "1" ]; then
    success "Test account created/updated: $TEST_USER_ID"
else
    fail "Failed to create test account"
    exit 1
fi

info "Creating test tenant..."
mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" <<EOF
INSERT INTO tenants (id, name)
VALUES (
  '$TEST_TENANT_ID',
  '$TEST_TENANT_NAME'
)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name);
EOF

TENANT_CHECK=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SELECT COUNT(*) as count FROM tenants WHERE id='$TEST_TENANT_ID';" | tail -n1)

if [ "$TENANT_CHECK" = "1" ]; then
    success "Test tenant created/updated: $TEST_TENANT_ID"
else
    fail "Failed to create test tenant"
    exit 1
fi

info "Creating tenant collaborator (Owner permissions)..."
mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" <<EOF
INSERT INTO collaborators (id, accountId, tenantId, appId, permission, isCreator)
VALUES (
  'collab_${TEST_USER_ID}_${TEST_TENANT_ID}',
  '$TEST_USER_ID',
  '$TEST_TENANT_ID',
  NULL,
  'Owner',
  1
)
ON DUPLICATE KEY UPDATE 
  permission = VALUES(permission),
  isCreator = VALUES(isCreator);
EOF

COLLAB_CHECK=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SELECT COUNT(*) as count FROM collaborators WHERE accountId='$TEST_USER_ID' AND tenantId='$TEST_TENANT_ID' AND appId IS NULL;" | tail -n1)

if [ "$COLLAB_CHECK" = "1" ]; then
    success "Tenant collaborator created/updated"
else
    fail "Failed to create tenant collaborator"
    exit 1
fi

# ============================================================================
# Verify Setup
# ============================================================================
header "VERIFYING SETUP"

info "Verifying account..."
ACCOUNT_INFO=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SELECT id, email, name FROM accounts WHERE id='$TEST_USER_ID';" | tail -n1)
echo "  $ACCOUNT_INFO"
success "Account verified"

info "Verifying tenant..."
TENANT_INFO=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SELECT id, displayName, createdBy FROM tenants WHERE id='$TEST_TENANT_ID';" | tail -n1)
echo "  $TENANT_INFO"
success "Tenant verified"

info "Verifying collaborator..."
COLLAB_INFO=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -D"$DB_NAME" \
    -e "SELECT accountId, tenantId, permission, isCreator FROM collaborators WHERE accountId='$TEST_USER_ID' AND tenantId='$TEST_TENANT_ID' AND appId IS NULL;" | tail -n1)
echo "  $COLLAB_INFO"
success "Collaborator verified"

# ============================================================================
# Create .env file for tests
# ============================================================================
header "CREATING ENVIRONMENT FILE"

info "Creating .env file in api directory..."
cat > api/.env.test <<EOF
# Jira Integration Test Environment
# Generated by setup-jira-test-env.sh

# ============================================================================
# DEBUG MODE - Disables authentication for testing
# ============================================================================
DEBUG_DISABLE_AUTH=true
DEBUG_USER_ID=$TEST_USER_ID

# ============================================================================
# API CONFIGURATION
# ============================================================================
API_PORT=3010
PORT=3010

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# ============================================================================
# TEST DATA
# ============================================================================
TEST_TENANT_ID=$TEST_TENANT_ID
TEST_USER_ID=$TEST_USER_ID

# ============================================================================
# LOGGING
# ============================================================================
LOGGING=true
EOF

success ".env.test file created"

# ============================================================================
# Summary
# ============================================================================
header "SETUP COMPLETE ✓"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST ENVIRONMENT IS READY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test Data Created:"
echo "  • Account ID: $TEST_USER_ID"
echo "  • Account Email: $TEST_ACCOUNT_EMAIL"
echo "  • Tenant ID: $TEST_TENANT_ID"
echo "  • Tenant Name: $TEST_TENANT_NAME"
echo "  • Permission: Owner"
echo ""
echo "Next Steps:"
echo ""
echo "1. Start the API in debug mode:"
echo "   cd api"
echo "   source .env.test"
echo "   npm start"
echo ""
echo "2. In another terminal, run tests:"
echo "   cd /Users/harshavardhanithota/Documents/jira/delivr-server-ota-managed"
echo "   TENANT_ID=$TEST_TENANT_ID ./test-jira-complete.sh"
echo ""
echo "OR use the one-liner:"
echo "   cd api && source .env.test && npm start &"
echo "   sleep 5 && TENANT_ID=$TEST_TENANT_ID ./test-jira-complete.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

