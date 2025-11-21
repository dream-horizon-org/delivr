/**
 * API Route: Fetch Job Parameters
 * Dynamically fetches job/workflow parameters from Jenkins or GitHub Actions
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { CICDIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';
import type { CICDProviderType } from '~/.server/services/ReleaseManagement/integrations';

/**
 * POST: Fetch job parameters for a given provider and URL
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }
  
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }
  
  const data = await request.json();
  const { providerType, url } = data;
  
  if (!providerType || !url) {
    return json({ 
      success: false, 
      error: 'Provider type and URL are required',
      parameters: []
    }, { status: 400 });
  }
  
  const result = await CICDIntegrationService.fetchJobParameters(
    tenantId,
    userId,
    providerType as CICDProviderType,
    url
  );
  
  return json(result);
}

