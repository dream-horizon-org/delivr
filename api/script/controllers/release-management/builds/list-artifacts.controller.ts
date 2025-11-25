import { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, validationErrorResponse, errorResponse } from '~utils/response.utils';
import { BUILD_UPLOAD_ERROR_MESSAGES } from './build.constants';
import { BuildRepository } from '~models/build/build.repository';
import { S3Storage } from '../../../storage/aws-storage';
import { parseS3Uri } from '~utils/s3-path.utils';
import { generatePresignedGetUrl } from '~utils/s3-upload.utils';

export const createListBuildArtifactsHandler = (storage: unknown) => async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.tenantId;
    const releaseId = req.params.releaseId;
    const platformRaw = req.query.platform;

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

    const platformMissing = platformRaw === undefined || platformRaw === null;
    const platformNotString = typeof platformRaw !== 'string';
    const platformValue = !platformMissing && !platformNotString ? (platformRaw as string).trim().toUpperCase() : '';
    const platformInvalid = platformMissing || platformNotString || (platformValue !== 'ANDROID' && platformValue !== 'IOS');
    if (platformInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('platform', BUILD_UPLOAD_ERROR_MESSAGES.INVALID_PLATFORM)
      );
      return;
    }

    const repo = new BuildRepository();
    const artifactPaths = await repo.findArtifactPaths({
      tenantId,
      releaseId,
      platform: platformValue as 'ANDROID' | 'IOS'
    });

    const urls: string[] = [];
    for (const uri of artifactPaths) {
      try {
        const { bucket, key } = parseS3Uri(uri);
        if (storage instanceof S3Storage) {
          const signed = await storage.getSignedObjectUrl(key, 3600);
          urls.push(signed);
        } else {
          const signed = await generatePresignedGetUrl({ bucketName: bucket, key, expiresSeconds: 3600 });
          urls.push(signed);
        }
      } catch {
        // Skip invalid URIs
      }
    }

    res.status(HTTP_STATUS.OK).json(successResponse<string[]>(urls));
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse(err, 'Failed to list build artifacts'));
  }
};


