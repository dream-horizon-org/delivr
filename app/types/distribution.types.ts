/**
 * Distribution Module - Type Definitions
 * 
 * Reference: docs/02-product-specs/distribution-spec.md
 * Reference: docs/02-product-specs/distribution-api-specification.md
 * 
 * Type Composition Strategy:
 * - Base types define core shapes (Build, Submission, etc.)
 * - Enums for all fixed sets
 * - Utility types for reusable patterns
 * - Pick/Omit for API response subsets
 * - Generic wrappers for API responses
 */

// ============================================================================
// ENUMS - Single source of truth for all fixed value sets
// ============================================================================

export enum Platform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
}

export enum ReleaseStatus {
  PRE_RELEASE = 'PRE_RELEASE',
  READY_FOR_SUBMISSION = 'READY_FOR_SUBMISSION',
  COMPLETED = 'COMPLETED',
}

export enum SubmissionStatus {
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  LIVE = 'LIVE',
  REJECTED = 'REJECTED',
  HALTED = 'HALTED',
}

export enum BuildUploadStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  FAILED = 'FAILED',
}

export enum BuildStrategy {
  CICD = 'CICD',
  MANUAL = 'MANUAL',
}

export enum BuildType {
  REGRESSION = 'REGRESSION',
  TESTFLIGHT = 'TESTFLIGHT',
  PRODUCTION = 'PRODUCTION',
}

export enum StoreType {
  PLAY_STORE = 'PLAY_STORE',
  APP_STORE = 'APP_STORE',
}

export enum WorkflowStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum CIRunType {
  JENKINS = 'JENKINS',
  GITHUB_ACTIONS = 'GITHUB_ACTIONS',
  CIRCLE_CI = 'CIRCLE_CI',
  GITLAB_CI = 'GITLAB_CI',
}

// ============================================================================
// LITERAL TYPES - Extracted from repeated inline unions
// ============================================================================

/** Approver roles for manual approval */
export type ApproverRole = 'RELEASE_LEAD' | 'RELEASE_PILOT';

/** Halt severity levels */
export type HaltSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

/** Android release tracks */
export type AndroidTrack = 'INTERNAL' | 'ALPHA' | 'BETA' | 'PRODUCTION';

/** iOS release types */
export type IOSReleaseType = 'MANUAL_RELEASE' | 'AFTER_APPROVAL' | 'SCHEDULED';

/** Update priority (0-5) */
export type UpdatePriority = 0 | 1 | 2 | 3 | 4 | 5;

/** Warning severity */
export type WarningSeverity = 'WARNING' | 'ERROR' | 'INFO';

/** API error categories */
export type APIErrorCategory = 'VALIDATION' | 'AUTH' | 'NOT_FOUND' | 'CONFLICT' | 'EXTERNAL' | 'INTERNAL';

/** Event trigger source */
export type EventTrigger = 'USER' | 'SYSTEM' | 'STORE';

/** Submission actions */
export type SubmissionAction = 'RETRY' | 'UPDATE_ROLLOUT' | 'PAUSE' | 'RESUME' | 'HALT';

/** Rollout actions (subset for rollout controls) */
export type RolloutAction = Exclude<SubmissionAction, 'RETRY'>;

// ============================================================================
// REUSABLE BASE TYPES - Common shapes used across multiple types
// ============================================================================

/** Timestamps present on all persisted entities */
export type EntityTimestamps = {
  createdAt: string;
  updatedAt: string;
};

/** Version information */
export type VersionInfo = {
  versionName: string;  // e.g., "2.5.0"
  versionCode: string;  // Android: "250", iOS: "250"
};

/** Available action with enabled state */
export type AvailableAction<T extends string = SubmissionAction> = {
  action: T;
  enabled: boolean;
  reason?: string;
};

/** Error information */
export type ErrorInfo = {
  code: string;
  message: string;
  occurredAt: string;
};

/** Actor who performed an action */
export type Actor = {
  id: string;
  name: string;
  role: string;
};

/** Pagination info */
export type PaginationInfo = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

/** Platform build state (used in summaries) */
export type PlatformBuildState = {
  exists: boolean;
  ready: boolean;
  status: string;
};

/** Rejection details structure */
export type RejectionDetails = {
  guideline?: string;
  description?: string;
  screenshot?: string;
};

/** PM ticket info */
export type PMTicket = {
  id: string;
  title: string;
  status: string;
  url: string;
  lastUpdated: string;
};

/** Warning message structure */
export type Warning = {
  title: string;
  message: string;
  severity: WarningSeverity;
  recommendation: string;
};

/** Commit info for extra commits */
export type CommitInfo = {
  sha: string;
  author: string;
  message: string;
  timestamp: string;
};

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

/**
 * Build - Represents a single build artifact (Android AAB or iOS TestFlight)
 */
export type Build = EntityTimestamps & VersionInfo & {
  id: string;
  releaseId: string;
  platform: Platform;
  buildType: BuildType;
  
  // Artifact info
  artifactPath: string | null;
  testflightNumber: string | null;
  internalTrackLink: string | null;
  checksum: string | null;
  
  // CI/CD metadata
  buildStrategy: BuildStrategy;
  ciRunId: string | null;
  ciRunType: CIRunType | null;
  ciRunUrl: string | null;  // URL to CI run for retry/status check
  workflowStatus: WorkflowStatus | null;
  queueLocation: string | null;
  
  // Status
  buildUploadStatus: BuildUploadStatus;
};

/**
 * BuildsSummary - Summary of builds for a release
 */
export type BuildsSummary = {
  android: PlatformBuildState;
  ios: PlatformBuildState;
};

/**
 * Submission - Represents a store submission (Play Store or App Store)
 */
export type Submission = EntityTimestamps & VersionInfo & {
  id: string;
  releaseId: string;
  buildId: string;
  
  // Platform info
  platform: Platform;
  storeType: StoreType;
  
  // Status
  submissionStatus: SubmissionStatus;
  exposurePercent: number;
  
  // Store identifiers
  externalSubmissionId: string | null;
  externalReleaseId: string | null;
  track: string | null;
  
  // Submission metadata
  releaseNotes: string | null;
  
  // Timestamps
  submittedAt: string | null;
  approvedAt: string | null;
  releasedAt: string | null;
  
  // Error info (if REJECTED)
  rejectionReason: string | null;
  rejectionDetails: RejectionDetails | null;
  
  // Actions available
  availableActions: AvailableAction[];
};

/**
 * Release - High-level release information
 */
export type Release = EntityTimestamps & {
  id: string;
  version: string;
  platforms: Platform[];
  status: ReleaseStatus;
};

/**
 * PM Approval - Project Management approval status
 */
export type PMApprovalStatus = {
  hasPmIntegration: boolean;
  approved: boolean;
  requiresManualApproval?: boolean;
  approver?: ApproverRole;
  pmTicket?: PMTicket;
  approvedAt?: string;
  blockedReason?: string;
};

/**
 * Extra Commits - Untested code detection
 */
export type ExtraCommitsData = {
  hasExtraCommits: boolean;
  releaseBranch: string;
  lastRegressionCommit: string;
  currentHeadCommit: string;
  commitsAhead: number;
  extraCommits?: CommitInfo[];
  warning?: Warning;
};

/**
 * Platform Submission State - Status for a single platform
 */
export type PlatformSubmissionState = {
  submitted: boolean;
  submissionId: string | null;
  status: SubmissionStatus | null;
  exposurePercent: number;
  canRetry: boolean;
  error: ErrorInfo | null;
};

/**
 * Distribution Status - Overall status for a release
 */
export type DistributionStatus = {
  releaseId: string;
  releaseVersion: string;
  releaseStatus: ReleaseStatus;
  
  // Per-platform status
  platforms: {
    android?: PlatformSubmissionState;
    ios?: PlatformSubmissionState;
  };
  
  // Overall completion
  isComplete: boolean;
  overallProgress: number;
  
  // Timeline
  startedAt: string | null;
  completedAt: string | null;
};

// ============================================================================
// EVENT TYPES - For submission history
// ============================================================================

export type SubmissionHistoryEventType = 
    | 'SUBMITTED'
    | 'STATUS_CHANGED'
    | 'ROLLOUT_UPDATED'
    | 'ROLLOUT_PAUSED'
    | 'ROLLOUT_RESUMED'
    | 'ROLLOUT_HALTED'
    | 'REJECTED'
    | 'APPROVED'
    | 'RETRY_ATTEMPTED';
  
/** Rollout state change */
export type RolloutEventState = {
  percentage: number;
};

/** Status change state */
export type StatusEventState = {
  status: SubmissionStatus;
  exposurePercent?: number;
};

/** Rejection state */
export type RejectionEventState = {
  reason: string;
  guideline?: string;
};

/** Union of all possible event states */
export type EventState = 
  | RolloutEventState 
  | StatusEventState 
  | RejectionEventState 
  | { message: string }
  | null;
  
/** Event metadata */
export type EventMetadata = {
  triggeredBy?: EventTrigger;
  storeResponse?: string;
  duration?: number;
};

/**
 * Submission History Event
 */
export type SubmissionHistoryEvent = {
    id: string;
  eventType: SubmissionHistoryEventType;
  previousState?: EventState;
  newState: EventState;
  actor?: Actor;
  reason?: string;
  metadata?: EventMetadata;
  timestamp: string;
};

// ============================================================================
// API REQUEST TYPES - Using composition
// ============================================================================

/** Android-specific submission options */
export type AndroidSubmitOptions = {
  track?: AndroidTrack;
  rolloutPercentage?: number;
  releaseNotes?: string;
  priority?: UpdatePriority;
};

/** iOS-specific submission options */
export type IOSSubmitOptions = {
  releaseType?: IOSReleaseType;
  releaseNotes?: string;
  phasedRelease?: boolean;
};

/** Submit to Stores Request */
export type SubmitToStoreRequest = {
  releaseId: string;
  platforms: Platform[];
  android?: AndroidSubmitOptions;
  ios?: IOSSubmitOptions;
};

/** Metadata updates for retry */
export type SubmissionMetadataUpdates = {
    releaseNotes?: string;
    shortDescription?: string;
    fullDescription?: string;
    keywords?: string[];
  };
  
/** Retry Submission Request */
export type RetrySubmissionRequest = {
  submissionId: string;
  updates?: SubmissionMetadataUpdates;
  newBuildId?: string;
};

/** Update Rollout Request */
export type UpdateRolloutRequest = Pick<Submission, 'exposurePercent'> & {
  submissionId: string;
};

/** Pause Rollout Request */
export type PauseRolloutRequest = {
  submissionId: string;
  reason?: string;
};

/** Halt Rollout Request */
export type HaltRolloutRequest = {
  submissionId: string;
  reason: string;
  severity: HaltSeverity;
};

/** Upload AAB Request (for manual mode) */
export type UploadAABRequest = Partial<VersionInfo> & {
  file: File;
  platform: Platform.ANDROID;
  releaseId: string;
};

/** Verify TestFlight Request (for manual mode) */
export type VerifyTestFlightRequest = Pick<VersionInfo, 'versionName'> & {
  releaseId: string;
  testflightBuildNumber: string;
};

/** Manual Approval Request */
export type ManualApprovalRequest = {
  releaseId: string;
  approverComments?: string;
};

// ============================================================================
// API RESPONSE TYPES - Using generic wrappers
// ============================================================================

/** API Success Response (Generic wrapper) */
export type APISuccessResponse<T> = {
  success: true;
  data: T;
};

/** API Error Details */
export type APIErrorDetails = {
  field?: string;
  constraint?: string;
  storeError?: string;
};

/** Resolution option for errors */
export type ResolutionOption = {
  action: string;
  label: string;
  recommended?: boolean;
  warning?: string;
};

/** Error resolution info */
export type ErrorResolution = {
  title: string;
  message: string;
  options?: ResolutionOption[];
};

/** API Error Response */
export type APIErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    category?: APIErrorCategory;
    httpStatus?: number;
    details?: Record<string, unknown>;
    resolution?: ErrorResolution;
  };
};

/** Union of success/error responses */
export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;

// --- Specific Response Types (using base types) ---

/** Builds Response */
export type BuildsResponse = APISuccessResponse<{
  builds: Build[];
  summary: BuildsSummary;
}>;

/** Build Response (single) */
export type BuildResponse = APISuccessResponse<Build>;

/** Submission summary (subset of Submission for responses) */
export type SubmissionSummary = Pick<Submission, 
  | 'id' 
  | 'platform' 
  | 'storeType' 
  | 'submissionStatus' 
  | 'versionName' 
  | 'versionCode'
  | 'exposurePercent'
  | 'createdAt'
> & {
  buildId: string;
  externalSubmissionId: string | null;
  track: string;
  submittedAt: string;
};

/** Submit to Stores Response */
export type SubmitToStoreResponse = APISuccessResponse<{
  releaseId: string;
  submissionIds: string[];
  submissions: SubmissionSummary[];
  releaseStatus: ReleaseStatus;
}>;

/** Platform submission result (for partial responses) */
export type PlatformSubmissionResult = {
      platform: Platform;
      success: boolean;
      id?: string;
      status?: SubmissionStatus;
      submittedAt?: string;
  error?: Pick<ErrorInfo, 'code' | 'message'> & {
    details?: APIErrorDetails;
      };
};

/** Platform warning */
export type PlatformWarning = {
      platform: Platform;
      message: string;
      canRetry: boolean;
};

/** Partial Submit Response (some platforms failed) */
export type PartialSubmitResponse = APISuccessResponse<{
  releaseId: string;
  submissionIds: string[];
  submissions: PlatformSubmissionResult[];
  releaseStatus: ReleaseStatus;
  warnings: PlatformWarning[];
}>;

/** Distribution Status Response */
export type DistributionStatusResponse = APISuccessResponse<DistributionStatus>;

/** Submissions Response */
export type SubmissionsResponse = APISuccessResponse<{
  submissions: Submission[];
}>;

/** Submission Response (single) */
export type SubmissionResponse = APISuccessResponse<Submission>;

/** Rollout Update Response */
export type RolloutUpdateResponse = APISuccessResponse<{
  submissionId: string;
  previousPercentage: number;
  newPercentage: number;
  exposurePercent: number;
  updatedAt: string;
  autoPromotedToReleased: boolean;
  releaseStatus?: ReleaseStatus;
}>;

/** PM Status Response */
export type PMStatusResponse = APISuccessResponse<PMApprovalStatus>;

/** Extra Commits Response */
export type ExtraCommitsResponse = APISuccessResponse<ExtraCommitsData>;

/** Submission History Response */
export type SubmissionHistoryResponse = APISuccessResponse<{
  submissionId: string;
  events: SubmissionHistoryEvent[];
  pagination: PaginationInfo;
}>;

/** Approver info (subset of Actor with specific role) */
export type Approver = Omit<Actor, 'role'> & {
  role: ApproverRole;
};

/** Approval Response */
export type ApprovalResponse = APISuccessResponse<{
  releaseId: string;
  approved: boolean;
  approvedBy: Approver;
  approvedAt: string;
  comments: string | null;
}>;

/** Store capabilities */
export type StoreCapabilities = {
  supportsRollout: boolean;
  supportsTracks: boolean;
  supportsVersionCheck: boolean;
  supportsStatusPolling: boolean;
  requiresReview: boolean;
  availableTracks?: string[];
};

/** Store Integration - Store configuration for a platform */
export type StoreIntegration = {
  id: string;
  channelType: 'PLAY_STORE' | 'APP_STORE';
  platform: Platform;
  displayName: string;
  appIdentifier: string;
  status: 'VERIFIED' | 'UNVERIFIED' | 'FAILED';
  capabilities: StoreCapabilities;
  lastVerifiedAt: string | null;
};

/** Release Stores Response */
export type ReleaseStoresResponse = APISuccessResponse<{
  releaseId: string;
  stores: StoreIntegration[];
}>;

// ============================================================================
// FETCHER RESPONSE TYPES - For Remix useFetcher type safety
// ============================================================================

/** Generic build operation response */
export type BuildOperationResponse = {
  success?: boolean;
  data?: { build: unknown };
  error?: { message: string };
};

/** Submit to stores response (from action) */
export type SubmitToStoresActionResponse = {
  success?: boolean;
  error?: { message: string };
};
