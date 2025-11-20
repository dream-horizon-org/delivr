/**
 * BFF Layer: System Metadata API Route
 * Proxies requests from frontend to backend
 */

import { json } from '@remix-run/node';
import { CodepushService } from '~/.server/services/Codepush';
import { authenticateLoaderRequest } from '~/utils/authenticate';

export const loader = authenticateLoaderRequest(async ({ user }) => {
  try {
    const response = await CodepushService.getSystemMetadata(user.user.id);
    return json(response.data);
  } catch (error: any) {
    // console.error('[BFF] Error fetching system metadata:', error);
    console.error('[BFF] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return json(
      { error: 'Failed to fetch system metadata' },
      { status: 500 }
    );
  }
});

