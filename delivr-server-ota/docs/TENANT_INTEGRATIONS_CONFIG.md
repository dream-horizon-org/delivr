# 🔌 Tenant Integrations Configuration Guide

## 📋 Overview

In the **New Delivr** system, all integrations (GitHub, Slack, Jenkins, App Store, etc.) are configured **per tenant**, replacing the hardcoded environment variables from OG Delivr.

This allows:
- ✅ **Multi-tenancy**: Each organization has its own integrations
- ✅ **Flexibility**: Different tenants can use different tools (GitHub vs GitLab, Slack vs Teams)
- ✅ **Security**: Credentials stored encrypted in database, not in env files
- ✅ **Pluggable**: Optional integrations can be enabled/disabled

---

## 🗃️ Database Schema

### `tenant_integrations` Table

```sql
CREATE TABLE tenant_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) NOT NULL,
  integrationType ENUM(...) NOT NULL,
  isEnabled BOOLEAN DEFAULT FALSE,
  isRequired BOOLEAN DEFAULT FALSE,
  config JSON NOT NULL,  -- Encrypted configuration
  configuredByAccountId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  lastVerifiedAt TIMESTAMP NULL,
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED'),
  UNIQUE KEY (tenantId, integrationType)
);
```

**One row per integration type per tenant.**

---

## 🔧 Integration Types

### Mandatory Integrations (Required for Release Management)

| Integration | Purpose | Why Mandatory |
|-------------|---------|---------------|
| **GITHUB** or **GITLAB** or **BITBUCKET** | Source control, branch management, cherry-picks | Need to fork branches, track commits, manage PRs |
| **SLACK** or **TEAMS** | Notifications, approvals | Communication with release team |

> **Note**: At least ONE source control and ONE messaging tool must be configured.

### Optional Integrations (Pluggable)

| Integration | Purpose | When to Use |
|-------------|---------|-------------|
| **JENKINS** or **GITHUB_ACTIONS** | Build automation | If using CI/CD for builds |
| **JIRA** or **LINEAR** | Issue tracking | If linking releases to tickets |
| **APP_STORE_CONNECT** | iOS distribution | If releasing to App Store |
| **PLAY_STORE** | Android distribution | If releasing to Play Store |
| **CODE_SIGNING** | Certificate management | If managing iOS/Android signing |
| **FIREBASE** | Analytics, crashlytics | If using Firebase |
| **TEST_RAIL** | Test management | If using TestRail for regression |

---

## 📊 Configuration JSON Structures

### 1. GitHub Configuration

```json
{
  "type": "GITHUB",
  "token": "ghp_xxxxxxxxxxxxxxxxxxxx",  // Personal Access Token (encrypted)
  "owner": "mycompany",
  "repo": "my-mobile-app",
  "baseBranch": "main",
  "webhookSecret": "xxxxxxxx",  // Optional, for webhooks
  "apiUrl": "https://api.github.com"  // Default, can override for GitHub Enterprise
}
```

**Required Permissions**: `repo`, `workflow`, `write:packages`

### 2. GitLab Configuration

```json
{
  "type": "GITLAB",
  "token": "glpat-xxxxxxxxxxxx",  // Project Access Token (encrypted)
  "projectId": "12345",
  "baseBranch": "main",
  "apiUrl": "https://gitlab.com/api/v4"  // Can override for self-hosted
}
```

### 3. Slack Configuration

```json
{
  "type": "SLACK",
  "botToken": "xoxb-xxxxxxxxxxxx",  // Bot User OAuth Token (encrypted)
  "channels": {
    "general": "C01234567",  // Channel IDs
    "releases": "C07654321",
    "alerts": "C09876543"
  },
  "webhookUrl": "https://hooks.slack.com/services/T00/B00/xxxx"  // Optional
}
```

**Required Bot Scopes**: `chat:write`, `files:write`, `channels:read`, `users:read`

### 4. Microsoft Teams Configuration

```json
{
  "type": "TEAMS",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxx",  // encrypted
  "teamId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "channels": {
    "general": "19:xxxxxxxxxxxxxxxx@thread.tacv2",
    "releases": "19:xxxxxxxxxxxxxxxx@thread.tacv2"
  }
}
```

### 5. Jenkins Configuration

```json
{
  "type": "JENKINS",
  "url": "https://jenkins.mycompany.com",
  "username": "api-user",
  "apiToken": "xxxxxxxxxx",  // encrypted
  "jobs": {
    "android": "Mobile-App-Android-Build",
    "ios": "Mobile-App-iOS-Build",
    "web": "Mobile-App-Web-Build"
  },
  "buildParameters": {
    "BRANCH": "release/{version}",
    "BUILD_TYPE": "release"
  }
}
```

### 6. GitHub Actions Configuration

```json
{
  "type": "GITHUB_ACTIONS",
  "token": "ghp_xxxxxxxxxxxx",  // Same as GitHub token, or separate (encrypted)
  "workflows": {
    "android": ".github/workflows/android-build.yml",
    "ios": ".github/workflows/ios-build.yml",
    "web": ".github/workflows/web-build.yml"
  },
  "inputs": {
    "build_type": "release",
    "skip_tests": "false"
  }
}
```

### 7. Jira Configuration

```json
{
  "type": "JIRA",
  "url": "https://mycompany.atlassian.net",
  "email": "api@mycompany.com",
  "apiToken": "xxxxxxxxxx",  // encrypted
  "projectKey": "MOB",
  "releaseVersionPrefix": "Mobile",
  "customFields": {
    "releaseDate": "customfield_10001",
    "testingStatus": "customfield_10002"
  }
}
```

### 8. Linear Configuration

```json
{
  "type": "LINEAR",
  "apiKey": "lin_api_xxxxxxxxxx",  // encrypted
  "teamId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "releaseLabel": "release",
  "webhookSecret": "xxxxxxxxxx"
}
```

### 9. App Store Connect Configuration

```json
{
  "type": "APP_STORE_CONNECT",
  "issuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "keyId": "XXXXXXXXXX",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",  // encrypted
  "bundleId": "com.mycompany.app",
  "appId": "1234567890",
  "teamId": "XXXXXXXXXX"
}
```

### 10. Play Store Configuration

```json
{
  "type": "PLAY_STORE",
  "packageName": "com.mycompany.app",
  "serviceAccountEmail": "play-store-api@mycompany.iam.gserviceaccount.com",
  "serviceAccountKey": "{...}",  // Full JSON key file content (encrypted)
  "track": "production",
  "releaseStatus": "completed"
}
```

### 11. Code Signing Configuration

```json
{
  "type": "CODE_SIGNING",
  "ios": {
    "certificateP12": "base64_encoded_p12_file",  // encrypted
    "certificatePassword": "xxxxxxxxxx",  // encrypted
    "provisioningProfile": "base64_encoded_profile",  // encrypted
    "teamId": "XXXXXXXXXX"
  },
  "android": {
    "keystoreFile": "base64_encoded_keystore",  // encrypted
    "keystorePassword": "xxxxxxxxxx",  // encrypted
    "keyAlias": "release-key",
    "keyPassword": "xxxxxxxxxx"  // encrypted
  }
}
```

### 12. Firebase Configuration

```json
{
  "type": "FIREBASE",
  "projectId": "my-app-12345",
  "serviceAccountKey": "{...}",  // Full JSON key file content (encrypted)
  "iosAppId": "1:123456789:ios:abcdef",
  "androidAppId": "1:123456789:android:abcdef",
  "webAppId": "1:123456789:web:abcdef"
}
```

### 13. TestRail Configuration

```json
{
  "type": "TEST_RAIL",
  "url": "https://mycompany.testrail.io",
  "username": "api@mycompany.com",
  "apiKey": "xxxxxxxxxx",  // encrypted
  "projectId": 1,
  "suiteId": 2,
  "milestonePrefix": "Mobile Release"
}
```

---

## 🔒 Security & Encryption

### Encryption Strategy

1. **At Rest**: All sensitive fields in `config` JSON are encrypted using **AES-256-GCM**
2. **Encryption Key**: Stored in environment variable `TENANT_CONFIG_ENCRYPTION_KEY` (server-level, NOT tenant-level)
3. **Key Rotation**: Support for key rotation without re-encrypting all data

### Fields to Encrypt

| Integration | Encrypted Fields |
|-------------|-----------------|
| GitHub/GitLab | `token`, `webhookSecret` |
| Slack | `botToken`, `webhookUrl` |
| Teams | `clientSecret` |
| Jenkins | `apiToken` |
| Jira/Linear | `apiToken`, `apiKey` |
| App Store | `privateKey` |
| Play Store | `serviceAccountKey` |
| Code Signing | ALL certificate/keystore data |
| Firebase | `serviceAccountKey` |
| TestRail | `apiKey` |

### Backend Implementation

```typescript
// api/script/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.TENANT_CONFIG_ENCRYPTION_KEY; // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const [iv, authTag, encrypted] = encryptedText.split(':');
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## 🚀 Setup Flow

### When Tenant First Uses Release Management

#### Step 1: Check Required Integrations (Backend)

```typescript
async function checkReleaseManagementReadiness(tenantId: string): Promise<{
  ready: boolean;
  missingRequired: string[];
  availableOptional: string[];
}> {
  const integrations = await storage.getTenantIntegrations(tenantId);
  
  const hasSourceControl = integrations.some(i => 
    ['GITHUB', 'GITLAB', 'BITBUCKET'].includes(i.integrationType) && i.isEnabled
  );
  
  const hasMessaging = integrations.some(i => 
    ['SLACK', 'TEAMS'].includes(i.integrationType) && i.isEnabled
  );
  
  const missingRequired = [];
  if (!hasSourceControl) missingRequired.push('Source Control (GitHub/GitLab/Bitbucket)');
  if (!hasMessaging) missingRequired.push('Messaging (Slack/Teams)');
  
  return {
    ready: missingRequired.length === 0,
    missingRequired,
    availableOptional: OPTIONAL_INTEGRATIONS
  };
}
```

#### Step 2: Frontend - Setup Wizard

When user clicks "Create Release" for the first time:

1. **Check Readiness** → API call to `/api/v1/tenants/:tenantId/release-management/readiness`
2. **If not ready** → Show Setup Wizard Modal
3. **Wizard Steps**:
   - **Step 1**: Select Source Control (GitHub/GitLab/Bitbucket) ← **Required**
   - **Step 2**: Configure Source Control (token, repo, etc.)
   - **Step 3**: Select Messaging (Slack/Teams) ← **Required**
   - **Step 4**: Configure Messaging (bot token, channels, etc.)
   - **Step 5**: Optional Integrations (Jenkins, Jira, App Store, Play Store, etc.)
   - **Step 6**: Test Connections (verify all credentials)
   - **Step 7**: Confirm & Save

4. **After Setup** → User can create releases

#### Step 3: Verification

Backend verifies each integration on save:
- **GitHub**: Try to list branches
- **Slack**: Try to post a test message
- **Jenkins**: Try to list jobs
- **App Store**: Try to list apps

---

## 📝 API Endpoints

### Get Tenant Integrations

```http
GET /api/v1/tenants/:tenantId/integrations
Authorization: Bearer {token}
```

**Response:**
```json
{
  "integrations": [
    {
      "id": "int_123",
      "integrationType": "GITHUB",
      "isEnabled": true,
      "isRequired": true,
      "verificationStatus": "VALID",
      "lastVerifiedAt": "2025-01-08T10:30:00Z",
      "config": {
        "owner": "mycompany",
        "repo": "my-mobile-app",
        "baseBranch": "main"
        // Sensitive fields not returned
      }
    }
  ]
}
```

### Add/Update Integration

```http
POST /api/v1/tenants/:tenantId/integrations
Authorization: Bearer {token}
Content-Type: application/json

{
  "integrationType": "GITHUB",
  "isEnabled": true,
  "config": {
    "type": "GITHUB",
    "token": "ghp_xxxxxxxxxxxx",
    "owner": "mycompany",
    "repo": "my-mobile-app",
    "baseBranch": "main"
  }
}
```

### Verify Integration

```http
POST /api/v1/tenants/:tenantId/integrations/:integrationId/verify
Authorization: Bearer {token}
```

**Response:**
```json
{
  "valid": true,
  "message": "Successfully connected to GitHub",
  "details": {
    "repo": "mycompany/my-mobile-app",
    "branches": 5,
    "lastCommit": "2025-01-08T10:00:00Z"
  }
}
```

### Delete Integration

```http
DELETE /api/v1/tenants/:tenantId/integrations/:integrationId
Authorization: Bearer {token}
```

---

## ✅ Checklist for Implementation

- [ ] Create `tenant_integrations` table in migration
- [ ] Implement encryption utility functions
- [ ] Add `TENANT_CONFIG_ENCRYPTION_KEY` to `.env`
- [ ] Extend Storage interface with integration methods:
  - `getTenantIntegrations(tenantId)`
  - `addTenantIntegration(tenantId, integration)`
  - `updateTenantIntegration(integrationId, config)`
  - `deleteTenantIntegration(integrationId)`
  - `verifyTenantIntegration(integrationId)`
- [ ] Create integration controllers for each type (GitHub, Slack, etc.)
- [ ] Create API routes for integration management
- [ ] Build Setup Wizard UI component
- [ ] Implement verification logic for each integration type
- [ ] Add middleware to check release management readiness
- [ ] Create migration guide for existing OG Delivr configs

---

## 🎯 Migration from OG Delivr

### Existing Environment Variables

OG Delivr has these hardcoded in `.env`:

```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_OWNER=dream11
GITHUB_REPO=mobile-app

# Slack
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx
SLACK_CHANNEL_GENERAL=C01234567
SLACK_CHANNEL_RELEASES=C07654321

# Jenkins
JENKINS_URL=https://jenkins.dream11.com
JENKINS_USERNAME=api-user
JENKINS_API_TOKEN=xxxxxxxxxx

# Jira
JIRA_URL=https://dream11.atlassian.net
JIRA_EMAIL=api@dream11.com
JIRA_API_TOKEN=xxxxxxxxxx

# App Store
APP_STORE_ISSUER_ID=xxxxxxxx
APP_STORE_KEY_ID=XXXXXXXXXX
APP_STORE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...

# Play Store
PLAY_STORE_PACKAGE_NAME=com.dream11.app
PLAY_STORE_SERVICE_ACCOUNT_EMAIL=play-store-api@dream11.iam.gserviceaccount.com
PLAY_STORE_SERVICE_ACCOUNT_KEY={...}
```

### Migration Script

```typescript
// api/script/migrations/migrate-og-delivr-configs.ts
async function migrateOGDelivrConfigs(tenantId: string) {
  // GitHub
  await storage.addTenantIntegration(tenantId, {
    integrationType: 'GITHUB',
    isEnabled: true,
    isRequired: true,
    config: {
      type: 'GITHUB',
      token: process.env.GITHUB_TOKEN,
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      baseBranch: 'main'
    }
  });

  // Slack
  await storage.addTenantIntegration(tenantId, {
    integrationType: 'SLACK',
    isEnabled: true,
    isRequired: true,
    config: {
      type: 'SLACK',
      botToken: process.env.SLACK_BOT_TOKEN,
      channels: {
        general: process.env.SLACK_CHANNEL_GENERAL,
        releases: process.env.SLACK_CHANNEL_RELEASES
      }
    }
  });

  // ... similar for Jenkins, Jira, App Store, Play Store
}
```

---

**✅ This completes the Tenant Integrations design!**

All integrations are now:
- Per-tenant (multi-tenant ready)
- Securely encrypted
- Pluggable (mandatory vs optional)
- Verifiable (test connections)
- Managed via UI (Setup Wizard)

