/**
 * BFF Route: Project Management Integration
 * Generic route for all PM providers (JIRA, LINEAR, ASANA, etc.)
 * Uses ProjectManagementIntegrationService directly
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/auth.interface';
import { ProjectManagementIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import type { ProjectManagementProviderType } from '~/.server/services/ReleaseManagement/integrations';

/**
 * GET - Get PM integration for tenant (optionally filtered by providerType)
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { tenantId } = params;

    if (!tenantId) {
      return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
    }

    try {
      const url = new URL(request.url);
      const providerType = url.searchParams.get('providerType') as ProjectManagementProviderType | null;

      const result = await ProjectManagementIntegrationService.getIntegration(
        tenantId,
        user.user.id,
        providerType || undefined
      );

      if (!result.success) {
        return json(result, { status: 404 });
      }

      // Return integration in same format as old Jira route for backward compatibility
      return json({
        success: true,
        integration: result.data || null,
      });
    } catch (error) {
      console.error('[BFF-PM-Get] Error:', error);
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get integration',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST - Create PM integration
 * DELETE - Delete PM integration
 * PATCH - Update PM integration
 */
const createPMAction = async ({
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
    const providerType = (body.providerType || 'JIRA').toUpperCase() as ProjectManagementProviderType;

    // Transform Jira-specific fields to generic format
    const config: any = body.config || {};
    if (body.hostUrl) config.baseUrl = body.hostUrl;
    if (body.email) config.email = body.email;
    if (body.username) config.email = body.username;
    if (body.apiToken) config.apiToken = body.apiToken;
    if (body.jiraType) config.jiraType = body.jiraType;
    if (body._encrypted) config._encrypted = body._encrypted; // Forward encryption flag

    console.log('[BFF-PM-Create] Creating integration with _encrypted:', body._encrypted);

    const result = await ProjectManagementIntegrationService.createIntegration(
      tenantId,
      user.user.id,
      {
        name: body.name || body.displayName || `${providerType} Integration`,
        providerType,
        config,
      }
    );

    return json(result, { status: result.success ? 201 : 500 });
  } catch (error) {
    console.error('[BFF-PM-Create] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create integration',
      },
      { status: 500 }
    );
  }
};

const deletePMAction = async ({
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
    const result = await ProjectManagementIntegrationService.deleteIntegration(
      tenantId,
      integrationId,
      user.user.id
    );

    return json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    console.error('[BFF-PM-Delete] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete integration',
      },
      { status: 500 }
    );
  }
};

const updatePMAction = async ({
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

    console.log('[BFF-PM-Update] Update request:', {
      integrationId,
      bodyKeys: Object.keys(body),
      hasApiToken: !!body.apiToken,
      hasName: !!(body.name || body.displayName),
      hasHostUrl: !!body.hostUrl,
      hasEmail: !!body.email,
      _encrypted: body._encrypted
    });

    const updateData: any = {};
    if (body.name || body.displayName) {
      updateData.name = body.name || body.displayName;
    }
    
    // Only build config if any fields are provided
    const configUpdates: any = {
      ...(body.config || {}),
      ...(body.hostUrl && { baseUrl: body.hostUrl }),
      ...(body.email && { email: body.email }),
      ...(body.username && { email: body.username }),
      ...(body.jiraType && { jiraType: body.jiraType }),
    };
    
    // Only include apiToken if explicitly provided (not empty)
    if (body.apiToken && body.apiToken.trim()) {
      configUpdates.apiToken = body.apiToken;
      if (body._encrypted) configUpdates._encrypted = body._encrypted; // Forward encryption flag
    }
    
    // Only add config to updateData if there are actual config updates
    if (Object.keys(configUpdates).length > 0) {
      updateData.config = configUpdates;
    }

    console.log('[BFF-PM-Update] Prepared update data:', {
      hasName: !!updateData.name,
      hasConfig: !!updateData.config,
      configKeys: updateData.config ? Object.keys(updateData.config) : []
    });

    const result = await ProjectManagementIntegrationService.updateIntegration(
      tenantId,
      integrationId,
      user.user.id,
      updateData
    );

    console.log('[BFF-PM-Update] Result:', { success: result.success, error: result.error });

    return json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[BFF-PM-Update] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update integration',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: createPMAction,
  DELETE: deletePMAction,
  PATCH: updatePMAction,
});

