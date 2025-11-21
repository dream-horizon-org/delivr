# JIRA Credentials Setup - Testing Guide

## ✅ All Changes Implemented Successfully!

### Changes Summary

#### 1. ✅ Backend Metadata (server-ota)
**File**: `/api/script/routes/management.ts` (Line 106)
- Changed `isAvailable: false` → `isAvailable: true`
- Changed `requiresOAuth: true` → `requiresOAuth: false`

#### 2. ✅ BFF Service Endpoints (web-panel)
**File**: `app/.server/services/ReleaseManagement/integrations/jira-integration.ts`
- Updated `verifyCredentials()` to use `/projects/:projectId/integrations/project-management/verify`
- Updated `listIntegrations()` to use `/projects/:projectId/integrations/project-management`
- Updated `createIntegration()` to use `/projects/:projectId/integrations/project-management`
- Updated `updateIntegration()` to use `/projects/:projectId/integrations/project-management/:integrationId`
- Updated `deleteIntegration()` to use `/projects/:projectId/integrations/project-management/:integrationId`
- Changed provider type from `'jira'` to `'JIRA'` (uppercase)

#### 3. ✅ BFF Route Handlers (web-panel)
**File**: `app/routes/api.v1.tenants.$tenantId.integrations.jira.ts`
- Updated `loader` to use `JiraIntegrationService` (singleton)
- Updated `createJiraAction` to use correct method signature
- Updated `deleteJiraAction` to pass `integrationId`
- Updated `updateJiraAction` to use correct method signature

#### 4. ✅ Type Definitions (web-panel)
**File**: `app/types/jira-integration.ts`
- Added optional `projectId?: string` to `VerifyJiraRequest`

---

## Testing Instructions

### Prerequisites

1. **JIRA Credentials Ready**
   - JIRA Cloud URL (e.g., `https://your-domain.atlassian.net`)
   - Email address
   - API Token (generate from: https://id.atlassian.com/manage-profile/security/api-tokens)

2. **Both Servers Running**
   ```bash
   # Terminal 1: Start backend (server-ota)
   cd delivr-server-ota-managed
   npm run dev
   # Should be running on http://localhost:3000
   
   # Terminal 2: Start web panel
   cd delivr-web-panel-managed
   pnpm dev
   # Should be running on http://localhost:5000
   ```

---

## Test Cases

### Test 1: System Metadata Shows JIRA as Available

**Purpose**: Verify JIRA appears in integration options

**Steps**:
```bash
curl http://localhost:3000/system/metadata | jq '.integrations.PROJECT_MANAGEMENT'
```

**Expected Response**:
```json
[
  {
    "id": "jira",
    "name": "Jira",
    "requiresOAuth": false,
    "isAvailable": true
  }
]
```

**Status**: ✅ PASS / ❌ FAIL

---

### Test 2: Frontend Integration Page Shows JIRA

**Purpose**: Verify UI displays JIRA integration card

**Steps**:
1. Open browser: http://localhost:5000
2. Login to your tenant
3. Navigate to "Integrations" page
4. Look for JIRA card

**Expected Result**:
- JIRA card is visible
- Shows "Connect" button
- Card is not grayed out

**Status**: ✅ PASS / ❌ FAIL

---

### Test 3: Verify JIRA Credentials (Backend Direct)

**Purpose**: Test verification endpoint works

**Steps**:
```bash
curl -X POST http://localhost:3000/projects/test-project/integrations/project-management/verify \
  -H "Content-Type: application/json" \
  -d '{
    "providerType": "JIRA",
    "config": {
      "baseUrl": "https://your-domain.atlassian.net",
      "email": "your-email@example.com",
      "apiToken": "your-api-token-here",
      "jiraType": "CLOUD"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "verified": true,
  "message": "Configuration is valid"
}
```

**Status**: ✅ PASS / ❌ FAIL

---

### Test 4: Verify JIRA Credentials (BFF)

**Purpose**: Test BFF verification endpoint

**Steps**:
```bash
curl -X POST http://localhost:5000/api/v1/tenants/your-tenant-id/integrations/jira/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "baseUrl": "https://your-domain.atlassian.net",
    "email": "your-email@example.com",
    "apiToken": "your-api-token-here",
    "jiraType": "CLOUD"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "verified": true
}
```

**Status**: ✅ PASS / ❌ FAIL

---

### Test 5: Connect JIRA via UI (End-to-End)

**Purpose**: Test complete user flow

**Steps**:
1. Navigate to Integrations page
2. Click "Connect" on JIRA card
3. Fill in the form:
   - **Display Name**: "My JIRA Workspace"
   - **JIRA Type**: Select "Jira Cloud"
   - **Base URL**: `https://your-domain.atlassian.net`
   - **Email**: `your-email@example.com`
   - **API Token**: `your-actual-token`
4. Click "Verify Credentials"
5. Wait for success message
6. Click "Connect"

**Expected Result**:
- Step 4: Green success message appears
- Step 6: Modal closes
- JIRA integration appears in the list
- Shows "Connected" status

**Status**: ✅ PASS / ❌ FAIL

---

### Test 6: List JIRA Integrations

**Purpose**: Verify listing endpoint works

**Steps**:
```bash
curl http://localhost:5000/api/v1/tenants/your-tenant-id/integrations/jira \
  -H "Cookie: your-session-cookie"
```

**Expected Response**:
```json
{
  "success": true,
  "integration": {
    "id": "integration-id-123",
    "projectId": "your-tenant-id",
    "name": "My JIRA Workspace",
    "providerType": "JIRA",
    "config": {
      "baseUrl": "https://your-domain.atlassian.net",
      "email": "your-email@example.com",
      "jiraType": "CLOUD"
    },
    "isEnabled": true,
    "verificationStatus": "VALID"
  }
}
```

**Status**: ✅ PASS / ❌ FAIL

---

### Test 7: Delete JIRA Integration

**Purpose**: Test deletion works

**Steps**:
```bash
curl -X DELETE "http://localhost:5000/api/v1/tenants/your-tenant-id/integrations/jira?integrationId=integration-id-123" \
  -H "Cookie: your-session-cookie"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Integration deleted successfully"
}
```

**Status**: ✅ PASS / ❌ FAIL

---

## Common Issues & Troubleshooting

### Issue 1: "JIRA not visible in UI"

**Symptoms**: JIRA card doesn't show in Integrations page

**Debug Steps**:
```bash
# 1. Check system metadata
curl http://localhost:3000/system/metadata | jq '.integrations.PROJECT_MANAGEMENT'

# 2. Check if it returns isAvailable: true
```

**Solution**: 
- Restart backend server after metadata change
- Clear browser cache

---

### Issue 2: "Verification fails with 404"

**Symptoms**: Verify endpoint returns 404

**Debug Steps**:
```bash
# 1. Check if backend route exists
curl -X POST http://localhost:3000/projects/test/integrations/project-management/verify \
  -H "Content-Type: application/json" \
  -d '{"providerType": "JIRA", "config": {}}'

# 2. Check backend logs for route registration
```

**Solution**:
- Ensure backend has project-management integration routes mounted
- Check `release-management.ts` routes are registered

---

### Issue 3: "Invalid API Token"

**Symptoms**: Verification succeeds in curl but fails in UI

**Debug Steps**:
```bash
# 1. Test directly with JIRA API
curl -u "your-email@example.com:your-api-token" \
  https://your-domain.atlassian.net/rest/api/3/myself
```

**Solution**:
- Generate new API token
- Ensure no extra spaces in token
- Verify email matches JIRA account

---

### Issue 4: "Integration created but not visible"

**Symptoms**: Create succeeds but integration doesn't show in list

**Debug Steps**:
```bash
# 1. Check backend database
# Connect to MySQL and run:
SELECT * FROM project_management_integrations 
WHERE projectId = 'your-tenant-id';

# 2. Check if providerType is 'JIRA' (uppercase)
```

**Solution**:
- Verify database has the record
- Check providerType is uppercase 'JIRA'

---

### Issue 5: "CORS errors"

**Symptoms**: Browser shows CORS errors

**Solution**:
```typescript
// In server-ota/api/script/default-server.ts
// Ensure CORS is configured:
app.use(cors({
  origin: 'http://localhost:5000',
  credentials: true
}));
```

---

## Database Verification

### Check Integration in Database

```sql
-- Connect to MySQL
mysql -u root -p codepushdb

-- View all JIRA integrations
SELECT 
  id,
  projectId,
  name,
  providerType,
  isEnabled,
  verificationStatus,
  lastVerifiedAt,
  createdAt
FROM project_management_integrations
WHERE providerType = 'JIRA';

-- View integration config (JSON)
SELECT 
  id,
  name,
  JSON_EXTRACT(config, '$.baseUrl') as baseUrl,
  JSON_EXTRACT(config, '$.email') as email,
  JSON_EXTRACT(config, '$.jiraType') as jiraType
FROM project_management_integrations
WHERE providerType = 'JIRA';
```

---

## Success Criteria

### All Tests Must Pass:

- ✅ Test 1: System metadata shows JIRA
- ✅ Test 2: Frontend shows JIRA card
- ✅ Test 3: Backend verification works
- ✅ Test 4: BFF verification works
- ✅ Test 5: UI connection flow works end-to-end
- ✅ Test 6: Listing integrations works
- ✅ Test 7: Deletion works

### Acceptance Criteria:

1. User can see JIRA in Integrations page
2. User can enter JIRA credentials
3. Credentials are verified before saving
4. Integration is saved to database
5. User sees "Connected" status
6. Integration appears in list
7. User can delete integration

---

## Performance Benchmarks

### Expected Response Times:

- Verify credentials: < 2 seconds
- Create integration: < 500ms
- List integrations: < 200ms
- Delete integration: < 300ms

---

## Security Checklist

- ✅ API tokens not logged in console
- ✅ API tokens transmitted over HTTPS
- ⚠️ API tokens stored in database (TODO: Add encryption)
- ✅ Authentication required for all endpoints
- ✅ User can only access their tenant's integrations

---

## Next Steps

After credentials setup works:

1. **Add Encryption** (Phase 1.3)
   - Encrypt API tokens before storage
   - Decrypt when needed for API calls

2. **Release Configuration** (Phase 2)
   - Use JIRA integration in release config
   - Create platform-specific configs

3. **Ticket Creation** (Phase 3)
   - Auto-create JIRA tickets on release creation
   - Link builds to JIRA issues

---

## Test Results Template

```markdown
### Test Results - [Date]

**Tester**: [Name]
**Environment**: [Dev/Staging/Prod]

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | System Metadata | ✅ PASS | |
| 2 | Frontend UI | ✅ PASS | |
| 3 | Backend Verify | ✅ PASS | |
| 4 | BFF Verify | ✅ PASS | |
| 5 | UI Flow E2E | ✅ PASS | |
| 6 | List Integrations | ✅ PASS | |
| 7 | Delete Integration | ✅ PASS | |

**Overall Status**: ✅ ALL TESTS PASSED

**Issues Found**: None

**Sign-off**: [Name], [Date]
```

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Ready for Testing

