/**
 * String utility functions
 */

/**
 * Coerce an unknown value to an optional trimmed string.
 * Returns undefined when value is not a string or trims to empty.
 */
export const getTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

