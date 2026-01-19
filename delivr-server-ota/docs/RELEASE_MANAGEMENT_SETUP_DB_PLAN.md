# Release Management Setup - Database Design Plan

## Overview
This document outlines the database schema changes needed to track Release Management setup status per tenant and manage individual integrations.

---

## 1. Database Schema Changes

### 1.1 New Table: `tenant_release_settings`

**Purpose:** Track overall Release Management setup status for each tenant

```sql
CREATE TABLE IF NOT EXISTS tenant_release_settings (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- Setup status
  setupComplete BOOLEAN DEFAULT FALSE,
  setupCompletedAt DATETIME NULL,
  setupCompletedByAccountId VARCHAR(255) NULL,
  
  -- Setup steps completion tracking
  githubConnected BOOLEAN DEFAULT FALSE,
  targetPlatformsConfigured BOOLEAN DEFAULT FALSE,
  platformCredentialsConfigured BOOLEAN DEFAULT FALSE,
  cicdConfigured BOOLEAN DEFAULT FALSE,
  slackConfigured BOOLEAN DEFAULT FALSE,
  
  -- Configuration metadata
  selectedTargets JSON NULL,  -- Array of selected targets: ['APP_STORE', 'PLAY_STORE']
  selectedPlatforms JSON NULL, -- Array of platforms: ['IOS', 'ANDROID', 'WEB']
  
  -- Timestamps
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_tenant_release_settings (tenantId),
  INDEX idx_tenant_setup_status (tenantId, setupComplete),
  
  -- Foreign Keys (to be added after all tables exist)
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (setupCompletedByAccountId) REFERENCES accounts(id) ON DELETE SET NULL
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

**Key Points:**
- One row per tenant
- Tracks overall setup completion
- Tracks individual step completion for granular control
- Stores selected targets/platforms as JSON for flexibility
- Links to account who completed setup

---

### 1.2 Existing Table: `tenant_integrations` (Already Created)

**Purpose:** Store individual integration configurations and verification status

**Current Schema:**
```sql
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- Integration type
  integrationType ENUM(
    'GITHUB',
    'GITLAB', 
    'BITBUCKET',
    'JENKINS',
    'GITHUB_ACTIONS',
    'SLACK',
    'TEAMS',
    'JIRA',
    'LINEAR',
    'APP_STORE_CONNECT',
    'PLAY_STORE',
    'CODE_SIGNING',
    'FIREBASE',
    'TEST_RAIL'
  ) NOT NULL,
  
  -- Status flags
  isEnabled BOOLEAN DEFAULT FALSE,
  isRequired BOOLEAN DEFAULT FALSE,
  
  -- Configuration (encrypted)
  config JSON NOT NULL,
  
  -- Verification tracking
  configuredByAccountId VARCHAR(255) NOT NULL,
  lastVerifiedAt DATETIME NULL,
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'NOT_VERIFIED',
  
  -- Timestamps
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_tenant_integration (tenantId, integrationType),
  INDEX idx_tenant_integrations_tenant (tenantId),
  INDEX idx_tenant_integrations_type (integrationType),
  INDEX idx_tenant_integrations_enabled (tenantId, isEnabled),
  
  -- Foreign Keys
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (configuredByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

**Config JSON Structure Examples:**

```json
// GitHub
{
  "accessToken": "encrypted_token",
  "organization": "dream11",
  "repoName": "mobile-app"
}

// App Store Connect
{
  "apiKeyId": "encrypted_key_id",
  "issuerId": "encrypted_issuer_id",
  "privateKey": "encrypted_private_key",
  "bundleId": "com.dream11.app"
}

// Play Store
{
  "serviceAccountEmail": "sa@project.iam.gserviceaccount.com",
  "privateKey": "encrypted_private_key",
  "packageName": "com.dream11.app"
}

// Jenkins
{
  "url": "https://jenkins.example.com",
  "username": "admin",
  "apiToken": "encrypted_token",
  "pipelines": [
    {
      "name": "production-build",
      "jobPath": "folder/job-name",
      "platform": "ANDROID",
      "target": "PLAY_STORE"
    }
  ]
}

// GitHub Actions
{
  "workflows": [
    {
      "name": "iOS Build",
      "workflowPath": ".github/workflows/ios-build.yml",
      "platform": "IOS",
      "target": "APP_STORE"
    }
  ]
}

// Slack
{
  "botToken": "encrypted_token",
  "channels": ["releases", "dev-team"],
  "notifyOnEvents": ["release_started", "build_completed", "release_submitted"]
}
```

---

## 2. Migration File Structure

```
delivr-server-ota-managed/
└── migrations/
    ├── 002_release_management.sql          (Already exists)
    ├── 002_release_management_seed.sql     (Already exists)
    ├── 002_release_management_rollback.sql (Already exists)
    ├── 003_tenant_release_settings.sql     (NEW - Add tenant_release_settings table)
    └── 003_tenant_release_settings_rollback.sql (NEW - Rollback script)
```

---

## 3. API Folder Structure

```
delivr-server-ota-managed/
└── api/
    └── script/
        └── release/                        (NEW FOLDER)
            ├── models/
            │   ├── index.ts                (Export all models)
            │   └── release-models.ts       (Already created)
            │
            ├── controllers/
            │   ├── release.controller.ts   (Release CRUD operations)
            │   ├── setup.controller.ts     (Setup wizard logic)
            │   ├── integration.controller.ts (Integration management)
            │   └── build.controller.ts     (Build triggers & status)
            │
            ├── services/
            │   ├── release.service.ts      (Business logic for releases)
            │   ├── setup.service.ts        (Setup validation & persistence)
            │   ├── integration.service.ts  (Integration verification)
            │   ├── github.service.ts       (GitHub API integration)
            │   ├── appstore.service.ts     (App Store Connect API)
            │   ├── playstore.service.ts    (Google Play API)
            │   ├── jenkins.service.ts      (Jenkins API)
            │   ├── slack.service.ts        (Slack API)
            │   └── encryption.service.ts   (Encrypt/decrypt credentials)
            │
            ├── routes/
            │   ├── release.routes.ts       (Release endpoints)
            │   ├── setup.routes.ts         (Setup wizard endpoints)
            │   └── integration.routes.ts   (Integration endpoints)
            │
            ├── validators/
            │   ├── release.validator.ts    (Input validation for releases)
            │   ├── setup.validator.ts      (Setup data validation)
            │   └── integration.validator.ts (Integration config validation)
            │
            ├── types/
            │   ├── release.types.ts        (TypeScript interfaces)
            │   ├── integration.types.ts    (Integration types)
            │   └── enums.ts                (Enums: ReleaseStatus, IntegrationType, etc.)
            │
            └── utils/
                ├── release-helpers.ts      (Helper functions)
                └── constants.ts            (Constants & config)
```

---

## 4. Setup Flow Logic

### 4.1 Determining Setup Status

```typescript
// Check if setup is complete for a tenant
async function isSetupComplete(tenantId: string): Promise<boolean> {
  const settings = await TenantReleaseSettings.findOne({
    where: { tenantId }
  });
  
  if (!settings) {
    return false;
  }
  
  return settings.setupComplete;
}

// Get detailed setup status
async function getSetupStatus(tenantId: string): Promise<SetupStatus> {
  const settings = await TenantReleaseSettings.findOne({
    where: { tenantId }
  });
  
  if (!settings) {
    return {
      setupComplete: false,
      steps: {
        githubConnected: false,
        targetPlatformsConfigured: false,
        platformCredentialsConfigured: false,
        cicdConfigured: false,
        slackConfigured: false
      }
    };
  }
  
  return {
    setupComplete: settings.setupComplete,
    steps: {
      githubConnected: settings.githubConnected,
      targetPlatformsConfigured: settings.targetPlatformsConfigured,
      platformCredentialsConfigured: settings.platformCredentialsConfigured,
      cicdConfigured: settings.cicdConfigured,
      slackConfigured: settings.slackConfigured
    }
  };
}
```

### 4.2 Setup Completion Criteria

Setup is considered **complete** when:
1. ✅ GitHub is connected (`githubConnected = true`)
2. ✅ At least one target platform selected (`targetPlatformsConfigured = true`)
3. ✅ Credentials configured for selected platforms (`platformCredentialsConfigured = true`)

**Optional steps** (not required for setup completion):
- CI/CD configuration (`cicdConfigured`)
- Slack integration (`slackConfigured`)

---

## 5. Integration Verification Flow

### 5.1 Verification Endpoints

```
POST /api/v1/setup/verify-github
POST /api/v1/setup/verify-appstore
POST /api/v1/setup/verify-playstore
POST /api/v1/setup/verify-jenkins
POST /api/v1/setup/verify-github-actions
POST /api/v1/setup/verify-slack
```

### 5.2 Verification Logic

```typescript
async function verifyIntegration(
  tenantId: string, 
  integrationType: IntegrationType,
  config: any
): Promise<VerificationResult> {
  try {
    // 1. Test connection with provided credentials
    const isValid = await testConnection(integrationType, config);
    
    // 2. Update verification status
    await TenantIntegrations.update({
      verificationStatus: isValid ? 'VALID' : 'INVALID',
      lastVerifiedAt: new Date()
    }, {
      where: { tenantId, integrationType }
    });
    
    return {
      success: isValid,
      message: isValid ? 'Connection verified' : 'Connection failed',
      timestamp: new Date()
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      timestamp: new Date()
    };
  }
}
```

---

## 6. Security Considerations

### 6.1 Credential Encryption

- All sensitive data in `tenant_integrations.config` must be encrypted
- Use AES-256-GCM encryption
- Store encryption key in environment variables (not in DB)
- Decrypt only when needed for API calls

### 6.2 Access Control

- Only tenant **owners** can complete setup
- Only tenant **owners** can modify integrations
- Editors and viewers can only read integration status (not credentials)

---

## 7. Migration Plan

### Phase 1: Database Changes
1. ✅ Create `003_tenant_release_settings.sql` migration
2. ✅ Create rollback script
3. ✅ Test migration on local MySQL
4. ✅ Verify foreign key constraints

### Phase 2: Model & Service Layer
1. Create Sequelize model for `tenant_release_settings`
2. Create setup service (`setup.service.ts`)
3. Create integration service (`integration.service.ts`)
4. Implement encryption service

### Phase 3: API Controllers & Routes
1. Implement setup endpoints
2. Implement integration verification endpoints
3. Add authentication middleware
4. Add permission checks (owner-only)

### Phase 4: Integration Services
1. Implement GitHub API service
2. Implement App Store Connect service
3. Implement Google Play service
4. Implement Jenkins service
5. Implement Slack service

### Phase 5: Testing
1. Unit tests for services
2. Integration tests for verification endpoints
3. End-to-end setup flow testing

---

## 8. Environment Variables Needed

```env
# Encryption
INTEGRATION_ENCRYPTION_KEY=<32-byte-hex-string>

# External API Rate Limits
GITHUB_API_RATE_LIMIT=5000
APPSTORE_CONNECT_TIMEOUT=30000
PLAYSTORE_API_TIMEOUT=30000

# Feature Flags
ENABLE_JENKINS_INTEGRATION=true
ENABLE_GITHUB_ACTIONS_INTEGRATION=true
ENABLE_SLACK_INTEGRATION=true
```

---

## 9. Example API Request/Response

### Save Setup Data
```http
POST /api/v1/:tenantId/release-management/setup
Authorization: Bearer <token>

{
  "github": {
    "accessToken": "ghp_xxxxx",
    "organization": "dream11",
    "repoName": "mobile-app"
  },
  "targets": ["APP_STORE", "PLAY_STORE"],
  "platforms": ["IOS", "ANDROID"],
  "appStoreConnect": {
    "apiKeyId": "XXXXX",
    "issuerId": "xxxxx-xxxx-xxxx",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...",
    "bundleId": "com.dream11.app"
  },
  "playStore": {
    "serviceAccountEmail": "sa@project.iam.gserviceaccount.com",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...",
    "packageName": "com.dream11.app"
  },
  "cicd": {
    "type": "GITHUB_ACTIONS",
    "workflows": [...]
  },
  "slack": {
    "botToken": "xoxb-...",
    "channels": ["releases"]
  }
}
```

### Response
```json
{
  "success": true,
  "setupComplete": true,
  "message": "Release Management setup completed successfully",
  "completedAt": "2025-11-09T15:30:00Z"
}
```

---

## 10. Next Steps

1. **Review this plan** - Confirm schema design
2. **Create migration files** - `003_tenant_release_settings.sql`
3. **Update Sequelize models** - Add `TenantReleaseSettings` model
4. **Implement setup service** - Business logic for setup wizard
5. **Implement integration services** - External API integrations
6. **Create API endpoints** - Setup & integration management
7. **Add encryption** - Secure credential storage
8. **Write tests** - Unit & integration tests

---

## Summary

**New Table:** `tenant_release_settings`
- Tracks setup completion status per tenant
- Stores step-by-step progress
- Links to completing account

**Existing Table:** `tenant_integrations`
- Stores individual integration configurations
- Tracks verification status
- Stores encrypted credentials

**API Structure:** Well-organized folder structure with controllers, services, and validators

**Security:** Encryption for all sensitive data, owner-only access control

