import type { Storage } from '../../../storage/storage';
import { S3Storage } from '../../../storage/aws-storage';
import { BuildRepository } from '~models/build/build.repository';
import { buildArtifactS3Key, buildS3Uri, deriveStandardArtifactFilename, parseS3Uri } from '~utils/s3-path.utils';
import { uploadToS3, inferContentType, generatePresignedGetUrl } from '~utils/s3-upload.utils';
import {
  BUILD_UPLOAD_STATUS,
  BUILD_TYPE
} from '~types/release-management/builds';
import * as shortid from 'shortid';
import {
  BUILD_ARTIFACT_ERROR_CODE,
  BUILD_ARTIFACT_ERROR_MESSAGES,
  BUILD_ARTIFACT_DEFAULTS
} from './build-artifact.constants';
import {
  type UploadBuildArtifactInput,
  type UploadBuildArtifactResult,
  type CreateManualBuildInput,
  type ListBuildArtifactsInput,
  type BuildArtifactItem,
  BuildArtifactError
} from './build-artifact.interface';
import { executeOperation } from './build-artifact.utils';

/**
 * Service for handling build artifact operations.
 * This can be invoked directly by other services without going through HTTP.
 */
export class BuildArtifactService {
  private readonly storage: Storage;
  private readonly buildRepository: BuildRepository;

  constructor(storage: Storage) {
    this.storage = storage;
    const isS3Storage = storage instanceof S3Storage;
    if (!isS3Storage) {
      throw new Error('BuildArtifactService requires S3Storage');
    }
    this.buildRepository = (storage as S3Storage).buildRepository;
  }

  /**
   * Upload an artifact for an existing build identified by ciRunId (CI/CD flow).
   *
   * Steps:
   * 1. Find build by ciRunId
   * 2. Upload artifact to S3
   * 3. Update build record with artifact path
   *
   * @param input - The artifact upload input (ciRunId, buffer, filename)
   * @returns The upload result with download URL and S3 URI
   * @throws BuildArtifactError if any step fails
   */
  uploadArtifactForCiBuild = async (input: UploadBuildArtifactInput): Promise<UploadBuildArtifactResult> => {
    const { ciRunId, artifactBuffer, originalFilename } = input;

    // Step 1: Find build by ciRunId
    const build = await executeOperation(
      () => this.buildRepository.findByCiRunId(ciRunId),
      BUILD_ARTIFACT_ERROR_CODE.DB_QUERY_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.DB_QUERY_FAILED
    );

    const buildNotFound = !build;
    if (buildNotFound) {
      throw new BuildArtifactError(
        BUILD_ARTIFACT_ERROR_CODE.BUILD_NOT_FOUND,
        BUILD_ARTIFACT_ERROR_MESSAGES.BUILD_NOT_FOUND
      );
    }

    // Step 2: Upload artifact to S3
    const uploadResult = await this.uploadArtifactToS3({
      tenantId: build.tenantId,
      releaseId: build.releaseId,
      platform: build.platform,
      artifactVersionName: build.artifactVersionName,
      artifactVersionCode: build.artifactVersionCode,
      artifactBuffer,
      originalFilename
    });

    // Step 3: Update build record with artifact path
    await executeOperation(
      () => this.buildRepository.updateArtifactPath(build.id, uploadResult.s3Uri),
      BUILD_ARTIFACT_ERROR_CODE.DB_UPDATE_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.DB_UPDATE_FAILED
    );

    return {
      downloadUrl: uploadResult.downloadUrl,
      s3Uri: uploadResult.s3Uri,
      buildId: build.id
    };
  };

  /**
   * Create a new build with artifact (manual upload flow).
   *
   * Steps:
   * 1. Upload artifact to S3
   * 2. Create build record in database
   *
   * @param input - The manual build creation input
   * @returns The upload result with download URL and S3 URI
   * @throws BuildArtifactError if any step fails
   */
  createManualBuild = async (input: CreateManualBuildInput): Promise<UploadBuildArtifactResult> => {
    const {
      tenantId,
      releaseId,
      artifactVersionName,
      artifactVersionCode,
      platform,
      storeType,
      buildStage,
      artifactBuffer,
      originalFilename
    } = input;

    // Step 1: Upload artifact to S3
    const uploadResult = await this.uploadArtifactToS3({
      tenantId,
      releaseId,
      platform,
      artifactVersionName,
      artifactVersionCode,
      artifactBuffer,
      originalFilename
    });

    // Step 2: Create build record
    const buildId = shortid.generate();
    const now = new Date();

    await executeOperation(
      () => this.buildRepository.create({
        id: buildId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        artifactVersionCode,
        artifactVersionName,
        artifactPath: uploadResult.s3Uri,
        releaseId,
        platform,
        storeType,
        buildStage,
        regressionId: null,
        ciRunId: null,
        buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED,
        buildType: BUILD_TYPE.MANUAL,
        queueLocation: null,
        workflowStatus: null,
        ciRunType: null,
        taskId: null,
        internalTrackLink: null,
        testflightNumber: null
      }),
      BUILD_ARTIFACT_ERROR_CODE.DB_CREATE_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.DB_CREATE_FAILED
    );

    return {
      downloadUrl: uploadResult.downloadUrl,
      s3Uri: uploadResult.s3Uri,
      buildId
    };
  };

  /**
   * List build artifacts with presigned download URLs.
   *
   * Steps:
   * 1. Query builds from database
   * 2. Generate presigned URLs for each artifact
   *
   * @param input - Filter criteria for listing builds (tenantId and releaseId required, rest optional)
   * @returns Array of build artifacts with download URLs
   * @throws BuildArtifactError if query fails
   */
  listBuildArtifacts = async (input: ListBuildArtifactsInput): Promise<BuildArtifactItem[]> => {
    const {
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
    } = input;

    // Step 1: Query builds from database
    const builds = await executeOperation(
      () => this.buildRepository.findBuilds({
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
      }),
      BUILD_ARTIFACT_ERROR_CODE.DB_QUERY_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.DB_QUERY_FAILED
    );

    // Step 2: Generate presigned URLs for each artifact
    const results: BuildArtifactItem[] = [];
    for (const build of builds) {
      const artifactPath = build.artifactPath ?? null;
      let downloadUrl: string | null = null;

      const hasArtifactPath = artifactPath !== null && artifactPath.length > 0;
      if (hasArtifactPath) {
        // Presigned URL generation failure is non-fatal for list operation
        try {
          downloadUrl = await this.generatePresignedUrl(artifactPath);
        } catch {
          // Skip invalid URIs - downloadUrl remains null
        }
      }

      const buildItem: BuildArtifactItem = {
        id: build.id,
        artifactPath,
        downloadUrl,
        artifactVersionName: build.artifactVersionName,
        artifactVersionCode: build.artifactVersionCode,
        releaseId: build.releaseId,
        platform: build.platform as 'ANDROID' | 'IOS',
        storeType: (build.storeType as 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE') ?? null,
        buildStage: build.buildStage as 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE',
        buildType: build.buildType as 'MANUAL' | 'CI_CD',
        buildUploadStatus: build.buildUploadStatus as 'PENDING' | 'UPLOADED' | 'FAILED',
        workflowStatus: (build.workflowStatus as 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED') ?? null,
        regressionId: build.regressionId ?? null,
        ciRunId: build.ciRunId ?? null,
        createdAt: build.createdAt,
        updatedAt: build.updatedAt
      };
      results.push(buildItem);
    }

    return results;
  };

  /**
   * Generate a presigned URL for an S3 URI.
   * Useful for other services that need to generate download URLs.
   *
   * @param s3Uri - The S3 URI (s3://bucket/key format)
   * @param expiresSeconds - URL expiration time in seconds (default: 3600)
   * @returns Presigned download URL
   * @throws BuildArtifactError if URL generation fails
   */
  generatePresignedUrl = async (s3Uri: string, expiresSeconds?: number): Promise<string> => {
    const expires = expiresSeconds ?? BUILD_ARTIFACT_DEFAULTS.PRESIGNED_URL_EXPIRES_SECONDS;
    const { bucket, key } = parseS3Uri(s3Uri);

    return executeOperation(
      async () => {
        const isS3Storage = this.storage instanceof S3Storage;
        if (isS3Storage) {
          return (this.storage as S3Storage).getSignedObjectUrl(key, expires);
        }
        return generatePresignedGetUrl({
          bucketName: bucket,
          key,
          expiresSeconds: expires
        });
      },
      BUILD_ARTIFACT_ERROR_CODE.PRESIGNED_URL_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.PRESIGNED_URL_FAILED
    );
  };

  /**
   * Internal helper to upload artifact to S3 and generate presigned URL.
   *
   * Steps:
   * 1. Generate S3 key from metadata
   * 2. Upload buffer to S3
   * 3. Generate presigned download URL
   *
   * @throws BuildArtifactError if upload or URL generation fails
   */
  private uploadArtifactToS3 = async (params: {
    tenantId: string;
    releaseId: string;
    platform: string;
    artifactVersionName: string;
    artifactVersionCode: string;
    artifactBuffer: Buffer;
    originalFilename: string;
  }): Promise<{ s3Uri: string; downloadUrl: string }> => {
    const {
      tenantId,
      releaseId,
      platform,
      artifactVersionName,
      artifactVersionCode,
      artifactBuffer,
      originalFilename
    } = params;

    // Step 1: Generate S3 key from metadata
    const fileName = deriveStandardArtifactFilename(originalFilename, artifactVersionCode);
    const s3Key = buildArtifactS3Key(
      { tenantId, releaseId, platform, artifactVersionName },
      fileName
    );
    const contentType = inferContentType(fileName);
    const bucketName = this.getBucketName();

    // Step 2: Upload buffer to S3
    await executeOperation(
      async () => {
        const isS3Storage = this.storage instanceof S3Storage;
        if (isS3Storage) {
          await (this.storage as S3Storage).uploadBufferToS3(s3Key, artifactBuffer, contentType);
        } else {
          await uploadToS3({
            bucketName,
            key: s3Key,
            body: artifactBuffer,
            contentType
          });
        }
      },
      BUILD_ARTIFACT_ERROR_CODE.S3_UPLOAD_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.S3_UPLOAD_FAILED
    );

    // Step 3: Generate presigned download URL
    const s3Uri = buildS3Uri(bucketName, s3Key);
    const downloadUrl = await executeOperation(
      async () => {
        const isS3Storage = this.storage instanceof S3Storage;
        if (isS3Storage) {
          return (this.storage as S3Storage).getSignedObjectUrl(
            s3Key,
            BUILD_ARTIFACT_DEFAULTS.PRESIGNED_URL_EXPIRES_SECONDS
          );
        }
        return generatePresignedGetUrl({
          bucketName,
          key: s3Key,
          expiresSeconds: BUILD_ARTIFACT_DEFAULTS.PRESIGNED_URL_EXPIRES_SECONDS
        });
      },
      BUILD_ARTIFACT_ERROR_CODE.PRESIGNED_URL_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.PRESIGNED_URL_FAILED
    );

    return { s3Uri, downloadUrl };
  };

  /**
   * Get the S3 bucket name from storage or environment.
   */
  private getBucketName = (): string => {
    const isS3Storage = this.storage instanceof S3Storage;
    if (isS3Storage) {
      return (this.storage as S3Storage).getS3BucketName();
    }
    return process.env.S3_BUCKETNAME ?? BUILD_ARTIFACT_DEFAULTS.BUCKET_NAME;
  };
}
