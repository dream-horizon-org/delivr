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

