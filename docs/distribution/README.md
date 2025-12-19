# Distribution Module - Complete Documentation

**Location:** `delivr-web-panel-managed/docs/distribution/`  
**Last Updated:** December 19, 2025  
**Status:** ✅ **PRODUCTION READY**

---

## 📚 Documentation Index

### 🎯 Core Specifications

#### 1. **DISTRIBUTION_API_SPEC.md** (The Holy Grail)
- **Purpose:** Complete API specification for backend implementation
- **Audience:** Backend developers, API consumers, Frontend integration
- **Contents:**
  - All API endpoints (20+ endpoints)
  - Request/response schemas with examples
  - Platform-specific rules (Android, iOS)
  - Distribution & Submission lifecycle
  - Action transitions and state machine
  - Database schemas
  - Error codes and handling
  - Field name standards and conventions
- **Status:** ✅ Final - Production Ready
- **Lines:** ~1,676 lines

#### 2. **DISTRIBUTION_UI_FLOW_SPEC.md**
- **Purpose:** Complete UI flows and user journeys
- **Audience:** Frontend developers, UX designers, Product managers
- **Contents:**
  - Complete user journeys (two-module architecture)
  - UI states and components
  - Action availability matrix
  - Navigation flows
  - Platform-specific UI rules
  - Error handling and edge cases
  - Component hierarchy and props
- **Status:** ✅ Final - Production Ready
- **Lines:** ~1,499 lines

#### 3. **DISTRIBUTION_TESTING_PLAN.md**
- **Purpose:** Comprehensive testing scenarios and acceptance criteria
- **Audience:** QA engineers, Test automation, Developers
- **Contents:**
  - Test scenarios for all flows
  - Platform-specific test cases
  - API endpoint testing
  - UI component testing
  - Integration test scenarios
  - Edge cases and error scenarios
  - Regression test checklist
- **Status:** ✅ Final - Ready for QA
- **Lines:** ~1,354 lines

---

## 🚀 Quick Start

### For Backend Developers
→ **Start with:** `DISTRIBUTION_API_SPEC.md`
- Implement all 20+ API endpoints
- Follow the database schema
- Implement platform-specific rules
- Use the exact field names and response structures

### For Frontend Developers
→ **Start with:** `DISTRIBUTION_UI_FLOW_SPEC.md` 
- Review the two-module architecture
- Implement the component hierarchy
- Follow the action availability rules
- Reference `DISTRIBUTION_API_SPEC.md` for API integration

### For QA Engineers
→ **Start with:** `DISTRIBUTION_TESTING_PLAN.md`
- Execute all test scenarios
- Verify platform-specific behaviors
- Test edge cases and error handling
- Run regression tests after changes

---

## 📋 Key Concepts

### Distribution Lifecycle (5 States)
```
PENDING → PARTIALLY_SUBMITTED → SUBMITTED → PARTIALLY_RELEASED → RELEASED
```

**Key Rule:** Once `RELEASED`, the status **NEVER changes** (immutable terminal state)

**Status Derivation:** 
- Single platform: `PENDING` → `SUBMITTED` → `RELEASED`
- Two platforms: Includes `PARTIALLY_SUBMITTED` and `PARTIALLY_RELEASED`
- **"Released" means:** `APPROVED`, `LIVE`, `PAUSED`, or `HALTED` status

### Submission Lifecycle (Platform-Specific)

**Android:**
```
PENDING → SUBMITTED → IN_PROGRESS ⇄ HALTED → COMPLETED
              ↓           ↑
         (5 days)    (resume)
              ↓
    USER_ACTION_PENDING
              ↓
         (10 days)
              ↓
         SUSPENDED (terminal)
```

**iOS:**
```
PENDING → IN_REVIEW → APPROVED → LIVE
             ↓            ↓         ↓
         REJECTED     REJECTED   PAUSED (phased only)
             ↓            ↓          
         CANCELLED    CANCELLED
```

### Available Actions

| Action | From → To | Platform | Prerequisites |
|--------|-----------|----------|---------------|
| **Submit** | PENDING → SUBMITTED (Android) / IN_REVIEW (iOS) | Both | Details provided |
| **Cancel** | IN_REVIEW → CANCELLED | **iOS only** | - |
| **Resubmit** | REJECTED/CANCELLED (iOS) / USER_ACTION_PENDING (Android) → New submission | Both | Creates new submission (new ID) |
| **Pause** | IN_PROGRESS → HALTED (Android) / LIVE → PAUSED (iOS) | Both | iOS: `phasedRelease=true` |
| **Resume** | HALTED → IN_PROGRESS (Android) / PAUSED → LIVE (iOS) | Both | - |
| **Update Rollout** | IN_PROGRESS (Android) / LIVE (iOS) → Same status | Both | ⚠️ **Cannot update from HALTED/PAUSED - must resume first!** |

**🚨 Critical Rule:** HALTED (Android) and PAUSED (iOS) do NOT allow rollout updates. You must **RESUME first**, then update the rollout percentage.

---

## 🔑 Platform-Specific Rules

### Android
- ✅ Manual staged rollout (0.01-100%, decimals allowed, min 0.01%)
- ✅ Can **PAUSE** and **RESUME** (IN_PROGRESS ⇄ HALTED)
- ✅ `HALTED` status displayed as "Rollout Paused" in UI
- 🚨 **CRITICAL:** Cannot update rollout from HALTED - must **RESUME first** to IN_PROGRESS
- ❌ Cannot **CANCEL** submissions
- ✅ `inAppUpdatePriority` (0-5)
- ⚠️ **Managed Publishing must be OFF** for rollout control
- ⏱️ **Status Polling**: Backend polls Play Store for 5 days after submission
- ⚠️ **USER_ACTION_PENDING**: If status not verified after 5 days, requires manual resubmission
- 🚫 **SUSPENDED**: Terminal state if no action taken within 10 days

### iOS
- ✅ **Phased Release** (automatic 7-day rollout, can pause/resume)
- ✅ **Manual Release** (immediate 100%, no rollout control)
- ✅ Can **PAUSE** and **RESUME** (LIVE ⇄ PAUSED, phased only)
- 🚨 **CRITICAL:** Cannot update rollout from PAUSED - must **RESUME first** to LIVE
- ✅ Can **CANCEL** submissions (IN_REVIEW → CANCELLED)
- ✅ `PAUSED` status displayed as "Rollout Paused" in UI
- ✅ `releaseType`: Always `"AFTER_APPROVAL"`

---

## 🎯 Two-Module Architecture

### 1. Release Management (Limited View)
**Route:** `/dashboard/:org/releases/:releaseId`  
**Tab:** "Distribution" tab  
**Scope:** View-only for PM approval context  
**API:** `GET /api/v1/releases/:releaseId/distribution`

### 2. Distribution Management (Full Control)
**Route:** `/dashboard/:org/distributions`  
**Scope:** Full CRUD for distribution operations  
**APIs:** 
- `GET /api/v1/distributions` (list with pagination)
- `GET /api/v1/distributions/:distributionId` (detail)
- `GET /api/v1/tenants/:tenantId/submissions/:submissionId/artifact?platform={android|ios}` (artifact download with presigned URL)
- All submission action endpoints

---

## ⚠️ Critical Implementation Notes

### Backend Team Clarifications (Applied)
1. ✅ **Halt is Android-only** (iOS does NOT support halt)
2. ✅ **`releaseType`** = `"AFTER_APPROVAL"` (not `"AUTOMATIC"`)
3. ✅ **Field names:**
   - `rolloutPercentage` (not `rolloutPercent`)
   - `inAppUpdatePriority` (not `inAppPriority`)

### Data Model
- ✅ **Artifacts** are per-submission (not per-distribution)
- ✅ **Action History** auto-populated by backend for PAUSED/RESUMED/CANCELLED/HALTED
- ✅ **`isActive` flag** identifies current submission (vs historical)
- ✅ **Resubmission** creates NEW submission entity with new ID

### PENDING Submissions
- iOS: `phasedRelease: null`, `resetRating: null` (user fills during submit)
- iOS: `releaseType: "AFTER_APPROVAL"` (always set, even for PENDING)
- Both: `submittedAt: null`, `submittedBy: null`
- Both: `releaseNotes: ""` (empty string, not null)

---

## 📊 Implementation Status

### Backend
- ✅ 20+ API endpoints specified
- ✅ Database schemas defined
- ✅ Platform-specific rules documented
- ✅ Error codes and handling specified

### Frontend
- ✅ Types aligned 100% with API spec
- ✅ All components implemented
- ✅ Action availability logic correct
- ✅ Two-module architecture implemented
- ✅ Platform-specific UI flows implemented

### Mock Server
- ✅ 30 test distributions generated
- ✅ All status combinations covered
- ✅ Platform-specific scenarios included
- ✅ Action history samples provided
- ✅ 100% aligned with API spec

### Documentation
- ✅ API specification complete
- ✅ UI flow specification complete
- ✅ Testing plan complete
- ✅ All examples and edge cases documented

---

## 🧪 Testing

### Manual Testing Setup
1. Start mock server: `pnpm run mock` (port 4000)
2. Start frontend: `pnpm run dev` (port 3003)
3. Navigate to `/dashboard/:org/distributions`
4. Test all flows per `DISTRIBUTION_TESTING_PLAN.md`

### Automated Testing
Refer to `DISTRIBUTION_TESTING_PLAN.md` for:
- API endpoint tests
- UI component tests
- Integration tests
- E2E scenarios

---

## 📞 Support & Questions

For questions or clarifications on:
- **API Contracts:** See `DISTRIBUTION_API_SPEC.md`
- **UI Flows:** See `DISTRIBUTION_UI_FLOW_SPEC.md`
- **Testing:** See `DISTRIBUTION_TESTING_PLAN.md`

---

**Last Updated:** December 19, 2025  
**Version:** 1.0.0 Production Ready  
**Total Documentation:** ~4,835 lines across 3 specification documents
