import { Request, Response } from 'express';
import type { Storage } from '../../../storage/storage';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, errorResponse, validationErrorResponse } from '~utils/response.utils';
import {
  BUILD_UPLOAD_ERROR_MESSAGES,
  BUILD_UPLOAD_SUCCESS_MESSAGES
} from './build.constants';
import { getFileWithField } from '../../../file-upload-manager';
import { getTrimmedString } from '~utils/request.utils';
import {
  BuildArtifactService,
  BuildArtifactError,
  BUILD_ARTIFACT_ERROR_CODE
} from '~services/release/build';

/**
 * HTTP handler for CI artifact upload.
 * Extracts HTTP-specific concerns and delegates to BuildArtifactService.
 */
export const artifactUploadHandler = (storage: Storage) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const ciRunId = getTrimmedString(req.params.ciRunId);

      const ciRunIdInvalid = !ciRunId;
      if (ciRunIdInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('ci_run_id', 'ci_run_id is required')
        );
        return;
      }

      const artifactFile = getFileWithField(req, 'artifact');
      const fileMissing = !artifactFile || !artifactFile.buffer || !artifactFile.originalname;
      if (fileMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('artifact', BUILD_UPLOAD_ERROR_MESSAGES.ARTIFACT_REQUIRED)
        );
        return;
      }

      // Use the service to handle the core business logic
      const buildArtifactService = new BuildArtifactService(storage);
      const result = await buildArtifactService.uploadArtifactForCiBuild({
        ciRunId,
        artifactBuffer: artifactFile.buffer,
        originalFilename: artifactFile.originalname
      });

      res.status(HTTP_STATUS.CREATED).json(
        successResponse({ downloadUrl: result.downloadUrl }, BUILD_UPLOAD_SUCCESS_MESSAGES.UPLOAD_COMPLETED)
      );
    } catch (err) {
      const isBuildArtifactError = err instanceof BuildArtifactError;

      if (isBuildArtifactError) {
        const artifactError = err as BuildArtifactError;
        const isBuildNotFound = artifactError.code === BUILD_ARTIFACT_ERROR_CODE.BUILD_NOT_FOUND;

        if (isBuildNotFound) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('ci_run_id', artifactError.message)
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
