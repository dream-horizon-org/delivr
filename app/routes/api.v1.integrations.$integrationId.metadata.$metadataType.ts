/**
 * API Route: Fetch Checkmate Metadata
 * GET /api/v1/integrations/:integrationId/metadata/:metadataType?projectId=456
 * 
 * Fetches Checkmate metadata (labels, projects, sections, squads)
 * Combined route replacing individual metadata routes
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { CheckmateIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

export const loader = authenticateLoaderRequest(async ({ params, request, user }) => {
  const { integrationId, metadataType } = params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!integrationId) {
    return json(
      { success: false, error: 'Integration ID is required' },
      { status: 400 }
    );
  }

  if (!metadataType) {
    return json(
      { success: false, error: 'Metadata type is required' },
      { status: 400 }
    );
  }

  // Validate metadata type
  const validTypes = ['labels', 'projects', 'sections', 'squads'];
  if (!validTypes.includes(metadataType)) {
    return json(
      { success: false, error: `Invalid metadata type. Must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    );
  }

  // Project ID is required for labels, sections, and squads
  if ((metadataType === 'labels' || metadataType === 'sections' || metadataType === 'squads') && !projectId) {
    return json(
      { success: false, error: 'Project ID is required for this metadata type' },
      { status: 400 }
    );
  }

  // NOTE: This route is deprecated. Use /api/v1/tenants/:tenantId/integrations/test-management/:integrationId/metadata/:metadataType instead
  // For backward compatibility, we need to get tenantId from the integration
  // This requires a lookup which is not ideal - migrate to new route format
  try {
    // TODO: Get tenantId from integration lookup or require it in path
    // For now, this will fail - migrate frontend to use new route with tenantId
    return json(
      { 
        success: false, 
        error: 'This route is deprecated. Please use /api/v1/tenants/:tenantId/integrations/test-management/:integrationId/metadata/:metadataType' 
      },
      { status: 410 } // Gone - resource no longer available
    );
    
    // OLD CODE (commented out - requires tenantId):
    // const result = await CheckmateIntegrationService.fetchMetadata(
    //   integrationId,
    //   tenantId, // MISSING - need to get from integration
    //   metadataType as 'labels' | 'projects' | 'sections' | 'squads',
    //   projectId || undefined,
    //   user?.user?.id
    // );

    if (!result.success) {
      return json(
        { success: false, error: result.error || `Failed to fetch ${metadataType}` },
        { status: 500 }
      );
    }

    // For projects, wrap in projectsList for compatibility with frontend
    const responseData = metadataType === 'projects' 
      ? { projectsList: result.data || [] }
      : result.data || [];
    
    return json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error(`[Checkmate Metadata API] Error fetching ${metadataType}:`, error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to fetch ${metadataType}` 
      },
      { status: 500 }
    );
  }
});

