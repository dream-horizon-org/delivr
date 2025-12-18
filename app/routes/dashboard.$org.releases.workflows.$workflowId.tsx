/**
 * Edit Workflow Route
 * Full page form for editing an existing CI/CD workflow
 */

import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useNavigation, Link } from '@remix-run/react';
import { useMemo } from 'react';
import { authenticateLoaderRequest } from '~/utils/authenticate';
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
  Breadcrumbs,
  Anchor,
  Group,
  useMantineTheme,
} from '@mantine/core';
import {
  IconRocket,
  IconAlertCircle,
  IconArrowLeft,
  IconRefresh,
} from '@tabler/icons-react';
import { apiGet, getApiErrorMessage } from '~/utils/api-client';

export const loader = authenticateLoaderRequest(async ({ params, request }: LoaderFunctionArgs & { user: any }) => {
  const { org, workflowId } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  if (!workflowId) {
    throw new Response('Workflow ID not found', { status: 404 });
  }
  
  let existingWorkflow: CICDWorkflow | null = null;
  let fetchError: string | null = null;
  
  // Load existing workflow
  try {
    const endpoint = `/api/v1/tenants/${org}/workflows/${workflowId}`;
    const url = new URL(request.url);
    const result = await apiGet<CICDWorkflow>(
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
        
        fetchError = result.error || 'Workflow not found';
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

export async function action({ request, params }: ActionFunctionArgs) {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Redirect back to workflows page after save
  return redirect(`/dashboard/${org}/releases/workflows`);
}

export default function EditWorkflowPage() {
  const theme = useMantineTheme();
  const { organizationId, existingWorkflow, isEditMode, fetchError, workflows } = useLoaderData<typeof loader>();
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
  const breadcrumbItems = [
    { title: 'Release Management', href: `/dashboard/${organizationId}/releases` },
    { title: 'Workflows', href: `/dashboard/${organizationId}/releases/workflows` },
    { title: 'Edit', href: '#' },
  ].map((item, index) => (
    item.href === '#' ? (
      <Text key={index} size="sm" c={theme.colors.slate[6]}>
        {item.title}
      </Text>
    ) : (
      <Anchor
        key={index}
        component={Link}
        to={item.href}
        size="sm"
        c={theme.colors.slate[5]}
      >
        {item.title}
      </Anchor>
    )
  ));
  
  // Show loading state
  if (isLoading) {
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
  
  // Show error if failed to load workflow
  if (fetchError) {
    return (
      <Box p={32}>
        <Breadcrumbs mb={24}>{breadcrumbItems}</Breadcrumbs>
        
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
                {fetchError}
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
  
  return (
    <Box>
      <WorkflowForm
        tenantId={organizationId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        availableIntegrations={availableIntegrations}
        existingWorkflow={existingWorkflow}
        isEditMode={isEditMode}
        workflows={workflows}
      />
    </Box>
  );
}

