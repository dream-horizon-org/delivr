/**
 * Global HTTP constants
 * Use these constants instead of hardcoded status codes
 */

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Generic response status indicators
 */
export const RESPONSE_STATUS = {
  SUCCESS: true,
  FAILURE: false
} as const;

