/**
 * Release Management Settings Page
 * Edit and manage Release Management configuration
 */

import { json } from '@remix-run/node';
import { useLoaderData, Link, useFetcher } from '@remix-run/react';
import { useState } from 'react';
import { authenticateLoaderRequest, authenticateActionRequest, ActionMethods } from '~/utils/authenticate';
import { getSetupData, saveSetupData } from '~/.server/services/ReleaseManagement/setup';
import { ConnectionCard, VerificationBadge } from '~/components/ReleaseManagement/SetupWizard/components';

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  const setupData = await getSetupData(org);
  
  return json({
    org,
    user,
    setupData,
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
  const { org, setupData } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [activeTab, setActiveTab] = useState<'integrations' | 'cicd' | 'general'>('integrations');
  
  const handleDisconnect = (type: string) => {
    if (confirm('Are you sure you want to disconnect this integration?')) {
      const formData = new FormData();
      formData.append('_action', 'disconnect');
      formData.append('type', type);
      fetcher.submit(formData, { method: 'post' });
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
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Connected Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GitHub */}
                <ConnectionCard
                  title="GitHub"
                  description="Source code repository"
                  icon={
                    <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  }
                  isConnected={!!setupData?.github?.isVerified}
                  metadata={setupData?.github ? [
                    { label: 'Repository', value: setupData.github.repoName || '' },
                    { label: 'Owner', value: setupData.github.owner || '' },
                  ] : []}
                  onDisconnect={() => handleDisconnect('github')}
                />
                
                {/* Slack */}
                <ConnectionCard
                  title="Slack"
                  description="Team notifications"
                  icon={
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                    </svg>
                  }
                  isConnected={!!setupData?.slack?.isVerified}
                  metadata={setupData?.slack ? [
                    { label: 'Channels', value: `${setupData.slack.channels.length} connected` },
                  ] : []}
                  onDisconnect={() => handleDisconnect('slack')}
                >
                  {setupData?.slack?.channels && setupData.slack.channels.length > 0 && (
                    <div className="text-xs text-gray-600 space-y-1">
                      {setupData.slack.channels.map(channel => (
                        <div key={channel.id}>
                          #{channel.name} <span className="text-gray-400">({channel.purpose})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ConnectionCard>
                
                {/* App Store */}
                <ConnectionCard
                  title="App Store Connect"
                  description="iOS app distribution"
                  icon={
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  }
                  isConnected={!!setupData?.appStoreConnect?.isVerified}
                  metadata={setupData?.appStoreConnect ? [
                    { label: 'Key ID', value: setupData.appStoreConnect.keyId },
                  ] : []}
                  onDisconnect={() => handleDisconnect('appStore')}
                />
                
                {/* Play Store */}
                <ConnectionCard
                  title="Google Play Store"
                  description="Android app distribution"
                  icon={
                    <svg className="h-8 w-8" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35z" />
                      <path fill="#34A853" d="M16.81 15.12l-3.12-3.12 3.12-3.12 3.35 1.93c.61.36.98.99.98 1.69s-.37 1.33-.98 1.69l-3.35 1.93z" />
                      <path fill="#FBBC04" d="M13.69 12L3.84 2.15C4.25 1.92 4.74 1.84 5.23 2.06l11.58 6.68L13.69 12z" />
                      <path fill="#EA4335" d="M13.69 12l3.12 3.12-11.58 6.68c-.49.22-.98.14-1.39-.09L13.69 12z" />
                    </svg>
                  }
                  isConnected={!!setupData?.playStoreConnect?.isVerified}
                  metadata={setupData?.playStoreConnect ? [
                    { label: 'Project', value: setupData.playStoreConnect.projectId },
                  ] : []}
                  onDisconnect={() => handleDisconnect('playStore')}
                />
              </div>
            </div>
          </div>
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
                {setupData.cicdPipelines.map(pipeline => (
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

