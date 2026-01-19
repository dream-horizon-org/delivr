# Integration Implementation Checklist

Track your progress implementing all 5 integration types.

---

## 🎯 Implementation Order

Implement in this order (due to dependencies):

1. ✅ **SCM** (GitHub/GitLab/Bitbucket) - **START HERE** ← Reference implementation provided
2. ⬜ **Targets** (App Store/Play Store)
3. ⬜ **Pipelines** (Jenkins/GitHub Actions) - Depends on SCM + Targets
4. ⬜ **Communication** (Slack/Email)
5. ⬜ **Tickets** (Jira/Linear)

---

## 📋 Per-Integration Checklist

Use this checklist for EACH integration type:

### 1️⃣ SCM Integration (GitHub/GitLab/Bitbucket)

- [ ] **Migration**
  - [ ] Create `003_tenant_scm_integrations.sql`
  - [ ] Create `003_tenant_scm_integrations_rollback.sql`
  - [ ] Run migration on local MySQL
  - [ ] Verify table structure with `DESCRIBE`
  - [ ] Test rollback works

- [ ] **TypeScript Types**
  - [ ] Create `api/script/storage/integrations/scm/scm-types.ts`
  - [ ] Define enums (SCMType, VerificationStatus)
  - [ ] Define main interface (TenantSCMIntegration)
  - [ ] Define DTOs (Create, Update, Verification)
  - [ ] Define SafeSCMIntegration (without tokens)

- [ ] **Sequelize Model**
  - [ ] Create `api/script/storage/integrations/scm/scm-models.ts`
  - [ ] Define model class with all fields
  - [ ] Add indexes
  - [ ] Test model initialization

- [ ] **Database Controller**
  - [ ] Create `api/script/storage/integrations/scm/scm-controller.ts`
  - [ ] Implement `create()`
  - [ ] Implement `findById()`
  - [ ] Implement `findAll()`
  - [ ] Implement `findByRepository()`
  - [ ] Implement `update()`
  - [ ] Implement `updateVerificationStatus()`
  - [ ] Implement `softDelete()` and `hardDelete()`
  - [ ] Implement `toSafeObject()` helper

- [ ] **Express Routes**
  - [ ] Create `api/script/routes/integrations/scm-routes.ts`
  - [ ] Implement `GET /api/v1/integrations/scm` (list)
  - [ ] Implement `GET /api/v1/integrations/scm/:id` (single)
  - [ ] Implement `POST /api/v1/integrations/scm` (create)
  - [ ] Implement `PATCH /api/v1/integrations/scm/:id` (update)
  - [ ] Implement `DELETE /api/v1/integrations/scm/:id` (delete)
  - [ ] Implement `POST /api/v1/integrations/scm/:id/verify` (verify)

- [ ] **Integration**
  - [ ] Create `api/script/storage/integrations/scm/index.ts` (exports)
  - [ ] Update `api/script/storage/integrations/index.ts`
  - [ ] Create `api/script/routes/integrations/index.ts` (route aggregator)
  - [ ] Register routes in `api/script/index.ts`

- [ ] **Testing**
  - [ ] Test CREATE endpoint with cURL
  - [ ] Test LIST endpoint
  - [ ] Test GET single endpoint
  - [ ] Test UPDATE endpoint
  - [ ] Test DELETE endpoint
  - [ ] Test VERIFY endpoint
  - [ ] Test error cases (404, 409, 400)

---

### 2️⃣ Target Integration (App Store/Play Store)

- [ ] **Migration**
  - [ ] Create `004_tenant_target_integrations.sql`
  - [ ] Create rollback script
  - [ ] Run migration
  - [ ] Verify table

- [ ] **Implementation** (follow same pattern as SCM)
  - [ ] Types (`target-types.ts`)
  - [ ] Model (`target-models.ts`)
  - [ ] Controller (`target-controller.ts`)
  - [ ] Routes (`target-routes.ts`)
  - [ ] Exports (`index.ts`)
  - [ ] Register routes

- [ ] **Testing**
  - [ ] Test all CRUD endpoints
  - [ ] Test App Store specific fields
  - [ ] Test Play Store specific fields

---

### 3️⃣ Pipeline Integration (Jenkins/GitHub Actions)

⚠️ **Special**: Pipelines have FKs to SCM + Targets!

- [ ] **Migration**
  - [ ] Create `005_tenant_pipeline_integrations.sql`
  - [ ] Add FK to `tenant_scm_integrations`
  - [ ] Add FK to `tenant_target_integrations`
  - [ ] Create rollback script
  - [ ] Run migration
  - [ ] Verify table and relationships

- [ ] **Implementation**
  - [ ] Types (`pipeline-types.ts`)
    - [ ] Add `scmIntegrationId` FK
    - [ ] Add `targetIntegrationId` FK
  - [ ] Model (`pipeline-models.ts`)
  - [ ] Controller (`pipeline-controller.ts`)
    - [ ] Add validation: SCM + Target must exist and belong to same tenant
  - [ ] Routes (`pipeline-routes.ts`)
    - [ ] Add query filter by SCM
    - [ ] Add query filter by target
  - [ ] Exports and registration

- [ ] **Testing**
  - [ ] Test creating pipeline with valid SCM + Target
  - [ ] Test error when SCM doesn't exist
  - [ ] Test error when target doesn't exist
  - [ ] Test error when SCM/target belong to different tenant

---

### 4️⃣ Communication Integration (Slack/Email)

- [ ] **Migration**
  - [ ] Create `006_tenant_communication_integrations.sql`
  - [ ] Create rollback script
  - [ ] Run migration
  - [ ] Verify table

- [ ] **Implementation**
  - [ ] Types (`communication-types.ts`)
  - [ ] Model (`communication-models.ts`)
  - [ ] Controller (`communication-controller.ts`)
  - [ ] Routes (`communication-routes.ts`)
  - [ ] Exports and registration

- [ ] **Testing**
  - [ ] Test Slack bot token flow
  - [ ] Test channel selection
  - [ ] Test verification endpoint

---

### 5️⃣ Ticket Integration (Jira/Linear)

- [ ] **Migration**
  - [ ] Create `007_tenant_ticket_integrations.sql`
  - [ ] Create rollback script
  - [ ] Run migration
  - [ ] Verify table

- [ ] **Implementation**
  - [ ] Types (`ticket-types.ts`)
  - [ ] Model (`ticket-models.ts`)
  - [ ] Controller (`ticket-controller.ts`)
  - [ ] Routes (`ticket-routes.ts`)
  - [ ] Exports and registration

- [ ] **Testing**
  - [ ] Test Jira connection
  - [ ] Test project selection
  - [ ] Test epic creation fields

---

## 🔗 Relationship Testing

After implementing all 5 types:

- [ ] **Test Pipeline → SCM relationship**
  - [ ] Create pipeline referencing SCM
  - [ ] Try to delete SCM (should fail with FK error)
  - [ ] Verify cascade works correctly

- [ ] **Test Pipeline → Target relationship**
  - [ ] Create pipeline referencing target
  - [ ] Try to delete target (should fail with FK error)

- [ ] **Test Release → All Integrations**
  - [ ] Create release referencing SCM
  - [ ] Add targets via junction table
  - [ ] Add pipelines via junction table
  - [ ] Query release with all JOINs

---

## 📊 Progress Tracker

| Integration Type | Migration | Types | Model | Controller | Routes | Testing | Status |
|-----------------|-----------|-------|-------|------------|--------|---------|--------|
| SCM             | ⬜        | ⬜    | ⬜    | ⬜         | ⬜     | ⬜      | 🟡 In Progress |
| Targets         | ⬜        | ⬜    | ⬜    | ⬜         | ⬜     | ⬜      | ⬜ Not Started |
| Pipelines       | ⬜        | ⬜    | ⬜    | ⬜         | ⬜     | ⬜      | ⬜ Not Started |
| Communication   | ⬜        | ⬜    | ⬜    | ⬜         | ⬜     | ⬜      | ⬜ Not Started |
| Tickets         | ⬜        | ⬜    | ⬜    | ⬜         | ⬜     | ⬜      | ⬜ Not Started |

Legend: ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

## 🎯 Quick Start

1. **Read** `SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md`
2. **Start** with migration: Create `003_tenant_scm_integrations.sql`
3. **Run** migration on MySQL
4. **Create** types, model, controller, routes (in that order)
5. **Test** with cURL
6. **Repeat** for other 4 integration types

---

## 📁 Expected Folder Structure After All Implementations

```
api/script/
├── storage/
│   └── integrations/
│       ├── scm/
│       │   ├── scm-types.ts
│       │   ├── scm-models.ts
│       │   ├── scm-controller.ts
│       │   └── index.ts
│       ├── targets/
│       │   ├── target-types.ts
│       │   ├── target-models.ts
│       │   ├── target-controller.ts
│       │   └── index.ts
│       ├── pipelines/
│       │   ├── pipeline-types.ts
│       │   ├── pipeline-models.ts
│       │   ├── pipeline-controller.ts
│       │   └── index.ts
│       ├── communication/
│       │   ├── communication-types.ts
│       │   ├── communication-models.ts
│       │   ├── communication-controller.ts
│       │   └── index.ts
│       ├── tickets/
│       │   ├── ticket-types.ts
│       │   ├── ticket-models.ts
│       │   ├── ticket-controller.ts
│       │   └── index.ts
│       └── index.ts
│
├── routes/
│   └── integrations/
│       ├── scm-routes.ts
│       ├── target-routes.ts
│       ├── pipeline-routes.ts
│       ├── communication-routes.ts
│       ├── ticket-routes.ts
│       └── index.ts
│
└── services/
    └── integrations/
        ├── scm/
        │   ├── github-service.ts
        │   ├── gitlab-service.ts
        │   └── bitbucket-service.ts
        ├── targets/
        │   ├── appstore-service.ts
        │   └── playstore-service.ts
        ├── pipelines/
        │   ├── jenkins-service.ts
        │   └── github-actions-service.ts
        ├── communication/
        │   ├── slack-service.ts
        │   └── email-service.ts
        └── tickets/
            ├── jira-service.ts
            └── linear-service.ts

migrations/
├── 003_tenant_scm_integrations.sql
├── 003_tenant_scm_integrations_rollback.sql
├── 004_tenant_target_integrations.sql
├── 004_tenant_target_integrations_rollback.sql
├── 005_tenant_pipeline_integrations.sql
├── 005_tenant_pipeline_integrations_rollback.sql
├── 006_tenant_communication_integrations.sql
├── 006_tenant_communication_integrations_rollback.sql
├── 007_tenant_ticket_integrations.sql
└── 007_tenant_ticket_integrations_rollback.sql
```

---

## ✅ Definition of Done

For each integration type, you're done when:

1. ✅ Migration runs without errors
2. ✅ Rollback script works
3. ✅ All CRUD endpoints return 200/201/204
4. ✅ Safe objects don't expose tokens
5. ✅ Foreign key constraints work
6. ✅ Duplicate prevention works (unique constraints)
7. ✅ Error handling returns proper status codes
8. ✅ Code follows same pattern as reference implementation

---

## 🆘 Need Help?

Refer back to:
- `SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md` - Complete reference
- `INTEGRATION_CATEGORIES_ANALYSIS.md` - Why 5 tables?
- `RELEASES_INTEGRATION_RELATIONSHIPS.md` - How releases use integrations

**Good luck! Start with SCM and work your way through! 🚀**

