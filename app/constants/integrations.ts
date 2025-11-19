/**
 * Shared Integration Constants
 * 
 * These constants can be used by both client and server code.
 * They define the valid values for integration types, statuses, etc.
 */

// ============================================================================
// Integration Type Constants
// ============================================================================

export const INTEGRATION_TYPES = {
  SCM: 'scm',
  TARGET_PLATFORM: 'targetPlatform',
  CICD: 'cicd',  // CI/CD integrations (Jenkins, GitHub Actions, etc.)
  PIPELINE: 'pipeline',  // Deprecated: Use CICD instead
  COMMUNICATION: 'communication',
} as const;

export const SCM_TYPES = {
  GITHUB: 'GITHUB',
  GITLAB: 'GITLAB',
  BITBUCKET: 'BITBUCKET',
} as const;

export const TARGET_PLATFORM_TYPES = {
  APP_STORE: 'APP_STORE',
  PLAY_STORE: 'PLAY_STORE',
} as const;

export const CICD_PROVIDER_TYPES = {
  GITHUB_ACTIONS: 'GITHUB_ACTIONS',
  JENKINS: 'JENKINS',
  CIRCLECI: 'CIRCLECI',
  GITLAB_CI: 'GITLAB_CI',
} as const;

// Deprecated: Use CICD_PROVIDER_TYPES instead
export const PIPELINE_TYPES = {
  GITHUB_ACTIONS: 'GITHUB_ACTIONS',
  JENKINS: 'JENKINS',
} as const;

export const COMMUNICATION_TYPES = {
  SLACK: 'SLACK',
  TEAMS: 'TEAMS',
  EMAIL: 'EMAIL',
} as const;

export const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  VALID: 'VALID',
  INVALID: 'INVALID',
  EXPIRED: 'EXPIRED',
} as const;

// ============================================================================
// Type Exports (for TypeScript)
// ============================================================================

export type IntegrationType = typeof INTEGRATION_TYPES[keyof typeof INTEGRATION_TYPES];
export type SCMType = typeof SCM_TYPES[keyof typeof SCM_TYPES];
export type TargetPlatformType = typeof TARGET_PLATFORM_TYPES[keyof typeof TARGET_PLATFORM_TYPES];
export type CICDProviderType = typeof CICD_PROVIDER_TYPES[keyof typeof CICD_PROVIDER_TYPES];
export type PipelineType = typeof PIPELINE_TYPES[keyof typeof PIPELINE_TYPES];  // Deprecated
export type CommunicationType = typeof COMMUNICATION_TYPES[keyof typeof COMMUNICATION_TYPES];
export type VerificationStatusType = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];

