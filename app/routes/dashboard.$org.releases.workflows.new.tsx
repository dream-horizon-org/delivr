/**
 * Create Workflow Route
 * Full page form for creating a new CI/CD workflow
 */

import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useNavigation, Link } from '@remix-run/react';
import { useMemo } from 'react';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { useConfig } from '~/contexts/ConfigContext';
import { WorkflowForm } from '~/components/ReleaseSettings/WorkflowForm';
import {
  Box,
  Skeleton,
  Stack,
} from '@mantine/core';

export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  return json({
    organizationId: org,
    existingWorkflow: null,
    isEditMode: false,
    fetchError: null,
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

export default function CreateWorkflowPage() {
  const { organizationId, existingWorkflow, isEditMode, fetchError } = useLoaderData<typeof loader>();
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
      />
    </Box>
  );
}

