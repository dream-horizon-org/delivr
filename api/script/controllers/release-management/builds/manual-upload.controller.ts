import { Request, Response } from 'express';
import type { Storage } from '../../../storage/storage';
import { S3Storage } from '../../../storage/aws-storage';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, errorResponse, validationErrorResponse } from '~utils/response.utils';
import { buildArtifactS3Key, buildS3Uri, deriveStandardArtifactFilename } from '~utils/s3-path.utils';
import { uploadToS3, inferContentType, generatePresignedGetUrl } from '~utils/s3-upload.utils';
import {
  BUILD_UPLOAD_ERROR_MESSAGES,
  BUILD_UPLOAD_SUCCESS_MESSAGES,
  BUILD_UPLOAD_STATUS,
  BUILD_TYPE,
} from './build.constants';
import { BuildRepository } from '~models/build/build.repository';
import * as shortid from 'shortid';
import { getFileWithField } from '../../../file-upload-manager';

export const createManualBuildUploadHandler = (storage: Storage) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.params.tenantId;
      const releaseId = req.params.releaseId;

      const artifactVersionName = req.body?.artifact_version_name;
      const artifactVersionCode = req.body?.artifact_version_code;
      const platformRaw = req.body?.platform;
      const storeType = req.body?.storeType;
      const artifactFile = getFileWithField(req, 'artifact');

      const tenantIdInvalid = !tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0;
      if (tenantIdInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('tenantId', BUILD_UPLOAD_ERROR_MESSAGES.INVALID_TENANT_ID)
        );
        return;
      }

      const releaseIdInvalid = !releaseId || typeof releaseId !== 'string' || releaseId.trim().length === 0;
      if (releaseIdInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('releaseId', BUILD_UPLOAD_ERROR_MESSAGES.INVALID_RELEASE_ID)
        );
        return;
      }

      const versionNameInvalid =
        !artifactVersionName || typeof artifactVersionName !== 'string' || artifactVersionName.trim().length === 0;
      if (versionNameInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('artifact_version_name', BUILD_UPLOAD_ERROR_MESSAGES.INVALID_VERSION_NAME)
        );
        return;
      }

      const versionCodeInvalid =
        !artifactVersionCode || typeof artifactVersionCode !== 'string' || artifactVersionCode.trim().length === 0;
      if (versionCodeInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('artifact_version_code', BUILD_UPLOAD_ERROR_MESSAGES.INVALID_VERSION_CODE)
        );
        return;
      }

      const fileMissing = !artifactFile || !artifactFile.buffer || !artifactFile.originalname;
      if (fileMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('artifact', BUILD_UPLOAD_ERROR_MESSAGES.ARTIFACT_REQUIRED)
        );
        return;
      }

      const normalizedPlatform = typeof platformRaw === 'string' ? platformRaw.trim().toUpperCase() : '';
      const platformInvalid = normalizedPlatform !== 'ANDROID';
      if (platformInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', BUILD_UPLOAD_ERROR_MESSAGES.INVALID_PLATFORM)
        );
        return;
      }

      const storeTypeInvalid = !storeType || typeof storeType !== 'string' || storeType.trim().length === 0;
      if (storeTypeInvalid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('storeType', BUILD_UPLOAD_ERROR_MESSAGES.INVALID_STORE_TYPE)
        );
        return;
      }
      const normalizedStoreTypeRaw = typeof storeType === 'string' ? storeType.trim().toUpperCase() : '';
      const toStoreType = (
        value: string
      ):
        | 'APP_STORE'
        | 'PLAY_STORE'
        | 'TESTFLIGHT'
        | 'MICROSOFT_STORE'
        | 'FIREBASE'
        | null => {
        if (value === 'APP_STORE') return 'APP_STORE';
        if (value === 'PLAY_STORE') return 'PLAY_STORE';
        if (value === 'TESTFLIGHT') return 'TESTFLIGHT';
        if (value === 'MICROSOFT_STORE') return 'MICROSOFT_STORE';
        if (value === 'FIREBASE') return 'FIREBASE';
        return null;
      };
      const storeTypeValue = toStoreType(normalizedStoreTypeRaw);
      const storeTypeUnsupported = storeTypeValue === null;
      if (storeTypeUnsupported) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('storeType', BUILD_UPLOAD_ERROR_MESSAGES.INVALID_STORE_TYPE)
        );
        return;
      }

      const bucketNameEnv = process.env.S3_BUCKETNAME || 'codepush-local-bucket';
      // Use version code as the filename base and remove it from the path
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

      try {
        const repo = new BuildRepository();
        const now = new Date();
        const id = shortid.generate();
        await repo.create({
          id,
          tenant_id: tenantId,
          created_at: now,
          updated_at: now,
          artifact_version_code: artifactVersionCode,
          artifact_version_name: artifactVersionName,
          artifact_path: s3Uri,
          release_id: releaseId,
          platform: normalizedPlatform,
          storeType: storeTypeValue,
          regression_id: null,
          ci_run_id: null,
          build_upload_status: BUILD_UPLOAD_STATUS.UPLOADED,
          build_type: BUILD_TYPE.MANUAL,
          queue_location: null,
          queue_status: null,
          ci_run_type: null
        });
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
        .json(errorResponse(err, 'Unexpected error during build upload'));
    }
  };


