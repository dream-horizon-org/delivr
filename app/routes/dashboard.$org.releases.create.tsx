/**
 * Create Release Page
 * Single form with review modal
 * 
 * Data Flow:
 * - Uses ConfigContext (React Query) for release configs
 * - Release configs: Cached via useReleaseConfigs hook in ConfigContext
 * - System metadata: Cached via ConfigContext (with initialData from parent routes)
 * - Fast form load: Configs available immediately from cache
 * - Cache invalidation: Automatically handled after release creation
 */

import { json, redirect } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { Container, Paper, Stack } from '@mantine/core';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import { getResponseErrorMessage } from '~/utils/api-error-utils';
import { Breadcrumb } from '~/components/Common';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { useConfig } from '~/contexts/ConfigContext';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
import { useQueryClient } from 'react-query';
import { invalidateReleases } from '~/utils/cache-invalidation';
import type { CreateReleaseBackendRequest } from '~/types/release-creation-backend';
import { NoConfigurationAlert } from '~/components/Releases/NoConfigurationAlert';
import { FormPageHeader } from '~/components/Common/FormPageHeader';
import { PermissionService } from '~/utils/permissions.server';

export const loader = authenticateLoaderRequest(async ({ params, user, request }) => {
  const { org } = params;

  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  console.log('create release page loader', org, user);

  // Check if user is editor or owner - only editors/owners can create releases
  try {
    const isEditor = await PermissionService.isTenantEditor(org, user.user.id);
    if (!isEditor) {
      throw redirect(`/dashboard/${org}/releases`);
    }
  } catch (error) {
    console.error('[CreateRelease] Permission check failed:', error);
    throw redirect(`/dashboard/${org}/releases`);
  }

  // Check if returnTo query param exists (user came back from config creation)
  const returnTo = new URL(request.url).searchParams.get('returnTo');

  return json({
    org,
    user,
    returnTo,
  });
});

export default function CreateReleasePage() {
  const loaderData = useLoaderData<typeof loader>();
  console.log('create release page', loaderData);
  const org = (loaderData as { org: string }).org;
  const userId = ((loaderData as { user?: { id: string } }).user?.id) || '';
  const { activeReleaseConfigs } = useConfig();
  const hasConfigurations = activeReleaseConfigs.length > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  console.log('create release page', org, userId, hasConfigurations);

  // Handle form submission - use BFF route (same pattern as release-config and integrations)
  const handleSubmit = async (backendRequest: CreateReleaseBackendRequest): Promise<void> => {
    try {
      const endpoint = `/api/v1/tenants/${org}/releases`;
      const result = await apiPost<{ success: boolean; release?: { id: string }; error?: string }>(endpoint, backendRequest);

      // apiRequest normalizes the response: { success: true, release: {...} } becomes { success: true, data: { release: {...} } }
      // Check result.success first (from apiRequest envelope)
      if (!result.success) {
        const errorMessage = getResponseErrorMessage(result, 'Failed to create release');
        throw new Error(errorMessage);
      }

      // Extract release from normalized data structure
      // result.data will be { release: {...} } after normalization
      const responseData = result.data as { release?: { id: string } } | undefined;
      const release = responseData?.release;
      
      // Invalidate React Query cache to trigger refetch
      await invalidateReleases(queryClient, org);
      
      // Add a cache-busting timestamp to ensure Remix loader re-runs
      // This forces the browser to bypass cached loader data
      const cacheBuster = Date.now();

      // Navigate to release detail page on success
      if (release?.id) {
        navigate(`/dashboard/${org}/releases/${release.id}?refresh=${cacheBuster}`);
      } else {
        navigate(`/dashboard/${org}/releases?refresh=${cacheBuster}`);
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to create release');
      throw new Error(errorMessage);
    }
  };

  // Handler to create new configuration
  const handleCreateNewConfig = () => {
    navigate(`/dashboard/${org}/releases/configure?returnTo=create`);
  };

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('releases.create', { org });

  // If no configurations exist, show banner to create one
  if (!hasConfigurations) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <Container size="xl">
          <Stack gap="md">
            <Breadcrumb items={breadcrumbItems} />
            <NoConfigurationAlert org={org} onCreateConfig={handleCreateNewConfig} />
          </Stack>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Container size="xl">
        <Stack gap="md">
          <Breadcrumb items={breadcrumbItems} />
          <Paper shadow="sm" p="xl" radius="md">
            <FormPageHeader
              title="Create Release"
              description="Fill in the form below to create a new release"
              backUrl={`/dashboard/${org}/releases`}
            />

            <CreateReleaseForm org={org} userId={userId} onSubmit={handleSubmit} />
          </Paper>
        </Stack>
      </Container>
    </div>
  );
}
