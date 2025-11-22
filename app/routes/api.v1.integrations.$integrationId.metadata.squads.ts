/**
 * API Route: Fetch Checkmate Squads
 * GET /api/v1/integrations/:integrationId/metadata/squads?projectId=456
 * 
 * Fetches available squads for a Checkmate project
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
    
    // Forward request to backend API (Checkmate-specific metadata route)
    const backendUrl = `${backendBaseUrl}/test-management/integrations/${integrationId}/checkmate/metadata/squads?projectId=${projectId}`;
    
    console.log(`[Checkmate Squads API] Fetching from: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Checkmate Squads API] Backend error:`, errorText);
      
      return json(
        { 
          success: false, 
          error: `Failed to fetch squads: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Backend returns { success: true, data: [squads array] }
    // Extract the array directly
    const squads = data.data || [];
    console.log(`[Checkmate Squads API] Successfully fetched ${squads.length} squads`);
    
    return json({
      success: true,
      data: squads,
    });
  } catch (error) {
    console.error('[Checkmate Squads API] Error:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch squads' 
      },
      { status: 500 }
    );
  }
});

