/**
 * Release Configuration Route
 * Main route for configuring release management
 */

import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { ConfigurationWizard } from '~/components/ReleaseConfig/Wizard/ConfigurationWizard';
import { DraftReleaseDialog } from '~/components/ReleaseConfig/DraftReleaseDialog';
import { loadDraftConfig, clearDraftConfig } from '~/utils/release-config-storage';
import type { ReleaseConfiguration } from '~/types/release-config';
import { getMockTenantInfo } from '~/utils/mock-tenant-data.server';
import { transformIntegrationsForUI } from '~/utils/integration-helpers';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Check if editing existing configuration
  const url = new URL(request.url);
  const editConfigId = url.searchParams.get('edit');
  const cloneConfigId = url.searchParams.get('clone');
  const forceNew = url.searchParams.get('new') === 'true';
  const returnTo = url.searchParams.get('returnTo'); // Where to redirect after save
  
  let existingConfig: ReleaseConfiguration | null = null;
  
  // Handle editing or cloning existing config
  const configIdToLoad = editConfigId || cloneConfigId;
  if (configIdToLoad) {
    try {
      const apiUrl = `${url.protocol}//${url.host}/api/v1/tenants/${org}/release-config?configId=${configIdToLoad}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        existingConfig = data.configuration;
        
        // If cloning, modify the config to be a new one
        if (cloneConfigId) {
          existingConfig = {
            ...existingConfig,
            id: '', // Will be generated on save
            name: `${existingConfig.name} (Copy)`,
            isDefault: false, // Clones are never default
            status: 'DRAFT' as any,
            createdAt: new Date().toISOString(),
          };
        }
        
        console.log(`[Configure] Loading config for ${cloneConfigId ? 'clone' : 'edit'}: ${configIdToLoad}`);
      } else {
        console.error('[Configure] Failed to load config:', await response.text());
      }
    } catch (error) {
      console.error('[Configure] Error fetching config:', error);
    }
  }
  
  // Fetch tenant info (integrations, settings, etc.)
  // TODO: Replace with real API call to backend
  const tenantInfo = await getMockTenantInfo(org);
  
  // Transform integrations into UI-ready format
  // Only includes CONNECTED integrations
  const availableIntegrations = transformIntegrationsForUI(tenantInfo.integrations);
  
  console.log('[Configure] Available integrations:', {
    jenkins: availableIntegrations.jenkins.length,
    github: availableIntegrations.github.length,
    slack: availableIntegrations.slack.length,
    jira: availableIntegrations.jira.length,
    checkmate: availableIntegrations.checkmate.length,
  });
  
  return json({
    organizationId: org,
    availableIntegrations,
    existingConfig,
    isEditMode: !!editConfigId,
    isCloneMode: !!cloneConfigId,
    forceNew,
    returnTo,
    tenantInfo,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  const formData = await request.formData();
  const configJson = formData.get('config');
  const returnTo = formData.get('returnTo') as string | null;
  
  if (!configJson || typeof configJson !== 'string') {
    return json({ success: false, error: 'Invalid configuration data' }, { status: 400 });
  }
  
  try {
    const config: ReleaseConfiguration = JSON.parse(configJson);
    
    // TODO: Save configuration to server via API
    // const result = await saveReleaseConfiguration(org, config);
    
    console.log('[Release Config] Saving configuration:', config);
    console.log('[Release Config] ReturnTo:', returnTo);
    
    // For now, just simulate success
    // In production, this would call the backend API
    
    // Redirect based on returnTo parameter
    if (returnTo === 'create') {
      return redirect(`/dashboard/${org}/releases/create?returnTo=config`);
    } else {
      return redirect(`/dashboard/${org}/releases`);
    }
  } catch (error) {
    console.error('[Release Config] Failed to save:', error);
    return json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

export default function ReleasesConfigurePage() {
  const { organizationId, availableIntegrations, existingConfig, isEditMode, isCloneMode, forceNew, returnTo } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [useDraft, setUseDraft] = useState(false);
  const [draftConfig, setDraftConfig] = useState<Partial<ReleaseConfiguration> | null>(null);
  
  // Check for draft on mount (only if not editing and not forceNew)
  useEffect(() => {
    if (!isEditMode && !forceNew) {
      const draft = loadDraftConfig(organizationId);
      if (draft && draft.name) {
        setDraftConfig(draft);
        setShowDraftDialog(true);
      }
    }
  }, [organizationId, isEditMode, forceNew]);
  
  const handleSubmit = async (config: ReleaseConfiguration) => {
    // The wizard already handles API submission directly
    // Navigate based on returnTo parameter
    if (returnTo === 'create') {
      navigate(`/dashboard/${organizationId}/releases/create?returnTo=config`);
    } else {
      navigate(`/dashboard/${organizationId}/settings/release-config`);
    }
  };
  
  const handleCancel = () => {
    // Navigate back to where user came from
    if (returnTo === 'create') {
      navigate(`/dashboard/${organizationId}/releases/create`);
    } else {
      navigate(`/dashboard/${organizationId}/settings/release-config`);
    }
  };
  
  const handleContinueDraft = () => {
    setUseDraft(true);
    setShowDraftDialog(false);
  };
  
  const handleStartNew = () => {
    clearDraftConfig(organizationId);
    setUseDraft(false);
    setShowDraftDialog(false);
    // Reload page with ?new=true to ensure fresh start
    navigate(`/dashboard/${organizationId}/releases/configure?new=true`, { replace: true });
  };
  
  const handleCloseDraftDialog = () => {
    setShowDraftDialog(false);
    // Default to continuing draft if user cancels dialog
    setUseDraft(true);
  };
  
  // Don't render wizard until draft decision is made
  if (showDraftDialog) {
    return (
      <DraftReleaseDialog
        opened={showDraftDialog}
        onClose={handleCloseDraftDialog}
        draftConfig={draftConfig}
        onContinueDraft={handleContinueDraft}
        onStartNew={handleStartNew}
      />
    );
  }
  
  return (
    <ConfigurationWizard
      organizationId={organizationId}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      availableIntegrations={availableIntegrations}
      existingConfig={existingConfig}
      isEditMode={isEditMode}
      returnTo={returnTo}
    />
  );
}

