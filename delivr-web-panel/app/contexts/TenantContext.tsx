/**
 * Tenant Context
 * Provides tenant data (integrations, configs, etc.) to all child components
 */

import { createContext, useContext, ReactNode } from 'react';
import type { ReleaseConfiguration } from '~/types/release-config';

export interface Integration {
  id: string;
  type: 'JENKINS' | 'GITHUB' | 'SLACK' | 'JIRA' | 'CHECKMATE';
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  connectedAt?: string;
  metadata?: {
    workspaceId?: string;
    [key: string]: any;
  };
}

export interface TenantInfo {
  id: string;
  name: string;
  
  // Available integrations (installed/configured)
  integrations: Integration[];
  
  // Release configurations
  releaseConfigurations: ReleaseConfiguration[];
  
  // Organization settings
  settings?: {
    [key: string]: any;
  };
}

interface TenantContextValue {
  tenantInfo: TenantInfo | null;
  
  // Helper functions to check integration status
  isIntegrationConnected: (type: Integration['type']) => boolean;
  getConnectedIntegrations: (type: Integration['type']) => Integration[];
  hasAnyIntegration: (types: Integration['type'][]) => boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  tenantInfo,
}: {
  children: ReactNode;
  tenantInfo: TenantInfo | null;
}) {
  const isIntegrationConnected = (type: Integration['type']): boolean => {
    return tenantInfo?.integrations.some(
      i => i.type === type && i.status === 'CONNECTED'
    ) || false;
  };

  const getConnectedIntegrations = (type: Integration['type']): Integration[] => {
    return tenantInfo?.integrations.filter(
      i => i.type === type && i.status === 'CONNECTED'
    ) || [];
  };

  const hasAnyIntegration = (types: Integration['type'][]): boolean => {
    return types.some(type => isIntegrationConnected(type));
  };

  return (
    <TenantContext.Provider
      value={{
        tenantInfo,
        isIntegrationConnected,
        getConnectedIntegrations,
        hasAnyIntegration,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}

