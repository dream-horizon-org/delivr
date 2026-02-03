/**
 * BFF API Routes: Project Management Configuration CRUD (Tenant-Level)
 * Proxies to backend: /projects/:projectId/integrations/project-management/config
 * 
 * POST   /api/v1/apps/:appId/integrations/project-management/config - Create PM config
 * GET    /api/v1/apps/:appId/integrations/project-management/config/:configId - Get PM config
 * PUT    /api/v1/apps/:appId/integrations/project-management/config/:configId - Update PM config
 * DELETE /api/v1/apps/:appId/integrations/project-management/config/:configId - Delete PM config
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';
import { ProjectManagementConfigService } from '~/.server/services/ReleaseManagement/integrations';

/**
 * GET - Fetch a specific PM config
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const appId = params.appId;
  
  // Get configId from URL search params
  const url = new URL(request.url);
  const configId = url.searchParams.get('configId');

  if (!appId) {
    return json({ success: false, error: 'app id is required' }, { status: 400 });
  }

  if (!configId) {
    return json({ success: false, error: 'Config ID is required' }, { status: 400 });
  }

  try {
    const result = await ProjectManagementConfigService.getConfig(appId, configId, userId);

    if (!result.success) {
      return json(
        { success: false, error: result.error || 'Failed to fetch PM config' },
        { status: 404 }
      );
    }

    return json(result, { status: 200 });
  } catch (error: any) {
    console.error('[PM Config] Error fetching config:', error);
    return json(
      { success: false, error: error.message || 'Failed to fetch PM config' },
      { status: 500 }
    );
  }
}

/**
 * POST / PUT / DELETE - Create, update, or delete PM config
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const appId = params.appId;

  if (!appId) {
    return json({ success: false, error: 'app id is required' }, { status: 400 });
  }

  const method = request.method;

  try {
    // POST - Create new PM config
    if (method === 'POST') {
      const body = await request.json();
      
      // Validate required fields
      if (!body.integrationId) {
        return json({ success: false, error: 'Integration ID is required' }, { status: 400 });
      }

      if (!body.name) {
        return json({ success: false, error: 'Configuration name is required' }, { status: 400 });
      }

      if (!body.platformConfigurations || body.platformConfigurations.length === 0) {
        return json(
          { success: false, error: 'At least one platform configuration is required' },
          { status: 400 }
        );
      }

      const result = await ProjectManagementConfigService.createConfig(appId, userId, {
        integrationId: body.integrationId,
        name: body.name,
        platformConfigurations: body.platformConfigurations,
      });

      if (!result.success) {
        return json(
          { success: false, error: result.error || 'Failed to create PM config' },
          { status: 400 }
        );
      }

      return json(result, { status: 201 });
    }

    // PUT - Update existing PM config
    if (method === 'PUT') {
      const body = await request.json();
      const { configId, ...updateData } = body;

      if (!configId) {
        return json({ success: false, error: 'Config ID is required' }, { status: 400 });
      }

      const result = await ProjectManagementConfigService.updateConfig(
        appId,
        configId,
        userId,
        updateData
      );

      if (!result.success) {
        return json(
          { success: false, error: result.error || 'Failed to update PM config' },
          { status: 400 }
        );
      }

      return json(result, { status: 200 });
    }

    // DELETE - Delete PM config
    if (method === 'DELETE') {
      const body = await request.json();
      const { configId } = body;

      if (!configId) {
        return json({ success: false, error: 'Config ID is required' }, { status: 400 });
      }

      const result = await ProjectManagementConfigService.deleteConfig(appId, configId, userId);

      if (!result.success) {
        return json(
          { success: false, error: result.error || 'Failed to delete PM config' },
          { status: 404 }
        );
      }

      return json(result, { status: 200 });
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('[PM Config] Error:', error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

