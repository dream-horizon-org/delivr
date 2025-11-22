/**
 * API Route: Fetch Checkmate Labels
 * GET /api/v1/integrations/:integrationId/metadata/labels?projectId=456
 * 
 * Fetches available labels for a Checkmate project
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';

export const loader = authenticateLoaderRequest(async ({ params, request }) => {
  const { integrationId } = params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!integrationId) {
    return json(
      { success: false, error: 'Integration ID is required' },
      { status: 400 }
    );
  }

  if (!projectId) {
    return json(
      { success: false, error: 'Project ID is required' },
      { status: 400 }
    );
  }

  try {
    // Backend server runs on port 3010 in development
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:3010';
    
    const backendUrl = `${backendBaseUrl}/test-management/integrations/${integrationId}/checkmate/metadata/labels?projectId=${projectId}`;
    
    console.log(`[Checkmate Labels API] Fetching from: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Checkmate Labels API] Backend error:`, errorText);
      
      return json(
        { 
          success: false, 
          error: `Failed to fetch labels: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Backend returns { success: true, data: [labels array] }
    // Extract the array directly
    const labels = data.data || [];
    console.log(`[Checkmate Labels API] Successfully fetched ${labels.length} labels`);
    
    return json({
      success: true,
      data: labels,
    });
  } catch (error) {
    console.error('[Checkmate Labels API] Error:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch labels' 
      },
      { status: 500 }
    );
  }
});

