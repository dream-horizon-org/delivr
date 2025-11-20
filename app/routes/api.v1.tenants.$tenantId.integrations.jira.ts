/**
 * BFF Route: Jira Integration
 * Handles Jira project management integration API calls
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { JiraIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

/**
 * GET - Get Jira integration for tenant
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { tenantId } = params;

    if (!tenantId) {
      return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
    }

    try {
      const service = new JiraIntegrationService();
      // Use tenantId as projectId for now
      const result = await service.listIntegrations(tenantId, user.user.id);

      if (!result.success) {
        return json(result, { status: 500 });
      }

      // Return first integration if exists (single integration per tenant)
      const integration = result.data?.[0];
      
      return json({
        success: true,
        integration: integration || null,
      });
    } catch (error) {
      console.error('[BFF-Jira-Get] Error:', error);
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get Jira integration',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST - Create Jira integration
 * DELETE - Delete Jira integration
 * PATCH - Update Jira integration
 */
const createJiraAction = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const service = new JiraIntegrationService();

    // Use tenantId as projectId
    const result = await service.createIntegration(
      tenantId,
      user.user.id,
      {
        name: body.name || body.displayName || 'Jira Integration',
        providerType: 'jira',
        config: {
          baseUrl: body.hostUrl || body.config?.baseUrl,
          email: body.username || body.email || body.config?.email,
          apiToken: body.apiToken || body.config?.apiToken,
          jiraType: body.jiraType || body.config?.jiraType || 'CLOUD',
        },
      }
    );

    return json(result, { status: result.success ? 201 : 500 });
  } catch (error) {
    console.error('[BFF-Jira-Create] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Jira integration',
      },
      { status: 500 }
    );
  }
};

const deleteJiraAction = async ({
  params,
  request,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;
  const url = new URL(request.url);
  const integrationId = url.searchParams.get('integrationId');

  if (!tenantId || !integrationId) {
    return json(
      { success: false, error: 'Tenant ID and Integration ID required' },
      { status: 400 }
    );
  }

  try {
    const service = new JiraIntegrationService();
    const result = await service.deleteIntegration(tenantId, integrationId, user.user.id);

    return json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    console.error('[BFF-Jira-Delete] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete Jira integration',
      },
      { status: 500 }
    );
  }
};

const updateJiraAction = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;
  const url = new URL(request.url);
  const integrationId = url.searchParams.get('integrationId');

  if (!tenantId || !integrationId) {
    return json(
      { success: false, error: 'Tenant ID and Integration ID required' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const service = new JiraIntegrationService();

    const updateData: any = {};
    if (body.name || body.displayName) {
      updateData.name = body.name || body.displayName;
    }
    if (body.config || body.hostUrl || body.apiToken) {
      updateData.config = {
        ...(body.config || {}),
        ...(body.hostUrl && { baseUrl: body.hostUrl }),
        ...(body.email && { email: body.email }),
        ...(body.username && { email: body.username }),
        ...(body.apiToken && { apiToken: body.apiToken }),
        ...(body.jiraType && { jiraType: body.jiraType }),
      };
    }

    const result = await service.updateIntegration(tenantId, integrationId, user.user.id, updateData);

    return json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[BFF-Jira-Update] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update Jira integration',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: createJiraAction,
  DELETE: deleteJiraAction,
  PATCH: updateJiraAction,
});

