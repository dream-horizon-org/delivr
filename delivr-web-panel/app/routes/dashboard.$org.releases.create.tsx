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
  const { org: appId } = params; // Route param is still $org but we treat it as appId

  if (!appId) {
    throw new Response('App not found', { status: 404 });
  }

  // Check if user is editor or owner - only editors/owners can create releases
  try {
    const isEditor = await PermissionService.isAppEditor(appId, user.user.id);
    if (!isEditor) {
      throw redirect(`/dashboard/${appId}/releases`);
    }
  } catch (error) {
    console.error('[CreateRelease] Permission check failed:', error);
    throw redirect(`/dashboard/${appId}/releases`);
  }

  // Check if returnTo query param exists (user came back from config creation)
  const returnTo = new URL(request.url).searchParams.get('returnTo');

  return json({
    appId,
    user,
    returnTo,
  });
});

export default function CreateReleasePage() {
  const loaderData = useLoaderData<typeof loader>();
  const appId = (loaderData as { appId?: string }).appId ?? '';
  const userId = ((loaderData as { user?: { id: string } }).user?.id) ?? '';
  const { activeReleaseConfigs } = useConfig();
  const hasConfigurations = activeReleaseConfigs.length > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Handle form submission - use BFF route (same pattern as release-config and integrations)
  const handleSubmit = async (backendRequest: CreateReleaseBackendRequest): Promise<void> => {
    try {
      const endpoint = `/api/v1/apps/${appId}/releases`; // Updated to use /apps endpoint
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
      await invalidateReleases(queryClient, appId);
      
      // Add a cache-busting timestamp to ensure Remix loader re-runs
      // This forces the browser to bypass cached loader data
      const cacheBuster = Date.now();

      // Navigate to release detail page on success
      if (release?.id) {
        navigate(`/dashboard/${appId}/releases/${release.id}?refresh=${cacheBuster}`);
      } else {
        navigate(`/dashboard/${appId}/releases?refresh=${cacheBuster}`);
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to create release');
      throw new Error(errorMessage);
    }
  };

  // Handler to create new configuration
  const handleCreateNewConfig = () => {
    navigate(`/dashboard/${appId}/releases/configure?returnTo=create`);
  };

  // Breadcrumb items (breadcrumbs API expects key "org" for URL segment)
  const breadcrumbItems = getBreadcrumbItems('releases.create', { org: appId });

  // If no configurations exist, show banner to create one
  if (!hasConfigurations) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <Container size="xl">
          <Stack gap="md">
            <Breadcrumb items={breadcrumbItems} />
            <NoConfigurationAlert org={appId} onCreateConfig={handleCreateNewConfig} />
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
            />

            <CreateReleaseForm org={appId} userId={userId} onSubmit={handleSubmit} />
          </Paper>
        </Stack>
      </Container>
    </div>
  );
}
