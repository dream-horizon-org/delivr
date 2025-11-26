/**
 * Create Release Page
 * Single form with review modal
 */

import { json } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { Container, Paper, Button } from '@mantine/core';
import { IconSettings, IconArrowLeft } from '@tabler/icons-react';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { getSetupData } from '~/.server/services/ReleaseManagement/setup';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import { useConfig } from '~/contexts/ConfigContext';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
import { useQueryClient } from 'react-query';
import { invalidateReleases } from '~/utils/cache-invalidation';
import type { CreateReleaseBackendRequest } from '~/types/release-creation-backend';

export const loader = authenticateLoaderRequest(async ({ params, user, request }) => {
  const { org } = params;

  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }

  // Get setup data for validation
  const setupData = await getSetupData(org);

  // Check if returnTo query param exists (user came back from config creation)
  const returnTo = new URL(request.url).searchParams.get('returnTo');

  return json({
    org,
    user,
    setupData,
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
      // apiPost returns ApiResponse<T> where T is the response type
      // BFF route returns: { success: true, release: {...} }
      // apiRequest returns the JSON response directly
      const result = await apiPost<{ success: boolean; release?: { id: string }; error?: string }>(endpoint, backendRequest);

      // apiPost throws if !result.success, so if we get here, result.success is true
      // The BFF returns { success: true, release: {...} }
      // apiRequest returns it as { success: true, data: { success: true, release: {...} } } or directly
      // Check result.data first (if apiRequest wraps it), then fall back to result itself
      const responseData = result.data || (result as unknown as { success: boolean; release?: { id: string }; error?: string });
      
      if (!responseData || !responseData.success) {
        throw new Error(responseData?.error || result.error || 'Failed to create release');
      }

      // Invalidate releases cache so list page shows the new release
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
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <Container size="lg">
          <Paper shadow="sm" p="xl" radius="md">
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/${org}/releases`)}
                className="text-gray-400 hover:text-gray-600"
              >
                <IconArrowLeft size={20} />
              </button>
              <div>
                <div className="text-lg font-semibold text-gray-700">Create Release</div>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <IconSettings className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-medium text-yellow-800">
                    No Release Configuration Found
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      You need to create a release configuration before you can create releases.
                      Release configurations define the platforms, pipelines, testing phases, and
                      approval workflows for your releases.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Button
                      leftSection={<IconSettings size={18} />}
                      onClick={handleCreateNewConfig}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Create Release Configuration
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Paper>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Container size="xl">
        <Paper shadow="sm" p="xl" radius="md">
          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/${org}/releases`)}
              className="text-gray-400 hover:text-gray-600"
            >
              <IconArrowLeft size={20} />
            </button>
            <div>
              <div className="text-lg font-semibold text-gray-700">Create Release</div>
              <div className="text-sm text-gray-500">Fill in the form below to create a new release</div>
            </div>
          </div>

          <CreateReleaseForm org={org} userId={userId} onSubmit={handleSubmit} />
        </Paper>
      </Container>
    </div>
  );
}
