import { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, validationErrorResponse, errorResponse } from '~utils/response.utils';
import { BUILD_UPLOAD_ERROR_MESSAGES } from './build.constants';
import { BuildRepository } from '~models/build/build.repository';
import { S3Storage } from '../../../storage/aws-storage';
import { parseS3Uri } from '~utils/s3-path.utils';
import { generatePresignedGetUrl } from '~utils/s3-upload.utils';
import { getOptionalTrimmedString } from '~utils/request.utils';
import type { BuildListItem } from '~types/release-management/builds/build.interface';
 

export const createListBuildArtifactsHandler = (storage: unknown) => async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.tenantId;
    const releaseId = req.params.releaseId;
    const platformRaw = req.query.platform;
    const regressionIdRaw = req.query.regression_id;

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

    const repo = (storage as S3Storage).buildRepository;
    const regressionId = getOptionalTrimmedString(regressionIdRaw);
    const builds = await repo.findBuilds({
      tenantId,
      releaseId,
      platform: platformValue as 'ANDROID' | 'IOS',
      regressionId
    });

    const results: BuildListItem[] = [];
    for (const build of builds) {
      const uri = build.artifact_path ?? '';
      let downloadUrl: string | null = null;
      try {
        const { bucket, key } = parseS3Uri(uri);
        if (storage instanceof S3Storage) {
          downloadUrl = await storage.getSignedObjectUrl(key, 3600);
        } else {
          downloadUrl = await generatePresignedGetUrl({ bucketName: bucket, key, expiresSeconds: 3600 });
        }
      } catch {
        // Skip invalid URIs
      }
      const buildResponse: BuildListItem = {
        id: build.id,
        artifactPath: build.artifact_path,
        downloadUrl,
        artifactVersionName: build.artifact_version_name,
        artifactVersionCode: build.artifact_version_code,
        releaseId: build.release_id,
        platform: build.platform as 'ANDROID' | 'IOS',
        storeType: build.storeType as 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE',
        regressionId: build.regression_id ?? null,
        ciRunId: build.ci_run_id ?? null,
        createdAt: build.created_at,
        updatedAt: build.updated_at
      };
      results.push(buildResponse);
    }

    res.status(HTTP_STATUS.OK).json(successResponse(results));
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse(err, 'Failed to list build artifacts'));
  }
};


