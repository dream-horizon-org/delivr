export const formatErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback;
};

/**
 * Generic error handling utilities
 */

/**
 * Extract error message from unknown error type
 * @param error - The caught error
 * @param fallbackMessage - Default message if error is not an Error instance
 * @returns The error message string
 */
export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Extended Error interface with additional metadata
 */
export interface ErrorWithCode extends Error {
  code: string;
  statusCode?: number;
  details?: string[];
}

/**
 * Create an error with code and optional metadata (type-safe)
 */
export function createErrorWithCode(
  message: string,
  code: string,
  statusCode?: number,
  details?: string[]
): ErrorWithCode {
  const error = new Error(message) as ErrorWithCode;
  error.code = code;
  if (statusCode !== undefined) error.statusCode = statusCode;
  if (details !== undefined) error.details = details;
  return error;
}

/**
 * Type guard to check if error has code property
 */
export function hasErrorCode(error: unknown): error is ErrorWithCode {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as ErrorWithCode).code === 'string'
  );
}

