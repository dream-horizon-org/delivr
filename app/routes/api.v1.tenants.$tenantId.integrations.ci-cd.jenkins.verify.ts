/**
 * API Route: Verify Jenkins CI/CD Integration
 * POST /api/v1/tenants/:tenantId/integrations/ci-cd/jenkins/verify
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { JenkinsIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ verified: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    // Parse request body
    const body = await request.json();
    const { hostUrl, username, apiToken, useCrumb, crumbPath } = body;

    if (!hostUrl || !username || !apiToken) {
      return json(
        { verified: false, message: 'hostUrl, username, and apiToken are required' },
        { status: 400 }
      );
    }

    const result = await JenkinsIntegrationService.verifyJenkins({
      tenantId,
      hostUrl,
      username,
      apiToken,
      useCrumb: useCrumb ?? true,
      crumbPath: crumbPath || undefined,
      userId,
    });

    if (result.verified) {
      return json(result, { status: 200 });
    } else {
      return json(result, { status: 401 });
    }
  } catch (error: any) {
    console.error('[Jenkins Verify] Error:', error);
    return json(
      { verified: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

