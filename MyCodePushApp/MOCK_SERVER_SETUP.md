# Mock Server Setup Guide

This guide explains how to use the mock server instead of the real CodePush server for testing.

## Prerequisites

1. Docker and Docker Compose installed
2. Mock server running (see steps below)

## Quick Start

### 1. Start Mock Server

```bash
cd ../../code-push-server/e2e-mocks
docker-compose up --build -d

# Wait a few seconds for services to start
sleep 5

# Register expectations
curl -X PUT "http://localhost:1080/mockserver/clear"
for file in expectations/*.json; do
  curl -s -X PUT "http://localhost:1080/mockserver/expectation" \
    -H "Content-Type: application/json" \
    -d @"$file" > /dev/null
done
echo "Mock server ready!"
```

### 2. Pre-configured Test Data

**The mock server automatically initializes with test data on startup:**

- **Account**: `test-user` (email: `test@example.com`)
- **Tenant/Organization**: `testOrg`
- **App**: `testApp` (belongs to `testOrg`)
- **Production Deployment Key**: `deployment-key-1`
- **Staging Deployment Key**: `deployment-key-2`

**Note:** This data is automatically created when the `mock-callback` service starts. No manual setup is required!

If you need to verify the data exists:

```bash
export USER_ID="test-user"

# Get account
curl -X GET "http://localhost:1080/account" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Get app (use tenant header for testOrg/testApp format)
curl -X GET "http://localhost:1080/apps/testApp" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "tenant: testOrg" | jq .

# Get deployment key
curl -s -X GET "http://localhost:1080/apps/testApp/deployments/Production" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "tenant: testOrg" | jq .
```

### 3. Configure CLI

Login to the mock server using the CLI:

```bash
# From MyCodePushApp directory
yarn code-push-standalone login http://localhost:1080 --accessKey test-user
```

### 4. App Configuration

The app is already configured to use the mock server:

- **Android**: `android/app/src/main/res/values/strings.xml`
  - Server URL: `http://10.0.2.2:1080/` (Android emulator uses 10.0.2.2 to reach host)
  - Deployment Key: `deployment-key-1`

- **iOS**: `ios/MyCodePushApp/Info.plist`
  - Server URL: `http://localhost:1080/` (iOS simulator can use localhost)
  - Deployment Key: `deployment-key-1`

**Note for Physical Devices:**
- Android: Use your Mac's LAN IP address instead of `10.0.2.2`
- iOS: Use your Mac's LAN IP address instead of `localhost`

### 5. Running Tests

Test scripts use `testOrg/testApp` format. The CLI automatically handles the tenant parsing.

Run tests as normal:

```bash
# Example: Run full bundle test
node testcases/fullbundle.js

# Or use test runner
node testRunner.js fullbundle
```

## How It Works

1. **MockServer (Port 1080)**: API gateway that forwards requests to mock-callback
2. **Mock-Callback (Port 3001)**: Handles the actual API logic and file storage
3. **File Uploads**: Packages uploaded via CLI are stored in `mock-callback/uploads/`
4. **File Downloads**: SDK downloads packages from `http://[host]:1080/v0.1/public/codepush/report_status/download?packageHash=...`

## Troubleshooting

### Mock server not responding

```bash
cd ../../code-push-server/e2e-mocks
docker-compose ps  # Check if containers are running
docker-compose logs  # Check logs
docker-compose restart  # Restart services
```

### Reset mock data

**Note:** Restarting `mock-callback` automatically re-initializes the pre-configured test data.

```bash
docker-compose restart mock-callback
sleep 3
# Re-register expectations
curl -X PUT "http://localhost:1080/mockserver/clear"
for file in expectations/*.json; do
  curl -s -X PUT "http://localhost:1080/mockserver/expectation" \
    -H "Content-Type: application/json" \
    -d @"$file" > /dev/null
done
```

After restart, the pre-configured data (test-user, testOrg, testApp, deployments) will be automatically recreated.

### Check deployment key

```bash
export USER_ID="test-user"
curl -s -X GET "http://localhost:1080/apps/testApp/deployments/Production" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "tenant: testOrg" | jq .
```

### Verify CLI login

```bash
yarn code-push-standalone whoami
# Should show server URL as http://localhost:1080
```

## Differences from Real Server

1. **No Authentication**: Any user ID works in Authorization header
2. **In-Memory Storage**: Data is lost when mock-callback restarts (but pre-configured data is auto-created)
3. **File Storage**: Files stored locally in container (not persistent across rebuilds)
4. **App Names**: Tests use `tenant/appName` format (e.g., `testOrg/testApp`), handled via `tenant` header
5. **Pre-configured Data**: Test account, app, and deployments are automatically created on server startup

