/**
 * Release Configuration Constants
 * Centralized constant values for platforms, environments, providers, etc.
 * 
 * Usage: Import these instead of hardcoding string literals
 * Example: `platform === PLATFORMS.ANDROID` instead of `platform === 'ANDROID'`
 */

// ============================================================================
// Platform Constants
// ============================================================================

export const PLATFORMS = {
  ANDROID: 'ANDROID',
  IOS: 'IOS',
} as const;

export type PlatformValue = typeof PLATFORMS[keyof typeof PLATFORMS];

// ============================================================================
// Target Platform Constants
// ============================================================================

export const TARGET_PLATFORMS = {
  WEB: 'WEB',
  PLAY_STORE: 'PLAY_STORE',
  APP_STORE: 'APP_STORE',
} as const;

export type TargetPlatformValue = typeof TARGET_PLATFORMS[keyof typeof TARGET_PLATFORMS];

// ============================================================================
// Build Environment Constants
// ============================================================================

export const BUILD_ENVIRONMENTS = {
  PRE_REGRESSION: 'PRE_REGRESSION',
  REGRESSION: 'REGRESSION',
  TESTFLIGHT: 'TESTFLIGHT',
  PRODUCTION: 'PRODUCTION',
} as const;

export type BuildEnvironmentValue = typeof BUILD_ENVIRONMENTS[keyof typeof BUILD_ENVIRONMENTS];

// ============================================================================
// Build Provider Constants
// ============================================================================

export const BUILD_PROVIDERS = {
  JENKINS: 'JENKINS',
  GITHUB_ACTIONS: 'GITHUB_ACTIONS',
  MANUAL_UPLOAD: 'MANUAL_UPLOAD',
} as const;

export type BuildProviderValue = typeof BUILD_PROVIDERS[keyof typeof BUILD_PROVIDERS];

// ============================================================================
// Build Upload Step Constants
// ============================================================================

export const BUILD_UPLOAD_STEPS = {
  MANUAL: 'MANUAL',
  CI_CD: 'CI_CD',
} as const;

export type BuildUploadStepValue = typeof BUILD_UPLOAD_STEPS[keyof typeof BUILD_UPLOAD_STEPS];

// ============================================================================
// Release Type Constants
// ============================================================================

export const RELEASE_TYPES = {
  PLANNED: 'PLANNED',
  HOTFIX: 'HOTFIX',
  MAJOR: 'MAJOR',
} as const;

export type ReleaseTypeValue = typeof RELEASE_TYPES[keyof typeof RELEASE_TYPES];

// ============================================================================
// Release Frequency Constants
// ============================================================================

export const RELEASE_FREQUENCIES = {
  WEEKLY: 'WEEKLY',
  BIWEEKLY: 'BIWEEKLY',
  TRIWEEKLY: 'TRIWEEKLY',
  MONTHLY: 'MONTHLY',
  CUSTOM: 'CUSTOM',
} as const;

export type ReleaseFrequencyValue = typeof RELEASE_FREQUENCIES[keyof typeof RELEASE_FREQUENCIES];

// ============================================================================
// Status Constants
// ============================================================================

export const CONFIG_STATUSES = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ConfigStatusValue = typeof CONFIG_STATUSES[keyof typeof CONFIG_STATUSES];

// ============================================================================
// Test Management Provider Constants
// ============================================================================

export const TEST_PROVIDERS = {
  CHECKMATE: 'checkmate',
  TESTRAIL: 'testrail',
  ZEPHYR: 'zephyr',
  NONE: 'none',
} as const;

export type TestProviderValue = typeof TEST_PROVIDERS[keyof typeof TEST_PROVIDERS];

// ============================================================================
// Integration Type Constants
// ============================================================================

export const INTEGRATION_TYPES = {
  JENKINS: 'JENKINS',
  GITHUB: 'GITHUB',
  SLACK: 'SLACK',
  CHECKMATE: 'CHECKMATE',
  JIRA: 'JIRA',
} as const;

export type IntegrationTypeValue = typeof INTEGRATION_TYPES[keyof typeof INTEGRATION_TYPES];

// ============================================================================
// Verification Status Constants
// ============================================================================

export const VERIFICATION_STATUSES = {
  VALID: 'VALID',
  INVALID: 'INVALID',
  PENDING: 'PENDING',
} as const;

export type VerificationStatusValue = typeof VERIFICATION_STATUSES[keyof typeof VERIFICATION_STATUSES];

// ============================================================================
// Slack Channel Config Mode Constants
// ============================================================================

export const SLACK_CHANNEL_MODES = {
  GLOBAL: 'GLOBAL',
  STAGE_WISE: 'STAGE_WISE',
} as const;

export type SlackChannelModeValue = typeof SLACK_CHANNEL_MODES[keyof typeof SLACK_CHANNEL_MODES];

// ============================================================================
// Jira Platform Constants (includes WEB)
// ============================================================================

export const JIRA_PLATFORMS = {
  WEB: 'WEB',
  IOS: 'IOS',
  ANDROID: 'ANDROID',
} as const;

export type JiraPlatformValue = typeof JIRA_PLATFORMS[keyof typeof JIRA_PLATFORMS];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a value is a valid platform
 */
export function isValidPlatform(value: string): value is PlatformValue {
  return Object.values(PLATFORMS).includes(value as PlatformValue);
}

/**
 * Check if a value is a valid target platform
 */
export function isValidTargetPlatform(value: string): value is TargetPlatformValue {
  return Object.values(TARGET_PLATFORMS).includes(value as TargetPlatformValue);
}

/**
 * Check if a value is a valid build environment
 */
export function isValidBuildEnvironment(value: string): value is BuildEnvironmentValue {
  return Object.values(BUILD_ENVIRONMENTS).includes(value as BuildEnvironmentValue);
}

/**
 * Check if a value is a valid build provider
 */
export function isValidBuildProvider(value: string): value is BuildProviderValue {
  return Object.values(BUILD_PROVIDERS).includes(value as BuildProviderValue);
}

