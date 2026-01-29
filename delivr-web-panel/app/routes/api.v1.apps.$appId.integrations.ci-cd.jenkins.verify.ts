/**
 * API Route: Verify Jenkins CI/CD Integration
 * POST /api/v1/apps/:appId/integrations/ci-cd/jenkins/verify
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { JenkinsIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';
import { logApiError } from '~/utils/api-route-helpers';

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const appId = params.appId;

  if (!appId) {
    return json({ verified: false, message: 'app id is required' }, { status: 400 });
  }

  try {
    // Parse request body
    const body = await request.json();
    const { displayName, hostUrl, username, apiToken, useCrumb, crumbPath, providerConfig, _encrypted } = body;

    if (!hostUrl || !username || !apiToken) {
      return json(
        { verified: false, message: 'hostUrl, username, and apiToken are required' },
        { status: 400 }
      );
    }

    console.log('[Jenkins Verify] _encrypted:', _encrypted);

    const result = await JenkinsIntegrationService.verifyJenkins({
      appId,
      displayName,
      hostUrl,
      username,
      apiToken,
      useCrumb: providerConfig?.useCrumb ?? useCrumb ?? true,
      crumbPath: providerConfig?.crumbPath ?? crumbPath,
      userId,
      _encrypted, // Forward encryption flag to backend
    });

    if (result.verified) {
      return json(result, { status: 200 });
    } else {
      return json(result, { status: 401 });
    }
  } catch (error: any) {
    logApiError('[Jenkins-Verify]', error);
    return json(
      { verified: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

