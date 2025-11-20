/**
 * API Route: Fetch Checkmate Projects
 * GET /api/v1/integrations/:integrationId/metadata/projects
 * 
 * Fetches available projects from Checkmate
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';

export const loader = authenticateLoaderRequest(async ({ params, request }) => {
  const { integrationId } = params;

  if (!integrationId) {
    return json(
      { success: false, error: 'Integration ID is required' },
      { status: 400 }
    );
  }

  try {
    // Backend server runs on port 3010 in development
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:3010';
    
    // Forward request to backend API (no /api/v1 prefix in backend)
    const backendUrl = `${backendBaseUrl}/integrations/${integrationId}/metadata/projects`;
    
    console.log(`[Checkmate Projects API] Fetching from: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Checkmate Projects API] Backend error:`, errorText);
      
      return json(
        { 
          success: false, 
          error: `Failed to fetch projects: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log(`[Checkmate Projects API] Successfully fetched ${data.data?.data?.length || 0} projects`);
    
    return json({
      success: true,
      data: data.data || { data: [] },
    });
  } catch (error) {
    console.error('[Checkmate Projects API] Error:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch projects' 
      },
      { status: 500 }
    );
  }
});

