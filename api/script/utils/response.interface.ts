/**
 * Response Type Definitions
 * Used by response.utils.ts
 */

export type SuccessResponse<T> = {
  success: true;
  data?: T;
  message?: string;
};

export type ErrorResponse = {
  success: false;
  error: string;
  code?: string;
  field?: string;
  details?: Record<string, unknown>;
};

