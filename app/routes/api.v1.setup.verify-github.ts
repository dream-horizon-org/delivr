/**
 * API Route: Verify GitHub connection
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { verifyGitHubConnection } from '~/.server/services/ReleaseManagement/setup';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  try {
    const { repoUrl, token } = await request.json();
    
    if (!repoUrl || !token) {
      return json({ success: false, error: 'Repository URL and token are required' }, { status: 400 });
    }
    
    const result = await verifyGitHubConnection(repoUrl, token);
    
    if (result.success) {
      return json({ success: true, data: result.data });
    } else {
      return json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

