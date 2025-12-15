/**
 * Remix API Route: Rollout Control
 * 
 * PATCH /api/v1/submissions/:submissionId/rollout?platform=<ANDROID|IOS>        - Update rollout percentage
 * PATCH /api/v1/submissions/:submissionId/rollout/pause?platform=IOS            - Pause rollout (iOS only)
 * PATCH /api/v1/submissions/:submissionId/rollout/resume?platform=IOS           - Resume rollout (iOS only)
 * PATCH /api/v1/submissions/:submissionId/rollout/halt?platform=<ANDROID|IOS>   - Emergency halt
 * 
 * IMPORTANT: Backend requires `platform` query parameter to identify which table to update
 * (android_submission_builds or ios_submission_builds)
 * 
 * Reference: DISTRIBUTION_API_SPEC.md lines 827-1193
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest, AuthenticatedActionFunction } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';
import {
  createValidationError,
  handleAxiosError,
  isValidPercentage,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  LOG_CONTEXT,
  VALIDATION,
} from '~/constants/distribution-api.constants';
import { Platform } from '~/types/distribution.types';

/**
 * PATCH - Update rollout percentage
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required - for backend table identification)
 * 
 * Platform-specific rules:
 * - Android: Any value 0-100 (supports decimals)
 * - iOS Phased: Only 100 (to complete early)
 * - iOS Manual: Not allowed (always 100%)
 */
const updateRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
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
    const body = await request.json();
    const { rolloutPercent } = body;

    if (
      typeof rolloutPercent !== 'number' ||
      rolloutPercent < VALIDATION.MIN_PERCENTAGE ||
      rolloutPercent > VALIDATION.MAX_PERCENTAGE
    ) {
      return createValidationError(ERROR_MESSAGES.PERCENTAGE_OUT_OF_RANGE);
    }

    const requestData = { rolloutPercent };
    const response = await DistributionService.updateRollout(submissionId, requestData, platform as Platform);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.UPDATE_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_UPDATE_ROLLOUT);
  }
};

/**
 * PATCH - Pause rollout (iOS phased release only)
 * 
 * Query Parameters:
 * - platform: Must be "IOS" (required - Android does not support pause)
 * 
 * Request body:
 * - reason: string (required)
 */
const pauseRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;

  if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
  }

  // Extract and validate platform query parameter (must be IOS)
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');
  
  if (platform !== Platform.IOS) {
    return json(
      {
        success: false,
        error: {
          code: 'INVALID_PLATFORM',
          message: 'Platform query parameter must be IOS (Android does not support pause)',
        },
      },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  try {
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string') {
      return createValidationError(ERROR_MESSAGES.REASON_REQUIRED);
    }

    const requestData = { reason };
    const response = await DistributionService.pauseRollout(submissionId, requestData, platform);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.PAUSE_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_PAUSE_ROLLOUT);
  }
};

/**
 * PATCH - Resume rollout (iOS phased release only)
 * 
 * Query Parameters:
 * - platform: Must be "IOS" (required - Android does not support resume)
 * 
 * No request body required.
 */
const resumeRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;

  if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
  }

  // Extract and validate platform query parameter (must be IOS)
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');
  
  if (platform !== Platform.IOS) {
    return json(
      {
        success: false,
        error: {
          code: 'INVALID_PLATFORM',
          message: 'Platform query parameter must be IOS (Android does not support resume)',
        },
      },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  try {
    const response = await DistributionService.resumeRollout(submissionId, platform);
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.RESUME_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_RESUME_ROLLOUT);
  }
};

/**
 * PATCH - Emergency halt rollout
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required - for backend table identification)
 * 
 * Request body:
 * - reason: string (required)
 * 
 * Note: Severity field was removed from spec. Only reason is required.
 */
const haltRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
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
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string') {
      return createValidationError(ERROR_MESSAGES.REASON_REQUIRED);
    }

    const requestData = { reason };
    const response = await DistributionService.haltRollout(submissionId, requestData, platform as Platform);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.HALT_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_HALT_ROLLOUT);
  }
};

/**
 * Route to sub-action based on URL path
 */
function routeRolloutAction(request: Request): 'pause' | 'resume' | 'halt' | null {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.endsWith('/pause')) return 'pause';
  if (pathname.endsWith('/resume')) return 'resume';
  if (pathname.endsWith('/halt')) return 'halt';

  return null;
}

/**
 * Route handler that dispatches to appropriate sub-action
 */
const handlePatchRequest: AuthenticatedActionFunction = async (args) => {
  const actionType = routeRolloutAction(args.request);

  if (actionType === 'pause') return pauseRollout(args);
  if (actionType === 'resume') return resumeRollout(args);
  if (actionType === 'halt') return haltRollout(args);

  // Base rollout update (no sub-action)
  return updateRollout(args);
};

export const action = authenticateActionRequest({
  PATCH: handlePatchRequest,
});
