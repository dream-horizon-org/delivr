/**
 * Release Management Settings Page
 * Edit and manage Release Management configuration
 */

import { json } from '@remix-run/node';
import { useLoaderData, Link, useFetcher, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest, authenticateActionRequest, ActionMethods } from '~/utils/authenticate';
import { getSetupData, saveSetupData } from '~/.server/services/ReleaseManagement/setup';
import { VerificationBadge } from '~/components/ReleaseManagement/SetupWizard/components';
import { ConfigurationList } from '~/components/ReleaseConfig/Settings/ConfigurationList';
import type { ReleaseConfiguration } from '~/types/release-config';
import { Container, Loader as MantineLoader } from '@mantine/core';
import { IntegrationCard } from '~/components/Integrations/IntegrationCard';
import type { Integration } from '~/types/integrations';
import { IntegrationCategory, IntegrationStatus } from '~/types/integrations';
import { useConfig } from '~/contexts/ConfigContext';

export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  const setupData = await getSetupData(org);
  
  // Fetch configurations from API for the configurations tab
  let configurations: ReleaseConfiguration[] = [];
  let stats = null;
  
  try {
    const url = new URL(request.url);
    const apiUrl = `${url.protocol}//${url.host}/api/v1/tenants/${org}/release-config`;
    
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      configurations = data.configurations || [];
      stats = data.stats || null;
      console.log(`[Settings] Loaded ${configurations.length} configurations`);
    }
  } catch (error) {
    console.error('[Settings] Failed to load configurations:', error);
  }
  
  return json({
    org,
    user,
    setupData,
    configurations,
    stats,
  });
});

export const action = authenticateActionRequest({
  [ActionMethods.POST]: async ({ request, params, user }) => {
    const { org } = params;
    
    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }
    
    const formData = await request.formData();
    const actionType = formData.get('_action');
    
    if (actionType === 'disconnect') {
      const integrationType = formData.get('type') as string;
      
      // Remove specific integration
      const setupData = await getSetupData(org);
      if (setupData) {
        const updates: any = {};
        
        switch (integrationType) {
          case 'github':
            updates.github = undefined;
            break;
          case 'slack':
            updates.slack = undefined;
            break;
          case 'appStore':
            updates.appStoreConnect = undefined;
            break;
          case 'playStore':
            updates.playStoreConnect = undefined;
            break;
        }
        
        await saveSetupData(org, updates);
      }
      
      return json({ success: true });
    }
    
    return json({ success: false });
  }
});

export default function ReleaseSettingsPage() {
  const data = useLoaderData<typeof loader>();
  const { org, setupData, configurations, stats } = data as any;
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get tab from URL params, default to 'integrations'
  const tabFromUrl = searchParams.get('tab') as 'integrations' | 'configurations' | 'cicd' | 'general' | null;
  const [activeTab, setActiveTab] = useState<'integrations' | 'configurations' | 'cicd' | 'general'>(
    tabFromUrl || 'integrations'
  );
  
  // Sync activeTab with URL params
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  // Update URL when tab changes
  const handleTabChange = (tab: 'integrations' | 'configurations' | 'cicd' | 'general') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  // Get integration data from ConfigContext
  const { 
    isLoadingMetadata,
    isLoadingTenantConfig,
    getConnectedIntegrations,
    getAvailableIntegrations 
  } = useConfig();
  
  // Configuration handlers
  const handleCreate = () => {
    navigate(`/dashboard/${org}/releases/configure`);
  };
  
  const handleEdit = (config: ReleaseConfiguration) => {
    console.log('[Settings] Edit config:', config.id);
    navigate(`/dashboard/${org}/releases/configure?edit=${config.id}`);
  };
  
  const handleDuplicate = async (config: ReleaseConfiguration) => {
    console.log('[Settings] Duplicate config:', config.id);
    // TODO: Implement duplicate via API
    alert('Duplicate feature coming soon - will call API to duplicate configuration');
  };
  
  const handleArchive = async (configId: string) => {
    if (!confirm('Are you sure you want to archive this configuration?')) {
      return;
    }
    
    console.log('[Settings] Archive config:', configId);
    
    try {
      const response = await fetch(`/api/v1/tenants/${org}/release-config`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configId, archive: true }),
      });
      
      if (response.ok) {
        // Reload page to refresh list
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to archive: ${error.error}`);
      }
    } catch (error) {
      console.error('[Settings] Archive failed:', error);
      alert('Failed to archive configuration');
    }
  };
  
  const handleSetDefault = async (configId: string) => {
    console.log('[Settings] Set default config:', configId);
    
    try {
      const response = await fetch(`/api/v1/tenants/${org}/release-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: { id: configId, isDefault: true },
        }),
      });
      
      if (response.ok) {
        // Reload page to refresh list
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to set default: ${error.error}`);
      }
    } catch (error) {
      console.error('[Settings] Set default failed:', error);
      alert('Failed to set as default');
    }
  };
  
  // Build integrations list using ConfigContext helpers
  const buildIntegrationsList = (): Integration[] => {
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
          description: '', // Remove description as per user request
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
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <Link
                  to={`/dashboard/${org}/releases`}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Release Management Settings</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Manage integrations and configuration
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('integrations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'integrations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Integrations
            </button>
            
            <button
              onClick={() => handleTabChange('configurations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configurations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Release Configurations
            </button>
            
            <button
              onClick={() => handleTabChange('cicd')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cicd'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              CI/CD Pipelines
            </button>
            
            <button
              onClick={() => handleTabChange('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              General
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {isLoadingMetadata || isLoadingTenantConfig ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <MantineLoader size="lg" />
              </div>
            ) : (
              <>
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

                {(() => {
                  const allIntegrations = buildIntegrationsList();
                  const connectedIntegrations = allIntegrations.filter(
                    i => i.status === IntegrationStatus.CONNECTED
                  );

                  if (connectedIntegrations.length === 0) {
                    return (
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
                    );
                  }

                  return (
                    <>
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
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}
        
        {activeTab === 'configurations' && (
          <Container size="xl" className="p-0">
            {stats && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                    <div className="text-sm text-gray-600">Active</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
                    <div className="text-sm text-gray-600">Draft</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
                    <div className="text-sm text-gray-600">Archived</div>
                  </div>
                </div>
              </div>
            )}
            
            <ConfigurationList
              configurations={configurations}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onSetDefault={handleSetDefault}
              onCreate={handleCreate}
            />
          </Container>
        )}
        
        {activeTab === 'cicd' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">CI/CD Pipelines</h2>
              <Link
                to={`/dashboard/${org}/releases/setup?step=cicd`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Pipeline
              </Link>
            </div>
            
            {setupData?.cicdPipelines && setupData.cicdPipelines.length > 0 ? (
              <div className="space-y-4">
                {setupData.cicdPipelines.map((pipeline: any) => (
                  <div key={pipeline.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">{pipeline.name}</h3>
                          <VerificationBadge isVerified={pipeline.isVerified} />
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded ${
                            pipeline.type === 'GITHUB_ACTIONS' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {pipeline.type === 'GITHUB_ACTIONS' ? 'GitHub Actions' : 'Jenkins'}
                          </span>
                          <span>{pipeline.platform}</span>
                          <span>{pipeline.environment}</span>
                        </div>
                        
                        {pipeline.type === 'GITHUB_ACTIONS' && (
                          <p className="mt-2 text-sm text-gray-600">Workflow: {pipeline.workflowPath}</p>
                        )}
                        {pipeline.type === 'JENKINS' && (
                          <p className="mt-2 text-sm text-gray-600">Job: {pipeline.jenkinsJob}</p>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Implement remove pipeline
                        }}
                        className="ml-4 text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center bg-white rounded-lg border border-gray-200 p-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pipelines configured</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add CI/CD pipelines to automate your build process
                </p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">General Settings</h2>
              <p className="text-sm text-gray-500">
                General release management settings coming soon...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

