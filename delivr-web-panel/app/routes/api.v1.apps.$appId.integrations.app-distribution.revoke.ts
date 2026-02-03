/**
 * BFF API Route: Revoke App Distribution Integration (Play Store / App Store)
 * DELETE /api/v1/apps/:appId/integrations/app-distribution/revoke?storeType=X&platform=Y
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/auth.interface';
import { AppDistributionService } from '~/.server/services/ReleaseManagement/integrations';
import type { Platform, StoreType } from '~/types/distribution/app-distribution';
import { authenticateActionRequest } from '~/utils/authenticate';

/**
 * DELETE - Revoke app distribution integration
 */
const deleteIntegrationAction = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const appId = params.appId;
  const userId = user.user.id;
  
  const url = new URL(request.url);
  const storeType = url.searchParams.get('storeType');
  const platform = url.searchParams.get('platform');

  if (!appId) {
    return json({ success: false, error: 'app id is required' }, { status: 400 });
  }

  if (!storeType) {
    return json({ success: false, error: 'Store type is required (e.g., play_store, app_store)' }, { status: 400 });
  }

  if (!platform) {
    return json({ success: false, error: 'Platform is required (e.g., ANDROID, IOS)' }, { status: 400 });
  }

  try {
    const result = await AppDistributionService.revokeIntegration(
      appId,
      storeType as StoreType,
      platform as Platform,
      userId
    );

    if (!result.success) {
      return json(
        { success: false, error: result.error || 'Failed to revoke integration' },
        { status: 500 }
      );
    }

    return json(result, { status: 200 });
  } catch (error: any) {
    return json(
      { success: false, error: error.message || 'Failed to revoke integration' },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  DELETE: deleteIntegrationAction,
});

