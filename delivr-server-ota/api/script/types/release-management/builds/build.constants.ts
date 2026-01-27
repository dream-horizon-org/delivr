/**
 * Build Constants - Single Source of Truth
 * 
 * All build-related enums, types, and arrays are defined here.
 * Import from this file in controllers, services, models, etc.
 */

// ============================================================================
// BUILD ENUMS
// ============================================================================

/**
 * Supported platforms for builds
 */
export const BUILD_PLATFORM = {
  ANDROID: 'ANDROID',
  IOS: 'IOS',
  WEB: 'WEB'
} as const;

export const BUILD_PLATFORMS = Object.values(BUILD_PLATFORM);
export type BuildPlatform = typeof BUILD_PLATFORM[keyof typeof BUILD_PLATFORM];

/**
 * Build stages in the release lifecycle
 */
export const BUILD_STAGE = {
  KICKOFF: 'KICKOFF',
  REGRESSION: 'REGRESSION',
  PRE_RELEASE: 'PRE_RELEASE'
} as const;

export const BUILD_STAGES = Object.values(BUILD_STAGE);
export type BuildStage = typeof BUILD_STAGE[keyof typeof BUILD_STAGE];

/**
 * Supported store types for builds
 */
export const STORE_TYPE = {
  APP_STORE: 'APP_STORE',
  PLAY_STORE: 'PLAY_STORE',
  TESTFLIGHT: 'TESTFLIGHT',
  MICROSOFT_STORE: 'MICROSOFT_STORE',
  FIREBASE: 'FIREBASE',
  WEB: 'WEB'
} as const;

export const STORE_TYPES = Object.values(STORE_TYPE);
export type StoreType = typeof STORE_TYPE[keyof typeof STORE_TYPE];

/**
 * Build type (manual vs CI/CD)
 */
export const BUILD_TYPE = {
  MANUAL: 'MANUAL',
  CI_CD: 'CI_CD'
} as const;

export const BUILD_TYPES = Object.values(BUILD_TYPE);
export type BuildType = typeof BUILD_TYPE[keyof typeof BUILD_TYPE];

/**
 * Build upload status
 */
export const BUILD_UPLOAD_STATUS = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
  FAILED: 'FAILED'
} as const;

export const BUILD_UPLOAD_STATUSES = Object.values(BUILD_UPLOAD_STATUS);
export type BuildUploadStatus = typeof BUILD_UPLOAD_STATUS[keyof typeof BUILD_UPLOAD_STATUS];

/**
 * Workflow status for CI/CD builds
 */
export const WORKFLOW_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const;

export const WORKFLOW_STATUSES = Object.values(WORKFLOW_STATUS);
export type WorkflowStatus = typeof WORKFLOW_STATUS[keyof typeof WORKFLOW_STATUS];

/**
 * CI/CD provider types
 */
export const CI_RUN_TYPE = {
  JENKINS: 'JENKINS',
  GITHUB_ACTIONS: 'GITHUB_ACTIONS',
  GITLAB_CI: 'GITLAB_CI',
  CIRCLE_CI: 'CIRCLE_CI',
} as const;

export const CI_RUN_TYPES = Object.values(CI_RUN_TYPE);
export type CiRunType = typeof CI_RUN_TYPE[keyof typeof CI_RUN_TYPE];

// ============================================================================
// ERROR & SUCCESS MESSAGES
// ============================================================================

export const BUILD_ERROR_MESSAGES = {
  ARTIFACT_REQUIRED: 'Build upload failed: artifact file is required',
  INVALID_TENANT_ID: 'Build upload failed: appId is required',
  INVALID_RELEASE_ID: 'Build upload failed: releaseId is required',
  INVALID_VERSION_NAME: 'Build upload failed: artifact_version_name is required',
  INVALID_VERSION_CODE: 'Build upload failed: artifact_version_code is required',
  INVALID_PLATFORM: `Build upload failed: platform must be one of: ${BUILD_PLATFORMS.join(', ')}`,
  INVALID_STORE_TYPE: `Build upload failed: storeType must be one of: ${STORE_TYPES.join(', ')}`,
  INVALID_BUILD_STAGE: `Build upload failed: buildStage must be one of: ${BUILD_STAGES.join(', ')}`,
  S3_UPLOAD_FAILED: 'Build upload failed: could not upload artifact to storage',
  DB_SAVE_FAILED: 'Build upload failed: could not save build record'
} as const;

export const BUILD_SUCCESS_MESSAGES = {
  UPLOAD_COMPLETED: 'Build uploaded successfully'
} as const;

