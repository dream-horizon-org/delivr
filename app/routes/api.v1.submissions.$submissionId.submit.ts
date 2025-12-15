/**
 * Remix API Route: Submit Existing Submission (First-Time Submission)
 * PUT /api/v1/submissions/:submissionId/submit?platform=ANDROID|IOS
 * 
 * This endpoint submits an existing PENDING submission to the store.
 * The submission is already created when the distribution is created.
 * This endpoint updates submission details and changes status from PENDING to IN_REVIEW.
 * 
 * IMPORTANT: Backend requires `platform` query parameter to identify which table to query
 * (android_submission_builds or ios_submission_builds)
 * 
 * Use Case: First-time submission where submission already exists with PENDING status
 * Reference: DISTRIBUTION_API_SPEC.md lines 476-594
 */

import { json } from '@remix-run/node';
import { DistributionService } from '~/.server/services/Distribution';
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_CONTEXT,
} from '~/constants/distribution-api.constants';
import type { SubmitSubmissionRequest } from '~/types/distribution.types';
import { Platform } from '~/types/distribution.types';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  authenticateActionRequest,
  type AuthenticatedActionFunction,
} from '~/utils/authenticate';

/**
 * Validate rollout percentage (0-100, supports decimals)
 */
function validateRolloutPercent(percent: unknown): boolean {
  if (typeof percent !== 'number') {
    return false;
  }
  return percent >= 0 && percent <= 100;
}

/**
 * Validate in-app priority (0-5)
 */
function validateInAppPriority(priority: unknown): boolean {
  if (typeof priority !== 'number') {
    return false;
  }
  return Number.isInteger(priority) && priority >= 0 && priority <= 5;
}

/**
 * PUT - Submit existing PENDING submission
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required - for backend table identification)
 * 
 * Request Body (Android):
 * {
 *   rolloutPercent?: number,     // 0-100, supports decimals
 *   inAppPriority?: number,      // 0-5
 *   releaseNotes?: string
 * }
 * 
 * Request Body (iOS):
 * {
 *   phasedRelease?: boolean,
 *   resetRating?: boolean,
 *   releaseNotes?: string
 * }
 */
const submitSubmission: AuthenticatedActionFunction = async ({ params, request }) => {
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
    const body = (await request.json()) as SubmitSubmissionRequest;

    // Validate Android-specific fields
    if (
      body.rolloutPercent !== undefined &&
      !validateRolloutPercent(body.rolloutPercent)
    ) {
      return createValidationError(ERROR_MESSAGES.PERCENTAGE_REQUIRED);
    }

    if (
      body.inAppPriority !== undefined &&
      !validateInAppPriority(body.inAppPriority)
    ) {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_PRIORITY',
            message: 'In-app priority must be an integer between 0 and 5',
          },
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validate iOS-specific fields
    if (
      body.phasedRelease !== undefined &&
      typeof body.phasedRelease !== 'boolean'
    ) {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_PHASED_RELEASE',
            message: 'phasedRelease must be a boolean',
          },
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (
      body.resetRating !== undefined &&
      typeof body.resetRating !== 'boolean'
    ) {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_RESET_RATING',
            message: 'resetRating must be a boolean',
          },
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const response = await DistributionService.submitSubmission(
      submissionId,
      body,
      platform as Platform
    );

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.SUBMIT_SUBMISSION_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_SUBMIT_SUBMISSION);
  }
};

export const action = authenticateActionRequest({ PUT: submitSubmission });

