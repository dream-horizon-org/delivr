import { Request, Response } from 'express';
import type { Storage } from '../../../storage/storage';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, errorResponse, validationErrorResponse } from '~utils/response.utils';
import { BUILD_ERROR_MESSAGES, BUILD_SUCCESS_MESSAGES } from '~types/release-management/builds';
import { getTrimmedString } from '~utils/string.utils';
import {
  BuildArtifactService,
  BuildArtifactError,
  BUILD_ARTIFACT_ERROR_CODE
} from '~services/release/build';

/**
 * HTTP handler for CI artifact upload.
 * Extracts HTTP-specific concerns and delegates to BuildArtifactService.
 */
export const createCiArtifactUploadHandler = (storage: Storage) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const ciRunId = getTrimmedString(req.body.ciRunId);

      const ciRunIdInvalid = !ciRunId;
      if (ciRunIdInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('ciRunId', 'ciRunId is required')
        );
        return;
      }

      const artifactVersion = getTrimmedString(req.body.artifactVersion);

      const artifactVersionInvalid = !artifactVersion;
      if (artifactVersionInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('artifactVersion', 'artifactVersion is required')
        );
        return;
      }

      // When using upload.single(), the file is in req.file, not req.files
      const artifactFile = req.file;
      const fileMissing = !artifactFile || !artifactFile.buffer || !artifactFile.originalname;
      if (fileMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('artifact', BUILD_ERROR_MESSAGES.ARTIFACT_REQUIRED)
        );
        return;
      }

      // Optional: buildNumber (versionCode) from body (for AAB builds where CI already uploaded to Play Store)
      const buildNumber = getTrimmedString(req.body.buildNumber);

      // Use the service to handle the core business logic
      const buildArtifactService = new BuildArtifactService(storage);
      const result = await buildArtifactService.uploadArtifactForCiBuild({
        ciRunId,
        artifactVersion,
        artifactBuffer: artifactFile.buffer,
        originalFilename: artifactFile.originalname,
        buildNumber: buildNumber ?? undefined
      });

      res.status(HTTP_STATUS.CREATED).json(
        successResponse({ downloadUrl: result.downloadUrl }, BUILD_SUCCESS_MESSAGES.UPLOAD_COMPLETED)
      );
    } catch (err) {
      const isBuildArtifactError = err instanceof BuildArtifactError;

      if (isBuildArtifactError) {
        const artifactError = err as BuildArtifactError;
        const isBuildNotFound = artifactError.code === BUILD_ARTIFACT_ERROR_CODE.BUILD_NOT_FOUND;
        const isPlayStoreIntegrationNotFound = artifactError.code === BUILD_ARTIFACT_ERROR_CODE.PLAY_STORE_INTEGRATION_NOT_FOUND;
        const isVersionMismatch = artifactError.code === BUILD_ARTIFACT_ERROR_CODE.ARTIFACT_VERSION_MISMATCH;

        if (isBuildNotFound) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('ciRunId', artifactError.message)
          );
          return;
        }

        if (isVersionMismatch) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('artifactVersion', artifactError.message)
          );
          return;
        }

        if (isPlayStoreIntegrationNotFound) {
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
        .json(errorResponse(err, 'Unexpected error during CI artifact upload'));
    }
  };
