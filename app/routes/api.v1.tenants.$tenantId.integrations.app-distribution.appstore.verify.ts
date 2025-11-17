/**
 * API Route: Verify Apple App Store Integration
 * GET /api/v1/tenants/:tenantId/integrations/app-distribution/appstore/verify
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { AppStoreIntegrationService, AppStoreAuthType } from '~/.server/services/ReleaseManagement/integrations/appstore-integration';
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ verified: false, message: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const authType = url.searchParams.get('authType') as AppStoreAuthType;
    const issuerId = url.searchParams.get('issuerId');
    const keyId = url.searchParams.get('keyId');
    const privateKey = url.searchParams.get('privateKey');
    const bundleId = url.searchParams.get('bundleId');

    if (!authType || !issuerId || !keyId || !privateKey) {
      return json(
        { verified: false, message: 'authType, issuerId, keyId, and privateKey are required' },
        { status: 400 }
      );
    }

    const result = await AppStoreIntegrationService.verifyAppStore({
      tenantId,
      authType,
      issuerId,
      keyId,
      privateKey,
      bundleId: bundleId || undefined,
      userId,
    });

    if (result.verified) {
      return json(result, { status: 200 });
    } else {
      return json(result, { status: 401 });
    }
  } catch (error: any) {
    console.error('[App Store Verify] Error:', error);
    return json(
      { verified: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

