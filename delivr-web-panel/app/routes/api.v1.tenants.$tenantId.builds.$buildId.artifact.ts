/**
 * GET /api/v1/tenants/:tenantId/builds/:buildId/artifact
 * Fetch presigned URL for build artifact download
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import { handleAxiosError, logApiError, validateRequired } from '~/utils/api-route-helpers';

const LOG_CONTEXT = 'BUILD_ARTIFACT_DOWNLOAD_API';

export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: any }) => {
    const { tenantId, buildId } = params;

    if (!validateRequired(tenantId, 'Tenant ID is required')) {
      return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
    }

    if (!validateRequired(buildId, 'Build ID is required')) {
      return json({ success: false, error: 'Build ID is required' }, { status: 400 });
    }

    try {
      const response = await ReleaseProcessService.getBuildArtifactDownloadUrl(
        tenantId,
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

