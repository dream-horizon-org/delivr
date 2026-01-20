import { json } from '@remix-run/node';
import { SCMIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import type { CreateSCMIntegrationRequest } from '~/.server/services/ReleaseManagement/integrations/types';
import {
  authenticateActionRequest,
  authenticateLoaderRequest,
  type AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { logApiError } from '~/utils/api-route-helpers';

/**
 * GET - Fetch SCM integration for tenant
 */
export const loader = authenticateLoaderRequest(
  async ({ request, params, user }) => {
    const tenantId = params.tenantId;
    if (!tenantId) {
      return json({ error: 'Tenant ID required' }, { status: 400 });
    }

    try {
      const integration = await SCMIntegrationService.getSCMIntegration(
        tenantId,
        user.user.id
      );

      if (!integration) {
        return json({ integration: null }, { status: 200 });
      }

      return json({ integration });
    } catch (error) {
      logApiError('[SCM-Get]', error);
      return json(
        {
          error: error instanceof Error ? error.message : 'Failed to get SCM integration',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST - Create SCM integration
 */
const createSCMIntegration: AuthenticatedActionFunction = async ({ request, params, user }) => {
  const tenantId = params.tenantId;
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }

  console.log(`[Frontend-Create-Route] Creating SCM integration for tenant: ${tenantId}, userId: ${user.user.id}`);

  try {
    const body = await request.json();
    const { scmType, owner, repo, accessToken, displayName, branch, _encrypted } = body;

    console.log(`[Frontend-Create-Route] Request body:`, { scmType, owner, repo, displayName, branch, hasAccessToken: !!accessToken, _encrypted });

    // Validate required fields
    if (!scmType || !owner || !repo || !accessToken) {
      console.log(`[Frontend-Create-Route] Validation failed - missing fields`);
      return json(
        {
          error: 'Missing required fields: scmType, owner, repo, accessToken',
        },
        { status: 400 }
      );
    }

    console.log(`[Frontend-Create-Route] Calling SCMIntegrationService.createSCMIntegration`);
    
    const requestData: CreateSCMIntegrationRequest = {
      tenantId,
      scmType,
      owner,
      repo,
      accessToken,
      displayName: displayName || `${owner}/${repo}`,
      branch,
      status: 'VALID',
      isActive: true,
      _encrypted, // Forward encryption flag to backend
    };
    
    const integration = await SCMIntegrationService.createSCMIntegration(
      tenantId,
      user.user.id,
      requestData

    );

    console.log(`[Frontend-Create-Route] Successfully created integration:`, integration?.id);
    return json({ integration }, { status: 201 });
  } catch (error) {
    logApiError('[SCM-Create]', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to create SCM integration',
      },
      { status: 500 }
    );
  }
};

/**
 * PATCH - Update SCM integration
 */
const updateSCMIntegration: AuthenticatedActionFunction = async ({ request, params, user }) => {
  const tenantId = params.tenantId;
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { integrationId, token, ...updateData } = body; // Remove 'token' field if present

    if (!integrationId) {
      return json({ error: 'Integration ID required' }, { status: 400 });
    }

    const integration = await SCMIntegrationService.updateSCMIntegration(
      tenantId,
      user.user.id,
      integrationId,
      updateData
    );

    return json({ integration });
  } catch (error) {
    logApiError('[SCM-Update]', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to update SCM integration',
      },
      { status: 500 }
    );
  }
};

/**
 * DELETE - Delete SCM integration
 */
const deleteSCMIntegration: AuthenticatedActionFunction = async ({ request, params, user }) => {
  const tenantId = params.tenantId;
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }

  console.log(`[Frontend-Delete-Route] Attempting to delete SCM integration for tenant: ${tenantId}, userId: ${user.user.id}`);

  try {
    // For DELETE requests, body might be empty, so we'll fetch the integration first
    // to get the scmType, or accept it from query params/body
    let scmType = 'GITHUB'; // Default to GITHUB
    
    try {
      const body = await request.json().catch(() => ({}));
      scmType = body.scmType || scmType;
      console.log(`[Frontend-Delete-Route] Got scmType from body: ${body.scmType || 'not provided, using default'}`);
    } catch {
      // Body might be empty, try to get integration to determine scmType
      console.log(`[Frontend-Delete-Route] No body, trying to fetch existing integration to get scmType`);
      try {
        const integration = await SCMIntegrationService.getSCMIntegration(tenantId, user.user.id);
        console.log(`[Frontend-Delete-Route] Fetched integration:`, integration ? { id: integration.id, scmType: integration.scmType } : 'null');
        if (integration?.scmType) {
          scmType = integration.scmType;
        }
      } catch (fetchError: any) {
        console.log(`[Frontend-Delete-Route] Failed to fetch integration: ${fetchError.message}`);
        // If we can't get integration, use default
      }
    }

    console.log(`[Frontend-Delete-Route] Calling deleteSCMIntegration with tenantId: ${tenantId}, scmType: ${scmType}`);
    await SCMIntegrationService.deleteSCMIntegration(tenantId, user.user.id, '', scmType);

    console.log(`[Frontend-Delete-Route] Successfully deleted SCM integration`);
    return json({ success: true });
  } catch (error: any) {
    logApiError('[SCM-Delete]', error);
    // Propagate the actual status code from the backend (e.g., 404 for not found)
    const statusCode = error?.status || 500;
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete SCM integration',
      },
      { status: statusCode }
    );
  }
};

export const action = authenticateActionRequest({
  POST: createSCMIntegration,
  PATCH: updateSCMIntegration,
  DELETE: deleteSCMIntegration,
});

