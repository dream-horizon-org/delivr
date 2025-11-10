# Release Management Setup - Database Schema Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TENANTS TABLE                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  id (PK)                                                              │  │
│  │  orgName                                                              │  │
│  │  ...                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ 1
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         │ N                     │ N                     │ N
         │                       │                       │
┌────────▼─────────┐   ┌─────────▼──────────┐   ┌──────▼───────────────────┐
│  TENANT_RELEASE  │   │ TENANT_INTEGRATIONS│   │     RELEASES             │
│    _SETTINGS     │   │                    │   │                          │
├──────────────────┤   ├────────────────────┤   ├──────────────────────────┤
│ id (PK)          │   │ id (PK)            │   │ id (PK)                  │
│ tenantId (FK)    │   │ tenantId (FK)      │   │ tenantId (FK)            │
│                  │   │ integrationType    │   │ version                  │
│ setupComplete    │   │ isEnabled          │   │ status                   │
│ setupCompletedAt │   │ isRequired         │   │ ...                      │
│                  │   │                    │   │                          │
│ STEP FLAGS:      │   │ config (JSON)      │   │                          │
│ ✓ githubConnected│   │ ├─ accessToken     │   │                          │
│ ✓ targetPlatforms│   │ ├─ organization    │   │                          │
│ ✓ platformCreds  │   │ ├─ repoName        │   │                          │
│ ✓ cicdConfigured │   │ └─ ...             │   │                          │
│ ✓ slackConfigured│   │                    │   │                          │
│                  │   │ verificationStatus │   │                          │
│ selectedTargets  │   │ lastVerifiedAt     │   │                          │
│ selectedPlatforms│   │                    │   │                          │
└──────────────────┘   └────────────────────┘   └──────────────────────────┘
         │                       │
         │                       │
         │ 1                     │ N
         │                       │
         │              ┌────────▼─────────┐
         │              │ Integration Types│
         │              ├──────────────────┤
         │              │ • GITHUB         │
         │              │ • GITLAB         │
         │              │ • BITBUCKET      │
         │              │ • JENKINS        │
         │              │ • GITHUB_ACTIONS │
         │              │ • SLACK          │
         │              │ • TEAMS          │
         │              │ • JIRA           │
         │              │ • LINEAR         │
         │              │ • APP_STORE      │
         │              │ • PLAY_STORE     │
         │              │ • CODE_SIGNING   │
         │              │ • FIREBASE       │
         │              │ • TEST_RAIL      │
         │              └──────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────────────┐
│                          ACCOUNTS TABLE                                    │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  id (PK)                                                            │  │
│  │  email                                                              │  │
│  │  ...                                                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
         │
         │ setupCompletedByAccountId (FK)
         │ configuredByAccountId (FK)
         └────────────────────────┐
                                  │
                                  ▼
                    Links to user who performed action
```

---

## Setup Flow State Machine

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         SETUP WIZARD FLOW                                 │
└──────────────────────────────────────────────────────────────────────────┘

[START] No setup record exists
   │
   ▼
┌─────────────────────────────────────┐
│  Step 1: GitHub Connection          │ ◄─── REQUIRED
│  • Connect to GitHub                │
│  • Verify access token              │
│  • Select organization/repo         │
│  → githubConnected = TRUE           │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Step 2: Target Platforms           │ ◄─── REQUIRED
│  • Select App Store / Play Store    │
│  • Save selected targets            │
│  → targetPlatformsConfigured = TRUE │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Step 3: Platform Credentials       │ ◄─── REQUIRED (if targets selected)
│  • App Store Connect API key        │
│  • Play Store Service Account       │
│  • Verify credentials               │
│  → platformCredentialsConfigured    │
│     = TRUE                          │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Step 4: CI/CD Setup (OPTIONAL)     │ ◄─── OPTIONAL
│  • GitHub Actions workflows         │
│  • Jenkins pipelines                │
│  → cicdConfigured = TRUE (if done)  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Step 5: Slack Integration          │ ◄─── OPTIONAL
│  • Bot token                        │
│  • Channel selection                │
│  → slackConfigured = TRUE (if done) │
└─────────────────┬───────────────────┘
                  │
                  ▼
          [SETUP COMPLETE]
    setupComplete = TRUE
    setupCompletedAt = NOW()
    setupCompletedByAccountId = currentUser.id
```

---

## Integration Verification States

```
┌────────────────────────────────────────────────────────────────┐
│             INTEGRATION VERIFICATION LIFECYCLE                  │
└────────────────────────────────────────────────────────────────┘

[NEW INTEGRATION CREATED]
         │
         ▼
   verificationStatus = 'NOT_VERIFIED'
   lastVerifiedAt = NULL
         │
         │ User clicks "Verify"
         │ POST /api/v1/setup/verify-{integration-type}
         ▼
   ┌─────────────────┐
   │  Test Connection│
   │  with API call  │
   └────────┬────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
[SUCCESS]        [FAILURE]
    │                │
    │                │
    ▼                ▼
verificationStatus  verificationStatus
= 'VALID'           = 'INVALID'
    │                │
    │                │
lastVerifiedAt      lastVerifiedAt
= NOW()             = NOW()
    │                │
    │                │
    ▼                ▼
Integration     User must fix
can be used     credentials
                    │
                    │ User updates & retries
                    └──────────┐
                               │
                               ▼
                        [Back to Test Connection]


┌────────────────────────────────────────────────────────┐
│  VERIFICATION STATUS TRANSITIONS                        │
├────────────────────────────────────────────────────────┤
│  NOT_VERIFIED → VALID      (successful verification)   │
│  NOT_VERIFIED → INVALID    (failed verification)       │
│  VALID → VALID             (re-verification success)   │
│  VALID → EXPIRED           (token/key expired)         │
│  INVALID → VALID           (fixed & re-verified)       │
│  EXPIRED → VALID           (renewed & re-verified)     │
└────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌──────────────┐
│   FRONTEND   │
│  (Setup UI)  │
└──────┬───────┘
       │
       │ POST /api/v1/:tenantId/release-management/setup
       │ {github, targets, credentials, cicd, slack}
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              BACKEND API LAYER                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  setup.controller.ts                               │  │
│  │  • Validate request                                │  │
│  │  • Check user permissions (owner only)             │  │
│  │  • Decrypt existing data if updating               │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                   │
│                       ▼                                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  setup.service.ts                                  │  │
│  │  • Process setup data                              │  │
│  │  • Encrypt sensitive credentials                   │  │
│  │  • Create/Update tenant_release_settings           │  │
│  │  • Create/Update tenant_integrations               │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                   │
│                       ▼                                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  DATABASE TRANSACTIONS                             │  │
│  │  BEGIN TRANSACTION;                                │  │
│  │    1. UPSERT tenant_release_settings               │  │
│  │    2. UPSERT tenant_integrations (GitHub)          │  │
│  │    3. UPSERT tenant_integrations (App Store)       │  │
│  │    4. UPSERT tenant_integrations (Play Store)      │  │
│  │    5. UPSERT tenant_integrations (CI/CD)           │  │
│  │    6. UPSERT tenant_integrations (Slack)           │  │
│  │  COMMIT;                                           │  │
│  └────────────────────┬───────────────────────────────┘  │
└───────────────────────┼───────────────────────────────────┘
                        │
                        ▼
                  ┌─────────────┐
                  │   DATABASE  │
                  │   (MySQL)   │
                  └─────────────┘
```

---

## Query Patterns

### Check if setup is complete
```sql
SELECT 
  setupComplete,
  githubConnected,
  targetPlatformsConfigured,
  platformCredentialsConfigured
FROM tenant_release_settings
WHERE tenantId = ?
LIMIT 1;
```

### Get all integrations for a tenant
```sql
SELECT 
  integrationType,
  isEnabled,
  isRequired,
  verificationStatus,
  lastVerifiedAt
FROM tenant_integrations
WHERE tenantId = ?
ORDER BY integrationType;
```

### Get specific integration with decrypted config
```sql
SELECT * 
FROM tenant_integrations
WHERE tenantId = ? 
  AND integrationType = 'GITHUB'
LIMIT 1;
-- Then decrypt config in application layer
```

### Check if tenant can create releases
```sql
SELECT 
  trs.setupComplete,
  COUNT(ti.id) as integrationCount,
  SUM(CASE WHEN ti.verificationStatus = 'VALID' THEN 1 ELSE 0 END) as validIntegrations
FROM tenant_release_settings trs
LEFT JOIN tenant_integrations ti ON trs.tenantId = ti.tenantId
WHERE trs.tenantId = ?
GROUP BY trs.setupComplete;
```

---

## Summary

### Two Tables Work Together:

1. **`tenant_release_settings`** (NEW)
   - One row per tenant
   - Tracks setup wizard completion
   - Stores step-by-step progress
   - Fast lookup for "is setup done?"

2. **`tenant_integrations`** (EXISTING)
   - Multiple rows per tenant (one per integration type)
   - Stores encrypted credentials
   - Tracks verification status
   - Flexible for adding new integration types

### Key Design Decisions:

✅ **Separation of Concerns**: Setup tracking separate from integration storage
✅ **Flexibility**: JSON config allows different integration types without schema changes
✅ **Security**: All credentials encrypted at rest
✅ **Auditability**: Track who configured what and when
✅ **Performance**: Indexed queries for fast lookups
✅ **Scalability**: One-to-many relationship allows unlimited integrations

