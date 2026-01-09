/**
 * Edit Workflow Route
 * Full page form for editing an existing CI/CD workflow
 */

import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useNavigation, Link } from '@remix-run/react';
import { useMemo } from 'react';
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import { useConfig } from '~/contexts/ConfigContext';
import { WorkflowForm } from '~/components/ReleaseSettings/WorkflowForm';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import {
  Box,
  Center,
  Stack,
  Text,
  ThemeIcon,
  Button,
  Skeleton,
  Group,
  useMantineTheme,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconRefresh,
} from '@tabler/icons-react';
import { Breadcrumb } from '~/components/Common';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { apiGet, getApiErrorMessage } from '~/utils/api-client';
import { extractApiErrorMessage } from '~/utils/api-error-utils';
import { PermissionService } from '~/utils/permissions.server';

export const loader = authenticateLoaderRequest(async ({ params, request, user }: LoaderFunctionArgs & { user: any }): Promise<ReturnType<typeof json>> => {
  const { org, workflowId } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  if (!workflowId) {
    throw new Response('Workflow ID not found', { status: 404 });
  }
  
  // Check if user is available
  if (!user || !user.user || !user.user.id) {
    throw redirect(`/dashboard/${org}/releases`);
  }
  
  // Check permissions - only editors and owners can access
  const isEditor = await PermissionService.isTenantEditor(org, user.user.id);
  if (!isEditor) {
    throw redirect(`/dashboard/${org}/releases`);
  }
  let existingWorkflow: CICDWorkflow | null = null;
  let fetchError: string | null = null;
  
  // Load existing workflow
  try {
    const endpoint = `/api/v1/tenants/${org}/workflows/${workflowId}`;
    const url = new URL(request.url);
    const result = await apiGet<{ workflow?: CICDWorkflow }>(
      `${url.protocol}//${url.host}${endpoint}`,
      {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        }
      }
    );
   
    // Extract workflow from the nested structure
    const workflow = result.data?.workflow;
    
    if (workflow && workflow.id) {
      // Ensure workflow has an ID - use the one from URL params if missing
      if (!workflow.id && workflowId) {
        workflow.id = workflowId;
      }
      
      existingWorkflow = workflow;
    } else {
      fetchError = extractApiErrorMessage(result.error, 'Workflow not found');
    }
  } catch (error: any) {
    fetchError = getApiErrorMessage(error, 'Failed to load workflow');
  }
  
  // Fetch workflows for duplicate name validation
  let workflows: CICDWorkflow[] = [];
  try {
    const url = new URL(request.url);
    const result = await apiGet<{ workflows?: CICDWorkflow[] }>(
      `${url.protocol}//${url.host}/api/v1/tenants/${org}/workflows`,
      {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        }
      }
    );
    workflows = result.data?.workflows || [];
  } catch (error) {
    // Silently fail - workflows list is optional for validation
  }
  
  return json({
    organizationId: org,
    workflowId, // Include workflowId from URL params as fallback
    existingWorkflow,
    isEditMode: true,
    fetchError,
    workflows,
  });
});

export const action = authenticateActionRequest({
  PUT: async ({ request, params, user }: ActionFunctionArgs & { user: any }) => {
    const { org, workflowId } = params;
    
    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }
    
    if (!workflowId) {
      throw new Response('Workflow ID not found', { status: 404 });
    }
    
    // Check if user is available
    if (!user || !user.user || !user.user.id) {
      return json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    // Check permissions - only editors and owners can edit workflows
    const isEditor = await PermissionService.isTenantEditor(org, user.user.id);
    if (!isEditor) {
      return json({ error: 'Only editors and owners can edit workflows' }, { status: 403 });
    }
    
    // Redirect back to workflows page after save
    return redirect(`/dashboard/${org}/releases/workflows`);
  },
});

type LoaderData = {
  organizationId: string;
  workflowId: string;
  existingWorkflow: CICDWorkflow | null;
  isEditMode: boolean;
  fetchError: string | null;
  workflows: CICDWorkflow[];
};

/**
 * Workflow Edit Loading State Component
 * Displays loading skeleton while workflow data is being fetched
 */
function WorkflowEditLoadingState() {
  return (
    <Box p={32}>
      <Skeleton height={16} width={250} mb={24} />
      <Box maw={800} mx="auto">
        <Skeleton height={48} width={300} mb={16} />
        <Skeleton height={24} width={200} mb={32} />
        <Stack gap="md">
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={100} />
          <Skeleton height={56} />
        </Stack>
      </Box>
    </Box>
  );
}

/**
 * Workflow Edit Error State Component
 * Displays error message when workflow fails to load
 */
interface WorkflowEditErrorStateProps {
  error: string;
  organizationId: string;
  breadcrumbItems: Array<{ title: string; href?: string }>;
}

function WorkflowEditErrorState({
  error,
  organizationId,
  breadcrumbItems,
}: WorkflowEditErrorStateProps) {
  const theme = useMantineTheme();

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
              Failed to Load Workflow
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} mb={24}>
              {error}
            </Text>
          </Box>
          <Group gap="md">
            <Button
              variant="default"
              leftSection={<IconArrowLeft size={16} />}
              component={Link}
              to={`/dashboard/${organizationId}/releases/workflows`}
            >
              Back to Workflows
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

export default function EditWorkflowPage() {
  const theme = useMantineTheme();
  const { organizationId, workflowId, existingWorkflow, isEditMode, fetchError, workflows } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { getConnectedIntegrations } = useConfig();
  
  // Show loading state during navigation
  const isLoading = navigation.state === 'loading';
  
  // Transform connected integrations into format expected by WorkflowForm
  const availableIntegrations = useMemo(() => {
    const allConnected = getConnectedIntegrations();
    
    return {
      jenkins: allConnected
        .filter(i => i.providerId === 'jenkins')
        .map(i => ({ id: i.id, name: i.name })),
      githubActions: allConnected
        .filter(i => i.providerId?.toLowerCase() === 'github_actions' || i.providerId?.toLowerCase() === 'github-actions')
        .map(i => ({ id: i.id, name: i.name })),
    };
  }, [getConnectedIntegrations]);
  
  const handleSubmit = async () => {
    navigate(`/dashboard/${organizationId}/releases/workflows`);
  };
  
  const handleCancel = () => {
    navigate(`/dashboard/${organizationId}/releases/workflows`);
  };

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('releases.workflows.detail', {
    org: organizationId,
    isEditMode,
  });
  
  // Show loading state
  if (isLoading) {
    return <WorkflowEditLoadingState />;
  }
  
  // Show error if failed to load workflow
  if (fetchError) {
    return (
      <WorkflowEditErrorState
        error={fetchError}
        organizationId={organizationId}
        breadcrumbItems={breadcrumbItems}
      />
    );
  }
  
  return (
    <Box>
      <WorkflowForm
        tenantId={organizationId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        availableIntegrations={availableIntegrations}
        existingWorkflow={existingWorkflow}
        isEditMode={isEditMode}
        workflowId={workflowId}
        workflows={workflows}
      />
    </Box>
  );
}

