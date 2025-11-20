/**
 * Integration Helper Utilities
 * Transform integration data for UI components
 */

import type { Integration } from '~/contexts/TenantContext';

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

