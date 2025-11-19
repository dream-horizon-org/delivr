/**
 * Pure Response Builder Functions
 * Highly testable, consistent API responses
 * GLOBAL UTILITY - Used across all API endpoints
 */

import { HTTP_STATUS } from '~constants/http';
import type { ErrorResponse, SuccessResponse } from './response.interface';

// Re-export types for backwards compatibility
export type { ErrorResponse, SuccessResponse };

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

/**
 * Build success response with data
 */
export const successResponse = <T>(data: T, message?: string): SuccessResponse<T> => {
  return {
    success: true,
    data,
    ...(message && { message })
  };
};

/**
 * Build success response with message only
 */
export const successMessageResponse = (message: string): SuccessResponse<undefined> => {
  return {
    success: true,
    message
  };
};

/**
 * Build error response from unknown error
 */
export const errorResponse = (error: unknown, context?: string): ErrorResponse => {
  const message = error instanceof Error ? error.message : 'Unknown error occurred';

  if (context) {
    console.error(`${context}:`, message, error);
  }

  return {
    success: false,
    error: message
  };
};

/**
 * Build validation error response
 */
export const validationErrorResponse = (field: string, message: string): ErrorResponse => {
  return {
    success: false,
    error: message,
    field
  };
};

/**
 * Build configuration error response
 */
export const configurationErrorResponse = (message: string, details?: Record<string, unknown>): ErrorResponse => {
  return {
    success: false,
    error: message,
    code: 'CONFIGURATION_ERROR',
    ...(details && { details })
  };
};

/**
 * Build not found error response
 */
export const notFoundResponse = (resource: string): ErrorResponse => {
  return {
    success: false,
    error: `${resource} not found`,
    code: 'NOT_FOUND'
  };
};

// ============================================================================
// HTTP STATUS CODE HELPERS
// ============================================================================

/**
 * Get appropriate HTTP status code for error
 */
export const getErrorStatusCode = (error: unknown): number => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    const isNotFoundError = message.includes('not found');
    if (isNotFoundError) return HTTP_STATUS.NOT_FOUND;

    const isAuthError = message.includes('unauthorized') || message.includes('authentication');
    if (isAuthError) return HTTP_STATUS.UNAUTHORIZED;

    const isForbiddenError = message.includes('forbidden') || message.includes('permission');
    if (isForbiddenError) return HTTP_STATUS.FORBIDDEN;

    const isValidationError = message.includes('invalid') || message.includes('required');
    if (isValidationError) return HTTP_STATUS.BAD_REQUEST;

    const isTimeoutError = message.includes('timeout');
    if (isTimeoutError) return HTTP_STATUS.TIMEOUT;

    const isRateLimitError = message.includes('rate limit');
    if (isRateLimitError) return HTTP_STATUS.TOO_MANY_REQUESTS;
  }

  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
};

// ============================================================================
// RESPONSE TRANSFORMERS
// ============================================================================

/**
 * Transform verification result to API response
 */
export const verificationResultToResponse = (result: {
  isValid: boolean;
  message: string;
  details?: unknown;
}): SuccessResponse<unknown> | ErrorResponse => {
  if (result.isValid) {
    return {
      success: true,
      message: result.message,
      data: { verified: true, ...(result.details && { details: result.details }) }
    };
  }

  return {
    success: false,
    error: result.message,
    ...(result.details && { details: result.details as Record<string, unknown> })
  };
};

