/**
 * API Error Utilities
 * 
 * Centralized utilities for extracting and handling errors from API responses.
 * Handles both string and object error formats consistently.
 */

import type { ApiResponse } from './api-client';
import { getApiErrorMessage, ApiError } from './api-client';

/**
 * Error field type from ApiResponse
 */
type ApiErrorField = string | { code?: string; message?: string } | undefined;

/**
 * Extracts error message from ApiResponse error field
 * Handles both string and object formats
 * 
 * @param error - The error field from ApiResponse (string or object)
 * @param fallback - Fallback message if error cannot be extracted
 * @returns Extracted error message string
 * 
 * @example
 * ```ts
 * const result = await apiGet('/api/endpoint');
 * if (!result.success) {
 *   const errorMsg = extractApiErrorMessage(result.error, 'Operation failed');
 *   setError(errorMsg);
 * }
 * ```
 */
export function extractApiErrorMessage(
  error: ApiErrorField,
  fallback = 'An unexpected error occurred'
): string {
  if (!error) {
    return fallback;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return typeof error.message === 'string' && error.message
      ? error.message
      : fallback;
  }
  
  return fallback;
}

/**
 * Extracts error message from an ApiResponse object
 * Checks error field, message field, and data.message
 * 
 * @param response - The ApiResponse object
 * @param fallback - Fallback message if no error can be extracted
 * @returns Extracted error message string
 * 
 * @example
 * ```ts
 * const result = await apiPost('/api/endpoint', data);
 * if (!result.success) {
 *   const errorMsg = getResponseErrorMessage(result, 'Operation failed');
 *   throw new Error(errorMsg);
 * }
 * ```
 */
export function getResponseErrorMessage(
  response: ApiResponse<unknown>,
  fallback = 'An unexpected error occurred'
): string {
  // Try error field first
  if (response.error) {
    const errorMsg = extractApiErrorMessage(response.error);
    if (errorMsg !== 'An unexpected error occurred') {
      return errorMsg;
    }
  }
  
  // Try message field
  if (response.message && typeof response.message === 'string') {
    return response.message;
  }
  
  // Try data.message (some APIs return error in data)
  if (response.data && typeof response.data === 'object' && 'message' in response.data) {
    const dataMessage = (response.data as { message?: unknown }).message;
    if (typeof dataMessage === 'string' && dataMessage) {
      return dataMessage;
    }
  }
  
  return fallback;
}

/**
 * Extracts error message from thrown errors or ApiResponse
 * Handles Error, ApiError, and ApiResponse objects
 * 
 * @param error - Error object, ApiResponse, or unknown
 * @param fallback - Fallback message if error cannot be extracted
 * @returns Extracted error message string
 * 
 * @example
 * ```ts
 * try {
 *   const result = await apiPost('/api/endpoint', data);
 *   if (!result.success) {
 *     throw handleApiError(result, 'Operation failed');
 *   }
 * } catch (error) {
 *   const errorMsg = extractErrorMessage(error, 'Operation failed');
 *   setError(errorMsg);
 * }
 * ```
 */
export function extractErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred'
): string {
  // Handle ApiResponse objects
  if (error && typeof error === 'object' && 'success' in error && 'error' in error) {
    return getResponseErrorMessage(error as ApiResponse<unknown>, fallback);
  }
  
  // Use existing getApiErrorMessage for Error/ApiError
  return getApiErrorMessage(error, fallback);
}

/**
 * Creates an Error from ApiResponse
 * Extracts the error message and creates a new Error instance
 * 
 * @param response - The ApiResponse object
 * @param fallback - Fallback message if error cannot be extracted
 * @returns Error instance with extracted message
 * 
 * @example
 * ```ts
 * const result = await apiPost('/api/endpoint', data);
 * if (!result.success) {
 *   throw createErrorFromResponse(result, 'Operation failed');
 * }
 * ```
 */
export function createErrorFromResponse(
  response: ApiResponse<unknown>,
  fallback = 'An unexpected error occurred'
): Error {
  const message = getResponseErrorMessage(response, fallback);
  return new Error(message);
}

/**
 * Gets error code from ApiResponse error field
 * 
 * @param error - The error field from ApiResponse
 * @returns Error code string or undefined
 * 
 * @example
 * ```ts
 * const result = await apiGet('/api/endpoint');
 * if (!result.success && result.error) {
 *   const errorCode = getApiErrorCode(result.error);
 *   console.log('Error code:', errorCode);
 * }
 * ```
 */
export function getApiErrorCode(error: ApiErrorField): string | undefined {
  if (!error) {
    return undefined;
  }
  
  if (typeof error === 'string') {
    return undefined;
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    return typeof error.code === 'string' ? error.code : undefined;
  }
  
  return undefined;
}


export function extractApiErrorWithResponse(
  error: unknown,
  fallback = 'An unexpected error occurred'
): string {
  // Start with basic error extraction
  let errorMessage = getApiErrorMessage(error, fallback);
  
  // Check if error is ApiError with response property
  if (error instanceof ApiError && error.response) {
    const response = error.response;
    if (response && typeof response === 'object') {
      // Try to extract message from response
      if ('message' in response && typeof response.message === 'string') {
        errorMessage = response.message;
      } else if ('error' in response) {
        const errorField = response.error;
        if (typeof errorField === 'string') {
          errorMessage = errorField;
        } else if (errorField && typeof errorField === 'object' && 'message' in errorField && typeof errorField.message === 'string') {
          errorMessage = errorField.message || errorMessage;
        }
      }
    }
  }
  
  // If error message is JSON string, try to parse and extract message
  try {
    const parsed = JSON.parse(errorMessage);
    if (parsed && typeof parsed === 'object' && 'message' in parsed) {
      errorMessage = parsed.message || errorMessage;
    }
  } catch {
    // Not JSON, use as is
  }
  
  return errorMessage;
}

