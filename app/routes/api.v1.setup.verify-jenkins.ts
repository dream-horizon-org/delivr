/**
 * API Route: Verify Jenkins connection
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { verifyJenkinsConnection } from '~/.server/services/ReleaseManagement/setup';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  try {
    const { jenkinsUrl, jenkinsToken, jenkinsJob } = await request.json();
    
    const result = await verifyJenkinsConnection(jenkinsUrl, jenkinsToken, jenkinsJob);
    
    if (result.success) {
      return json({ success: true });
    } else {
      return json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

