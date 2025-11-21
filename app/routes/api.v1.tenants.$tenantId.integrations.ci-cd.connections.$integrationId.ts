/**
 * API Route: Update/Delete CI/CD Connection
 * PATCH /api/v1/tenants/:tenantId/integrations/ci-cd/connections/:integrationId
 * DELETE /api/v1/tenants/:tenantId/integrations/ci-cd/connections/:integrationId
 * 
 * Supports: GITHUB_ACTIONS, JENKINS
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId, integrationId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  if (!integrationId) {
    return json({ success: false, error: 'Integration ID is required' }, { status: 400 });
  }

  const method = request.method;

  // Only support PATCH and DELETE
  if (method !== 'PATCH' && method !== 'DELETE') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    let body = null;
    if (method === 'PATCH') {
      body = await request.json();
    }

    // Forward request to backend
    const response = await fetch(
      `${BACKEND_API_URL}/tenants/${tenantId}/integrations/ci-cd/connections/${integrationId}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        ...(body && { body: JSON.stringify(body) }),
      }
    );

    const data = await response.json();
    return json(data, { status: response.status });
  } catch (error: any) {
    console.error(`Error ${method === 'PATCH' ? 'updating' : 'deleting'} connection:`, error);
    return json(
      { success: false, error: error.message || `Failed to ${method === 'PATCH' ? 'update' : 'delete'} connection` },
      { status: 500 }
    );
  }
}

