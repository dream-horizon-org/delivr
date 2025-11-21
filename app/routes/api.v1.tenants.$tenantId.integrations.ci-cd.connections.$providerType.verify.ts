/**
 * API Route: Verify CI/CD Connection (Provider-agnostic)
 * POST /api/v1/tenants/:tenantId/integrations/ci-cd/connections/:providerType/verify
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
    return json({ verified: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  if (!providerType) {
    return json({ verified: false, message: 'Provider type is required' }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Forward request to backend
    const response = await fetch(
      `${BACKEND_API_URL}/tenants/${tenantId}/integrations/ci-cd/connections/${providerType}/verify`,
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
    console.error(`Error verifying ${providerType} connection:`, error);
    return json(
      { verified: false, message: error.message || `Failed to verify ${providerType} connection` },
      { status: 500 }
    );
  }
}

