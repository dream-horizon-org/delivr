import { Request, Response } from 'express';
import type { Storage } from '../../../storage/storage';
import { S3Storage } from '../../../storage/aws-storage';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, errorResponse, validationErrorResponse } from '~utils/response.utils';
import { buildArtifactS3Key, buildS3Uri, deriveStandardArtifactFilename } from '~utils/s3-path.utils';
import { uploadToS3, inferContentType, generatePresignedGetUrl } from '~utils/s3-upload.utils';
import {
  BUILD_UPLOAD_ERROR_MESSAGES,
  BUILD_UPLOAD_SUCCESS_MESSAGES
} from './build.constants';
import { BuildRepository } from '~models/build/build.repository';
import { getFileWithField } from '../../../file-upload-manager';
import { getOptionalTrimmedString } from '~utils/request.utils';
 

export const createCiArtifactUploadHandler = (storage: Storage) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const ciRunId = getOptionalTrimmedString(req.params.ciRunId);

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

      // Fetch build info by ci_run_id
      const repo: BuildRepository = (storage as S3Storage).buildRepository;
      const build = await repo.findByCiRunId(ciRunId);
      const buildNotFound = !build;
      if (buildNotFound) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('ci_run_id', 'Build not found for provided ci_run_id')
        );
        return;
      }

      // Build S3 key using fields from the build record
      const tenantId = build.tenant_id;
      const releaseId = build.release_id;
      const storeType = build.storeType;
      const artifactVersionName = build.artifact_version_name;
      const artifactVersionCode = build.artifact_version_code;

      const bucketNameEnv = process.env.S3_BUCKETNAME || 'codepush-local-bucket';
      const fileName = deriveStandardArtifactFilename(artifactFile.originalname, artifactVersionCode);
      const s3Key = buildArtifactS3Key(
        {
          tenantId,
          releaseId,
          storeType,
          artifactVersionName
        },
        fileName
      );
      const contentType = inferContentType(fileName);

      try {
        if (storage instanceof S3Storage) {
          await storage.uploadBufferToS3(s3Key, artifactFile.buffer, contentType);
        } else {
          await uploadToS3({
            bucketName: bucketNameEnv,
            key: s3Key,
            body: artifactFile.buffer,
            contentType
          });
        }
      } catch (uploadErr) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          errorResponse(uploadErr, BUILD_UPLOAD_ERROR_MESSAGES.S3_UPLOAD_FAILED)
        );
        return;
      }

      // Compose S3 URI and generate presigned download URL
      const bucketForUri = (storage instanceof S3Storage) ? storage.getS3BucketName() : bucketNameEnv;
      const s3Uri = buildS3Uri(bucketForUri, s3Key);
      let downloadUrl: string;
      try {
        if (storage instanceof S3Storage) {
          downloadUrl = await storage.getSignedObjectUrl(s3Key, 3600);
        } else {
          downloadUrl = await generatePresignedGetUrl({
            bucketName: bucketForUri,
            key: s3Key,
            expiresSeconds: 3600
          });
        }
      } catch (signErr) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          errorResponse(signErr, 'Failed to generate presigned download URL')
        );
        return;
      }

      // Update build table with artifact_path
      try {
        await repo.updateArtifactPath(build.id, s3Uri);
      } catch (dbErr) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          errorResponse(dbErr, BUILD_UPLOAD_ERROR_MESSAGES.DB_SAVE_FAILED)
        );
        return;
      }

      res.status(HTTP_STATUS.CREATED).json(
        successResponse({ downloadUrl }, BUILD_UPLOAD_SUCCESS_MESSAGES.UPLOAD_COMPLETED)
      );
    } catch (err) {
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(errorResponse(err, 'Unexpected error during CI artifact upload'));
    }
  };


