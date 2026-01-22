/**
 * Error Handler Utilities
 * 
 * Utilities for handling API errors, extracting messages, and providing user-friendly feedback
 */

import type { AxiosError } from 'axios';
import axios from 'axios';
import { ERROR_MESSAGES } from '~/constants/distribution/distribution.constants';
import type { APIErrorResponse } from '~/types/distribution/distribution.types';
import { ApiError } from '~/utils/api-client';

// ============================================================================
// ERROR MESSAGE EXTRACTION
// ============================================================================

/**
 * Get user-friendly error message from error object
 */
export function getErrorMessage(error: unknown): string {
  // Axios error with response
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<APIErrorResponse>;
    
    // API error response
    if (axiosError.response?.data?.error?.message) {
      return axiosError.response.data.error.message;
    }
    
    // HTTP status message
    if (axiosError.response?.statusText) {
      return axiosError.response.statusText;
    }
    
    // Network error
    if (axiosError.code === 'ECONNABORTED') {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    
    // Generic Axios error
    return axiosError.message;
  }
  
  // JavaScript Error
  if (error instanceof Error) {
    return error.message;
  }
  
  // String error
  if (typeof error === 'string') {
    return error;
  }
  
  // Unknown error
  return ERROR_MESSAGES.GENERIC;
}

/**
 * Get error code from API error response
 */
export function getErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<APIErrorResponse>;
    return axiosError.response?.data?.error?.code ?? null;
  }
  return null;
}

/**
 * Get error details from API error response
 */
export function getErrorDetails<T = Record<string, unknown>>(error: unknown): T | null {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<APIErrorResponse>;
    return (axiosError.response?.data?.error?.details as T) ?? null;
  }
  return null;
}


// ============================================================================
// ERROR CATEGORIZATION
// ============================================================================

/**
 * Check if error is a validation error (400)
 */
export function isValidationError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 400;
  }
  return false;
}

/**
 * Check if error is an authentication error (401)
 * Also checks for ApiError with isAuthError flag
 */
export function isAuthenticationError(error: unknown): boolean {
  // Check ApiError with isAuthError flag (from api-client.ts)
  if (error instanceof ApiError) {
    return error.isAuthError === true || error.status === 401;
  }
  
  // Check for ApiError-like object with isAuthError flag
  if (error && typeof error === 'object' && 'isAuthError' in error) {
    return (error as { isAuthError?: boolean }).isAuthError === true;
  }
  
  // Check for 401 status in Axios errors
  if (axios.isAxiosError(error)) {
    return error.response?.status === 401;
  }
  
  // Check for Error with 401 status
  if (error instanceof Error && 'status' in error) {
    return (error as { status?: number }).status === 401;
  }
  
  return false;
}

/**
 * Check if error is an authorization error (403)
 */
export function isAuthorizationError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 403;
  }
  return false;
}

/**
 * Check if error is a not found error (404)
 */
export function isNotFoundError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 404;
  }
  return false;
}

/**
 * Check if error is a conflict error (409)
 */
export function isConflictError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 409;
  }
  return false;
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    return status >= 500 && status < 600;
  }
  return false;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error';
  }
  return false;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return isNetworkError(error) || isServerError(error);
}

// ============================================================================
// SPECIFIC ERROR CHECKS
// ============================================================================

/**
 * Check if error is a version conflict
 */
export function isVersionConflict(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'VERSION_EXISTS' || code === 'VERSION_EXISTS_DRAFT';
}

/**
 * Check if error is an exposure control conflict
 */
export function isExposureControlConflict(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'EXPOSURE_CONTROL_CONFLICT';
}

/**
 * Check if error is a build validation error
 */
export function isBuildValidationError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'BUILDS_NOT_READY';
}

/**
 * Check if error is a PM approval required error
 */
export function isPMApprovalRequired(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'PM_APPROVAL_REQUIRED';
}

/**
 * Check if error is an untested commits error
 */
export function isUntestedCommitsError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'UNTESTED_COMMITS';
}

/**
 * Check if error is a TestFlight processing error
 */
export function isTestFlightProcessingError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'TESTFLIGHT_BUILD_PROCESSING';
}

// ============================================================================
// ERROR HANDLING STRATEGIES
// ============================================================================

/**
 * Determine if error should show a modal dialog
 */
export function shouldShowModal(error: unknown): boolean {
  return (
    isVersionConflict(error) ||
    isExposureControlConflict(error) ||
    isPMApprovalRequired(error) ||
    isUntestedCommitsError(error)
  );
}

/**
 * Determine if error should show inline error message
 */
export function shouldShowInlineError(error: unknown): boolean {
  return (
    isValidationError(error) ||
    isBuildValidationError(error) ||
    isTestFlightProcessingError(error)
  );
}

/**
 * Determine if error should auto-retry
 */
export function shouldAutoRetry(error: unknown): boolean {
  return isNetworkError(error) || isServerError(error);
}

/**
 * Get suggested user action for error
 */
export function getSuggestedAction(error: unknown): string {
  const code = getErrorCode(error);
  
  if (isNetworkError(error)) {
    return 'Check your internet connection and try again';
  }
  
  if (isServerError(error)) {
    return 'Server error. Please try again in a few moments';
  }
  
  if (isVersionConflict(error)) {
    return 'Please resolve version conflict';
  }
  
  if (isExposureControlConflict(error)) {
    return 'Please resolve active rollout conflict';
  }
  
  if (isBuildValidationError(error)) {
    return 'Complete all required builds before proceeding';
  }
  
  if (isPMApprovalRequired(error)) {
    return 'Wait for PM approval or manually approve';
  }
  
  if (isTestFlightProcessingError(error)) {
    return 'Wait for Apple to finish processing TestFlight build';
  }
  
  if (code === 'FILE_TOO_LARGE') {
    return 'Reduce file size and try again';
  }
  
  if (code === 'INVALID_AAB_FILE') {
    return 'Upload a valid AAB file';
  }
  
  return 'Please try again or contact support';
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

/**
 * Log error with context
 */
export function logError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  
  console.error(`[Error${context ? ` - ${context}` : ''}]`, {
    message,
    code,
    error,
  });
  
  // In production, send to error tracking service (e.g., Sentry)
  if (import.meta.env.PROD) {
    // TODO: Send to error tracking service
    // Sentry.captureException(error, { tags: { context, code } });
  }
}

/**
 * Format error for display
 */
export function formatError(error: unknown): {
  title: string;
  message: string;
  code: string | null;
  action: string;
} {
  return {
    title: isServerError(error) ? 'Server Error' : 'Error',
    message: getErrorMessage(error),
    code: getErrorCode(error),
    action: getSuggestedAction(error),
  };
}

