/**
 * Cronicle Service Constants
 */

export const CRONICLE_ERROR_MESSAGES = {
  CREATE_JOB_FAILED: 'Failed to create Cronicle job',
  UPDATE_JOB_FAILED: 'Failed to update Cronicle job',
  DELETE_JOB_FAILED: 'Failed to delete Cronicle job',
  GET_JOB_FAILED: 'Failed to get Cronicle job',
  GET_JOBS_FAILED: 'Failed to get Cronicle jobs',
  RUN_JOB_FAILED: 'Failed to run Cronicle job',
  ENABLE_JOB_FAILED: 'Failed to enable/disable Cronicle job',
  PING_FAILED: 'Failed to ping Cronicle server',
  INVALID_CONFIG: 'Invalid Cronicle service configuration',
  GET_CATEGORIES_FAILED: 'Failed to get Cronicle categories'
} as const;

export const CRONICLE_DEFAULTS = {
  TIMEZONE: 'UTC',
  TIMEOUT_SECONDS: 300,
  RETRIES: 3,
  RETRY_DELAY_SECONDS: 60,
  PLUGIN: 'urlplug',
  TARGET: 'allgrp'
} as const;

export const CRONICLE_API_ENDPOINTS = {
  PING: '/api/app/ping',
  CREATE_EVENT: '/api/app/create_event',
  UPDATE_EVENT: '/api/app/update_event',
  DELETE_EVENT: '/api/app/delete_event',
  GET_EVENT: '/api/app/get_event',
  RUN_EVENT: '/api/app/run_event',
  GET_SCHEDULE: '/api/app/get_schedule',
  GET_CATEGORIES: '/api/app/get_categories'
} as const;

export const CRONICLE_RESPONSE_CODES = {
  SUCCESS: 0
} as const;

