/**
 * Request/parameter utility functions
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


