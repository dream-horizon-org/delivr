/**
 * API Route: Verify GitHub Actions workflow
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { verifyGitHubActionsWorkflow } from '~/.server/services/ReleaseManagement/setup';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  try {
    const { repoOwner, repoName, workflowPath, token } = await request.json();
    
    const result = await verifyGitHubActionsWorkflow(repoOwner, repoName, workflowPath, token);
    
    if (result.success) {
      return json({ success: true, workflowId: result.workflowId });
    } else {
      return json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

