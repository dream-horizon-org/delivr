/**
 * Remix API Route: Create Resubmission (After Rejection or Cancellation)
 * POST /api/v1/distributions/:distributionId/submissions
 * 
 * This endpoint creates a COMPLETELY NEW submission after rejection or cancellation.
 * It requires a new artifact (AAB file for Android, TestFlight build for iOS).
 * The new submission gets a new submissionId and is immediately submitted to the store.
 * 
 * Use Case: Resubmission after rejection or user-initiated cancellation
 * Reference: DISTRIBUTION_API_SPEC.md lines 913-1040
 * 
 * Content-Type:
 * - Android: multipart/form-data (for AAB file upload)
 * - iOS: application/json (TestFlight build number only)
 */

import { json, unstable_parseMultipartFormData } from '@remix-run/node';
import { DistributionService } from '~/.server/services/Distribution';
import {
    ERROR_MESSAGES,
    HTTP_STATUS,
    LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';
import type {
    AndroidResubmissionRequest,
    IOSResubmissionRequest,
} from '~/types/distribution/distribution.types';
import { Platform } from '~/types/distribution/distribution.types';
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
 * Validate platform value
 */
function validatePlatform(platform: unknown): platform is Platform {
  return platform === Platform.ANDROID || platform === Platform.IOS;
}

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
 * Validate version format (semantic versioning)
 */
function validateVersion(version: unknown): boolean {
  if (typeof version !== 'string') {
    return false;
  }
  // Allow formats like "2.7.1", "1.0.0", "3.2.1-beta"
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(version);
}

/**
 * Upload handler for AAB file (Android only)
 * Note: Implementation depends on your file storage solution (S3, local, etc.)
 */
const uploadHandler: import('@remix-run/node').UploadHandler = async ({ data, filename }) => {
  // This is a placeholder - actual implementation would upload to S3 or similar
  // For now, we'll collect the data and return a File object
  const chunks: Uint8Array[] = [];
  for await (const chunk of data) {
    chunks.push(chunk);
  }
  
  // In production, upload to S3 and return the S3 key or URL
  // For now, return a mock file reference
  // Convert Uint8Array[] to Blob first to satisfy type requirements
  const blob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' });
  return new File([blob], filename ?? 'upload.aab', { type: 'application/octet-stream' });
};

/**
 * POST - Create new submission (resubmission after rejection/cancellation)
 * 
 * Request Body (Android - multipart/form-data):
 * - platform: "ANDROID"
 * - version: "2.7.1"
 * - versionCode: 271 (optional)
 * - aabFile: <file>
 * - rolloutPercentage: 5
 * - inAppUpdatePriority: 0
 * - releaseNotes: "..."
 * 
 * Request Body (iOS - application/json):
 * - platform: "IOS"
 * - version: "2.7.1"
 * - testflightNumber: 56790
 * - phasedRelease: true
 * - resetRating: false
 * - releaseNotes: "..."
 */
const createResubmission: AuthenticatedActionFunction = async ({ params, request }) => {
  const { distributionId } = params;

  if (!validateRequired(distributionId, ERROR_MESSAGES.DISTRIBUTION_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.DISTRIBUTION_ID_REQUIRED);
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';

    // Handle Android (multipart/form-data) vs iOS (application/json)
    if (contentType.includes('multipart/form-data')) {
      // ========== ANDROID RESUBMISSION ==========
      const formData = await unstable_parseMultipartFormData(request, uploadHandler);
      
      const platform = formData.get('platform');
      const version = formData.get('version');
      const versionCodeStr = formData.get('versionCode');
      const aabFile = formData.get('aabFile');
      const rolloutPercentStr = formData.get('rolloutPercentage');
      const inAppPriorityStr = formData.get('inAppUpdatePriority');
      const releaseNotes = formData.get('releaseNotes');

      // Validate required fields
      if (!validatePlatform(platform)) {
        return createValidationError(ERROR_MESSAGES.INVALID_PLATFORM);
      }

      if (!validateVersion(version)) {
        return createValidationError(ERROR_MESSAGES.INVALID_VERSION);
      }

      if (!aabFile || !(aabFile instanceof File)) {
        return createValidationError(ERROR_MESSAGES.AAB_FILE_REQUIRED);
      }

      const rolloutPercentage = rolloutPercentStr ? Number(rolloutPercentStr) : undefined;
      if (rolloutPercentage === undefined || !validateRolloutPercent(rolloutPercentage)) {
        return createValidationError(ERROR_MESSAGES.PERCENTAGE_REQUIRED);
      }

      const inAppUpdatePriority = inAppPriorityStr ? Number(inAppPriorityStr) : undefined;
      if (inAppUpdatePriority === undefined || !validateInAppPriority(inAppUpdatePriority)) {
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

      if (!validateRequired(releaseNotes as string | null, 'Release notes are required')) {
        return createValidationError('Release notes are required');
      }

      const androidRequest: AndroidResubmissionRequest = {
        platform: Platform.ANDROID,
        version: String(version),
        versionCode: versionCodeStr ? Number(versionCodeStr) : undefined,
        aabFile: aabFile as File,
        rolloutPercentage,
        inAppUpdatePriority,
        releaseNotes: String(releaseNotes),
      };

      // Create FormData for service call
      const serviceFormData = new FormData();
      serviceFormData.append('platform', androidRequest.platform);
      serviceFormData.append('version', androidRequest.version);
      if (androidRequest.versionCode) {
        serviceFormData.append('versionCode', String(androidRequest.versionCode));
      }
      serviceFormData.append('aabFile', androidRequest.aabFile);
      serviceFormData.append('rolloutPercentage', String(androidRequest.rolloutPercentage));
      serviceFormData.append('inAppUpdatePriority', String(androidRequest.inAppUpdatePriority));
      serviceFormData.append('releaseNotes', androidRequest.releaseNotes);

      const response = await DistributionService.createResubmission(
        distributionId,
        serviceFormData
      );

      return json(response.data, { status: HTTP_STATUS.CREATED });

    } else {
      // ========== iOS RESUBMISSION ==========
      const body = (await request.json()) as Partial<IOSResubmissionRequest>;

      // Validate required fields
      if (!validatePlatform(body.platform)) {
        return createValidationError(ERROR_MESSAGES.INVALID_PLATFORM);
      }

      if (!validateVersion(body.version)) {
        return createValidationError(ERROR_MESSAGES.INVALID_VERSION);
      }

      if (
        !body.testflightNumber ||
        typeof body.testflightNumber !== 'number'
      ) {
        return createValidationError(ERROR_MESSAGES.TESTFLIGHT_BUILD_REQUIRED);
      }

      if (typeof body.phasedRelease !== 'boolean') {
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

      if (typeof body.resetRating !== 'boolean') {
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

      if (!validateRequired(body.releaseNotes, 'Release notes are required')) {
        return createValidationError('Release notes are required');
      }

      const iosRequest: IOSResubmissionRequest = {
        platform: Platform.IOS,
        version: body.version as string,
        testflightNumber: body.testflightNumber,
        phasedRelease: body.phasedRelease,
        resetRating: body.resetRating,
        releaseNotes: body.releaseNotes as string,
      };

      const response = await DistributionService.createResubmission(
        distributionId,
        iosRequest
      );

      return json(response.data, { status: HTTP_STATUS.CREATED });
    }
  } catch (error) {
    logApiError(LOG_CONTEXT.CREATE_RESUBMISSION_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_CREATE_RESUBMISSION);
  }
};

export const action = authenticateActionRequest({ POST: createResubmission });

