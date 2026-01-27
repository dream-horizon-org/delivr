/**
 * GET /api/v1/apps/:appId/builds/:buildId/artifact
 * Fetch presigned URL for build artifact download
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import { handleAxiosError, logApiError, validateRequired } from '~/utils/api-route-helpers';

const LOG_CONTEXT = 'BUILD_ARTIFACT_DOWNLOAD_API';

export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: any }) => {
    const { appId, buildId } = params;

    if (!validateRequired(appId, 'app id is required')) {
      return json({ success: false, error: 'app id is required' }, { status: 400 });
    }

    if (!validateRequired(buildId, 'Build ID is required')) {
      return json({ success: false, error: 'Build ID is required' }, { status: 400 });
    }

    try {
      const response = await ReleaseProcessService.getBuildArtifactDownloadUrl(
        appId,
        buildId,
        user.user.id
      );
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT, error);
      return handleAxiosError(error, 'Failed to fetch artifact download URL');
    }
  }
);

