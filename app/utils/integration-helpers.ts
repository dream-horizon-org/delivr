/**
 * Integration Helper Utilities
 * Transform integration data for UI components
 */

import type { Integration } from '~/contexts/TenantContext';
import type { PlayStorePayload, AppStorePayload } from '~/types/app-distribution';

export interface AvailableIntegrations {
  jenkins: Array<{ id: string; name: string }>;
  github: Array<{ id: string; name: string }>;
  slack: Array<{ id: string; name: string }>;
  jira: Array<{ id: string; name: string }>;
  checkmate: Array<{ 
    id: string; 
    name: string; 
    workspaceId?: string;
    baseUrl?: string;
    orgId?: string;
  }>;
}

/**
 * Transform raw integrations into UI-ready format
 * Groups integrations by type and only includes connected ones
 */
export function transformIntegrationsForUI(
  integrations: Integration[]
): AvailableIntegrations {
  const connected = integrations.filter(i => i.status === 'CONNECTED');

  return {
    jenkins: connected
      .filter(i => i.type === 'JENKINS')
      .map(i => ({ id: i.id, name: i.name })),
    
    github: connected
      .filter(i => i.type === 'GITHUB')
      .map(i => ({ id: i.id, name: i.name })),
    
    slack: connected
      .filter(i => i.type === 'SLACK')
      .map(i => ({ id: i.id, name: i.name })),
    
    jira: connected
      .filter(i => i.type === 'JIRA')
      .map(i => ({ id: i.id, name: i.name })),
    
    checkmate: connected
      .filter(i => i.type === 'CHECKMATE')
      .map(i => ({
        id: i.id,
        name: i.name,
        workspaceId: i.metadata?.workspaceId || i.metadata?.orgId,  // Support both field names
        baseUrl: i.metadata?.baseUrl,
        orgId: i.metadata?.orgId,
      })),
  };
}

/**
 * Check if specific integration types are available
 */
export function hasRequiredIntegrations(
  integrations: Integration[],
  required: Integration['type'][]
): boolean {
  const connected = integrations.filter(i => i.status === 'CONNECTED');
  return required.every(type => 
    connected.some(i => i.type === type)
  );
}

/**
 * Get missing integrations for a configuration
 */
export function getMissingIntegrations(
  integrations: Integration[],
  required: Integration['type'][]
): Integration['type'][] {
  const connected = integrations.filter(i => i.status === 'CONNECTED');
  return required.filter(type => 
    !connected.some(i => i.type === type)
  );
}

/**
 * Map existing integration data to Play Store form fields
 * Handles both direct fields and nested config structure
 */
export function mapPlayStoreFormData(existingData?: any): Partial<PlayStorePayload> {
  if (!existingData) {
    return {
      displayName: '',
      appIdentifier: '',
      defaultTrack: 'INTERNAL',
      serviceAccountJson: {
        type: 'service_account',
        project_id: '',
        client_email: '',
        private_key: '', // Never prefill private keys
      },
    };
  }

  return {
    displayName: existingData.displayName || existingData.name || '',
    appIdentifier: existingData.appIdentifier || '',
    defaultTrack: existingData.defaultTrack || 'INTERNAL',
    serviceAccountJson: {
      type: 'service_account',
      project_id: existingData.serviceAccountJson?.project_id || existingData.config?.project_id || '',
      client_email: existingData.serviceAccountJson?.client_email || existingData.config?.client_email || '',
      private_key: '', // Never prefill private keys
    },
  };
}

/**
 * Map existing integration data to App Store form fields
 * Handles both direct fields and nested config structure
 */
export function mapAppStoreFormData(existingData?: any): Partial<AppStorePayload> {
  if (!existingData) {
    return {
      displayName: '',
      targetAppId: '',
      appIdentifier: '',
      issuerId: '',
      keyId: '',
      privateKeyPem: '', // Never prefill private keys
      teamName: '',
      defaultLocale: 'en-US',
    };
  }

  return {
    displayName: existingData.displayName || existingData.name || '',
    targetAppId: existingData.targetAppId || existingData.config?.targetAppId || '',
    appIdentifier: existingData.appIdentifier || existingData.config?.appIdentifier || '',
    issuerId: existingData.issuerId || existingData.config?.issuerId || '',
    keyId: existingData.keyId || existingData.config?.keyId || '',
    privateKeyPem: '', // Never prefill private keys
    teamName: existingData.teamName || existingData.config?.teamName || '',
    defaultLocale: existingData.defaultLocale || existingData.config?.defaultLocale || 'en-US',
  };
}

/**
 * Validate Play Store form data
 * Checks that all required fields are present
 */
export function validatePlayStoreData(data: Partial<PlayStorePayload>): boolean {
  return !!(
    data.displayName &&
    data.appIdentifier &&
    data.defaultTrack &&
    data.serviceAccountJson?.project_id &&
    data.serviceAccountJson?.client_email &&
    data.serviceAccountJson?.private_key
  );
}

/**
 * Validate App Store form data
 * Checks that all required fields are present
 */
export function validateAppStoreData(data: Partial<AppStorePayload>): boolean {
  return !!(
    data.displayName &&
    data.targetAppId &&
    data.appIdentifier &&
    data.issuerId &&
    data.keyId &&
    data.privateKeyPem &&
    data.teamName
  );
}

