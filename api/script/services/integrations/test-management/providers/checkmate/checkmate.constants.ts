/**
 * Checkmate Provider Constants
 * Provider-specific configuration values
 */

export const CHECKMATE_API_ENDPOINTS = {
  PROJECTS: '/api/v1/projects',
  SECTIONS: '/api/v1/project/sections',
  LABELS: '/api/v1/labels',
  SQUADS: '/api/v1/project/squads',
  CREATE_RUN: '/api/v1/run/create',
  RUN_STATE_DETAIL: '/api/v1/run/state-detail',
  RUN_RESET: '/api/v1/run/reset', // Reset Passed tests to Retest status
  RUN_DELETE: '/api/v1/run/delete',
  RUN_EDIT: '/api/v1/run/edit',
  RUN_LOCK: '/api/v1/run/lock'
} as const;

export const CHECKMATE_ERROR_MESSAGES = {
  API_ERROR_PREFIX: 'Checkmate API error',
  PROJECT_ID_REQUIRED: 'Checkmate projectId is required in platform parameters',
  CONFIG_VALIDATION_FAILED: 'Checkmate config validation failed',
  MISSING_BASE_URL: 'Checkmate baseUrl is required',
  MISSING_AUTH_TOKEN: 'Checkmate authToken is required',
  INVALID_URL_FORMAT: 'Checkmate baseUrl has invalid format',
  UNKNOWN_ERROR: 'Unknown error'
} as const;

export const CHECKMATE_URL_TEMPLATES = {
  PROJECT_RUN: '/project/:projectId/run/:runId',
  RUNS: '/runs/:runId'
} as const;

export const CHECKMATE_URL_PARAMS = {
  RUN_ID: ':runId',
  PROJECT_ID: ':projectId'
} as const;

export const CHECKMATE_QUERY_PARAMS = {
  RUN_ID: 'runId',
  GROUP_BY: 'groupBy',
  ORG_ID: 'orgId',
  PROJECT_ID: 'projectId',
  PAGE: 'page',
  PAGE_SIZE: 'pageSize'
} as const;

export const CHECKMATE_DEFAULTS = {
  RUN_NAME: 'Test Run',
  METADATA_PAGE_SIZE: 1000  // Default page size for fetching metadata (projects, sections, etc.)
} as const;
