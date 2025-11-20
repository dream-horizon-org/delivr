/**
 * BFF Layer: System Metadata API Route
 * Proxies requests from frontend to backend and enriches with app distribution metadata
 */

import { json } from '@remix-run/node';
import { CodepushService } from '~/.server/services/Codepush';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { STORE_TYPES, ALLOWED_PLATFORMS } from '~/types/app-distribution';

export const loader = authenticateLoaderRequest(async ({ user }) => {
  try {
    const response = await CodepushService.getSystemMetadata(user.user.id);
    
    // Enrich with app distribution metadata
    const enrichedData = {
      ...response.data,
      appDistribution: {
        availableStoreTypes: STORE_TYPES,
        allowedPlatforms: ALLOWED_PLATFORMS,
      },
    };
    
    return json(enrichedData);
  } catch (error: any) {
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

