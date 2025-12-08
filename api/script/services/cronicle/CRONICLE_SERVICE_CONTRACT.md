# Cronicle Service Contract

## Overview

**Cronicle** is a **periodic job scheduler**. It is designed for **periodic, scheduled execution**, not event-driven processing. 

### What Cronicle IS

- ✅ **Time-based scheduler** - Run jobs at specific times (e.g., "daily at 9 PM")
- ✅ **Periodic executor** - Run jobs at intervals (e.g., "every 5 minutes")
- ✅ **Cron replacement** - Centralized, distributed cron management

### What Cronicle is NOT

- ❌ **Event-driven** - Does not react to events
- ❌ **Real-time processor** - Not for immediate, on-demand execution
- ❌ **Message queue** - Not a pub/sub system

### Use Case Summary

| Scenario | Use Cronicle? |
|----------|---------------|
| "Run every day at 9 PM" | ✅ Yes |
| "Run every 5 minutes" | ✅ Yes |
| "Run when a file is uploaded" | ❌ No |
| "Run when user clicks button" | ❌ No |
| "Run when payment succeeds" | ❌ No |
| "Run at a specific future date/time" | ✅ Yes |

### How It Works (Our Setup)

```
┌─────────────────┐    scheduled trigger    ┌─────────────────┐
│    Cronicle     │ ───────────────────────▶│   Your Server   │
│    (Scheduler)  │    POST /api/internal/  │   (Business     │
│                 │    cron/your-endpoint   │    Logic)       │
└─────────────────┘                         └─────────────────┘
        │
        │ At configured time:
        │ - Daily at 9 PM
        │ - Every 5 minutes
        │ - Specific date/time
        │
        ▼
    Cronicle calls your webhook URL
```

---

## Configuration

### Required Environment Variables

```bash
CRONICLE_URL=http://localhost:3012        # Cronicle server URL
CRONICLE_API_KEY=your-api-key             # API key from Cronicle Admin → API Keys
```

### Optional Environment Variables

```bash
CRONICLE_WEBHOOK_SECRET=your-secret       # Secret for webhook authentication (if using webhooks)
SERVER_BASE_URL=http://localhost:3010     # Your server URL (if using webhooks)
```

---

## Service Interface

```typescript
type CronicleService = {
  // Job CRUD
  createJob: (request: CreateCronicleJobRequest) => Promise<string>;
  updateJob: (request: UpdateCronicleJobRequest) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  getJob: (jobId: string) => Promise<CronicleJobInfo | null>;
  
  // Job Control
  setJobEnabled: (jobId: string, enabled: boolean) => Promise<void>;
  runJobNow: (jobId: string, params?: Record<string, unknown>) => Promise<string>;
  
  // Utilities
  buildWebhookUrl: (path: string) => string;
  ping: () => Promise<boolean>;
};
```

---

## Methods

### 1. `createJob(request)` → `Promise<string>`

Creates a new scheduled job in Cronicle.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | No | Custom job ID (auto-generated if not provided) |
| `title` | `string` | **Yes** | Display name for the job |
| `enabled` | `boolean` | No | Whether job is active (default: `true`) |
| `category` | `string` | **Yes** | Category for organization |
| `timing` | `CronicleTimingConfig` | **Yes** | When to run (see Timing section) |
| `timezone` | `string` | No | Timezone (default: `Asia/Kolkata`) |
| `params` | `CronicleWebhookParams` | **Yes** | Webhook configuration |
| `retries` | `number` | No | Retry attempts on failure (default: `3`) |
| `retryDelay` | `number` | No | Seconds between retries (default: `60`) |
| `catchUp` | `boolean` | No | Run missed jobs on restart (default: `false`) |
| `notes` | `string` | No | Description/notes |

**Advanced Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timeout` | `number` | No | Job-level timeout in seconds (0 = no timeout) |
| `queue` | `boolean` | No | Queue job if already running vs skip (default: `false` = skip) |
| `queueMax` | `number` | No | Max jobs to queue (0 = unlimited, only applies if `queue=true`) |
| `chain` | `string` | No | Job ID to run after this job completes successfully |
| `chainError` | `string` | No | Job ID to run if this job fails |
| `completionWebhook` | `string` | No | URL to call when job completes (separate from job's webhook) |

**Returns:** Job ID (string)

**Example with all options:**

```typescript
const jobId = await cronicleService.createJob({
  // ─────────────────────────────────────────────────────────────
  // REQUIRED PARAMETERS
  // ─────────────────────────────────────────────────────────────
  
  title: 'Process Release Schedules',     // Display name in Cronicle UI
  category: 'release-scheduling',         // Category for organization (see CRONICLE_CATEGORIES)
  timing: {                               // When to run (see Timing section for formats)
    hours: [21],                          // 9 PM (0-23)
    minutes: [0],                         // On the hour (0-59)
    days: [2, 3, 4, 5, 6],                // Mon-Fri (1=Sun, 2=Mon, ..., 7=Sat)
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]  // All months (optional)
  },
  params: {                               // Webhook configuration
    method: 'POST',                       // HTTP method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    url: cronicleService.buildWebhookUrl('/release-schedules/process'),  // Full URL to call
    headers: {                            // Custom headers (optional)
      'X-Custom-Header': 'value'
    },
    body: {                               // Request body for POST/PUT (optional)
      source: 'cronicle',
      triggeredAt: new Date().toISOString()
    },
    timeout: 120                          // HTTP request timeout in seconds (default: 300)
  },

  // ─────────────────────────────────────────────────────────────
  // OPTIONAL PARAMETERS
  // ─────────────────────────────────────────────────────────────
  
  id: 'daily-release-schedule-check',     // Custom job ID (auto-generated if not provided)
  enabled: true,                          // Whether job is active (default: true)
  timezone: 'Asia/Kolkata',               // Timezone for scheduling (default: 'Asia/Kolkata')
  retries: 3,                             // Retry attempts on failure (default: 3)
  retryDelay: 60,                         // Seconds between retries (default: 60)
  catchUp: false,                         // Run missed jobs when Cronicle restarts (default: false)
  notes: 'Checks for release schedules due tomorrow and creates releases',
  
  timeout: 1800,                          // Job-level timeout in seconds (0 = no timeout)
  queue: true,                            // Queue if already running vs skip (default: false)
  queueMax: 3,                            // Max jobs to queue (0 = unlimited)
  chain: 'post-process-cleanup',          // Job ID to run on SUCCESS
  chainError: 'error-notification-job',   // Job ID to run on FAILURE
  completionWebhook: 'https://slack.example.com/webhook'  // URL to POST results when done
});

console.log(`Created job with ID: ${jobId}`);
```

**Minimal example (required fields only):**

```typescript
const jobId = await cronicleService.createJob({
  title: 'My Scheduled Task',
  category: 'release-scheduling',
  timing: { hours: [9], minutes: [0] },   // Daily at 9 AM
  params: {
    method: 'POST',
    url: cronicleService.buildWebhookUrl('/my-endpoint')
  }
});
```

---

### 2. `updateJob(request)` → `Promise<void>`

Updates an existing job.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | **Yes** | Job ID to update |
| `...` | `Partial<CreateCronicleJobRequest>` | No | Any fields to update |

**Example:**

```typescript
await cronicleService.updateJob({
  id: 'my-job-id',
  timing: {
    hours: [22],  // Change to 10 PM
    minutes: [0]
  }
});
```

---

### 3. `deleteJob(jobId)` → `Promise<void>`

Deletes a job.

**Example:**

```typescript
await cronicleService.deleteJob('my-job-id');
```

---

### 4. `getJob(jobId)` → `Promise<CronicleJobInfo | null>`

Gets job details. Returns `null` if not found.

**Example:**

```typescript
const job = await cronicleService.getJob('my-job-id');
if (job) {
  console.log(`Job ${job.title} is ${job.enabled ? 'enabled' : 'disabled'}`);
}
```

---

### 5. `setJobEnabled(jobId, enabled)` → `Promise<void>`

Enable or disable a job.

**Example:**

```typescript
// Disable job
await cronicleService.setJobEnabled('my-job-id', false);

// Enable job
await cronicleService.setJobEnabled('my-job-id', true);
```

---

### 6. `runJobNow(jobId, params?)` → `Promise<string>`

Triggers a job immediately (manual run).

**Returns:** Job run ID

**Example:**

```typescript
const runId = await cronicleService.runJobNow('my-job-id', {
  triggeredBy: 'manual',
  reason: 'Testing'
});
```

---

### 7. `buildWebhookUrl(path)` → `string`

Helper to build full webhook URL for internal endpoints.

**Example:**

```typescript
const url = cronicleService.buildWebhookUrl('/release-schedules');
// Returns: http://your-server:3010/api/internal/cron/release-schedules
```

---

### 8. `ping()` → `Promise<boolean>`

Health check for Cronicle server.

**Example:**

```typescript
const isHealthy = await cronicleService.ping();
if (!isHealthy) {
  console.error('Cronicle server is not responding');
}
```

---

## Timing Configuration

Two formats are supported:

### Format 1: Array-based (Recommended)

```typescript
timing: {
  hours: [9, 21],           // 9 AM and 9 PM
  minutes: [0, 30],         // On the hour and half-hour
  days: [1, 2, 3, 4, 5],    // Mon-Fri (1=Sunday)
  months: [1, 2, ..., 12]   // All months (optional)
}
```

### Format 2: Cron Expression

```typescript
timing: {
  type: 'cron',
  value: '0 9,21 * * 1-5'   // 9 AM and 9 PM, Mon-Fri
}
```

### Common Patterns

| Pattern | Array Format | Cron Format |
|---------|--------------|-------------|
| Daily at 9 PM | `{ hours: [21], minutes: [0] }` | `0 21 * * *` |
| Every hour | `{ minutes: [0] }` | `0 * * * *` |
| Every 5 minutes | `{ minutes: [0,5,10,15,20,25,30,35,40,45,50,55] }` | `*/5 * * * *` |
| Weekdays at 9 AM | `{ hours: [9], minutes: [0], days: [2,3,4,5,6] }` | `0 9 * * 1-5` |
| First of month | `{ hours: [0], minutes: [0] }` + set specific date | `0 0 1 * *` |

---

## Webhook Parameters

```typescript
params: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,                              // Full URL to call
  headers?: Record<string, string>,         // Custom headers (optional)
  body?: Record<string, unknown>,           // Request body for POST/PUT (optional)
  timeout?: number                          // Timeout in seconds (default: 300)
}
```

**Example:**

```typescript
params: {
  method: 'POST',
  url: 'https://api.example.com/webhook',
  headers: {
    'Authorization': 'Bearer token123'
  },
  body: {
    action: 'process',
    timestamp: Date.now()
  },
  timeout: 60,
  follow: 1,                // Follow HTTP redirects (default: 1)
}
```

---
---
---
---
---

## Advanced Options 

### Complete Reference Table

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeout` | `number` | `0` (none) | Job-level timeout in seconds. If job exceeds this, it's forcefully terminated. |
| `queue` | `boolean` | `false` | Queue scheduled runs if job is already running (vs skip). |
| `queueMax` | `number` | `0` (unlimited) | Maximum queued jobs. Only applies if `queue=true`. |
| `chain` | `string` | - | Job ID to run after this job completes **successfully**. |
| `chainError` | `string` | - | Job ID to run if this job **fails**. |
| `completionWebhook` | `string` | - | URL to POST job results when job completes. |

---

### 1. `timeout` - Job Execution Timeout

**What it does:** Sets a maximum execution time for the job. If the job runs longer than this, Cronicle will forcefully terminate it.

**Type:** `number` (seconds)

**Default:** `0` (no timeout - job can run indefinitely)

**When to use:**
- Long-running tasks that might hang
- Preventing runaway processes
- Enforcing SLAs for job completion

**Example:**

```typescript
await cronicleService.createJob({
  title: 'Data Sync Job',
  category: 'maintenance',
  timing: { hours: [2], minutes: [0] },
  params: { 
    method: 'POST', 
    url: 'https://api.example.com/sync',
    timeout: 60  // HTTP request timeout (for the webhook call)
  },
  timeout: 3600  // Job-level timeout: 1 hour max
});
```

**Important:** This is different from `params.timeout`:
- `params.timeout` → HTTP request timeout (for the webhook call)
- `timeout` → Total job execution timeout (includes retries, etc.)

---

### 3. `queue` - Job Queueing

**What it does:** When a job is scheduled to run but a previous run is still executing, this determines whether to queue the new run or skip it.

**Type:** `boolean`

**Default:** `false` (skip if already running)

**Behavior:**
| `queue` | Job Already Running? | Result |
|---------|---------------------|--------|
| `false` | Yes | New run is **skipped** |
| `true` | Yes | New run is **queued** (waits in line) |

**When to use:**
- **Enable (`true`):** Every scheduled run is important and must execute
- **Disable (`false`):** Okay to skip if job is slow (e.g., polling)

**Example:**

```typescript
await cronicleService.createJob({
  title: 'Critical Report Generation',
  category: 'reports',
  timing: { hours: [9], minutes: [0] },  // Daily at 9 AM
  params: { method: 'POST', url: 'https://api.example.com/reports/generate' },
  queue: true,    // Never skip - queue if still running from yesterday
  queueMax: 3     // Max 3 in queue to prevent buildup
});
```

---

### 4. `queueMax` - Maximum Queue Size

**What it does:** Limits how many jobs can be queued waiting to run. Prevents unbounded queue growth if a job is consistently slow.

**Type:** `number`

**Default:** `0` (unlimited queue)

**Only applies when:** `queue: true`

**Behavior:**
- When queue reaches `queueMax`, new runs are **skipped** (not queued)
- Set to prevent memory issues from infinite queue growth

**Example:**

```typescript
await cronicleService.createJob({
  title: 'Data Export',
  category: 'exports',
  timing: { minutes: [0] },  // Every hour
  params: { method: 'POST', url: 'https://api.example.com/export' },
  queue: true,
  queueMax: 2  // Max 2 waiting in queue. If 3rd comes, it's skipped.
});
```

**Recommended values:**
- `1-3`: For jobs that should never skip but also shouldn't build up
- `0` (unlimited): Only for critical jobs where every run must execute
- Don't set `queueMax` if `queue: false` (it's ignored)

---

### 5. `chain` - Success Chaining

**What it does:** Specifies another job to run immediately after this job completes **successfully**.

**Type:** `string` (Job ID)

**Default:** None

**When to use:**
- Multi-step workflows
- Cleanup after main task
- Notifications on success
- Dependent tasks

**How it works:**
1. Job A runs and completes successfully
2. Cronicle immediately triggers Job B (the chained job)
3. Job B runs with its own configuration

**Example - Pipeline:**

```typescript
// Step 1: Create the downstream jobs first (disabled - only run via chain)
const validateJobId = await cronicleService.createJob({
  id: 'step-2-validate',
  title: 'Step 2: Validate Data',
  category: 'pipeline',
  timing: { hours: [0], minutes: [0] },  // Timing doesn't matter
  enabled: false,  // Disabled - only triggered by chain
  params: { method: 'POST', url: '.../validate' }
});

const notifyJobId = await cronicleService.createJob({
  id: 'step-3-notify',
  title: 'Step 3: Send Notifications',
  category: 'pipeline',
  timing: { hours: [0], minutes: [0] },
  enabled: false,
  params: { method: 'POST', url: '.../notify' },
});

// Step 2: Create the main job with chain
await cronicleService.createJob({
  id: 'step-1-fetch',
  title: 'Step 1: Fetch Data',
  category: 'pipeline',
  timing: { hours: [6], minutes: [0] },  // Daily at 6 AM
  params: { method: 'POST', url: '.../fetch' },
  chain: validateJobId  // On success → run validate
});

// Step 3: Update validate job to chain to notify
await cronicleService.updateJob({
  id: validateJobId,
  chain: notifyJobId  // On success → run notify
});
```

**Result:** 6 AM → Fetch → Validate → Notify (automatic pipeline)

---

### 6. `chainError` - Failure Chaining

**What it does:** Specifies another job to run immediately when this job **fails**.

**Type:** `string` (Job ID)

**Default:** None

**When to use:**
- Error handling workflows
- Alerting/notifications on failure
- Rollback procedures
- Retry with different parameters

**Example - Error Handler:**

```typescript
// Create error handler job (disabled)
const errorHandlerId = await cronicleService.createJob({
  id: 'error-handler',
  title: 'Error Handler: Send Alert',
  category: 'alerts',
  timing: { hours: [0], minutes: [0] },
  enabled: false,
  params: {
    method: 'POST',
    url: 'https://slack.example.com/webhook',
    body: { text: '🚨 Critical job failed!' }
  }
});

// Main job with error chaining
await cronicleService.createJob({
  title: 'Critical Data Sync',
  category: 'sync',
  timing: { hours: [1], minutes: [0] },
  params: { method: 'POST', url: '.../sync' },
  retries: 3,
  chainError: errorHandlerId  // On failure → send alert
});
```

**Combining `chain` and `chainError`:**

```typescript
await cronicleService.createJob({
  title: 'Release Deployment',
  category: 'release-tasks',
  timing: { hours: [9], minutes: [0] },
  params: { method: 'POST', url: '.../deploy' },
  chain: 'post-deploy-cleanup',      // On success → cleanup
  chainError: 'rollback-deployment'  // On failure → rollback
});
```

---

### 7. `completionWebhook` - Completion Notification

**What it does:** Cronicle will POST the job's result to this URL when the job completes (success OR failure).

**Type:** `string` (URL)

**Default:** None

**When to use:**
- External monitoring systems
- Updating job status in your database
- Slack/Teams notifications
- Audit logging

**Payload sent by Cronicle:**

```json
{
  "action": "job_complete",
  "code": 0,           // 0 = success, 1 = failure
  "description": "Job completed successfully",
  "job": {
    "id": "abc123",
    "event": "my-job-id",
    "event_title": "My Job Title",
    "category": "release-scheduling",
    "hostname": "server1",
    "elapsed": 45.2,    // seconds
    "perf": { ... }     // performance metrics
  }
}
```

**Example:**

**Example - Slack notification:**

```typescript
await cronicleService.createJob({
  title: 'Critical Sync',
  category: 'sync',
  timing: { hours: [9], minutes: [0] },
  params: { method: 'POST', url: '.../sync' },
  completionWebhook: 'https://hooks.slack.com/services/XXX/YYY/ZZZ'
  // Slack will receive the job result JSON
});
```

**Note:** This is different from `params.url`:
- `params.url` → The webhook your job calls (the job's work)
- `completionWebhook` → URL Cronicle calls after job completes (notification)

---

### Complete Example: All Advanced Options

```typescript
await cronicleService.createJob({
  id: 'production-release-deploy',
  title: 'Production Release Deployment',
  category: 'release-tasks',
  timing: { hours: [10], minutes: [0] },
  timezone: 'Asia/Kolkata',
  params: {
    method: 'POST',
    url: cronicleService.buildWebhookUrl('/releases/deploy'),
    body: { environment: 'production' },
    timeout: 120  // HTTP timeout: 2 minutes
  },
  retries: 2,
  retryDelay: 30,
  
  // Advanced options
  timeout: 1800,                              // Job timeout: 30 minutes max
  multiplex: false,                           // Only one deployment at a time
  queue: true,                                // Queue if already deploying
  queueMax: 1,                                // Max 1 waiting
  chain: 'post-deploy-smoke-tests',           // On success → run smoke tests
  chainError: 'rollback-production',          // On failure → rollback
  completionWebhook: 'https://slack.com/...'  // Notify team on completion
});
```

---