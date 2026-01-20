/**
 * Error Handling Utilities for Distribution Module
 * 
 * Provides:
 * - Standardized error types
 * - Error message mapping
 * - Retry logic
 * - User-friendly error messages
 * - Recovery guidance
 */

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  category: ErrorCategory;
  code: string;
  message: string;
  userMessage: string;
  recoveryGuidance?: string;
  statusCode?: number;
  retryable: boolean;
  details?: Record<string, unknown>;
}

// ============================================================================
// ERROR CODE MAPPING
// ============================================================================

const ERROR_MESSAGES: Record<number, { message: string; guidance: string; retryable: boolean }> = {
  // 400 Bad Request
  400: {
    message: 'Invalid request. Please check your input and try again.',
    guidance: 'Verify all required fields are filled correctly and meet the specified criteria.',
    retryable: false,
  },
  
  // 401 Unauthorized
  401: {
    message: 'Your session has expired. Please sign in again.',
    guidance: 'You will be redirected to the login page.',
    retryable: false,
  },
  
  // 403 Forbidden
  403: {
    message: 'You do not have permission to perform this action.',
    guidance: 'Contact your administrator if you believe you should have access.',
    retryable: false,
  },
  
  // 404 Not Found
  404: {
    message: 'The requested resource was not found.',
    guidance: 'The distribution or submission may have been deleted. Try refreshing the page.',
    retryable: false,
  },
  
  // 409 Conflict
  409: {
    message: 'Data conflict detected. Someone else has updated this resource.',
    guidance: 'Please refresh the page to get the latest data, then try your action again.',
    retryable: true,
  },
  
  // 422 Unprocessable Entity
  422: {
    message: 'The data you submitted is invalid or incomplete.',
    guidance: 'Check the highlighted fields for errors and correct them.',
    retryable: false,
  },
  
  // 429 Too Many Requests
  429: {
    message: 'Too many requests. Please slow down.',
    guidance: 'Wait a few seconds before trying again.',
    retryable: true,
  },
  
  // 500 Internal Server Error
  500: {
    message: 'An unexpected server error occurred.',
    guidance: 'This is not your fault. Please try again in a few moments. If the problem persists, contact support.',
    retryable: true,
  },
  
  // 502 Bad Gateway
  502: {
    message: 'Service temporarily unavailable.',
    guidance: 'The server is experiencing issues. Please try again in a few moments.',
    retryable: true,
  },
  
  // 503 Service Unavailable
  503: {
    message: 'Service temporarily unavailable.',
    guidance: 'The service is under maintenance or experiencing high load. Please try again shortly.',
    retryable: true,
  },
  
  // 504 Gateway Timeout
  504: {
    message: 'Request timed out.',
    guidance: 'The server took too long to respond. Please try again.',
    retryable: true,
  },
};

// ============================================================================
// ERROR PARSING
// ============================================================================

/**
 * Parse HTTP response into AppError
 */
export async function parseErrorResponse(response: Response): Promise<AppError> {
  const statusCode = response.status;
  let errorData: any = null;
  
  try {
    errorData = await response.json();
  } catch {
    // Response might not be JSON
  }
  
  const errorInfo = ERROR_MESSAGES[statusCode] || ERROR_MESSAGES[500];
  
  // Determine category
  let category: ErrorCategory;
  if (statusCode === 401 || statusCode === 403) {
    category = ErrorCategory.AUTHORIZATION;
  } else if (statusCode === 404) {
    category = ErrorCategory.NOT_FOUND;
  } else if (statusCode === 409) {
    category = ErrorCategory.CONFLICT;
  } else if (statusCode === 422 || statusCode === 400) {
    category = ErrorCategory.VALIDATION;
  } else if (statusCode === 429) {
    category = ErrorCategory.RATE_LIMIT;
  } else if (statusCode >= 500) {
    category = ErrorCategory.SERVER;
  } else {
    category = ErrorCategory.UNKNOWN;
  }
  
  // Extract error code and message from response
  const code = errorData?.code || errorData?.error || `HTTP_${statusCode}`;
  const apiMessage = errorData?.message || errorData?.error?.message;
  
  return {
    category,
    code,
    message: apiMessage || errorInfo.message,
    userMessage: errorInfo.message,
    recoveryGuidance: errorInfo.guidance,
    statusCode,
    retryable: errorInfo.retryable,
    details: errorData?.details || errorData,
  };
}

/**
 * Parse network error (fetch failed)
 */
export function parseNetworkError(error: Error): AppError {
  const isTimeout = error.name === 'TimeoutError' || error.message.includes('timeout');
  
  if (isTimeout) {
    return {
      category: ErrorCategory.TIMEOUT,
      code: 'TIMEOUT',
      message: 'Request timed out',
      userMessage: 'The request took too long to complete.',
      recoveryGuidance: 'Check your internet connection and try again. If the problem persists, the server may be experiencing high load.',
      retryable: true,
    };
  }
  
  return {
    category: ErrorCategory.NETWORK,
    code: 'NETWORK_ERROR',
    message: error.message || 'Network request failed',
    userMessage: 'Unable to connect to the server.',
    recoveryGuidance: 'Check your internet connection and try again.',
    retryable: true,
  };
}

// ============================================================================
// DISTRIBUTION-SPECIFIC ERROR HANDLING
// ============================================================================

/**
 * Distribution-specific error codes and messages
 */
const DISTRIBUTION_ERROR_GUIDANCE: Record<string, string> = {
  INVALID_ROLLOUT: 'Rollout percentage must be between 1-100% and cannot decrease from the current value.',
  INVALID_PRIORITY: 'In-app priority must be between 0-5.',
  INVALID_STATE_TRANSITION: 'This action is not allowed in the current submission state.',
  ALREADY_SUBMITTED: 'This submission has already been sent to the store. Use the resubmission flow to submit again.',
  CANNOT_DECREASE_ROLLOUT: 'Rollout percentage can only increase, not decrease. Current rollout is already higher.',
  CANNOT_PAUSE_ANDROID: 'Pausing rollout is not supported for Android. You can only increase the rollout or halt it.',
  CANNOT_MODIFY_HALTED: 'Cannot modify a halted submission. Halting is a final action.',
  MISSING_ARTIFACT: 'No build artifact found. Please upload an AAB file (Android) or provide a TestFlight build number (iOS).',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 150MB. Please upload a smaller file.',
  INVALID_FILE_TYPE: 'Only .aab files are accepted for Android submissions.',
  HALT_REASON_REQUIRED: 'You must provide a reason for halting the rollout (minimum 10 characters).',
  RELEASE_NOTES_REQUIRED: 'Release notes are required and must be at least 10 characters.',
};

/**
 * Enhance error with distribution-specific guidance
 */
export function enhanceDistributionError(error: AppError): AppError {
  const guidance = DISTRIBUTION_ERROR_GUIDANCE[error.code];
  
  if (guidance) {
    return {
      ...error,
      recoveryGuidance: guidance,
    };
  }
  
  return error;
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
  shouldRetry?: (error: AppError) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: true,
  shouldRetry: (error) => error.retryable,
};

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: AppError | null = null;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const appError = error instanceof Error 
        ? parseNetworkError(error)
        : (error as AppError);
      
      lastError = appError;
      
      // Check if we should retry
      if (!opts.shouldRetry(appError)) {
        throw appError;
      }
      
      // Check if we've exhausted attempts
      if (attempt >= opts.maxAttempts) {
        throw appError;
      }
      
      // Wait before retrying
      const delay = opts.backoff 
        ? opts.delayMs * Math.pow(2, attempt - 1)
        : opts.delayMs;
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// ============================================================================
// FETCH WITH ERROR HANDLING
// ============================================================================

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retry?: RetryOptions;
}

/**
 * Fetch with timeout and error handling
 */
export async function fetchWithErrorHandling(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, retry, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Check for HTTP errors
    if (!response.ok) {
      const error = await parseErrorResponse(response);
      const enhancedError = enhanceDistributionError(error);
      throw enhancedError;
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw parseNetworkError(new Error('TimeoutError'));
    }
    
    throw error;
  }
}

/**
 * Fetch with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { retry, ...fetchOptions } = options;
  
  return withRetry(
    () => fetchWithErrorHandling(url, fetchOptions),
    retry
  );
}

// ============================================================================
// STALE DATA DETECTION
// ============================================================================

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface StaleDataInfo {
  isStale: boolean;
  loadedAt: Date;
  ageMs: number;
  shouldRefresh: boolean;
}

/**
 * Check if data is stale
 */
export function checkStaleData(loadedAt: Date | string | number): StaleDataInfo {
  const loadedTime = new Date(loadedAt).getTime();
  const now = Date.now();
  const ageMs = now - loadedTime;
  const isStale = ageMs > STALE_THRESHOLD_MS;
  
  return {
    isStale,
    loadedAt: new Date(loadedTime),
    ageMs,
    shouldRefresh: ageMs > STALE_THRESHOLD_MS * 2, // 10 minutes
  };
}

// ============================================================================
// VALIDATION ERROR HELPERS
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 1) {
    return errors[0].message;
  }
  
  return `${errors.length} validation errors:\n${errors.map(e => `• ${e.field}: ${e.message}`).join('\n')}`;
}

// ============================================================================
// EXPORTS
// ============================================================================
//  All types exported inline above

