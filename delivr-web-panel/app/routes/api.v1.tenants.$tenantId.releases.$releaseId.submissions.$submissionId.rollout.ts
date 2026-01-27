/**
 * Remix API Route: Rollout Control
 * 
 * PATCH /api/v1/apps/:appId/releases/:releaseId/submissions/:submissionId/rollout?platform=<ANDROID|IOS>         - Update rollout percentage
 * PATCH /api/v1/apps/:appId/releases/:releaseId/submissions/:submissionId/rollout/pause?platform=<ANDROID|IOS>   - Pause rollout (both platforms)
 * PATCH /api/v1/apps/:appId/releases/:releaseId/submissions/:submissionId/rollout/resume?platform=<ANDROID|IOS>  - Resume rollout (both platforms)
 * 
 * IMPORTANT: Backend requires `platform` query parameter to identify which table to update
 * (android_submission_builds or ios_submission_builds)
 * 
 * Path Parameters:
 * - appId: Tenant/Organization ID (required)
 * - releaseId: Release ID (required for ownership validation)
 * - submissionId: Submission ID (required)
 * 
 * Platform-specific behavior:
 * - Android: PAUSE changes status IN_PROGRESS → HALTED, RESUME changes HALTED → IN_PROGRESS
 * - iOS: PAUSE changes status LIVE → PAUSED, RESUME changes PAUSED → LIVE
 * - HALT is NOT a separate action - it's the Android status name for a paused rollout
 * 
 * Reference: DISTRIBUTION_API_SPEC.md lines 1194-1598
 */

import { json } from '@remix-run/node';
import { DistributionService } from '~/.server/services/Distribution';
import {
    ERROR_MESSAGES,
    HTTP_STATUS,
    LOG_CONTEXT,
    VALIDATION,
} from '~/constants/distribution/distribution-api.constants';
import { Platform } from '~/types/distribution/distribution.types';
import {
    createValidationError,
    handleAxiosError,
    logApiError
} from '~/utils/api-route-helpers';
import { authenticateActionRequest, AuthenticatedActionFunction } from '~/utils/authenticate';

/**
 * PATCH - Update rollout percentage
 * 
 * Path Parameters:
 * - appId: Tenant/Organization ID (required)
 * - submissionId: Submission ID (required)
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required - for backend table identification)
 * - releaseId: Release ID (required - for ownership validation)
 * 
 * ✅ Correct iOS Behavior:
 * ┌───────────────┬───────────┬──────────────┬────────────┐
 * │ phasedRelease │ Rollout % │ Can Update?  │ Can Pause? │
 * ├───────────────┼───────────┼──────────────┼────────────┤
 * │ true          │ 1-99%     │ ✅ Yes       │ ✅ Yes     │
 * │               │           │ (to 100%)    │            │
 * │ true          │ 100%      │ ❌ No        │ ❌ No      │
 * │ false         │ 100%      │ ❌ No        │ ❌ No      │
 * │ false         │ <100%     │ ❌ INVALID   │ ❌ INVALID │
 * └───────────────┴───────────┴──────────────┴────────────┘
 * 
 * Platform-specific rules:
 * - Android: Any value 0-100 (supports decimals)
 * - iOS Phased: Only 100 (to complete early)
 * - iOS Manual: Not allowed (always 100%)
 * 
 * See: platform-rules.ts, LIVE_STATE_VERIFICATION.md
 */
const updateRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { appId, releaseId, submissionId } = params;
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');

  // Validate appId
  if (!appId) {
    return createValidationError(ERROR_MESSAGES.APP_ID_REQUIRED);
  }

  // Validate releaseId
  if (!releaseId) {
    return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
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
    const body = await request.json();
    const { rolloutPercentage } = body;

    if (
      typeof rolloutPercentage !== 'number' ||
      rolloutPercentage < VALIDATION.MIN_PERCENTAGE ||
      rolloutPercentage > VALIDATION.MAX_PERCENTAGE
    ) {
      return createValidationError(ERROR_MESSAGES.PERCENTAGE_OUT_OF_RANGE);
    }

    // Backend expects 'rolloutPercent' (without 'age'), so transform the field name
    const requestData = { rolloutPercent: rolloutPercentage };
    const response = await DistributionService.updateRollout(appId, releaseId, submissionId, requestData as any, platform as Platform);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.UPDATE_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_UPDATE_ROLLOUT);
  }
};

/**
 * PATCH - Pause rollout (both Android and iOS)
 * 
 * Path Parameters:
 * - appId: Tenant/Organization ID (required)
 * - submissionId: Submission ID (required)
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required)
 * - releaseId: Release ID (required - for ownership validation)
 * 
 * Request body:
 * - reason: string (required)
 * 
 * Platform-specific behavior:
 * - Android: IN_PROGRESS → HALTED (displayed as "Rollout Paused")
 * - iOS: LIVE → PAUSED (displayed as "Rollout Paused", phased release only)
 */
const pauseRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { appId, releaseId, submissionId } = params;
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');

  // Validate appId
  if (!appId) {
    return createValidationError(ERROR_MESSAGES.APP_ID_REQUIRED);
  }

  // Validate releaseId
  if (!releaseId) {
    return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
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
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string') {
      return createValidationError(ERROR_MESSAGES.REASON_REQUIRED);
    }

    const requestData = { reason };
    const response = await DistributionService.pauseRollout(appId, releaseId, submissionId, requestData, platform);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.PAUSE_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_PAUSE_ROLLOUT);
  }
};

/**
 * PATCH - Resume rollout (both Android and iOS)
 * 
 * Path Parameters:
 * - appId: Tenant/Organization ID (required)
 * - submissionId: Submission ID (required)
 * 
 * Query Parameters:
 * - platform: ANDROID | IOS (required)
 * - releaseId: Release ID (required - for ownership validation)
 * 
 * No request body required.
 * 
 * Platform-specific behavior:
 * - Android: HALTED → IN_PROGRESS
 * - iOS: PAUSED → LIVE
 */
const resumeRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { appId, releaseId, submissionId } = params;
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');

  // Validate appId
  if (!appId) {
    return createValidationError(ERROR_MESSAGES.APP_ID_REQUIRED);
  }

  // Validate releaseId
  if (!releaseId) {
    return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
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
    const response = await DistributionService.resumeRollout(appId, releaseId, submissionId, platform);
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.RESUME_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_RESUME_ROLLOUT);
  }
};

/**
 * Route to sub-action based on URL path
 */
function routeRolloutAction(request: Request): 'pause' | 'resume' | null {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.endsWith('/pause')) return 'pause';
  if (pathname.endsWith('/resume')) return 'resume';

  return null;
}

/**
 * Route handler that dispatches to appropriate sub-action
 */
const handlePatchRequest: AuthenticatedActionFunction = async (args) => {
  const actionType = routeRolloutAction(args.request);

  if (actionType === 'pause') return pauseRollout(args);
  if (actionType === 'resume') return resumeRollout(args);

  // Base rollout update (no sub-action)
  return updateRollout(args);
};

export const action = authenticateActionRequest({
  PATCH: handlePatchRequest,
});

