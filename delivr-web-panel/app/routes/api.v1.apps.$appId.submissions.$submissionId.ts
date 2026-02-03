/**
 * Remix API Route: Single Submission Management
 * GET  /api/v1/apps/:appId/submissions/:submissionId?platform=<ANDROID|IOS>  - Get submission details
 * 
 * IMPORTANT: Backend requires `platform` query parameter to identify which table to query
 * (android_submission_builds or ios_submission_builds)
 * 
 * Path Parameters:
 * - appId: Tenant/Organization ID (required)
 * - submissionId: Submission ID (required)
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required)
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';
import { Platform } from '~/types/distribution/distribution.types';
import {
  createValidationError,
  handleAxiosError,
  logApiError
} from '~/utils/api-route-helpers';
import { authenticateLoaderRequest } from '~/utils/authenticate';

/**
 * GET - Get submission details
 * 
 * Path Parameters:
 * - appId: Tenant/Organization ID (required)
 * - submissionId: Submission ID (required)
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required - for backend table identification)
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const appId = params.appId;
    const submissionId = params.submissionId;
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');

    // Validate appId
    if (!appId) {
      return createValidationError(ERROR_MESSAGES.APP_ID_REQUIRED);
    }

    // Validate submissionId
    if (!submissionId) {
      return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
    }

    // Validate platform
    if (!platform || (platform !== Platform.ANDROID && platform !== Platform.IOS)) {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_PLATFORM',
            message: 'Platform query parameter is required and must be either ANDROID or IOS',
          },
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    try {
      const response = await DistributionService.getSubmission(appId, submissionId, platform as Platform);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.SUBMISSION_DETAILS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_SUBMISSION);
    }
  }
);

// Note: Retry submission is now handled via POST /api/v1/apps/:appId/distributions/:distributionId/submissions
// This route only handles GET requests for submission details

