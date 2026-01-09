/**
 * Integration Helper Utilities
 * Transform integration data for UI components
 */

import type { Integration } from '~/contexts/TenantContext';
import type { PlayStorePayload, AppStorePayload } from '~/types/distribution/app-distribution';

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
 * Note: client_email and private_key are only required for new connections
 */
export function validatePlayStoreData(data: Partial<PlayStorePayload>, isEditMode: boolean = false): boolean {
  const baseFieldsValid = !!(
    data.displayName &&
    data.appIdentifier &&
    data.defaultTrack 
  );
  
  // In edit mode, credentials are optional (can keep existing ones)
  if (isEditMode) {
    return baseFieldsValid;
  }
  
  // In create mode, require all fields including credentials
  return baseFieldsValid && !!(
    data.serviceAccountJson?.client_email &&
    data.serviceAccountJson?.project_id &&
    data.serviceAccountJson?.private_key
  );
}

/**
 * Validate App Store form data
 * Checks that all required fields are present
 * Note: privateKeyPem is only required for new connections
 */
export function validateAppStoreData(data: Partial<AppStorePayload>, isEditMode: boolean = false): boolean {
  const baseFieldsValid = !!(
    data.displayName &&
    data.targetAppId &&
    data.appIdentifier &&
    data.teamName 
  );
  
  // In edit mode, privateKeyPem is optional (can keep existing one)
  if (isEditMode) {
    return baseFieldsValid;
  }
  
  // In create mode, require all fields including privateKeyPem
  return baseFieldsValid && !!data.privateKeyPem && !!data.issuerId && !!data.keyId;
}

/**
 * Get display name for a connected integration
 * Prefers displayName if available, falls back to name
 */
export function getIntegrationDisplayName(integration: { name: string; displayName?: string }): string {
  return integration.displayName || integration.name;
}

