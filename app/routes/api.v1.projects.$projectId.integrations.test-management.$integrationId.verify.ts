/**
 * BFF API Route: Verify Test Management Integration
 * POST /api/v1/projects/:projectId/integrations/test-management/:integrationId/verify
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { CheckmateIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { projectId, integrationId } = params;

  if (!projectId) {
    return json({ success: false, error: 'Project ID is required' }, { status: 400 });
  }

  if (!integrationId) {
    return json({ success: false, error: 'Integration ID is required' }, { status: 400 });
  }

  try {
    const result = await CheckmateIntegrationService.verifyIntegration({
      projectId,
      integrationId,
      userId
    });

    return json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[Test Management] Verify error:', error);
    return json(
      { success: false, error: error.message || 'Failed to verify integration' },
      { status: 500 }
    );
  }
}

