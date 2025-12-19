/**
 * Distribution Types & Constants Exports
 * Explicit named exports for distribution-related types, interfaces, and constants
 */

// ============================================================================
// SUBMISSION TYPES & CONSTANTS (Shared + Platform-Specific)
// ============================================================================

export {
  SUBMISSION_STATUS,
  SUBMISSION_STATUSES,
  ANDROID_SUBMISSION_STATUS,
  ANDROID_SUBMISSION_STATUSES,
  BUILD_TYPE,
  BUILD_TYPES,
  IOS_RELEASE_TYPE,
  SUBMISSION_PLATFORM,
  SUBMISSION_PLATFORMS,
  SUBMISSION_ACTION,
  SUBMISSION_ACTIONS,
  SUBMISSION_ERROR_MESSAGES,
  SUBMISSION_SUCCESS_MESSAGES,
  IOS_SUBMISSION_ERROR_MESSAGES,
  IOS_SUBMISSION_SUCCESS_MESSAGES,
  ANDROID_SUBMISSION_ERROR_MESSAGES,
  ANDROID_SUBMISSION_SUCCESS_MESSAGES,
  SUBMISSION_ACTION_HISTORY_ERROR_MESSAGES,
  SUBMISSION_ACTION_HISTORY_SUCCESS_MESSAGES
} from './submission.constants';

export type {
  SubmissionStatus,
  AndroidSubmissionStatus,
  BuildType,
  IosReleaseType,
  SubmissionPlatform,
  SubmissionAction
} from './submission.constants';

// ============================================================================
// DISTRIBUTION TYPES
// ============================================================================

export type {
  Distribution,
  CreateDistributionDto,
  UpdateDistributionDto,
  DistributionFilters
} from './distribution.interface';

export {
  DISTRIBUTION_STATUS,
  DISTRIBUTION_STATUSES,
  DISTRIBUTION_PLATFORM,
  DISTRIBUTION_PLATFORMS,
  DISTRIBUTION_STORE_TYPE,
  DISTRIBUTION_STORE_TYPES,
  DISTRIBUTION_ERROR_MESSAGES,
  DISTRIBUTION_SUCCESS_MESSAGES
} from './distribution.constants';

export type {
  DistributionStatus,
  DistributionPlatform,
  DistributionStoreType
} from './distribution.constants';

// ============================================================================
// IOS SUBMISSION TYPES
// ============================================================================

export type {
  IosSubmissionBuild,
  CreateIosSubmissionDto,
  UpdateIosSubmissionDto,
  IosSubmissionFilters
} from './ios-submission.interface';

// ============================================================================
// ANDROID SUBMISSION TYPES
// ============================================================================

export type {
  AndroidSubmissionBuild,
  CreateAndroidSubmissionDto,
  UpdateAndroidSubmissionDto,
  AndroidSubmissionFilters
} from './android-submission.interface';

// ============================================================================
// SUBMISSION ACTION HISTORY TYPES
// ============================================================================

export type {
  SubmissionActionHistory,
  CreateSubmissionActionHistoryDto,
  SubmissionActionHistoryFilters
} from './submission-action-history.interface';

