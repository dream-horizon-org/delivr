/**
 * Validation Result Types
 * Standard types for validation functions to return structured results
 * instead of sending HTTP responses directly
 */

/**
 * Generic validation result type
 * Used by all validation functions to return structured results
 * 
 * @example
 * const result = await validateCreateConfig(data);
 * if (!result.success) {
 *   res.status(400).json(validationErrorsResponse('Validation failed', result.errors));
 *   return;
 * }
 * const validData = result.data;
 */
export type ValidationResult<T> = 
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: ValidationError[];
    };

/**
 * Validation error structure
 * Contains field name and associated error messages
 */
export type ValidationError = {
  field: string;
  messages: string[];
};

/**
 * Field-specific validation error with error code
 * Used for more detailed validation feedback
 */
export type FieldValidationError = {
  field: string;
  errorCode: string;
  messages: string[];
};
