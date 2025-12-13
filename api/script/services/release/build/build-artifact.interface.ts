/**
 * Types for build artifact service operations
 */

import { BUILD_ARTIFACT_ERROR_CODE } from './build-artifact.constants';

// Re-export types from single source of truth
export type {
  BuildPlatform,
  BuildStage,
  StoreType,
  BuildType,
  BuildUploadStatus,
  WorkflowStatus
} from '~types/release-management/builds';

// Import types for use in this file
import type {
  BuildPlatform,
  BuildStage,
  StoreType,
  BuildType,
  BuildUploadStatus,
  WorkflowStatus
} from '~types/release-management/builds';

/**
 * Input for uploading an artifact to an existing build (CI/CD flow)
 *
 * For AAB builds:
 * - CI provides buildNumber (versionCode) after uploading to Play Store
 * - System generates internalTrackLink using: https://play.google.com/apps/test/{packageName}/{versionCode}
 * - packageName is fetched from store_integrations table using tenantId
 */
export type UploadBuildArtifactInput = {
  ciRunId: string;
  artifactBuffer: Buffer;
  originalFilename: string;
  /** Optional: Build number / versionCode from Play Store (for AAB builds) */
  buildNumber?: string | null;
};

/**
 * Input for creating a new build with artifact (manual upload flow)
 * Note: storeType is optional (can be null for regression builds)
 *
 * For AAB builds:
 * - If internalTrackLink is provided, it will be saved directly
 * - If not provided, the system will upload to internal track automatically
 */
export type CreateManualBuildInput = {
  tenantId: string;
  releaseId: string;
  artifactVersionName: string;
  buildNumber?: string | null;
  platform: BuildPlatform;
  storeType?: StoreType | null;
  buildStage: BuildStage;
  artifactBuffer: Buffer;
  originalFilename: string;
  /** Optional: Play Store internal track link (if already uploaded) */
  internalTrackLink?: string | null;
};

/**
 * Input for listing build artifacts (tenantId and releaseId required, rest optional)
 */
export type ListBuildArtifactsInput = {
  tenantId: string;
  releaseId: string;
  platform?: BuildPlatform | null;
  buildStage?: BuildStage | null;
  storeType?: StoreType | null;
  buildType?: BuildType | null;
  regressionId?: string | null;
  taskId?: string | null;
  workflowStatus?: WorkflowStatus | null;
  buildUploadStatus?: BuildUploadStatus | null;
};

/**
 * Result of a successful artifact upload (both CI and manual)
 */
export type UploadBuildArtifactResult = {
  downloadUrl: string;
  s3Uri: string;
  buildId: string;
};

/**
 * Build item with download URL for listing
 */
export type BuildArtifactItem = {
  id: string;
  artifactPath: string | null;
  downloadUrl: string | null;
  artifactVersionName: string;
  buildNumber: string | null;
  releaseId: string;
  platform: BuildPlatform;
  storeType: StoreType | null;
  buildStage: BuildStage;
  buildType: BuildType;
  buildUploadStatus: BuildUploadStatus;
  workflowStatus: WorkflowStatus | null;
  regressionId: string | null;
  ciRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Error code type derived from constants
 */
export type BuildArtifactErrorCode = typeof BUILD_ARTIFACT_ERROR_CODE[keyof typeof BUILD_ARTIFACT_ERROR_CODE];

/**
 * Custom error for build artifact operation failures
 */
export class BuildArtifactError extends Error {
  public readonly code: BuildArtifactErrorCode;

  constructor(code: BuildArtifactErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'BuildArtifactError';
  }
}

/**
 * Input for store distribution service (upload to internal track)
 */
export type StoreDistributionInput = {
  artifactBuffer: Buffer;
  artifactVersionName: string;
};

/**
 * Result from store distribution service
 */
export type StoreDistributionResult = {
  internalTrackLink: string;
  buildNumber: string;  // artifactVersionCode from Play Store
};

/**
 * Input for updating internal track info in builds table
 */
export type UpdateInternalTrackInfoInput = {
  buildId: string;
  internalTrackLink: string;
  buildNumber: string;
};

/**
 * Input for manual TestFlight verification (user without CI/CD).
 * Creates a new build record after verification.
 */
export type ManualTestflightVerifyInput = {
  tenantId: string;
  releaseId: string;
  testflightNumber: string;
  versionName: string;
  buildStage: BuildStage;
};

/**
 * Input for CI/CD TestFlight verification.
 * Updates existing build record by ciRunId.
 */
export type CiTestflightVerifyInput = {
  ciRunId: string;
  testflightNumber: string;
};

/**
 * Result of TestFlight verification (both manual and CI/CD flows)
 */
export type TestflightVerifyResult = {
  buildId: string;
  releaseId: string;
  platform: 'IOS';
  testflightNumber: string;
  versionName: string;
  verified: boolean;
  buildUploadStatus: BuildUploadStatus;
  createdAt: Date;
};

/**
 * Input for staging artifact upload (manual upload flow).
 * Used to upload artifacts to S3 staging area before build record is created.
 * Does NOT create a build record - that happens when TaskExecutor consumes the upload.
 */
export type UploadStagingArtifactInput = {
  tenantId: string;
  releaseId: string;
  platform: string;
  stage: string;  // KICK_OFF | REGRESSION | PRE_RELEASE
  artifactBuffer: Buffer;
  originalFilename: string;  // Required to preserve file extension (.ipa, .apk, .aab)
};

/**
 * Result of staging artifact upload
 */
export type UploadStagingArtifactResult = {
  s3Uri: string;      // Full S3 URI for storage in release_uploads table
  uploadId: string;   // Generated ID for tracking/debugging
  downloadUrl: string; // Presigned URL for immediate download
};
