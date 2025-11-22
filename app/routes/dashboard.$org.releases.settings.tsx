/**
 * Release Management Settings Page
 * Edit and manage Release Management configuration
 */

import { json } from '@remix-run/node';
import { useLoaderData, Link, useFetcher, useNavigate } from '@remix-run/react';
import { useState } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest, authenticateActionRequest, ActionMethods } from '~/utils/authenticate';
import { getSetupData, saveSetupData } from '~/.server/services/ReleaseManagement/setup';
import { VerificationBadge } from '~/components/ReleaseManagement/SetupWizard/components';
import { ConfigurationList } from '~/components/ReleaseConfig/Settings/ConfigurationList';
import type { ReleaseConfiguration } from '~/types/release-config';
import { Container, Loader as MantineLoader } from '@mantine/core';
import { IntegrationCategory } from '~/types/integrations';
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
  const [activeTab, setActiveTab] = useState<'integrations' | 'configurations' | 'cicd' | 'general'>('integrations');
  
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
  
  // Get all connected integrations from ConfigContext
  const getConnectedIntegrationsList = () => {
    const connectedList: Array<{
      id: string;
      name: string;
      category: string;
      categoryLabel: string;
      connectedAt: Date;
      connectedBy: string;
      config: any;
    }> = [];
    
    const categories: IntegrationCategory[] = [
      IntegrationCategory.SOURCE_CONTROL,
      IntegrationCategory.COMMUNICATION,
      IntegrationCategory.CI_CD,
      IntegrationCategory.TEST_MANAGEMENT,
      IntegrationCategory.PROJECT_MANAGEMENT,
      IntegrationCategory.APP_DISTRIBUTION,
    ];

    const categoryLabels: Record<string, string> = {
      SOURCE_CONTROL: 'Source Control',
      COMMUNICATION: 'Communication',
      CI_CD: 'CI/CD',
      TEST_MANAGEMENT: 'Test Management',
      PROJECT_MANAGEMENT: 'Project Management',
      APP_DISTRIBUTION: 'App Distribution',
    };

    categories.forEach(category => {
      const connectedIntegrations = getConnectedIntegrations(category);
      const availableIntegrations = getAvailableIntegrations(category);

      connectedIntegrations.forEach((connected) => {
        // Find the provider info
        const provider = availableIntegrations.find(p => p.id === connected.providerId);
        
        connectedList.push({
          id: connected.id,
          name: connected.name || provider?.name || connected.providerId,
          category: category,
          categoryLabel: categoryLabels[category] || category,
          connectedAt: connected.connectedAt ? new Date(connected.connectedAt) : new Date(),
          connectedBy: connected.connectedBy || 'System',
          config: connected.config || {}
        });
      });
    });
          
    return connectedList;
  };

  // Helper function to get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case IntegrationCategory.SOURCE_CONTROL:
        return (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
        );
      case IntegrationCategory.COMMUNICATION:
        return (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
        );
      case IntegrationCategory.CI_CD:
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case IntegrationCategory.PROJECT_MANAGEMENT:
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case IntegrationCategory.APP_DISTRIBUTION:
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case IntegrationCategory.TEST_MANAGEMENT:
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
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
              onClick={() => setActiveTab('integrations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'integrations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Integrations
            </button>
            
            <button
              onClick={() => setActiveTab('configurations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configurations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Release Configurations
            </button>
            
            <button
              onClick={() => setActiveTab('cicd')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cicd'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              CI/CD Pipelines
            </button>
            
            <button
              onClick={() => setActiveTab('general')}
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
                  const connectedIntegrations = getConnectedIntegrationsList();

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {connectedIntegrations.map((integration) => (
                        <div key={integration.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-6">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                                  {getCategoryIcon(integration.category)}
                                </div>
                              </div>
                              <div className="ml-4 flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-base font-semibold text-gray-900">{integration.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{integration.categoryLabel}</p>
                                  </div>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Connected
                                  </span>
                                </div>
                                
                                <div className="mt-3 text-sm text-gray-600 space-y-1">
                                  {integration.config.appIdentifier && (
                                    <div className="flex items-center">
                                      <span className="text-gray-500 w-20">App ID:</span>
                                      <span className="font-mono text-xs">{integration.config.appIdentifier}</span>
                                    </div>
                                  )}
                                  {integration.config.platform && (
                                    <div className="flex items-center">
                                      <span className="text-gray-500 w-20">Platform:</span>
                                      <span>{integration.config.platform}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center text-xs text-gray-400 mt-2">
                                    <span>Connected {new Date(integration.connectedAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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

