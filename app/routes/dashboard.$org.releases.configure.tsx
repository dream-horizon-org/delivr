/**
 * Release Configuration Route
 * Main route for configuring release management
 */

import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useNavigation } from '@remix-run/react';
import { useState, useEffect, useMemo } from 'react';
import { apiGet, getApiErrorMessage } from '~/utils/api-client';
import { ConfigurationWizard } from '~/components/ReleaseConfig/Wizard/ConfigurationWizard';
import { DraftReleaseDialog } from '~/components/ReleaseConfig/DraftReleaseDialog';
import { loadDraftConfig, clearDraftConfig } from '~/utils/release-config-storage';
import type { ReleaseConfiguration } from '~/types/release-config';
import { useConfig } from '~/contexts/ConfigContext';
import { Loader, Center, Stack, Text } from '@mantine/core';
import { ConfigurationLoadError } from '~/components/Releases/ConfigurationLoadError';
import { transformFromBackend } from '~/.server/services/ReleaseConfig/release-config-payload';
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  const url = new URL(request.url);
  const editConfigId = url.searchParams.get('edit');
  const cloneConfigId = url.searchParams.get('clone');
  const forceNew = url.searchParams.get('new') === 'true';
  const returnTo = url.searchParams.get('returnTo');
  
  let existingConfig: ReleaseConfiguration | null = null;
  let fetchError: string | null = null;
  
  // Handle editing or cloning existing config
  const configIdToLoad = editConfigId || cloneConfigId;
  if (configIdToLoad) {
    try {
      const endpoint = `/api/v1/tenants/${org}/release-config/${configIdToLoad}`;
      const result = await apiGet<ReleaseConfiguration>(
        `${url.protocol}//${url.host}${endpoint}`,
        {
          headers: {
            'Cookie': request.headers.get('Cookie') || '',
          }
        }
      );

      console.log('[ReleasesConfigurePage] Loader result for config:', configIdToLoad, JSON.stringify(result, null, 2));
      
      if (result.data) {
        // Transform API response to UI format
        // API returns nested configs (testManagementConfig, commsConfig, projectManagementConfig)
        // UI expects transformed format (testManagement, communication, projectManagement)
        const currentUserId = await requireUserId(request);
        existingConfig = await transformFromBackend(result.data, currentUserId) as ReleaseConfiguration;
        
        console.log('[ReleasesConfigurePage] Transformed config:', JSON.stringify(existingConfig, null, 2));
        
        // If cloning, modify the config to be a new one
        if (cloneConfigId && existingConfig) {
          existingConfig = {
            ...existingConfig,
            tenantId: existingConfig.tenantId || org,
            id: '', // Will be generated on save
            name: `${existingConfig.name} (Copy)`,
            isDefault: false,
            status: 'DRAFT' as any,
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        fetchError = 'Configuration not found';
      }
    } catch (error: any) {
      fetchError = getApiErrorMessage(error, 'Failed to load configuration');
    }
  }
  
  return json({
    organizationId: org,
    existingConfig,
    isEditMode: !!editConfigId,
    isCloneMode: !!cloneConfigId,
    forceNew,
    returnTo,
    fetchError,
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
  const { organizationId, existingConfig, isEditMode, isCloneMode, forceNew, returnTo, fetchError } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { getConnectedIntegrations } = useConfig();
  console.log('[ReleasesConfigurePage] Existing config:', JSON.stringify(existingConfig, null, 2));

  
  
  // Show loading state during navigation
  const isLoading = navigation.state === 'loading';
  
  // Transform connected integrations into format expected by ConfigurationWizard
  const availableIntegrations = useMemo(() => {
    const allConnected = getConnectedIntegrations();
    
    return {
      jenkins: allConnected
        .filter(i => i.providerId === 'jenkins')
        .map(i => ({ id: i.id, name: i.name })),
      github: allConnected
        .filter(i => i.providerId === 'github' || i.providerId === 'scm')
        .map(i => ({ id: i.id, name: i.name })),
      githubActions: allConnected
        .filter(i => i.providerId?.toLowerCase() === 'github_actions' || i.providerId?.toLowerCase() === 'github-actions')
        .map(i => ({ id: i.id, name: i.name })),
      slack: allConnected
        .filter(i => i.providerId === 'slack')
        .map(i => ({ id: i.id, name: i.name })),
      jira: allConnected
        .filter(i => i.providerId === 'jira')
        .map(i => ({ id: i.id, name: i.name })),
      checkmate: allConnected
        .filter(i => i.providerId === 'checkmate')
        .map(i => ({
          id: i.id,
          name: i.name,
          workspaceId: i.config?.orgId || i.config?.workspaceId || i.id,
          baseUrl: i.config?.baseUrl,
          orgId: i.config?.orgId,
        })),
    };
  }, [getConnectedIntegrations]);
  
  console.log('[ReleasesConfigurePage] Available integrations from ConfigContext:', availableIntegrations);
  
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [useDraft, setUseDraft] = useState(false);
  const [draftConfig, setDraftConfig] = useState<Partial<ReleaseConfiguration> | null>(null);
  
  // Check for draft on mount (ONLY for NEW configs, NOT in edit mode)
  useEffect(() => {
    // Edit mode: Never check for drafts (separate flow)
    if (isEditMode) {
      return;
    }
    
    // Force new: Clear any existing draft and start fresh
    if (forceNew) {
      clearDraftConfig(organizationId);
      console.log('[ReleasesConfigurePage] Force new: Cleared old draft');
      return;
    }
    
    // New config mode: Check if there's a draft to resume
      const draft = loadDraftConfig(organizationId);
      if (draft && draft.name) {
      console.log('[ReleasesConfigurePage] Found draft, showing resume dialog');
        setDraftConfig(draft);
        setShowDraftDialog(true);
    }
  }, [organizationId, isEditMode, forceNew]);
  
  const handleSubmit = async (config: ReleaseConfiguration) => {
    // The wizard already handles API submission directly
    // Navigate based on returnTo parameter
    if (returnTo === 'create') {
      navigate(`/dashboard/${organizationId}/releases/create?returnTo=config`);
    } else {
      navigate(`/dashboard/${organizationId}/releases/settings?tab=configurations`);
    }
  };
  
  const handleCancel = () => {
    // Navigate back to where user came from
    if (returnTo === 'create') {
      navigate(`/dashboard/${organizationId}/releases/create`);
    } else {
      navigate(`/dashboard/${organizationId}/releases/settings?tab=configurations`);
    }
  };
  
  const handleContinueDraft = () => {
    setUseDraft(true);
    setShowDraftDialog(false);
  };
  
  const handleStartNew = () => {
    // Clear the draft and start fresh
    clearDraftConfig(organizationId);
    console.log('[ReleasesConfigurePage] User chose to start new, draft cleared');
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
  
  // Show loading state
  if (isLoading) {
    return (
      <Center className="min-h-screen bg-gray-50">
        <Stack align="center" gap="md">
          <Loader size="xl" />
          <Text size="lg" c="dimmed">
            {isEditMode ? 'Loading configuration...' : isCloneMode ? 'Cloning configuration...' : 'Loading...'}
          </Text>
        </Stack>
      </Center>
    );
  }
  
  // Show error if failed to load config in edit mode
  if (fetchError && (isEditMode || isCloneMode)) {
    return <ConfigurationLoadError error={fetchError} organizationId={organizationId} />;
  }
  
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
      tenantId={organizationId}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      availableIntegrations={availableIntegrations}
      existingConfig={existingConfig}
      isEditMode={isEditMode}
      returnTo={returnTo}
    />
  );
}

