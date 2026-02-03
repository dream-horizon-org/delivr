/**
 * Validation Utilities
 * Reusable validation helpers that return structured results
 * instead of sending HTTP responses directly
 */

import * as yup from 'yup';
import type { ValidationResult, ValidationError } from '~types/validation/validation-result.interface';

/**
 * Generic Yup validation helper
 * Returns structured ValidationResult instead of sending HTTP responses
 * 
 * This allows validation logic to be:
 * - Reusable in any context (HTTP, CLI, jobs, GraphQL, etc.)
 * - Easy to test (no need to mock Response objects)
 * - Clear control flow (controller explicitly handles results)
 * 
 * @param schema - Yup schema to validate against
 * @param data - Data to validate
 * @param options - Optional Yup validation options
 * @returns ValidationResult with either validated data or errors
 * 
 * @example
 * const result = await validateWithYup(userSchema, data);
 * if (!result.success) {
 *   return res.status(400).json(
 *     validationErrorsResponse('Validation failed', result.errors)
 *   );
 * }
 * const validData = result.data;
 */
export async function validateWithYup<T>(
  schema: yup.Schema<T>,
  data: unknown,
  options?: yup.ValidateOptions
): Promise<ValidationResult<T>> {
  try {
    const validated = await schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      ...options
    });
    
    return {
      success: true,
      data: validated
    };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      // Group errors by field
      const errorsByField = new Map<string, string[]>();
      
      error.inner.forEach((err) => {
        const field = err.path || 'unknown';
        if (!errorsByField.has(field)) {
          errorsByField.set(field, []);
        }
        errorsByField.get(field)!.push(err.message);
      });

      // Convert to array format
      const errors: ValidationError[] = Array.from(errorsByField.entries()).map(
        ([field, messages]) => ({ field, messages })
      );

      return {
        success: false,
        errors
      };
    }
    
    // Re-throw non-validation errors
    throw error;
  }
}
