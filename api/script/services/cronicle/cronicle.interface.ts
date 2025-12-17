/**
 * Cronicle Service Types
 * Types for interacting with Cronicle job scheduler API
 */

// ─────────────────────────────────────────────────────────────
// Timing Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Array-based timing configuration
 * Specify exact hours, minutes, days, months to run
 */
export type CronicleTimingArray = {
  hours: number[];      // 0-23
  minutes: number[];    // 0-59
  days?: number[];      // 1-7 (1=Sunday)
  months?: number[];    // 1-12
  years?: number[];     // e.g., [2025, 2026]
};

/**
 * Cron expression timing configuration
 */
export type CronicleTimingCron = {
  type: 'cron';
  value: string;  // e.g., "0 9 * * *" (9 AM daily)
};

/**
 * Combined timing config - supports both formats
 */
export type CronicleTimingConfig = CronicleTimingArray | CronicleTimingCron;

/**
 * Type guard for cron timing
 */
export const isCronTiming = (timing: CronicleTimingConfig): timing is CronicleTimingCron => {
  return 'type' in timing && timing.type === 'cron';
};

// ─────────────────────────────────────────────────────────────
// HTTP Request Parameters (for urlplug plugin)
// ─────────────────────────────────────────────────────────────

export type CronicleHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type CronicleWebhookParams = {
  method: CronicleHttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout?: number;  // seconds, default 300
};

// ─────────────────────────────────────────────────────────────
// Job Configuration
// ─────────────────────────────────────────────────────────────

export type CronicleJobCategory = 
  | 'release-scheduling'
  | 'release-tasks'
  | 'workflow-polling'
  | string;  // Allow custom categories

export type CreateCronicleJobRequest = {
  id?: string;                      // Optional custom ID (auto-generated if not provided)
  title: string;                    // Job display name
  enabled?: boolean;                // Default true
  category: CronicleJobCategory;    // Category for organization
  timing: CronicleTimingConfig;     // When to run
  timezone?: string;                // e.g., 'Asia/Kolkata'
  params: CronicleWebhookParams;    // Webhook configuration
  retries?: number;                 // Retry attempts on failure (default 0)
  retryDelay?: number;              // Seconds between retries (default 60)
  catchUp?: boolean;                // Run missed jobs when Cronicle restarts
  notes?: string;                   // Description/notes
  
  // Advanced options
  timeout?: number;                 // Job-level timeout in seconds (0 = no timeout)
  queue?: boolean;                  // Queue job if already running vs skip (default: false = skip)
  queueMax?: number;                // Max jobs to queue (0 = unlimited, only if queue=true)
  chain?: string;                   // Event/Job ID to run after this job completes successfully
  chainError?: string;              // Event/Job ID to run if this job fails
  completionWebhook?: string;       // URL to call when job completes (separate from job's webhook)
};

export type UpdateCronicleJobRequest = Partial<Omit<CreateCronicleJobRequest, 'id'>> & {
  id: string;  // ID is required for updates
};

// ─────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────

export type CronicleApiResponse<T = unknown> = {
  code: number;           // 0 = success, non-zero = error
  description?: string;   // Error message if code != 0
  id?: string;            // Job ID (for create/run operations)
  ids?: string[];         // Multiple IDs (for batch operations)
  event?: T;              // Event/job data
  events?: T[];           // Multiple events
  rows?: T[];             // Generic rows
};

export type CronicleJobInfo = {
  id: string;
  title: string;
  enabled: number;        // 0 or 1
  category: string;
  plugin: string;
  target: string;
  timing: Record<string, unknown>;
  timezone: string;
  params: Record<string, unknown>;
  retries: number;
  retry_delay: number;
  catch_up: number;
  notes: string;
  created: number;        // Unix timestamp
  modified: number;       // Unix timestamp
  
  // Advanced options
  timeout?: number;
  queue?: number;         // 0 or 1
  queue_max?: number;
  chain?: string;
  chain_error?: string;
  web_hook?: string;
};

// ─────────────────────────────────────────────────────────────
// Category Types
// ─────────────────────────────────────────────────────────────

export type CronicleCategoryInfo = {
  id: string;
  title: string;
  description: string;
  enabled: number;        // 0 or 1
  max_children: number;   // 0 = unlimited concurrent jobs
  username: string;
  created: number;        // Unix timestamp
  modified: number;       // Unix timestamp
};

export type CreateCronicleCategoryRequest = {
  id?: string;            // Optional custom ID (auto-generated if not provided)
  title: string;          // Category display name
  description?: string;   // Category description
  enabled?: boolean;      // Default true
  maxChildren?: number;   // Max concurrent jobs (0 = unlimited)
};

// ─────────────────────────────────────────────────────────────
// Service Configuration
// ─────────────────────────────────────────────────────────────

export type CronicleServiceConfig = {
  baseUrl: string;            // e.g., 'http://localhost:3012'
  apiKey: string;             // Cronicle API key
  webhookSecret: string;      // Secret for webhook authentication
  serverBaseUrl: string;      // Your server URL for webhooks
  defaultTimezone?: string;   // Default timezone (default: 'Asia/Kolkata')
  defaultTimeout?: number;    // Default webhook timeout in seconds (default: 300)
  defaultRetries?: number;    // Default retry attempts (default: 3)
  defaultRetryDelay?: number; // Default retry delay in seconds (default: 60)
};

// ─────────────────────────────────────────────────────────────
// Service Interface
// ─────────────────────────────────────────────────────────────

export type CronicleService = {
  // Job CRUD operations
  createJob: (request: CreateCronicleJobRequest) => Promise<string>;
  updateJob: (request: UpdateCronicleJobRequest) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  getJob: (jobId: string) => Promise<CronicleJobInfo | null>;
  
  // Job control
  setJobEnabled: (jobId: string, enabled: boolean) => Promise<void>;
  runJobNow: (jobId: string, params?: Record<string, unknown>) => Promise<string>;
  
  // Category queries (read-only, no admin required)
  getCategories: () => Promise<CronicleCategoryInfo[]>;
  findCategoryByTitle: (title: string) => Promise<string | null>;
  
  // URL builders
  buildDirectUrl: (path: string) => string;
  
  // Helpers
  buildWebhookUrl: (path: string) => string;
  
  // Health check
  ping: () => Promise<boolean>;
};

