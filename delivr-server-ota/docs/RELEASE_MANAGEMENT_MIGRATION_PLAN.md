# 🚀 Release Management Migration Plan

## Overview

Migrate Release Management from OG Delivr (Prisma + MySQL) to New Delivr (Sequelize + MySQL) with tenant-centric architecture.

---

## 📋 Tables to Migrate

### Core Tables (11 tables)

| # | Table | Purpose | Records in OG | Tenant Link |
|---|-------|---------|---------------|-------------|
| 1 | **Release** | Core release information | Many | ✅ Add tenantId |
| 2 | **ReleaseTasks** | Kick-off, pre-release, regression tasks | Many | Via Release |
| 3 | **ReleaseBuilds** | Final builds container | Many | Via Release |
| 4 | **Build** | Individual builds | Many | Via Release |
| 5 | **PreReleaseTasks** | Pre-release tasks container | Many | Via Release |
| 6 | **RegressionCycle** | Regression cycles | Many | Via Release |
| 7 | **Rollout** | Release rollout tracking | Many | Via Release |
| 8 | **RolloutStats** | Rollout statistics | Many | Via Rollout |
| 9 | **RolloutUserAdoption** | User adoption metrics | Many | Via Rollout |
| 10 | **CherryPicks** | Cherry-pick requests | Many | Via Release |
| 11 | **StateHistory** | Audit trail | Many | Via Release |

### Automation Tables (2 tables)

| # | Table | Purpose | Records in OG | Tenant Link |
|---|-------|---------|---------------|-------------|
| 12 | **cronJob** | Autopilot automation | Few | Via Release |
| 13 | **cronChangeLogs** | Cron job change history | Few | Via Release |

### Reference Tables (2 tables)

| # | Table | Purpose | Records in OG | Tenant Link |
|---|-------|---------|---------------|-------------|
| 14 | **Platform** | iOS, Android | 2 | Shared |
| 15 | **Target** | Web, PlayStore, AppStore | 3 | Shared |

### Settings Tables (2 tables)

| # | Table | Purpose | Records in OG | Tenant Link |
|---|-------|---------|---------------|-------------|
| 16 | **Settings** | Global release settings | 1 | Global |
| 17 | **globalSettings** | Global configuration | Few | Global |

### Feature Tables (1 table)

| # | Table | Purpose | Records in OG | Tenant Link |
|---|-------|---------|---------------|-------------|
| 18 | **whatsNew** | Release notes/announcements | Many | Via Release |

**Total: 18 tables**

---

## 🏗️ Architecture Design

### Directory Structure

```
delivr-server-ota-managed/
└── api/
    └── script/
        ├── storage/
        │   ├── aws-storage.ts (main - extend with release methods)
        │   ├── storage.ts (interface - extend with release interfaces)
        │   └── release/
        │       ├── release-models.ts (Sequelize models for Release tables)
        │       └── release-storage.ts (Release-specific storage methods)
        │
        ├── routes/
        │   └── release-management.ts (Release API routes)
        │
        ├── controllers/
        │   └── release/
        │       ├── release.controller.ts
        │       ├── release-tasks.controller.ts
        │       ├── builds.controller.ts
        │       ├── cherry-picks.controller.ts
        │       ├── rollout.controller.ts
        │       └── autopilot.controller.ts
        │
        └── middleware/
            └── release-permissions.ts (Release-specific permissions)
```

---

## 🔧 Key Modifications

### 1. Schema Changes

#### Add `tenantId` to Core Tables

```sql
-- Add tenantId to Release table
ALTER TABLE releases ADD COLUMN tenantId CHAR(36) NOT NULL;
ALTER TABLE releases ADD FOREIGN KEY (tenantId) REFERENCES tenants(id);
ALTER TABLE releases ADD INDEX idx_tenant_id (tenantId);

-- All other tables link via releaseId, so they inherit tenant context
```

#### User Mapping

OG Delivr uses `userId` → Map to New Delivr's `accountId`

```sql
-- Rename userId columns to accountId for consistency
ALTER TABLE releases CHANGE COLUMN userId accountId VARCHAR(255);
ALTER TABLE releases CHANGE COLUMN releasePilotId releasePilotAccountId VARCHAR(255);
ALTER TABLE releases CHANGE COLUMN lastUpdateById lastUpdateByAccountId VARCHAR(255);
```

---

## 📦 Environment Variables to Support

### From OG Delivr `.env`

```bash
# Database (already supported)
DATABASE_URL=mysql://...

# Slack Integration
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_ID=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_RELEASE_CHANNEL_ID=...

# GitHub Integration
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=dream11
GITHUB_REPO=...
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_INSTALLATION_ID=...

# Jenkins Integration
JENKINS_URL=https://...
JENKINS_USER=...
JENKINS_TOKEN=...
JENKINS_JOBS_CONFIG=... (JSON config)

# AWS S3 (for build artifacts)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_BUILDS=...

# Jira Integration (optional)
JIRA_HOST=https://...
JIRA_USER=...
JIRA_API_TOKEN=...

# Google Auth (already supported)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Release Automation
AUTOPILOT_ENABLED=true
REGRESSION_SCHEDULE=09:00,17:00
RELEASE_OFFSET_DAYS=7

# Feature Flags
ENABLE_CHERRY_PICKS=true
ENABLE_AUTOPILOT=true
ENABLE_SLACK_NOTIFICATIONS=true
```

---

## 📝 Implementation Phases

### Phase 1: Database Setup ✅ NEXT
- [ ] Create Sequelize models for Release tables
- [ ] Write migration script (002_release_management.sql)
- [ ] Add seed data (empty tables with reference data)
- [ ] Test migration on empty database

### Phase 2: Storage Layer
- [ ] Extend `Storage` interface with Release methods
- [ ] Implement Release storage methods in `aws-storage.ts`
- [ ] Add stub implementations in `json-storage.ts` and `azure-storage.ts`
- [ ] Write unit tests for storage layer

### Phase 3: Controllers
- [ ] Create Release controller (CRUD operations)
- [ ] Create Release Tasks controller
- [ ] Create Builds controller
- [ ] Create Cherry Picks controller
- [ ] Create Rollout controller
- [ ] Create Autopilot controller

### Phase 4: API Routes
- [ ] Define Release Management routes
- [ ] Add tenant permission checks
- [ ] Implement rate limiting
- [ ] Add input validation

### Phase 5: Integrations
- [ ] Slack service (notifications, commands)
- [ ] GitHub service (branch management, PRs)
- [ ] Jenkins service (build triggers)
- [ ] Jira service (epic/story tracking)

### Phase 6: Frontend Migration
- [ ] Create Release module in `delivr-web-panel-managed`
- [ ] Migrate Release List page
- [ ] Migrate Release Details page
- [ ] Migrate Create Release form
- [ ] Migrate Release Status components

### Phase 7: Testing & Documentation
- [ ] Integration tests
- [ ] API documentation
- [ ] User guide
- [ ] Migration guide for existing data

---

## 🔑 Key Design Decisions

### 1. Tenant Association
- Every release MUST belong to a tenant
- Users can only see releases from tenants they're members of
- Release pilot must be a member of the release's tenant

### 2. Permission Model
```typescript
// Release-specific permissions
Owner -> Create, Edit, Delete, Assign Pilot
Editor -> Create, Edit, Cherry-pick
Viewer -> Read-only
Release Pilot -> Edit status, Approve builds, Manage tasks
```

### 3. Data Migration Strategy
- Start with EMPTY tables (no data migration initially)
- Focus on new releases going forward
- (Optional) Later: migrate historical data with tenant assignment

### 4. Backward Compatibility
- Keep OG Delivr running during migration
- Run both systems in parallel initially
- Gradual cutover per tenant

---

## 📊 Database Schema Enhancements

### New Fields

```typescript
// Release table additions
tenantId: string (required) - Links release to organization
createdByAccountId: string - Who created the release
releasePilotAccountId: string - Current release pilot
lastUpdateByAccountId: string - Last person who updated

// Index additions
INDEX idx_tenant_releases (tenantId, createdAt DESC)
INDEX idx_pilot_releases (releasePilotAccountId, status)
INDEX idx_tenant_status (tenantId, status, plannedDate)
```

---

## 🚦 Success Criteria

### Phase 1 (Database)
- ✅ All 18 tables created in `codepushdb`
- ✅ Migration script runs without errors
- ✅ Reference data seeded (Platform, Target)
- ✅ Foreign keys and indexes created

### Phase 2 (Storage)
- ✅ Storage interface extended with Release methods
- ✅ CRUD operations work for all entities
- ✅ Tenant filtering works correctly
- ✅ Unit tests pass

### Phase 3 (API)
- ✅ All Release Management endpoints functional
- ✅ Authentication/authorization working
- ✅ Integration with Slack/GitHub/Jenkins working
- ✅ Rate limiting and error handling in place

### Phase 4 (Frontend)
- ✅ Can create releases from UI
- ✅ Can view release list by tenant
- ✅ Can track release progress
- ✅ Can manage builds and cherry-picks

---

## 📝 Notes

1. **Autopilot Feature**: Complex cron-based automation - migrate last
2. **Cherry Picks**: Requires GitHub integration - prioritize after core release CRUD
3. **Rollout Tracking**: Requires integration with app analytics - can be optional initially
4. **State History**: Important for audit trail - implement early

---

## 🎯 Next Steps

1. **Start with Phase 1**: Create database models and migration
2. **Review this plan** with the team
3. **Get approval** on architecture decisions
4. **Begin implementation** step-by-step

---

*Created: November 8, 2025*  
*Status: Planning Phase*  
*Target: Q1 2026*

