# CodePush CLI - Usage Examples for End Users

This guide shows how to use the CodePush CLI in your React Native project after installing it as an npm package.

---

## 🚀 Quick Start

### Installation

```bash
# Install as dev dependency (recommended)
npm install --save-dev @your-org/code-push-cli

# Or install globally
npm install -g @your-org/code-push-cli

# Or use directly without installing
npx @your-org/code-push-cli --help
```

---

## 📱 Usage Methods

### Method 1: npm/yarn Scripts (Recommended)

Add scripts to your `package.json`:

```json
{
  "name": "my-react-native-app",
  "scripts": {
    "codepush:login": "code-push-standalone login",
    "codepush:setup": "npm run codepush:create-apps",
    "codepush:create-apps": "code-push-standalone app add MyOrg/MyApp-iOS && code-push-standalone app add MyOrg/MyApp-Android",
    
    "codepush:staging:ios": "code-push-standalone release-react MyOrg/MyApp-iOS ios -d Staging",
    "codepush:staging:android": "code-push-standalone release-react MyOrg/MyApp-Android android -d Staging",
    "codepush:staging": "npm run codepush:staging:ios && npm run codepush:staging:android",
    
    "codepush:production:ios": "code-push-standalone release-react MyOrg/MyApp-iOS ios -d Production --mandatory",
    "codepush:production:android": "code-push-standalone release-react MyOrg/MyApp-Android android -d Production --mandatory",
    "codepush:production": "npm run codepush:production:ios && npm run codepush:production:android",
    
    "codepush:promote:ios": "code-push-standalone promote MyOrg/MyApp-iOS Staging Production",
    "codepush:promote:android": "code-push-standalone promote MyOrg/MyApp-Android Staging Production",
    "codepush:promote": "npm run codepush:promote:ios && npm run codepush:promote:android",
    
    "codepush:status:ios": "code-push-standalone deployment ls MyOrg/MyApp-iOS",
    "codepush:status:android": "code-push-standalone deployment ls MyOrg/MyApp-Android",
    "codepush:status": "npm run codepush:status:ios && npm run codepush:status:android"
  },
  "devDependencies": {
    "@your-org/code-push-cli": "^1.0.0"
  }
}
```

**Usage:**
```bash
# First-time setup
npm run codepush:login
npm run codepush:setup

# Deploy to staging
npm run codepush:staging

# Check deployment status
npm run codepush:status

# Promote to production
npm run codepush:promote

# Or deploy directly to production
npm run codepush:production
```

---

### Method 2: Direct Command Line

```bash
# With global install
code-push-standalone app add MyOrg/MyApp-iOS
code-push-standalone release-react MyOrg/MyApp-iOS ios -d Staging

# With local install (via npx)
npx code-push-standalone app add MyOrg/MyApp-iOS
npx code-push-standalone release-react MyOrg/MyApp-iOS ios -d Staging

# With yarn
yarn code-push-standalone app add MyOrg/MyApp-iOS
```

---

### Method 3: Using Aliases

If you want shorter commands, use the `codepush` alias:

```json
{
  "scripts": {
    "cp:staging:ios": "codepush release-react MyOrg/MyApp-iOS ios -d Staging",
    "cp:prod:ios": "codepush release-react MyOrg/MyApp-iOS ios -d Production -m"
  }
}
```

---

## 🎯 Common Workflows

### Workflow 1: Initial Setup

```bash
# 1. Login to CodePush server
npm run codepush:login

# 2. Create apps
code-push-standalone app add MyOrg/MyApp-iOS
code-push-standalone app add MyOrg/MyApp-Android

# 3. Get deployment keys
code-push-standalone deployment ls MyOrg/MyApp-iOS -k
code-push-standalone deployment ls MyOrg/MyApp-Android -k

# 4. Configure your mobile app with the Staging key
# Add to Info.plist (iOS) or build.gradle (Android)
```

---

### Workflow 2: Deploy to Staging → Test → Promote to Production

```json
{
  "scripts": {
    "deploy:staging": "npm run deploy:staging:ios && npm run deploy:staging:android",
    "deploy:staging:ios": "code-push-standalone release-react MyOrg/MyApp-iOS ios -d Staging --des \"$npm_package_version\"",
    "deploy:staging:android": "code-push-standalone release-react MyOrg/MyApp-Android android -d Staging --des \"$npm_package_version\"",
    
    "deploy:promote": "npm run deploy:promote:ios && npm run deploy:promote:android",
    "deploy:promote:ios": "code-push-standalone promote MyOrg/MyApp-iOS Staging Production --des \"Promoted from staging\"",
    "deploy:promote:android": "code-push-standalone promote MyOrg/MyApp-Android Staging Production --des \"Promoted from staging\""
  }
}
```

**Usage:**
```bash
# 1. Deploy to staging
npm run deploy:staging

# 2. Test the staging deployment

# 3. If good, promote to production
npm run deploy:promote
```

---

### Workflow 3: Phased Rollout

```json
{
  "scripts": {
    "deploy:prod:10": "code-push-standalone release-react MyOrg/MyApp-iOS ios -d Production -r 10 --des \"$npm_package_version (10% rollout)\"",
    "deploy:prod:increase": "code-push-standalone patch MyOrg/MyApp-iOS Production -r 25",
    "deploy:prod:complete": "code-push-standalone patch MyOrg/MyApp-iOS Production -r 100"
  }
}
```

**Usage:**
```bash
# 1. Deploy to 10% of users
npm run deploy:prod:10

# 2. Monitor for issues

# 3. Increase to 25%
npm run deploy:prod:increase

# 4. Complete rollout (100%)
npm run deploy:prod:complete
```

---

### Workflow 4: Environment Variables

For multi-environment support:

```json
{
  "scripts": {
    "deploy": "code-push-standalone release-react $APP_NAME $PLATFORM -d $DEPLOYMENT $FLAGS"
  }
}
```

**Usage:**
```bash
# Staging iOS
APP_NAME=MyOrg/MyApp-iOS PLATFORM=ios DEPLOYMENT=Staging FLAGS="" npm run deploy

# Production Android with mandatory flag
APP_NAME=MyOrg/MyApp-Android PLATFORM=android DEPLOYMENT=Production FLAGS="--mandatory" npm run deploy
```

---

### Workflow 5: CI/CD Integration (GitHub Actions)

Create `.github/workflows/codepush-deploy.yml`:

```yaml
name: Deploy to CodePush

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Login to CodePush
        run: npx code-push-standalone login --accessKey ${{ secrets.CODEPUSH_ACCESS_KEY }}
      
      - name: Deploy iOS to Staging
        run: npx code-push-standalone release-react MyOrg/MyApp-iOS ios -d Staging --des "Auto-deployed from commit ${{ github.sha }}"
      
      - name: Deploy Android to Staging
        run: npx code-push-standalone release-react MyOrg/MyApp-Android android -d Staging --des "Auto-deployed from commit ${{ github.sha }}"

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Login to CodePush
        run: npx code-push-standalone login --accessKey ${{ secrets.CODEPUSH_ACCESS_KEY }}
      
      - name: Promote iOS to Production
        run: npx code-push-standalone promote MyOrg/MyApp-iOS Staging Production --mandatory
      
      - name: Promote Android to Production
        run: npx code-push-standalone promote MyOrg/MyApp-Android Staging Production --mandatory
```

**Setup:**
1. Create CodePush access key: `code-push-standalone access-key add "GitHub Actions" --ttl 365d`
2. Add to GitHub Secrets as `CODEPUSH_ACCESS_KEY`
3. Push to `develop` branch → Auto-deploy to Staging
4. Merge to `main` branch → Auto-promote to Production

---

## 🔧 Advanced Configuration

### Custom Deployment Script

Create `scripts/deploy-codepush.sh`:

```bash
#!/bin/bash

# Configuration
ORG="MyOrg"
APP_IOS="$ORG/MyApp-iOS"
APP_ANDROID="$ORG/MyApp-Android"
VERSION=$(node -p "require('./package.json').version")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to deploy
deploy() {
  PLATFORM=$1
  DEPLOYMENT=$2
  MANDATORY=${3:-false}
  
  if [ "$PLATFORM" = "ios" ]; then
    APP=$APP_IOS
  else
    APP=$APP_ANDROID
  fi
  
  echo -e "${YELLOW}Deploying $APP ($PLATFORM) to $DEPLOYMENT...${NC}"
  
  FLAGS=""
  if [ "$MANDATORY" = "true" ]; then
    FLAGS="--mandatory"
  fi
  
  code-push-standalone release-react "$APP" "$PLATFORM" \
    -d "$DEPLOYMENT" \
    --des "Version $VERSION" \
    $FLAGS
  
  echo -e "${GREEN}✓ Deployed successfully${NC}\n"
}

# Parse arguments
case "$1" in
  staging)
    deploy "ios" "Staging"
    deploy "android" "Staging"
    ;;
  production)
    deploy "ios" "Production" "true"
    deploy "android" "Production" "true"
    ;;
  *)
    echo "Usage: $0 {staging|production}"
    exit 1
    ;;
esac
```

**Usage:**
```bash
chmod +x scripts/deploy-codepush.sh

# Deploy to staging
./scripts/deploy-codepush.sh staging

# Deploy to production
./scripts/deploy-codepush.sh production
```

---

### Configuration File

Create `.codepushrc.json`:

```json
{
  "apps": {
    "ios": "MyOrg/MyApp-iOS",
    "android": "MyOrg/MyApp-Android"
  },
  "deployments": {
    "staging": "Staging",
    "production": "Production"
  },
  "options": {
    "mandatory": false,
    "rollout": 100
  }
}
```

Create `scripts/deploy-with-config.js`:

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const config = require('../.codepushrc.json');
const pkg = require('../package.json');

const platform = process.argv[2]; // ios or android
const deployment = process.argv[3]; // staging or production

if (!platform || !deployment) {
  console.error('Usage: node scripts/deploy-with-config.js <platform> <deployment>');
  process.exit(1);
}

const app = config.apps[platform];
const deploymentName = config.deployments[deployment];
const mandatory = deployment === 'production' ? '--mandatory' : '';

const cmd = `code-push-standalone release-react ${app} ${platform} -d ${deploymentName} --des "${pkg.version}" ${mandatory}`;

console.log(`Running: ${cmd}`);
execSync(cmd, { stdio: 'inherit' });
```

**package.json:**
```json
{
  "scripts": {
    "deploy": "node scripts/deploy-with-config.js"
  }
}
```

**Usage:**
```bash
npm run deploy ios staging
npm run deploy android production
```

---

## 📊 Monitoring and Management

### Check Deployment Status

```bash
# View all deployments with metrics
code-push-standalone deployment ls MyOrg/MyApp-iOS
code-push-standalone deployment ls MyOrg/MyApp-Android

# View with deployment keys
code-push-standalone deployment ls MyOrg/MyApp-iOS -k

# View as JSON
code-push-standalone deployment ls MyOrg/MyApp-iOS --format json
```

### View Deployment History

```bash
# View release history
code-push-standalone deployment history MyOrg/MyApp-iOS Staging
code-push-standalone deployment history MyOrg/MyApp-iOS Production

# View as JSON
code-push-standalone deployment history MyOrg/MyApp-iOS Production --format json

# View with author information
code-push-standalone deployment history MyOrg/MyApp-iOS Production -a
```

### Emergency Rollback

```bash
# Rollback to previous version
code-push-standalone rollback MyOrg/MyApp-iOS Production

# Rollback to specific version
code-push-standalone rollback MyOrg/MyApp-iOS Production --targetRelease v42
```

---

## 🐛 Debugging

### View Debug Logs (Mobile App)

```bash
# iOS simulator
code-push-standalone debug ios

# Android emulator/device
code-push-standalone debug android
```

### Check Account Status

```bash
# Who am I logged in as?
code-push-standalone whoami

# View active sessions
code-push-standalone session ls

# View access keys
code-push-standalone access-key ls
```

---

## 💡 Tips and Best Practices

### 1. Version Descriptions
Always include version info in descriptions:
```bash
code-push-standalone release-react MyApp ios -d Staging --des "v1.2.3 - Bug fixes"
```

### 2. Use Mandatory Flags Wisely
Only use `--mandatory` for critical updates:
```bash
# Critical security fix
code-push-standalone release-react MyApp ios -d Production --mandatory --des "Security fix - CVE-2023-1234"
```

### 3. Phased Rollouts for Production
Always start with small percentage for production:
```bash
# Start with 10%
code-push-standalone release-react MyApp ios -d Production -r 10

# Monitor, then increase
code-push-standalone patch MyApp Production -r 50
```

### 4. Separate iOS and Android Apps
Always create separate apps for each platform:
```bash
code-push-standalone app add MyOrg/MyApp-iOS
code-push-standalone app add MyOrg/MyApp-Android
```

### 5. Use npm Scripts
Standardize deployments across team with npm scripts.

---

## 🆘 Common Issues

### Issue: Command not found

**Solution:**
```bash
# If globally installed
which code-push-standalone

# If local dev dependency
npx code-push-standalone --help

# Or add to npm script
```

### Issue: Not logged in

**Solution:**
```bash
code-push-standalone login
# Or
code-push-standalone login --accessKey YOUR_KEY
```

### Issue: App not found

**Solution:**
```bash
# List your apps
code-push-standalone app ls

# Check app name (case-sensitive, include org if needed)
code-push-standalone app add MyOrg/MyApp-iOS
```

---

## 📚 More Examples

Check out the official documentation for more examples:
- [CLI_FLOW_DOCUMENTATION.md](./CLI_FLOW_DOCUMENTATION.md) - Internal architecture
- [CLI_QUICK_REFERENCE.md](./CLI_QUICK_REFERENCE.md) - Command reference
- [README.md](./README.md) - Full documentation

---

**Happy deploying! 🚀**

