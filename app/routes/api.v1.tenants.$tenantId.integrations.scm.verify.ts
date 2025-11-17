import { json } from '@remix-run/node';
import {
  authenticateActionRequest,
  type AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { SCMIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

const verifySCM: AuthenticatedActionFunction = async ({ request, params, user }) => {
  const tenantId = params.tenantId;
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }

  console.log(`[Frontend-Verify-Route] Received verify request for tenant: ${tenantId}, userId: ${user.user.id}`);

  try {
    const body = await request.json();
    const { scmType, owner, repo, accessToken } = body;

    console.log(`[Frontend-Verify-Route] Request body: scmType=${scmType}, owner=${owner}, repo=${repo}`);

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
        tenantId,
        scmType,
        owner,
        repo,
        accessToken,
      },
      user.user.id
    );

    console.log(`[Frontend-Verify-Route] Verification result:`, result);
    return json(result);
  } catch (error) {
    console.error('[Frontend-Verify-Route] SCM verification error:', error);
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