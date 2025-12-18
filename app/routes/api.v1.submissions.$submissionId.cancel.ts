/**
 * Remix API Route: Cancel Submission
 * PATCH /api/v1/submissions/:submissionId/cancel?platform=<ANDROID|IOS>
 * 
 * IMPORTANT: Backend requires `platform` query parameter to identify which table to update
 * (android_submission_builds or ios_submission_builds)
 * 
 * Cancel an in-review submission. Reason is optional.
 * Reference: DISTRIBUTION_API_SPEC.md lines 1042-1073
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  authenticateActionRequest,
  AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { Platform } from '~/types/distribution/distribution.types';

/**
 * PATCH - Cancel a submission
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required - for backend table identification)
 * 
 * Request body (optional):
 * - reason: string (optional) - Reason for cancellation
 * 
 * Response:
 * - id, status (CANCELLED), statusUpdatedAt
 */
const cancelSubmission: AuthenticatedActionFunction = async ({ params, request, user }) => {
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
    // Parse body, but handle empty body gracefully
    const contentType = request.headers.get('content-type');
    let reason: string | undefined;

    if (contentType?.includes('application/json')) {
      try {
        const body = await request.json();
        reason = body.reason;
      } catch {
        // Empty body is acceptable - reason is optional
        reason = undefined;
      }
    }

    const response = await DistributionService.cancelSubmission(submissionId, {
      reason,
    }, platform as Platform);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.CANCEL_SUBMISSION_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_CANCEL_SUBMISSION);
  }
};

export const action = authenticateActionRequest({ PATCH: cancelSubmission });

