/**
 * BFF Route: Fetch Jira Project Metadata (Statuses and Issue Types Combined)
 * GET /api/v1/tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/project-metadata?projectKey={projectKey}
 * 
 * Fetches both statuses and issue types for a specific Jira project in a single call
 * This is a proxy route that calls the backend Jira metadata service
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ProjectManagementIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

export const loader = authenticateLoaderRequest(async ({ params, request, user }: LoaderFunctionArgs & { user: any }) => {
  const { tenantId, integrationId } = params;
  
  // Extract projectKey from query params
  const url = new URL(request.url);
  const projectKey = url.searchParams.get('projectKey');

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

  if (!projectKey) {
    return json(
      { success: false, error: 'Project key is required as a query parameter' },
      { status: 400 }
    );
  }

  try {
    const result = await ProjectManagementIntegrationService.getJiraProjectMetadata(
      tenantId,
      integrationId,
      projectKey,
      user.user.id
    );

    if (!result.success) {
      return json(
        { success: false, error: result.error || 'Failed to fetch Jira project metadata' },
        { status: 500 }
      );
    }

    return json({
      success: true,
      data: result.data || { statuses: [], issueTypes: [] },
    });
  } catch (error) {
    console.error('[Jira Project Metadata API] Error fetching metadata:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch Jira project metadata' 
      },
      { status: 500 }
    );
  }
});
