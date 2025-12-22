/**
 * String utility functions
 */

/**
 * Coerce an unknown value to an optional trimmed string.
 * Returns undefined when value cannot be converted to a non-empty string.
 * Handles strings, numbers, and other types that can be converted to strings.
 */
export const getTrimmedString = (value: unknown): string | undefined => {
  // Handle strings directly
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  
  // Handle numbers (common case: JSON parser converts "24472" to 24472)
  if (typeof value === 'number') {
    const stringValue = String(value);
    return stringValue.length > 0 ? stringValue : undefined;
  }
  
  // Handle other types that can be converted to strings
  if (value === null || value === undefined) {
    return undefined;
  }
  
  // Try to convert to string for other types (boolean, etc.)
  try {
    const stringValue = String(value).trim();
    return stringValue.length > 0 ? stringValue : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Check if a value is a non-empty string (after trimming)
 */
export const isNonEmptyString = (value: unknown): value is string => {
  const isString = typeof value === 'string';
  if (!isString) {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.length > 0;
};

export const removeTrailingSlash = (value: string): string => {
  if(value.endsWith('/')) {
    return value.slice(0, -1);
  }
  return value;
};

