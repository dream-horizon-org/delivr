/**
 * Release Configuration Route
 * Main route for configuring release management
 */

import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useNavigation, Link } from '@remix-run/react';
import { useState, useEffect, useMemo } from 'react';
import { apiGet, getApiErrorMessage } from '~/utils/api-client';
import { Breadcrumb } from '~/components/Common';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { ConfigurationWizard } from '~/components/ReleaseConfig/Wizard/ConfigurationWizard';
import { DraftReleaseDialog } from '~/components/ReleaseConfig/DraftReleaseDialog';
import { loadDraftConfig, clearDraftConfig } from '~/utils/release-config-storage';
import type { ReleaseConfiguration } from '~/types/release-config';
import { useConfig } from '~/contexts/ConfigContext';
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import { CONFIG_STATUSES } from '~/types/release-config-constants';
import { 
  SCM_PROVIDER_IDS,
  CICD_PROVIDER_IDS,
  TEST_MANAGEMENT_PROVIDER_IDS,
  PROJECT_MANAGEMENT_PROVIDER_IDS,
  COMMUNICATION_PROVIDER_IDS,
  APP_DISTRIBUTION_PROVIDER_IDS,
} from '~/constants/integrations';
import { PermissionService } from '~/utils/permissions.server';
import {
  Box,
  Center,
  Stack,
  Text,
  ThemeIcon,
  Button,
  Skeleton,
  Paper,
  Group,
  useMantineTheme,
} from '@mantine/core';
import {
  IconSettings,
  IconAlertCircle,
  IconArrowLeft,
  IconRefresh,
} from '@tabler/icons-react';

export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }

  // Check if user is owner - only owners can create/edit configs
  try {
    const isEditor = await PermissionService.isAppEditor(org, user.user.id);
    if (!isEditor) {
      throw redirect(`/dashboard/${org}/releases`);
    }
  } catch (error) {
    console.error('[ReleaseConfigure] Permission check failed:', error);
    throw redirect(`/dashboard/${org}/releases`);
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
      const endpoint = `/api/v1/apps/${org}/release-config/${configIdToLoad}`;
      const result = await apiGet<ReleaseConfiguration>(
        `${url.protocol}//${url.host}${endpoint}`,
        {
          headers: {
            'Cookie': request.headers.get('Cookie') || '',
          }
        }
      );
      
      if (result.data) {
        // Data is already transformed by ReleaseConfigService.getById - use directly
        existingConfig = result.data as ReleaseConfiguration;
        
        // If cloning, modify the config to be a new one
        if (cloneConfigId && existingConfig) {
          existingConfig = {
            ...existingConfig,
            appId: existingConfig.appId || org,
            id: '',
            name: `${existingConfig.name} (Copy)`,
            isDefault: false,
            status: CONFIG_STATUSES.DRAFT as any,
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
});

export type ConfigureLoaderData = {
  organizationId: string;
  existingConfig: ReleaseConfiguration | null;
  isEditMode: boolean;
  isCloneMode: boolean;
  forceNew: boolean;
  returnTo: string | null;
  fetchError: string | null;
};

export const action = authenticateActionRequest({
  POST: async ({ request, params, user }: ActionFunctionArgs & { user: any }) => {
    const { org } = params;
    
    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }

    // Check if user is owner - only owners can create/edit configs
    try {
      const isEditor = await PermissionService.isAppEditor(org, user.user.id);
      if (!isEditor) {
        return json({ success: false, error: 'Only organization owners can create/edit configurations' }, { status: 403 });
      }
    } catch (error) {
      console.error('[ReleaseConfigure] Permission check failed:', error);
      return json({ success: false, error: 'Permission check failed' }, { status: 403 });
    }
    
    const formData = await request.formData();
    const configJson = formData.get('config');
    const returnTo = formData.get('returnTo') as string | null;
    
    if (!configJson || typeof configJson !== 'string') {
      return json({ success: false, error: 'Invalid configuration data' }, { status: 400 });
    }
    
    try {
      const config: ReleaseConfiguration = JSON.parse(configJson);
      
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
  },
});

export default function ReleasesConfigurePage() {
  const theme = useMantineTheme();
  const { organizationId, existingConfig, isEditMode, isCloneMode, forceNew, returnTo, fetchError } = useLoaderData<ConfigureLoaderData>();
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
        .filter(i => i.providerId === CICD_PROVIDER_IDS.JENKINS)
        .map(i => ({ id: i.id, name: i.name })),
      github: allConnected
        .filter(i => i.providerId === SCM_PROVIDER_IDS.GITHUB)
        .map(i => ({ id: i.id, name: i.name })),
      githubActions: allConnected
        .filter(i => i.providerId === CICD_PROVIDER_IDS.GITHUB_ACTIONS)
        .map(i => ({ id: i.id, name: i.name })),
      slack: allConnected
        .filter(i => i.providerId === COMMUNICATION_PROVIDER_IDS.SLACK)
        .map(i => ({ id: i.id, name: i.name })),
      jira: allConnected
        .filter(i => i.providerId === PROJECT_MANAGEMENT_PROVIDER_IDS.JIRA)
        .map(i => ({ id: i.id, name: i.name })),
      checkmate: allConnected
        .filter(i => i.providerId === TEST_MANAGEMENT_PROVIDER_IDS.CHECKMATE)
        .map(i => ({
          id: i.id,
          name: i.name,
          workspaceId: i.config?.orgId || i.config?.workspaceId || i.id,
          baseUrl: i.config?.baseUrl,
          orgId: i.config?.orgId,
        })),
      appStore: allConnected
        .filter(i => i.providerId === APP_DISTRIBUTION_PROVIDER_IDS.APP_STORE)
        .map(i => ({ id: i.id, name: i.name })),
      playStore: allConnected
        .filter(i => i.providerId === APP_DISTRIBUTION_PROVIDER_IDS.PLAY_STORE)
        .map(i => ({ id: i.id, name: i.name })),
    };
  }, [getConnectedIntegrations]);
  
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [useDraft, setUseDraft] = useState(false);
  const [draftConfig, setDraftConfig] = useState<Partial<ReleaseConfiguration> | null>(null);
  const [shouldSkipDraft, setShouldSkipDraft] = useState(forceNew); // ✅ Track if we should skip draft loading
  
  // Check for draft on mount (ONLY for NEW configs, NOT in edit mode)
  useEffect(() => {
    if (isEditMode) return;
    
    if (forceNew) {
      clearDraftConfig(organizationId);
      return;
    }
    
    const draft = loadDraftConfig(organizationId);
    if (draft && draft.name) {
      setDraftConfig(draft);
      setShowDraftDialog(true);
    }
  }, [organizationId, isEditMode, forceNew]);
  
  const handleSubmit = async (config: ReleaseConfiguration) => {
    if (returnTo === 'create') {
      navigate(`/dashboard/${organizationId}/releases/create?returnTo=config`);
    } else {
      navigate(`/dashboard/${organizationId}/releases/configurations`);
    }
  };
  
  const handleCancel = () => {
    if (returnTo === 'create') {
      navigate(`/dashboard/${organizationId}/releases/create`);
    } else {
      navigate(`/dashboard/${organizationId}/releases/configurations`);
    }
  };
  
  const handleContinueDraft = () => {
    setUseDraft(true);
    setShowDraftDialog(false);
  };
  
  const handleStartNew = () => {
    clearDraftConfig(organizationId);
    setUseDraft(false);
    setShouldSkipDraft(true); // ✅ Set flag BEFORE hiding dialog to prevent draft loading
    setShowDraftDialog(false);
    navigate(`/dashboard/${organizationId}/releases/configure?new=true`, { replace: true });
  };
  
  const handleCloseDraftDialog = () => {
    setShowDraftDialog(false);
    handleCancel();
  };

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('releases.configure', {
    org: organizationId,
    isEditMode,
    isCloneMode,
  });
  
  // Show loading state
  if (isLoading) {
    return (
      <Box p={32}>
        <Skeleton height={16} width={250} mb={24} />
        <Group gap="lg">
          <Box w={280}>
            <Skeleton height={400} radius="md" />
          </Box>
          <Box style={{ flex: 1 }}>
            <Skeleton height={48} width={300} mb={16} />
            <Skeleton height={24} width={200} mb={32} />
            <Stack gap="md">
              <Skeleton height={56} />
              <Skeleton height={100} />
              <Skeleton height={56} />
            </Stack>
          </Box>
        </Group>
      </Box>
    );
  }
  
  // Show error if failed to load config in edit mode
  if (fetchError && (isEditMode || isCloneMode)) {
    return (
      <Box p={32}>
        <Breadcrumb items={breadcrumbItems} mb={24} />
        
        <Center py={80}>
          <Stack align="center" gap="lg" maw={450}>
            <ThemeIcon size={80} radius="xl" variant="light" color="red">
              <IconAlertCircle size={40} />
            </ThemeIcon>
            <Box ta="center">
              <Text size="xl" fw={600} c={theme.colors.slate[8]} mb={8}>
                Failed to Load Configuration
              </Text>
              <Text size="sm" c={theme.colors.slate[5]} mb={24}>
                {fetchError}
              </Text>
            </Box>
            <Group gap="md">
              <Button
                variant="default"
                leftSection={<IconArrowLeft size={16} />}
                component={Link}
                to={`/dashboard/${organizationId}/releases/configurations`}
              >
                Back to Configurations
              </Button>
              <Button
                color="brand"
                leftSection={<IconRefresh size={16} />}
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </Group>
          </Stack>
        </Center>
      </Box>
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
    <Box>
      <ConfigurationWizard
        appId={organizationId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        availableIntegrations={availableIntegrations}
        existingConfig={existingConfig}
        isEditMode={isEditMode}
        returnTo={returnTo}
      />
    </Box>
  );
}
