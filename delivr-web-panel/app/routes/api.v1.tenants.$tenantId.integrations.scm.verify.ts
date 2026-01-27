import { json } from '@remix-run/node';
import {
  authenticateActionRequest,
  type AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { SCMIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { logApiError } from '~/utils/api-route-helpers';

const verifySCM: AuthenticatedActionFunction = async ({ request, params, user }) => {
  const appId = params.appId;
  if (!appId) {
    return json({ error: 'app id required' }, { status: 400 });
  }

  console.log(`[Frontend-Verify-Route] Received verify request for tenant: ${appId}, userId: ${user.user.id}`);

  try {
    const body = await request.json();
    const { scmType, owner, repo, accessToken, _encrypted } = body;

    console.log(`[Frontend-Verify-Route] Request body: scmType=${scmType}, owner=${owner}, repo=${repo}, _encrypted=${_encrypted}`);

    // Validate required fields
    if (!scmType || !owner || !repo || !accessToken) {
      console.log(`[Frontend-Verify-Route] Validation failed - missing required fields`);
      return json(
        {
          success: false,
          error: 'Missing required fields: scmType, owner, repo, accessToken',
        },
        { status: 400 }
      );
    }

    console.log(`[Frontend-Verify-Route] Calling SCMIntegrationService.verifySCM`);
    const result = await SCMIntegrationService.verifySCM(
      {
        appId,
        scmType,
        owner,
        repo,
        accessToken,
        _encrypted, // Forward encryption flag to backend
      },
      user.user.id
    );

    console.log(`[Frontend-Verify-Route] Verification result:`, result);
    return json(result);
  } catch (error) {
    logApiError('[SCM-Verify]', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({ POST: verifySCM });