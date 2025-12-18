/**
 * BFF Layer: System Metadata API Route
 * Proxies requests from frontend to backend and enriches with app distribution metadata
 */

import { json } from '@remix-run/node';
import { CodepushService } from '~/.server/services/Codepush';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { STORE_TYPES, ALLOWED_PLATFORMS } from '~/types/distribution/app-distribution';

export const loader = authenticateLoaderRequest(async ({ user }) => {
  try {
    // Safety check for user object
    if (!user || !user.user || !user.user.id) {
      console.error('[BFF-SystemMetadata] Invalid user object:', user);
      return json(
        { 
          success: false,
          error: 'User not authenticated' 
        },
        { status: 401 }
      );
    }
    
    const response = await CodepushService.getSystemMetadata(user.user.id);
    
    // Enrich with app distribution metadata
    const enrichedData = {
      ...response.data,
      appDistribution: {
        availableStoreTypes: STORE_TYPES,
        allowedPlatforms: ALLOWED_PLATFORMS,
      },
    };
    
    // Return with proper API client structure
    return json({
      success: true,
      data: enrichedData,
    });
  } catch (error: any) {
    console.error('[BFF-SystemMetadata] Error:', error.message);
    return json(
      { 
        success: false,
        error: 'Failed to fetch system metadata' 
      },
      { status: 500 }
    );
  }
});

