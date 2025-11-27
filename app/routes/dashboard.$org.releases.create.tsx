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

import { json } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { Container, Paper } from '@mantine/core';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import { useConfig } from '~/contexts/ConfigContext';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
import { useQueryClient } from 'react-query';
import { invalidateReleases } from '~/utils/cache-invalidation';
import type { CreateReleaseBackendRequest } from '~/types/release-creation-backend';
import { NoConfigurationAlert } from '~/components/Releases/NoConfigurationAlert';
import { FormPageHeader } from '~/components/Common/FormPageHeader';

export const loader = authenticateLoaderRequest(async ({ params, user, request }) => {
  const { org } = params;

  if (!org) {
    throw new Response('Organization not found', { status: 404 });
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
  const org = (loaderData as { org: string }).org;
  const userId = ((loaderData as { user?: { id: string } }).user?.id) || '';
  const { activeReleaseConfigs } = useConfig();
  const hasConfigurations = activeReleaseConfigs.length > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Handle form submission - use BFF route (same pattern as release-config and integrations)
  const handleSubmit = async (backendRequest: CreateReleaseBackendRequest): Promise<void> => {
    try {
      const endpoint = `/api/v1/tenants/${org}/releases`;
      const result = await apiPost<{ success: boolean; release?: { id: string }; error?: string }>(endpoint, backendRequest);

      const responseData = result.data || (result as unknown as { success: boolean; release?: { id: string }; error?: string });
      
      if (!responseData || !responseData.success) {
        throw new Error(responseData?.error || result.error || 'Failed to create release');
      }
      await invalidateReleases(queryClient, org);

      // Navigate to release detail page on success
      if (responseData.release?.id) {
        navigate(`/dashboard/${org}/releases/${responseData.release.id}`);
      } else {
        navigate(`/dashboard/${org}/releases`);
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

  // If no configurations exist, show banner to create one
  if (!hasConfigurations) {
    return <NoConfigurationAlert org={org} onCreateConfig={handleCreateNewConfig} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Container size="xl">
        <Paper shadow="sm" p="xl" radius="md">
          <FormPageHeader
            title="Create Release"
            description="Fill in the form below to create a new release"
            backUrl={`/dashboard/${org}/releases`}
          />

          <CreateReleaseForm org={org} userId={userId} onSubmit={handleSubmit} />
        </Paper>
      </Container>
    </div>
  );
}
