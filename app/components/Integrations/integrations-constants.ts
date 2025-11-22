/**
 * Integrations Constants
 * Centralized constants for all Integration components
 */

import { IntegrationStatus } from '~/types/integrations';

// =============================================================================
// INTEGRATION STATUS
// =============================================================================

// Status color mapping
export const INTEGRATION_STATUS_COLORS: Record<IntegrationStatus, string> = {
  [IntegrationStatus.CONNECTED]: 'green',
  [IntegrationStatus.ERROR]: 'red',
  [IntegrationStatus.NOT_CONNECTED]: 'gray',
} as const;

// Status text mapping
export const INTEGRATION_STATUS_TEXT: Record<IntegrationStatus, string> = {
  [IntegrationStatus.CONNECTED]: 'Connected',
  [IntegrationStatus.ERROR]: 'Error',
  [IntegrationStatus.NOT_CONNECTED]: 'Not Connected',
} as const;

// =============================================================================
// DISCONNECT CONFIGURATION
// =============================================================================

// Integration disconnect configuration
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
    endpoint: (tenantId) => `/api/v1/tenants/${tenantId}/integrations/ci-cd/jenkins`,
  },
  github_actions: {
    message:
      'Are you sure you want to disconnect GitHub Actions? This will stop all workflow integrations.',
    endpoint: (tenantId) => `/api/v1/tenants/${tenantId}/integrations/ci-cd/github-actions`,
  },
  jira: {
    message:
      'Are you sure you want to disconnect Jira? This will stop all project management integrations.',
    endpoint: (tenantId, config) => {
      if (!config?.id) throw new Error('Integration ID required for Jira');
      return `/api/v1/tenants/${tenantId}/integrations/jira?integrationId=${config.id}`;
    },
  },
  checkmate: {
    message:
      'Are you sure you want to disconnect Checkmate? This will stop all test management integrations.',
    endpoint: (tenantId, config) => {
      if (!config?.id) throw new Error('Integration ID required for Checkmate');
      return `/api/v1/tenants/${tenantId}/integrations/test-management/checkmate/${config.id}`;
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

