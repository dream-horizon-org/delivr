/**
 * Release Configuration Route
 * Main route for configuring release management
 */

import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { ConfigurationWizard } from '~/components/ReleaseConfig/Wizard/ConfigurationWizard';
import type { ReleaseConfiguration } from '~/types/release-config';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Check if editing existing configuration
  const url = new URL(request.url);
  const editConfigId = url.searchParams.get('edit');
  
  let existingConfig: ReleaseConfiguration | null = null;
  
  if (editConfigId) {
    try {
      const apiUrl = `${url.protocol}//${url.host}/api/v1/tenants/${org}/release-config?configId=${editConfigId}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        existingConfig = data.configuration;
        console.log(`[Configure] Loading config for edit: ${editConfigId}`);
      } else {
        console.error('[Configure] Failed to load config:', await response.text());
      }
    } catch (error) {
      console.error('[Configure] Error fetching config:', error);
    }
  }
  
  // TODO: Fetch available integrations from server
  // For now, return mock data assuming integrations are connected
  const availableIntegrations = {
    jenkins: [
      { id: 'jenkins-1', name: 'Jenkins Production' },
    ],
    github: [
      { id: 'github-1', name: 'Main Repository' },
    ],
    slack: [
      { id: 'slack-1', name: 'Company Workspace' },
    ],
    jira: [
      { id: 'jira-1', name: 'Company Jira Workspace' },
      { id: 'jira-2', name: 'Engineering Jira' },
    ],
    checkmate: [
      { id: 'checkmate-1', name: 'Checkmate Integration', workspaceId: 'workspace-123' },
    ],
  };
  
  return json({
    organizationId: org,
    availableIntegrations,
    existingConfig,
    isEditMode: !!editConfigId,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  const formData = await request.formData();
  const configJson = formData.get('config');
  
  if (!configJson || typeof configJson !== 'string') {
    return json({ success: false, error: 'Invalid configuration data' }, { status: 400 });
  }
  
  try {
    const config: ReleaseConfiguration = JSON.parse(configJson);
    
    // TODO: Save configuration to server via API
    // const result = await saveReleaseConfiguration(org, config);
    
    console.log('[Release Config] Saving configuration:', config);
    
    // For now, just simulate success
    // In production, this would call the backend API
    
    return redirect(`/dashboard/${org}/releases`);
  } catch (error) {
    console.error('[Release Config] Failed to save:', error);
    return json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

export default function ReleasesConfigurePage() {
  const { organizationId, availableIntegrations, existingConfig, isEditMode } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const handleSubmit = async (config: ReleaseConfiguration) => {
    // The wizard already handles API submission directly
    // Just navigate to settings page after successful save
    navigate(`/dashboard/${organizationId}/settings/release-config`);
  };
  
  const handleCancel = () => {
    navigate(`/dashboard/${organizationId}/settings/release-config`);
  };
  
  return (
    <ConfigurationWizard
      organizationId={organizationId}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      availableIntegrations={availableIntegrations}
      existingConfig={existingConfig}
      isEditMode={isEditMode}
    />
  );
}

