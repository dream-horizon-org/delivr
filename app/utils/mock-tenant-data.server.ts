/**
 * Mock Tenant Data (Server-side only)
 * This file provides mock data until real backend is integrated
 * File extension .server.ts ensures it only runs on server
 */

import type { TenantInfo, Integration } from '~/contexts/TenantContext';

/**
 * Mock integration data
 * TODO: Replace with actual API call to backend
 */
export function getMockIntegrations(tenantId: string): Integration[] {
  // Simulate different scenarios based on tenant
  // In production, this comes from database/backend API
  
  return [
    // Jenkins - Connected
    {
      id: 'jenkins-1',
      type: 'JENKINS',
      name: 'Jenkins Production',
      status: 'CONNECTED',
      connectedAt: '2024-01-15T10:00:00Z',
      metadata: {
        url: 'https://jenkins.example.com',
      },
    },
    
    // GitHub - Connected
    {
      id: 'github-1',
      type: 'GITHUB',
      name: 'Main Repository',
      status: 'CONNECTED',
      connectedAt: '2024-01-10T10:00:00Z',
      metadata: {
        owner: 'example-org',
        repo: 'main-app',
      },
    },
    
    // Slack - NOT Connected (available but not configured)
    {
      id: 'slack-1',
      type: 'SLACK',
      name: 'Company Workspace',
      status: 'DISCONNECTED',
      metadata: {},
    },
    
    // Jira - NOT Connected
    {
      id: 'jira-1',
      type: 'JIRA',
      name: 'Company Jira',
      status: 'DISCONNECTED',
      metadata: {},
    },
    
    // Checkmate - NOT Connected
    {
      id: 'checkmate-1',
      type: 'CHECKMATE',
      name: 'Checkmate Integration',
      status: 'DISCONNECTED',
      metadata: {
        workspaceId: 'workspace-123',
      },
    },
  ];
}

/**
 * Get mock tenant info
 * TODO: Replace with actual API call
 */
export async function getMockTenantInfo(tenantId: string): Promise<TenantInfo> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    id: tenantId,
    name: `Organization ${tenantId}`,
    integrations: getMockIntegrations(tenantId),
    releaseConfigurations: [], // Will be fetched separately
    settings: {},
  };
}

/**
 * Simulate connecting an integration
 * TODO: Replace with actual API call
 */
export async function connectIntegration(
  tenantId: string,
  integrationType: Integration['type'],
  config: any
): Promise<Integration> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    id: `${integrationType.toLowerCase()}-${Date.now()}`,
    type: integrationType,
    name: `${integrationType} Integration`,
    status: 'CONNECTED',
    connectedAt: new Date().toISOString(),
    metadata: config,
  };
}

/**
 * Helper to get only connected integrations
 */
export function getConnectedIntegrations(integrations: Integration[]): Integration[] {
  return integrations.filter(i => i.status === 'CONNECTED');
}

