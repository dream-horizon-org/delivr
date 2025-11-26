# Projects → Tenants Migration Plan

## Overview
Backend has migrated from `projects`/`projectId` to `tenants`/`tenantId` for:
- **Project Management Integrations** (JIRA, Linear, Asana, etc.)
- **Test Management Integrations** (Checkmate, TestRail, etc.)

Frontend still uses old `projects`/`projectId` routes. This plan outlines the migration.

---

## Backend Route Changes

### Project Management Integrations
**OLD (deprecated):**
- `POST /projects/:projectId/integrations/project-management/verify`
- `GET /projects/:projectId/integrations/project-management`
- `POST /projects/:projectId/integrations/project-management`
- `GET /projects/:projectId/integrations/project-management/:integrationId`
- `PUT /projects/:projectId/integrations/project-management/:integrationId`
- `DELETE /projects/:projectId/integrations/project-management/:integrationId`
- `POST /projects/:projectId/integrations/project-management/:integrationId/verify`

**NEW (current):**
- `POST /tenants/:tenantId/integrations/project-management/verify` ✅ **UPDATED**
- `POST /tenants/:tenantId/integrations/project-management`
- `GET /tenants/:tenantId/integrations/project-management`
- `GET /tenants/:tenantId/integrations/project-management/:integrationId`
- `PUT /tenants/:tenantId/integrations/project-management/:integrationId`
- `DELETE /tenants/:tenantId/integrations/project-management/:integrationId`
- `POST /tenants/:tenantId/integrations/project-management/:integrationId/verify`

### Test Management Integrations
**OLD (deprecated):**
- `GET /projects/:projectId/integrations/test-management`
- `POST /projects/:projectId/integrations/test-management`
- `PUT /projects/:projectId/integrations/test-management/:integrationId`
- `DELETE /projects/:projectId/integrations/test-management/:integrationId`
- `POST /projects/:projectId/integrations/test-management/:integrationId/verify`

**NEW (current):**
- `POST /test-management/integrations/verify` (stateless verify)
- `POST /test-management/tenants/:tenantId/integrations`
- `GET /test-management/tenants/:tenantId/integrations`
- `GET /test-management/integrations/:integrationId`
- `PUT /test-management/integrations/:integrationId`
- `DELETE /test-management/integrations/:integrationId`
- `POST /test-management/integrations/:integrationId/verify`

---

## Frontend Files to Update

### 1. API Routes Configuration
**File:** `app/.server/services/ReleaseManagement/integrations/api-routes.ts`

**Changes:**
- Update `PROJECT_MANAGEMENT` routes from `/projects/:projectId` to `/tenants/:tenantId`
- Keep verify route as `/projects/:projectId` (backend still uses it)
- Update `TEST_MANAGEMENT` routes to use `/test-management/tenants/:tenantId` pattern

### 2. Frontend API Routes (BFF Layer)

#### Test Management Routes
**Files to update:**
- `app/routes/api.v1.projects.$projectId.integrations.test-management.ts`
  - **Action:** Rename to `app/routes/api.v1.tenants.$tenantId.integrations.test-management.ts`
  - **Changes:** Update route path from `/api/v1/projects/:projectId` to `/api/v1/tenants/:tenantId`
  - **Update:** Change `projectId` param to `tenantId` throughout

- `app/routes/api.v1.projects.$projectId.integrations.test-management.$integrationId.verify.ts`
  - **Action:** Rename to `app/routes/api.v1.tenants.$tenantId.integrations.test-management.$integrationId.verify.ts`
  - **Changes:** Update route path and params

#### Project Management Routes
**Files to check:**
- `app/routes/api.v1.tenants.$tenantId.integrations.project-management.*.tsx` (may already be correct)
- Verify all routes use `/tenants/:tenantId` instead of `/projects/:projectId`

### 3. Service Layer

#### Project Management Service
**File:** `app/.server/services/ReleaseManagement/integrations/jira-integration.ts`

**Changes:**
- Update all `PROJECT_MANAGEMENT.*` calls to use `tenantId` instead of `projectId`
- Update function signatures to use `tenantId` parameter

#### Test Management Service
**File:** `app/.server/services/ReleaseManagement/integrations/checkmate-integration.ts`

**Changes:**
- Update all `TEST_MANAGEMENT.*` calls to use new route structure
- Update function signatures to use `tenantId` instead of `projectId`
- Update `listIntegrations`, `createIntegration`, `updateIntegration`, `deleteIntegration`, `verifyIntegration`

### 4. Components

#### Checkmate Connection Flow
**File:** `app/components/Integrations/CheckmateConnectionFlow.tsx`

**Changes:**
- Update API endpoints from `/api/v1/projects/${projectId}` to `/api/v1/tenants/${tenantId}`
- Update variable names from `projectId` to `tenantId` (where appropriate)
- Lines 57-60, 89-93

#### Checkmate Config Form
**File:** `app/components/ReleaseConfig/TestManagement/CheckmateConfigFormEnhanced.tsx`

**Changes:**
- Verify metadata API calls use correct routes (should already be correct via BFF)
- Check any direct backend calls

#### JIRA Connection Flow
**File:** `app/components/Integrations/JiraConnectionFlow.tsx`

**Changes:**
- Verify routes use `/tenants/:tenantId` instead of `/projects/:projectId`

### 5. Metadata API Routes

**Files:**
- `app/routes/api.v1.integrations.$integrationId.metadata.projects.ts`
- `app/routes/api.v1.integrations.$integrationId.metadata.sections.ts`
- `app/routes/api.v1.integrations.$integrationId.metadata.squads.ts`
- `app/routes/api.v1.integrations.$integrationId.metadata.labels.ts`

**Status:** These should already be correct (they use `/test-management/integrations/:integrationId/checkmate/metadata/*`)

**Verify:** Check that `projectId` query params are still valid (they refer to Checkmate projectId, not tenantId)

### 6. Type Definitions

**Files to check:**
- `app/types/release-config.ts` - Check for `projectId` references (may be Checkmate projectId, not tenantId)
- Any other type files with `projectId` fields

**Note:** Some `projectId` references may be valid (e.g., Checkmate projectId in config). Distinguish between:
- **Tenant ID** (should be `tenantId`) - identifies the organization/tenant
- **Checkmate Project ID** (can be `projectId`) - identifies a project within Checkmate

---

## Migration Steps

### Phase 1: Update API Routes Configuration
1. ✅ Update `api-routes.ts` with new backend routes
2. ✅ Update `PROJECT_MANAGEMENT` routes (including verify) ✅ **COMPLETED**
3. ⏳ Update `TEST_MANAGEMENT` routes

### Phase 2: Update Service Layer
1. ✅ Update `jira-integration.ts` to use `tenantId`
2. ✅ Update `checkmate-integration.ts` to use new routes
3. ✅ Update all service function signatures

### Phase 3: Update BFF Routes
1. ✅ Rename test management route files
2. ✅ Update route paths from `/projects/:projectId` to `/tenants/:tenantId`
3. ✅ Update param names from `projectId` to `tenantId`
4. ✅ Verify project management routes are correct

### Phase 4: Update Components
1. ✅ Update `CheckmateConnectionFlow.tsx`
2. ✅ Update `JiraConnectionFlow.tsx`
3. ✅ Verify other integration components

### Phase 5: Testing
1. ✅ Test Checkmate integration CRUD operations
2. ✅ Test JIRA integration CRUD operations
3. ✅ Test metadata fetching (projects, sections, labels, squads)
4. ✅ Test verify operations
5. ✅ Verify backward compatibility (if any old routes still work)

---

## Files Summary

### Files to Rename
- `app/routes/api.v1.projects.$projectId.integrations.test-management.ts` → `app/routes/api.v1.tenants.$tenantId.integrations.test-management.ts`
- `app/routes/api.v1.projects.$projectId.integrations.test-management.$integrationId.verify.ts` → `app/routes/api.v1.tenants.$tenantId.integrations.test-management.$integrationId.verify.ts`

### Files to Update (Content Changes)
1. `app/.server/services/ReleaseManagement/integrations/api-routes.ts`
2. `app/.server/services/ReleaseManagement/integrations/jira-integration.ts`
3. `app/.server/services/ReleaseManagement/integrations/checkmate-integration.ts`
4. `app/components/Integrations/CheckmateConnectionFlow.tsx`
5. `app/components/Integrations/JiraConnectionFlow.tsx` (verify)

### Files to Verify (May Already Be Correct)
1. `app/routes/api.v1.tenants.$tenantId.integrations.project-management.*.tsx`
2. `app/routes/api.v1.integrations.$integrationId.metadata.*.ts`

---

## Important Notes

1. ✅ **Verify Route Updated:** Project Management verify route has been updated to use `/tenants/:tenantId` in both backend and frontend
2. **Checkmate projectId vs tenantId:** Some `projectId` references are for Checkmate projects, not tenants - don't change those
3. **Backward Compatibility:** Old routes may still work temporarily, but should be migrated for consistency
4. **Testing:** Test all integration flows after migration to ensure nothing breaks

---

## Checklist

- [ ] Update `api-routes.ts` with new backend routes
- [ ] Update `jira-integration.ts` service
- [ ] Update `checkmate-integration.ts` service
- [ ] Rename test management route files
- [ ] Update test management route content
- [ ] Update `CheckmateConnectionFlow.tsx`
- [ ] Update `JiraConnectionFlow.tsx`
- [ ] Test Checkmate integration CRUD
- [ ] Test JIRA integration CRUD
- [ ] Test metadata fetching
- [ ] Test verify operations
- [ ] Update documentation/comments

