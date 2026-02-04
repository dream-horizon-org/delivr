/**
 * Centralized Environment Variable Constants
 *
 * All environment variable names and default values in one place.
 * Use these constants instead of inline process.env access.
 *
 * Usage:
 *   import { ENV_VARS, getEnvNumber, getEnvString } from '~constants/env';
 *   const timeout = getEnvNumber('JENKINS_PROBE_TIMEOUT_MS', 2000);
 */

/**
 * Environment variable names
 */
export const ENV_VARS = {
  // ============================================================================
  // Workflow Polling
  // ============================================================================
  WORKFLOW_POLL_INTERVAL_MINUTES: 'WORKFLOW_POLL_INTERVAL_MINUTES',

  // ============================================================================
  // Jenkins CI/CD Integration
  // ============================================================================
  /** Timeout for Jenkins probe/health check requests */
  JENKINS_PROBE_TIMEOUT_MS: 'JENKINS_PROBE_TIMEOUT_MS',
  /** Timeout for Jenkins queue status requests */
  JENKINS_QUEUE_TIMEOUT_MS: 'JENKINS_QUEUE_TIMEOUT_MS',
  /** Timeout for Jenkins build status requests */
  JENKINS_BUILD_TIMEOUT_MS: 'JENKINS_BUILD_TIMEOUT_MS',

  // ============================================================================
  // GitHub Actions CI/CD Integration
  // ============================================================================
  /** Timeout for GHA verify/connection requests */
  GHA_VERIFY_TIMEOUT_MS: 'GHA_VERIFY_TIMEOUT_MS',
  /** Timeout for GHA input validation requests */
  GHA_INPUTS_TIMEOUT_MS: 'GHA_INPUTS_TIMEOUT_MS',
  /** Timeout for GHA workflow dispatch requests */
  GHA_DISPATCH_TIMEOUT_MS: 'GHA_DISPATCH_TIMEOUT_MS',
  /** Timeout for GHA run status requests */
  GHA_STATUS_TIMEOUT_MS: 'GHA_STATUS_TIMEOUT_MS',
  /** Number of polling attempts to find GHA run after dispatch */
  GHA_RUN_POLL_ATTEMPTS: 'GHA_RUN_POLL_ATTEMPTS',
  /** Delay between GHA run polling attempts (ms) */
  GHA_RUN_POLL_DELAY_MS: 'GHA_RUN_POLL_DELAY_MS',
  /** Default git ref for GHA workflow dispatch */
  GHA_DEFAULT_REF: 'GHA_DEFAULT_REF',

  // ============================================================================
  // S3 Storage
  // ============================================================================
  S3_REGION: 'S3_REGION',
  S3_ENDPOINT: 'S3_ENDPOINT',
  S3_BUCKETNAME: 'S3_BUCKETNAME',

  // ============================================================================
  // Application
  // ============================================================================
  NODE_ENV: 'NODE_ENV',
  DEBUG: 'DEBUG',
  LOG_LEVEL: 'LOG_LEVEL',
  /** Enable authentication in development mode (default: false) */
  AUTH_ENABLED: 'AUTH_ENABLED'
} as const;

/**
 * Default values for environment variables
 */
export const ENV_DEFAULTS = {
  // Workflow Polling
  WORKFLOW_POLL_INTERVAL_MINUTES: 1,

  // Jenkins
  JENKINS_PROBE_TIMEOUT_MS: 2000,
  JENKINS_QUEUE_TIMEOUT_MS: 5000,
  JENKINS_BUILD_TIMEOUT_MS: 5000,

  // GitHub Actions
  GHA_VERIFY_TIMEOUT_MS: 6000,
  GHA_INPUTS_TIMEOUT_MS: 8000,
  GHA_DISPATCH_TIMEOUT_MS: 8000,
  GHA_STATUS_TIMEOUT_MS: 8000,
  GHA_RUN_POLL_ATTEMPTS: 10,
  GHA_RUN_POLL_DELAY_MS: 2000,
  GHA_DEFAULT_REF: 'main'
} as const;

/**
 * NODE_ENV values
 */
export const NODE_ENV_VALUES = {
  DEV: 'dev',
  PROD: 'prod'
} as const;

/**
 * Environment mode checks
 * 
 * These are evaluated once at module load time.
 * Use these instead of inline process.env.NODE_ENV checks.
 * NODE_ENV comparison is case-insensitive (e.g., 'DEV', 'dev', 'Dev' all work).
 * 
 * Usage:
 *   import { isDevEnv, isProdEnv } from '~constants/env';
 *   if (isDevEnv) { ... }
 */
const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
export const isDevEnv = nodeEnv === NODE_ENV_VALUES.DEV;
export const isProdEnv = nodeEnv === NODE_ENV_VALUES.PROD;

/**
 * Get numeric environment variable with default fallback.
 *
 * @param key - Environment variable name from ENV_VARS
 * @param defaultValue - Default value if not set or invalid
 * @returns Parsed number or default value
 */
export const getEnvNumber = (
  key: keyof typeof ENV_VARS,
  defaultValue: number
): number => {
  const value = process.env[ENV_VARS[key]];
  const hasValue = value !== undefined && value !== '';
  if (!hasValue) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  const isValidNumber = !isNaN(parsed);
  if (!isValidNumber) {
    return defaultValue;
  }

  return parsed;
};

/**
 * Get string environment variable with default fallback.
 *
 * @param key - Environment variable name from ENV_VARS
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 */
export const getEnvString = (
  key: keyof typeof ENV_VARS,
  defaultValue: string
): string => {
  const value = process.env[ENV_VARS[key]];
  const hasValue = value !== undefined && value !== '';
  return hasValue ? value : defaultValue;
};

/**
 * Check if environment variable is set (truthy string values)
 *
 * @param key - Environment variable name from ENV_VARS
 * @returns true if set to 'true', '1', or 'yes' (case-insensitive)
 */
export const getEnvBoolean = (
  key: keyof typeof ENV_VARS,
  defaultValue: boolean = false
): boolean => {
  const value = process.env[ENV_VARS[key]];
  const hasValue = value !== undefined && value !== '';
  if (!hasValue) {
    return defaultValue;
  }

  const truthyValues = ['true', '1', 'yes'];
  return truthyValues.includes(value.toLowerCase());
};

