# Integration Categories - Database Design Analysis

## 📊 Integration Categories Breakdown

### 1. **SCM (Source Control Management)**
- GitHub
- GitLab
- Bitbucket

### 2. **Targets (Distribution Platforms)**
- App Store Connect
- Google Play Store

### 3. **Pipeline Providers (CI/CD)**
- Jenkins
- GitHub Actions
- GitLab CI
- **Note:** Pipelines USE SCM connections

### 4. **Communication**
- Slack
- Email
- Microsoft Teams

### 5. **Ticket Management**
- Jira
- Linear
- Azure DevOps

---

## 🤔 Design Options

### **Option A: Single `tenant_integrations` Table (Current)**

```sql
tenant_integrations
├── id
├── tenantId
├── integrationType (ENUM: ALL types mixed)
├── config (JSON - varies wildly)
└── verificationStatus
```

**Pros:**
- ✅ Simple, single table
- ✅ Easy to add new types
- ✅ Flexible JSON config
- ✅ One CRUD interface

**Cons:**
- ❌ No data segregation
- ❌ Can't enforce type-specific constraints
- ❌ Relationships between integrations are implicit
- ❌ Hard to query by category
- ❌ JSON structure varies too much

---

### **Option B: Separate Tables per Category (RECOMMENDED)**

```sql
tenant_scm_integrations       (GitHub, GitLab, Bitbucket)
tenant_target_integrations    (App Store, Play Store)
tenant_pipeline_integrations  (Jenkins, GitHub Actions) → References SCM
tenant_communication_integrations (Slack, Email, Teams)
tenant_ticket_integrations    (Jira, Linear)
```

**Pros:**
- ✅ Clear data segregation
- ✅ Type-specific columns (better validation)
- ✅ Explicit relationships (pipelines → SCM)
- ✅ Better query performance
- ✅ Domain-driven design
- ✅ Easier to understand

**Cons:**
- ❌ More tables (5 instead of 1)
- ❌ More complex initial setup
- ⚠️ Need generic interface for common operations

---

## 🎯 RECOMMENDATION: Option B with Shared Patterns

### Why Separate Tables?

1. **Different Data Requirements**
   - SCM needs: `repoUrl`, `organization`, `defaultBranch`
   - Targets need: `bundleId`, `apiKey`, `teamId`
   - Pipelines need: `jobUrl`, `scmId` (FK), `targetId` (FK)

2. **Explicit Relationships**
   - Pipelines MUST reference an SCM connection
   - Pipelines MUST reference a Target
   - This is a real FK constraint, not JSON reference

3. **Better Validation**
   - Each table has its own validation rules
   - Can't create a pipeline without SCM
   - Database-level constraints

4. **Clearer Domain Model**
   - Each category is a first-class entity
   - Easier to reason about
   - Better for new developers

---

## 📐 Proposed Schema Design

### Table 1: `tenant_scm_integrations`

```sql
CREATE TABLE IF NOT EXISTS tenant_scm_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- SCM Type
  scmType ENUM('GITHUB', 'GITLAB', 'BITBUCKET') NOT NULL,
  
  -- Common SCM fields
  displayName VARCHAR(255) NOT NULL, -- User-friendly name
  organization VARCHAR(255) NOT NULL,
  repositoryUrl VARCHAR(512) NOT NULL,
  defaultBranch VARCHAR(255) DEFAULT 'main',
  
  -- Authentication (encrypted)
  accessToken TEXT NOT NULL,           -- Encrypted
  refreshToken TEXT NULL,              -- Encrypted (if OAuth)
  
  -- Verification
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'NOT_VERIFIED',
  lastVerifiedAt DATETIME NULL,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  configuredByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_tenant_scm (tenantId, scmType, organization),
  INDEX idx_tenant_scm_active (tenantId, isActive),
  INDEX idx_scm_verification (verificationStatus),
  
  -- Foreign Keys
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (configuredByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

---

### Table 2: `tenant_target_integrations`

```sql
CREATE TABLE IF NOT EXISTS tenant_target_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- Target Type
  targetType ENUM('APP_STORE', 'PLAY_STORE') NOT NULL,
  
  -- Platform-specific fields
  displayName VARCHAR(255) NOT NULL,
  
  -- App Store Connect fields
  appleApiKeyId VARCHAR(255) NULL,          -- Encrypted
  appleIssuerId VARCHAR(255) NULL,          -- Encrypted
  applePrivateKey TEXT NULL,                -- Encrypted
  appleBundleId VARCHAR(255) NULL,
  appleTeamId VARCHAR(255) NULL,
  
  -- Play Store fields
  googleServiceAccountEmail VARCHAR(255) NULL,
  googlePrivateKey TEXT NULL,               -- Encrypted
  googlePackageName VARCHAR(255) NULL,
  
  -- Verification
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'NOT_VERIFIED',
  lastVerifiedAt DATETIME NULL,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  configuredByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_tenant_target (tenantId, targetType),
  INDEX idx_tenant_target_active (tenantId, isActive),
  
  -- Foreign Keys
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (configuredByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

---

### Table 3: `tenant_pipeline_integrations`

**Key Feature:** References SCM and Targets via Foreign Keys

```sql
CREATE TABLE IF NOT EXISTS tenant_pipeline_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- Pipeline Type
  pipelineType ENUM('JENKINS', 'GITHUB_ACTIONS', 'GITLAB_CI') NOT NULL,
  
  -- Basic Info
  displayName VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- Relationships (EXPLICIT FOREIGN KEYS)
  scmIntegrationId VARCHAR(255) NOT NULL,     -- MUST reference SCM
  targetIntegrationId VARCHAR(255) NOT NULL,  -- MUST reference Target
  
  -- Jenkins-specific
  jenkinsUrl VARCHAR(512) NULL,
  jenkinsUsername VARCHAR(255) NULL,
  jenkinsApiToken TEXT NULL,                  -- Encrypted
  jenkinsJobPath VARCHAR(512) NULL,           -- e.g., "folder/job-name"
  
  -- GitHub Actions-specific
  githubWorkflowPath VARCHAR(512) NULL,       -- e.g., ".github/workflows/build.yml"
  githubWorkflowRef VARCHAR(255) NULL,        -- Branch/tag to trigger
  
  -- GitLab CI-specific
  gitlabPipelineId VARCHAR(255) NULL,
  gitlabJobName VARCHAR(255) NULL,
  
  -- Common pipeline config
  triggerOnRelease BOOLEAN DEFAULT TRUE,
  buildTimeout INT DEFAULT 3600,              -- seconds
  environmentVariables JSON NULL,             -- Custom env vars for build
  
  -- Verification
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'NOT_VERIFIED',
  lastVerifiedAt DATETIME NULL,
  lastTriggeredAt DATETIME NULL,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  configuredByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_tenant_pipeline (tenantId, isActive),
  INDEX idx_pipeline_scm (scmIntegrationId),
  INDEX idx_pipeline_target (targetIntegrationId),
  
  -- Foreign Keys
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (scmIntegrationId) REFERENCES tenant_scm_integrations(id) ON DELETE RESTRICT,
  FOREIGN KEY (targetIntegrationId) REFERENCES tenant_target_integrations(id) ON DELETE RESTRICT,
  FOREIGN KEY (configuredByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

**Key Point:** `ON DELETE RESTRICT` means you can't delete SCM/Target if a pipeline is using it!

---

### Table 4: `tenant_communication_integrations`

```sql
CREATE TABLE IF NOT EXISTS tenant_communication_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- Communication Type
  communicationType ENUM('SLACK', 'EMAIL', 'TEAMS') NOT NULL,
  
  -- Common fields
  displayName VARCHAR(255) NOT NULL,
  
  -- Slack-specific
  slackBotToken TEXT NULL,                    -- Encrypted
  slackChannels JSON NULL,                    -- Array of channel names/IDs
  slackWebhookUrl VARCHAR(512) NULL,          -- Encrypted
  
  -- Email-specific
  emailRecipients JSON NULL,                  -- Array of email addresses
  emailFromAddress VARCHAR(255) NULL,
  
  -- Teams-specific
  teamsWebhookUrl VARCHAR(512) NULL,          -- Encrypted
  teamsChannelId VARCHAR(255) NULL,
  
  -- Notification preferences
  notifyOnEvents JSON NULL,                   -- ["release_started", "build_completed", etc.]
  
  -- Verification
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'NOT_VERIFIED',
  lastVerifiedAt DATETIME NULL,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  configuredByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_tenant_communication (tenantId, isActive),
  INDEX idx_communication_type (communicationType),
  
  -- Foreign Keys
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (configuredByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

---

### Table 5: `tenant_ticket_integrations`

```sql
CREATE TABLE IF NOT EXISTS tenant_ticket_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- Ticket System Type
  ticketSystemType ENUM('JIRA', 'LINEAR', 'AZURE_DEVOPS') NOT NULL,
  
  -- Common fields
  displayName VARCHAR(255) NOT NULL,
  
  -- Jira-specific
  jiraUrl VARCHAR(512) NULL,
  jiraEmail VARCHAR(255) NULL,
  jiraApiToken TEXT NULL,                     -- Encrypted
  jiraProjectKey VARCHAR(255) NULL,
  jiraDefaultIssueType VARCHAR(255) NULL,     -- e.g., "Epic", "Story"
  
  -- Linear-specific
  linearApiKey TEXT NULL,                     -- Encrypted
  linearTeamId VARCHAR(255) NULL,
  linearDefaultProjectId VARCHAR(255) NULL,
  
  -- Azure DevOps-specific
  azureOrganization VARCHAR(255) NULL,
  azureProject VARCHAR(255) NULL,
  azurePatToken TEXT NULL,                    -- Encrypted
  
  -- Common config
  autoCreateEpics BOOLEAN DEFAULT FALSE,
  epicTemplate JSON NULL,                     -- Template for auto-created epics
  
  -- Verification
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'NOT_VERIFIED',
  lastVerifiedAt DATETIME NULL,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  configuredByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_tenant_ticket (tenantId, isActive),
  INDEX idx_ticket_type (ticketSystemType),
  
  -- Foreign Keys
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (configuredByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

---

## 🔗 Relationships Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         TENANTS                              │
└────────────────┬─────────────────────────────┬──────────────┘
                 │                             │
    ┌────────────┴────────────┐    ┌───────────┴───────────┐
    │                         │    │                       │
    ▼                         ▼    ▼                       ▼
┌─────────────┐       ┌──────────────────┐    ┌─────────────────┐
│   SCM       │       │     TARGETS      │    │  COMMUNICATION  │
│ GitHub      │       │  App Store       │    │  Slack          │
│ GitLab      │       │  Play Store      │    │  Email          │
│ Bitbucket   │       │                  │    │  Teams          │
└─────┬───────┘       └────────┬─────────┘    └─────────────────┘
      │                        │
      │ FK                     │ FK
      │                        │
      └────────┬───────────────┘
               │
               ▼
      ┌────────────────┐               ┌─────────────────┐
      │   PIPELINES    │               │  TICKET MGMT    │
      │  Jenkins       │               │  Jira           │
      │  GitHub Actions│               │  Linear         │
      │  GitLab CI     │               │  Azure DevOps   │
      └────────────────┘               └─────────────────┘
```

**Key:** Pipelines have EXPLICIT FKs to SCM and Targets!

---

## 🎯 Benefits of This Approach

### 1. **Data Integrity**
```sql
-- Can't delete SCM if pipeline uses it
DELETE FROM tenant_scm_integrations WHERE id = 'scm_123';
-- ERROR: Foreign key constraint fails (pipeline references it)

-- Must delete pipelines first, then SCM
```

### 2. **Type-Safe Queries**
```sql
-- Get all pipelines with their SCM details
SELECT 
  p.*,
  s.organization,
  s.repositoryUrl,
  t.targetType
FROM tenant_pipeline_integrations p
JOIN tenant_scm_integrations s ON p.scmIntegrationId = s.id
JOIN tenant_target_integrations t ON p.targetIntegrationId = t.id
WHERE p.tenantId = ?;
```

### 3. **Validation at DB Level**
```sql
-- Can't create pipeline without valid SCM
INSERT INTO tenant_pipeline_integrations (
  scmIntegrationId  -- This MUST exist in tenant_scm_integrations
);
```

### 4. **Clearer API Design**
```typescript
// Separate endpoints per category
POST /api/v1/:tenantId/integrations/scm
POST /api/v1/:tenantId/integrations/targets
POST /api/v1/:tenantId/integrations/pipelines
POST /api/v1/:tenantId/integrations/communication
POST /api/v1/:tenantId/integrations/tickets

// Get pipelines with their dependencies
GET /api/v1/:tenantId/integrations/pipelines?include=scm,target
```

---

## 📁 Updated API Structure

```
api/script/release/integrations/
├── scm/
│   ├── scm.controller.ts
│   ├── scm.service.ts
│   ├── github.service.ts
│   ├── gitlab.service.ts
│   └── bitbucket.service.ts
│
├── targets/
│   ├── target.controller.ts
│   ├── target.service.ts
│   ├── appstore.service.ts
│   └── playstore.service.ts
│
├── pipelines/
│   ├── pipeline.controller.ts
│   ├── pipeline.service.ts
│   ├── jenkins.service.ts
│   └── github-actions.service.ts
│
├── communication/
│   ├── communication.controller.ts
│   ├── communication.service.ts
│   ├── slack.service.ts
│   └── email.service.ts
│
└── tickets/
    ├── ticket.controller.ts
    ├── ticket.service.ts
    ├── jira.service.ts
    └── linear.service.ts
```

---

## 🔄 Migration Path

### Option 1: Fresh Start (Recommended)
- Create 5 new tables
- Don't create `tenant_integrations` at all
- Cleaner, purpose-built schema

### Option 2: Evolution
- Keep existing `tenant_integrations` for backward compatibility
- Create 5 new category tables
- Migrate data gradually

**Recommendation:** Go with Option 1 (Fresh Start) since we haven't deployed yet!

---

## ✅ Final Recommendation

### **Use Separate Tables** for the following reasons:

1. ✅ **Clear Domain Model** - Each category is distinct
2. ✅ **Explicit Relationships** - Pipelines → SCM + Targets via FK
3. ✅ **Better Validation** - Type-specific constraints
4. ✅ **Data Integrity** - Can't delete dependencies
5. ✅ **Easier to Query** - Category-specific joins
6. ✅ **Scalability** - Add category-specific features easily
7. ✅ **Maintainability** - Easier for new developers to understand

### Trade-offs:
- ⚠️ More tables (5 vs 1)
- ⚠️ More migration files
- ⚠️ Need common interface pattern

But these are **worth it** for long-term maintainability!

---

## 📝 Next Steps

If you approve this design:
1. Create 5 migration files (one per category)
2. Create Sequelize models for each table
3. Implement category-specific services
4. Build common encryption/verification patterns
5. Create RESTful endpoints per category
6. Update frontend to work with categorized integrations

**Your decision?** Shall we proceed with the 5-table approach?

