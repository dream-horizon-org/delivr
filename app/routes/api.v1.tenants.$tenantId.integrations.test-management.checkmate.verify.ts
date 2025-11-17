/**
 * API Route: Verify Checkmate Test Management Integration
 * GET /api/v1/tenants/:tenantId/integrations/test-management/checkmate/verify
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { CheckmateIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ verified: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const hostUrl = url.searchParams.get('hostUrl');
    const apiKey = url.searchParams.get('apiKey');
    const workspaceId = url.searchParams.get('workspaceId');

    if (!hostUrl || !apiKey || !workspaceId) {
      return json(
        { verified: false, message: 'hostUrl, apiKey, and workspaceId are required' },
        { status: 400 }
      );
    }

    const result = await CheckmateIntegrationService.verifyCheckmate({
      tenantId,
      hostUrl,
      apiKey,
      workspaceId,
      userId,
    });

    if (result.verified) {
      return json(result, { status: 200 });
    } else {
      return json(result, { status: 401 });
    }
  } catch (error: any) {
    console.error('[Checkmate Verify] Error:', error);
    return json(
      { verified: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

