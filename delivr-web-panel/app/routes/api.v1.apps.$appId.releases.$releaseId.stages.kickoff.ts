/**
 * Remix API Route: Kickoff Stage
 * GET /api/v1/apps/:appId/releases/:releaseId/stages/kickoff
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: GET /api/v1/apps/:appId/releases/:releaseId/tasks?stage=KICKOFF
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import {
  authenticateLoaderRequest,
} from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import type { User } from '~/.server/services/Auth/auth.interface';
import {
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';

/**
 * GET - Get kickoff stage data
 * Calls backend API: GET /tasks?stage=KICKOFF
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const appId = params.appId;
    const releaseId = params.releaseId;

    if (!validateRequired(appId, 'app id is required')) {
      return json({ success: false, error: 'app id is required' }, { status: 400 });
    }

    if (!validateRequired(releaseId, 'Release ID is required')) {
      return json({ success: false, error: 'Release ID is required' }, { status: 400 });
    }

    try {
      console.log('[BFF] Fetching kickoff stage for release:', releaseId);
      const response = await ReleaseProcessService.getKickoffStage(appId, releaseId, user.user.id);
      console.log('[BFF] Kickoff stage response:', response.data);
      
      // Backend returns { success: true, stage: 'KICKOFF', releaseId, tasks, stageStatus }
      // Axios wraps it in response.data, so response.data = { success: true, ... }
      const responseData = response.data;
      
      // Return data wrapped in success envelope for consistency
      return json({ success: true, data: responseData });
    } catch (error) {
      logApiError('KICKOFF_STAGE_API', error);
      return handleAxiosError(error, 'Failed to fetch kickoff stage');
    }
  }
);

