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

// Platform values as array for validation
export const PLATFORM_VALUES = [Platform.ANDROID, Platform.IOS] as const;

/**
 * Distribution Status Enum
 * 
 * PENDING: Distribution created after pre-release, not yet submitted to stores
 * PARTIALLY_RELEASED: Some platforms released (e.g., only Android out of Android+iOS)
 * COMPLETED: All target platforms fully released (100% rollout)
 * 
 * Status is derived from submissions:
 * - PENDING: No submissions OR all submissions not yet LIVE
 * - PARTIALLY_RELEASED: Some platforms LIVE at 100%, but not all
 * - COMPLETED: All platforms LIVE at 100%
 */
export enum DistributionStatus {
  PENDING = 'PENDING',                          // No submissions yet
  PARTIALLY_SUBMITTED = 'PARTIALLY_SUBMITTED',  // Some platforms submitted
  SUBMITTED = 'SUBMITTED',                      // All platforms submitted
  PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',    // Some platforms live
  RELEASED = 'RELEASED',                        // All platforms 100% live
}

export enum SubmissionStatus {
  PENDING = 'PENDING',      // Submission created, not yet submitted to store
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  LIVE = 'LIVE',
  PAUSED = 'PAUSED',        // iOS only: Phased rollout paused
  REJECTED = 'REJECTED',
  HALTED = 'HALTED',
  CANCELLED = 'CANCELLED',
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
// ENUMS - Additional status and action types
// ============================================================================

/** Approver roles for manual approval */
export enum ApproverRole {
  RELEASE_LEAD = 'RELEASE_LEAD',
  RELEASE_PILOT = 'RELEASE_PILOT',
}

/** Halt severity levels */
export enum HaltSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
}

/** Warning severity */
export enum WarningSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

/** Submission actions */
export enum SubmissionAction {
  RETRY = 'RETRY',
  UPDATE_ROLLOUT = 'UPDATE_ROLLOUT',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  HALT = 'HALT',
}

// ============================================================================
// LITERAL TYPES - Keep as types for specific use cases
// ============================================================================

/** Android release tracks */
export type AndroidTrack = 'INTERNAL' | 'ALPHA' | 'BETA' | 'PRODUCTION';

/** iOS release types */
export type IOSReleaseType = 'MANUAL_RELEASE' | 'AFTER_APPROVAL' | 'SCHEDULED';

/** Update priority (0-5) */
export type UpdatePriority = 0 | 1 | 2 | 3 | 4 | 5;

/** API error categories */
export type APIErrorCategory = 'VALIDATION' | 'AUTH' | 'NOT_FOUND' | 'CONFLICT' | 'EXTERNAL' | 'INTERNAL';

/** Event trigger source */
export type EventTrigger = 'USER' | 'SYSTEM' | 'STORE';

/** Rollout actions (subset for rollout controls) */
export type RolloutAction = Exclude<SubmissionAction, SubmissionAction.RETRY>;

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
  distributionId: string;
  buildId: string;
  
  // Platform info
  platform: Platform;
  storeType: StoreType;
  
  // Status
  submissionStatus: SubmissionStatus;
  status: SubmissionStatus; // Alias for compatibility
  rolloutPercent: number;
  
  // Store identifiers
  externalSubmissionId: string | null;
  externalReleaseId: string | null;
  track: string | null;
  
  // Submission metadata
  releaseNotes: string | null;
  
  // Android-specific fields
  inAppPriority?: number | null; // 0-5, Android only
  
  // iOS-specific fields
  phasedRelease?: boolean | null; // iOS only: true = phased (7-day), false = manual
  resetRating?: boolean | null;    // iOS only: reset ratings on update
  
  // Artifact information
  artifact?: {
    buildUrl?: string;
    internalTestingLink?: string;
    testflightBuildNumber?: number;
  } | null;
  
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
  status: DistributionStatus;
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
  rolloutPercent: number;
  canRetry: boolean;
  error: ErrorInfo | null;
};

/**
 * Distribution Status Data - Overall status for a release
 * (Renamed to avoid conflict with DistributionStatus enum)
 */
export type DistributionStatusData = {
  releaseId: string;
  distributionId: string;
  releaseVersion: string;
  releaseStatus: DistributionStatus;
  
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

/** Submit Submission Request (First-time submission - updates PENDING submission) */
export type SubmitSubmissionRequest = {
  // Android-specific fields
  rolloutPercent?: number;       // Float 0-100 (supports decimals)
  inAppPriority?: number;         // 0-5
  
  // iOS-specific fields
  phasedRelease?: boolean;
  resetRating?: boolean;
  
  // Common fields
  releaseNotes?: string;
};

/** Create Resubmission Request (Android) - Creates new submission after rejection/cancellation */
export type AndroidResubmissionRequest = {
  platform: Platform.ANDROID;
  version: string;                // e.g., "2.7.1"
  versionCode?: number;           // Optional - extracted from AAB if not provided
  aabFile: File;                  // Multipart file upload
  rolloutPercent: number;         // Float 0-100 (supports decimals)
  inAppPriority: number;          // 0-5
  releaseNotes: string;
};

/** Create Resubmission Request (iOS) - Creates new submission after rejection/cancellation */
export type IOSResubmissionRequest = {
  platform: Platform.IOS;
  version: string;                // e.g., "2.7.1"
  testflightBuildNumber: number;
  phasedRelease: boolean;
  resetRating: boolean;
  releaseNotes: string;
};

/** Union type for resubmission requests */
export type CreateResubmissionRequest = AndroidResubmissionRequest | IOSResubmissionRequest;

/** Update Rollout Request */
export type UpdateRolloutRequest = {
  rolloutPercent: number;
};

/** Pause Rollout Request */
export type PauseRolloutRequest = {
  reason?: string;
};

/** Halt Rollout Request */
export type HaltRolloutRequest = {
  reason: string;
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

/** Upload AAB Response */
export type UploadAABResponse = APISuccessResponse<{
  build: Build;
}>;

/** Verify TestFlight Response */
export type VerifyTestFlightResponse = APISuccessResponse<{
  build: Build;
  verified: boolean;
}>;

/** Submission summary (subset of Submission for responses) */
export type SubmissionSummary = Pick<Submission, 
  | 'id' 
  | 'platform' 
  | 'storeType' 
  | 'submissionStatus' 
  | 'versionName' 
  | 'versionCode'
  | 'rolloutPercent'
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
  releaseStatus: DistributionStatus;
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
  releaseStatus: DistributionStatus;
  warnings: PlatformWarning[];
}>;

/** Distribution Status Response */
export type DistributionStatusResponse = APISuccessResponse<DistributionStatusData>;

/** Submissions Response */
export type SubmissionsResponse = APISuccessResponse<{
  submissions: Submission[];
}>;

/** Submission Response (single) */
export type SubmissionResponse = APISuccessResponse<Submission>;

/** Rollout Update Response */
export type RolloutUpdateResponse = APISuccessResponse<{
  id: string;
  rolloutPercent: number;
  statusUpdatedAt: string;
}>;

/** PM Status Response */
export type PMStatusResponse = APISuccessResponse<PMApprovalStatus>;

/** Extra Commits Response */
export type ExtraCommitsResponse = APISuccessResponse<ExtraCommitsData>;

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

// ============================================================================
// DISTRIBUTIONS LIST TYPES - For paginated distributions endpoint
// ============================================================================

/**
 * Submission within a distribution
 * Represents a platform-specific submission (from android_submissions or ios_submissions table)
 */
export interface SubmissionInDistribution {
  id: string;
  platform: Platform;
  storeType?: string; // 'PLAY_STORE' | 'APP_STORE'
  details: {
    track?: string;
    buildNumber?: string;
    packageName?: string;  // Android-specific
    versionCode?: string;  // Android-specific
    bundleId?: string;     // iOS-specific
    buildVersion?: string; // iOS-specific
    [key: string]: unknown; // Other platform-specific details
  };
  status: SubmissionStatus; // Just "status" - context is clear within submissions array
  rolloutPercent: number; // Rollout percentage (0-100)
  submittedAt?: string;
  updatedAt?: string;
}

/**
 * Distribution with full submissions
 * Returned from GET /api/v1/distributions/:distributionId
 * Contains complete distribution object with ALL submissions (current + historical)
 */
export interface DistributionWithSubmissions {
  id: string;
  releaseId: string;
  version: string;
  branch: string;
  status: DistributionStatus;
  platforms: Platform[];
  createdAt: string;
  updatedAt: string;
  submissions: Submission[]; // Full submission objects with all details
}

/**
 * Distribution Entry
 * Represents a single distribution with its associated submissions
 * Returned from GET /api/v1/distributions (list endpoint)
 */
export interface DistributionEntry {
  id: string; // Distribution ID (from distribution table)
  releaseId: string;
  version: string;
  branch: string;
  status: DistributionStatus; // PENDING, PARTIALLY_RELEASED, or COMPLETED
  platforms: Platform[]; // Platforms this release targets (from release configuration)
  submissions: SubmissionInDistribution[]; // Array of platform submissions (actual submitted platforms)
  submittedAt: string | null;
  lastUpdated: string;
  // Pre-release artifacts (for first submission)
  artifacts?: {
    android?: {
      name: string;
      size: string;
      buildId: string;
      internalTestingLink?: string;
    };
    ios?: {
      buildNumber: string;
      buildId: string;
      testflightLink?: string;
    };
  };
}

/**
 * Pagination Metadata
 * Standard pagination response structure
 */
export interface PaginationMeta {
  page: number;        // Current page (1-indexed)
  pageSize: number;    // Items per page
  totalPages: number;  // Total number of pages
  totalItems: number;  // Total number of items
  hasMore: boolean;    // Whether there are more pages
}

/**
 * Distribution Stats
 * Aggregated statistics calculated from ALL distributions (not just current page)
 */
export interface DistributionStats {
  total: number;
  rollingOut: number;
  inReview: number;
  released: number;
}

/**
 * Distributions List Response
 * Complete response from GET /api/v1/distributions
 */
export interface DistributionsListResponse {
  distributions: DistributionEntry[];
  stats: DistributionStats;
  pagination: PaginationMeta;
}

/** API Success wrapper for distributions list */
export type DistributionsResponse = APISuccessResponse<DistributionsListResponse>;
