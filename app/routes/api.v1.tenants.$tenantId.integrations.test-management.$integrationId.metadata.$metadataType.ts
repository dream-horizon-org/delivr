/**
 * API Route: Fetch Checkmate Metadata
 * NEW: GET /api/v1/tenants/:tenantId/integrations/test-management/:integrationId/metadata/:metadataType?projectId=456
 * 
 * Fetches Checkmate metadata (labels, projects, sections, squads)
 * Updated to match new API format with tenantId in path
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { CheckmateIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

export const loader = authenticateLoaderRequest(async ({ params, request, user }) => {
  const { tenantId, integrationId, metadataType } = params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!tenantId) {
    return json(
      { success: false, error: 'Tenant ID is required' },
      { status: 400 }
    );
  }

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

  try {
    const result = await CheckmateIntegrationService.fetchMetadata(
      integrationId,
      tenantId,
      metadataType as 'labels' | 'projects' | 'sections' | 'squads',
      projectId || undefined,
      user?.user?.id
    );

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

