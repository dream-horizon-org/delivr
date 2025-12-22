/**
 * Create Workflow Route
 * Full page form for creating a new CI/CD workflow
 */

import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useNavigation, Link } from '@remix-run/react';
import { useMemo } from 'react';
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import { useConfig } from '~/contexts/ConfigContext';
import { WorkflowForm } from '~/components/ReleaseSettings/WorkflowForm';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { apiGet } from '~/utils/api-client';
import {
  Box,
  Skeleton,
  Stack,
} from '@mantine/core';
import { PermissionService } from '~/utils/permissions.server';
interface WorkflowLoaderData {
  organizationId: string;
  existingWorkflow: CICDWorkflow | null;
  isEditMode: boolean;
  fetchError: string | null;
  workflows: CICDWorkflow[];
}
export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Check if user is available
  if (!user || !user.user || !user.user.id) {
    throw redirect(`/dashboard/${org}/releases`);
  }
  const isEditor = await PermissionService.isTenantEditor(org, user.user.id);
  if (!isEditor) {
    throw redirect(`/dashboard/${org}/releases`);
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
    existingWorkflow: null,
    isEditMode: false,
    fetchError: null,
    workflows,
  });
});

export const action = authenticateActionRequest({
  POST: async ({ request, params, user }: ActionFunctionArgs & { user: any }) => {
    const { org } = params;
    
    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }
    
    // Check if user is available
    if (!user || !user.user || !user.user.id) {
      return json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    const isEditor = await PermissionService.isTenantEditor(org, user.user.id);
    if (!isEditor) {
      return json({ error: 'Only editors and owners can create workflows' }, { status: 403 });
    }
    
    // Redirect back to workflows page after save
    return redirect(`/dashboard/${org}/releases/workflows`);
  },
});

export default function CreateWorkflowPage() {
  const loaderData = useLoaderData<WorkflowLoaderData>();
  const { organizationId, existingWorkflow, isEditMode, fetchError, workflows } = loaderData;
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

