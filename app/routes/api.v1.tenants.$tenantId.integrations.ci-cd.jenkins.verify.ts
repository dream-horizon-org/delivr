/**
 * API Route: Verify Jenkins CI/CD Integration
 * GET /api/v1/tenants/:tenantId/integrations/ci-cd/jenkins/verify
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { JenkinsIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ verified: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    // Parse query parameters
    const url = new URL(request.url);
    const hostUrl = url.searchParams.get('hostUrl');
    const username = url.searchParams.get('username');
    const apiToken = url.searchParams.get('apiToken');
    const useCrumb = url.searchParams.get('useCrumb') === 'true';
    const crumbPath = url.searchParams.get('crumbPath');

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
      useCrumb,
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

