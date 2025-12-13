/**
 * TestFlight Verification Controller
 * 
 * POST /tenants/:tenantId/builds/verify-testflight
 * Body: { releaseId, testflightBuildNumber, versionName }
 */

import { Request, Response } from 'express';
import { HTTP_STATUS, RESPONSE_STATUS } from '../../constants/http';
import { TESTFLIGHT_BUILD_ERROR_MESSAGES } from '../../constants/testflight-build';
import { getErrorMessage } from '../../utils/error.utils';
import { validationErrorResponse } from '../../utils/response.utils';
import { getStorage } from '../../storage/storage-instance';
import { TestFlightBuildVerificationService } from '../../services/release/testflight-build-verification.service';

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Verify TestFlight Build
 * 
 * Checks if an iOS build exists in TestFlight with matching build number and version.
 */
export const verifyTestFlightBuild = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { releaseId, testflightBuildNumber, versionName } = req.body;

    // Validate required fields
    if (!isNonEmptyString(releaseId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('releaseId', TESTFLIGHT_BUILD_ERROR_MESSAGES.RELEASE_ID_REQUIRED)
      );
      return;
    }

    if (!isNonEmptyString(testflightBuildNumber)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('testflightBuildNumber', TESTFLIGHT_BUILD_ERROR_MESSAGES.TESTFLIGHT_NUMBER_REQUIRED)
      );
      return;
    }

    if (!isNonEmptyString(versionName)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('versionName', TESTFLIGHT_BUILD_ERROR_MESSAGES.VERSION_NAME_REQUIRED)
      );
      return;
    }

    // Get controllers and repositories from storage
    const storage = getStorage() as any;
    const storeController = storage.storeIntegrationController;
    const credentialController = storage.storeCredentialController;
    const platformTargetMappingRepository = storage.releasePlatformTargetMappingRepository;

    if (!storeController || !credentialController || !platformTargetMappingRepository) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'Required controllers or repositories not initialized',
      });
      return;
    }

    // Call service
    const service = new TestFlightBuildVerificationService(
      storeController,
      credentialController,
      platformTargetMappingRepository
    );
    const result = await service.verifyBuild({
      releaseId,
      tenantId,
      testflightBuildNumber,
      versionName,
    });

    // Return success
    if (result.success) {
      res.status(HTTP_STATUS.OK).json(result);
      return;
    }

    // Map error codes to HTTP status
    const errorCode = result.error?.code;
    let httpStatus: number;

    switch (errorCode) {
      case 'TESTFLIGHT_BUILD_NOT_FOUND':
      case 'IOS_RELEASE_NOT_FOUND':
        httpStatus = HTTP_STATUS.NOT_FOUND;
        break;
      case 'VERSION_MISMATCH':
      case 'VERSION_MISMATCH_WITH_RELEASE':
      case 'STORE_INTEGRATION_NOT_FOUND':
      case 'STORE_INTEGRATION_INVALID':
        httpStatus = HTTP_STATUS.BAD_REQUEST;
        break;
      default:
        httpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        break;
    }

    res.status(httpStatus).json(result);
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to verify TestFlight build');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

