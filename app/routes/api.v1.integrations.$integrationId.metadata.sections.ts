/**
 * API Route: Fetch Checkmate Sections
 * GET /api/v1/integrations/:integrationId/metadata/sections?projectId=456
 * 
 * Fetches available sections for a Checkmate project
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
    const backendUrl = `${backendBaseUrl}/test-management/integrations/${integrationId}/checkmate/metadata/sections?projectId=${projectId}`;
    
    console.log(`[Checkmate Sections API] Fetching from: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Checkmate Sections API] Backend error:`, errorText);
      
      return json(
        { 
          success: false, 
          error: `Failed to fetch sections: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log(`[Checkmate Sections API] Successfully fetched ${data.data?.data?.length || 0} sections`);
    
    return json({
      success: true,
      data: data.data || { data: [] },
    });
  } catch (error) {
    console.error('[Checkmate Sections API] Error:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch sections' 
      },
      { status: 500 }
    );
  }
});

