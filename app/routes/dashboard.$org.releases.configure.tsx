/**
 * Release Configuration Route
 * Main route for configuring release management
 */

import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useNavigation } from '@remix-run/react';
import { useState, useEffect, useMemo } from 'react';
import { ConfigurationWizard } from '~/components/ReleaseConfig/Wizard/ConfigurationWizard';
import { DraftReleaseDialog } from '~/components/ReleaseConfig/DraftReleaseDialog';
import { loadDraftConfig, clearDraftConfig } from '~/utils/release-config-storage';
import type { ReleaseConfiguration } from '~/types/release-config';
import { useConfig } from '~/contexts/ConfigContext';
import { Loader, Alert, Center, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

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
      const apiUrl = `${url.protocol}//${url.host}/api/v1/tenants/${org}/release-config/${configIdToLoad}`;
      console.log('[Configure Loader] Fetching config:', configIdToLoad);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || '', // Forward cookies for auth
        },
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          existingConfig = data.data;
          
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
          
          console.log('[Configure Loader] Config loaded successfully');
        } else {
          fetchError = 'Invalid response format from server';
          console.error('[Configure Loader] Expected JSON but got:', contentType);
        }
      } else {
        const errorText = await response.text();
        fetchError = `Failed to load configuration (${response.status})`;
        console.error('[Configure Loader] Failed to fetch:', response.status, errorText.substring(0, 200));
      }
    } catch (error: any) {
      fetchError = error.message || 'Failed to load configuration';
      console.error('[Configure Loader] Error fetching config:', error);
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
        .filter(i => i.providerId === 'github')
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <Alert 
            icon={<IconAlertCircle size={24} />} 
            title="Failed to Load Configuration" 
            color="red"
            variant="filled"
          >
            <div className="space-y-4">
              <p>{fetchError}</p>
              <p className="text-sm opacity-90">
                The configuration could not be loaded from the server. This might be because:
              </p>
              <ul className="text-sm opacity-90 list-disc list-inside space-y-1">
                <li>The configuration was deleted</li>
                <li>You don't have permission to access it</li>
                <li>There was a network error</li>
              </ul>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigate(`/dashboard/${organizationId}/releases/settings?tab=configurations`)}
                  className="px-4 py-2 bg-white text-red-600 rounded-md hover:bg-red-50 font-medium"
                >
                  Go to Configurations
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          </Alert>
        </div>
      </div>
    );
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

