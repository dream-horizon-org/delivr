import { json } from '@remix-run/node';
import {
  authenticateLoaderRequest,
  authenticateActionRequest,
  type AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { SCMIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

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
      console.error('Get SCM integration error:', error);
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
    const { scmType, owner, repo, accessToken, displayName, branch } = body;

    console.log(`[Frontend-Create-Route] Request body:`, { scmType, owner, repo, displayName, branch, hasAccessToken: !!accessToken });

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
    const integration = await SCMIntegrationService.createSCMIntegration(
      tenantId,
      user.user.id,
      {
        tenantId,
        scmType,
        owner,
        repo,
        accessToken,
        displayName: displayName || `${owner}/${repo}`,
        branch,
        status: 'VALID',
        isActive: true,
      } as any
    );

    console.log(`[Frontend-Create-Route] Successfully created integration:`, integration?.id);
    return json({ integration }, { status: 201 });
  } catch (error) {
    console.error('[Frontend-Create-Route] Create SCM integration error:', error);
    console.error('[Frontend-Create-Route] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
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
    console.error('Update SCM integration error:', error);
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

  try {
    // For DELETE requests, body might be empty, so we'll fetch the integration first
    // to get the scmType, or accept it from query params/body
    let scmType = 'GITHUB'; // Default to GITHUB
    
    try {
      const body = await request.json().catch(() => ({}));
      scmType = body.scmType || scmType;
    } catch {
      // Body might be empty, try to get integration to determine scmType
      try {
        const integration = await SCMIntegrationService.getSCMIntegration(tenantId, user.user.id);
        if (integration?.scmType) {
          scmType = integration.scmType;
        }
      } catch {
        // If we can't get integration, use default
      }
    }

    await SCMIntegrationService.deleteSCMIntegration(tenantId, user.user.id, '', scmType);

    return json({ success: true });
  } catch (error) {
    console.error('Delete SCM integration error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete SCM integration',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: createSCMIntegration,
  PATCH: updateSCMIntegration,
  DELETE: deleteSCMIntegration,
});

