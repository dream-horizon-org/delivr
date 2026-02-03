/**
 * BFF Route: Fetch Jira Projects
 * GET /api/v1/apps/:appId/integrations/project-management/:integrationId/jira/metadata/projects
 * 
 * Fetches all Jira projects for a given Jira integration
 * This is a proxy route that calls the backend Jira metadata service
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ProjectManagementIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

export const loader = authenticateLoaderRequest(async ({ params, user }: LoaderFunctionArgs & { user: any }) => {
  const appId = params.appId;
  const integrationId = params.integrationId;

  if (!appId) {
    return json(
      { success: false, error: 'app id is required' },
      { status: 400 }
    );
  }

  if (!integrationId) {
    return json(
      { success: false, error: 'Integration ID is required' },
      { status: 400 }
    );
  }

  try {
    const result = await ProjectManagementIntegrationService.getJiraProjects(
      appId,
      integrationId,
      user.user.id
    );

    if (!result.success) {
      return json(
        { success: false, error: result.error || 'Failed to fetch Jira projects' },
        { status: 500 }
      );
    }

    return json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error('[Jira Projects API] Error fetching projects:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch Jira projects' 
      },
      { status: 500 }
    );
  }
});


