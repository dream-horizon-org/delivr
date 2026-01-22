/**
 * API Route: Fetch Branches from SCM Repository
 * GET /api/v1/tenants/:tenantId/integrations/scm/branches
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { SCMIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

/**
 * GET - Fetch branches from SCM repository
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const result = await SCMIntegrationService.fetchBranches(tenantId, userId);

    if (result.success) {
      // Return with proper API client structure
      return json({
        success: true,
        data: {
          branches: result.branches,
          defaultBranch: result.defaultBranch,
        },
      }, { status: 200 });
    } else {
      return json({
        success: false,
        error: result.error || 'Failed to fetch branches',
      }, { status: 404 });
    }
  } catch (error: any) {
    console.error('[SCM Branches] Error:', error);
    return json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

