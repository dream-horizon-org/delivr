# Tenant Integrations System

Complete reference for implementing tenant-level integrations in Delivr.

---

## 🎯 Overview

Previously, integrations (GitHub, App Store, Jenkins, etc.) were hardcoded for Dream 11 using environment variables. Now, **each tenant configures their own integrations**.

---

## 📚 Documentation Index

### 1. **Planning & Analysis**
- [`INTEGRATION_CATEGORIES_ANALYSIS.md`](./INTEGRATION_CATEGORIES_ANALYSIS.md)
  - Why 5 separate tables instead of 1?
  - Comparison of approaches
  - Schema recommendations

### 2. **How Releases Use Integrations**
- [`RELEASES_INTEGRATION_RELATIONSHIPS.md`](./RELEASES_INTEGRATION_RELATIONSHIPS.md)
  - How releases reference all integrations
  - Junction tables for many-to-many relationships
  - Complete relationship diagrams
  - Real-world examples

### 3. **Implementation Guide** ⭐ **START HERE**
- [`SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md`](./SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md)
  - **Complete reference implementation** for SCM integrations
  - SQL migration
  - TypeScript types
  - Sequelize models
  - Database controllers
  - Express routes
  - Testing examples
  - Use this as a **template for other 4 integration types**

### 4. **Implementation Checklist**
- [`INTEGRATION_IMPLEMENTATION_CHECKLIST.md`](./INTEGRATION_IMPLEMENTATION_CHECKLIST.md)
  - Step-by-step checklist for all 5 integration types
  - Progress tracker
  - Testing guidelines
  - Definition of done

---

## 🏗️ Architecture

### 5 Integration Types

```
┌─────────────────────────────────────────────────────────────┐
│                     TENANT                                   │
│                   (NJEG6wOk7e)                              │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├── 1. SCM Integrations
       │   └── GitHub, GitLab, Bitbucket
       │       - Repository connection
       │       - Access tokens
       │       - Webhook configuration
       │
       ├── 2. Target Integrations
       │   └── App Store, Play Store
       │       - Platform credentials
       │       - API keys
       │       - Distribution certificates
       │
       ├── 3. Pipeline Integrations
       │   └── Jenkins, GitHub Actions
       │       - Build server connection
       │       - Job/workflow paths
       │       - References SCM + Target (FKs)
       │
       ├── 4. Communication Integrations
       │   └── Slack, Email
       │       - Bot tokens
       │       - Channel IDs
       │       - Notification preferences
       │
       └── 5. Ticket Integrations
           └── Jira, Linear
               - Project connection
               - API credentials
               - Epic/issue templates
```

---

## 🔗 Database Relationships

```sql
-- Simple integrations (no dependencies)
tenant_scm_integrations              -- GitHub, GitLab
tenant_target_integrations           -- App Store, Play Store
tenant_communication_integrations    -- Slack, Email
tenant_ticket_integrations           -- Jira, Linear

-- Complex integration (has FKs)
tenant_pipeline_integrations
  ├─ FK → tenant_scm_integrations
  └─ FK → tenant_target_integrations

-- Releases reference integrations
releases
  ├─ FK → tenant_scm_integrations (required)
  ├─ FK → tenant_communication_integrations (optional)
  └─ FK → tenant_ticket_integrations (optional)

-- Junction tables for many-to-many
release_targets
  ├─ FK → releases
  └─ FK → tenant_target_integrations

release_pipelines
  ├─ FK → releases
  └─ FK → tenant_pipeline_integrations
```

---

## 📁 File Structure

```
delivr-server-ota-managed/
│
├── docs/                           # Documentation
│   ├── README_INTEGRATIONS.md      # ← You are here
│   ├── INTEGRATION_CATEGORIES_ANALYSIS.md
│   ├── RELEASES_INTEGRATION_RELATIONSHIPS.md
│   ├── SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md
│   └── INTEGRATION_IMPLEMENTATION_CHECKLIST.md
│
├── migrations/                     # SQL migrations
│   ├── 003_tenant_scm_integrations.sql
│   ├── 004_tenant_target_integrations.sql
│   ├── 005_tenant_pipeline_integrations.sql
│   ├── 006_tenant_communication_integrations.sql
│   └── 007_tenant_ticket_integrations.sql
│
├── api/script/
│   ├── storage/integrations/       # Data access layer
│   │   ├── scm/
│   │   │   ├── scm-types.ts
│   │   │   ├── scm-models.ts
│   │   │   ├── scm-controller.ts
│   │   │   └── index.ts
│   │   ├── targets/
│   │   ├── pipelines/
│   │   ├── communication/
│   │   ├── tickets/
│   │   └── index.ts
│   │
│   ├── routes/integrations/        # HTTP endpoints
│   │   ├── scm-routes.ts
│   │   ├── target-routes.ts
│   │   ├── pipeline-routes.ts
│   │   ├── communication-routes.ts
│   │   ├── ticket-routes.ts
│   │   └── index.ts
│   │
│   └── services/integrations/      # External API clients
│       ├── scm/
│       │   ├── github-service.ts
│       │   ├── gitlab-service.ts
│       │   └── bitbucket-service.ts
│       ├── targets/
│       ├── pipelines/
│       ├── communication/
│       └── tickets/
```

---

## 🚀 Getting Started

### Step 1: Read the Documentation

1. **Understand WHY** → Read [`INTEGRATION_CATEGORIES_ANALYSIS.md`](./INTEGRATION_CATEGORIES_ANALYSIS.md)
2. **Understand HOW releases use them** → Read [`RELEASES_INTEGRATION_RELATIONSHIPS.md`](./RELEASES_INTEGRATION_RELATIONSHIPS.md)
3. **Learn the implementation pattern** → Read [`SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md`](./SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md)

### Step 2: Implement SCM Integration (Reference)

Follow the complete guide in `SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md`:

```bash
# 1. Create migration
vim migrations/003_tenant_scm_integrations.sql

# 2. Run migration
mysql -u root -p delivr_ota < migrations/003_tenant_scm_integrations.sql

# 3. Verify table
mysql -u root -p delivr_ota -e "DESCRIBE tenant_scm_integrations;"

# 4. Implement code (types, model, controller, routes)
# Follow guide step-by-step

# 5. Test with cURL
curl -X POST http://localhost:8080/api/v1/integrations/scm \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "NJEG6wOk7e",
    "scmType": "GITHUB",
    "displayName": "My App Repo",
    "repositoryUrl": "https://github.com/myorg/myapp",
    "accessToken": "ghp_xxx",
    "createdByAccountId": "acc_123"
  }'
```

### Step 3: Replicate for Other 4 Types

Use the SCM implementation as a template:

1. **Targets** (App Store, Play Store)
2. **Pipelines** (Jenkins, GitHub Actions) - Add FKs to SCM + Targets
3. **Communication** (Slack, Email)
4. **Tickets** (Jira, Linear)

Track progress in [`INTEGRATION_IMPLEMENTATION_CHECKLIST.md`](./INTEGRATION_IMPLEMENTATION_CHECKLIST.md).

---

## 🧪 Testing

### Unit Tests (DB Controller)

```typescript
// Test SCM controller
const controller = new SCMIntegrationController(model);

// Test create
const integration = await controller.create({
  tenantId: 'test_tenant',
  scmType: 'GITHUB',
  displayName: 'Test Repo',
  repositoryUrl: 'https://github.com/test/repo',
  accessToken: 'token',
  createdByAccountId: 'acc_test'
});

// Test findAll
const integrations = await controller.findAll({ tenantId: 'test_tenant' });

// Test update
await controller.update(integration.id, { displayName: 'Updated Name' });
```

### Integration Tests (API Routes)

```bash
# Create
curl -X POST http://localhost:8080/api/v1/integrations/scm \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# List
curl http://localhost:8080/api/v1/integrations/scm?tenantId=xxx

# Get
curl http://localhost:8080/api/v1/integrations/scm/{id}

# Update
curl -X PATCH http://localhost:8080/api/v1/integrations/scm/{id} \
  -H "Content-Type: application/json" \
  -d '{ "displayName": "New Name" }'

# Delete
curl -X DELETE http://localhost:8080/api/v1/integrations/scm/{id}
```

### Relationship Tests

```sql
-- Test FK constraint: Can't delete SCM if pipeline uses it
DELETE FROM tenant_scm_integrations WHERE id = 'scm_xxx';
-- ERROR: Cannot delete or update a parent row

-- Test cascade: Delete tenant → delete all integrations
DELETE FROM tenants WHERE id = 'NJEG6wOk7e';
-- All integrations for this tenant are also deleted
```

---

## 🔐 Security Considerations

### Token Encryption

All sensitive tokens MUST be encrypted at rest:

```typescript
import { encrypt, decrypt } from '../utils/encryption';

// Before saving
const encrypted = encrypt(accessToken);
await integration.update({ accessToken: encrypted });

// When using
const decrypted = decrypt(integration.accessToken);
await githubClient.authenticate(decrypted);
```

### Safe API Responses

NEVER return tokens in API responses:

```typescript
// ❌ BAD
return integration; // Contains accessToken, refreshToken

// ✅ GOOD
return toSafeObject(integration); // Tokens removed
```

### Permission Checks

Only tenant owners/admins can manage integrations:

```typescript
// Middleware
async function checkIntegrationPermission(req, res, next) {
  const user = req.user;
  const { tenantId } = req.body;
  
  const hasPermission = await checkTenantRole(user.id, tenantId, ['OWNER', 'ADMIN']);
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
}
```

---

## 📊 API Endpoints

All integration types follow the same REST pattern:

```
GET    /api/v1/integrations/{type}           List all
GET    /api/v1/integrations/{type}/:id       Get single
POST   /api/v1/integrations/{type}           Create
PATCH  /api/v1/integrations/{type}/:id       Update
DELETE /api/v1/integrations/{type}/:id       Delete
POST   /api/v1/integrations/{type}/:id/verify Verify connection
```

Where `{type}` is one of: `scm`, `targets`, `pipelines`, `communication`, `tickets`

---

## 🎯 Success Criteria

You're done when:

1. ✅ All 5 integration types implemented
2. ✅ All migrations run successfully
3. ✅ All CRUD endpoints work
4. ✅ Relationships (FKs) validated
5. ✅ Tokens encrypted and safe objects returned
6. ✅ Can create a release referencing integrations
7. ✅ Frontend setup wizard can call these APIs

---

## 🆘 Troubleshooting

### Migration fails with FK error
- Check character set matches: `CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin`
- Check referenced table exists
- Check column types match exactly

### API returns 500
- Check Sequelize model initialized in storage
- Check controller instantiated correctly
- Check routes registered in main `api/script/index.ts`

### Tokens visible in API response
- Ensure using `toSafeObject()` helper
- Never return raw model instance

### Can't delete integration
- Check if it's referenced by a release (FK constraint)
- Use soft delete (`isActive = false`) instead
- Or cascade delete from release first

---

## 📞 Need Help?

1. Check the reference implementation: `SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md`
2. Review the checklist: `INTEGRATION_IMPLEMENTATION_CHECKLIST.md`
3. Look at relationship diagrams: `RELEASES_INTEGRATION_RELATIONSHIPS.md`

**Happy coding! 🚀**

