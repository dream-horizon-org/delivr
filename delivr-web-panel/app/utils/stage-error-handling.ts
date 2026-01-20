/**
 * Stage Error Handling Utilities
 * Standardized error handling for stage components
 */

import { getApiErrorMessage } from './api-client';
import { showErrorToast } from './toast';

interface HandleStageErrorOptions {
  showToast?: boolean;
  logError?: boolean;
}

/**
 * Handles errors in stage components with consistent behavior
 * 
 * @param error - The error to handle
 * @param context - Description of what operation failed (e.g., "approve regression stage")
 * @param options - Configuration options
 * @returns The error message string
 */
export function handleStageError(
  error: unknown,
  context: string,
  options: HandleStageErrorOptions = {}
): string {
  const { showToast = true, logError = true } = options;
  const message = getApiErrorMessage(error, `Failed to ${context}`);

  if (showToast) {
    showErrorToast({ message });
  }

  if (logError && process.env.NODE_ENV === 'development') {
    console.error(`[Stage Error] ${context}:`, error);
  }

  return message;
}

