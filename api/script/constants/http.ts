export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const RESPONSE_STATUS = {
  SUCCESS: true,
  FAILURE: false
} as const;

export const CONTENT_TYPE = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded'
} as const;


