import { Request, Response } from 'express';
import type { Storage } from '../../../storage/storage';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, errorResponse, validationErrorResponse } from '~utils/response.utils';
import { getTrimmedString } from '~utils/string.utils';
import { parseBuildStage } from './build.utils';
import { BUILD_STAGE } from '~types/release-management/builds';
import {
  BuildArtifactService,
  BuildArtifactError,
  BUILD_ARTIFACT_ERROR_CODE,
  BUILD_ARTIFACT_SUCCESS_MESSAGES
} from '~services/release/build';

/**
 * HTTP handler for manual TestFlight build verification.
 * For users without CI/CD who manually upload builds to TestFlight.
 *
 * POST /tenants/:tenantId/releases/:releaseId/builds/testflight/verify
 */
export const createManualTestflightVerifyHandler = (storage: Storage) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = getTrimmedString(req.params.tenantId);
      const releaseId = getTrimmedString(req.params.releaseId);

      const tenantIdInvalid = !tenantId;
      if (tenantIdInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('tenantId', 'tenantId is required')
        );
        return;
      }

      const releaseIdInvalid = !releaseId;
      if (releaseIdInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('releaseId', 'releaseId is required')
        );
        return;
      }

      const testflightNumber = getTrimmedString(req.body.testflightNumber);
      const testflightNumberInvalid = !testflightNumber;
      if (testflightNumberInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('testflightNumber', 'testflightNumber is required')
        );
        return;
      }

      const versionName = getTrimmedString(req.body.versionName);
      const versionNameInvalid = !versionName;
      if (versionNameInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('versionName', 'versionName is required')
        );
        return;
      }

      // buildStage is optional, defaults to PRE_RELEASE
      const buildStageRaw = getTrimmedString(req.body.buildStage);
      const parsedBuildStage = parseBuildStage(buildStageRaw);
      const buildStage = parsedBuildStage ?? BUILD_STAGE.PRE_RELEASE;

      // Use the service to handle the core business logic
      const buildArtifactService = new BuildArtifactService(storage);
      const result = await buildArtifactService.verifyManualTestflightBuild({
        tenantId,
        releaseId,
        testflightNumber,
        versionName,
        buildStage
      });

      res.status(HTTP_STATUS.CREATED).json(
        successResponse(result, BUILD_ARTIFACT_SUCCESS_MESSAGES.TESTFLIGHT_VERIFIED)
      );
    } catch (err) {
      const isBuildArtifactError = err instanceof BuildArtifactError;

      if (isBuildArtifactError) {
        const artifactError = err as BuildArtifactError;
        const isTestflightInvalid = artifactError.code === BUILD_ARTIFACT_ERROR_CODE.TESTFLIGHT_NUMBER_INVALID;

        if (isTestflightInvalid) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            errorResponse(artifactError, artifactError.message)
          );
          return;
        }

        // All other artifact errors are internal server errors
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          errorResponse(artifactError, artifactError.message)
        );
        return;
      }

      // Unexpected error
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(errorResponse(err, 'Unexpected error during TestFlight verification'));
    }
  };

