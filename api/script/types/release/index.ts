/**
 * Release Management Type Exports
 */

export type {
  StorageWithSequelize,
  AuthenticatedRequest,
  ApiResponse,
  PlatformTargetVersion,
  ReleaseWithPlatformTargets,
  CreateReleasePayload,
  CreateReleaseResult,
  CreateReleaseRequestBody,
  UpdateReleaseRequestBody,
  RegressionBuildSlot,
  CronJobResponse,
  ReleaseTaskResponse,
  BuildInfoResponse,
  ReleaseResponseBody,
  ReleaseListResponseBody,
  SingleReleaseResponseBody
} from './release.interface';

export { hasSequelize } from './release.interface';

// Release Version Types
export type {
  ReleaseType,
  VersionValidationResult,
  NextVersionSuggestions,
  NextVersionsResult,
  Platform,
  Target
} from './release-version.interface';

