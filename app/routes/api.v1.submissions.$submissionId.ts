/**
 * Remix API Route: Single Submission Management
 * GET  /api/v1/submissions/:submissionId?platform=<ANDROID|IOS>        - Get submission details
 * 
 * IMPORTANT: Backend requires `platform` query parameter to identify which table to query
 * (android_submission_builds or ios_submission_builds)
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';
import type { User } from '~/.server/services/Auth/Auth.interface';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';
import { Platform } from '~/types/distribution/distribution.types';

/**
 * GET - Get submission details
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required - for backend table identification)
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { submissionId } = params;

    if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
    }

    // Extract and validate platform query parameter
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');
    
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
      const response = await DistributionService.getSubmission(submissionId, platform as Platform);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.SUBMISSION_DETAILS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_SUBMISSION);
    }
  }
);

// Note: Retry submission is now handled via POST /api/v1/distributions/:distributionId/submissions
// This route only handles GET requests for submission details

