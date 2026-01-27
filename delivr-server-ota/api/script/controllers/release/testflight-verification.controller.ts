/**
 * TestFlight Verification Controller
 * 
 * POST /apps/:appId/releases/:releaseId/stages/:stage/builds/ios/verify-testflight
 * Body: { testflightBuildNumber }
 * 
 * Verifies an iOS build exists in TestFlight and stages it in release_uploads table.
 * The version is retrieved from TestFlight (not provided in request).
 * Does NOT create a builds table entry - that happens when TaskExecutor consumes.
 */

import { Request, Response } from 'express';
import { HTTP_STATUS, RESPONSE_STATUS } from '../../constants/http';
import { TESTFLIGHT_BUILD_ERROR_MESSAGES } from '../../constants/testflight-build';
import { getErrorMessage } from '../../utils/error.utils';
import { validationErrorResponse, successResponse } from '../../utils/response.utils';
import { isNonEmptyString } from '../../utils/string.utils';
import { isValidUploadStage } from '../../utils/upload-stage.utils';
import { getStorage } from '../../storage/storage-instance';
import { TestFlightBuildVerificationService } from '../../services/release/testflight-build-verification.service';
import { UploadStage } from '../../models/release/release-uploads.sequelize.model';
import { PlatformName, ReleasePlatformTargetMapping } from '../../models/release/release.interface';
import { RELEASE_MANAGEMENT_ERROR_MESSAGES } from './release-management.constants';
import { 
  hasTestFlightVerificationDependencies,
  hasTestFlightBuildVerificationService,
  StorageWithReleaseServices
} from '../../types/release/storage-with-services.interface';

/**
 * Verify TestFlight Build and Stage for Task Consumption
 * 
 * Flow:
 * 1. Validate request (releaseId from path, stage from path, testflightBuildNumber from body)
 * 2. Verify build exists in App Store Connect via TestFlightBuildVerificationService (retrieves version from TestFlight)
 * 3. Create entry in release_uploads staging table (NOT builds table)
 * 4. Return staging response with platform status and version from TestFlight
 * 
 * Note: The builds table entry is created later when TaskExecutor consumes from staging.
 */
export const verifyTestFlightBuild = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract path parameters
    const { appId, releaseId, stage } = req.params;
    const { testflightBuildNumber } = req.body;

    // Validate appId
    const tenantIdInvalid = !isNonEmptyString(appId);
    if (tenantIdInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('appId', 'appId is required')
      );
      return;
    }

    // Validate releaseId (now from path, not body)
    const releaseIdInvalid = !isNonEmptyString(releaseId);
    if (releaseIdInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('releaseId', TESTFLIGHT_BUILD_ERROR_MESSAGES.RELEASE_ID_REQUIRED)
      );
      return;
    }

    // Validate stage (from path)
    const stageInvalid = !isNonEmptyString(stage);
    if (stageInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('stage', RELEASE_MANAGEMENT_ERROR_MESSAGES.STAGE_REQUIRED)
      );
      return;
    }

    const upperStage = stage.toUpperCase();
    const stageNotValid = !isValidUploadStage(upperStage);
    if (stageNotValid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('stage', RELEASE_MANAGEMENT_ERROR_MESSAGES.INVALID_STAGE)
      );
      return;
    }

    // Validate testflightBuildNumber (per spec field name)
    const testflightBuildNumberInvalid = !isNonEmptyString(testflightBuildNumber);
    if (testflightBuildNumberInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('testflightBuildNumber', TESTFLIGHT_BUILD_ERROR_MESSAGES.TESTFLIGHT_NUMBER_REQUIRED)
      );
      return;
    }

    // Get repositories from storage using type guard
    const storage = getStorage();
    const dependenciesAvailable = hasTestFlightVerificationDependencies(storage);
    if (!dependenciesAvailable) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: RESPONSE_STATUS.FAILURE,
        error: TESTFLIGHT_BUILD_ERROR_MESSAGES.RELEASE_UPLOADS_REPO_NOT_INITIALIZED,
      });
      return;
    }

    // ✅ Get TestFlightBuildVerificationService from storage (centralized initialization - replaces factory)
    if (!hasTestFlightBuildVerificationService(storage)) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        validationErrorResponse('testFlightBuildVerificationService', 'TestFlight verification service not available')
      );
      return;
    }
    
    const storageWithServices = storage as StorageWithReleaseServices;
    const verificationService = storageWithServices.testFlightBuildVerificationService;
    
    // ✅ Get repositories from storage (centralized initialization - replaces factory)
    const releaseUploadsRepository = storageWithServices.releaseUploadsRepository;
    const platformTargetMappingRepository = storageWithServices.platformMappingRepository;
    
    const verificationResult = await verificationService.verifyBuild({
      releaseId,
      appId,
      testflightBuildNumber,
    });

    // Handle verification failure
    const verificationFailed = !verificationResult.success;
    if (verificationFailed) {
      const errorCode = verificationResult.error?.code;
      let httpStatus: number;

      switch (errorCode) {
        case 'RELEASE_NOT_FOUND':
        case 'TESTFLIGHT_BUILD_NOT_FOUND':
        case 'IOS_RELEASE_NOT_FOUND':
          httpStatus = HTTP_STATUS.NOT_FOUND;
          break;
        case 'RELEASE_TENANT_MISMATCH':
          httpStatus = HTTP_STATUS.FORBIDDEN;
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

      res.status(httpStatus).json({
        success: RESPONSE_STATUS.FAILURE,
        error: verificationResult.error?.message || 'verification failed',
        errorCode: verificationResult.error?.code,
      });
      return;
    }

    // Step 2: Create entry in release_uploads staging table (NOT builds table)
    // Note: appId from path is already validated by verificationService.verifyBuild()
    const uploadStage = upperStage as UploadStage;
    const platform = PlatformName.IOS;

    const upload = await releaseUploadsRepository.upsert({
      appId,
      releaseId,
      platform,
      stage: uploadStage,
      artifactPath: null, // TestFlight builds have no S3 artifact
      testflightNumber: testflightBuildNumber,
    });

    console.log(
      `[TestFlight Verification] Build staged: ${platform} for ${uploadStage}. ` +
      `Release: ${releaseId}, Upload: ${upload.id}, TestFlight: ${testflightBuildNumber}`
    );

    // Log activity for TestFlight verification
    const accountId = (req as any).user?.id;
    if (accountId && storageWithServices.releaseActivityLogService) {
      try {
        await storageWithServices.releaseActivityLogService.registerActivityLogs(
          releaseId,
          accountId,
          new Date(),
          'TESTFLIGHT_BUILD_VERIFIED',
          null, // No previous value for verification
          {
            uploadId: upload.id,
            platform,
            stage: uploadStage,
            testflightNumber: testflightBuildNumber,
            version: verificationResult.data?.version
          }
        );
      } catch (logError) {
        console.error(`[TestFlight Verification] Failed to log activity:`, logError);
        // Don't fail the verification if activity logging fails
      }
    }

    // Step 3: Check platform status for response
    const platformMappings = await platformTargetMappingRepository.getByReleaseId(releaseId);
    const requiredPlatforms = platformMappings.map(
      (m: ReleasePlatformTargetMapping) => m.platform as PlatformName
    );
    const platformStatus = await releaseUploadsRepository.checkAllPlatformsReady(
      releaseId,
      uploadStage,
      requiredPlatforms
    );

    // Return staging response per spec
    // Use version from TestFlight verification result (must exist if verification succeeded)
    const versionName = verificationResult.data?.version;
    if (!versionName) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'TestFlight build verified but version is missing',
      });
      return;
    }
    
    res.status(HTTP_STATUS.OK).json(successResponse({
      uploadId: upload.id,
      releaseId,
      platform,
      stage: uploadStage,
      testflightNumber: testflightBuildNumber,
      versionName,
      verified: true,
      isUsed: false,
      uploadedPlatforms: platformStatus.uploadedPlatforms,
      missingPlatforms: platformStatus.missingPlatforms,
      allPlatformsReady: platformStatus.allReady,
      createdAt: upload.createdAt.toISOString(),
    }));
  } catch (error) {
    const message = getErrorMessage(error, TESTFLIGHT_BUILD_ERROR_MESSAGES.FAILED_TO_STAGE_TESTFLIGHT_BUILD);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};
