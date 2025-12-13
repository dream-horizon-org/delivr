import type { Storage } from '../../../storage/storage';
import { S3Storage } from '../../../storage/aws-storage';
import { BuildRepository } from '~models/release/build.repository';
import { buildArtifactS3Key, buildS3Uri, deriveStandardArtifactFilename, parseS3Uri } from '~utils/s3-path.utils';
import { uploadToS3, inferContentType, generatePresignedGetUrl } from '~utils/s3-upload.utils';
import {
  BUILD_UPLOAD_STATUS,
  BUILD_TYPE,
  BuildPlatform,
  StoreType,
  BuildStage,
  BuildType,
  BuildUploadStatus,
  WorkflowStatus
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
  type StoreDistributionResult,
  type ManualTestflightVerifyInput,
  type CiTestflightVerifyInput,
  type TestflightVerifyResult,
  type UploadStagingArtifactInput,
  type UploadStagingArtifactResult,
  BuildArtifactError
} from './build-artifact.interface';
import { executeOperation, isAabFile, generateInternalTrackLink } from './build-artifact.utils';
import { StoreType as PlayStoreType } from '../../../storage/integrations/store/store-types';
import { StoreDistributionService } from './store-distribution.service';
import { TestFlightBuildVerificationService } from '../testflight-build-verification.service';

/**
 * Service for handling build artifact operations.
 * This can be invoked directly by other services without going through HTTP.
 */
export class BuildArtifactService {
  private readonly storage: Storage;
  private readonly buildRepository: BuildRepository;
  private readonly storeDistributionService: StoreDistributionService;
  private readonly testflightVerificationService: TestFlightBuildVerificationService;

  constructor(storage: Storage) {
    this.storage = storage;
    const isS3Storage = storage instanceof S3Storage;
    if (!isS3Storage) {
      throw new Error('BuildArtifactService requires S3Storage');
    }
    const s3Storage = storage as S3Storage;
    this.buildRepository = s3Storage.buildRepository;
    this.storeDistributionService = new StoreDistributionService();
    this.testflightVerificationService = new TestFlightBuildVerificationService(
      s3Storage.storeIntegrationController,
      s3Storage.storeCredentialController
    );
  }

  /**
   * Upload an artifact for an existing build identified by ciRunId (CI/CD flow).
   *
   * Steps:
   * 1. Find build by ciRunId
   * 2. Upload artifact to S3
   * 3. Update build record with artifact path
   * 4. Handle AAB internal track:
   *    - If buildNumber provided, generate internalTrackLink using packageName from store_integrations
   *    - If not provided, distribute to internal track automatically
   *
   * @param input - The artifact upload input (ciRunId, buffer, filename, optional buildNumber)
   * @returns The upload result with download URL and S3 URI
   * @throws BuildArtifactError if any step fails
   */
  uploadArtifactForCiBuild = async (input: UploadBuildArtifactInput): Promise<UploadBuildArtifactResult> => {
    const { ciRunId, artifactBuffer, originalFilename, buildNumber } = input;

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
      buildId: build.id,
      artifactBuffer,
      originalFilename
    });

    // Step 3: Update build record with artifact path AND upload status
    await executeOperation(
      () => this.buildRepository.update(build.id, {
        artifactPath: uploadResult.s3Uri,
        buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED
      }),
      BUILD_ARTIFACT_ERROR_CODE.DB_UPDATE_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.DB_UPDATE_FAILED
    );

    // Step 4: Handle AAB internal track (generate link using buildNumber + packageName)
    const isAab = isAabFile(originalFilename);
    if (isAab) {
      await this.handleAabInternalTrackDistribution({
        buildId: build.id,
        tenantId: build.tenantId,
        artifactBuffer,
        artifactVersionName: build.artifactVersionName,
        providedBuildNumber: buildNumber ?? null
      });
    }

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
   * 2. Create build record in database (with internalTrackLink if provided)
   * 3. Handle AAB internal track distribution:
   *    - If internalTrackLink provided in input, it's already saved in step 2
   *    - If not provided, distribute to internal track automatically
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
      buildNumber,
      platform,
      storeType,
      buildStage,
      artifactBuffer,
      originalFilename,
      internalTrackLink
    } = input;

    const buildId = shortid.generate();

    // Step 1: Upload artifact to S3
    const uploadResult = await this.uploadArtifactToS3({
      tenantId,
      releaseId,
      platform,
      artifactVersionName,
      buildId,
      artifactBuffer,
      originalFilename
    });

    // Step 2: Create build record (with internalTrackLink if provided)
    // Note: createdAt/updatedAt are handled automatically by Sequelize (timestamps: true)
    await executeOperation(
      () => this.buildRepository.create({
        id: buildId,
        tenantId,
        buildNumber,
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
        internalTrackLink: internalTrackLink ?? null,
        testflightNumber: null
      }),
      BUILD_ARTIFACT_ERROR_CODE.DB_CREATE_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.DB_CREATE_FAILED
    );

    // Step 3: Handle AAB internal track distribution (only if not already provided)
    const isAab = isAabFile(originalFilename);
    const hasProvidedInternalTrackLink = internalTrackLink !== undefined && internalTrackLink !== null;
    const needsDistribution = isAab && !hasProvidedInternalTrackLink;

    if (needsDistribution) {
      await this.distributeAabToInternalTrack({
        buildId,
        artifactBuffer,
        artifactVersionName
      });
    }

    return {
      downloadUrl: uploadResult.downloadUrl,
      s3Uri: uploadResult.s3Uri,
      buildId
    };
  };

  /**
   * Upload artifact for staging (manual upload flow).
   * Does NOT create a build record - that happens when TaskExecutor consumes the upload.
   * 
   * Path structure: {tenantId}/{releaseId}/{platform}/{stage}/{uploadId}.{ext}
   * 
   * Steps:
   * 1. Generate unique upload ID
   * 2. Extract file extension from original filename
   * 3. Generate S3 key using stage as version segment
   * 4. Upload buffer to S3
   * 5. Generate presigned download URL
   * 
   * @param input - Staging upload input with originalFilename to preserve extension
   * @returns S3 URI, uploadId, and presigned download URL
   * @throws BuildArtifactError if upload fails
   */
  uploadStagingArtifact = async (
    input: UploadStagingArtifactInput
  ): Promise<UploadStagingArtifactResult> => {
    const { tenantId, releaseId, platform, stage, artifactBuffer, originalFilename } = input;

    // Step 1: Generate unique upload ID for this staging artifact
    const uploadId = shortid.generate();

    // Step 2: Extract file extension from original filename (preserves .ipa, .apk, .aab)
    const fileName = deriveStandardArtifactFilename(originalFilename, uploadId);

    // Step 3: Generate S3 key using stage as the version segment for path organization
    // Result: {tenantId}/{releaseId}/{platform}/{KICK_OFF}/{x7k9m2}.ipa
    const s3Key = buildArtifactS3Key(
      { tenantId, releaseId, platform, artifactVersionName: stage },
      fileName
    );

    const bucketName = this.getBucketName();
    const contentType = inferContentType(fileName);

    // Step 4: Upload buffer to S3
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

    // Step 5: Generate presigned download URL
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

    return { s3Uri, uploadId, downloadUrl };
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
        buildNumber: build.buildNumber ?? null,
        releaseId: build.releaseId,
        platform: build.platform as BuildPlatform,
        storeType: (build.storeType as StoreType) ?? null,
        buildStage: build.buildStage as BuildStage,
        buildType: build.buildType as BuildType,
        buildUploadStatus: build.buildUploadStatus as BuildUploadStatus,
        workflowStatus: (build.workflowStatus as WorkflowStatus) ?? null,
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
   * Manual TestFlight verification (for users without CI/CD).
   * User manually uploads build to TestFlight and provides the build number.
   * Creates a new build record after verification.
   *
   * Steps:
   * 1. Verify TestFlight build number exists in App Store Connect
   * 2. Create build record with testflight number
   *
   * @param input - The release ID, testflight number, and version info
   * @returns The verification result with build details
   * @throws BuildArtifactError if verification fails
   */
  verifyManualTestflightBuild = async (
    input: ManualTestflightVerifyInput
  ): Promise<TestflightVerifyResult> => {
    const { tenantId, releaseId, testflightNumber, versionName, buildStage } = input;

    // Step 1: Verify TestFlight build number exists in App Store Connect
    const verificationResult = await executeOperation(
      () => this.testflightVerificationService.verifyBuild({
        releaseId,
        tenantId,
        request: {
          testflightBuildNumber: testflightNumber,
          versionName
        }
      }),
      BUILD_ARTIFACT_ERROR_CODE.TESTFLIGHT_VERIFICATION_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.TESTFLIGHT_VERIFICATION_FAILED
    );

    const verificationFailed = !verificationResult.success;
    if (verificationFailed) {
      const errorMessage = verificationResult.error?.message ?? BUILD_ARTIFACT_ERROR_MESSAGES.TESTFLIGHT_NUMBER_INVALID;
      throw new BuildArtifactError(
        BUILD_ARTIFACT_ERROR_CODE.TESTFLIGHT_NUMBER_INVALID,
        errorMessage
      );
    }

    // Step 2: Create build record with testflight number
    // Note: createdAt/updatedAt are handled automatically by Sequelize (timestamps: true)
    const buildId = shortid.generate();

    await executeOperation(
      () => this.buildRepository.create({
        id: buildId,
        tenantId,
        buildNumber: testflightNumber,
        artifactVersionName: versionName,
        artifactPath: null,
        releaseId,
        platform: 'IOS' as BuildPlatform,
        storeType: 'TESTFLIGHT' as StoreType,
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
        testflightNumber
      }),
      BUILD_ARTIFACT_ERROR_CODE.DB_CREATE_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.DB_CREATE_FAILED
    );

    return {
      buildId,
      releaseId,
      platform: 'IOS',
      testflightNumber,
      versionName,
      verified: true,
      buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED,
      createdAt: new Date()
    };
  };

  /**
   * CI/CD TestFlight verification.
   * CI uploads build to TestFlight and provides ciRunId + testflight number.
   * Updates existing build record after verification.
   *
   * Steps:
   * 1. Find build by ciRunId
   * 2. Verify TestFlight build number exists in App Store Connect
   * 3. Update build record with testflight number
   *
   * @param input - The ciRunId and testflight number
   * @returns The verification result with build details
   * @throws BuildArtifactError if build not found or verification fails
   */
  verifyCiTestflightBuild = async (
    input: CiTestflightVerifyInput
  ): Promise<TestflightVerifyResult> => {
    const { ciRunId, testflightNumber } = input;

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

    // Step 2: Verify TestFlight build number exists in App Store Connect
    const verificationResult = await executeOperation(
      () => this.testflightVerificationService.verifyBuild({
        releaseId: build.releaseId,
        tenantId: build.tenantId,
        request: {
          testflightBuildNumber: testflightNumber,
          versionName: build.artifactVersionName
        }
      }),
      BUILD_ARTIFACT_ERROR_CODE.TESTFLIGHT_VERIFICATION_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.TESTFLIGHT_VERIFICATION_FAILED
    );

    const verificationFailed = !verificationResult.success;
    if (verificationFailed) {
      const errorMessage = verificationResult.error?.message ?? BUILD_ARTIFACT_ERROR_MESSAGES.TESTFLIGHT_NUMBER_INVALID;
      throw new BuildArtifactError(
        BUILD_ARTIFACT_ERROR_CODE.TESTFLIGHT_NUMBER_INVALID,
        errorMessage
      );
    }

    // Step 3: Update build record with testflight number
    await executeOperation(
      () => this.buildRepository.updateTestflightNumber(build.id, testflightNumber),
      BUILD_ARTIFACT_ERROR_CODE.DB_UPDATE_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.DB_UPDATE_FAILED
    );

    return {
      buildId: build.id,
      releaseId: build.releaseId,
      platform: 'IOS',
      testflightNumber,
      versionName: build.artifactVersionName,
      verified: true,
      buildUploadStatus: build.buildUploadStatus as BuildUploadStatus,
      createdAt: build.createdAt
    };
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
    buildId: string;
    artifactBuffer: Buffer;
    originalFilename: string;
  }): Promise<{ s3Uri: string; downloadUrl: string }> => {
    const {
      tenantId,
      releaseId,
      platform,
      artifactVersionName,
      buildId,
      artifactBuffer,
      originalFilename
    } = params;

    // Step 1: Generate S3 key from metadata
    const fileName = deriveStandardArtifactFilename(originalFilename, buildId);
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
   * Handle AAB internal track distribution with conditional logic.
   *
   * - If buildNumber is provided by CI, generate internalTrackLink using packageName from store_integrations
   * - If not provided, call store distribution service to upload automatically
   *
   * internalTrackLink format: https://play.google.com/apps/test/{packageName}/{versionCode}
   *
   * @param params - Build ID, tenantId, artifact buffer, version name, and optional buildNumber
   * @throws BuildArtifactError if distribution or update fails
   */
  private handleAabInternalTrackDistribution = async (params: {
    buildId: string;
    tenantId: string;
    artifactBuffer: Buffer;
    artifactVersionName: string;
    providedBuildNumber: string | null;
  }): Promise<void> => {
    const {
      buildId,
      tenantId,
      artifactBuffer,
      artifactVersionName,
      providedBuildNumber
    } = params;

    const hasProvidedBuildNumber = providedBuildNumber !== null;

    if (hasProvidedBuildNumber) {
      // CI already uploaded to Play Store - get packageName from store_integrations and generate link
      const packageName = await this.getPlayStorePackageName(tenantId);
      const internalTrackLink = generateInternalTrackLink(packageName, providedBuildNumber);

      await executeOperation(
        () => this.buildRepository.updateInternalTrackInfo(
          buildId,
          internalTrackLink,
          providedBuildNumber
        ),
        BUILD_ARTIFACT_ERROR_CODE.DB_UPDATE_FAILED,
        BUILD_ARTIFACT_ERROR_MESSAGES.DB_UPDATE_FAILED
      );
    } else {
      // Need to upload to internal track ourselves (buildNumber comes from Play Store response)
      await this.distributeAabToInternalTrack({
        buildId,
        artifactBuffer,
        artifactVersionName
      });
    }
  };

  /**
   * Get Play Store package name (appIdentifier) from store_integrations table.
   *
   * @param tenantId - The tenant ID
   * @returns The package name (appIdentifier)
   * @throws BuildArtifactError if Play Store integration not found
   */
  private getPlayStorePackageName = async (tenantId: string): Promise<string> => {
    const isS3Storage = this.storage instanceof S3Storage;
    if (!isS3Storage) {
      throw new BuildArtifactError(
        BUILD_ARTIFACT_ERROR_CODE.PLAY_STORE_INTEGRATION_NOT_FOUND,
        BUILD_ARTIFACT_ERROR_MESSAGES.PLAY_STORE_INTEGRATION_NOT_FOUND
      );
    }

    const s3Storage = this.storage as S3Storage;
    const integrations = await s3Storage.storeIntegrationController.findAll({
      tenantId,
      storeType: PlayStoreType.PLAY_STORE
    });

    const hasIntegration = integrations.length > 0;
    if (!hasIntegration) {
      throw new BuildArtifactError(
        BUILD_ARTIFACT_ERROR_CODE.PLAY_STORE_INTEGRATION_NOT_FOUND,
        BUILD_ARTIFACT_ERROR_MESSAGES.PLAY_STORE_INTEGRATION_NOT_FOUND
      );
    }

    // Use the first Play Store integration's appIdentifier as packageName
    return integrations[0].appIdentifier;
  };

  /**
   * Distribute an AAB artifact to Play Store internal track.
   *
   * Steps:
   * 1. Call store distribution service to upload to internal track
   * 2. Update build record with internal track link and build number
   *
   * @param params - Build ID, artifact buffer, and version name
   * @throws BuildArtifactError if distribution or update fails
   */
  private distributeAabToInternalTrack = async (params: {
    buildId: string;
    artifactBuffer: Buffer;
    artifactVersionName: string;
  }): Promise<void> => {
    const { buildId, artifactBuffer, artifactVersionName } = params;

    // Step 1: Call store distribution service to upload to internal track
    const distributionResult: StoreDistributionResult = await executeOperation(
      () => this.storeDistributionService.uploadToInternalTrack({
        artifactBuffer,
        artifactVersionName
      }),
      BUILD_ARTIFACT_ERROR_CODE.STORE_DISTRIBUTION_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.STORE_DISTRIBUTION_FAILED
    );

    // Step 2: Update build record with internal track link and build number
    await executeOperation(
      () => this.buildRepository.updateInternalTrackInfo(
        buildId,
        distributionResult.internalTrackLink,
        distributionResult.buildNumber
      ),
      BUILD_ARTIFACT_ERROR_CODE.DB_UPDATE_FAILED,
      BUILD_ARTIFACT_ERROR_MESSAGES.DB_UPDATE_FAILED
    );
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
