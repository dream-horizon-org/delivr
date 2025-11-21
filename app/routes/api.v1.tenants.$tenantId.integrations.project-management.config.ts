/**
 * BFF API Routes: Project Management Configuration CRUD (Tenant-Level)
 * Proxies to backend: /projects/:projectId/integrations/project-management/config
 * 
 * POST   /api/v1/tenants/:tenantId/integrations/project-management/config - Create PM config
 * GET    /api/v1/tenants/:tenantId/integrations/project-management/config/:configId - Get PM config
 * PUT    /api/v1/tenants/:tenantId/integrations/project-management/config/:configId - Update PM config
 * DELETE /api/v1/tenants/:tenantId/integrations/project-management/config/:configId - Delete PM config
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';
import { IntegrationService } from '~/.server/services/ReleaseManagement/integrations/integration-service';
import { PROJECT_MANAGEMENT } from '~/.server/services/ReleaseManagement/integrations/api-routes';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3010';

/**
 * GET - Fetch a specific PM config
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;
  
  // Get configId from URL search params
  const url = new URL(request.url);
  const configId = url.searchParams.get('configId');

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  if (!configId) {
    return json({ success: false, error: 'Config ID is required' }, { status: 400 });
  }

  try {
    const endpoint = `${BACKEND_API_URL}${PROJECT_MANAGEMENT.config.get(tenantId, configId)}`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return json(
        { success: false, error: data.error || 'Failed to fetch PM config' },
        { status: response.status }
      );
    }

    return json(data, { status: 200 });
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
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
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

      // Add userId to the DTO
      const dto = {
        ...body,
        projectId: tenantId, // Backend expects projectId (which is tenantId in our context)
        createdByAccountId: userId,
      };

      const endpoint = `${BACKEND_API_URL}${PROJECT_MANAGEMENT.config.create(tenantId)}`;
      
      console.log('[PM Config] Creating config:', { endpoint, dto });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify(dto),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[PM Config] Create failed:', data);
        return json(
          { success: false, error: data.error || 'Failed to create PM config' },
          { status: response.status }
        );
      }

      console.log('[PM Config] Created successfully:', data);
      return json(data, { status: 201 });
    }

    // PUT - Update existing PM config
    if (method === 'PUT') {
      const body = await request.json();
      const { configId, ...updateData } = body;

      if (!configId) {
        return json({ success: false, error: 'Config ID is required' }, { status: 400 });
      }

      const endpoint = `${BACKEND_API_URL}${PROJECT_MANAGEMENT.config.update(tenantId, configId)}`;
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return json(
          { success: false, error: data.error || 'Failed to update PM config' },
          { status: response.status }
        );
      }

      return json(data, { status: 200 });
    }

    // DELETE - Delete PM config
    if (method === 'DELETE') {
      const body = await request.json();
      const { configId } = body;

      if (!configId) {
        return json({ success: false, error: 'Config ID is required' }, { status: 400 });
      }

      const endpoint = `${BACKEND_API_URL}${PROJECT_MANAGEMENT.config.delete(tenantId, configId)}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        return json(
          { success: false, error: data.error || 'Failed to delete PM config' },
          { status: response.status }
        );
      }

      return json(data, { status: 200 });
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

