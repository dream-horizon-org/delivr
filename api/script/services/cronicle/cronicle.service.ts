/**
 * Cronicle Service Implementation
 * Handles communication with Cronicle job scheduler
 */

import type {
  CronicleServiceConfig,
  CronicleService,
  CreateCronicleJobRequest,
  UpdateCronicleJobRequest,
  GetJobsRequest,
  CronicleTimingConfig,
  CronicleApiResponse,
  CronicleJobInfo,
  CronicleCategoryInfo
} from './cronicle.interface';
import { isCronTiming } from './cronicle.interface';
import {
  CRONICLE_ERROR_MESSAGES,
  CRONICLE_DEFAULTS,
  CRONICLE_API_ENDPOINTS,
  CRONICLE_RESPONSE_CODES
} from './cronicle.constants';

export class CronicleServiceImpl implements CronicleService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly serverBaseUrl: string;
  private readonly defaultTimezone: string;
  private readonly defaultTimeout: number;
  private readonly defaultRetries: number;
  private readonly defaultRetryDelay: number;

  constructor(config: CronicleServiceConfig) {
    this.validateConfig(config);
    
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.serverBaseUrl = config.serverBaseUrl.replace(/\/$/, '');
    this.defaultTimezone = config.defaultTimezone ?? CRONICLE_DEFAULTS.TIMEZONE;
    this.defaultTimeout = config.defaultTimeout ?? CRONICLE_DEFAULTS.TIMEOUT_SECONDS;
    this.defaultRetries = config.defaultRetries ?? CRONICLE_DEFAULTS.RETRIES;
    this.defaultRetryDelay = config.defaultRetryDelay ?? CRONICLE_DEFAULTS.RETRY_DELAY_SECONDS;
  }

  // ─────────────────────────────────────────────────────────────
  // Public API: Job CRUD
  // ─────────────────────────────────────────────────────────────

  /**
   * Create a new scheduled job in Cronicle
   * Validates that the category exists before creating the job.
   * Falls back to 'general' category if the specified category is not found.
   * Note: Categories must be created manually in Cronicle UI (Admin → Categories).
   * @returns The created job ID
   */
  createJob = async (request: CreateCronicleJobRequest): Promise<string> => {
    // Ensure category exists (creates if needed, falls back to 'general')
    const category = await this.ensureCategoryForJob(request.category);
    
    // Build payload with resolved category
    const requestWithCategory = { ...request, category };
    const payload = this.buildCreatePayload(requestWithCategory);
    
    const response = await this.callApi<{ id: string }>(
      CRONICLE_API_ENDPOINTS.CREATE_EVENT,
      payload
    );

    const isError = response.code !== CRONICLE_RESPONSE_CODES.SUCCESS;
    if (isError) {
      throw new Error(`${CRONICLE_ERROR_MESSAGES.CREATE_JOB_FAILED}: ${response.description}`);
    }

    return response.id!;
  };

  /**
   * Ensure a category exists before creating a job
   * 
   * The `category` parameter is the category **title** (e.g., "Release Scheduling").
   * Cronicle auto-generates the ID from the title.
   * 
   * Falls back to 'general' category if the specified category is not found.
   * Categories must be created manually in Cronicle UI (Admin → Categories).
   * 
   * @param categoryTitle - The category title (not ID)
   * @returns The category ID to use in job creation
   */
  private ensureCategoryForJob = async (categoryTitle: string): Promise<string> => {
    const FALLBACK_CATEGORY = 'general';
    
    // If using 'general', return as-is (it's both ID and title)
    const isGeneralCategory = categoryTitle.toLowerCase() === FALLBACK_CATEGORY;
    if (isGeneralCategory) {
      return FALLBACK_CATEGORY;
    }

    // Check if category with this title already exists
    const existingCategoryId = await this.findCategoryByTitle(categoryTitle);
    if (existingCategoryId !== null) {
      return existingCategoryId;
    }

    // Category not found - fall back to 'general' (no auto-creation)
    console.warn(
      `[CronicleService] Category '${categoryTitle}' not found in Cronicle. ` +
      `Using '${FALLBACK_CATEGORY}' category instead. ` +
      `To organize jobs properly, create the '${categoryTitle}' category manually in Cronicle UI (Admin → Categories).`
    );
    return FALLBACK_CATEGORY;
  };

  /**
   * Update an existing job
   */
  updateJob = async (request: UpdateCronicleJobRequest): Promise<void> => {
    const payload = this.buildUpdatePayload(request);
    
    const response = await this.callApi(
      CRONICLE_API_ENDPOINTS.UPDATE_EVENT,
      payload
    );

    const isError = response.code !== CRONICLE_RESPONSE_CODES.SUCCESS;
    if (isError) {
      throw new Error(`${CRONICLE_ERROR_MESSAGES.UPDATE_JOB_FAILED}: ${response.description}`);
    }
  };

  /**
   * Delete a job
   */
  deleteJob = async (jobId: string): Promise<void> => {
    const response = await this.callApi(
      CRONICLE_API_ENDPOINTS.DELETE_EVENT,
      { id: jobId }
    );

    const isError = response.code !== CRONICLE_RESPONSE_CODES.SUCCESS;
    if (isError) {
      throw new Error(`${CRONICLE_ERROR_MESSAGES.DELETE_JOB_FAILED}: ${response.description}`);
    }
  };

  /**
   * Get job details
   * @returns Job info or null if not found
   */
  getJob = async (jobId: string): Promise<CronicleJobInfo | null> => {
    const response = await this.callApi<CronicleJobInfo>(
      CRONICLE_API_ENDPOINTS.GET_EVENT,
      { id: jobId }
    );

    const isError = response.code !== CRONICLE_RESPONSE_CODES.SUCCESS;
    if (isError) {
      // Job not found is not necessarily an error
      return null;
    }

    return response.event ?? null;
  };

  /**
   * Get list of jobs/events from Cronicle
   * Can be filtered by category, enabled status, etc.
   * Does NOT require admin privileges.
   * 
   * @param filter - Optional filters (category, enabled, pagination)
   * @returns Array of job info objects
   */
  getJobs = async (filter?: GetJobsRequest): Promise<CronicleJobInfo[]> => {
    const payload: Record<string, unknown> = {};
    
    // Add optional filters (skip null and undefined values)
    if (filter?.category !== undefined && filter.category !== null) {
      payload.category = filter.category;
    }
    
    if (filter?.enabled !== undefined && filter.enabled !== null) {
      payload.enabled = filter.enabled;
    }
    
    if (filter?.offset !== undefined && filter.offset !== null) {
      payload.offset = filter.offset;
    }
    
    if (filter?.limit !== undefined && filter.limit !== null) {
      payload.limit = filter.limit;
    }
    
    const response = await this.callApi<CronicleJobInfo>(
      CRONICLE_API_ENDPOINTS.GET_SCHEDULE,
      payload
    );
    
    const isError = response.code !== CRONICLE_RESPONSE_CODES.SUCCESS;
    if (isError) {
      throw new Error(`${CRONICLE_ERROR_MESSAGES.GET_JOBS_FAILED}: ${response.description}`);
    }
    
    return response.rows ?? [];
  };

  // ─────────────────────────────────────────────────────────────
  // Public API: Job Control
  // ─────────────────────────────────────────────────────────────

  /**
   * Enable or disable a job
   */
  setJobEnabled = async (jobId: string, enabled: boolean): Promise<void> => {
    await this.updateJob({
      id: jobId,
      enabled
    });
  };

  /**
   * Run a job immediately (manual trigger)
   * @returns The job run ID
   */
  runJobNow = async (jobId: string, params?: Record<string, unknown>): Promise<string> => {
    const payload: Record<string, unknown> = { id: jobId };
    
    const hasParams = params !== undefined && Object.keys(params).length > 0;
    if (hasParams) {
      payload.params = JSON.stringify(params);
    }

    const response = await this.callApi<{ id: string }>(
      CRONICLE_API_ENDPOINTS.RUN_EVENT,
      payload
    );

    const isError = response.code !== CRONICLE_RESPONSE_CODES.SUCCESS;
    if (isError) {
      throw new Error(`${CRONICLE_ERROR_MESSAGES.RUN_JOB_FAILED}: ${response.description}`);
    }

    return response.id!;
  };

  // ─────────────────────────────────────────────────────────────
  // Public API: Helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Build webhook URL for internal cron endpoints (prefixed with /api/internal/cron)
   */
  buildWebhookUrl = (path: string): string => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.serverBaseUrl}/api/internal/cron${normalizedPath}`;
  };

  /**
   * Build direct URL to server (no prefix added)
   * Use this for routes not under /api/internal/cron
   */
  buildDirectUrl = (path: string): string => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.serverBaseUrl}${normalizedPath}`;
  };

  /**
   * Health check - ping Cronicle server
   */
  ping = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${this.baseUrl}${CRONICLE_API_ENDPOINTS.PING}`);
      const data = await response.json() as CronicleApiResponse;
      return data.code === CRONICLE_RESPONSE_CODES.SUCCESS;
    } catch {
      return false;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Public API: Category Queries (read-only, no admin required)
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all categories
   */
  getCategories = async (): Promise<CronicleCategoryInfo[]> => {
    const response = await this.callApi<CronicleCategoryInfo>(
      CRONICLE_API_ENDPOINTS.GET_CATEGORIES,
      {}
    );

    const isError = response.code !== CRONICLE_RESPONSE_CODES.SUCCESS;
    if (isError) {
      throw new Error(`${CRONICLE_ERROR_MESSAGES.GET_CATEGORIES_FAILED}: ${response.description}`);
    }

    return response.rows ?? [];
  };

  /**
   * Find a category by title and return its ID
   * @returns The category ID if found, null otherwise
   */
  findCategoryByTitle = async (title: string): Promise<string | null> => {
    try {
      const categories = await this.getCategories();
      const category = categories.find(cat => cat.title === title);
      return category?.id ?? null;
    } catch {
      return null;
    }
  };


  // ─────────────────────────────────────────────────────────────
  // Private: API Communication
  // ─────────────────────────────────────────────────────────────

  private callApi = async <T = unknown>(
    endpoint: string,
    payload: Record<string, unknown>
  ): Promise<CronicleApiResponse<T>> => {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(payload)
    });

    return response.json() as Promise<CronicleApiResponse<T>>;
  };

  // ─────────────────────────────────────────────────────────────
  // Private: Payload Builders
  // ─────────────────────────────────────────────────────────────

  private buildCreatePayload = (request: CreateCronicleJobRequest): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      id: request.id,
      title: request.title,
      enabled: request.enabled !== false ? 1 : 0,
      category: request.category,
      plugin: CRONICLE_DEFAULTS.PLUGIN,
      target: CRONICLE_DEFAULTS.TARGET,
      timezone: request.timezone ?? this.defaultTimezone,
      timing: this.formatTiming(request.timing),
      params: this.formatWebhookParams(request.params),
      retries: request.retries ?? this.defaultRetries,
      retry_delay: request.retryDelay ?? this.defaultRetryDelay,
      catch_up: request.catchUp ? 1 : 0,
      notes: request.notes ?? ''
    };

    // Advanced options (only add if provided)
    if (request.timeout !== undefined) payload.timeout = request.timeout;
    if (request.queue !== undefined) payload.queue = request.queue ? 1 : 0;
    if (request.queueMax !== undefined) payload.queue_max = request.queueMax;
    if (request.chain !== undefined) payload.chain = request.chain;
    if (request.chainError !== undefined) payload.chain_error = request.chainError;
    if (request.completionWebhook !== undefined) payload.web_hook = request.completionWebhook;

    return payload;
  };

  private buildUpdatePayload = (request: UpdateCronicleJobRequest): Record<string, unknown> => {
    const payload: Record<string, unknown> = { id: request.id };

    if (request.title !== undefined) payload.title = request.title;
    if (request.enabled !== undefined) payload.enabled = request.enabled ? 1 : 0;
    if (request.category !== undefined) payload.category = request.category;
    if (request.timezone !== undefined) payload.timezone = request.timezone;
    if (request.timing !== undefined) payload.timing = this.formatTiming(request.timing);
    if (request.params !== undefined) payload.params = this.formatWebhookParams(request.params);
    if (request.retries !== undefined) payload.retries = request.retries;
    if (request.retryDelay !== undefined) payload.retry_delay = request.retryDelay;
    if (request.catchUp !== undefined) payload.catch_up = request.catchUp ? 1 : 0;
    if (request.notes !== undefined) payload.notes = request.notes;

    // Advanced options
    if (request.timeout !== undefined) payload.timeout = request.timeout;
    if (request.queue !== undefined) payload.queue = request.queue ? 1 : 0;
    if (request.queueMax !== undefined) payload.queue_max = request.queueMax;
    if (request.chain !== undefined) payload.chain = request.chain;
    if (request.chainError !== undefined) payload.chain_error = request.chainError;
    if (request.completionWebhook !== undefined) payload.web_hook = request.completionWebhook;

    return payload;
  };

  // ─────────────────────────────────────────────────────────────
  // Private: Formatters
  // ─────────────────────────────────────────────────────────────

  private formatTiming = (timing: CronicleTimingConfig): Record<string, unknown> => {
    // Cron format
    if (isCronTiming(timing)) {
      return {
        type: timing.type,
        value: timing.value
      };
    }

    // Array format
    // Note: In Cronicle, 'days' means days of the month (1-31), not days of the week
    // To run daily, omit 'days' (defaults to all days) or set to all days 1-31
    // 'weekdays' is separate and means days of the week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const payload: Record<string, unknown> = {
      hours: timing.hours,
      minutes: timing.minutes
    };

    // Only include days if explicitly provided (don't default to [1-7] as that limits to first week)
    if (timing.days !== undefined) {
      payload.days = timing.days;
    }
    // Omit days entirely to run on all days of the month (daily)

    // Only include months if explicitly provided (omit for all months = runs every month)
    if (timing.months !== undefined) {
      payload.months = timing.months;
    }
    // Omit months entirely to run in all months (1-12)

    // Include years if provided (omit for all years)
    if (timing.years !== undefined && timing.years.length > 0) {
      payload.years = timing.years;
    }

    return payload;
  };

  private formatWebhookParams = (params: CreateCronicleJobRequest['params']): Record<string, unknown> => {
    const headers = this.formatHeaders(params.headers);
    const hasBody = params.body !== undefined && Object.keys(params.body).length > 0;

    return {
      method: params.method,
      url: params.url,
      headers,
      data: hasBody ? JSON.stringify(params.body) : '',
      timeout: params.timeout ?? this.defaultTimeout
    };
  };

  private formatHeaders = (customHeaders?: Record<string, string>): string => {
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Cronicle-Secret': this.webhookSecret
    };

    const allHeaders = { ...defaultHeaders, ...customHeaders };

    return Object.entries(allHeaders)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };

  // ─────────────────────────────────────────────────────────────
  // Private: Validation
  // ─────────────────────────────────────────────────────────────

  private validateConfig = (config: CronicleServiceConfig): void => {
    const missingBaseUrl = !config.baseUrl;
    const missingApiKey = !config.apiKey;
    const missingWebhookSecret = !config.webhookSecret;
    const missingServerBaseUrl = !config.serverBaseUrl;

    const hasError = missingBaseUrl || missingApiKey || missingWebhookSecret || missingServerBaseUrl;

    if (hasError) {
      const missing: string[] = [];
      if (missingBaseUrl) missing.push('baseUrl');
      if (missingApiKey) missing.push('apiKey');
      if (missingWebhookSecret) missing.push('webhookSecret');
      if (missingServerBaseUrl) missing.push('serverBaseUrl');

      throw new Error(`${CRONICLE_ERROR_MESSAGES.INVALID_CONFIG}: Missing ${missing.join(', ')}`);
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────

export const createCronicleService = (config: CronicleServiceConfig): CronicleService => {
  return new CronicleServiceImpl(config);
};

