import { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, validationErrorResponse, errorResponse } from '~utils/response.utils';
import { BUILD_ERROR_MESSAGES } from '~types/release-management/builds';
import {
  parsePlatform,
  parseBuildStage,
  parseStoreType,
  parseBuildType,
  parseWorkflowStatus,
  parseBuildUploadStatus
} from './build.utils';
import { getTrimmedString } from '~utils/string.utils';
import { BuildArtifactService, BuildArtifactError } from '~services/release/build';
import type { Storage } from '../../../storage/storage';

/**
 * HTTP handler for listing build artifacts.
 * 
 * Required: tenantId (path), releaseId (path)
 * Optional query params: platform, buildStage, storeType, buildType, regressionId, workflowStatus, buildUploadStatus
 */
export const createBuildListArtifactsHandler = (storage: Storage) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Required path params
      const tenantId = getTrimmedString(req.params.tenantId);
      const releaseId = getTrimmedString(req.params.releaseId);

      // Validate required params
      const tenantIdMissing = !tenantId;
      if (tenantIdMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('tenantId', BUILD_ERROR_MESSAGES.INVALID_TENANT_ID)
        );
        return;
      }

      const releaseIdMissing = !releaseId;
      if (releaseIdMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('releaseId', BUILD_ERROR_MESSAGES.INVALID_RELEASE_ID)
        );
        return;
      }

      // Optional query params - parse without validation errors (invalid values are ignored)
      const platform = parsePlatform(req.query.platform);
      const buildStage = parseBuildStage(req.query.buildStage);
      const storeType = parseStoreType(req.query.storeType);
      const buildType = parseBuildType(req.query.buildType);
      const regressionId = getTrimmedString(req.query.regressionId);
      const taskId = getTrimmedString(req.query.taskId);
      const workflowStatus = parseWorkflowStatus(req.query.workflowStatus);
      const buildUploadStatus = parseBuildUploadStatus(req.query.buildUploadStatus);

      // Use the service to handle the core business logic
      const buildArtifactService = new BuildArtifactService(storage);
      const results = await buildArtifactService.listBuildArtifacts({
        tenantId,
        releaseId,
        platform,
        buildStage,
        storeType,
        buildType,
        regressionId,
        taskId,
        workflowStatus,
        buildUploadStatus
      });

      res.status(HTTP_STATUS.OK).json(successResponse(results));
    } catch (err) {
      const isBuildArtifactError = err instanceof BuildArtifactError;

      if (isBuildArtifactError) {
        const artifactError = err as BuildArtifactError;
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          errorResponse(artifactError, artifactError.message)
        );
        return;
      }

      // Unexpected error
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        errorResponse(err, 'Failed to list build artifacts')
      );
    }
  };
