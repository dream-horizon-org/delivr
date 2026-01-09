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

// SCM Provider IDs (lowercase - as they appear in connected integrations)
// These are the providerId values used in the frontend after backend transformation
// Backend transforms: scmType.toLowerCase() -> 'github', 'gitlab', 'bitbucket'
export const SCM_PROVIDER_IDS = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  BITBUCKET: 'bitbucket',
} as const;

// CI/CD Provider IDs (lowercase - as they appear in connected integrations)
// Backend transforms: providerType.toLowerCase() -> 'jenkins', 'github_actions'
export const CICD_PROVIDER_IDS = {
  JENKINS: 'jenkins',
  GITHUB_ACTIONS: 'github_actions',
} as const;

// Test Management Provider IDs (lowercase - as they appear in connected integrations)
// Backend transforms: providerType.toLowerCase() -> 'checkmate', 'testrail', 'xray', 'zephyr'
export const TEST_MANAGEMENT_PROVIDER_IDS = {
  CHECKMATE: 'checkmate',
  TESTRAIL: 'testrail',
  XRAY: 'xray',
  ZEPHYR: 'zephyr',
} as const;

// Project Management Provider IDs (lowercase - as they appear in connected integrations)
// Backend transforms: providerType.toLowerCase() -> 'jira'
export const PROJECT_MANAGEMENT_PROVIDER_IDS = {
  JIRA: 'jira',
} as const;

// Communication Provider IDs (lowercase - as they appear in connected integrations)
// Backend uses: PROVIDER_ID.SLACK -> 'slack'
export const COMMUNICATION_PROVIDER_IDS = {
  SLACK: 'slack',
} as const;

// App Distribution Provider IDs (lowercase - as they appear in connected integrations)
// Backend transforms: storeType.toLowerCase() -> 'app_store', 'play_store'
export const APP_DISTRIBUTION_PROVIDER_IDS = {
  APP_STORE: 'app_store',
  PLAY_STORE: 'play_store',
} as const;

// SCM API Endpoints
export const SCM_API_ENDPOINTS = {
  BRANCHES: (tenantId: string) => `/api/v1/tenants/${tenantId}/integrations/scm/branches`,
  BASE: (tenantId: string) => `/api/v1/tenants/${tenantId}/integrations/scm`,
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
// Integration Status Constants
// ============================================================================

export const INTEGRATION_STATUS_VALUES = {
  CONNECTED: 'connected',
  NOT_CONNECTED: 'not_connected',
  ERROR: 'error',
  PENDING: 'pending',
} as const;

export const INTEGRATION_STATUS_COLORS = {
  [INTEGRATION_STATUS_VALUES.NOT_CONNECTED]: 'gray',
  [INTEGRATION_STATUS_VALUES.CONNECTED]: 'green',
  [INTEGRATION_STATUS_VALUES.ERROR]: 'red',
  [INTEGRATION_STATUS_VALUES.PENDING]: 'yellow',
  // Backward compatibility aliases
  NOT_CONNECTED: 'gray',
  CONNECTED: 'green',
  ERROR: 'red',
  PENDING: 'yellow',
} as const;

export const INTEGRATION_STATUS_TEXT = {
  [INTEGRATION_STATUS_VALUES.NOT_CONNECTED]: 'Not Connected',
  [INTEGRATION_STATUS_VALUES.CONNECTED]: 'Connected',
  [INTEGRATION_STATUS_VALUES.ERROR]: 'Error',
  [INTEGRATION_STATUS_VALUES.PENDING]: 'Pending',
  // Backward compatibility aliases
  NOT_CONNECTED: 'Not Connected',
  CONNECTED: 'Connected',
  ERROR: 'Error',
  PENDING: 'Pending',
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

// ============================================================================
// Disconnect Configuration
// ============================================================================

export const DISCONNECT_CONFIG: Record<
  string,
  {
    message: string;
    endpoint: (tenantId: string, config?: any) => string;
  }
> = {
  slack: {
    message: 'Are you sure you want to disconnect Slack? This will stop all release notifications.',
    endpoint: (tenantId) => `/api/v1/tenants/${tenantId}/integrations/slack`,
  },
  jenkins: {
    message: 'Are you sure you want to disconnect Jenkins? This will stop all CI/CD pipeline integrations.',
    endpoint: (tenantId, config) => {
      if (!config?.id) throw new Error('Integration ID required for Jenkins');
      return `/api/v1/tenants/${tenantId}/integrations/ci-cd/jenkins`;
    },
  },
  github_actions: {
    message:
      'Are you sure you want to disconnect GitHub Actions? This will stop all workflow integrations.',
    endpoint: (tenantId, config) => {
      if (!config?.id) throw new Error('Integration ID required for GitHub Actions');
      return `/api/v1/tenants/${tenantId}/integrations/ci-cd/github-actions`;
    },
  },
  github: {
    message:
      'Are you sure you want to disconnect GitHub? This will stop all source control integrations.',
    endpoint: (tenantId) => `/api/v1/tenants/${tenantId}/integrations/scm`,
  },
  scm: {
    message:
      'Are you sure you want to disconnect Source Control? This will stop all repository integrations.',
    endpoint: (tenantId) => `/api/v1/tenants/${tenantId}/integrations/scm`,
  },
  jira: {
    message:
      'Are you sure you want to disconnect Jira? This will stop all project management integrations.',
    endpoint: (tenantId, config) => {
      if (!config?.id) throw new Error('Integration ID required for Jira');
      return `/api/v1/tenants/${tenantId}/integrations/project-management?integrationId=${config.id}`;
    },
  },
  checkmate: {
    message:
      'Are you sure you want to disconnect Checkmate? This will stop all test management integrations.',
    endpoint: (tenantId, config) => {
      if (!config?.id) throw new Error('Integration ID required for Checkmate');
      return `/api/v1/tenants/${tenantId}/integrations/test-management?integrationId=${config.id}`;
    },
  },
  play_store: {
    message:
      'Are you sure you want to disconnect Play Store? This will stop all app distribution integrations.',
    endpoint: (tenantId, config) => {
      const storeType = config?.storeType || 'play_store';
      const platform = config?.platform || 'ANDROID';
      return `/api/v1/tenants/${tenantId}/integrations/app-distribution/revoke?storeType=${storeType}&platform=${platform}`;
    },
  },
  app_store: {
    message:
      'Are you sure you want to disconnect App Store? This will stop all app distribution integrations.',
    endpoint: (tenantId, config) => {
      const storeType = config?.storeType || 'app_store';
      const platform = config?.platform || 'IOS';
      return `/api/v1/tenants/${tenantId}/integrations/app-distribution/revoke?storeType=${storeType}&platform=${platform}`;
    },
  },
} as const;

