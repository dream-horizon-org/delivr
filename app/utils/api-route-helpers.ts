/**
 * API Route Helper Utilities
 * Common patterns for API route handlers
 */

import { json } from '@remix-run/node';
import { HTTP_STATUS } from '~/constants/distribution/distribution-api.constants';
import { Platform } from '~/types/distribution/distribution.types';

/**
 * Standard error response structure
 */
interface ErrorResponse {
  success: false;
  error: string;
}

/**
 * Create a validation error response (400)
 */
export function createValidationError(message: string) {
  return json<ErrorResponse>(
    { success: false, error: message },
    { status: HTTP_STATUS.BAD_REQUEST }
  );
}

/**
 * Create an internal server error response (500)
 */
export function createServerError(message: string) {
  return json<ErrorResponse>(
    { success: false, error: message },
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  );
}

/**
 * Log API errors with context
 * Extracts only relevant information to avoid logging entire request/response objects
 */
export function logApiError(context: string, error: unknown): void {
  // Handle Axios errors
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as any;
    const errorInfo: Record<string, unknown> = {
      message: axiosError.message || 'Unknown error',
      code: axiosError.code,
    };

    // Add response info if available
    if (axiosError.response) {
      errorInfo.status = axiosError.response.status;
      errorInfo.statusText = axiosError.response.statusText;
      errorInfo.data = axiosError.response.data;
      errorInfo.url = axiosError.config?.url;
      errorInfo.method = axiosError.config?.method?.toUpperCase();
    } else if (axiosError.config) {
      // Request was made but no response (network error)
      errorInfo.url = axiosError.config.url;
      errorInfo.method = axiosError.config.method?.toUpperCase();
    }

    console.error(`${context} Error:`, errorInfo);
    return;
  }

  // Handle regular Error objects
  if (error instanceof Error) {
    console.error(`${context} Error:`, {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    return;
  }

  // Fallback for unknown error types
  console.error(`${context} Error:`, error);
}

/**
 * Handle axios errors and preserve status codes
 */
export function handleAxiosError(error: any, fallbackMessage: string) {
  if (error.response) {
    return json(error.response.data, { status: error.response.status });
  }

  const errorMessage = error instanceof Error ? error.message : fallbackMessage;
  return createServerError(errorMessage);
}

/**
 * Validate required parameter
 */
export function validateRequired(
  value: string | undefined | null,
  errorMessage: string
): value is string {
  return Boolean(value);
}

/**
 * Extract platform from query params
 */
export function extractPlatformFromQuery(request: Request): Platform | undefined {
  const url = new URL(request.url);
  const platformParam = url.searchParams.get('platform');

  if (!platformParam) {
    return undefined;
  }

  return platformParam === Platform.ANDROID || platformParam === Platform.IOS
    ? (platformParam as Platform)
    : undefined;
}

/**
 * Extract pagination params from query
 */
export function extractPaginationParams(request: Request): {
  limit: number | undefined;
  offset: number | undefined;
} {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

  return { limit, offset };
}

/**
 * Validate percentage range
 */
export function isValidPercentage(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

