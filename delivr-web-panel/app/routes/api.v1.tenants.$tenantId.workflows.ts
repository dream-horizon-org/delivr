/**
 * API Route: CI/CD Workflows Management
 * Handles listing and retrieving CI/CD workflow configurations
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { CICDIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

/**
 * GET: List all workflows for tenant
 * Query params: providerType, platform, workflowType, integrationId
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { appId } = params;
  
  if (!appId) {
    return json({ success: false, error: 'app id is required' }, { status: 400 });
  }
  
  // Extract query parameters
  const url = new URL(request.url);
  const filters: any = {};
  
  if (url.searchParams.has('providerType')) {
    filters.providerType = url.searchParams.get('providerType');
  }
  if (url.searchParams.has('platform')) {
    filters.platform = url.searchParams.get('platform');
  }
  if (url.searchParams.has('workflowType')) {
    filters.workflowType = url.searchParams.get('workflowType');
  }
  if (url.searchParams.has('integrationId')) {
    filters.integrationId = url.searchParams.get('integrationId');
  }
  
  const result = await CICDIntegrationService.listAllWorkflows(
    appId,
    userId,
    filters
  );
  
  return json(result);
}

/**
 * POST: Create new workflow configuration
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { appId } = params;
  
  if (!appId) {
    return json({ success: false, error: 'app id is required' }, { status: 400 });
  }
  
  if (request.method === 'POST') {
    const data = await request.json();
    
    const result = await CICDIntegrationService.createWorkflow(
      appId,
      userId,
      data
    );
    
    return json(result);
  }
  
  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

