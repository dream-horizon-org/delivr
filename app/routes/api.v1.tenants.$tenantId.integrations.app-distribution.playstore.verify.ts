/**
 * API Route: Verify Google Play Store Integration
 * GET /api/v1/tenants/:tenantId/integrations/app-distribution/playstore/verify
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { PlayStoreIntegrationService, PlayStoreAuthType } from '~/.server/services/ReleaseManagement/integrations/playstore-integration';
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ verified: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const authType = url.searchParams.get('authType') as PlayStoreAuthType;
    const serviceAccountEmail = url.searchParams.get('serviceAccountEmail');
    const serviceAccountJson = url.searchParams.get('serviceAccountJson');
    const clientId = url.searchParams.get('clientId');
    const clientSecret = url.searchParams.get('clientSecret');
    const refreshToken = url.searchParams.get('refreshToken');
    const packageName = url.searchParams.get('packageName');

    if (!authType || !packageName) {
      return json(
        { verified: false, message: 'authType and packageName are required' },
        { status: 400 }
      );
    }

    const result = await PlayStoreIntegrationService.verifyPlayStore({
      tenantId,
      authType,
      serviceAccountEmail: serviceAccountEmail || undefined,
      serviceAccountJson: serviceAccountJson || undefined,
      clientId: clientId || undefined,
      clientSecret: clientSecret || undefined,
      refreshToken: refreshToken || undefined,
      packageName,
      userId,
    });

    if (result.verified) {
      return json(result, { status: 200 });
    } else {
      return json(result, { status: 401 });
    }
  } catch (error: any) {
    console.error('[Play Store Verify] Error:', error);
    return json(
      { verified: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

