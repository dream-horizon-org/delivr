/**
 * API Route: Single CI/CD Workflow Management
 * Handles get, update, and delete operations for a specific workflow
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { CICDIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { requireUserId } from '~/.server/services/Auth';

/**
 * GET: Get specific workflow
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { appId, workflowId } = params;
  
  if (!appId || !workflowId) {
    return json({ success: false, error: 'app id and Workflow ID are required' }, { status: 400 });
  }
  
  const result = await CICDIntegrationService.getWorkflow(appId, workflowId, userId);
  return json(result);
}

/**
 * PATCH: Update workflow
 * DELETE: Delete workflow
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { appId, workflowId } = params;
  
  if (!appId || !workflowId) {
    return json({ success: false, error: 'app id and Workflow ID are required' }, { status: 400 });
  }
  
  if (request.method === 'PATCH') {
    const data = await request.json();
    const result = await CICDIntegrationService.updateWorkflow(appId, workflowId, userId, data);
    return json(result);
  }
  
  if (request.method === 'DELETE') {
    const result = await CICDIntegrationService.deleteWorkflow(appId, workflowId, userId);
    return json(result);
  }
  
  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

