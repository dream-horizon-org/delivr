import { Request, Response } from 'express';
import type { Storage } from '../../../storage/storage';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, errorResponse, validationErrorResponse } from '~utils/response.utils';
import { getTrimmedString } from '~utils/string.utils';
import {
  BuildArtifactService,
  BuildArtifactError,
  BUILD_ARTIFACT_ERROR_CODE,
  BUILD_ARTIFACT_SUCCESS_MESSAGES
} from '~services/release/build';

/**
 * HTTP handler for CI/CD TestFlight build verification.
 * For users with CI/CD pipelines that upload builds to TestFlight.
 *
 * POST /builds/ci/testflight/verify
 *
 * ciRunId is passed in request body because it can be a URL
 * containing special characters (e.g., https://jenkins.example.com/job/Release/1042/)
 */
export const createCiTestflightVerifyHandler = (storage: Storage) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      // ciRunId from body - supports URLs with special characters
      const ciRunId = getTrimmedString(req.body.ciRunId);

      const ciRunIdInvalid = !ciRunId;
      if (ciRunIdInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('ciRunId', 'ciRunId is required')
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

      // Use the service to handle the core business logic
      const buildArtifactService = new BuildArtifactService(storage);
      const result = await buildArtifactService.verifyCiTestflightBuild({
        ciRunId,
        testflightNumber
      });

      res.status(HTTP_STATUS.OK).json(
        successResponse(result, BUILD_ARTIFACT_SUCCESS_MESSAGES.TESTFLIGHT_VERIFIED)
      );
    } catch (err) {
      const isBuildArtifactError = err instanceof BuildArtifactError;

      if (isBuildArtifactError) {
        const artifactError = err as BuildArtifactError;
        const isBuildNotFound = artifactError.code === BUILD_ARTIFACT_ERROR_CODE.BUILD_NOT_FOUND;
        const isTestflightInvalid = artifactError.code === BUILD_ARTIFACT_ERROR_CODE.TESTFLIGHT_NUMBER_INVALID;

        if (isBuildNotFound) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('ciRunId', artifactError.message)
          );
          return;
        }

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

