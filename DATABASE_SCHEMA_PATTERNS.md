# Database Schema Patterns Comparison

## Overview

Both Jira and Test Management integrations follow similar database patterns, with Test Management showing some refinements and best practices.

---

## Common Patterns (Both Use)

### ✅ Integration Pattern: One Integration Per Tenant

Both follow the pattern of **one integration per tenant**:

#### Jira Integration
```sql
CREATE TABLE IF NOT EXISTS jira_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) NOT NULL,
  
  -- Connection details
  jiraInstanceUrl VARCHAR(500) NOT NULL,
  apiToken TEXT NOT NULL,
  email VARCHAR(255) NULL,
  jiraType ENUM('JIRA_CLOUD', 'JIRA_SERVER', 'JIRA_DATA_CENTER'),
  
  -- Status
  isEnabled BOOLEAN NOT NULL DEFAULT TRUE,
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED'),
  lastVerifiedAt TIMESTAMP NULL,
  
  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- One integration per tenant
  UNIQUE KEY unique_tenant_jira (tenantId)
);
```

#### Test Management Integration (Similar Pattern)
```sql
CREATE TABLE IF NOT EXISTS project_test_management_integrations (
  id UUID PRIMARY KEY,
  projectId VARCHAR(255) NOT NULL,
  
  -- Provider details
  name VARCHAR(255) NOT NULL,
  providerType VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  
  -- Metadata
  createdByAccountId VARCHAR(255) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Unique per project and name
  UNIQUE KEY unique_project_name (projectId, name)
);
```

### ✅ SCM Integration Pattern (Identical)

Both repos have **identical SCM integration schemas**:

```sql
CREATE TABLE IF NOT EXISTS tenant_scm_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) NOT NULL,
  scmType ENUM('GITHUB', 'GITLAB', 'BITBUCKET'),
  displayName VARCHAR(255) NOT NULL,
  
  -- GitHub details
  owner VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  repositoryUrl VARCHAR(512) NOT NULL,
  defaultBranch VARCHAR(255) NOT NULL DEFAULT 'main',
  accessToken TEXT NOT NULL,
  
  -- Status
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  verificationStatus ENUM('PENDING', 'VALID', 'INVALID', 'EXPIRED'),
  
  -- One SCM per tenant
  UNIQUE KEY unique_tenant_scm (tenantId)
);
```

### ✅ Communication Integration Pattern

Test Management has **Slack integration** (delivr-server-ota-managed doesn't have this yet):

```sql
CREATE TABLE IF NOT EXISTS tenant_comm_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) NOT NULL,
  communicationType ENUM('SLACK') NOT NULL DEFAULT 'SLACK',
  
  -- Slack configuration
  slackBotToken TEXT NULL,
  slackBotUserId VARCHAR(255) NULL,
  slackWorkspaceId VARCHAR(255) NULL,
  slackWorkspaceName VARCHAR(255) NULL,
  slackChannels JSON NULL,
  
  -- Status
  verificationStatus ENUM('PENDING', 'VALID', 'INVALID'),
  
  -- One Slack per tenant
  UNIQUE KEY unique_tenant_comm (tenantId, communicationType)
);
```

---

## Key Schema Design Principles

### 1. Primary Keys

#### Jira Uses: VARCHAR with nanoid
```sql
id VARCHAR(255) PRIMARY KEY
-- Generated with: nanoid() - alphanumeric 21 chars
```

#### Test Management Uses: UUID (in some tables)
```sql
id UUID PRIMARY KEY
-- Generated with: UUID v4
```

**Recommendation:** Both are valid. nanoid is shorter and URL-friendly.

---

### 2. Tenant/Project References

#### Jira (Tenant-level)
```sql
tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL
```

#### Test Management (Project-level)
```sql
projectId VARCHAR(255) NOT NULL
```

**Pattern:**
- Use `CHAR(36)` for UUIDs (fixed length)
- Use `VARCHAR(255)` for other IDs
- Add proper charset/collation for consistency

---

### 3. Verification Status Pattern

Both use **ENUM for verification status**:

```sql
-- Jira Integration
verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED')

-- SCM Integration (both repos)
verificationStatus ENUM('PENDING', 'VALID', 'INVALID', 'EXPIRED')

-- Comm Integration (test management)
verificationStatus ENUM('PENDING', 'VALID', 'INVALID')
```

**Pattern:**
- ✅ Use ENUM for fixed state values
- ✅ Include timestamp: `lastVerifiedAt TIMESTAMP NULL`
- ✅ Add index: `INDEX idx_verification (verificationStatus)`

---

### 4. Soft Delete Pattern

#### Jira Uses: `isEnabled`
```sql
isEnabled BOOLEAN NOT NULL DEFAULT TRUE
```

#### Test Management Uses: `isActive` (in some tables)
```sql
isActive BOOLEAN NOT NULL DEFAULT TRUE
```

**Recommendation:**
- Both work, be consistent
- Add index for filtering: `INDEX idx_active (isActive)`

---

### 5. JSON Configuration Storage

Both use **JSON for flexible configuration**:

#### Jira Configurations
```sql
platformsConfig JSON NOT NULL 
COMMENT 'Platform-specific Jira project keys and ready states'

-- Structure:
{
  "WEB": {
    "projectKey": "FE",
    "readyToReleaseState": "Done"
  },
  "IOS": {
    "projectKey": "IOS",
    "readyToReleaseState": "Released"
  }
}
```

#### Test Management
```sql
config JSONB NOT NULL
COMMENT 'Provider configuration (baseUrl, authToken, etc.)'

-- Structure:
{
  "baseUrl": "https://checkmate.example.com",
  "authToken": "...",
  "orgId": 123
}
```

**Pattern:**
- ✅ Use JSON for provider-specific fields
- ✅ PostgreSQL: Use JSONB (binary, faster)
- ✅ MySQL: Use JSON
- ✅ Add comment explaining structure

---

### 6. Metadata Pattern

All tables follow **consistent metadata**:

```sql
-- Creator tracking
createdByAccountId VARCHAR(255) NOT NULL,

-- Timestamps
createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**Best Practice:**
- ✅ Track who created the record
- ✅ Auto-manage timestamps
- ✅ Use consistent naming (camelCase or snake_case)

---

### 7. Index Strategy

Both follow **smart indexing**:

```sql
-- Tenant/Project lookup (most common query)
INDEX idx_integration_tenant (tenantId)

-- Status filtering
INDEX idx_verification (verificationStatus)

-- Composite unique constraint
UNIQUE KEY unique_tenant_integration (tenantId)
```

**Pattern:**
- ✅ Index foreign keys
- ✅ Index frequently queried fields
- ✅ Use unique constraints for business rules
- ✅ Name indexes descriptively

---

### 8. Foreign Key Constraints

Both use **explicit foreign keys**:

```sql
FOREIGN KEY (tenantId) 
  REFERENCES tenants(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE

FOREIGN KEY (createdByAccountId)
  REFERENCES accounts(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE
```

**Pattern:**
- ✅ CASCADE for tenant deletion (cleanup)
- ✅ RESTRICT for account deletion (preserve audit trail)
- ✅ Always specify ON DELETE/UPDATE behavior

---

## Schema Evolution Patterns

### Jira: Separated Credentials from Configuration

```
jira_integrations (credentials)
  └─► One per tenant
  
jira_configurations (reusable configs)
  └─► Many per tenant
  └─► References platforms

release_jira_epics
  └─► References jira_configurations
  └─► NOT credentials directly
```

**Benefits:**
- ✅ Change configuration without touching credentials
- ✅ Multiple configs using same credentials
- ✅ Easier to manage and test

### Test Management: Direct Integration Model

```
project_test_management_integrations
  └─► Contains both credentials and config in JSON
  └─► Simpler, fewer joins
```

**Trade-offs:**
- ✅ Simpler schema
- ❌ Can't reuse credentials across configs
- ✅ Works well for single-use integrations

---

## Recommended Patterns for Future Integrations

### Pattern 1: Simple Integration (like Test Management)

**Use when:**
- One integration per tenant/project
- Config and credentials together
- No need to reuse credentials

```sql
CREATE TABLE IF NOT EXISTS integration_name (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) NOT NULL,
  
  -- Provider
  providerType ENUM('PROVIDER1', 'PROVIDER2') NOT NULL,
  
  -- Configuration (JSON)
  config JSON NOT NULL,
  
  -- Status
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  verificationStatus ENUM('PENDING', 'VALID', 'INVALID'),
  lastVerifiedAt TIMESTAMP NULL,
  
  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE KEY unique_tenant_provider (tenantId, providerType),
  INDEX idx_active (isActive),
  INDEX idx_verification (verificationStatus),
  
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);
```

### Pattern 2: Split Credentials/Configuration (like Jira)

**Use when:**
- Need to reuse credentials
- Multiple configurations per tenant
- Credentials change rarely, configs change often

```sql
-- Credentials table (one per tenant)
CREATE TABLE IF NOT EXISTS integration_credentials (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) NOT NULL,
  
  -- Credentials (encrypted)
  apiToken TEXT NOT NULL,
  
  -- Status
  isEnabled BOOLEAN NOT NULL DEFAULT TRUE,
  verificationStatus ENUM('NOT_VERIFIED', 'VALID', 'INVALID'),
  
  UNIQUE KEY unique_tenant (tenantId)
);

-- Configurations table (many per tenant)
CREATE TABLE IF NOT EXISTS integration_configurations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) NOT NULL,
  
  -- Config details
  configName VARCHAR(255) NOT NULL,
  config JSON NOT NULL,
  
  -- Status
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  
  UNIQUE KEY unique_tenant_name (tenantId, configName)
);
```

---

## Migration Best Practices (Both Repos Follow)

### 1. Idempotent Migrations

```sql
-- Check before creating
CREATE TABLE IF NOT EXISTS table_name (...);

-- Check before adding column
ALTER TABLE table_name 
ADD COLUMN IF NOT EXISTS column_name VARCHAR(255);
```

### 2. Backward Compatible

```sql
-- Add nullable columns first
ALTER TABLE table_name 
ADD COLUMN new_field VARCHAR(255) NULL;

-- Later, make required if needed
ALTER TABLE table_name 
MODIFY COLUMN new_field VARCHAR(255) NOT NULL;
```

### 3. Include Rollback

Both repos provide **rollback scripts**:
```
001_migration.sql
001_migration_rollback.sql
```

### 4. Document Changes

```sql
-- ============================================================================
-- What: Adds Jira epic management
-- Why: Separate credentials from configuration
-- Tables: jira_integrations, jira_configurations, release_jira_epics
-- ============================================================================
```

---

## Encryption Strategy (Both Need)

### Current State
```sql
apiToken TEXT NOT NULL COMMENT 'Encrypted Jira API token'
-- ⚠️ Comment says "encrypted" but encryption happens at application level
```

### Recommendations

1. **Application-Level Encryption** (Current approach)
```typescript
// Before storing
data.apiToken = await encrypt(data.apiToken, encryptionKey);

// Before using
const decrypted = await decrypt(storedToken, encryptionKey);
```

2. **Environment-Based Keys**
```bash
ENCRYPTION_KEY=your-secret-key
ENCRYPTION_ALGORITHM=aes-256-gcm
```

3. **Secrets Management**
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault

---

## Key Takeaways

### ✅ Good Patterns (Both Use)

1. **Unique Constraints** - Enforce one integration per tenant
2. **Verification Status** - Track connection health
3. **JSON for Flexibility** - Store provider-specific config
4. **Soft Deletes** - Preserve data with isActive/isEnabled
5. **Audit Trail** - createdByAccountId, timestamps
6. **Foreign Keys** - Maintain referential integrity
7. **Proper Indexing** - Fast queries

### 📋 Test Management Improvements Over Jira

1. **Simpler Schema** - Fewer tables, less complexity
2. **UUID Primary Keys** - Standard, widely supported
3. **JSONB** - Better performance (PostgreSQL)
4. **Consistent Naming** - snake_case throughout
5. **Better Documentation** - Clear migration comments

### 🎯 Recommendations for Jira

1. **Consider** - Current split pattern is good for reusability
2. **Keep** - The separation of credentials/config works well
3. **Improve** - Add better encryption at application level
4. **Add** - More comprehensive verification logic
5. **Document** - Schema usage examples in migration files

---

## Schema Comparison Matrix

| Feature | Jira | Test Mgmt | Recommendation |
|---------|------|-----------|----------------|
| **Primary Key** | VARCHAR(255) nanoid | UUID | Both valid, prefer nanoid |
| **Credentials Storage** | Separate table | In config JSON | Depends on reuse needs |
| **Configuration** | Separate table | In same table | Jira pattern better for complex cases |
| **Verification Status** | ENUM (4 states) | ENUM (3 states) | Include 'EXPIRED' state |
| **Soft Delete** | isEnabled | isActive | Be consistent |
| **JSON Storage** | JSON | JSONB | Use JSONB if PostgreSQL |
| **Indexes** | Good coverage | Good coverage | Both follow best practices |
| **Foreign Keys** | Explicit CASCADE | Explicit CASCADE | Both excellent |
| **Migration Style** | Idempotent | Idempotent | Both excellent |

---

## Conclusion

Both integrations follow **solid database design principles**. The main differences are:

1. **Jira** - More complex schema for greater flexibility (credentials separate from config)
2. **Test Management** - Simpler schema for easier management (all-in-one)

**Choose based on requirements:**
- **Split pattern (Jira)** - When credentials are reused across multiple configurations
- **Unified pattern (Test Mgmt)** - When integration is one-to-one with configuration

Both approaches are valid and follow best practices. The key is **consistency** and **clear documentation**.

