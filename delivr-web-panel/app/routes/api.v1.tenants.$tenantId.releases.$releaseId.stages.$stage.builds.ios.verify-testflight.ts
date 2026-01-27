/**
 * Remix API Route: Verify iOS TestFlight Build
 * POST /api/v1/apps/:appId/releases/:releaseId/stages/:stage/builds/ios/verify-testflight
 * 
 * BFF route that proxies to backend API for TestFlight verification
 * Matches API contract: POST /tenants/{appId}/releases/{releaseId}/stages/{stage}/builds/ios/verify-testflight
 * 
 * This endpoint verifies an iOS build exists in TestFlight and stages it in the release_uploads table.
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import {
  authenticateActionRequest,
  type AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import { BuildUploadStage } from '~/types/release-process-enums';

const verifyTestFlight: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { appId, releaseId, stage } = params;

  // Validate required path parameters
  if (!validateRequired(appId, 'app id is required')) {
    return createValidationError('app id is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  if (!validateRequired(stage, 'Stage is required')) {
    return createValidationError('Stage is required');
  }

  // Validate stage is a valid BuildUploadStage
  const validStages = Object.values(BuildUploadStage);
  if (!validStages.includes(stage as BuildUploadStage)) {
    return createValidationError(`Invalid stage. Must be one of: ${validStages.join(', ')}`);
  }

  try {
    const body = await request.json();
    const { testflightBuildNumber } = body;

    if (!testflightBuildNumber) {
      return createValidationError('testflightBuildNumber is required');
    }

    const buildUploadStage = stage as BuildUploadStage;

    console.log('[BFF] Verifying TestFlight build:', {
      appId,
      releaseId,
      stage: buildUploadStage,
      testflightBuildNumber,
    });

    const response = await ReleaseProcessService.verifyTestFlight(
      appId,
      releaseId,
      buildUploadStage,
      {
        testflightBuildNumber,
      },
      user.user.id
    );

    console.log('[BFF] TestFlight verification response:', response.data);
    return json(response.data);
  } catch (error) {
    logApiError('VERIFY_TESTFLIGHT_API', error);
    return handleAxiosError(error, 'Failed to verify TestFlight build');
  }
};

export const action = authenticateActionRequest({ POST: verifyTestFlight });


