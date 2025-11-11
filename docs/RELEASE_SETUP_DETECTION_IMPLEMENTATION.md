# Release Management Setup Detection & Auto-Redirect Implementation

## Overview

Implemented a complete flow to detect if release management is set up for a tenant and automatically redirect users to the setup wizard if configuration is incomplete.

---

## Problem Statement

When a user lands on a tenant's release management pages, the system needed to:
1. Check if release management setup is complete
2. If setup is done → Allow access to dashboard/releases
3. If setup is not done → Redirect to setup wizard
4. Show what steps are complete and what's pending

---

## Solution Architecture

### 1. Backend API Endpoints

#### A. Tenant Info API
**Endpoint:** `GET /tenants/:tenantId`

**Purpose:** Returns tenant details with release management setup status flag

**Response:**
```json
{
  "organisation": {
    "id": "tenant_123",
    "displayName": "My Organization",
    "role": "Owner",
    "releaseManagement": {
      "setupComplete": true,
      "setupSteps": {
        "scmIntegration": true,
        "targetPlatforms": false,
        "pipelines": false,
        "communication": false
      }
    }
  }
}
```

**Implementation:**
- File: `api/script/routes/management.ts`
- Checks if SCM integration exists
- TODO: Add checks for target platforms, pipelines, communication

---

#### B. Release Setup Status API
**Endpoint:** `GET /tenants/:tenantId/releases/setup-status`

**Purpose:** Returns detailed setup progress with step-by-step information

**Response:**
```json
{
  "setupComplete": false,
  "progress": {
    "completed": 1,
    "total": 4,
    "percentage": 25,
    "requiredCompleted": 1,
    "requiredTotal": 2
  },
  "steps": {
    "scm": {
      "completed": true,
      "required": true,
      "label": "GitHub Integration",
      "description": "Connect your GitHub repository",
      "data": {
        "owner": "my-org",
        "repo": "my-repo",
        "displayName": "My Repo"
      }
    },
    "targetPlatforms": {
      "completed": false,
      "required": true,
      "label": "Target Platforms",
      "description": "Configure App Store and/or Play Store"
    },
    "pipelines": {
      "completed": false,
      "required": false,
      "label": "CI/CD Pipelines",
      "description": "Set up build pipelines (optional)"
    },
    "communication": {
      "completed": false,
      "required": false,
      "label": "Slack Integration",
      "description": "Connect Slack for notifications (optional)"
    }
  },
  "message": "Please complete the required setup steps",
  "nextStep": "targetPlatforms"
}
```

**Implementation:**
- File: `api/script/routes/release-management.ts`
- Calculates completion percentage
- Identifies next step to complete
- Distinguishes between required and optional steps

---

### 2. Web Panel Integration

#### A. TypeScript Types
**File:** `app/.server/services/Codepush/types.ts`

Added types for:
- `Organization` (updated with `releaseManagement` field)
- `TenantInfoRequest` / `TenantInfoResponse`
- `SetupStatusRequest` / `SetupStatusResponse`
- `SetupStep`

#### B. API Service Methods
**File:** `app/.server/services/Codepush/index.ts`

Added methods:
```typescript
async getTenantInfo(data: TenantInfoRequest)
async getReleaseSetupStatus(data: SetupStatusRequest)
```

#### C. React Hooks
Created two custom hooks for data fetching:

**File:** `app/hooks/useTenantInfo.ts`
```typescript
export const useTenantInfo = (tenantId: string | undefined)
```
- Fetches tenant info with setup status
- Caches for 30 seconds
- Disabled if tenantId is undefined

**File:** `app/hooks/useReleaseSetupStatus.ts`
```typescript
export const useReleaseSetupStatus = (tenantId: string | undefined)
```
- Fetches detailed setup status
- Caches for 5 seconds
- Disabled if tenantId is undefined

#### D. API Routes (Remix)
Created two API routes for the hooks to call:

**File:** `app/routes/api.v1.tenants.$tenantId.info.ts`
- Proxies request to backend `/tenants/:tenantId`

**File:** `app/routes/api.v1.tenants.$tenantId.release-setup-status.ts`
- Proxies request to backend `/tenants/:tenantId/releases/setup-status`

#### E. Auto-Redirect Logic
**File:** `app/routes/dashboard.$org.releases.tsx`

This is the layout route for all `/dashboard/:org/releases/*` pages.

**Flow:**
1. When user navigates to any releases page
2. Fetch setup status using `useReleaseSetupStatus` hook
3. If loading → Show loading spinner
4. If error → Show error message
5. If setup incomplete → Redirect to setup wizard
6. If setup complete → Render child route (dashboard/releases)

**Special Cases:**
- Skip redirect if already on setup page (`/releases/setup`)
- Show loading state during redirect
- Graceful error handling

---

## Flow Diagrams

### User Navigation Flow

```
User lands on /dashboard/:org/releases
           ↓
Check setup status (API call)
           ↓
    ┌──────┴──────┐
    ↓             ↓
Setup Done    Setup Not Done
    ↓             ↓
Redirect to   Redirect to
Dashboard     Setup Wizard
    ↓             ↓
Show Releases Show Setup Form
```

### Setup Status Determination

```
Check SCM Integration
    ↓
┌───┴───┐
↓       ↓
Yes     No → Setup Incomplete
↓
Check Target Platforms (TODO)
    ↓
┌───┴───┐
↓       ↓
Yes     No → Setup Incomplete
↓
Setup Complete! ✅
```

---

## Setup Status Logic

### Required Steps (Must Complete)
1. **SCM Integration** (GitHub/GitLab/Bitbucket)
   - Currently: Checks if `tenant_scm_integrations` record exists
   - Status: ✅ Implemented

2. **Target Platforms** (App Store / Play Store)
   - Currently: Always returns `false`
   - Status: 🔴 TODO

### Optional Steps (Nice to Have)
3. **CI/CD Pipelines** (Jenkins/GitHub Actions)
   - Currently: Always returns `false`
   - Status: 🔴 TODO

4. **Communication** (Slack/Teams)
   - Currently: Always returns `false`
   - Status: 🔴 TODO

### Completion Criteria
```
setupComplete = (All Required Steps Complete)
```

Current: Only SCM integration is required  
Future: SCM + Target Platforms required

---

## Usage Example

### Frontend Component
```tsx
import { useReleaseSetupStatus } from '~/hooks/useReleaseSetupStatus';

function MyComponent() {
  const { org } = useParams();
  const { data: setupStatus, isLoading } = useReleaseSetupStatus(org);

  if (isLoading) {
    return <Loader />;
  }

  if (!setupStatus?.setupComplete) {
    return <Navigate to={`/dashboard/${org}/releases/setup`} />;
  }

  return <div>Release Dashboard</div>;
}
```

### Backend Usage
```typescript
// In any route handler
const scmController = (storage as any).scmController;
const scmIntegration = await scmController.findActiveByTenant(tenantId);

if (!scmIntegration) {
  // Setup not complete
  return res.status(200).json({ setupComplete: false });
}
```

---

## Testing

### Manual Testing Checklist

#### Without Setup
- [ ] Navigate to `/dashboard/:org/releases`
- [ ] Should auto-redirect to `/dashboard/:org/releases/setup`
- [ ] Should show loading spinner briefly
- [ ] Setup wizard should load

#### With Partial Setup (SCM only)
- [ ] Connect GitHub in setup wizard
- [ ] Navigate to `/dashboard/:org/releases`
- [ ] Should redirect to setup (target platforms not done)
- [ ] Setup status should show 25% complete

#### With Complete Setup
- [ ] Complete all required steps
- [ ] Navigate to `/dashboard/:org/releases`
- [ ] Should show releases dashboard
- [ ] No redirect should occur

#### Edge Cases
- [ ] Direct navigation to `/dashboard/:org/releases/setup` (should work)
- [ ] API error handling (should show error message)
- [ ] Multiple rapid navigations (should not cause issues)

---

## Future Enhancements

### Short Term
1. **Add Target Platform Check**
   - Create `tenant_target_platforms` table
   - Add controller methods
   - Update setup status logic

2. **Add Pipeline Check**
   - Create `tenant_pipelines` table
   - Add controller methods
   - Update setup status (optional)

3. **Add Communication Check**
   - Create `tenant_communication_integrations` table
   - Add controller methods
   - Update setup status (optional)

### Long Term
1. **Progressive Setup**
   - Allow saving partial progress
   - Resume from last completed step

2. **Setup Analytics**
   - Track completion rates
   - Identify common drop-off points

3. **Multi-Tenant Support**
   - Different setup requirements per tenant type
   - Custom workflows

---

## Files Modified/Created

### Backend (delivr-server-ota-managed)
- ✅ `api/script/routes/management.ts` (modified)
  - Added `GET /tenants/:tenantId` endpoint

- ✅ `api/script/routes/release-management.ts` (modified)
  - Enhanced `GET /tenants/:tenantId/releases/setup-status` endpoint

### Frontend (delivr-web-panel-managed)
- ✅ `app/.server/services/Codepush/types.ts` (modified)
  - Added `Organization.releaseManagement` field
  - Added `TenantInfoRequest/Response`
  - Added `SetupStatusRequest/Response`
  - Added `SetupStep` type

- ✅ `app/.server/services/Codepush/index.ts` (modified)
  - Added `getTenantInfo()` method
  - Added `getReleaseSetupStatus()` method

- ✅ `app/hooks/useTenantInfo.ts` (new)
  - React hook for fetching tenant info

- ✅ `app/hooks/useReleaseSetupStatus.ts` (new)
  - React hook for fetching setup status

- ✅ `app/routes/api.v1.tenants.$tenantId.info.ts` (new)
  - API route for tenant info

- ✅ `app/routes/api.v1.tenants.$tenantId.release-setup-status.ts` (new)
  - API route for setup status

- ✅ `app/routes/dashboard.$org.releases.tsx` (modified)
  - Added auto-redirect logic
  - Added loading states
  - Added error handling

---

## API Reference

### GET /tenants/:tenantId
Returns tenant information with release management setup status

**Headers:**
- `userId`: User ID (required)

**Response:** `200 OK`
```json
{
  "organisation": {
    "id": "string",
    "displayName": "string",
    "role": "Owner" | "Collaborator",
    "releaseManagement": {
      "setupComplete": boolean,
      "setupSteps": {
        "scmIntegration": boolean,
        "targetPlatforms": boolean,
        "pipelines": boolean,
        "communication": boolean
      }
    }
  }
}
```

### GET /tenants/:tenantId/releases/setup-status
Returns detailed release management setup status

**Headers:**
- `userId`: User ID (required)

**Response:** `200 OK`
```json
{
  "setupComplete": boolean,
  "progress": {
    "completed": number,
    "total": number,
    "percentage": number,
    "requiredCompleted": number,
    "requiredTotal": number
  },
  "steps": {
    "scm": SetupStep,
    "targetPlatforms": SetupStep,
    "pipelines": SetupStep,
    "communication": SetupStep
  },
  "message": string,
  "nextStep": string | null
}
```

---

## Summary

✅ **Implemented:**
- Tenant info API with setup status flag
- Detailed setup status API with progress tracking
- Web panel services and hooks
- Auto-redirect logic in releases layout
- Loading and error states

🔴 **Pending (TODO):**
- Target platform integration check
- Pipeline integration check
- Communication integration check
- Update completion logic to require target platforms

**Impact:**
- Users are automatically guided to complete setup
- No confusion about missing configuration
- Clear progress indication
- Better onboarding experience

---

**Status:** ✅ Complete (MVP with SCM check only)  
**Next Step:** Implement target platform checks

