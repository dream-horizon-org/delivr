/**
 * Pure Response Builder Functions
 * Highly testable, consistent API responses
 * GLOBAL UTILITY - Used across all API endpoints
 */

import { HTTP_STATUS } from '~constants/http';
import type { ErrorResponse, SuccessResponse, ErrorDetails } from './response.interface';
import type { ValidationError } from '~types/validation/validation-result.interface';

// Re-export types for backwards compatibility
export type { ErrorResponse, SuccessResponse, ErrorDetails };

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
 * @param error - The caught error
 * @param context - Optional context for logging
 * @returns ErrorResponse with generic error details
 */
export const errorResponse = (error: unknown, context?: string): ErrorResponse => {
  const message = error instanceof Error ? error.message : 'Unknown error occurred';

  if (context) {
    console.error(`${context}:`, message, error);
  }

  return {
    success: false,
    error: message,
    details: {
      errorCode: 'internal_server_error',
      messages: [message]
    }
  };
};

/**
 * Build detailed error response
 * Use this when you have specific error codes and messages
 * @param error - Human-readable error summary
 * @param errorCode - Machine-readable error code (snake_case)
 * @param messages - Array of error messages
 * @returns ErrorResponse with structured details
 * 
 * @example
 * detailedErrorResponse(
 *   'Configuration not found',
 *   'config_not_found',
 *   ['The requested CI/CD configuration does not exist']
 * )
 */
export const detailedErrorResponse = (
  error: string,
  errorCode: string,
  messages: string | string[]
): ErrorResponse => {
  return {
    success: false,
    error,
    details: {
      errorCode,
      messages: Array.isArray(messages) ? messages : [messages]
    }
  };
};

/**
 * Build multiple validation errors response
 * Use this when validation fails for multiple fields
 * @param error - Human-readable error summary
 * @param errors - Array of error details with fields
 * @returns ErrorResponse with array of error details
 * 
 * @example
 * validationErrorsResponse('Workflow validation failed', [
 *   { field: 'workflows[0].integrationId', errorCode: 'integration_not_found', messages: ['CI/CD integration not found'] }
 * ])
 */
export const validationErrorsResponse = (
  error: string,
  errors: Array<{ field?: string; errorCode: string; messages: string[] }>
): ErrorResponse => {
  return {
    success: false,
    error,
    details: errors
  };
};

/**
 * Build single validation error response
 * Use this for single field validation errors
 * @param field - Field that failed validation
 * @param message - Error message
 * @returns ErrorResponse with single error detail
 * 
 * @example
 * validationErrorResponse('integrationId', 'Integration ID is required')
 */
export const validationErrorResponse = (field: string, message: string): ErrorResponse => {
  return {
    success: false,
    error: 'Validation failed',
    details: {
      field,
      errorCode: 'validation_error',
      messages: [message]
    }
  };
};

/**
 * Build validation errors response from ValidationResult errors
 * Use this when validation returns structured ValidationError array
 * @param error - Human-readable error summary
 * @param errors - Array of ValidationError from validateWithYup
 * @returns ErrorResponse with validation errors
 * 
 * @example
 * const result = await validateWithYup(schema, data);
 * if (!result.success) {
 *   return res.status(400).json(
 *     buildValidationErrorResponse('Request validation failed', result.errors)
 *   );
 * }
 */
export const buildValidationErrorResponse = (
  error: string,
  errors: ValidationError[]
): ErrorResponse => {
  return {
    success: false,
    error,
    details: errors.map(err => ({
      field: err.field,
      errorCode: 'validation_failed',
      messages: err.messages
    }))
  };
};

/**
 * Build not found error response
 * @param resource - Name of the resource not found
 * @param errorCode - Optional custom error code (defaults to 'not_found')
 * @returns ErrorResponse with not found details
 * 
 * @example
 * notFoundResponse('CI/CD configuration', 'config_not_found')
 */
export const notFoundResponse = (
  resource: string,
  errorCode: string = 'not_found'
): ErrorResponse => {
  return {
    success: false,
    error: `${resource} not found`,
    details: {
      errorCode,
      messages: [`The requested ${resource.toLowerCase()} does not exist`]
    }
  };
};

/**
 * Build unauthorized error response
 * Use for 401 authentication errors
 * @param message - Optional custom message
 * @returns ErrorResponse with unauthorized details
 * 
 * @example
 * unauthorizedResponse('Authentication required')
 */
export const unauthorizedResponse = (message?: string): ErrorResponse => {
  return {
    success: false,
    error: message || 'Unauthorized',
    details: {
      errorCode: 'unauthorized',
      messages: [message || 'Authentication required']
    }
  };
};

/**
 * Build forbidden error response
 * Use for 403 authorization errors
 * @param message - Optional custom message
 * @param errorCode - Optional custom error code
 * @returns ErrorResponse with forbidden details
 * 
 * @example
 * forbiddenResponse('Integration does not belong to this tenant', 'integration_access_denied')
 */
export const forbiddenResponse = (
  message?: string,
  errorCode: string = 'access_denied'
): ErrorResponse => {
  return {
    success: false,
    error: message || 'Access denied',
    details: {
      errorCode,
      messages: [message || 'You do not have permission to access this resource']
    }
  };
};

/**
 * Build simple error response
 * Use when you only need error message without detailed structure
 * @param error - Error message
 * @param errorCode - Error code
 * @returns ErrorResponse with simple details
 * 
 * @example
 * simpleErrorResponse('Operation failed', 'operation_failed')
 */
export const simpleErrorResponse = (
  error: string,
  errorCode: string = 'error'
): ErrorResponse => {
  return {
    success: false,
    error,
    details: {
      errorCode,
      messages: [error]
    }
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
 * @param result - Verification result object
 * @returns Success or error response based on verification
 * 
 * @example
 * verificationResultToResponse({ isValid: true, message: 'Verified successfully' })
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
    details: {
      errorCode: 'verification_failed',
      messages: [result.message],
      ...(result.details && { metadata: result.details as Record<string, unknown> })
    }
  };
};

