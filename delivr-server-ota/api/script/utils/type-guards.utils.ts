/**
 * Type guard to check if an object has a specific property
 * @param obj - The object to check
 * @param key - The property key to look for
 * @returns True if the object has the property
 */
export const hasProperty = <K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> => {
  const isObject = typeof obj === 'object';
  const isNotNull = obj !== null;
  const objIsValid = isObject && isNotNull;
  
  if (!objIsValid) {
    return false;
  }
  
  return key in obj;
};

