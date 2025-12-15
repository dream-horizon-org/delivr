/**
 * Remix API Route: Pause/Resume Release
 * POST /api/v1/tenants/:tenantId/releases/:releaseId/pause-resume
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend implementation:
 *   - Pause: POST /api/releases/:releaseId/cron/stop
 *   - Resume: POST /api/releases/:releaseId/cron/start
 * Matches API contract API #29 (Pause) and API #30 (Resume)
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { handleAxiosError, logApiError, validateRequired } from '~/utils/api-route-helpers';

interface PauseResumeRequest {
  action: 'pause' | 'resume';
}

/**
 * POST - Pause or resume release
 * Request body: { action: 'pause' | 'resume' }
 * Calls backend API based on action:
 *   - pause: POST /api/releases/:releaseId/cron/stop
 *   - resume: POST /api/releases/:releaseId/cron/start
 */
export const action = authenticateLoaderRequest(
  async ({ params, request, user }: ActionFunctionArgs & { user: User }) => {
    const { tenantId, releaseId } = params;

    if (!validateRequired(tenantId, 'Tenant ID is required')) {
      return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
    }

    if (!validateRequired(releaseId, 'Release ID is required')) {
      return json({ success: false, error: 'Release ID is required' }, { status: 400 });
    }

    try {
      const body = await request.json() as PauseResumeRequest;
      
      if (!body.action || (body.action !== 'pause' && body.action !== 'resume')) {
        return json({ success: false, error: 'Invalid action. Must be "pause" or "resume"' }, { status: 400 });
      }

      console.log(`[BFF] ${body.action === 'pause' ? 'Pausing' : 'Resuming'} release:`, releaseId);
      
      const response = body.action === 'pause'
        ? await ReleaseProcessService.pauseRelease(releaseId)
        : await ReleaseProcessService.resumeRelease(releaseId);
      
      console.log(`[BFF] ${body.action === 'pause' ? 'Pause' : 'Resume'} release response:`, response.data);
      
      return json(response.data);
    } catch (error) {
      logApiError(`${request.method}_PAUSE_RESUME_RELEASE_API`, error);
      return handleAxiosError(error, 'Failed to pause/resume release');
    }
  }
);

