/**
 * Response Type Definitions
 * Used by response.utils.ts
 */

/**
 * Success Response Format
 * Used for all successful API responses
 */
export type SuccessResponse<T = unknown> = {
  success: true;
  data?: T;              // Response data (optional for operations like DELETE)
  message?: string;      // Optional success message
};

/**
 * Error Response Format
 * Used for all error API responses
 */
export type ErrorResponse = {
  success: false;
  error: string;         // Human-readable error summary
  details: ErrorDetails | ErrorDetails[];  // Structured error info (single or array)
};

/**
 * Error Details Structure
 * Provides structured, machine-readable error information
 */
export type ErrorDetails = {
  errorCode: string;     // Machine-readable code (snake_case: 'integration_not_found')
  messages: string[];    // Error messages (always array, even for single message)
  field?: string;        // Optional: field that caused error (e.g., 'workflows[0].integrationId')
  metadata?: Record<string, unknown>;  // Optional: additional context
};

