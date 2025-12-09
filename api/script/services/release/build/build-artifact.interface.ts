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
} from '~controllers/release-management/builds/build.constants';

// Import types for use in this file
import type {
  BuildPlatform,
  BuildStage,
  StoreType,
  BuildType,
  BuildUploadStatus,
  WorkflowStatus
} from '~controllers/release-management/builds/build.constants';

/**
 * Input for uploading an artifact to an existing build (CI/CD flow)
 */
export type UploadBuildArtifactInput = {
  ciRunId: string;
  artifactBuffer: Buffer;
  originalFilename: string;
};

/**
 * Input for creating a new build with artifact (manual upload flow)
 * Note: storeType is optional (can be null for regression builds)
 */
export type CreateManualBuildInput = {
  tenantId: string;
  releaseId: string;
  artifactVersionName: string;
  artifactVersionCode: string;
  platform: BuildPlatform;
  storeType?: StoreType | null;
  buildStage: BuildStage;
  artifactBuffer: Buffer;
  originalFilename: string;
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
  artifactVersionCode: string;
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
