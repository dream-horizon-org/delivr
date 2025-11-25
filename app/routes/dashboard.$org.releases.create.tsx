/**
 * Create Release Page
 * Single form with review modal
 */

import { json, redirect } from '@remix-run/node';
import { useLoaderData, useNavigate, useSubmit } from '@remix-run/react';
import { Container, Paper, Button } from '@mantine/core';
import { IconSettings, IconArrowLeft } from '@tabler/icons-react';
import { authenticateLoaderRequest, authenticateActionRequest, ActionMethods } from '~/utils/authenticate';
import { getSetupData } from '~/.server/services/ReleaseManagement/setup';
import { createRelease } from '~/.server/services/ReleaseManagement/release-creation.service';
import { useConfig } from '~/contexts/ConfigContext';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
import type { CreateReleaseBackendRequest } from '~/types/release-creation-backend';
import { validateReleaseCreationState } from '~/utils/release-creation-validation';

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

export const action = authenticateActionRequest({
  [ActionMethods.POST]: async ({ request, params, user }) => {
    const { org } = params;

    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }

    const userId = (user as { id?: string })?.id || '';
    if (!userId) {
      throw new Response('Unauthorized', { status: 401 });
    }

    try {
      // Parse JSON body
      const body = await request.json();
      const backendRequest = (body.body ? JSON.parse(body.body) : body) as CreateReleaseBackendRequest;

      // Validate request
      const validation = validateReleaseCreationState(backendRequest);
      if (!validation.isValid) {
        return json(
          {
            success: false,
            error: 'Validation failed',
            errors: validation.errors,
          },
          { status: 400 }
        );
      }

      // Call backend service
      const result = await createRelease(backendRequest, org, userId);

      if (!result.success) {
        return json(
          {
            success: false,
            error: result.error || 'Failed to create release',
          },
          { status: 500 }
        );
      }

      // Redirect to release detail page
      if (result.release?.id) {
        return redirect(`/dashboard/${org}/releases/${result.release.id}`);
      }

      return redirect(`/dashboard/${org}/releases`);
    } catch (error) {
      console.error('[CreateRelease Action] Error:', error);
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        },
        { status: 500 }
      );
    }
  },
});

export default function CreateReleasePage() {
  const loaderData = useLoaderData<typeof loader>();
  const org = (loaderData as { org: string }).org;
  const userId = ((loaderData as { user?: { id: string } }).user?.id) || '';
  const { activeReleaseConfigs } = useConfig();
  const hasConfigurations = activeReleaseConfigs.length > 0;
  const navigate = useNavigate();
  const submit = useSubmit();

  // Handle form submission
  const handleSubmit = async (backendRequest: CreateReleaseBackendRequest) => {
    submit(
      { body: JSON.stringify(backendRequest) },
      {
        method: 'POST',
        encType: 'application/json',
      }
    );
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
