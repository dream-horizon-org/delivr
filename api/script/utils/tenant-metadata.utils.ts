/**
 * Tenant Metadata Utilities
 * Transformation logic for building tenant-specific metadata responses
 */

import {
  INTEGRATION_TYPE,
  COMMUNICATION_TYPE,
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_VERIFICATION_STATUS,
  PROVIDER_ID,
  TENANT_PLATFORMS,
  TENANT_TARGETS,
  TENANT_RELEASE_TYPES,
  SYSTEM_USER,
} from './tenant-metadata.constants';
import { IntegrationStatus } from '~storage/integrations/store/store-types';
import type * as storageTypes from '../storage/storage';
import { getAccountDetails } from './account.utils';

// ============================================================================
// TYPES
// ============================================================================

export interface SanitizedIntegration {
  type: string;
  id: string;
  [key: string]: any;
}

export interface TenantConfigResponse {
  connectedIntegrations: {
    SOURCE_CONTROL: any[];
    COMMUNICATION: any[];
    CI_CD: any[];
    TEST_MANAGEMENT: any[];
    PROJECT_MANAGEMENT: any[];
    APP_DISTRIBUTION: any[];
  };
  enabledPlatforms: string[];
  enabledTargets: string[];
  allowedReleaseTypes: string[];
}

// ============================================================================
// INTEGRATION TRANSFORMATIONS
// ============================================================================

/**
 * Sanitize SCM integration - remove sensitive data
 */
export function sanitizeScmIntegration(integration: any): SanitizedIntegration {
  return {
    type: INTEGRATION_TYPE.SCM,
    id: integration.id,
    scmType: integration.scmType,
    displayName: integration.displayName,
    owner: integration.owner,
    repo: integration.repo,
    repositoryUrl: integration.repositoryUrl,
    defaultBranch: integration.defaultBranch,
    isActive: integration.isActive,
    verificationStatus: integration.verificationStatus,
    lastVerifiedAt: integration.lastVerifiedAt,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
    // Note: accessToken, webhookSecret are intentionally excluded
  };
}

/**
 * Sanitize CI/CD integration - remove sensitive data
 */
export function sanitizeCicdIntegration(integration: any): SanitizedIntegration {
  return {
    type: INTEGRATION_TYPE.CI_CD,
    id: integration.id,
    providerType: integration.providerType,
    displayName: integration.displayName,
    hostUrl: integration.hostUrl,
    authType: integration.authType,
    username: integration.username,
    headerName: integration.headerName,
    providerConfig: integration.providerConfig,
    verificationStatus: integration.verificationStatus,
    verificationError: integration.verificationError,
    lastVerifiedAt: integration.lastVerifiedAt,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
    // Note: apiToken, headerValue are intentionally excluded (never sent to client)
  };
}

/**
 * Sanitize test management integration - remove sensitive data
 */
export function sanitizeTestManagementIntegration(integration: any): SanitizedIntegration {
  return {
    type: INTEGRATION_TYPE.TEST_MANAGEMENT,
    id: integration.id,
    providerType: integration.providerType,
    name: integration.name,
    tenantId: integration.tenantId,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
    // Note: config (including authToken) is intentionally excluded (never sent to client)
  };
}

/**
 * Sanitize project management integration - remove sensitive data
 */
export function sanitizeProjectManagementIntegration(integration: any): SanitizedIntegration {
  return {
    type: INTEGRATION_TYPE.PROJECT_MANAGEMENT,
    id: integration.id,
    providerType: integration.providerType,
    name: integration.name,
    projectId: integration.projectId,
    isEnabled: integration.isEnabled,
    verificationStatus: integration.verificationStatus,
    lastVerifiedAt: integration.lastVerifiedAt,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
    // Note: config (including apiToken, email) is intentionally excluded (never sent to client)
  };
}

/**
 * Sanitize app distribution integration - remove sensitive data
 */
export function sanitizeAppDistributionIntegration(integration: any): SanitizedIntegration {
  return {
    type: INTEGRATION_TYPE.APP_DISTRIBUTION,
    id: integration.id,
    storeType: integration.storeType,
    platform: integration.platform,
    displayName: integration.displayName,
    appIdentifier: integration.appIdentifier,
    status: integration.status,
    lastVerifiedAt: integration.lastVerifiedAt,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
    // Note: credentials are intentionally excluded (never sent to client)
  };
}

/**
 * Sanitize Slack/Communication integration - remove sensitive data
 */
export function sanitizeSlackIntegration(integration: any): SanitizedIntegration {
  return {
    type: INTEGRATION_TYPE.COMMUNICATION,
    communicationType: COMMUNICATION_TYPE.SLACK,
    id: integration.id,
    workspaceName: integration.slackWorkspaceName,
    workspaceId: integration.slackWorkspaceId,
    botUserId: integration.slackBotUserId,
    verificationStatus: integration.verificationStatus,
    hasValidToken: integration.verificationStatus === INTEGRATION_VERIFICATION_STATUS.VALID,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
    // Note: slackBotToken is intentionally excluded (never sent to client)
  };
}

// ============================================================================
// TENANT CONFIG TRANSFORMATIONS
// ============================================================================

/**
 * Transform SCM integrations to tenant config format
 */
export async function transformScmIntegrationsForConfig(
  scmIntegrations: any[],
  storage: storageTypes.Storage
): Promise<any[]> {
  return Promise.all(
    scmIntegrations.map(async (i: any) => {
      const accountDetails = await getAccountDetails(
        storage,
        i.createdByAccountId,
        'Transform SCM Integrations'
      );
      return {
        id: i.id,
        providerId: i.scmType.toLowerCase(),
        name: i.displayName,
        displayName: i.displayName,
        status: i.isActive ? INTEGRATION_CONNECTION_STATUS.CONNECTED : INTEGRATION_CONNECTION_STATUS.DISCONNECTED,
        config: {
          ...(i.displayName && { displayName: i.displayName }),
          owner: i.owner,
          repo: i.repo,
          defaultBranch: i.defaultBranch,
          repositoryUrl: i.repositoryUrl,
        },
        verificationStatus: i.verificationStatus || INTEGRATION_VERIFICATION_STATUS.UNKNOWN,
        connectedAt: i.createdAt,
        connectedBy: accountDetails?.email ?? i.createdByAccountId ?? SYSTEM_USER,
      };
    })
  );
}

/**
 * Transform Slack integration to tenant config format
 */
export async function transformSlackIntegrationForConfig(
  slackIntegration: any | null,
  storage: storageTypes.Storage
): Promise<any[]> {
  if (!slackIntegration) {
    return [];
  }

  const accountDetails = await getAccountDetails(
    storage,
    slackIntegration.createdByAccountId,
    'Transform Slack Integration'
  );

  return [{
    id: slackIntegration.id,
    providerId: PROVIDER_ID.SLACK,
    name: slackIntegration.slackWorkspaceName || 'Slack Workspace',
    status: slackIntegration.verificationStatus === INTEGRATION_VERIFICATION_STATUS.VALID 
      ? INTEGRATION_CONNECTION_STATUS.CONNECTED 
      : INTEGRATION_CONNECTION_STATUS.DISCONNECTED,
    config: {
      workspaceId: slackIntegration.slackWorkspaceId,
      workspaceName: slackIntegration.slackWorkspaceName,
      botUserId: slackIntegration.slackBotUserId,
      channels: slackIntegration.slackChannels || [],
    },
    verificationStatus: slackIntegration.verificationStatus || 'UNKNOWN',
    connectedAt: slackIntegration.createdAt,
    connectedBy: accountDetails?.email ?? slackIntegration.createdByAccountId ?? 'System',
  }];
}

/**
 * Transform CI/CD integrations to tenant config format
 */
export async function transformCicdIntegrationsForConfig(
  cicdIntegrations: any[],
  storage: storageTypes.Storage
): Promise<any[]> {
  return Promise.all(
    cicdIntegrations.map(async (i: any) => {
      const accountDetails = await getAccountDetails(
        storage,
        i.createdByAccountId,
        'Transform CI/CD Integrations'
      );
      return {
        id: i.id,
        providerId: i.providerType.toLowerCase(),
        name: i.displayName,
        displayName: i.displayName,
        status: i.verificationStatus === INTEGRATION_VERIFICATION_STATUS.VALID 
          ? INTEGRATION_CONNECTION_STATUS.CONNECTED 
          : INTEGRATION_CONNECTION_STATUS.DISCONNECTED,
        config: {
          ...(i.displayName && { displayName: i.displayName }),
          hostUrl: i.hostUrl,
          authType: i.authType,
          username: i.username,
          providerConfig: i.providerConfig,
        },
        verificationStatus: i.verificationStatus || INTEGRATION_VERIFICATION_STATUS.UNKNOWN,
        connectedAt: i.createdAt,
        connectedBy: accountDetails?.email ?? i.createdByAccountId ?? SYSTEM_USER,
      };
    })
  );
}

/**
 * Transform test management integrations to tenant config format
 */
export async function transformTestManagementIntegrationsForConfig(
  testManagementIntegrations: any[],
  storage: storageTypes.Storage
): Promise<any[]> {
  return Promise.all(
    testManagementIntegrations.map(async (i: any) => {
      const accountDetails = await getAccountDetails(
        storage,
        i.createdByAccountId,
        'Transform Test Management Integrations'
      );
      return {
        id: i.id,
        providerId: i.providerType.toLowerCase(),
        name: i.name,
        status: INTEGRATION_CONNECTION_STATUS.CONNECTED, // If it exists in DB, it's connected
        config: {
          name: i.name,
          providerType: i.providerType,
          tenantId: i.tenantId,
          baseUrl: i.config?.baseUrl,
          orgId: i.config?.orgId,
          // Don't expose sensitive config data (like authToken)
        },
        connectedAt: i.createdAt,
        connectedBy: accountDetails?.email ?? i.createdByAccountId ?? 'System',
      };
    })
  );
}

/**
 * Transform project management integrations to tenant config format
 */
export async function transformProjectManagementIntegrationsForConfig(
  projectManagementIntegrations: any[],
  storage: storageTypes.Storage
): Promise<any[]> {
  return Promise.all(
    projectManagementIntegrations.map(async (i: any) => {
      const accountDetails = await getAccountDetails(
        storage,
        i.createdByAccountId,
        'Transform Project Management Integrations'
      );
      return {
        id: i.id,
        providerId: i.providerType.toLowerCase(),
        name: i.name,
        status: i.isEnabled 
          ? INTEGRATION_CONNECTION_STATUS.CONNECTED 
          : INTEGRATION_CONNECTION_STATUS.DISCONNECTED,
        config: {
          providerType: i.providerType,
          projectId: i.projectId,
          baseUrl: i.config?.baseUrl,
          jiraType: i.config?.jiraType, // JIRA-specific: CLOUD, SERVER, DATA_CENTER
          // Don't expose sensitive config data (like apiToken, email)
        },
        verificationStatus: i.verificationStatus || INTEGRATION_VERIFICATION_STATUS.NOT_VERIFIED,
        connectedAt: i.createdAt,
        connectedBy: accountDetails?.email ?? i.createdByAccountId ?? 'System',
      };
    })
  );
}

/**
 * Transform app distribution integrations to tenant config format
 */
export async function transformAppDistributionIntegrationsForConfig(
  storeIntegrations: any[],
  storage: storageTypes.Storage
): Promise<any[]> {
  return Promise.all(
    storeIntegrations.map(async (i: any) => {
      const accountDetails = await getAccountDetails(
        storage,
        i.createdByAccountId,
        'Transform App Distribution Integrations'
      );
      return {
        id: i.id,
        providerId: i.storeType.toLowerCase(), // Maps to PROVIDER_ID.PLAY_STORE or PROVIDER_ID.APP_STORE
        name: i.displayName,
        displayName: i.displayName,
        status: i.status === IntegrationStatus.VERIFIED 
          ? INTEGRATION_CONNECTION_STATUS.CONNECTED 
          : INTEGRATION_CONNECTION_STATUS.DISCONNECTED,
        config: {
          ...(i.displayName && { displayName: i.displayName }),
          storeType: i.storeType,
          platform: i.platform,
          appIdentifier: i.appIdentifier,
          targetAppId: i.targetAppId || null,
          defaultTrack: i.defaultTrack || null,
          defaultLocale: i.defaultLocale || null,
          teamName: i.teamName || null,
        },
        verificationStatus: i.status, // PENDING, VERIFIED, REVOKED
        connectedAt: i.createdAt,
        connectedBy: accountDetails?.email ?? i.createdByAccountId ?? 'System',
      };
    })
  );
}

/**
 * Build tenant config response
 */
export async function buildTenantConfig(
  scmIntegrations: any[],
  slackIntegration: any | null,
  cicdIntegrations: any[],
  testManagementIntegrations: any[],
  projectManagementIntegrations: any[],
  storeIntegrations: any[],
  storage: storageTypes.Storage
): Promise<TenantConfigResponse> {
  const [
    transformedScmIntegrations,
    transformedSlackIntegration,
    transformedCicdIntegrations,
    transformedTestManagementIntegrations,
    transformedProjectManagementIntegrations,
    transformedStoreIntegrations
  ] = await Promise.all([
    transformScmIntegrationsForConfig(scmIntegrations, storage),
    transformSlackIntegrationForConfig(slackIntegration, storage),
    transformCicdIntegrationsForConfig(cicdIntegrations, storage),
    transformTestManagementIntegrationsForConfig(testManagementIntegrations, storage),
    transformProjectManagementIntegrationsForConfig(projectManagementIntegrations, storage),
    transformAppDistributionIntegrationsForConfig(storeIntegrations, storage)
  ]);

  return {
    connectedIntegrations: {
      SOURCE_CONTROL: transformedScmIntegrations,
      COMMUNICATION: transformedSlackIntegration,
      CI_CD: transformedCicdIntegrations,
      TEST_MANAGEMENT: transformedTestManagementIntegrations,
      PROJECT_MANAGEMENT: transformedProjectManagementIntegrations,
      APP_DISTRIBUTION: transformedStoreIntegrations,
    },
    enabledPlatforms: [TENANT_PLATFORMS.ANDROID, TENANT_PLATFORMS.IOS], // TODO: Make this dynamic based on tenant settings
    enabledTargets: [TENANT_TARGETS.APP_STORE, TENANT_TARGETS.PLAY_STORE, TENANT_TARGETS.WEB], // TODO: Make this dynamic
    allowedReleaseTypes: [TENANT_RELEASE_TYPES.MINOR, TENANT_RELEASE_TYPES.HOTFIX, TENANT_RELEASE_TYPES.MAJOR], // TODO: Make this dynamic
  };
}

