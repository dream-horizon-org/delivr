# Release Creation - Integration Dependencies

## 🎯 Key Insight

**Every release MUST reference the integrations it uses!**

When a user creates a release, they're essentially saying:
- "Use THIS GitHub repo"
- "Build for THESE targets (App Store/Play Store)"
- "Trigger THESE pipelines"
- "Send notifications to THESE Slack channels"
- "Create epics in THIS Jira project"

---

## 📊 Updated `releases` Table Schema

```sql
CREATE TABLE IF NOT EXISTS releases (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  
  -- Basic release info
  releaseKey VARCHAR(255) NOT NULL,
  version VARCHAR(255) NOT NULL,
  releaseType ENUM('PLANNED', 'HOTFIX', 'MAJOR') NOT NULL,
  status ENUM(
    'KICKOFF_PENDING',
    'PENDING',
    'STARTED',
    'REGRESSION_IN_PROGRESS',
    'BUILD_SUBMITTED',
    'RELEASED',
    'CANCELLED',
    'ARCHIVED'
  ) NOT NULL DEFAULT 'KICKOFF_PENDING',
  
  -- ⭐ INTEGRATION REFERENCES (Foreign Keys)
  scmIntegrationId VARCHAR(255) NOT NULL,              -- Which GitHub/GitLab to use
  
  -- Branch information (from the SCM)
  baseVersion VARCHAR(255) NULL,
  baseBranch VARCHAR(255) NOT NULL,                    -- e.g., 'main'
  branchRelease VARCHAR(255) NOT NULL,                 -- e.g., 'release/1.5.0'
  branchCodepush VARCHAR(255) NULL,                    -- e.g., 'codepush/1.5.0'
  
  -- Target integrations (multiple allowed via junction table - see below)
  -- Primary target for quick access
  primaryTargetId VARCHAR(255) NULL,
  
  -- Communication integration (optional)
  communicationIntegrationId VARCHAR(255) NULL,        -- Which Slack to notify
  
  -- Ticket management integration (optional)
  ticketIntegrationId VARCHAR(255) NULL,               -- Which Jira to use
  
  -- Epic IDs (created in the ticket system)
  iOSEpicId VARCHAR(255) NULL,
  androidEpicId VARCHAR(255) NULL,
  webEpicId VARCHAR(255) NULL,
  
  -- Other release fields...
  description TEXT NULL,
  plannedDate DATETIME NULL,
  targetReleaseDate DATETIME NULL,
  releaseDate DATETIME NULL,
  isDelayed BOOLEAN DEFAULT FALSE,
  delayedReason TEXT NULL,
  
  -- Release pilot
  releasePilotId VARCHAR(255) NULL,
  
  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_tenant_release_key (tenantId, releaseKey),
  INDEX idx_release_tenant (tenantId, status),
  INDEX idx_release_version (tenantId, version),
  INDEX idx_release_scm (scmIntegrationId),
  INDEX idx_release_communication (communicationIntegrationId),
  INDEX idx_release_ticket (ticketIntegrationId),
  
  -- ⭐ FOREIGN KEY CONSTRAINTS
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (scmIntegrationId) REFERENCES tenant_scm_integrations(id) ON DELETE RESTRICT,
  FOREIGN KEY (communicationIntegrationId) REFERENCES tenant_communication_integrations(id) ON DELETE SET NULL,
  FOREIGN KEY (ticketIntegrationId) REFERENCES tenant_ticket_integrations(id) ON DELETE SET NULL,
  FOREIGN KEY (releasePilotId) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (createdByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

**Key Points:**
- **SCM is REQUIRED** (`ON DELETE RESTRICT`) - can't delete GitHub if release uses it!
- **Communication is OPTIONAL** (`ON DELETE SET NULL`) - can still release if Slack disconnected
- **Tickets are OPTIONAL** (`ON DELETE SET NULL`) - can release without Jira

---

## 🔗 Junction Tables for Many-to-Many Relationships

### Release can have MULTIPLE Targets (App Store + Play Store)

```sql
CREATE TABLE IF NOT EXISTS release_targets (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL,
  targetIntegrationId VARCHAR(255) NOT NULL,
  
  -- Target-specific release info
  buildNumber VARCHAR(255) NULL,                       -- Final build number for this target
  submittedAt DATETIME NULL,
  approvedAt DATETIME NULL,
  
  -- Status for this specific target
  targetStatus ENUM('PENDING', 'BUILDING', 'SUBMITTED', 'APPROVED', 'RELEASED') DEFAULT 'PENDING',
  
  -- Metadata
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_release_target (releaseId, targetIntegrationId),
  INDEX idx_target_release (targetIntegrationId),
  
  -- Foreign Keys
  FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  FOREIGN KEY (targetIntegrationId) REFERENCES tenant_target_integrations(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

**Example:**
```
Release v1.5.0:
  - Target 1: App Store (iOS)    → Status: SUBMITTED
  - Target 2: Play Store (Android) → Status: RELEASED
```

---

### Release can trigger MULTIPLE Pipelines

```sql
CREATE TABLE IF NOT EXISTS release_pipelines (
  id VARCHAR(255) PRIMARY KEY,
  releaseId VARCHAR(255) NOT NULL,
  pipelineIntegrationId VARCHAR(255) NOT NULL,
  
  -- Pipeline execution tracking
  triggered BOOLEAN DEFAULT FALSE,
  triggeredAt DATETIME NULL,
  buildUrl VARCHAR(512) NULL,                          -- Jenkins/GitHub Actions build URL
  buildStatus ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
  buildNumber VARCHAR(255) NULL,
  
  -- Build artifacts
  artifactUrl VARCHAR(512) NULL,
  buildLogUrl VARCHAR(512) NULL,
  
  -- Metadata
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_release_pipeline (releaseId, pipelineIntegrationId),
  INDEX idx_pipeline_release (pipelineIntegrationId),
  INDEX idx_build_status (buildStatus),
  
  -- Foreign Keys
  FOREIGN KEY (releaseId) REFERENCES releases(id) ON DELETE CASCADE,
  FOREIGN KEY (pipelineIntegrationId) REFERENCES tenant_pipeline_integrations(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

**Example:**
```
Release v1.5.0:
  - Pipeline 1: Jenkins iOS Production → Status: SUCCESS, Build #245
  - Pipeline 2: Jenkins Android Staging → Status: SUCCESS, Build #189
  - Pipeline 3: GitHub Actions Web Build → Status: RUNNING
```

---

## 🔄 Complete Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            TENANTS                                   │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ 1
                 │
    ┌────────────┼────────────────────────┐
    │            │                        │
    │ N          │ N                      │ N
    │            │                        │
┌───▼──────┐  ┌─▼────────┐  ┌───────────▼──────┐  ┌──────────────┐
│   SCM    │  │ TARGETS  │  │ COMMUNICATION    │  │   TICKETS    │
│ GitHub   │  │ App Store│  │ Slack            │  │ Jira         │
│ GitLab   │  │ PlayStore│  │ Email            │  │ Linear       │
└────┬─────┘  └────┬─────┘  └────────┬─────────┘  └──────┬───────┘
     │             │                 │                    │
     │ FK          │ FK              │ FK                 │ FK
     │             │                 │                    │
     │    ┌────────┼─────────────────┼────────────────────┘
     │    │        │                 │
     │    │        │                 │
┌────▼────▼────────▼─────────────────▼──────────────────────────┐
│                       RELEASES                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ id                                                        │ │
│  │ tenantId                                                  │ │
│  │ version: "1.5.0"                                         │ │
│  │ status: REGRESSION_IN_PROGRESS                           │ │
│  │                                                           │ │
│  │ scmIntegrationId → SCM (REQUIRED FK)                     │ │
│  │ communicationIntegrationId → Communication (OPTIONAL)     │ │
│  │ ticketIntegrationId → Tickets (OPTIONAL)                 │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────┬───────────────────────┬────────────────────────────────┘
         │                       │
         │ 1                     │ 1
         │                       │
         │ N                     │ N
         │                       │
┌────────▼───────────┐   ┌───────▼────────────┐
│  RELEASE_TARGETS   │   │ RELEASE_PIPELINES  │
│  (Junction Table)  │   │  (Junction Table)  │
├────────────────────┤   ├────────────────────┤
│ releaseId (FK)     │   │ releaseId (FK)     │
│ targetIntegrationId│   │ pipelineId (FK)    │
│ buildNumber        │   │ buildStatus        │
│ targetStatus       │   │ buildUrl           │
└────────────────────┘   └────────────────────┘
         │                       │
         │ N                     │ N
         │                       │
         ▼                       ▼
┌────────────────┐       ┌──────────────────┐
│    TARGETS     │       │    PIPELINES     │
│  (from above)  │       │  Jenkins         │
└────────────────┘       │  GitHub Actions  │
                         └──────────────────┘
```

---

## 📝 Release Creation Flow

### Step 1: User Fills Create Release Form

```typescript
{
  version: "1.5.0",
  releaseType: "PLANNED",
  
  // SELECT SCM (Required)
  scmIntegrationId: "scm_github_001",      // ← FK to tenant_scm_integrations
  baseBranch: "main",
  
  // SELECT TARGETS (Required - at least one)
  targets: [
    "target_appstore_001",                 // ← FK to tenant_target_integrations
    "target_playstore_001"                 // ← FK to tenant_target_integrations
  ],
  
  // SELECT PIPELINES (Optional)
  pipelines: [
    "pipeline_jenkins_ios_001",            // ← FK to tenant_pipeline_integrations
    "pipeline_jenkins_android_001"         // ← FK to tenant_pipeline_integrations
  ],
  
  // SELECT COMMUNICATION (Optional)
  communicationIntegrationId: "comm_slack_001",  // ← FK to tenant_communication_integrations
  
  // SELECT TICKET SYSTEM (Optional)
  ticketIntegrationId: "ticket_jira_001",        // ← FK to tenant_ticket_integrations
  
  description: "New features release",
  plannedDate: "2025-01-15"
}
```

---

### Step 2: Backend Validates ALL Foreign Keys

```typescript
async function createRelease(data: CreateReleaseDto) {
  // 1. Validate SCM exists and is active
  const scm = await TenantSCMIntegrations.findOne({
    where: { 
      id: data.scmIntegrationId,
      tenantId: data.tenantId,
      isActive: true,
      verificationStatus: 'VALID'  // ⭐ Must be verified!
    }
  });
  if (!scm) throw new Error('SCM integration not found or not verified');
  
  // 2. Validate all targets exist and are verified
  for (const targetId of data.targets) {
    const target = await TenantTargetIntegrations.findOne({
      where: {
        id: targetId,
        tenantId: data.tenantId,
        isActive: true,
        verificationStatus: 'VALID'  // ⭐ Must be verified!
      }
    });
    if (!target) throw new Error(`Target ${targetId} not found or not verified`);
  }
  
  // 3. Validate pipelines (optional but if provided, must be valid)
  if (data.pipelines) {
    for (const pipelineId of data.pipelines) {
      const pipeline = await TenantPipelineIntegrations.findOne({
        where: {
          id: pipelineId,
          tenantId: data.tenantId,
          isActive: true
        },
        include: [
          { model: TenantSCMIntegrations, as: 'scm' },
          { model: TenantTargetIntegrations, as: 'target' }
        ]
      });
      if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);
      
      // ⭐ Validate pipeline's SCM matches release's SCM
      if (pipeline.scmIntegrationId !== data.scmIntegrationId) {
        throw new Error(`Pipeline ${pipelineId} uses different SCM`);
      }
      
      // ⭐ Validate pipeline's target is in selected targets
      if (!data.targets.includes(pipeline.targetIntegrationId)) {
        throw new Error(`Pipeline ${pipelineId} target not selected`);
      }
    }
  }
  
  // 4. Create release with transaction
  const transaction = await sequelize.transaction();
  try {
    // Create release
    const release = await Releases.create({
      ...data,
      status: 'KICKOFF_PENDING'
    }, { transaction });
    
    // Create release_targets (junction records)
    for (const targetId of data.targets) {
      await ReleaseTargets.create({
        releaseId: release.id,
        targetIntegrationId: targetId,
        targetStatus: 'PENDING'
      }, { transaction });
    }
    
    // Create release_pipelines (junction records)
    if (data.pipelines) {
      for (const pipelineId of data.pipelines) {
        await ReleasePipelines.create({
          releaseId: release.id,
          pipelineIntegrationId: pipelineId,
          buildStatus: 'PENDING'
        }, { transaction });
      }
    }
    
    await transaction.commit();
    return release;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

### Step 3: When Triggering Build

```typescript
async function triggerBuild(releaseId: string, pipelineId: string) {
  // 1. Get release with all its integrations
  const release = await Releases.findByPk(releaseId, {
    include: [
      { model: TenantSCMIntegrations, as: 'scm' },
      { model: TenantCommunicationIntegrations, as: 'communication' }
    ]
  });
  
  // 2. Get pipeline with its dependencies
  const releasePipeline = await ReleasePipelines.findOne({
    where: { releaseId, pipelineIntegrationId: pipelineId },
    include: [{
      model: TenantPipelineIntegrations,
      as: 'pipeline',
      include: [
        { model: TenantSCMIntegrations, as: 'scm' },
        { model: TenantTargetIntegrations, as: 'target' }
      ]
    }]
  });
  
  // 3. Use SCM credentials to checkout code
  const scmToken = decrypt(release.scm.accessToken);
  await gitCheckout(release.scm.repositoryUrl, release.branchRelease, scmToken);
  
  // 4. Use pipeline credentials to trigger build
  if (releasePipeline.pipeline.pipelineType === 'JENKINS') {
    const jenkinsToken = decrypt(releasePipeline.pipeline.jenkinsApiToken);
    const buildUrl = await jenkinsService.triggerBuild(
      releasePipeline.pipeline.jenkinsUrl,
      releasePipeline.pipeline.jenkinsJobPath,
      jenkinsToken,
      {
        RELEASE_VERSION: release.version,
        BRANCH: release.branchRelease
      }
    );
    
    // Update build status
    await releasePipeline.update({
      triggered: true,
      triggeredAt: new Date(),
      buildUrl: buildUrl,
      buildStatus: 'RUNNING'
    });
  }
  
  // 5. Send notification via Slack
  if (release.communicationIntegrationId) {
    const slackToken = decrypt(release.communication.slackBotToken);
    await slackService.sendMessage(
      slackToken,
      release.communication.slackChannels,
      `🚀 Build triggered for ${release.version} on ${releasePipeline.pipeline.target.targetType}`
    );
  }
}
```

---

## ✅ Why Separate Tables Win for Release Creation

### 1. **Dropdown Population**
```typescript
// Frontend: Load available integrations for dropdowns
const scmOptions = await fetch('/api/v1/:tenantId/integrations/scm?verified=true');
const targetOptions = await fetch('/api/v1/:tenantId/integrations/targets?verified=true');
const pipelineOptions = await fetch('/api/v1/:tenantId/integrations/pipelines?active=true');
```

### 2. **Validation**
```sql
-- Database automatically validates FKs
-- Can't reference non-existent integrations
-- Can't delete integration if release uses it
```

### 3. **Querying**
```sql
-- Get release with all its integrations
SELECT 
  r.*,
  s.organization as scm_org,
  s.repositoryUrl as repo_url,
  GROUP_CONCAT(DISTINCT t.targetType) as targets,
  GROUP_CONCAT(DISTINCT p.pipelineType) as pipelines
FROM releases r
JOIN tenant_scm_integrations s ON r.scmIntegrationId = s.id
JOIN release_targets rt ON r.id = rt.releaseId
JOIN tenant_target_integrations t ON rt.targetIntegrationId = t.id
LEFT JOIN release_pipelines rp ON r.id = rp.releaseId
LEFT JOIN tenant_pipeline_integrations p ON rp.pipelineIntegrationId = p.id
WHERE r.id = ?
GROUP BY r.id;
```

### 4. **Data Integrity**
```
❌ Can't create release with invalid SCM
❌ Can't delete GitHub if release uses it
❌ Can't delete pipeline if release references it
✅ Cascade delete: Delete release → delete junction records
```

---

## 🎯 Final Schema Summary

### Integration Tables (5)
1. `tenant_scm_integrations` (GitHub, GitLab, Bitbucket)
2. `tenant_target_integrations` (App Store, Play Store)
3. `tenant_pipeline_integrations` (Jenkins, GitHub Actions) → **References SCM + Target**
4. `tenant_communication_integrations` (Slack, Email)
5. `tenant_ticket_integrations` (Jira, Linear)

### Release Tables (3)
1. `releases` → **References SCM, Communication, Tickets**
2. `release_targets` (junction) → **References Releases + Targets**
3. `release_pipelines` (junction) → **References Releases + Pipelines**

### Total: 8 Tables
- 5 for integrations
- 1 for releases
- 2 junction tables (many-to-many)

---

## 🚀 Benefits Recap

✅ **Type Safety** - Each integration has proper columns
✅ **Validation** - FKs prevent invalid references
✅ **Relationships** - Explicit, enforced by database
✅ **Queries** - Clean JOINs instead of JSON parsing
✅ **Data Integrity** - Can't delete used integrations
✅ **Maintainability** - Clear domain model
✅ **Performance** - Indexed foreign keys

**This design makes release creation type-safe and fully validated!**

