/**
 * API Route: Create CI/CD Connection (Provider-agnostic)
 * POST /api/v1/tenants/:tenantId/integrations/ci-cd/connections/:providerType
 * 
 * Supports: GITHUB_ACTIONS, JENKINS
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId, providerType } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  if (!providerType) {
    return json({ success: false, error: 'Provider type is required' }, { status: 400 });
  }

  // Only support POST for creation
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();

    // Forward request to backend
    const response = await fetch(
      `${BACKEND_API_URL}/tenants/${tenantId}/integrations/ci-cd/connections/${providerType}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return json(data, { status: response.status });
  } catch (error: any) {
    console.error(`Error creating ${providerType} connection:`, error);
    return json(
      { success: false, error: error.message || `Failed to create ${providerType} connection` },
      { status: 500 }
    );
  }
}

