/**
 * Release Management Settings Page
 * Edit and manage Release Management configuration
 * 
 * Data Flow:
 * - Uses ConfigContext (React Query) for all data
 * - System metadata and tenant config: Cached via ConfigContext (with initialData from parent routes)
 * - Release configs: Cached via useReleaseConfigs hook in ConfigContext
 * - Fast tab switching: All data is cached, no refetching needed
 * - Cache invalidation: Automatically handled by ConfigContext
 */

import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { useConfig } from '~/contexts/ConfigContext';
import { SettingsHeader } from '~/components/Releases/Settings/SettingsHeader';
import { SettingsTabs, type SettingsTab } from '~/components/Releases/Settings/SettingsTabs';
import { IntegrationsTab } from '~/components/Releases/Settings/IntegrationsTab';
import { ConfigurationsTab } from '~/components/Releases/Settings/ConfigurationsTab';
import { CICDTab } from '~/components/Releases/Settings/CICDTab';
import { GeneralTab } from '~/components/Releases/Settings/GeneralTab';

export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  return json({ org, user});
});

export default function ReleaseSettingsPage() {
  const data = useLoaderData<typeof loader>();
  const { org } = data as any;
  const { releaseConfigs, invalidateReleaseConfigs, isLoadingMetadata, isLoadingTenantConfig } = useConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get tab from URL params, default to 'integrations'
  const tabFromUrl = searchParams.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabFromUrl || 'integrations'
  );
  
  // Sync activeTab with URL params
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);
  
  // Update URL when tab changes
  const handleTabChange = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  }, [setSearchParams]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <SettingsHeader org={org} />
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />
        
        {/* Tab Content */}
        {activeTab === 'integrations' && (
          <IntegrationsTab
            org={org}
            isLoading={isLoadingMetadata || isLoadingTenantConfig}
          />
        )}
        
        {activeTab === 'configurations' && (
          <ConfigurationsTab
            org={org}
            releaseConfigs={releaseConfigs}
            invalidateReleaseConfigs={invalidateReleaseConfigs}
          />
        )}
        
        {activeTab === 'cicd' && (
          <CICDTab org={org} />
        )}
        
        {activeTab === 'general' && <GeneralTab />}
      </div>
    </div>
  );
}

