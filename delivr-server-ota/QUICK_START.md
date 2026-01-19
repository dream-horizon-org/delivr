# Jira Integration - Quick Start Guide

## 🎯 Goal

Get Jira integration tests running successfully in 5 minutes.

---

## ⚡ Quick Start (Automated Setup)

### Step 1: Run Setup Script

```bash
cd /Users/harshavardhanithota/Documents/jira/delivr-server-ota-managed
./setup-jira-test-env.sh
```

This script automatically:
- ✅ Checks database connection
- ✅ Verifies required tables exist
- ✅ Creates test account
- ✅ Creates test tenant
- ✅ Sets up permissions
- ✅ Creates `.env.test` file

### Step 2: Start API

```bash
cd api
source .env.test
npm start
```

### Step 3: Run Tests

In another terminal:

```bash
cd /Users/harshavardhanithota/Documents/jira/delivr-server-ota-managed
TENANT_ID=test_tenant_123 ./test-jira-complete.sh
```

**Expected Output:**
```
✓ All tests passed!
```

---

## 🔧 Manual Setup (If Automated Fails)

### Prerequisites

1. **Database is running:**
```bash
# Check if MySQL is running
mysql -u root -proot -e "SELECT 1;"
```

2. **Database exists:**
```bash
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS codepushdb;"
```

3. **Migrations are applied:**
```bash
cd migrations
mysql -u root -proot codepushdb < 001_unified_architecture.sql
mysql -u root -proot codepushdb < 002_release_management.sql
mysql -u root -proot codepushdb < 003_tenant_scm_integrations_simple.sql
mysql -u root -proot codepushdb < 004_jira_epic_management.sql
```

### Manual Test Data Creation

```sql
-- Connect to database
mysql -u root -proot codepushdb

-- Create test account
INSERT INTO accounts (id, email, name, createdTime)
VALUES ('test_user_123', 'test@example.com', 'Test User', UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE id=id;

-- Create test tenant
INSERT INTO tenants (id, displayName, createdBy, createdTime)
VALUES ('test_tenant_123', 'Test Organization', 'test_user_123', UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE id=id;

-- Create tenant collaborator (IMPORTANT!)
INSERT INTO collaborators (id, accountId, tenantId, appId, permission, isCreator, createdTime)
VALUES (
  'collab_test_123',
  'test_user_123',
  'test_tenant_123',
  NULL,  -- NULL for tenant-level
  'Owner',
  1,
  UNIX_TIMESTAMP()
)
ON DUPLICATE KEY UPDATE id=id;

-- Verify setup
SELECT * FROM accounts WHERE id='test_user_123';
SELECT * FROM tenants WHERE id='test_tenant_123';
SELECT * FROM collaborators WHERE accountId='test_user_123' AND tenantId='test_tenant_123';
```

### Start API in Debug Mode

```bash
cd api
DEBUG_DISABLE_AUTH=true \
DEBUG_USER_ID=test_user_123 \
API_PORT=3010 \
npm start
```

### Run Tests

```bash
cd /Users/harshavardhanithota/Documents/jira/delivr-server-ota-managed
TENANT_ID=test_tenant_123 ./test-jira-complete.sh
```

---

## 📊 Expected Test Results

When everything is working, you should see:

```
═══ JIRA API TEST SUITE ═══

Base URL: http://localhost:3010

═══ PREREQUISITES ═══

ℹ 0.1 Checking if API is running...
✓ API is running
ℹ 0.2 Checking debug mode...
✓ Debug mode is active (auth disabled)
ℹ 0.3 Getting/Creating test tenant...
✓ Tenant exists and is accessible

═══ TEST 1: JIRA INTEGRATION APIs ═══

ℹ 1.1 Creating JIRA Integration...
✓ Create Integration
ℹ 1.2 Reading JIRA Integration...
✓ Read Integration
ℹ 1.3 Testing JIRA Connection...
✓ Test Connection

═══ TEST 2: JIRA CONFIGURATION APIs ═══

ℹ 2.1 Creating JIRA Configuration...
✓ Create Configuration
   Config ID: abc123xyz
ℹ 2.2 Reading All Configurations...
✓ Read All Configurations
ℹ 2.3 Reading Single Configuration...
✓ Read Single Configuration
ℹ 2.4 Updating Configuration...
✓ Update Configuration
ℹ 2.5 Deleting Configuration...
✓ Delete Configuration

═══ TEST 3: CLEANUP ═══

ℹ 3.1 Deleting Integration...
✓ Delete Integration

═══ TEST SUMMARY ═══

Total Tests: 9
Passed: 9
Failed: 0

✓ All tests passed!
```

---

## 🐛 Troubleshooting

### Issue: "API is not running"

**Solution:**
```bash
# Check if process is running
ps aux | grep node

# Kill any old processes
pkill -f "node.*server"

# Start fresh
cd api
DEBUG_DISABLE_AUTH=true DEBUG_USER_ID=test_user_123 API_PORT=3010 npm start
```

### Issue: "foreign key constraint fails"

**Cause:** Missing account or tenant

**Solution:**
```bash
# Re-run setup script
./setup-jira-test-env.sh

# Or manually check:
mysql -u root -proot codepushdb -e "
  SELECT 'Accounts:', COUNT(*) FROM accounts WHERE id='test_user_123';
  SELECT 'Tenants:', COUNT(*) FROM tenants WHERE id='test_tenant_123';
  SELECT 'Collaborators:', COUNT(*) FROM collaborators 
    WHERE accountId='test_user_123' AND tenantId='test_tenant_123';
"
```

### Issue: "You are not a member of this organization"

**Cause:** Missing collaborator record

**Solution:**
```sql
-- Create collaborator
INSERT INTO collaborators (id, accountId, tenantId, appId, permission, isCreator, createdTime)
VALUES (
  'collab_test_123',
  'test_user_123',
  'test_tenant_123',
  NULL,
  'Owner',
  1,
  UNIX_TIMESTAMP()
);
```

### Issue: "Unauthorized" (401)

**Cause:** Authentication is enabled

**Solution:**
```bash
# Ensure debug mode is on
export DEBUG_DISABLE_AUTH=true
export DEBUG_USER_ID=test_user_123

# Restart API
cd api && npm start
```

### Issue: Port 3010 already in use

**Solution:**
```bash
# Find process using port 3010
lsof -i :3010

# Kill it
kill -9 <PID>

# Or use different port
API_PORT=3011 npm start
```

---

## 🔍 Verification Commands

### Check Database Setup

```bash
mysql -u root -proot codepushdb <<EOF
SELECT 'Accounts' as Table_Name, COUNT(*) as Count FROM accounts WHERE id='test_user_123'
UNION ALL
SELECT 'Tenants', COUNT(*) FROM tenants WHERE id='test_tenant_123'
UNION ALL
SELECT 'Collaborators', COUNT(*) FROM collaborators WHERE accountId='test_user_123' AND tenantId='test_tenant_123'
UNION ALL
SELECT 'Jira Integrations', COUNT(*) FROM jira_integrations
UNION ALL
SELECT 'Jira Configurations', COUNT(*) FROM jira_configurations;
EOF
```

Expected output:
```
+---------------------+-------+
| Table_Name          | Count |
+---------------------+-------+
| Accounts            |     1 |
| Tenants             |     1 |
| Collaborators       |     1 |
| Jira Integrations   |     * |
| Jira Configurations |     * |
+---------------------+-------+
```

### Check API Health

```bash
curl http://localhost:3010/health
```

Expected output:
```json
{"status":"UP"}
```

### Test Authentication Status

```bash
# Should work (not 401/403)
curl http://localhost:3010/tenants/test_tenant_123/integrations/jira
```

---

## 📚 Architecture Overview

```
Test Data Hierarchy:
===================

accounts (test_user_123)
   │
   └─► tenants (test_tenant_123)
          │
          ├─► collaborators (permission: Owner)
          │
          ├─► jira_integrations (credentials)
          │      └─► one per tenant
          │
          └─► jira_configurations (reusable configs)
                 └─► many per tenant
```

**Key Relationships:**
- `jira_integrations.tenantId` → `tenants.id`
- `jira_integrations.createdByAccountId` → `accounts.id`
- `jira_configurations.tenantId` → `tenants.id`
- `jira_configurations.createdByAccountId` → `accounts.id`
- `collaborators.accountId` → `accounts.id`
- `collaborators.tenantId` → `tenants.id`

---

## 🎯 Next Steps After Tests Pass

### 1. Test with Real Jira Instance

Update the test script with real Jira credentials:

```bash
export JIRA_URL="https://your-company.atlassian.net"
export API_TOKEN="your_real_api_token"
export EMAIL="your_email@company.com"

TENANT_ID=test_tenant_123 ./test-jira-complete.sh
```

### 2. Test Epic Creation

```bash
# Create a configuration
curl -X POST http://localhost:3010/tenants/test_tenant_123/jira/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "configName": "Production Config",
    "platformsConfig": {
      "WEB": {"projectKey": "FE", "readyToReleaseState": "Done"},
      "IOS": {"projectKey": "IOS", "readyToReleaseState": "Released"}
    }
  }'

# Create release with epics
curl -X POST http://localhost:3010/tenants/test_tenant_123/releases \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.0.0",
    "jiraConfigId": "<config_id_from_above>",
    "platforms": ["WEB", "IOS"],
    "autoCreateJiraEpics": true
  }'
```

### 3. Production Setup

1. Remove debug mode:
   ```bash
   # In production .env, do NOT include:
   # DEBUG_DISABLE_AUTH=true
   ```

2. Configure OAuth:
   ```bash
   # Set up proper OAuth providers
   GOOGLE_CLIENT_ID=...
   GITHUB_CLIENT_ID=...
   AZURE_AD_CLIENT_ID=...
   ```

3. Use real tenant IDs from production database

---

## 🔐 Security Reminders

**⚠️ CRITICAL: Debug mode is for testing only!**

```bash
# ❌ NEVER in production:
DEBUG_DISABLE_AUTH=true

# ✅ Always in production:
# (no DEBUG_DISABLE_AUTH variable at all)
```

**In production:**
- Users must authenticate via OAuth
- All requests require valid JWT tokens
- Tenant permissions are strictly enforced
- API tokens are encrypted before storage

---

## 📝 Summary

**What You've Learned:**

1. ✅ Jira integration code IS working correctly
2. ✅ Tests need proper database setup
3. ✅ Authentication can be bypassed for testing
4. ✅ Tenant/account/collaborator relationship is critical
5. ✅ Debug mode makes testing easier

**Key Files:**

- `setup-jira-test-env.sh` - Automated database setup
- `test-jira-complete.sh` - Integration test suite
- `JIRA_INTEGRATION_FIX.md` - Detailed troubleshooting
- `api/.env.test` - Test environment variables

**Key Commands:**

```bash
# Setup
./setup-jira-test-env.sh

# Run API
cd api && source .env.test && npm start

# Run Tests
TENANT_ID=test_tenant_123 ./test-jira-complete.sh
```

---

## 🆘 Need Help?

If tests still fail after following this guide:

1. **Check the detailed logs:**
   ```bash
   cd api
   LOGGING=true DEBUG_DISABLE_AUTH=true npm start
   ```

2. **Verify database state:**
   ```bash
   mysql -u root -proot codepushdb
   SHOW TABLES;
   SELECT COUNT(*) FROM accounts;
   SELECT COUNT(*) FROM tenants;
   SELECT COUNT(*) FROM collaborators;
   ```

3. **Review error messages:**
   - Look for "foreign key" → Missing account/tenant
   - Look for "Unauthorized" → Auth not disabled
   - Look for "member" → Missing collaborator

4. **Read detailed docs:**
   - `JIRA_INTEGRATION_FIX.md` - Comprehensive troubleshooting
   - `JIRA_REFACTORING_GUIDE.md` - Code architecture
   - `DATABASE_SCHEMA_PATTERNS.md` - Schema details

---

## ✅ Success Criteria

Your setup is complete when:

- [ ] Setup script runs without errors
- [ ] API starts on port 3010
- [ ] Health check returns `{"status":"UP"}`
- [ ] All 9 tests pass
- [ ] No foreign key errors
- [ ] No authentication errors

**You're done! 🎉**

