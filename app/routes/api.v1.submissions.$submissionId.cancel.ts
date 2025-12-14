/**
 * Remix API Route: Cancel Submission
 * PATCH /api/v1/submissions/:submissionId/cancel
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
  LOG_CONTEXT,
} from '~/constants/distribution-api.constants';
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

/**
 * PATCH - Cancel a submission
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
    });

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.CANCEL_SUBMISSION_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_CANCEL_SUBMISSION);
  }
};

export const action = authenticateActionRequest({ PATCH: cancelSubmission });

