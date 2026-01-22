# Delivr CLI - CI/CD Integration Guide

This guide explains how to integrate `@d11/delivr-cli` into your CI/CD pipelines to automate build artifact uploads to Delivr Release Management.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Authentication](#authentication)
5. [Available Commands](#available-commands)
6. [CI Run ID Reference](#ci-run-id-reference)
7. [Jenkins Integration](#jenkins-integration)
8. [GitHub Actions Integration](#github-actions-integration)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Delivr CLI provides commands to upload build artifacts directly from your CI/CD pipelines:

| Command | Description | Supported Files |
|---------|-------------|-----------------|
| `upload-aab-build` | Upload AAB for Play Store releases | `.aab` |
| `upload-regression-artifact` | Upload regression builds | `.apk`, `.ipa` |
| `upload-testflight-build-number` | Submit TestFlight build number | N/A |

---

## Prerequisites

- **Node.js 18+** (recommended: Node.js 20)
- **npm** or **yarn**
- **Delivr Access Key** - Obtain from your Delivr dashboard

---

## Installation

### Global Installation (Recommended for CI)

```bash
npm install -g @d11/delivr-cli
```


## Authentication

Before running any commands, you must authenticate with your Delivr access key.

```bash
code-push-standalone login <server-url> --accessKey YOUR_ACCESS_KEY
```

**Example:**
```bash
code-push-standalone login https://delivr.example.com --accessKey "$DELIVR_ACCESS_KEY"
```

> **Security Tip:** Store your access key as a CI secret/credential, never hardcode it in your pipeline.

---

## Available Commands

### upload-aab-build

Upload AAB (Android App Bundle) build artifacts to Delivr Release Management for Play Store releases.

```bash
code-push-standalone upload-aab-build <ciRunId> <artifactPath> --artifactVersion <version> --org <orgName> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `ciRunId` | Yes | CI run identifier - see [CI Run ID Reference](#ci-run-id-reference) |
| `artifactPath` | Yes | Path to the AAB file (`.aab` only) |

**Options:**

| Option | Alias | Required | Description |
|--------|-------|----------|-------------|
| `--artifactVersion` | `-v` | Yes | Artifact version (e.g., 3.0.4) - validates artifact belongs to correct release |
| `--org` | `-o` | Yes | Organization name (e.g., MyOrg) |
| `--buildNumber` | `-b` | No | Build number / versionCode from Play Store (if CI already uploaded the AAB) |

**Behavior:**

- **Without `--buildNumber`**: System automatically uploads the AAB to Play Store internal track
- **With `--buildNumber`**: System uses the provided versionCode (use when CI has already uploaded to Play Store)

---

### upload-regression-artifact

Upload APK or IPA regression build artifacts to Delivr Release Management.

```bash
code-push-standalone upload-regression-artifact <ciRunId> <artifactPath> --artifactVersion <version> --org <orgName>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `ciRunId` | Yes | CI run identifier - see [CI Run ID Reference](#ci-run-id-reference) |
| `artifactPath` | Yes | Path to the build artifact file (`.apk` or `.ipa` only) |

**Options:**

| Option | Alias | Required | Description |
|--------|-------|----------|-------------|
| `--artifactVersion` | `-v` | Yes | Artifact version (e.g., 3.0.4) - validates artifact belongs to correct release |
| `--org` | `-o` | Yes | Organization name (e.g., MyOrg) |

> **Note:** For AAB files, use `upload-aab-build` instead.

---

### upload-testflight-build-number

Upload TestFlight build number to associate with an iOS CI run.

```bash
code-push-standalone upload-testflight-build-number <ciRunId> <testflightNumber> --artifactVersion <version> --org <orgName>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `ciRunId` | Yes | CI run identifier - see [CI Run ID Reference](#ci-run-id-reference) |
| `testflightNumber` | Yes | TestFlight build number from App Store Connect |

**Options:**

| Option | Alias | Required | Description |
|--------|-------|----------|-------------|
| `--artifactVersion` | `-v` | Yes | Artifact version (e.g., 3.0.4) - validates artifact belongs to correct release |
| `--org` | `-o` | Yes | Organization name (e.g., MyOrg) |

---

## CI Run ID Reference

The `ciRunId` is a unique identifier for your CI build. Use the appropriate environment variable for your CI platform:

| CI Platform | Environment Variable | Example Value |
|-------------|---------------------|---------------|
| **Jenkins** | `$BUILD_URL` | `https://jenkins.example.com/job/MyApp/123/` |
| **GitHub Actions** | `$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID` | `https://github.com/org/repo/actions/runs/12345` |
---

### Pipeline Behavior

By default, these pipelines will **upload to Delivr** and **fail the entire build** if the CLI command fails (e.g., server returns an error). This is the recommended behavior for production builds.

For **internal development/testing**, you can set the `DELIVR_INTERNAL` parameter to `true` to **skip the Delivr upload entirely**.

## Jenkins Integration

### Pipeline Job (Jenkinsfile) - AAB Build

```groovy
pipeline {
    agent any
    
    parameters {
        booleanParam(
            name: 'DELIVR_INTERNAL',
            defaultValue: false,
            description: 'Internal Delivr build (skip Delivr upload)'
        )
    }
    
    environment {
        DELIVR_ACCESS_KEY = credentials('delivr-access-key')  // Store in Jenkins credentials
        DELIVR_SERVER_URL = 'https://delivr.example.com'      // Your Delivr server URL
        NVM_DIR = "${env.HOME}/.nvm"
    }

    stages {
        stage('Build') {
            steps {
                // Your existing build steps
                sh './gradlew assembleRelease bundleRelease'
            }
        }
        
        stage('Upload to Delivr') {
            when {
                expression { return !params.DELIVR_INTERNAL }
            }
            steps {
                sh '''#!/usr/bin/env bash
                    set -e
                    
                    # Setup Node.js via nvm
                    export NVM_DIR="$HOME/.nvm"
                    if [ ! -d "$NVM_DIR" ]; then
                        echo "Installing nvm..."
                        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
                    fi
                    . "$NVM_DIR/nvm.sh"
                    
                    # Install and use Node 20
                    if ! nvm ls 20 >/dev/null 2>&1; then
                        nvm install 20
                    fi
                    nvm use 20
                    
                    echo "Node version: $(node -v)"
                    
                    # Install delivr-cli
                    npm install -g @d11/delivr-cli
                    
                    # Authenticate with Delivr
                    code-push-standalone login "$DELIVR_SERVER_URL" --accessKey "$DELIVR_ACCESS_KEY"
                    
                    # Upload AAB build artifact - fails build on error
                    # $BUILD_URL is automatically set by Jenkins
                    # $APP_VERSION and $ORG_NAME should be set in your build environment
                    code-push-standalone upload-aab-build "$BUILD_URL" ./app/build/outputs/bundle/release/app-release.aab --artifactVersion "$APP_VERSION" --org "$ORG_NAME"
                    
                    echo "Build artifact uploaded successfully!"
                '''
            }
        }
        
        stage('Skip Delivr Upload (Internal Build)') {
            when {
                expression { return params.DELIVR_INTERNAL }
            }
            steps {
                echo 'ℹ️ Skipping Delivr upload (internal build)'
            }
        }
    }
    
    post {
        success {
            echo 'Build completed successfully!'
        }
        failure {
            echo 'Build failed'
        }
    }
}
```

### Pipeline Job with Build Number (CI uploads to Play Store)

If your CI pipeline already uploads the AAB to Play Store and you have the versionCode:

```groovy
pipeline {
    agent any
    
    parameters {
        booleanParam(
            name: 'DELIVR_INTERNAL',
            defaultValue: false,
            description: 'Internal Delivr build (skip Delivr upload)'
        )
    }
    
    environment {
        DELIVR_ACCESS_KEY = credentials('delivr-access-key')
        DELIVR_SERVER_URL = 'https://delivr.example.com'
    }

    stages {
        stage('Build') {
            steps {
                sh './gradlew bundleRelease'
            }
        }
        
        stage('Upload to Play Store') {
            steps {
                script {
                    // Your Play Store upload logic
                    // Capture the versionCode after upload
                    env.VERSION_CODE = sh(
                        script: './scripts/upload-to-playstore.sh',
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Upload to Delivr') {
            when {
                expression { return !params.DELIVR_INTERNAL }
            }
            steps {
                sh '''#!/usr/bin/env bash
                    set -e
                    
                    export NVM_DIR="$HOME/.nvm"
                    . "$NVM_DIR/nvm.sh"
                    nvm use 20
                    
                    npm install -g @d11/delivr-cli
                    code-push-standalone login "$DELIVR_SERVER_URL" --accessKey "$DELIVR_ACCESS_KEY"
                    
                    # Upload with build number since we already uploaded to Play Store
                    # Fails build on error
                    code-push-standalone upload-aab-build "$BUILD_URL" \
                        ./app/build/outputs/bundle/release/app-release.aab \
                        --artifactVersion "$APP_VERSION" \
                        --org "$ORG_NAME" \
                        --buildNumber "$VERSION_CODE"
                '''
            }
        }
        
        stage('Skip Delivr Upload (Internal Build)') {
            when {
                expression { return params.DELIVR_INTERNAL }
            }
            steps {
                echo 'ℹ️ Skipping Delivr upload (internal build)'
            }
        }
    }
}
```

### Freestyle Job (Shell Script)

For Jenkins Freestyle projects, add an "Execute shell" build step:

```bash
#!/usr/bin/env bash
set -e

# Configuration - Set these as environment variables in Jenkins
# DELIVR_ACCESS_KEY - Your Delivr access key (use Jenkins credentials binding)
# DELIVR_SERVER_URL - Your Delivr server URL

echo "=== Setup Node.js ==="
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
    echo "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
. "$NVM_DIR/nvm.sh"

if ! nvm ls 20 >/dev/null 2>&1; then
    echo "Installing Node 20..."
    nvm install 20
fi
nvm use 20

echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

echo "=== Install delivr-cli ==="
npm install -g @d11/delivr-cli

echo "=== Authenticate with Delivr ==="
code-push-standalone login "$DELIVR_SERVER_URL" --accessKey "$DELIVR_ACCESS_KEY"

echo "=== Upload Build Artifact ==="
echo "CI Run ID: $BUILD_URL"

# Find and upload the AAB file
AAB_PATH=$(find ./app/build/outputs/bundle -name "*.aab" | head -1)

if [ -z "$AAB_PATH" ]; then
    echo "ERROR: No AAB file found!"
    exit 1
fi

echo "Uploading AAB: $AAB_PATH"
# APP_VERSION and ORG_NAME should be set in your build environment
# Fails build on error
code-push-standalone upload-aab-build "$BUILD_URL" "$AAB_PATH" --artifactVersion "$APP_VERSION" --org "$ORG_NAME"

echo "=== Upload Complete ==="
```

> **Note:** Add `DELIVR_ACCESS_KEY`, `DELIVR_SERVER_URL`, and optionally `DELIVR_INTERNAL` as credentials/environment variables in Jenkins.

---

## GitHub Actions Integration

For **internal development/testing**, you can set `delivr_internal: true` to **skip the Delivr upload entirely**.

### AAB Build Workflow

Create `.github/workflows/delivr-upload-aab.yml`:

```yaml
name: Build and Upload AAB to Delivr

on:
  push:
    branches: [main, release/*]
  workflow_dispatch:
    inputs:
      delivr_internal:
        description: 'Internal Delivr build (skip Delivr upload)'
        required: false
        default: 'false'
        type: boolean

jobs:
  build-and-upload:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Build Release AAB
        run: ./gradlew bundleRelease
      
      - name: Install delivr-cli
        if: ${{ inputs.delivr_internal != true }}
        run: npm install -g @d11/delivr-cli
      
      - name: Upload to Delivr
        if: ${{ inputs.delivr_internal != true }}
        env:
          DELIVR_ACCESS_KEY: ${{ secrets.DELIVR_ACCESS_KEY }}
          DELIVR_SERVER_URL: ${{ secrets.DELIVR_SERVER_URL }}
        run: |
          # Authenticate
          code-push-standalone login "$DELIVR_SERVER_URL" --accessKey "$DELIVR_ACCESS_KEY"
          
          # Construct CI Run ID from GitHub environment variables
          CI_RUN_ID="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
          echo "CI Run ID: $CI_RUN_ID"
          
          # Extract version from build.gradle or set it
          APP_VERSION=$(./gradlew -q printVersionName)
          
          # Upload AAB - fails workflow on error
          code-push-standalone upload-aab-build "$CI_RUN_ID" \
            ./app/build/outputs/bundle/release/app-release.aab \
            --artifactVersion "$APP_VERSION" \
            --org "$ORG_NAME"
      
      - name: Skip Delivr Upload (Internal Build)
        if: ${{ inputs.delivr_internal == true }}
        run: echo "ℹ️ Skipping Delivr upload (internal build)"
```

### APK Regression Build Workflow

Create `.github/workflows/delivr-upload-apk.yml`:

```yaml
name: Build and Upload APK to Delivr

on:
  push:
    branches: [main, release/*]
  workflow_dispatch:
    inputs:
      delivr_internal:
        description: 'Internal Delivr build (skip Delivr upload)'
        required: false
        default: 'false'
        type: boolean

jobs:
  build-and-upload:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Build Release APK
        run: ./gradlew assembleRelease
      
      - name: Install delivr-cli
        if: ${{ inputs.delivr_internal != true }}
        run: npm install -g @d11/delivr-cli
      
      - name: Upload to Delivr
        if: ${{ inputs.delivr_internal != true }}
        env:
          DELIVR_ACCESS_KEY: ${{ secrets.DELIVR_ACCESS_KEY }}
          DELIVR_SERVER_URL: ${{ secrets.DELIVR_SERVER_URL }}
        run: |
          code-push-standalone login "$DELIVR_SERVER_URL" --accessKey "$DELIVR_ACCESS_KEY"
          
          CI_RUN_ID="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
          
          # Extract version from build.gradle or set it
          APP_VERSION=$(./gradlew -q printVersionName)
          
          # Upload APK regression build - fails workflow on error
          code-push-standalone upload-regression-artifact "$CI_RUN_ID" \
            ./app/build/outputs/apk/release/app-release.apk \
            --artifactVersion "$APP_VERSION" \
            --org "$ORG_NAME"
      
      - name: Skip Delivr Upload (Internal Build)
        if: ${{ inputs.delivr_internal == true }}
        run: echo "ℹ️ Skipping Delivr upload (internal build)"
```

### AAB Workflow with Play Store Upload

If your workflow uploads to Play Store first:

```yaml
name: Release to Play Store and Delivr

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      delivr_internal:
        description: 'Internal Delivr build (skip Delivr upload)'
        required: false
        default: 'false'
        type: boolean

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Build Release AAB
        run: ./gradlew bundleRelease
      
      - name: Upload to Play Store
        id: playstore
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: com.example.app
          releaseFiles: app/build/outputs/bundle/release/app-release.aab
          track: internal
      
      - name: Extract Version Code
        id: version
        run: |
          # Extract versionCode from build.gradle or AAB
          VERSION_CODE=$(./gradlew -q printVersionCode)
          echo "version_code=$VERSION_CODE" >> $GITHUB_OUTPUT
      
      - name: Install delivr-cli
        if: ${{ inputs.delivr_internal != true }}
        run: npm install -g @d11/delivr-cli
      
      - name: Upload to Delivr
        if: ${{ inputs.delivr_internal != true }}
        env:
          DELIVR_ACCESS_KEY: ${{ secrets.DELIVR_ACCESS_KEY }}
          DELIVR_SERVER_URL: ${{ secrets.DELIVR_SERVER_URL }}
        run: |
          code-push-standalone login "$DELIVR_SERVER_URL" --accessKey "$DELIVR_ACCESS_KEY"
          
          CI_RUN_ID="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
          
          # Include build number since we already uploaded to Play Store
          # Fails workflow on error
          code-push-standalone upload-aab-build "$CI_RUN_ID" \
            ./app/build/outputs/bundle/release/app-release.aab \
            --artifactVersion "${{ steps.version.outputs.version_name }}" \
            --org "$ORG_NAME" \
            --buildNumber "${{ steps.version.outputs.version_code }}"
      
      - name: Skip Delivr Upload (Internal Build)
        if: ${{ inputs.delivr_internal == true }}
        run: echo "ℹ️ Skipping Delivr upload (internal build)"
```

### iOS IPA Regression Build Workflow

```yaml
name: iOS Build and Upload to Delivr

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      delivr_internal:
        description: 'Internal Delivr build (skip Delivr upload)'
        required: false
        default: 'false'
        type: boolean

jobs:
  build-ios:
    runs-on: macos-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd ios && pod install
      
      - name: Build IPA
        run: |
          xcodebuild -workspace ios/MyApp.xcworkspace \
            -scheme MyApp \
            -configuration Release \
            -archivePath build/MyApp.xcarchive \
            archive
          
          xcodebuild -exportArchive \
            -archivePath build/MyApp.xcarchive \
            -exportPath build \
            -exportOptionsPlist ios/ExportOptions.plist
      
      - name: Install delivr-cli
        if: ${{ inputs.delivr_internal != true }}
        run: npm install -g @d11/delivr-cli
      
      - name: Upload to Delivr
        if: ${{ inputs.delivr_internal != true }}
        env:
          DELIVR_ACCESS_KEY: ${{ secrets.DELIVR_ACCESS_KEY }}
          DELIVR_SERVER_URL: ${{ secrets.DELIVR_SERVER_URL }}
        run: |
          code-push-standalone login "$DELIVR_SERVER_URL" --accessKey "$DELIVR_ACCESS_KEY"
          
          CI_RUN_ID="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
          
          # Extract version from Info.plist or set it
          APP_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" ios/MyApp/Info.plist)
          
          # Upload IPA regression build - fails workflow on error
          code-push-standalone upload-regression-artifact "$CI_RUN_ID" ./build/MyApp.ipa \
            --artifactVersion "$APP_VERSION" \
            --org "$ORG_NAME"
      
      - name: Skip Delivr Upload (Internal Build)
        if: ${{ inputs.delivr_internal == true }}
        run: echo "ℹ️ Skipping Delivr upload (internal build)"
```

### iOS TestFlight Build Number Workflow

If you upload to TestFlight and need to track the build number:

```yaml
name: iOS TestFlight Upload

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      delivr_internal:
        description: 'Internal Delivr build (skip Delivr upload)'
        required: false
        default: 'false'
        type: boolean

jobs:
  build-and-upload:
    runs-on: macos-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: cd ios && pod install
      
      - name: Build and Archive
        run: |
          xcodebuild -workspace ios/MyApp.xcworkspace \
            -scheme MyApp \
            -configuration Release \
            -archivePath build/MyApp.xcarchive \
            archive
      
      - name: Upload to TestFlight
        id: testflight
        env:
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY }}
        run: |
          # Upload to TestFlight using your preferred method
          # Capture the TestFlight build number
          TESTFLIGHT_BUILD_NUMBER="17965"  # Replace with actual build number
          echo "build_number=$TESTFLIGHT_BUILD_NUMBER" >> $GITHUB_OUTPUT
      
      - name: Install delivr-cli
        if: ${{ inputs.delivr_internal != true }}
        run: npm install -g @d11/delivr-cli
      
      - name: Upload TestFlight Build Number to Delivr
        if: ${{ inputs.delivr_internal != true }}
        env:
          DELIVR_ACCESS_KEY: ${{ secrets.DELIVR_ACCESS_KEY }}
          DELIVR_SERVER_URL: ${{ secrets.DELIVR_SERVER_URL }}
        run: |
          code-push-standalone login "$DELIVR_SERVER_URL" --accessKey "$DELIVR_ACCESS_KEY"
          
          CI_RUN_ID="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
          
          # Extract version from Info.plist or set it
          APP_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" ios/MyApp/Info.plist)
          
          # Upload TestFlight build number - fails workflow on error
          code-push-standalone upload-testflight-build-number "$CI_RUN_ID" \
            "${{ steps.testflight.outputs.build_number }}" \
            --artifactVersion "$APP_VERSION" \
            --org "$ORG_NAME"
      
      - name: Skip Delivr Upload (Internal Build)
        if: ${{ inputs.delivr_internal == true }}
        run: echo "ℹ️ Skipping Delivr upload (internal build)"
```

---

## Troubleshooting

### Common Issues

#### 1. "You are not currently logged in"

**Solution:** Ensure you run `code-push-standalone login --accessKey` with the server URL before any other commands.

```bash
code-push-standalone login "$DELIVR_SERVER_URL" --accessKey "$DELIVR_ACCESS_KEY"
```

#### 2. "Artifact file does not exist"

**Solution:** Verify the artifact path is correct. Use `find` to locate the file:

```bash
find . -name "*.aab" -o -name "*.apk" -o -name "*.ipa"
```

#### 3. "Invalid artifact type"

**Solution:** Use the correct command for your file type:
- `.aab` files → `upload-aab-build`
- `.apk` / `.ipa` files → `upload-regression-artifact`

#### 4. Node.js not found in Jenkins

**Solution:** Use nvm to install Node.js in your build script:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
```

#### 5. Permission denied when installing globally

**Solution:** For CI environments without sudo access:

```bash
# Option 1: Use npx (no global install needed)
npx @d11/delivr-cli upload-aab-build "$BUILD_URL" ./app.aab --artifactVersion "3.0.4" --org "MyOrg"

# Option 2: Install to user directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm install -g @d11/delivr-cli
```

---

## Environment Variables Reference

### Required Secrets (Store in CI Credentials)

| Variable | Description |
|----------|-------------|
| `DELIVR_ACCESS_KEY` | Your Delivr access key |
| `DELIVR_SERVER_URL` | Your Delivr server URL (e.g., `https://delivr.example.com`) |
| `ORG_NAME` | Your organization name in Delivr (e.g., `MyOrg`) |

### Jenkins

| Variable | Description |
|----------|-------------|
| `BUILD_URL` | Full URL of the build (e.g., `https://jenkins.example.com/job/MyApp/123/`) |
| `BUILD_NUMBER` | Build number |
| `JOB_NAME` | Job name |
| `WORKSPACE` | Workspace directory path |

### GitHub Actions

| Variable | Description |
|----------|-------------|
| `GITHUB_SERVER_URL` | GitHub server URL (e.g., `https://github.com`) |
| `GITHUB_REPOSITORY` | Repository name (e.g., `org/repo`) |
| `GITHUB_RUN_ID` | Unique run ID |
| `GITHUB_RUN_NUMBER` | Run number |
| `GITHUB_WORKSPACE` | Workspace directory path |

**Constructing CI Run ID for GitHub Actions:**

```bash
CI_RUN_ID="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
```

---

## Security Best Practices

1. **Never hardcode access keys** - Always use CI secrets/credentials
2. **Rotate access keys regularly** - Generate new keys periodically
3. **Use minimal permissions** - Create access keys with only required permissions
4. **Audit access** - Regularly review who has access to CI secrets

---

## Support

For issues or questions:
- Check the [CLI Reference](../CLI_REFERENCE.md) for command details
- Open an issue on the repository

