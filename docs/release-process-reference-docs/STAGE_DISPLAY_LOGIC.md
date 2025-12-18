# Release Stage Display Logic

## Overview
This document explains when and how each stage is displayed on the frontend based on release fields and datetime.

---

## Stage Display Rules

### 1. **PRE_KICKOFF (PreKickoffStage Component)**

**When Shown:**
- `currentPhase === Phase.NOT_STARTED`

**Conditions for NOT_STARTED Phase:**
- **Backend Logic:**
  - No `cronJob` record exists, OR
  - `cronJob.cronStatus === 'PENDING'`, OR
  - `releaseStatus === 'PENDING' && cronStatus === 'PENDING'`
- **Frontend Fallback:**
  - `!release.kickOffDate` (release hasn't started yet)

**Key Fields:**
- `release.kickOffDate` - Must be null/undefined
- `cronJob` - Must be null/undefined OR `cronStatus === 'PENDING'`

**Note:** Once release starts, this component is never shown again.

---

### 2. **KICKOFF (KickoffStage Component)**

**When Shown:**
- `currentStage === 'KICKOFF'` (from `getStageFromPhase()`)

**Conditions for KICKOFF Stage:**
- **Backend Phase Logic:**
  - `releasePhase === 'KICKOFF'` when:
    - `cronJob.stage1Status === 'IN_PROGRESS'`
- **Between Stages:**
  - `stage1Status === 'COMPLETED' && stage2Status === 'PENDING'` → Shows as KICKOFF (awaiting regression)
- **Frontend Fallback:**
  - Release has `kickOffDate` AND tasks exist (defaults to KICKOFF if no stage-specific tasks)

**Key Fields:**
- `release.kickOffDate` - Must exist (release has started)
- `cronJob.stage1Status` - `'IN_PROGRESS'` or `'COMPLETED'`
- `cronJob.stage2Status` - `'PENDING'` (if stage1 is completed)

**Phase Mapping:**
- `Phase.KICKOFF` → `TaskStage.KICKOFF`
- `Phase.AWAITING_REGRESSION` → `TaskStage.KICKOFF` (still shows kickoff stage)

---

### 3. **REGRESSION (RegressionStage Component)**

**When Shown:**
- `currentStage === 'REGRESSION'`

**Conditions for REGRESSION Stage:**
- **Backend Phase Logic:**
  - `releasePhase === 'REGRESSION'` when:
    - `cronJob.stage2Status === 'IN_PROGRESS'`
  - `releasePhase === 'REGRESSION_AWAITING_NEXT_CYCLE'` when:
    - `stage2Status === 'IN_PROGRESS' && currentCycleStatus === 'DONE' && hasNextCycle === true`
- **Between Stages:**
  - `stage2Status === 'COMPLETED' && stage3Status === 'PENDING'` → Shows as REGRESSION (awaiting pre-release)
- **Frontend Fallback:**
  - Release has tasks with `task.stage === 'REGRESSION'` or `task.taskStage === 'REGRESSION'`

**Key Fields:**
- `cronJob.stage2Status` - `'IN_PROGRESS'` or `'COMPLETED'`
- `cronJob.stage3Status` - `'PENDING'` (if stage2 is completed)
- `currentCycleStatus` - `'DONE'` (for awaiting next cycle)
- `hasNextCycle` - `true` (for awaiting next cycle)

**Phase Mapping:**
- `Phase.REGRESSION` → `TaskStage.REGRESSION`
- `Phase.AWAITING_PRE_RELEASE` → `TaskStage.REGRESSION` (still shows regression stage)
- `Phase.REGRESSION_AWAITING_NEXT_CYCLE` → `TaskStage.REGRESSION`

---

### 4. **PRE_RELEASE (PreReleaseStage Component)**

**When Shown:**
- `currentStage === 'PRE_RELEASE'`

**Conditions for PRE_RELEASE Stage:**
- **Backend Phase Logic:**
  - `releasePhase === 'PRE_RELEASE'` when:
    - `cronJob.stage3Status === 'IN_PROGRESS'`
- **Between Stages:**
  - `stage3Status === 'COMPLETED' && stage4Status === 'PENDING'` → Shows as PRE_RELEASE (awaiting submission)
- **Frontend Fallback:**
  - Release has tasks with `task.stage === 'PRE_RELEASE'` or `task.taskStage === 'PRE_RELEASE'`

**Key Fields:**
- `cronJob.stage3Status` - `'IN_PROGRESS'` or `'COMPLETED'`
- `cronJob.stage4Status` - `'PENDING'` (if stage3 is completed)

**Phase Mapping:**
- `Phase.PRE_RELEASE` → `TaskStage.PRE_RELEASE`
- `Phase.AWAITING_SUBMISSION` → `TaskStage.PRE_RELEASE` (still shows pre-release stage)

---

### 5. **DISTRIBUTION (Navigates to separate route)**

**When Shown:**
- `currentStage === 'DISTRIBUTION'`
- Automatically navigates to `/dashboard/{org}/releases/{releaseId}/distribution`

**Conditions for DISTRIBUTION Stage:**
- **Backend Phase Logic:**
  - `releasePhase === 'SUBMISSION'` when:
    - `cronJob.stage4Status === 'IN_PROGRESS'`
  - `releasePhase === 'SUBMITTED_PENDING_APPROVAL'` when:
    - `releaseStatus === 'SUBMITTED'`
  - `releasePhase === 'COMPLETED'` or `'ARCHIVED'`

**Key Fields:**
- `cronJob.stage4Status` - `'IN_PROGRESS'`
- `release.status` - `'SUBMITTED'`, `'COMPLETED'`, or `'ARCHIVED'`

**Phase Mapping:**
- `Phase.SUBMISSION` → `TaskStage.DISTRIBUTION`
- `Phase.AWAITING_SUBMISSION` → `TaskStage.DISTRIBUTION`
- `Phase.SUBMITTED_PENDING_APPROVAL` → `TaskStage.DISTRIBUTION`
- `Phase.COMPLETED` → `TaskStage.DISTRIBUTION`
- `Phase.ARCHIVED` → `TaskStage.DISTRIBUTION`

---

## Phase Derivation Priority (Backend)

The backend `derivePhase()` function checks in this order:

1. **Terminal States** (highest priority)
   - `releaseStatus === 'ARCHIVED'` → `Phase.ARCHIVED`
   - `releaseStatus === 'COMPLETED'` → `Phase.COMPLETED`

2. **Paused States**
   - `releaseStatus === 'PAUSED'` + `pauseType` → `PAUSED_BY_USER` or `PAUSED_BY_FAILURE`

3. **Submitted State**
   - `releaseStatus === 'SUBMITTED'` → `Phase.SUBMITTED_PENDING_APPROVAL`

4. **Not Started**
   - `releaseStatus === 'PENDING' && cronStatus === 'PENDING'` → `Phase.NOT_STARTED`

5. **Stage Statuses** (in order)
   - `stage1Status === 'IN_PROGRESS'` → `Phase.KICKOFF`
   - `stage1Status === 'COMPLETED' && stage2Status === 'PENDING'` → `Phase.AWAITING_REGRESSION`
   - `stage2Status === 'IN_PROGRESS'` → `Phase.REGRESSION` (or `REGRESSION_AWAITING_NEXT_CYCLE`)
   - `stage2Status === 'COMPLETED' && stage3Status === 'PENDING'` → `Phase.AWAITING_PRE_RELEASE`
   - `stage3Status === 'IN_PROGRESS'` → `Phase.PRE_RELEASE`
   - `stage3Status === 'COMPLETED' && stage4Status === 'PENDING'` → `Phase.AWAITING_SUBMISSION`
   - `stage4Status === 'IN_PROGRESS'` → `Phase.SUBMISSION`

---

## Frontend Stage Selection Logic

**Location:** `app/routes/dashboard.$org.releases.$releaseId.tsx`

```typescript
// 1. Get phase from API or derive (fallback)
const currentPhase = release?.releasePhase || determineReleasePhase(release);

// 2. Convert phase to stage
const currentStage = getStageFromPhase(currentPhase);

// 3. Render component based on stage
if (currentPhase === Phase.NOT_STARTED) {
  return <PreKickoffStage />;
}

if (currentStage === 'KICKOFF') {
  return <KickoffStage />;
}

if (currentStage === 'REGRESSION') {
  return <RegressionStage />;
}

if (currentStage === 'PRE_RELEASE') {
  return <PreReleaseStage />;
}

if (currentStage === 'DISTRIBUTION') {
  // Navigates to distribution route
}
```

---

## Key Data Fields

### From Release Object:
- `release.status` - Overall release status
- `release.kickOffDate` - When release started (null = not started)
- `release.releasePhase` - Detailed phase (from backend API)
- `release.cronJob` - Cron job data (null = not started)

### From CronJob Object:
- `cronJob.cronStatus` - `'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED'`
- `cronJob.stage1Status` - `'PENDING' | 'IN_PROGRESS' | 'COMPLETED'`
- `cronJob.stage2Status` - `'PENDING' | 'IN_PROGRESS' | 'COMPLETED'`
- `cronJob.stage3Status` - `'PENDING' | 'IN_PROGRESS' | 'COMPLETED'`
- `cronJob.stage4Status` - `'PENDING' | 'IN_PROGRESS' | 'COMPLETED'`
- `cronJob.pauseType` - `'NONE' | 'USER_REQUESTED' | 'TASK_FAILURE' | 'AWAITING_STAGE_TRIGGER'`

### From Regression Cycle:
- `currentCycleStatus` - `'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'ABANDONED'`
- `hasNextCycle` - Boolean (has upcoming regression cycles)

---

## Quick Reference Table

| Stage | Phase | Key Condition | CronJob Required |
|-------|-------|---------------|------------------|
| **PRE_KICKOFF** | `NOT_STARTED` | No `kickOffDate` OR `cronStatus === 'PENDING'` | No |
| **KICKOFF** | `KICKOFF` | `stage1Status === 'IN_PROGRESS'` | Yes |
| **KICKOFF** | `AWAITING_REGRESSION` | `stage1Status === 'COMPLETED' && stage2Status === 'PENDING'` | Yes |
| **REGRESSION** | `REGRESSION` | `stage2Status === 'IN_PROGRESS'` | Yes |
| **REGRESSION** | `AWAITING_PRE_RELEASE` | `stage2Status === 'COMPLETED' && stage3Status === 'PENDING'` | Yes |
| **PRE_RELEASE** | `PRE_RELEASE` | `stage3Status === 'IN_PROGRESS'` | Yes |
| **PRE_RELEASE** | `AWAITING_SUBMISSION` | `stage3Status === 'COMPLETED' && stage4Status === 'PENDING'` | Yes |
| **DISTRIBUTION** | `SUBMISSION` | `stage4Status === 'IN_PROGRESS'` | Yes |
| **DISTRIBUTION** | `SUBMITTED_PENDING_APPROVAL` | `status === 'SUBMITTED'` | Yes |
| **DISTRIBUTION** | `COMPLETED` | `status === 'COMPLETED'` | N/A |
| **DISTRIBUTION** | `ARCHIVED` | `status === 'ARCHIVED'` | N/A |

---

## Notes

1. **Backend is Source of Truth:** Frontend uses `release.releasePhase` from API when available
2. **Fallback Logic:** Frontend `determineReleasePhase()` is only used if backend doesn't provide phase
3. **Stage vs Phase:** Phase is detailed (14 values), Stage is simplified (4 values) for UI display
4. **Between Stages:** When a stage completes but next hasn't started, UI shows the completed stage
5. **User Selection:** Users can manually select stages in stepper, but default is always current active stage


