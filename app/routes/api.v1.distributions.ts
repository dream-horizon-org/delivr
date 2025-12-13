/**
 * API Route: GET /api/v1/distributions
 * 
 * Returns paginated list of distributions with submissions
 * Proxies to backend (mock or real based on config)
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { DistributionService } from '~/.server/services/Distribution';
import { authenticateLoaderRequest } from '~/utils/authenticate';

export const loader = authenticateLoaderRequest(
  async ({ request }: LoaderFunctionArgs) => {
    try {
      // Extract pagination params from URL
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

      // Call backend service (which routes to mock/real backend based on config)
      const response = await DistributionService.listDistributions(page, pageSize);

      return json(response.data);
    } catch (error) {
      console.error('[API] GET /api/v1/distributions failed:', error);
      
      return json(
        {
          success: false,
          error: {
            message: 'Failed to fetch distributions',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  }
);

