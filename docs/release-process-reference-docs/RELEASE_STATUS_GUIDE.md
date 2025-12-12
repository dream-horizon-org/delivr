# Release Orchestration - Status & Phase Guide

**Purpose:** Quick reference for developers on release status enums, phase derivation, and API responses.

---

## 1. Enums

### ReleaseStatus
Overall lifecycle state of a release.

```typescript
export enum ReleaseStatus {
  PENDING = 'PENDING',           // Created, not started
  IN_PROGRESS = 'IN_PROGRESS',   // Active (cron processing)
  PAUSED = 'PAUSED',             // Paused by user or task failure
  SUBMITTED = 'SUBMITTED',       // Build submitted to stores
  COMPLETED = 'COMPLETED',       // Released
  ARCHIVED = 'ARCHIVED'          // Cancelled
}
```

### StageStatus
Per-stage progress (stage1, stage2, stage3).

```typescript
export enum StageStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}
```

### CronStatus
Cron job execution state.

```typescript
export enum CronStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}
```

### PauseType (NEW)
Reason why cron is stopped.

```typescript
export enum PauseType {
  NONE = 'NONE',
  AWAITING_STAGE_TRIGGER = 'AWAITING_STAGE_TRIGGER',  // Waiting for manual stage trigger
  USER_REQUESTED = 'USER_REQUESTED',                   // User clicked pause
  TASK_FAILURE = 'TASK_FAILURE'                        // Critical task failed
}
```

**Schema:**
```sql
ALTER TABLE cron_jobs ADD COLUMN pauseType ENUM(
  'NONE', 'AWAITING_STAGE_TRIGGER', 'USER_REQUESTED', 'TASK_FAILURE'
) DEFAULT 'NONE';
```

### TaskStatus
Individual task execution state.

```typescript
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_CALLBACK = 'AWAITING_CALLBACK',  // NEW: Waiting for CI/CD callback
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'                        // NEW: Intentionally skipped
}
```

### RegressionCycleStatus
Regression cycle state (Stage 2).

```typescript
export enum RegressionCycleStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  ABANDONED = 'ABANDONED'         // NEW: User abandoned cycle
}
```

---

## 2. API Response Structure

```typescript
type ReleaseStatusResponse = {
  release: {
    id: string;
    status: ReleaseStatus;
  };
  stages: {
    stage1: StageStatus;
    stage2: StageStatus;
    stage3: StageStatus;
  };
  cron: {
    status: CronStatus;
    pauseType: PauseType;
  };
  currentPhase: Phase;        // Derived - UI switches on this
  displayText: string;        // Human-readable status
  regression: {               // Stage 2 only, null otherwise
    currentCycle: {
      number: number;
      tag: string;
      status: RegressionCycleStatus;
    } | null;
    nextCycle: {
      number: number;
      tag: string;
      scheduledAt: string;
    } | null;
    progress: {
      completed: number;
      total: number;
    };
  } | null;
  actions: Action[];          // Available UI actions
};
```

---

## 3. Phase Enum (UI Reference)

```typescript
type Phase = 
  | 'NOT_STARTED'
  | 'KICKOFF'
  | 'AWAITING_REGRESSION'
  | 'REGRESSION_CYCLE_STARTING'
  | 'REGRESSION_CYCLE_RUNNING'
  | 'REGRESSION_AWAITING_NEXT_CYCLE'
  | 'AWAITING_POST_REGRESSION'
  | 'POST_REGRESSION'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'PAUSED_BY_USER'
  | 'PAUSED_BY_FAILURE'
  | 'ARCHIVED';

type Action = 
  | 'START'
  | 'PAUSE'
  | 'RESUME'
  | 'TRIGGER_STAGE_2'
  | 'TRIGGER_STAGE_3'
  | 'RETRY_TASK'
  | 'SKIP_TASK'
  | 'ABANDON_CYCLE'
  | 'SKIP_REMAINING_CYCLES'
  | 'ARCHIVE';
```

---

## 4. Phase Calculation Table

| release.status | pauseType | stage1 | stage2 | stage3 | cycle.status | nextCycle | **Phase** |
|----------------|-----------|--------|--------|--------|--------------|-----------|-----------|
| PENDING | - | PENDING | PENDING | PENDING | - | - | `NOT_STARTED` |
| IN_PROGRESS | NONE | IN_PROGRESS | PENDING | PENDING | - | - | `KICKOFF` |
| IN_PROGRESS | AWAITING_STAGE_TRIGGER | COMPLETED | PENDING | PENDING | - | - | `AWAITING_REGRESSION` |
| IN_PROGRESS | NONE | COMPLETED | IN_PROGRESS | PENDING | NOT_STARTED | any | `REGRESSION_CYCLE_STARTING` |
| IN_PROGRESS | NONE | COMPLETED | IN_PROGRESS | PENDING | IN_PROGRESS | any | `REGRESSION_CYCLE_RUNNING` |
| IN_PROGRESS | NONE | COMPLETED | IN_PROGRESS | PENDING | DONE | exists | `REGRESSION_AWAITING_NEXT_CYCLE` |
| IN_PROGRESS | AWAITING_STAGE_TRIGGER | COMPLETED | COMPLETED | PENDING | - | - | `AWAITING_POST_REGRESSION` |
| IN_PROGRESS | NONE | COMPLETED | COMPLETED | IN_PROGRESS | - | - | `POST_REGRESSION` |
| SUBMITTED | - | COMPLETED | COMPLETED | COMPLETED | - | - | `SUBMITTED` |
| COMPLETED | - | COMPLETED | COMPLETED | COMPLETED | - | - | `COMPLETED` |
| PAUSED | USER_REQUESTED | any | any | any | - | - | `PAUSED_BY_USER` |
| PAUSED | TASK_FAILURE | any | any | any | - | - | `PAUSED_BY_FAILURE` |
| ARCHIVED | - | any | any | any | - | - | `ARCHIVED` |

---

## 5. Sample API Response

```json
{
  "release": {
    "id": "rel-123",
    "status": "IN_PROGRESS"
  },
  "stages": {
    "stage1": "COMPLETED",
    "stage2": "IN_PROGRESS",
    "stage3": "PENDING"
  },
  "cron": {
    "status": "RUNNING",
    "pauseType": "NONE"
  },
  "currentPhase": "REGRESSION_AWAITING_NEXT_CYCLE",
  "displayText": "RC1 Done - RC2 scheduled at 2:00 PM (1/3)",
  "regression": {
    "currentCycle": {
      "number": 1,
      "tag": "RC1",
      "status": "DONE"
    },
    "nextCycle": {
      "number": 2,
      "tag": "RC2",
      "scheduledAt": "2024-01-15T14:00:00Z"
    },
    "progress": {
      "completed": 1,
      "total": 3
    }
  },
  "actions": ["PAUSE", "SKIP_REMAINING_CYCLES"]
}
```

---

## 6. Example Responses for Each State

### NOT_STARTED
```json
{
  "release": { "id": "rel-123", "status": "PENDING" },
  "stages": { "stage1": "PENDING", "stage2": "PENDING", "stage3": "PENDING" },
  "cron": { "status": "PENDING", "pauseType": "NONE" },
  "currentPhase": "NOT_STARTED",
  "displayText": "Not Started",
  "regression": null,
  "actions": ["START"]
}
```

### KICKOFF
```json
{
  "release": { "id": "rel-123", "status": "IN_PROGRESS" },
  "stages": { "stage1": "IN_PROGRESS", "stage2": "PENDING", "stage3": "PENDING" },
  "cron": { "status": "RUNNING", "pauseType": "NONE" },
  "currentPhase": "KICKOFF",
  "displayText": "Stage 1 - Kickoff Running",
  "regression": null,
  "actions": ["PAUSE"]
}
```

### AWAITING_REGRESSION
```json
{
  "release": { "id": "rel-123", "status": "IN_PROGRESS" },
  "stages": { "stage1": "COMPLETED", "stage2": "PENDING", "stage3": "PENDING" },
  "cron": { "status": "PAUSED", "pauseType": "AWAITING_STAGE_TRIGGER" },
  "currentPhase": "AWAITING_REGRESSION",
  "displayText": "Stage 1 Complete - Awaiting Regression Start",
  "regression": null,
  "actions": ["TRIGGER_STAGE_2", "ARCHIVE"]
}
```

### REGRESSION_CYCLE_STARTING
```json
{
  "release": { "id": "rel-123", "status": "IN_PROGRESS" },
  "stages": { "stage1": "COMPLETED", "stage2": "IN_PROGRESS", "stage3": "PENDING" },
  "cron": { "status": "RUNNING", "pauseType": "NONE" },
  "currentPhase": "REGRESSION_CYCLE_STARTING",
  "displayText": "Stage 2 - RC1 Starting...",
  "regression": {
    "currentCycle": { "number": 1, "tag": "RC1", "status": "NOT_STARTED" },
    "nextCycle": { "number": 2, "tag": "RC2", "scheduledAt": "2024-01-15T14:00:00Z" },
    "progress": { "completed": 0, "total": 3 }
  },
  "actions": ["PAUSE"]
}
```

### REGRESSION_CYCLE_RUNNING
```json
{
  "release": { "id": "rel-123", "status": "IN_PROGRESS" },
  "stages": { "stage1": "COMPLETED", "stage2": "IN_PROGRESS", "stage3": "PENDING" },
  "cron": { "status": "RUNNING", "pauseType": "NONE" },
  "currentPhase": "REGRESSION_CYCLE_RUNNING",
  "displayText": "Stage 2 - RC1 Running (1/3)",
  "regression": {
    "currentCycle": { "number": 1, "tag": "RC1", "status": "IN_PROGRESS" },
    "nextCycle": { "number": 2, "tag": "RC2", "scheduledAt": "2024-01-15T14:00:00Z" },
    "progress": { "completed": 0, "total": 3 }
  },
  "actions": ["PAUSE", "ABANDON_CYCLE"]
}
```

### REGRESSION_AWAITING_NEXT_CYCLE
```json
{
  "release": { "id": "rel-123", "status": "IN_PROGRESS" },
  "stages": { "stage1": "COMPLETED", "stage2": "IN_PROGRESS", "stage3": "PENDING" },
  "cron": { "status": "RUNNING", "pauseType": "NONE" },
  "currentPhase": "REGRESSION_AWAITING_NEXT_CYCLE",
  "displayText": "RC1 Done - RC2 scheduled at 2:00 PM (1/3)",
  "regression": {
    "currentCycle": { "number": 1, "tag": "RC1", "status": "DONE" },
    "nextCycle": { "number": 2, "tag": "RC2", "scheduledAt": "2024-01-15T14:00:00Z" },
    "progress": { "completed": 1, "total": 3 }
  },
  "actions": ["PAUSE", "SKIP_REMAINING_CYCLES"]
}
```

### AWAITING_POST_REGRESSION
```json
{
  "release": { "id": "rel-123", "status": "IN_PROGRESS" },
  "stages": { "stage1": "COMPLETED", "stage2": "COMPLETED", "stage3": "PENDING" },
  "cron": { "status": "PAUSED", "pauseType": "AWAITING_STAGE_TRIGGER" },
  "currentPhase": "AWAITING_POST_REGRESSION",
  "displayText": "Stage 2 Complete - Awaiting Pre-Release Start",
  "regression": {
    "currentCycle": null,
    "nextCycle": null,
    "progress": { "completed": 3, "total": 3 }
  },
  "actions": ["TRIGGER_STAGE_3", "ARCHIVE"]
}
```

### POST_REGRESSION
```json
{
  "release": { "id": "rel-123", "status": "IN_PROGRESS" },
  "stages": { "stage1": "COMPLETED", "stage2": "COMPLETED", "stage3": "IN_PROGRESS" },
  "cron": { "status": "RUNNING", "pauseType": "NONE" },
  "currentPhase": "POST_REGRESSION",
  "displayText": "Stage 3 - Pre-Release Running",
  "regression": null,
  "actions": ["PAUSE"]
}
```

### SUBMITTED
```json
{
  "release": { "id": "rel-123", "status": "SUBMITTED" },
  "stages": { "stage1": "COMPLETED", "stage2": "COMPLETED", "stage3": "COMPLETED" },
  "cron": { "status": "COMPLETED", "pauseType": "NONE" },
  "currentPhase": "SUBMITTED",
  "displayText": "Submitted - Awaiting Store Approval",
  "regression": null,
  "actions": []
}
```

### COMPLETED
```json
{
  "release": { "id": "rel-123", "status": "COMPLETED" },
  "stages": { "stage1": "COMPLETED", "stage2": "COMPLETED", "stage3": "COMPLETED" },
  "cron": { "status": "COMPLETED", "pauseType": "NONE" },
  "currentPhase": "COMPLETED",
  "displayText": "Released",
  "regression": null,
  "actions": []
}
```

### PAUSED_BY_USER
```json
{
  "release": { "id": "rel-123", "status": "PAUSED" },
  "stages": { "stage1": "COMPLETED", "stage2": "IN_PROGRESS", "stage3": "PENDING" },
  "cron": { "status": "PAUSED", "pauseType": "USER_REQUESTED" },
  "currentPhase": "PAUSED_BY_USER",
  "displayText": "Paused by User",
  "regression": {
    "currentCycle": { "number": 2, "tag": "RC2", "status": "IN_PROGRESS" },
    "nextCycle": { "number": 3, "tag": "RC3", "scheduledAt": "2024-01-15T16:00:00Z" },
    "progress": { "completed": 1, "total": 3 }
  },
  "actions": ["RESUME", "ARCHIVE"]
}
```

### PAUSED_BY_FAILURE
```json
{
  "release": { "id": "rel-123", "status": "PAUSED" },
  "stages": { "stage1": "IN_PROGRESS", "stage2": "PENDING", "stage3": "PENDING" },
  "cron": { "status": "PAUSED", "pauseType": "TASK_FAILURE" },
  "currentPhase": "PAUSED_BY_FAILURE",
  "displayText": "Paused - Task Failed",
  "regression": null,
  "actions": ["RETRY_TASK", "SKIP_TASK", "ARCHIVE"]
}
```

### ARCHIVED
```json
{
  "release": { "id": "rel-123", "status": "ARCHIVED" },
  "stages": { "stage1": "COMPLETED", "stage2": "IN_PROGRESS", "stage3": "PENDING" },
  "cron": { "status": "PAUSED", "pauseType": "NONE" },
  "currentPhase": "ARCHIVED",
  "displayText": "Archived",
  "regression": null,
  "actions": []
}
```

---

## Quick Reference

| Phase | Display Text | Actions |
|-------|--------------|---------|
| NOT_STARTED | Not Started | START |
| KICKOFF | Stage 1 - Kickoff Running | PAUSE |
| AWAITING_REGRESSION | Stage 1 Complete - Awaiting Regression Start | TRIGGER_STAGE_2, ARCHIVE |
| REGRESSION_CYCLE_STARTING | Stage 2 - RC{n} Starting... | PAUSE |
| REGRESSION_CYCLE_RUNNING | Stage 2 - RC{n} Running ({x}/{y}) | PAUSE, ABANDON_CYCLE |
| REGRESSION_AWAITING_NEXT_CYCLE | RC{n} Done - RC{n+1} scheduled at {time} | PAUSE, SKIP_REMAINING_CYCLES |
| AWAITING_POST_REGRESSION | Stage 2 Complete - Awaiting Pre-Release Start | TRIGGER_STAGE_3, ARCHIVE |
| POST_REGRESSION | Stage 3 - Pre-Release Running | PAUSE |
| SUBMITTED | Submitted - Awaiting Store Approval | - |
| COMPLETED | Released | - |
| PAUSED_BY_USER | Paused by User | RESUME, ARCHIVE |
| PAUSED_BY_FAILURE | Paused - Task Failed | RETRY_TASK, SKIP_TASK, ARCHIVE |
| ARCHIVED | Archived | - |

