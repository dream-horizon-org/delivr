/**
 * API Route: Verify App Store Connect credentials
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { verifyAppStoreConnect } from '~/.server/services/ReleaseManagement/setup';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  try {
    const { keyId, issuerId, privateKey } = await request.json();
    
    const result = await verifyAppStoreConnect(keyId, issuerId, privateKey);
    
    if (result.success) {
      return json({ success: true });
    } else {
      return json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

