# Jira Integration - Complete Flow Guide

## 📚 Table of Contents

1. [Overview](#overview)
2. [Database Schema & Tables](#database-schema--tables)
3. [Authentication & Authorization Flow](#authentication--authorization-flow)
4. [API Endpoints & Methods](#api-endpoints--methods)
5. [Integration Management Flow](#integration-management-flow)
6. [Configuration Management Flow](#configuration-management-flow)
7. [Epic Management Flow](#epic-management-flow)
8. [Complete User Flows](#complete-user-flows)
9. [Code Architecture](#code-architecture)
10. [Request/Response Examples](#requestresponse-examples)

---

## Overview

The Jira integration allows tenants to:
1. **Connect Jira credentials** (one per tenant)
2. **Create reusable configurations** (many per tenant)
3. **Automatically create epics** for releases
4. **Track epic status** for release management

**Architecture Pattern:**
```
Integration (credentials) → Configuration (settings) → Epics (per release)
     1 per tenant      →    Many per tenant       →   Many per release
```

---

## Database Schema & Tables

### Table Relationships Diagram

```
┌─────────────────┐
│    accounts     │ (Users)
│  id (PK)        │
│  email          │
│  name           │
└────────┬────────┘
         │ createdByAccountId
         │
         ▼
┌─────────────────┐
│    tenants      │ (Organizations)
│  id (PK)        │
│  name           │
└────────┬────────┘
         │
         │ tenantId
         ▼
┌──────────────────────────┐
│  jira_integrations       │ (Credentials - ONE per tenant)
│  id (PK)                 │
│  tenantId (FK,UNIQUE)    │──────┐
│  jiraInstanceUrl         │      │
│  apiToken (encrypted)    │      │
│  email                   │      │
│  jiraType                │      │
│  isEnabled               │      │
│  verificationStatus      │      │
│  createdByAccountId (FK) │      │
└──────────────────────────┘      │
         │                        │
         │ tenantId               │
         ▼                        │
┌──────────────────────────┐      │
│  jira_configurations     │ (Settings - MANY per tenant)
│  id (PK)                 │      │
│  tenantId (FK)           │──────┘
│  configName (UNIQUE)     │
│  description             │
│  platformsConfig (JSON)  │
│  isActive                │
│  createdByAccountId (FK) │
└────────┬─────────────────┘
         │
         │ jiraConfigId
         ▼
┌──────────────────────────┐
│  release_jira_epics      │ (Epics - MANY per release)
│  id (PK)                 │
│  releaseId (FK)          │
│  platform (ENUM)         │
│  jiraConfigId (FK)       │─────┘
│  epicTitle               │
│  jiraEpicKey             │
│  jiraEpicId              │
│  jiraEpicUrl             │
│  creationStatus          │
└──────────────────────────┘
```

### Table: `jira_integrations` (Credentials)

**Purpose:** Store Jira credentials per tenant (one-to-one relationship)

```sql
CREATE TABLE jira_integrations (
  id                    VARCHAR(255) PRIMARY KEY,
  tenantId              CHAR(36) NOT NULL,
  
  -- Connection details
  jiraInstanceUrl       VARCHAR(500) NOT NULL,  -- e.g., https://company.atlassian.net
  apiToken              TEXT NOT NULL,           -- Encrypted API token
  email                 VARCHAR(255) NULL,       -- Required for Jira Cloud
  jiraType              ENUM('JIRA_CLOUD', 'JIRA_SERVER', 'JIRA_DATA_CENTER') NOT NULL,
  
  -- Status
  isEnabled             BOOLEAN NOT NULL DEFAULT TRUE,
  verificationStatus    ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'NOT_VERIFIED',
  lastVerifiedAt        TIMESTAMP NULL,
  
  -- Metadata
  createdByAccountId    VARCHAR(255) NOT NULL,
  createdAt             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE KEY unique_tenant_jira (tenantId),           -- ONE per tenant
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
);
```

**Key Points:**
- ✅ One integration per tenant (enforced by UNIQUE constraint)
- ✅ apiToken should be encrypted before storage
- ✅ verificationStatus tracks connection health

### Table: `jira_configurations` (Reusable Settings)

**Purpose:** Store reusable Jira configurations with platform-specific settings

```sql
CREATE TABLE jira_configurations (
  id                    VARCHAR(255) PRIMARY KEY,
  tenantId              CHAR(36) NOT NULL,
  
  -- Configuration identification
  configName            VARCHAR(255) NOT NULL,
  description           TEXT NULL,
  
  -- Platform-specific settings (JSON)
  platformsConfig       JSON NOT NULL,
  
  -- Status
  isActive              BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  createdByAccountId    VARCHAR(255) NOT NULL,
  createdAt             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE KEY unique_tenant_config_name (tenantId, configName),  -- Unique name per tenant
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
);
```

**platformsConfig JSON Structure:**
```json
{
  "WEB": {
    "projectKey": "FE",
    "readyToReleaseState": "Done"
  },
  "IOS": {
    "projectKey": "MOBILE",
    "readyToReleaseState": "Ready for Production"
  },
  "ANDROID": {
    "projectKey": "MOBILE",
    "readyToReleaseState": "Ready for Production"
  }
}
```

**Key Points:**
- ✅ Multiple configurations per tenant
- ✅ Each configuration has unique name per tenant
- ✅ Platform-specific project keys and ready states
- ✅ **Selective Platform Usage**: Configuration stores ALL platforms, but during release creation, you can select which platforms to create epics for
  - Example: Config has WEB, IOS, ANDROID
  - Release 1: Create epics for only ["WEB", "IOS"] → Only 2 epics created
  - Release 2: Create epics for only ["ANDROID"] → Only 1 epic created
  - The system extracts the specific platform config from the JSON for each selected platform

### Table: `release_jira_epics` (Epic Tracking)

**Purpose:** Track Jira epic creation for releases

```sql
CREATE TABLE release_jira_epics (
  id                    VARCHAR(255) PRIMARY KEY,
  releaseId             VARCHAR(255) NOT NULL,
  platform              ENUM('WEB', 'IOS', 'ANDROID') NOT NULL,
  
  -- Reference to configuration
  jiraConfigId          VARCHAR(255) NOT NULL,
  
  -- Epic details
  epicTitle             VARCHAR(500) NOT NULL,
  epicDescription       TEXT NULL,
  
  -- Jira API response (populated after creation)
  jiraEpicKey           VARCHAR(50) NULL,         -- e.g., FE-123
  jiraEpicId            VARCHAR(255) NULL,        -- Jira's internal ID
  jiraEpicUrl           VARCHAR(500) NULL,        -- Direct link to epic
  
  -- Status tracking
  creationStatus        ENUM('PENDING', 'CREATING', 'CREATED', 'FAILED') DEFAULT 'PENDING',
  creationError         TEXT NULL,
  
  -- Timestamps
  createdAt             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  jiraCreatedAt         TIMESTAMP NULL,
  
  -- Constraints
  UNIQUE KEY unique_release_platform (releaseId, platform),  -- ONE epic per platform per release
  FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  FOREIGN KEY (jiraConfigId) REFERENCES jira_configurations(id) ON DELETE RESTRICT
);
```

**Key Points:**
- ✅ One epic per platform per release
- ✅ References configuration (not integration directly)
- ✅ Tracks creation status (async process)

---

## Authentication & Authorization Flow

### Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Login Request
       ▼
┌──────────────────────┐
│  OAuth Provider      │ (Google, GitHub, Azure AD)
│  (Google/GitHub/etc) │
└──────┬───────────────┘
       │ 2. OAuth Token
       ▼
┌──────────────────────┐
│  API Server          │
│  /auth/callback      │
└──────┬───────────────┘
       │ 3. Verify Token
       │ 4. Get/Create Account
       ▼
┌──────────────────────┐
│  accounts table      │
│  - id                │
│  - email             │
│  - name              │
└──────┬───────────────┘
       │ 5. Return JWT
       ▼
┌─────────────┐
│   Client    │ (Stores JWT)
└─────────────┘
```

### Authorization Flow (Tenant Permissions)

```
Request: POST /tenants/:tenantId/integrations/jira
Header: Authorization: Bearer <JWT>

┌─────────────────────────────────────────────┐
│  1. Authentication Middleware               │
│     - Verify JWT                            │
│     - Extract user.id                       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  2. Tenant Permission Middleware            │
│     requireOwner({ storage })               │
│                                             │
│     Query: SELECT * FROM collaborators      │
│            WHERE accountId = user.id        │
│            AND tenantId = req.params.tenantId │
│            AND appId IS NULL                │
│            AND permission = 'Owner'         │
└──────────────┬──────────────────────────────┘
               │
               ├─ NOT FOUND ──> 403 Forbidden
               │
               ├─ FOUND ──────> Continue
               ▼
┌─────────────────────────────────────────────┐
│  3. Controller Method                       │
│     createOrUpdateJiraIntegration()         │
└─────────────────────────────────────────────┘
```

### Debug Mode (Testing Only)

```
Environment: DEBUG_DISABLE_AUTH=true
             DEBUG_USER_ID=test_user_123

┌─────────────────────────────────────────────┐
│  Debug Middleware                           │
│  req.user = { id: 'test_user_123' }        │
│  ⚠️  BYPASS ALL AUTH                        │
└─────────────────────────────────────────────┘
```

---

## API Endpoints & Methods

### Jira Integration Endpoints (Credentials)

#### 1. Create/Update Integration

```
POST /tenants/:tenantId/integrations/jira
Authorization: Bearer <token>
Permission: Owner

REQUEST BODY:
{
  "jiraInstanceUrl": "https://company.atlassian.net",
  "apiToken": "YOUR_API_TOKEN",
  "email": "user@company.com",
  "jiraType": "JIRA_CLOUD",
  "isEnabled": true
}

RESPONSE (201 Created or 200 OK):
{
  "success": true,
  "message": "JIRA integration created/updated successfully",
  "integration": {
    "id": "jira_abc123",
    "tenantId": "tenant_xyz",
    "jiraInstanceUrl": "https://company.atlassian.net",
    "email": "user@company.com",
    "jiraType": "JIRA_CLOUD",
    "isEnabled": true,
    "verificationStatus": "NOT_VERIFIED",
    "hasValidToken": true,
    "createdAt": "2025-11-20T10:00:00Z",
    "updatedAt": "2025-11-20T10:00:00Z"
  }
}
```

**Flow:**
1. Extract `tenantId` from URL, `accountId` from `req.user.id`
2. Validate required fields
3. Check if integration exists for tenant
4. If exists → Update, else → Create
5. Return safe integration (without apiToken)

#### 2. Get Integration

```
GET /tenants/:tenantId/integrations/jira
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "integration": {
    "id": "jira_abc123",
    "tenantId": "tenant_xyz",
    "jiraInstanceUrl": "https://company.atlassian.net",
    "email": "user@company.com",
    "jiraType": "JIRA_CLOUD",
    "isEnabled": true,
    "verificationStatus": "VALID",
    "lastVerifiedAt": "2025-11-20T10:00:00Z",
    "hasValidToken": true
  }
}
```

#### 3. Test Connection

```
POST /tenants/:tenantId/integrations/jira/test
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "message": "JIRA integration is configured",
  "details": {
    "configured": true,
    "enabled": true,
    "jiraInstanceUrl": "https://company.atlassian.net",
    "jiraType": "JIRA_CLOUD"
  }
}
```

#### 4. Delete Integration

```
DELETE /tenants/:tenantId/integrations/jira
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "message": "JIRA integration deleted successfully"
}
```

### Jira Configuration Endpoints (Settings)

#### 1. Create Configuration

```
POST /tenants/:tenantId/jira/configurations
Authorization: Bearer <token>
Permission: Owner

REQUEST BODY:
{
  "configName": "Frontend Release Config",
  "description": "Configuration for web and mobile releases",
  "platformsConfig": {
    "WEB": {
      "projectKey": "FE",
      "readyToReleaseState": "Done"
    },
    "IOS": {
      "projectKey": "MOBILE",
      "readyToReleaseState": "Ready for Production"
    },
    "ANDROID": {
      "projectKey": "MOBILE",
      "readyToReleaseState": "Ready for Production"
    }
  }
}

RESPONSE (201 Created):
{
  "success": true,
  "message": "JIRA configuration created successfully",
  "configuration": {
    "id": "config_xyz789",
    "tenantId": "tenant_xyz",
    "configName": "Frontend Release Config",
    "description": "Configuration for web and mobile releases",
    "platformsConfig": { /* ... */ },
    "isActive": true,
    "createdAt": "2025-11-20T10:00:00Z"
  }
}
```

#### 2. List Configurations

```
GET /tenants/:tenantId/jira/configurations
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "configurations": [
    {
      "id": "config_xyz789",
      "configName": "Frontend Release Config",
      "description": "Configuration for web and mobile releases",
      "platformsConfig": { /* ... */ },
      "isActive": true
    },
    {
      "id": "config_abc456",
      "configName": "Backend Release Config",
      "platformsConfig": { /* ... */ },
      "isActive": true
    }
  ]
}
```

#### 3. Get Single Configuration

```
GET /tenants/:tenantId/jira/configurations/:configId
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "configuration": {
    "id": "config_xyz789",
    "tenantId": "tenant_xyz",
    "configName": "Frontend Release Config",
    "platformsConfig": {
      "WEB": {
        "projectKey": "FE",
        "readyToReleaseState": "Done"
      }
    },
    "isActive": true
  }
}
```

#### 4. Update Configuration

```
PUT /tenants/:tenantId/jira/configurations/:configId
Authorization: Bearer <token>
Permission: Owner

REQUEST BODY:
{
  "configName": "Updated Frontend Config",
  "description": "Updated description",
  "platformsConfig": {
    "WEB": {
      "projectKey": "FE",
      "readyToReleaseState": "Ready to Deploy"
    }
  }
}

RESPONSE (200 OK):
{
  "success": true,
  "message": "JIRA configuration updated successfully",
  "configuration": { /* updated config */ }
}
```

#### 5. Delete Configuration

```
DELETE /tenants/:tenantId/jira/configurations/:configId
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "message": "JIRA configuration deleted successfully"
}
```

**Note:** This is a soft delete (sets `isActive = false`)

#### 6. Verify Configuration

```
POST /tenants/:tenantId/jira/configurations/:configId/verify
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "valid": true,
  "configurationId": "config_xyz789",
  "configurationName": "Frontend Release Config",
  "results": {
    "WEB": {
      "valid": true,
      "projectKey": "FE",
      "message": "Project FE is accessible"
    },
    "IOS": {
      "valid": true,
      "projectKey": "MOBILE",
      "message": "Project MOBILE is accessible"
    }
  },
  "message": "All platform configurations are valid"
}
```

### Epic Management Endpoints

#### 1. Create Epics for Release

```
POST /tenants/:tenantId/releases/:releaseId/jira/epics
Authorization: Bearer <token>
Permission: Owner

REQUEST BODY:
{
  "jiraConfigId": "config_xyz789",
  "platforms": ["WEB", "IOS", "ANDROID"],
  "version": "1.0.0",
  "description": "Release 1.0.0 - New features and bug fixes"
}

RESPONSE (201 Created):
{
  "success": true,
  "message": "Epic creation initiated",
  "epics": [
    {
      "id": "epic_web_001",
      "releaseId": "release_123",
      "platform": "WEB",
      "jiraConfigId": "config_xyz789",
      "epicTitle": "Release 1.0.0 - WEB",
      "epicDescription": "Release 1.0.0 - New features and bug fixes",
      "creationStatus": "PENDING",
      "jiraEpicKey": null,
      "jiraEpicUrl": null
    },
    {
      "id": "epic_ios_001",
      "releaseId": "release_123",
      "platform": "IOS",
      "creationStatus": "PENDING"
    },
    {
      "id": "epic_android_001",
      "releaseId": "release_123",
      "platform": "ANDROID",
      "creationStatus": "PENDING"
    }
  ]
}
```

**Flow:**
1. Validate configuration exists and is active
2. Check platforms are configured in the configuration
3. Create epic records in database (status: PENDING)
4. Trigger async job to create epics in Jira
5. Return immediately with epic records

#### 2. Get Epics for Release

```
GET /tenants/:tenantId/releases/:releaseId/jira/epics
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "epics": [
    {
      "id": "epic_web_001",
      "releaseId": "release_123",
      "platform": "WEB",
      "epicTitle": "Release 1.0.0 - WEB",
      "jiraEpicKey": "FE-123",
      "jiraEpicId": "10001",
      "jiraEpicUrl": "https://company.atlassian.net/browse/FE-123",
      "creationStatus": "CREATED",
      "createdAt": "2025-11-20T10:00:00Z",
      "jiraCreatedAt": "2025-11-20T10:01:00Z"
    }
  ]
}
```

#### 3. Get Single Epic

```
GET /tenants/:tenantId/jira/epics/:epicId
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "epic": {
    "id": "epic_web_001",
    "releaseId": "release_123",
    "platform": "WEB",
    "jiraConfigId": "config_xyz789",
    "epicTitle": "Release 2.0.0 - WEB",
    "epicDescription": "Major release with new features",
    "jiraEpicKey": "FE-123",
    "jiraEpicId": "10001",
    "jiraEpicUrl": "https://company.atlassian.net/browse/FE-123",
    "creationStatus": "CREATED",
    "createdAt": "2025-11-20T10:10:00.000Z",
    "jiraCreatedAt": "2025-11-20T10:10:15.000Z"
  }
}
```

#### 4. Update Epic

```
PUT /tenants/:tenantId/jira/epics/:epicId
Authorization: Bearer <token>
Permission: Owner

REQUEST BODY:
{
  "epicTitle": "Release 2.0.1 - WEB (Updated)",
  "epicDescription": "Updated description with bug fixes"
}

RESPONSE (200 OK):
{
  "success": true,
  "message": "Epic updated successfully",
  "epic": {
    "id": "epic_web_001",
    "releaseId": "release_123",
    "platform": "WEB",
    "epicTitle": "Release 2.0.1 - WEB (Updated)",
    "epicDescription": "Updated description with bug fixes",
    "jiraEpicKey": "FE-123",
    "creationStatus": "CREATED",
    "updatedAt": "2025-11-20T11:00:00.000Z"
  }
}
```

**Note:** This only updates the epic record in the database. To update the epic in Jira, you would need to call the Jira API separately.

#### 5. Delete Epic

```
DELETE /tenants/:tenantId/jira/epics/:epicId
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "message": "Epic deleted successfully",
  "epicId": "epic_web_001"
}
```

**Note:** This only deletes the epic record from the database. The epic in Jira will remain unchanged.

#### 6. Check Epic Status

```
GET /tenants/:tenantId/jira/epics/:epicId/check-status
Authorization: Bearer <token>
Permission: Owner

RESPONSE (200 OK):
{
  "success": true,
  "approved": true,
  "currentStatus": "Done",
  "requiredStatus": "Done",
  "epicKey": "FE-123",
  "message": "✅ Epic FE-123 is ready for release"
}
```

---

## Integration Management Flow

### Complete Integration Setup Flow

```
┌──────────────────────────────────────────────────────────┐
│  STEP 1: User Creates Integration                        │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  POST /tenants/:tenantId/integrations/jira               │
│                                                           │
│  1. tenantPermissions.requireOwner()                     │
│     - Verify user is tenant owner                        │
│                                                           │
│  2. createOrUpdateJiraIntegration()                      │
│     - Extract accountId from req.user.id                 │
│     - Validate jiraInstanceUrl format                    │
│     - Validate apiToken exists                           │
│     - Validate email for Jira Cloud                      │
│                                                           │
│  3. getJiraIntegrationController()                       │
│     - Get controller from storage singleton              │
│                                                           │
│  4. Check if integration exists                          │
│     controller.findByTenantId(tenantId)                  │
│                                                           │
│     ├─ EXISTS ──> controller.update()                    │
│     │             - Update existing record                │
│     │             - Return updated integration            │
│     │                                                     │
│     └─ NOT EXISTS ──> controller.create()                │
│                       - Generate nanoid()                 │
│                       - Insert into jira_integrations    │
│                       - Set verificationStatus = NOT_VERIFIED │
│                       - Return new integration            │
│                                                           │
│  5. Return SafeJiraIntegration                           │
│     - Remove apiToken from response                      │
│     - Add hasValidToken: true                            │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  STEP 2: Test Connection (Optional)                      │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  POST /tenants/:tenantId/integrations/jira/test          │
│                                                           │
│  1. Get integration with tokens                          │
│     controller.findByTenantId(tenantId, true)            │
│                                                           │
│  2. Create Jira client                                   │
│     createJiraClientForTenant(tenantId)                  │
│     - Decrypt apiToken                                   │
│     - Initialize Jira SDK                                │
│                                                           │
│  3. Test API call                                        │
│     jiraClient.getCurrentUser()                          │
│                                                           │
│     ├─ SUCCESS ──> Update verificationStatus = VALID     │
│     │              Return success response                │
│     │                                                     │
│     └─ FAILURE ──> Update verificationStatus = INVALID   │
│                    Return error details                   │
└──────────────────────────────────────────────────────────┘
```

### Integration Update Flow

```
┌──────────────────────────────────────────────────────────┐
│  Update Integration (Same endpoint as create)            │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  POST /tenants/:tenantId/integrations/jira               │
│                                                           │
│  1. controller.findByTenantId(tenantId)                  │
│     - Found existing integration                         │
│                                                           │
│  2. Build update payload                                 │
│     updateData = {                                       │
│       jiraInstanceUrl,                                   │
│       apiToken,  // TODO: Encrypt                        │
│       email,                                             │
│       jiraType,                                          │
│       isEnabled                                          │
│     }                                                    │
│                                                           │
│  3. integration.update(updateData)                       │
│     - Sequelize UPDATE query                             │
│     - updatedAt auto-updated                             │
│                                                           │
│  4. Return updated integration (safe version)            │
└──────────────────────────────────────────────────────────┘
```

---

## Configuration Management Flow

### Configuration Creation Flow

```
┌──────────────────────────────────────────────────────────┐
│  STEP 1: User Creates Configuration                      │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  POST /tenants/:tenantId/jira/configurations             │
│                                                           │
│  1. Extract and validate data                            │
│     const { configName, description, platformsConfig } = req.body │
│                                                           │
│  2. Validate configName exists                           │
│     if (!configName || !platformsConfig)                 │
│       return 400 Bad Request                             │
│                                                           │
│  3. Validate platformsConfig structure                   │
│     for (platform in platformsConfig) {                  │
│       - platform in ['WEB', 'IOS', 'ANDROID']           │
│       - projectKey exists and valid format               │
│       - readyToReleaseState exists                       │
│     }                                                    │
│                                                           │
│  4. Check uniqueness                                     │
│     configController.findByName(tenantId, configName)    │
│     if (exists) return 409 Conflict                      │
│                                                           │
│  5. Create configuration                                 │
│     configController.create({                            │
│       id: nanoid(),                                      │
│       tenantId,                                          │
│       configName,                                        │
│       description,                                       │
│       platformsConfig,                                   │
│       isActive: true,                                    │
│       createdByAccountId: req.user.id                    │
│     })                                                   │
│                                                           │
│  6. Return created configuration                         │
└──────────────────────────────────────────────────────────┘
```

### Configuration Verification Flow

```
┌──────────────────────────────────────────────────────────┐
│  POST /tenants/:tenantId/jira/configurations/:configId/verify │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  1. Get configuration                                     │
│     configController.findById(configId)                  │
│     if (!config) return 404                              │
│                                                           │
│  2. Get Jira integration (for API access)                │
│     integrationController.findByTenantId(tenantId, true) │
│     if (!integration) return 404                         │
│                                                           │
│  3. Create Jira client                                   │
│     jiraClient = createJiraClientForTenant(tenantId)     │
│                                                           │
│  4. Verify each platform configuration                   │
│     results = {}                                         │
│     for (platform, platformConfig in config.platformsConfig) { │
│                                                           │
│       4.1. Get all projects from Jira                    │
│            projects = await jiraClient.getProjects()     │
│                                                           │
│       4.2. Check if project exists                       │
│            projectExists = projects.some(               │
│              p => p.key === platformConfig.projectKey    │
│            )                                             │
│                                                           │
│       4.3. Store result                                  │
│            results[platform] = {                         │
│              valid: projectExists,                       │
│              projectKey,                                 │
│              readyToReleaseState,                        │
│              message: projectExists ?                    │
│                "Project accessible" :                    │
│                "Project not found"                       │
│            }                                             │
│     }                                                    │
│                                                           │
│  5. Determine overall validity                           │
│     allValid = all results are valid                     │
│                                                           │
│  6. Return verification results                          │
│     return {                                             │
│       valid: allValid,                                   │
│       results,                                           │
│       message                                            │
│     }                                                    │
└──────────────────────────────────────────────────────────┘
```

---

## Epic Management Flow

### Epic Creation Complete Flow

```
┌──────────────────────────────────────────────────────────┐
│  STEP 1: Create Release with Jira Epics                  │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  POST /tenants/:tenantId/releases                        │
│                                                           │
│  Body: {                                                 │
│    version: "1.0.0",                                     │
│    platforms: ["WEB", "IOS"],                            │
│    jiraConfigId: "config_xyz789",                        │
│    autoCreateJiraEpics: true,                            │
│    description: "Release 1.0.0"                          │
│  }                                                       │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  STEP 2: Validate and Create Epic Records                │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  POST /tenants/:tenantId/releases/:releaseId/jira/epics  │
│                                                           │
│  1. Validate input                                       │
│     - jiraConfigId exists                                │
│     - platforms is array                                 │
│     - version exists                                     │
│                                                           │
│  2. Check Jira integration                               │
│     integration = jiraIntegrationController.findByTenantId() │
│     if (!integration || !integration.isEnabled)          │
│       return 404/400                                     │
│                                                           │
│  3. Get configuration                                    │
│     config = configController.findById(jiraConfigId)     │
│     if (!config || !config.isActive)                     │
│       return 404/400                                     │
│                                                           │
│  4. Validate SELECTED platforms exist in configuration   │
│     // User selected: platforms = ["WEB", "IOS"]        │
│     // Config has: { WEB: {...}, IOS: {...}, ANDROID: {...} } │
│                                                           │
│     for (platform in platforms) {                        │
│       if (!config.platformsConfig[platform])             │
│         return 400 "Platform not configured"             │
│     }                                                    │
│     // ✅ Validates only WEB and IOS (user's selection)  │
│     // ℹ️ ANDROID in config but not validated (not selected) │
│                                                           │
│  5. Create epic records ONLY for selected platforms      │
│     epics = await epicService.createEpicsForRelease(     │
│       releaseId,                                         │
│       jiraConfigId,                                      │
│       version,                                           │
│       platforms,  // ["WEB", "IOS"] - user selected     │
│       description                                        │
│     )                                                    │
│                                                           │
│     ⚠️ IMPORTANT: Loop only through SELECTED platforms   │
│     for (const platform of platforms) {  // WEB, IOS only│
│       INSERT INTO release_jira_epics (                   │
│         id: nanoid(),                                    │
│         releaseId,                                       │
│         platform,        // "WEB" or "IOS" only          │
│         jiraConfigId,                                    │
│         epicTitle: `Release ${version} - ${platform}`,  │
│         epicDescription: description,                    │
│         creationStatus: 'PENDING',                       │
│         jiraEpicKey: null,                               │
│         jiraEpicId: null,                                │
│         jiraEpicUrl: null                                │
│       )                                                  │
│     }                                                    │
│     // Result: 2 epic records created (WEB, IOS)         │
│     // ANDROID NOT created because not in platforms[]   │
│                                                           │
│  6. Trigger async epic creation                          │
│     createEpicsInJiraAsync(tenantId, epics, epicService) │
│     (Background job - doesn't block response)            │
│                                                           │
│  7. Return epic records immediately                      │
│     return { success: true, epics }                      │
└──────────────────────────────────────────────────────────┘
```

### Async Epic Creation in Jira

```
┌──────────────────────────────────────────────────────────┐
│  Background Job: createEpicsInJiraAsync()                │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  For each epic:                                          │
│                                                           │
│  1. Get Jira configuration and extract platform config  │
│     config = await configController.findById(epic.jiraConfigId) │
│     // config.platformsConfig = { WEB: {...}, IOS: {...}, ANDROID: {...} } │
│                                                           │
│     // Extract ONLY the config for THIS epic's platform  │
│     platformConfig = config.platformsConfig[epic.platform] │
│     // If epic.platform = "WEB"                          │
│     // platformConfig = { projectKey: "FE", readyToReleaseState: "Done" } │
│                                                           │
│     projectKey = platformConfig.projectKey  // "FE"      │
│                                                           │
│  2. Create Jira client                                   │
│     jiraClient = await createJiraClientForTenant(tenantId) │
│                                                           │
│  3. Update epic status to CREATING                       │
│     UPDATE release_jira_epics                            │
│     SET creationStatus = 'CREATING'                      │
│     WHERE id = epic.id                                   │
│                                                           │
│  4. Create epic in Jira via API                          │
│     response = await jiraClient.createEpic({             │
│       fields: {                                          │
│         project: { key: projectKey },                    │
│         summary: epic.epicTitle,                         │
│         description: epic.epicDescription,               │
│         issuetype: { name: 'Epic' },                     │
│         customfield_10011: epic.epicTitle  // Epic name  │
│       }                                                  │
│     })                                                   │
│                                                           │
│  5. Handle response                                      │
│                                                           │
│     ├─ SUCCESS ────────────────────────────┐            │
│     │                                        │            │
│     │  5.1. Extract epic details            │            │
│     │       jiraEpicKey = response.key      │            │
│     │       jiraEpicId = response.id        │            │
│     │       jiraEpicUrl = jiraInstanceUrl + │            │
│     │                     '/browse/' + key  │            │
│     │                                        │            │
│     │  5.2. Update database record           │            │
│     │       UPDATE release_jira_epics        │            │
│     │       SET                              │            │
│     │         jiraEpicKey = jiraEpicKey,     │            │
│     │         jiraEpicId = jiraEpicId,       │            │
│     │         jiraEpicUrl = jiraEpicUrl,     │            │
│     │         creationStatus = 'CREATED',    │            │
│     │         jiraCreatedAt = NOW()          │            │
│     │       WHERE id = epic.id               │            │
│     │                                        │            │
│     └────────────────────────────────────────┘            │
│                                                           │
│     ├─ FAILURE ────────────────────────────┐            │
│     │                                        │            │
│     │  5.1. Log error                        │            │
│     │       console.error(error)             │            │
│     │                                        │            │
│     │  5.2. Update database with error       │            │
│     │       UPDATE release_jira_epics        │            │
│     │       SET                              │            │
│     │         creationStatus = 'FAILED',     │            │
│     │         creationError = error.message  │            │
│     │       WHERE id = epic.id               │            │
│     │                                        │            │
│     └────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

### Epic Status Check Flow

```
┌──────────────────────────────────────────────────────────┐
│  GET /tenants/:tenantId/jira/epics/:epicId/check-status  │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  1. Get epic record                                      │
│     epic = await epicService.findById(epicId)            │
│     if (!epic) return 404                                │
│                                                           │
│  2. Get configuration                                    │
│     config = await configController.findById(epic.jiraConfigId) │
│     platformConfig = config.platformsConfig[epic.platform] │
│     requiredStatus = platformConfig.readyToReleaseState  │
│                                                           │
│  3. Create Jira client                                   │
│     jiraClient = await createJiraClientForTenant(tenantId) │
│                                                           │
│  4. Get current epic status from Jira                    │
│     issue = await jiraClient.getIssue(epic.jiraEpicKey)  │
│     currentStatus = issue.fields.status.name             │
│                                                           │
│  5. Compare statuses                                     │
│     approved = (currentStatus === requiredStatus)        │
│                                                           │
│  6. Return result                                        │
│     return {                                             │
│       approved,                                          │
│       currentStatus,                                     │
│       requiredStatus,                                    │
│       epicKey: epic.jiraEpicKey,                         │
│       message: approved ?                                │
│         "Epic ready for release" :                       │
│         "Epic not ready"                                 │
│     }                                                    │
└──────────────────────────────────────────────────────────┘
```

---

## Complete User Flows

### Flow 1: Initial Setup (First Time User)

```
User Journey: Set up Jira integration from scratch

STEP 1: Login
┌────────────────────┐
│ User logs in       │ → OAuth → JWT Token stored
└────────────────────┘

STEP 2: Create Tenant (if not exists)
┌────────────────────┐
│ POST /tenants      │ → Tenant created
│ - name             │ → User becomes Owner
│ - description      │ → collaborator record created
└────────────────────┘

STEP 3: Connect Jira
┌────────────────────────────────────┐
│ POST /tenants/:id/integrations/jira│
│                                    │
│ Body:                              │
│ {                                  │
│   jiraInstanceUrl: "https://...", │
│   apiToken: "...",                 │
│   email: "...",                    │
│   jiraType: "JIRA_CLOUD"           │
│ }                                  │
└────────────────────────────────────┘
         │
         ├─► Database: jira_integrations (INSERT)
         │   - tenantId = :id
         │   - verificationStatus = 'NOT_VERIFIED'
         │
         └─► Response: integration object

STEP 4: Test Connection (Optional)
┌───────────────────────────────────────┐
│ POST /tenants/:id/integrations/jira/test │
└───────────────────────────────────────┘
         │
         ├─► Call Jira API
         │
         ├─► Update verificationStatus = 'VALID'
         │
         └─► Response: connection status

STEP 5: Create Configuration
┌───────────────────────────────────────┐
│ POST /tenants/:id/jira/configurations │
│                                        │
│ Body:                                  │
│ {                                      │
│   configName: "Production Config",    │
│   platformsConfig: {                  │
│     WEB: {                            │
│       projectKey: "FE",               │
│       readyToReleaseState: "Done"     │
│     }                                 │
│   }                                   │
│ }                                     │
└───────────────────────────────────────┘
         │
         ├─► Database: jira_configurations (INSERT)
         │
         └─► Response: configuration object

STEP 6: Verify Configuration
┌────────────────────────────────────────────────┐
│ POST /tenants/:id/jira/configurations/:configId/verify │
└────────────────────────────────────────────────┘
         │
         ├─► Call Jira API to check project access
         │
         └─► Response: validation results

✅ Setup Complete! User can now create releases with auto-generated epics.
```

### Flow 2: Creating a Release with Jira Epics

```
User Journey: Create a new release with automatic Jira epic creation

PREREQUISITES:
- ✅ Jira integration exists
- ✅ Jira configuration exists
- ✅ Configuration verified

STEP 1: Create Release
┌───────────────────────────────────┐
│ POST /tenants/:id/releases        │
│                                   │
│ Body:                             │
│ {                                 │
│   version: "2.0.0",               │
│   platforms: ["WEB", "IOS"],      │
│   jiraConfigId: "config_xyz",     │
│   autoCreateJiraEpics: true,      │
│   description: "Major release"    │
│ }                                 │
└───────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│ Backend Processing                            │
│                                               │
│ 1. Create release record                     │
│    INSERT INTO releases (...)                │
│                                               │
│ 2. Create epic request                       │
│    POST /tenants/:id/releases/:releaseId/jira/epics │
│    Body: { jiraConfigId, platforms, version } │
└───────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│ Epic Creation Flow                            │
│                                               │
│ 1. Validate configuration                    │
│    - Check config exists                     │
│    - Check platforms configured              │
│                                               │
│ 2. Create epic records (PENDING)             │
│    For each platform:                        │
│      INSERT INTO release_jira_epics (        │
│        releaseId,                            │
│        platform,                             │
│        epicTitle: "Release 2.0.0 - WEB",    │
│        creationStatus: 'PENDING'             │
│      )                                       │
│                                               │
│ 3. Return immediately                        │
│    Response: { epics: [array] }              │
│                                               │
│ 4. Background job starts                     │
│    (Async - doesn't block response)          │
└───────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│ Background Epic Creation (Async)              │
│                                               │
│ For each epic:                                │
│                                               │
│ 1. Update status → CREATING                  │
│                                               │
│ 2. Call Jira API                             │
│    jiraClient.createEpic({                   │
│      project: { key: "FE" },                 │
│      summary: "Release 2.0.0 - WEB",         │
│      issuetype: { name: "Epic" }             │
│    })                                        │
│                                               │
│ 3. On success:                               │
│    UPDATE release_jira_epics SET             │
│      jiraEpicKey = "FE-123",                 │
│      jiraEpicUrl = "https://...browse/FE-123", │
│      creationStatus = 'CREATED'              │
│                                               │
│ 4. On failure:                               │
│    UPDATE release_jira_epics SET             │
│      creationStatus = 'FAILED',              │
│      creationError = error.message           │
└───────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│ User Checks Status (Later)                    │
│                                               │
│ GET /tenants/:id/releases/:releaseId/jira/epics │
│                                               │
│ Response:                                     │
│ {                                             │
│   epics: [                                    │
│     {                                         │
│       platform: "WEB",                        │
│       jiraEpicKey: "FE-123",                  │
│       jiraEpicUrl: "https://...",             │
│       creationStatus: "CREATED"               │
│     },                                        │
│     {                                         │
│       platform: "IOS",                        │
│       jiraEpicKey: "MOBILE-456",              │
│       creationStatus: "CREATED"               │
│     }                                         │
│   ]                                           │
│ }                                             │
└───────────────────────────────────────────────┘
```

### Flow 3: Release Approval Check

```
User Journey: Check if epic is ready for release

STEP 1: Get Epic Status
┌───────────────────────────────────────────────┐
│ GET /tenants/:id/jira/epics/:epicId/check-status │
└───────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│ Backend Processing                            │
│                                               │
│ 1. Get epic record from database             │
│    epic = SELECT * FROM release_jira_epics   │
│           WHERE id = :epicId                 │
│                                               │
│ 2. Get configuration                         │
│    config = SELECT * FROM jira_configurations│
│             WHERE id = epic.jiraConfigId     │
│                                               │
│ 3. Get required status                       │
│    platformConfig = config.platformsConfig[epic.platform] │
│    requiredStatus = platformConfig.readyToReleaseState │
│    // Example: "Done"                         │
│                                               │
│ 4. Get current status from Jira              │
│    issue = jiraClient.getIssue(epic.jiraEpicKey) │
│    currentStatus = issue.fields.status.name  │
│    // Example: "In Progress"                 │
│                                               │
│ 5. Compare                                   │
│    approved = (currentStatus === requiredStatus) │
│    // false in this example                  │
└───────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│ Response                                      │
│                                               │
│ {                                             │
│   success: true,                              │
│   approved: false,                            │
│   currentStatus: "In Progress",              │
│   requiredStatus: "Done",                    │
│   epicKey: "FE-123",                          │
│   message: "⏳ Epic FE-123 is NOT ready..."  │
│ }                                             │
└───────────────────────────────────────────────┘

User sees: Epic is not ready yet, current status is "In Progress"

---

Later, after Jira epic status is updated to "Done":

┌───────────────────────────────────────────────┐
│ GET /tenants/:id/jira/epics/:epicId/check-status │
└───────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│ Response                                      │
│                                               │
│ {                                             │
│   success: true,                              │
│   approved: true,                             │
│   currentStatus: "Done",                      │
│   requiredStatus: "Done",                    │
│   epicKey: "FE-123",                          │
│   message: "✅ Epic FE-123 is ready..."       │
│ }                                             │
└───────────────────────────────────────────────┘

User sees: ✅ Epic is ready for release!
```

---

## Code Architecture

### File Structure

```
api/script/
├── controllers/integrations/
│   └── jira-controllers.ts              (867 lines - HTTP handlers)
│       ├── createOrUpdateJiraIntegration()
│       ├── getJiraIntegration()
│       ├── deleteJiraIntegration()
│       ├── testJiraConnection()
│       ├── createJiraConfiguration()
│       ├── getJiraConfigurations()
│       ├── getJiraConfigurationById()
│       ├── updateJiraConfiguration()
│       ├── deleteJiraConfiguration()
│       ├── verifyJiraConfiguration()
│       ├── createEpicsForRelease()
│       ├── getEpicsForRelease()
│       └── checkEpicStatus()
│
├── storage/integrations/jira/
│   ├── jira-controller.ts               (Data access layer - Repository)
│   │   ├── JiraIntegrationController
│   │   │   ├── create()
│   │   │   ├── findById()
│   │   │   ├── findByTenantId()
│   │   │   ├── update()
│   │   │   ├── softDelete()
│   │   │   └── toSafeObject()
│   │   └── JiraConfigurationController
│   │       ├── create()
│   │       ├── findById()
│   │       ├── findByName()
│   │       ├── findByTenantId()
│   │       ├── update()
│   │       └── softDelete()
│   │
│   ├── jira-integration-models.ts       (Sequelize models)
│   │   ├── createJiraIntegrationsModel()
│   │   ├── createJiraConfigurationsModel()
│   │   └── createReleaseJiraEpicsModel()
│   │
│   ├── jira-epic-service.ts             (Epic business logic)
│   │   └── JiraEpicService
│   │       ├── createEpicsForRelease()
│   │       ├── findEpicsByReleaseId()
│   │       ├── createEpicInJira()
│   │       └── checkEpicReadyStatus()
│   │
│   └── jira-types.ts                    (TypeScript types)
│       ├── JiraIntegrationType
│       ├── JiraVerificationStatus
│       ├── CreateJiraIntegrationDto
│       ├── UpdateJiraIntegrationDto
│       ├── SafeJiraIntegration
│       └── ...
│
├── routes/
│   └── jira-integrations.ts            (Route definitions)
│       └── createJiraIntegrationRoutes()
│
├── middleware/
│   └── tenant-permissions.ts           (Authorization)
│       ├── requireOwner()
│       ├── requireEditor()
│       └── requireTenantMembership()
│
└── utils/
    └── jira-utils.ts                    (Helper functions)
        ├── isValidJiraUrl()
        ├── isValidProjectKey()
        ├── createJiraClientForTenant()
        └── generateReleaseJiraLinks()
```

### Key Classes and Methods

#### JiraIntegrationController (Repository)

```typescript
class JiraIntegrationController {
  private model: ModelStatic<Model<any, any>>;

  // CREATE
  async create(data: CreateJiraIntegrationDto): Promise<SafeJiraIntegration>
  
  // READ
  async findById(id: string, includeTokens: boolean = false)
  async findByTenantId(tenantId: string, includeTokens: boolean = false)
  async findAll(filters: JiraIntegrationFilters = {})
  
  // UPDATE
  async update(tenantId: string, data: UpdateJiraIntegrationDto)
  async updateVerificationStatus(tenantId: string, status: JiraVerificationStatus)
  
  // DELETE
  async softDelete(tenantId: string): Promise<boolean>
  async hardDelete(tenantId: string): Promise<boolean>
  
  // UTILITY
  async exists(tenantId: string): Promise<boolean>
  async count(filters: JiraIntegrationFilters = {}): Promise<number>
  private toSafeObject(data: any): SafeJiraIntegration
}
```

#### JiraConfigurationController (Repository)

```typescript
class JiraConfigurationController {
  private model: ModelStatic<Model<any, any>>;

  // CREATE
  async create(data: CreateJiraConfigurationDto): Promise<JiraConfiguration>
  
  // READ
  async findById(id: string): Promise<JiraConfiguration | null>
  async findByName(tenantId: string, configName: string)
  async findAll(filters: JiraConfigurationFilters = {})
  async findByTenantId(tenantId: string)
  
  // UPDATE
  async update(id: string, data: UpdateJiraConfigurationDto)
  
  // DELETE
  async softDelete(id: string): Promise<boolean>
  async hardDelete(id: string): Promise<boolean>
  
  // UTILITY
  async exists(id: string): Promise<boolean>
  async count(filters: JiraConfigurationFilters = {}): Promise<number>
  async resolvePlatformConfig(configId: string, platform: EpicPlatform)
}
```

#### JiraEpicService (Business Logic)

```typescript
class JiraEpicService {
  // Epic creation
  async createEpicsForRelease(
    releaseId: string,
    jiraConfigId: string,
    version: string,
    platforms: EpicPlatform[],
    description?: string
  ): Promise<ReleaseJiraEpic[]>
  
  // Jira API interaction
  async createEpicInJira(tenantId: string, epic: ReleaseJiraEpic)
  
  // Status checking
  async checkEpicReadyStatus(tenantId: string, epicId: string)
  
  // Queries
  async findEpicsByReleaseId(releaseId: string)
  async findEpicById(epicId: string)
}
```

---

## Request/Response Examples

### Example 1: Complete Integration Setup

```bash
# Step 1: Create Integration
curl -X POST http://localhost:3010/tenants/tenant_xyz/integrations/jira \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jiraInstanceUrl": "https://mycompany.atlassian.net",
    "apiToken": "YOUR_JIRA_API_TOKEN",
    "email": "admin@mycompany.com",
    "jiraType": "JIRA_CLOUD",
    "isEnabled": true
  }'

# Response:
{
  "success": true,
  "message": "JIRA integration created successfully",
  "integration": {
    "id": "jira_abc123xyz",
    "tenantId": "tenant_xyz",
    "jiraInstanceUrl": "https://mycompany.atlassian.net",
    "email": "admin@mycompany.com",
    "jiraType": "JIRA_CLOUD",
    "isEnabled": true,
    "verificationStatus": "NOT_VERIFIED",
    "lastVerifiedAt": null,
    "createdByAccountId": "user_123",
    "createdAt": "2025-11-20T10:00:00.000Z",
    "updatedAt": "2025-11-20T10:00:00.000Z",
    "hasValidToken": true
  }
}

# Step 2: Test Connection
curl -X POST http://localhost:3010/tenants/tenant_xyz/integrations/jira/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "success": true,
  "message": "JIRA integration is configured",
  "details": {
    "configured": true,
    "enabled": true,
    "jiraInstanceUrl": "https://mycompany.atlassian.net",
    "jiraType": "JIRA_CLOUD"
  }
}

# Step 3: Create Configuration
curl -X POST http://localhost:3010/tenants/tenant_xyz/jira/configurations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "configName": "Production Config",
    "description": "Configuration for production releases",
    "platformsConfig": {
      "WEB": {
        "projectKey": "FE",
        "readyToReleaseState": "Done"
      },
      "IOS": {
        "projectKey": "MOBILE",
        "readyToReleaseState": "Ready for Production"
      },
      "ANDROID": {
        "projectKey": "MOBILE",
        "readyToReleaseState": "Ready for Production"
      }
    }
  }'

# Response:
{
  "success": true,
  "message": "JIRA configuration created successfully",
  "configuration": {
    "id": "config_xyz789",
    "tenantId": "tenant_xyz",
    "configName": "Production Config",
    "description": "Configuration for production releases",
    "platformsConfig": {
      "WEB": {
        "projectKey": "FE",
        "readyToReleaseState": "Done"
      },
      "IOS": {
        "projectKey": "MOBILE",
        "readyToReleaseState": "Ready for Production"
      },
      "ANDROID": {
        "projectKey": "MOBILE",
        "readyToReleaseState": "Ready for Production"
      }
    },
    "isActive": true,
    "createdByAccountId": "user_123",
    "createdAt": "2025-11-20T10:05:00.000Z",
    "updatedAt": "2025-11-20T10:05:00.000Z"
  }
}
```

### Example 2: Create Release with Epics

```bash
# Create epics for a release
curl -X POST http://localhost:3010/tenants/tenant_xyz/releases/release_123/jira/epics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jiraConfigId": "config_xyz789",
    "platforms": ["WEB", "IOS", "ANDROID"],
    "version": "2.0.0",
    "description": "Major release with new features"
  }'

# Immediate Response:
{
  "success": true,
  "message": "Epic creation initiated",
  "epics": [
    {
      "id": "epic_web_001",
      "releaseId": "release_123",
      "platform": "WEB",
      "jiraConfigId": "config_xyz789",
      "epicTitle": "Release 2.0.0 - WEB",
      "epicDescription": "Major release with new features",
      "jiraEpicKey": null,
      "jiraEpicId": null,
      "jiraEpicUrl": null,
      "creationStatus": "PENDING",
      "creationError": null,
      "createdAt": "2025-11-20T10:10:00.000Z",
      "updatedAt": "2025-11-20T10:10:00.000Z",
      "jiraCreatedAt": null
    },
    {
      "id": "epic_ios_001",
      "releaseId": "release_123",
      "platform": "IOS",
      "jiraConfigId": "config_xyz789",
      "epicTitle": "Release 2.0.0 - IOS",
      "creationStatus": "PENDING"
      // ... similar structure
    },
    {
      "id": "epic_android_001",
      "releaseId": "release_123",
      "platform": "ANDROID",
      "jiraConfigId": "config_xyz789",
      "epicTitle": "Release 2.0.0 - ANDROID",
      "creationStatus": "PENDING"
      // ... similar structure
    }
  ]
}

# Check status later (after async creation completes)
curl -X GET http://localhost:3010/tenants/tenant_xyz/releases/release_123/jira/epics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response (after creation):
{
  "success": true,
  "epics": [
    {
      "id": "epic_web_001",
      "releaseId": "release_123",
      "platform": "WEB",
      "epicTitle": "Release 2.0.0 - WEB",
      "jiraEpicKey": "FE-123",
      "jiraEpicId": "10001",
      "jiraEpicUrl": "https://mycompany.atlassian.net/browse/FE-123",
      "creationStatus": "CREATED",
      "createdAt": "2025-11-20T10:10:00.000Z",
      "jiraCreatedAt": "2025-11-20T10:10:15.000Z"
    },
    {
      "id": "epic_ios_001",
      "platform": "IOS",
      "jiraEpicKey": "MOBILE-456",
      "jiraEpicUrl": "https://mycompany.atlassian.net/browse/MOBILE-456",
      "creationStatus": "CREATED"
    },
    {
      "id": "epic_android_001",
      "platform": "ANDROID",
      "jiraEpicKey": "MOBILE-457",
      "jiraEpicUrl": "https://mycompany.atlassian.net/browse/MOBILE-457",
      "creationStatus": "CREATED"
    }
  ]
}
```

### Example 3: Check Epic Status

```bash
# Check if epic is ready for release
curl -X GET http://localhost:3010/tenants/tenant_xyz/jira/epics/epic_web_001/check-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response (not ready):
{
  "success": true,
  "approved": false,
  "currentStatus": "In Progress",
  "requiredStatus": "Done",
  "epicKey": "FE-123",
  "message": "⏳ Epic FE-123 is NOT ready for release. Current status: \"In Progress\", required: \"Done\"."
}

# Response (ready):
{
  "success": true,
  "approved": true,
  "currentStatus": "Done",
  "requiredStatus": "Done",
  "epicKey": "FE-123",
  "message": "✅ Epic FE-123 is ready for release. Status: \"Done\" matches required state \"Done\"."
}
```

---

## Summary

### Key Concepts

1. **Three-Layer Architecture**
   - `jira_integrations` → Credentials (one per tenant)
   - `jira_configurations` → Settings (many per tenant, stores ALL platforms)
   - `release_jira_epics` → Epic tracking (many per release, created only for SELECTED platforms)

2. **Authentication & Authorization**
   - JWT-based authentication
   - Tenant-level permissions (Owner, Editor, Viewer)
   - Debug mode for testing

3. **Async Epic Creation**
   - Epics created in database immediately (PENDING)
   - Background job creates in Jira (CREATING → CREATED/FAILED)
   - Non-blocking for user

4. **Configuration Flexibility**
   - Multiple configurations per tenant
   - Platform-specific settings
   - Reusable across releases

5. **Status Tracking**
   - Epic creation status (PENDING/CREATING/CREATED/FAILED)
   - Verification status (NOT_VERIFIED/VALID/INVALID/EXPIRED)
   - Ready-to-release checks

### Important Files

- **Controllers:** `api/script/controllers/integrations/jira-controllers.ts`
- **Repository:** `api/script/storage/integrations/jira/jira-controller.ts`
- **Models:** `api/script/storage/integrations/jira/jira-integration-models.ts`
- **Service:** `api/script/storage/integrations/jira/jira-epic-service.ts`
- **Routes:** `api/script/routes/jira-integrations.ts`
- **Types:** `api/script/storage/integrations/jira/jira-types.ts`

### Database Tables

- `accounts` → Users
- `tenants` → Organizations
- `collaborators` → Permissions
- `jira_integrations` → Credentials
- `jira_configurations` → Settings
- `release_jira_epics` → Epic tracking

---

**This guide covers the complete Jira integration flow from database to API to user experience.**

