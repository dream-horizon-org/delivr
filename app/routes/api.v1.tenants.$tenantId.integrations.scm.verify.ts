import { json } from '@remix-run/node';
import {
  authenticateActionRequest,
  type AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { SCMIntegrationService } from '~/.server/services/ReleaseManagement';

const verifySCM: AuthenticatedActionFunction = async ({ request, params, user }) => {
  const tenantId = params.tenantId;
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { scmType, owner, repo, accessToken } = body;

    // Validate required fields
    if (!scmType || !owner || !repo || !accessToken) {
      return json(
        {
          success: false,
          error: 'Missing required fields: scmType, owner, repo, accessToken',
        },
        { status: 400 }
      );
    }

    const result = await SCMIntegrationService.verifySCM({
      tenantId,
      scmType,
      owner,
      repo,
      accessToken,
    });

    return json(result);
  } catch (error) {
    console.error('SCM verification error:', error);
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