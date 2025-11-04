# Quick Test Guide - SDK with Mock Server

This guide will help you quickly test the SDK with the mock server.

## Prerequisites

- Docker and Docker Compose installed
- Node.js installed
- Android/iOS development environment set up (for full tests)

## Step 1: Start Mock Server

```bash
# Navigate to mock server directory
cd ../../code-push-server/e2e-mocks

# Start Docker services
docker-compose up --build -d

# Wait for services to start
sleep 5

# Register MockServer expectations
curl -X PUT "http://localhost:1080/mockserver/clear"
for file in expectations/*.json; do
  curl -s -X PUT "http://localhost:1080/mockserver/expectation" \
    -H "Content-Type: application/json" \
    -d @"$file" > /dev/null
done
echo "Mock server ready!"
```

## Step 2: Verify Setup

Run the verification script to check everything is configured correctly:

```bash
# From MyCodePushApp directory
node test-mock-server.js
```

This will check:
- ✅ Docker containers are running
- ✅ Mock server is responding
- ✅ Pre-configured test data exists
- ✅ CLI login works
- ✅ App configuration is correct

## Step 3: Configure CLI (if not already done)

```bash
# Login to mock server
yarn code-push-standalone login http://localhost:1080 --accessKey test-user

# Verify login
yarn code-push-standalone whoami
```

## Step 4: Run Tests

### Quick Verification Test

First, verify the SDK can communicate with the mock server:

```bash
# List available tests
node testRunner.js --list

# Run a simple test (requires Android emulator/iOS simulator)
node testRunner.js fullbundle
```

### Available Tests

- `fullbundle` - Full bundle deployment test
- `fullbundle-brotli` - Full bundle with Brotli compression
- `fullbundle-corrupted` - Corrupted bundle rollback test
- `patchbundle` - Patch bundle deployment test
- `patchbundle-brotli` - Patch bundle with Brotli compression
- `patchbundle-corrupted` - Corrupted patch rollback test
- `assets-fullbundle` - Full bundle with assets
- `eventflow-fullbundle` - Event flow verification

## Testing Manually (Without Automated Tests)

### 1. Create a Release

```bash
# Build your app bundle first
yarn android --mode=Release

# Create a CodePush release
yarn code-push-standalone release testOrg/testApp ./path/to/bundle 1.0.0 \
  -d Production -r 100 --description "Test release"
```

### 2. Check Update via API

```bash
# Check for updates using the deployment key
curl -X GET "http://localhost:1080/updateCheck?deploymentKey=deployment-key-1&appVersion=1.0.0" | jq .
```

### 3. Run Your App

The app is already configured with:
- **Server URL**: `http://localhost:1080/` (iOS) or `http://10.0.2.2:1080/` (Android)
- **Deployment Key**: `deployment-key-1`

When you run the app, it will automatically check for updates from the mock server.

## Troubleshooting

### Mock Server Not Responding

```bash
# Check Docker containers
cd ../../code-push-server/e2e-mocks
docker-compose ps

# View logs
docker-compose logs mock-callback
docker-compose logs mockserver

# Restart if needed
docker-compose restart
```

### Reset Mock Data

```bash
# Restart mock-callback (auto-reinitializes data)
cd ../../code-push-server/e2e-mocks
docker-compose restart mock-callback
sleep 3
```

### Verify Pre-configured Data

```bash
export USER_ID="test-user"

# Check account
curl -X GET "http://localhost:1080/account" \
  -H "Authorization: Bearer ${USER_ID}" | jq .

# Check app
curl -X GET "http://localhost:1080/apps/testApp" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "tenant: testOrg" | jq .

# Check deployment
curl -X GET "http://localhost:1080/apps/testApp/deployments/Production" \
  -H "Authorization: Bearer ${USER_ID}" \
  -H "tenant: testOrg" | jq .
```

### CLI Issues

```bash
# Verify CLI is configured
yarn code-push-standalone whoami

# Re-login if needed
yarn code-push-standalone login http://localhost:1080 --accessKey test-user
```

## What's Pre-configured

The mock server automatically creates:

- **Account**: `test-user` (email: `test@example.com`)
- **Tenant**: `testOrg`
- **App**: `testApp`
- **Production Deployment**: Key `deployment-key-1`
- **Staging Deployment**: Key `deployment-key-2`

No manual setup required! 🎉

