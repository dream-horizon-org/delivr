# Phase 1 Infrastructure Testing Guide

This guide helps you test the Phase 1 infrastructure for the Release Process module.

## Prerequisites

1. **Environment Setup**
   - Ensure `.env` file has:
     ```
     DELIVR_BACKEND_URL=http://localhost:3010
     DELIVR_MOCK_URL=http://localhost:4000
     DELIVR_HYBRID_MODE=true
     ```

2. **Mock Server Running**
   ```bash
   pnpm run mock-server
   ```
   Should start on `http://localhost:4000`

3. **Frontend Dev Server**
   ```bash
   pnpm run dev
   ```
   Or with mock server:
   ```bash
   pnpm run dev:with-mock
   ```
   
   **Note:** Default port is `3000`. If port 3000 is in use, set `PORT=3001` in `.env` or the server will automatically use the next available port.

## Test Routes Created

### 1. API Routes (BFF Layer)
- `GET /api/v1/tenants/:tenantId/releases/:releaseId/stages/kickoff`
- `GET /api/v1/tenants/:tenantId/releases/:releaseId/stages/regression`

### 2. Test Page
- `GET /test/release-process?tenantId=tenant_123&releaseId=rel_dev`

## Testing Steps

### Step 1: Verify Mock Server Starts

1. Start mock server:
   ```bash
   pnpm run mock-server
   ```

2. Check console output - should see:
   ```
   [json-server] Listening on http://localhost:4000
   ```

3. Test direct API call:
   ```bash
   curl http://localhost:4000/api/v1/tenants/tenant_123/releases/rel_dev/stages/kickoff
   ```

   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "stage": "KICKOFF",
       "releaseId": "rel_dev",
       "tasks": [...],
       "stageStatus": "IN_PROGRESS"
     }
   }
   ```

### Step 2: Test BFF Routes

1. Start frontend dev server:
   ```bash
   pnpm run dev
   ```

2. Test BFF route (requires authentication):
   ```bash
   # You'll need to be logged in to test this
   # Or use browser dev tools after logging in
   ```

3. Check browser Network tab for:
   - Request to `/api/v1/tenants/tenant_123/releases/rel_dev/stages/kickoff`
   - Response should match mock server format

### Step 3: Test React Hooks

1. Navigate to test page:
   ```
   http://localhost:3000/test/release-process?tenantId=tenant_123&releaseId=rel_dev
   ```
   (Replace `3000` with your actual port if `PORT` env var is set)

2. Verify:
   - ✅ Page loads without errors
   - ✅ "Kickoff Stage API Test" section shows "Success" badge
   - ✅ Tasks are displayed
   - ✅ "Regression Stage API Test" section shows "Success" badge
   - ✅ Cycles and tasks are displayed

3. Test refetch:
   - Click "Refetch" buttons
   - Verify data reloads

### Step 4: Check Browser Console

1. Open browser DevTools Console
2. Look for:
   - `[BFF] Fetching kickoff stage for release: rel_dev`
   - `[BFF] Kickoff stage response: {...}`
   - `[ReleaseProcessService] Using mock server: http://localhost:4000`

### Step 5: Verify API Routing

1. Check that requests go to mock server:
   - In Network tab, verify requests to `/api/v1/tenants/.../stages/...`
   - Should route to `http://localhost:4000` (not `http://localhost:3010`)

2. Verify hybrid mode:
   - Release process APIs → Mock server (port 4000)
   - Other APIs → Backend (port 3010)

## Expected Test Results

### ✅ Success Indicators

1. **Mock Server**
   - Starts without errors
   - Responds to stage API requests
   - Returns correct data structure

2. **BFF Routes**
   - Return 200 status
   - Include `success: true` and `data` fields
   - Handle errors gracefully

3. **React Hooks**
   - Fetch data successfully
   - Show loading states
   - Handle errors
   - Support refetch

4. **API Routing**
   - Release process APIs route to mock server
   - Other APIs route to backend
   - Hybrid mode works correctly

### ❌ Common Issues

1. **Mock Server Not Starting**
   - Check port 4000 is available
   - Verify `db.json` is valid JSON
   - Check middleware syntax

2. **404 Errors**
   - Verify route file names match Remix conventions
   - Check route is in `app/routes/` directory
   - Verify route exports `loader` function

3. **CORS Errors**
   - Mock server should handle CORS automatically
   - Check middleware order in `server.js`

4. **Data Not Loading**
   - Check browser console for errors
   - Verify mock data exists in `db.json`
   - Check middleware is returning correct format

5. **Wrong API Routing**
   - Verify `DELIVR_HYBRID_MODE=true` in `.env`
   - Check `isReleaseProcessAPI()` function
   - Verify API patterns in `api.config.ts`

## Manual API Testing

### Test Kickoff Stage API

```bash
curl -X GET \
  http://localhost:4000/api/v1/tenants/tenant_123/releases/rel_dev/stages/kickoff \
  -H "Content-Type: application/json"
```

### Test Regression Stage API

```bash
curl -X GET \
  http://localhost:4000/api/v1/tenants/tenant_123/releases/rel_dev/stages/regression \
  -H "Content-Type: application/json"
```

### Test Task Retry API

```bash
curl -X POST \
  http://localhost:4000/api/v1/tenants/tenant_123/releases/rel_dev/tasks/task_kickoff_3/retry \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Next Steps

Once Phase 1 testing passes:
- ✅ All infrastructure components work
- ✅ API routing is correct
- ✅ Hooks can fetch data
- ✅ Mock server responds correctly

Proceed to **Phase 2: Core Components**

