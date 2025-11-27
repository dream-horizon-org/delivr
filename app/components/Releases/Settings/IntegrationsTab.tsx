/**
 * Integrations Tab Component
 * Displays connected integrations
 */

import { memo, useMemo } from 'react';
import { Link } from '@remix-run/react';
import { Loader as MantineLoader } from '@mantine/core';
import { IntegrationCard } from '~/components/Integrations/IntegrationCard';
import type { Integration } from '~/types/integrations';
import { IntegrationCategory, IntegrationStatus } from '~/types/integrations';
import { useConfig } from '~/contexts/ConfigContext';

interface IntegrationsTabProps {
  org: string;
  isLoading: boolean;
}

export const IntegrationsTab = memo(function IntegrationsTab({
  org,
  isLoading,
}: IntegrationsTabProps) {
  const { getConnectedIntegrations, getAvailableIntegrations } = useConfig();

  // Build integrations list using ConfigContext helpers
  const integrations = useMemo((): Integration[] => {
    const allIntegrations: Integration[] = [];
    
    const categories: IntegrationCategory[] = [
      IntegrationCategory.SOURCE_CONTROL,
      IntegrationCategory.COMMUNICATION,
      IntegrationCategory.CI_CD,
      IntegrationCategory.TEST_MANAGEMENT,
      IntegrationCategory.PROJECT_MANAGEMENT,
      IntegrationCategory.APP_DISTRIBUTION,
    ];

    categories.forEach(category => {
      const availableIntegrations = getAvailableIntegrations(category);
      const connectedIntegrations = getConnectedIntegrations(category);

      availableIntegrations.forEach((provider) => {
        // Case-insensitive matching for providerId (backend sends lowercase, metadata has uppercase)
        const connected = connectedIntegrations.find(
          (c) => c.providerId.toLowerCase() === provider.id.toLowerCase()
        );

        allIntegrations.push({
          id: provider.id,
          name: provider.name,
          description: '',
          category: category,
          icon: provider.icon || '',
          status: connected ? IntegrationStatus.CONNECTED : IntegrationStatus.NOT_CONNECTED,
          isAvailable: provider.isAvailable,
          config: connected ? {
            id: connected.id,
            ...connected.config
          } : undefined,
          connectedAt: connected?.connectedAt ? new Date(connected.connectedAt) : undefined,
          connectedBy: connected?.connectedBy || undefined,
        });
      });
    });
          
    return allIntegrations;
  }, [getAvailableIntegrations, getConnectedIntegrations]);

  const connectedIntegrations = useMemo(() => 
    integrations.filter(i => i.status === IntegrationStatus.CONNECTED),
    [integrations]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <MantineLoader size="lg" />
      </div>
    );
  }

  if (connectedIntegrations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Connected Integrations</h2>
            <p className="text-sm text-gray-500 mt-1">Integrations currently active for this organization</p>
          </div>
          <Link
            to={`/dashboard/${org}/integrations`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            View All Integrations
          </Link>
        </div>

        <div className="text-center bg-white rounded-lg border-2 border-dashed border-gray-300 p-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">No Integrations Connected</h3>
          <p className="mt-2 text-sm text-gray-500">
            Connect external services to enhance your release management workflow
          </p>
          <div className="mt-6">
            <Link
              to={`/dashboard/${org}/integrations`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Browse Integrations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Connected Integrations</h2>
          <p className="text-sm text-gray-500 mt-1">Integrations currently active for this organization</p>
        </div>
        <Link
          to={`/dashboard/${org}/integrations`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          View All Integrations
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectedIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onClick={() => {}}
          />
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              To edit or change integration configuration, please visit the{' '}
              <Link
                to={`/dashboard/${org}/integrations`}
                className="font-medium text-blue-700 hover:text-blue-800 underline"
              >
                Integrations page
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

