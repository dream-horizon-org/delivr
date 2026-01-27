import { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, validationErrorResponse, errorResponse, notFoundResponse } from '~utils/response.utils';
import { BUILD_ARTIFACT_DOWNLOAD_ERROR_MESSAGES } from '~types/release-management/builds/build-artifact-download.constants';
import { BuildArtifactService, BuildArtifactError } from '~services/release/build';
import type { Storage } from '../../../storage/storage';
import { getTrimmedString } from '~utils/string.utils';

/**
 * HTTP handler for downloading build artifacts.
 * 
 * Generates presigned download URL for a build artifact.
 * Validates build exists, belongs to tenant, and has artifact available.
 * 
 * Required: appId (path), buildId (path)
 * Returns: { url: string, expiresAt: string }
 */
export const createBuildDownloadArtifactHandler = (storage: Storage) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Extract path params
      const buildId = getTrimmedString(req.params.buildId);
      const appId = getTrimmedString(req.params.appId);

      // Validate buildId
      const buildIdMissing = !buildId;
      if (buildIdMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('buildId', BUILD_ARTIFACT_DOWNLOAD_ERROR_MESSAGES.INVALID_BUILD_ID)
        );
        return;
      }

      // Validate appId
      const tenantIdMissing = !appId;
      if (tenantIdMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('appId', BUILD_ARTIFACT_DOWNLOAD_ERROR_MESSAGES.INVALID_TENANT_ID)
        );
        return;
      }

      // Instantiate service (following pattern from ci-artifact-upload.controller.ts)
      const buildArtifactService = new BuildArtifactService(storage);
      
      // Get download URL with expiry
      const result = await buildArtifactService.getBuildArtifactDownloadUrl(buildId, appId);

      // Success response
      res.status(HTTP_STATUS.OK).json(successResponse(result));
    } catch (err) {
      const isBuildArtifactError = err instanceof BuildArtifactError;

      if (isBuildArtifactError) {
        const artifactError = err as BuildArtifactError;
        
        // Map specific errors to 404 (don't leak build existence)
        const isBuildNotFound = artifactError.code === 'BUILD_NOT_FOUND';
        const isArtifactNotAvailable = artifactError.code === 'ARTIFACT_NOT_AVAILABLE';
        const shouldReturn404 = isBuildNotFound || isArtifactNotAvailable;
        
        if (shouldReturn404) {
          res.status(HTTP_STATUS.NOT_FOUND).json(
            notFoundResponse('Build artifact')
          );
          return;
        }

        // Other BuildArtifactError (e.g., PRESIGNED_URL_FAILED)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          errorResponse(artifactError, artifactError.message)
        );
        return;
      }

      // Unexpected error
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        errorResponse(err, 'Failed to get build artifact download URL')
      );
    }
  };

