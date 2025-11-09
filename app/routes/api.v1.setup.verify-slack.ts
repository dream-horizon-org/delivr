/**
 * API Route: Verify Slack connection and fetch channels
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { verifySlackConnection } from '~/.server/services/ReleaseManagement/setup';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  try {
    const { botToken } = await request.json();
    
    const result = await verifySlackConnection(botToken);
    
    if (result.success) {
      return json({ success: true, channels: result.channels });
    } else {
      return json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

