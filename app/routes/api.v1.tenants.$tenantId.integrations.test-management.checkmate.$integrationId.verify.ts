/**
 * API Route: Verify Checkmate Test Management Integration
 * POST /api/v1/tenants/:tenantId/integrations/test-management/checkmate/:integrationId/verify
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { CheckmateIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId, integrationId } = params;

  if (!tenantId) {
    return json({ success: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  if (!integrationId) {
    return json({ success: false, message: 'Integration ID is required' }, { status: 400 });
  }

  try {
    const projectId = tenantId; // Backend uses projectId
    const result = await CheckmateIntegrationService.verifyIntegration({
      projectId,
      integrationId,
      userId
    });

    return json(result, { status: result.success ? 200 : 401 });
  } catch (error: any) {
    console.error('Error verifying Checkmate integration:', error);
    return json(
      { success: false, message: error.message || 'Failed to verify Checkmate integration' },
      { status: 500 }
    );
  }
}

