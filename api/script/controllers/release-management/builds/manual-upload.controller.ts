import { Request, Response } from 'express';
import type { Storage } from '../../../storage/storage';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, errorResponse, validationErrorResponse } from '~utils/response.utils';
import { BUILD_ERROR_MESSAGES, BUILD_SUCCESS_MESSAGES } from '~types/release-management/builds';
import { parsePlatform, parseBuildStage, parseStoreType } from './build.utils';
import { getFileWithField } from '../../../file-upload-manager';
import { getTrimmedString } from '~utils/string.utils';
import { BuildArtifactService, BuildArtifactError } from '~services/release/build';

/**
 * HTTP handler for manual build artifact upload.
 * Extracts HTTP-specific concerns and delegates to BuildArtifactService.
 */
export const createManualBuildUploadHandler = (storage: Storage) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = getTrimmedString(req.params.tenantId);
      const releaseId = getTrimmedString(req.params.releaseId);

      const artifactVersionName = getTrimmedString(req.body?.artifactVersionName);
      const buildNumber = getTrimmedString(req.body?.buildNumber);
      const platformRaw = getTrimmedString(req.body?.platform);
      const storeTypeRaw = getTrimmedString(req.body?.storeType);
      const buildStageRaw = getTrimmedString(req.body?.buildStage);
      const artifactFile = getFileWithField(req, 'artifact');

      // Validate tenantId
      const tenantIdMissing = !tenantId;
      if (tenantIdMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('tenantId', BUILD_ERROR_MESSAGES.INVALID_TENANT_ID)
        );
        return;
      }

      // Validate releaseId
      const releaseIdMissing = !releaseId;
      if (releaseIdMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('releaseId', BUILD_ERROR_MESSAGES.INVALID_RELEASE_ID)
        );
        return;
      }

      // Validate version name
      const versionNameMissing = !artifactVersionName;
      if (versionNameMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('artifact_version_name', BUILD_ERROR_MESSAGES.INVALID_VERSION_NAME)
        );
        return;
      }

      // Validate artifact file
      const fileMissing = !artifactFile || !artifactFile.buffer || !artifactFile.originalname;
      if (fileMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('artifact', BUILD_ERROR_MESSAGES.ARTIFACT_REQUIRED)
        );
        return;
      }

      // Validate platform
      const platformValue = parsePlatform(platformRaw);
      const platformInvalid = platformValue === null;
      if (platformInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', BUILD_ERROR_MESSAGES.INVALID_PLATFORM)
        );
        return;
      }

      // Store type can be null in case of regression builds
      const storeTypeValue = parseStoreType(storeTypeRaw);

      // Validate build stage
      const buildStageValue = parseBuildStage(buildStageRaw);
      const buildStageInvalid = buildStageValue === null;
      if (buildStageInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('buildStage', BUILD_ERROR_MESSAGES.INVALID_BUILD_STAGE)
        );
        return;
      }

      // Use the service to handle the core business logic
      const buildArtifactService = new BuildArtifactService(storage);
      const result = await buildArtifactService.createManualBuild({
        tenantId,
        releaseId,
        artifactVersionName,
        buildNumber,
        platform: platformValue,
        storeType: storeTypeValue,
        buildStage: buildStageValue,
        artifactBuffer: artifactFile.buffer,
        originalFilename: artifactFile.originalname
      });

      res.status(HTTP_STATUS.CREATED).json(
        successResponse({ downloadUrl: result.downloadUrl }, BUILD_SUCCESS_MESSAGES.UPLOAD_COMPLETED)
      );
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
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(errorResponse(err, 'Unexpected error during build upload'));
    }
  };
