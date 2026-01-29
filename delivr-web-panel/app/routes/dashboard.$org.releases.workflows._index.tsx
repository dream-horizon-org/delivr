/**
 * Workflows List Page
 * Manage CI/CD workflows (Jenkins and GitHub Actions)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Tabs,
  useMantineTheme,
} from '@mantine/core';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import {
  IconAlertCircle,
  IconGitBranch,
  IconRefresh,
  IconRocket,
  IconAutomation,
} from '@tabler/icons-react';
import { sanitizeUser } from '~/.server/services/Auth';
import { Breadcrumb } from '~/components/Common';
import { PageHeader } from '~/components/Common/PageHeader';
import { BackToReleasesButton } from '~/components/Common/BackToReleasesButton';
import { StandardizedTabs, type TabConfig } from '~/components/Common/StandardizedTabs';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { WorkflowsTabContent } from '~/components/ReleaseSettings/WorkflowsTabContent';
import { WorkflowsFilter } from '~/components/ReleaseSettings/WorkflowsFilter';
import { useConfig } from '~/contexts/ConfigContext';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { PermissionService } from '~/utils/permissions.server';
import { WORKFLOWS_PAGE_HEADER } from '~/constants/page-headers';
import { WORKFLOW_TAB_CONFIGS, WORKFLOW_TABS, type WorkflowTabValue } from '~/constants/workflow-tabs';
import { PLATFORM_FILTERS, BUILD_ENVIRONMENT_FILTERS, type PlatformFilter, type BuildEnvironmentFilter } from '~/constants/workflow-filters';
import { CICD_PROVIDER_TYPES } from '~/constants/integrations';
import { IntegrationCategory } from '~/types/integrations';
import { apiGet, apiPost, apiDelete, getApiErrorMessage, apiPatch } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { workflowTypeToEnvironment } from '~/types/workflow-mappings';

export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Check if user is available
  if (!user || !user.user || !user.user.id) {
    throw redirect(`/dashboard/${org}/releases`);
  }
  
  // Check permissions - only editors and owners can access
  const isEditor = await PermissionService.isAppEditor(org, user.user.id);
  if (!isEditor) {
    throw redirect(`/dashboard/${org}/releases`);
  }
  
  return json({ org, user: sanitizeUser(user) });
});

export default function WorkflowsPage() {
  const theme = useMantineTheme();
  const data = useLoaderData<typeof loader>();
  const { org } = data as any;
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { 
    isLoadingMetadata, 
    isLoadingTenantConfig,
    metadataError,
    tenantConfigError,
    getConnectedIntegrations,
  } = useConfig();
  
  const configError = metadataError || tenantConfigError;
  const isLoading = isLoadingMetadata || isLoadingTenantConfig;

  // Get CI/CD integrations
  const cicdIntegrations = getConnectedIntegrations(IntegrationCategory.CI_CD);
  
  // Extract Jenkins and GitHub integrations
  const availableIntegrations = useMemo(() => ({
    jenkins: cicdIntegrations
      .filter(i => i.providerId.toLowerCase() === 'jenkins')
      .map(i => ({ id: i.id, name: i.name || 'Jenkins' })),
    githubActions: cicdIntegrations
      .filter(i => i.providerId.toLowerCase() === 'github_actions' || i.providerId.toLowerCase() === 'github')
      .map(i => ({ id: i.id, name: i.name || 'GitHub Actions' })),
  }), [cicdIntegrations]);

  const hasIntegrations = cicdIntegrations.length > 0;

  // Workflows state
  const [workflows, setWorkflows] = useState<CICDWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter workflows by provider
  const jenkinsWorkflows = useMemo(() => 
    workflows.filter(w => w.providerType === CICD_PROVIDER_TYPES.JENKINS),
    [workflows]
  );

  // Determine default tab: Jenkins if it has workflows, otherwise GitHub Actions
  const defaultTab = useMemo(() => {
    if (jenkinsWorkflows.length > 0) {
      return WORKFLOW_TABS.JENKINS;
    }
    return WORKFLOW_TABS.GITHUB;
  }, [jenkinsWorkflows.length]);

  // Get active tab from URL, default based on workflow counts
  const activeTab = (searchParams.get('tab') as WorkflowTabValue) || defaultTab;
  
  // Get filter values from URL params
  const platformFilter = (searchParams.get('platform') as PlatformFilter) || PLATFORM_FILTERS.ALL;
  const buildEnvironmentFilter = (searchParams.get('environment') as BuildEnvironmentFilter) || BUILD_ENVIRONMENT_FILTERS.ALL;
  
  const handleTabChange = useCallback((value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('tab', value);
    } else {
      newParams.delete('tab');
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Filter workflows by platform and build environment
  const filterWorkflows = useMemo(() => {
    return (workflows: CICDWorkflow[]): CICDWorkflow[] => {
      return workflows.filter((workflow) => {
        // Filter by platform
        if (platformFilter !== PLATFORM_FILTERS.ALL) {
          const workflowPlatform = workflow.platform?.toUpperCase();
          if (workflowPlatform !== platformFilter) {
            return false;
          }
        }

        // Filter by build environment
        if (buildEnvironmentFilter !== BUILD_ENVIRONMENT_FILTERS.ALL) {
          const workflowEnvironment = workflowTypeToEnvironment[workflow.workflowType];
          if (workflowEnvironment !== buildEnvironmentFilter) {
            return false;
          }
        }

        return true;
      });
    };
  }, [platformFilter, buildEnvironmentFilter]);

  // Filter handlers
  const handlePlatformChange = useCallback((value: PlatformFilter | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== PLATFORM_FILTERS.ALL) {
      newParams.set('platform', value);
    } else {
      newParams.delete('platform');
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleBuildEnvironmentChange = useCallback((value: BuildEnvironmentFilter | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== BUILD_ENVIRONMENT_FILTERS.ALL) {
      newParams.set('environment', value);
    } else {
      newParams.delete('environment');
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleClearFilters = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('platform');
    newParams.delete('environment');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    setLoadingWorkflows(true);
    setError(null);
    
    try {
      const result = await apiGet<{ success: boolean; workflows?: CICDWorkflow[] }>(
        `/api/v1/apps/${org}/workflows`
      );
      
      if (result.success && result.data?.workflows) {
        setWorkflows(result.data.workflows);
      } else {
        setWorkflows([]);
      }
    } catch (err) {
      console.error('[WorkflowsPage] Failed to fetch workflows:', err);
      setError(getApiErrorMessage(err, 'Failed to load workflows'));
    } finally {
      setLoadingWorkflows(false);
    }
  }, [org]);

  // Load workflows when component mounts
  useEffect(() => {
    if (hasIntegrations) {
      fetchWorkflows();
    } else {
      setLoadingWorkflows(false);
    }
  }, [fetchWorkflows, hasIntegrations]);

  // Handle workflow creation
  const handleCreateWorkflow = useCallback(async (workflowData: any) => {
    try {
      const result = await apiPost<{ success: boolean; error?: string }>(
        `/api/v1/apps/${org}/workflows`,
        workflowData
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow created successfully' });
        await fetchWorkflows();
      } else {
        showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to create workflow' });
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to create workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    }
  }, [org, fetchWorkflows]);

  // Handle workflow update
  const handleUpdateWorkflow = useCallback(async (workflowId: string, workflowData: any) => {
    try {
      const result = await apiPatch<{ success: boolean; error?: string }>(
        `/api/v1/apps/${org}/workflows/${workflowId}`,
        workflowData
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow updated successfully' });
        await fetchWorkflows();
      } else {
        showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to update workflow' });
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to update workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    }
  }, [org, fetchWorkflows]);

  // Handle workflow deletion
  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    try {
      const result = await apiDelete<{ success: boolean; error?: string }>(
        `/api/v1/apps/${org}/workflows/${workflowId}`
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow deleted successfully' });
        await fetchWorkflows();
      } else {
        showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to delete workflow' });
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to delete workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    }
  }, [org, fetchWorkflows]);

  // Apply filters to workflows
  const filteredWorkflows = useMemo(() => filterWorkflows(workflows), [workflows, filterWorkflows]);

  const tabs: TabConfig[] = useMemo(() => 
    WORKFLOW_TAB_CONFIGS.map((tabConfig) => {
      const providerFilteredWorkflows = filteredWorkflows.filter(
        w => w.providerType === tabConfig.providerType
      );
      return {
        value: tabConfig.value,
        label: tabConfig.label,
        icon: tabConfig.icon,
        count: providerFilteredWorkflows.length,
      };
    }),
    [filteredWorkflows]
  );

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('releases.workflows.list', { org });

  // Loading state
  if (isLoading) {
    return (
      <Container size="xl" py={16}>
        <Box mb={32}>
          <Skeleton height={16} width={200} mb={16} />
          <Skeleton height={32} width={300} mb={8} />
          <Skeleton height={20} width={400} />
        </Box>
        <Stack gap="lg">
          <Skeleton height={80} radius="md" />
          <Group gap="md">
            <Skeleton height={200} style={{ flex: 1 }} radius="md" />
            <Skeleton height={200} style={{ flex: 1 }} radius="md" />
          </Group>
        </Stack>
      </Container>
    );
  }

  // Error state
  if (configError) {
    return (
      <Container size="xl" py={16}>
        <Breadcrumb items={breadcrumbItems} mb={16} />
        <PageHeader
          title={WORKFLOWS_PAGE_HEADER.TITLE}
          description={WORKFLOWS_PAGE_HEADER.DESCRIPTION}
          icon={IconGitBranch}
        />

        <Center py={80}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertCircle size={32} />
            </ThemeIcon>
            <Text size="lg" fw={500} c={theme.colors.slate[7]}>
              Failed to load workflows
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} maw={400} ta="center">
              {typeof configError === 'string' ? configError : 'An error occurred while loading workflows. Please try again.'}
            </Text>
            <Button
              variant="light"
              color="brand"
              leftSection={<IconRefresh size={16} />}
              onClick={() => window.location.reload()}
            >
            Try Again
          </Button>
        </Stack>
      </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py={16}>
      {/* Header Section */}
      <Breadcrumb items={breadcrumbItems} mb={16} />
      <PageHeader
        title={WORKFLOWS_PAGE_HEADER.TITLE}
        description={WORKFLOWS_PAGE_HEADER.DESCRIPTION}
        icon={IconAutomation}
        descriptionMaxWidth={600}
        rightSection={
          <Group gap="md">
            <Button
              component={Link}
              to={`/dashboard/${org}/releases/workflows/new`}
              color="brand"
              leftSection={<IconRocket size={16} />}
            >
              Add Workflow
            </Button>
            <BackToReleasesButton />
          </Group>
        }
      />

      {/* Filters */}
      {!loadingWorkflows && !error && (
        <WorkflowsFilter
          platform={platformFilter}
          buildEnvironment={buildEnvironmentFilter}
          onPlatformChange={handlePlatformChange}
          onBuildEnvironmentChange={handleBuildEnvironmentChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Workflows Content with Tabs */}
      {loadingWorkflows ? (
        <Stack gap="lg">
          <Group justify="space-between">
            <Skeleton height={32} width={200} />
            <Skeleton height={36} width={160} />
          </Group>
          <Group gap="md">
            <Skeleton height={200} style={{ flex: 1 }} radius="md" />
            <Skeleton height={200} style={{ flex: 1 }} radius="md" />
          </Group>
        </Stack>
      ) : error ? (
        <Center py={60}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertCircle size={32} />
            </ThemeIcon>
            <Text size="lg" fw={500} c={theme.colors.slate[7]}>
              Failed to load workflows
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} maw={400} ta="center">
              {error}
            </Text>
            <Button
              variant="light"
              color="brand"
              leftSection={<IconRefresh size={16} />}
              onClick={fetchWorkflows}
            >
              Try Again
            </Button>
          </Stack>
        </Center>
      ) : (
        <StandardizedTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabs={tabs}
          tabFontSize="sm"
        >
          {WORKFLOW_TAB_CONFIGS.map((tabConfig) => {
            const providerFilteredWorkflows = filteredWorkflows.filter(
              w => w.providerType === tabConfig.providerType
            );

            return (
              <Tabs.Panel key={tabConfig.value} value={tabConfig.value}>
                <WorkflowsTabContent
                  workflows={providerFilteredWorkflows}
                  availableIntegrations={availableIntegrations}
                  appId={org}
                  cicdIntegrationsCount={cicdIntegrations.length}
                  hasIntegrations={hasIntegrations}
                  providerType={tabConfig.providerType}
                  onRefresh={fetchWorkflows}
                  onCreate={handleCreateWorkflow}
                  onUpdate={handleUpdateWorkflow}
                  onDelete={handleDeleteWorkflow}
                />
              </Tabs.Panel>
            );
          })}
        </StandardizedTabs>
      )}
    </Container>
  );
}

