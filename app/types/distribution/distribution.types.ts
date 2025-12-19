/**
 * Distribution Module - Type Definitions
 * 
 * Reference: docs/distribution/DISTRIBUTION_API_SPEC.md
 * 
 * 100% aligned with API specification
 * No deprecated or legacy types
 */

// ============================================================================
// ENUMS - Per API Spec
// ============================================================================

export enum Platform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
}

/**
 * Distribution Status (5 states)
 * Per API spec lines 100-107
 * 
 * KEY: APPROVED, LIVE, PAUSED, HALTED are all considered "released"
 * Once RELEASED, the status NEVER changes (immutable terminal state)
 */
export enum DistributionStatus {
  PENDING = 'PENDING',                          // Initial state, no submissions made yet
  PARTIALLY_SUBMITTED = 'PARTIALLY_SUBMITTED',  // At least 1 submission IN_REVIEW (not all)
  SUBMITTED = 'SUBMITTED',                      // All configured platforms IN_REVIEW
  PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',    // At least 1 submission "released" (APPROVED or beyond), not all
  RELEASED = 'RELEASED',                        // All submissions "released" (APPROVED, LIVE, PAUSED, or HALTED) - IMMUTABLE
}

/**
 * Submission Status (Platform-Specific)
 * Per API spec lines 294-356
 * 
 * ANDROID: PENDING → SUBMITTED → IN_PROGRESS ⇄ HALTED → COMPLETED
 *                         ↓
 *                  USER_ACTION_PENDING → SUSPENDED
 * 
 * iOS: PENDING → IN_REVIEW → APPROVED → LIVE ⇄ PAUSED
 *                    ↓            ↓
 *                REJECTED     CANCELLED
 */
export enum SubmissionStatus {
  // Common
  PENDING = 'PENDING',                       // Created but not yet submitted to store
  
  // Android-Specific
  SUBMITTED = 'SUBMITTED',                   // Android: Promoted to Play Store, awaiting review
  IN_PROGRESS = 'IN_PROGRESS',               // Android: Approved, actively rolling out (< 100%)
  COMPLETED = 'COMPLETED',                   // Android: Rollout complete (100%), terminal state
  USER_ACTION_PENDING = 'USER_ACTION_PENDING', // Android: Status verification failed, needs resubmission
  SUSPENDED = 'SUSPENDED',                   // Android: Terminal state (no action taken within 10 days)
  HALTED = 'HALTED',                         // Android: Rollout paused (resumable, displayed as "Rollout Paused")
  
  // iOS-Specific
  IN_REVIEW = 'IN_REVIEW',                   // iOS: Submitted, awaiting Apple review
  APPROVED = 'APPROVED',                     // iOS: Apple approved, ready to release
  LIVE = 'LIVE',                             // iOS: Available to users (rollout in progress or complete)
  PAUSED = 'PAUSED',                         // iOS: Phased rollout paused by user (displayed as "Rollout Paused")
  REJECTED = 'REJECTED',                     // iOS: Apple rejected, requires resubmission
  CANCELLED = 'CANCELLED',                   // iOS: User cancelled before/during review
}

// ============================================================================
// ACTION HISTORY
// ============================================================================

/**
 * Action History Entry
 * Audit trail for manual actions (PAUSED, RESUMED, CANCELLED, HALTED, UPDATE_ROLLOUT)
 * Per API spec lines 244-257, 330-338, 360-362, 745-762, 846-859
 */
export interface ActionHistoryEntry {
  action: 'PAUSED' | 'RESUMED' | 'CANCELLED' | 'HALTED' | 'UPDATE_ROLLOUT';
  createdBy: string;     // Email of user who performed the action
  createdAt: string;     // ISO timestamp
  reason: string;        // User-provided reason
  previousRolloutPercentage?: number;  // For UPDATE_ROLLOUT: percentage before change
  newRolloutPercentage?: number;       // For UPDATE_ROLLOUT: percentage after change
}

// ============================================================================
// ARTIFACTS
// ============================================================================

/**
 * Android Artifact
 * Per API spec lines 218-221, 352-354, 590-593, 697-700, 753-756, 812-816, 891-894
 */
export interface AndroidArtifact {
  artifactPath: string;           // Presigned S3 URL to download AAB
  internalTrackLink?: string;     // Google Play internal testing link (optional - only for first submission, not resubmissions)
}

/**
 * iOS Artifact
 * Per API spec lines 241-243, 371-373, 619-621, 719-721, 842-845, 894-896
 */
export interface IOSArtifact {
  testflightNumber: number;       // TestFlight build number
}

// ============================================================================
// SUBMISSIONS
// ============================================================================

/**
 * Base Submission Fields (common to all platforms)
 * Per API spec lines 202-222, 224-243, 575-596, 598-625, 680-725, 793-862
 */
interface BaseSubmission {
  id: string;
  distributionId: string;
  platform: Platform;
  storeType: 'PLAY_STORE' | 'APP_STORE';
  status: SubmissionStatus;
  version: string;                // Version string (e.g., "2.7.0")
  rolloutPercentage: number;         // Current rollout percentage (0-100, float)
  releaseNotes: string;
  submittedAt: string | null;     // ISO timestamp, null if PENDING
  isActive: boolean;              // true for current/latest submission, false for historical
  submittedBy: string | null;     // Email of user, null if PENDING
  statusUpdatedAt: string;        // ISO timestamp of last status change
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
  actionHistory: ActionHistoryEntry[];  // Audit trail, empty array if no actions
  rejectionReason?: string;       // Store's rejection reason (only present for REJECTED status)
}

/**
 * Android Submission
 * Per API spec lines 202-222, 534-597, 680-702, 793-820, 1053-1079
 */
export interface AndroidSubmission extends BaseSubmission {
  platform: Platform.ANDROID;
  storeType: 'PLAY_STORE';
  versionCode: number;            // Android version code (integer)
  inAppUpdatePriority: number;          // In-app update priority (0-5)
  artifact: AndroidArtifact;
}

/**
 * iOS Submission
 * Per API spec lines 224-259, 598-625, 703-725, 821-862, 1082-1109
 * 
 * Note: phasedRelease and resetRating are null for PENDING submissions
 * User fills these values during submit action
 */
export interface IOSSubmission extends BaseSubmission {
  platform: Platform.IOS;
  storeType: 'APP_STORE';
  releaseType: 'AFTER_APPROVAL';  // Always "AFTER_APPROVAL" (display-only, non-editable)
  phasedRelease: boolean | null;  // Enable 7-day phased rollout (null for PENDING)
  resetRating: boolean | null;    // Reset app rating with this version (null for PENDING)
  artifact: IOSArtifact;
}

/**
 * Submission (union of Android and iOS)
 * Full submission object as returned by API
 */
export type Submission = AndroidSubmission | IOSSubmission;

/**
 * Submission in Distribution (used in list responses)
 * Minimal submission info returned in GET /api/v1/distributions
 * Per API spec lines 417-425, 463-471
 */
export interface SubmissionInDistribution {
  id: string;
  platform: Platform;
  status: SubmissionStatus;
  rolloutPercentage: number;
  statusUpdatedAt: string;
  isActive: boolean;  // Always true in list view (only current submissions returned)
}

// ============================================================================
// DISTRIBUTIONS
// ============================================================================

/**
 * Distribution Entry (for list response)
 * Returned from GET /api/v1/distributions
 * Per API spec lines 407-451
 * 
 * Note: releaseId is included for linking back to the source release page.
 * distributionId (from id field) is used for all Distribution Management operations.
 */
export interface DistributionEntry {
  id: string;                               // Distribution ID (used for all subsequent operations)
  releaseId: string;                        // Release ID (used for linking to release page)
  branch: string;                           // Git branch name (e.g., "release/2.7.0")
  status: DistributionStatus;               // Distribution status
  platforms: Platform[];                    // Configured platforms (e.g., ["ANDROID", "IOS"])
  submissions: SubmissionInDistribution[];  // ONLY latest submission per platform
  createdAt: string;                        // When distribution was created (ISO timestamp)
  statusUpdatedAt: string;                  // Max of all submissions' statusUpdatedAt (ISO timestamp)
}

/**
 * Distribution Detail (for detail response)
 * Returned from GET /api/v1/distributions/:id or GET /api/v1/releases/:id/distribution
 * Per API spec lines 190-261, 653-728
 */
export interface DistributionDetail {
  id: string;                     // Distribution ID
  releaseId: string;              // Associated release ID
  branch: string;                 // Git branch name
  status: DistributionStatus;     // Distribution status
  platforms: Platform[];          // Configured platforms
  createdAt: string;              // Distribution creation timestamp (ISO)
  updatedAt: string;              // Last update timestamp (ISO)
  submissions: Submission[];      // ALL submissions (current + historical), full objects
}

// ============================================================================
// PAGINATION & STATS
// ============================================================================

/**
 * Pagination Metadata
 * Per API spec lines 436-442
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
 * Per API spec lines 443-448, 483-507
 */
export interface DistributionStats {
  totalDistributions: number;        // Total count of all distributions
  totalSubmissions: number;          // Total count of all submissions across all distributions
  inReviewSubmissions: number;       // Count of submissions with IN_REVIEW status
  releasedSubmissions: number;       // Count of submissions with LIVE status at 100% exposure
}

/**
 * Distributions List Response
 * Complete response from GET /api/v1/distributions
 * Per API spec lines 407-451
 */
export interface DistributionsListResponse {
  distributions: DistributionEntry[];
  stats: DistributionStats;
  pagination: PaginationMeta;
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

/**
 * Submit Submission Request (First-time submission)
 * Updates existing PENDING submission to IN_REVIEW
 * Per API spec lines 518-550
 */
export interface SubmitSubmissionRequest {
  // Android-specific fields
  rolloutPercentage?: number;       // Float 0-100 (supports decimals)
  inAppUpdatePriority?: number;        // 0-5
  
  // iOS-specific fields
  phasedRelease?: boolean;
  resetRating?: boolean;
  
  // Common fields
  releaseNotes?: string;
}

/**
 * Android Resubmission Request
 * Creates NEW submission after rejection/cancellation
 * Per API spec lines 1000-1015
 */
export interface AndroidResubmissionRequest {
  platform: 'ANDROID';
  version: string;                // e.g., "2.7.1"
  versionCode?: number;           // Optional - extracted from AAB if not provided
  aabFile: File;                  // Multipart file upload
  rolloutPercentage: number;         // Float 0-100 (supports decimals)
  inAppUpdatePriority: number;          // 0-5
  releaseNotes: string;
}

/**
 * iOS Resubmission Request
 * Creates NEW submission after rejection/cancellation
 * Per API spec lines 1019-1029
 */
export interface IOSResubmissionRequest {
  platform: 'IOS';
  version: string;                // e.g., "2.7.1"
  testflightNumber: number;       // TestFlight build number
  phasedRelease: boolean;
  resetRating: boolean;
  releaseNotes: string;
}

/**
 * Update Rollout Request
 * Per API spec lines 906-925
 */
export interface UpdateRolloutRequest {
  rolloutPercentage: number;         // Float 0-100
}

/**
 * Pause Rollout Request (iOS only)
 * Per API spec lines 1171-1194
 */
export interface PauseRolloutRequest {
  reason: string;                 // Required reason for pausing
}

/**
 * Resume Rollout Request (iOS only)
 * Per API spec lines 1209-1234
 * No request body needed
 */
export type ResumeRolloutRequest = Record<string, never>;

/**
 * Cancel Submission Request
 * Per API spec lines 1133-1167
 */
export interface CancelSubmissionRequest {
  reason?: string;                // Optional reason for cancellation
}

/**
 * Halt Rollout Request (Emergency halt)
 * Per API spec lines 1236-1272
 */
export interface HaltRolloutRequest {
  reason: string;                 // Required reason for emergency halt
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * API Success Response (Generic wrapper)
 */
export interface APISuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * API Error Response
 * Per API spec lines 1387-1414
 */
export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    category?: 'VALIDATION' | 'AUTH' | 'NOT_FOUND' | 'CONFLICT' | 'EXTERNAL' | 'INTERNAL';
    httpStatus?: number;
    details?: Record<string, unknown>;
  };
}

/**
 * Union of success/error responses
 */
export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;

/**
 * Distributions List API Response
 */
export type DistributionsResponse = APISuccessResponse<DistributionsListResponse>;

/**
 * Distribution Detail API Response
 */
export type DistributionDetailResponse = APISuccessResponse<DistributionDetail>;

/**
 * Submission Detail API Response
 */
export type SubmissionResponse = APISuccessResponse<Submission>;

/**
 * Rollout Update Response
 * Per API spec lines 946-955
 */
export interface RolloutUpdateResponseData {
  id: string;
  rolloutPercentage: number;
  statusUpdatedAt: string;
}

export type RolloutUpdateResponse = APISuccessResponse<RolloutUpdateResponseData>;

/**
 * Pause Rollout Response
 * Per API spec lines 1195-1205
 */
export interface PauseRolloutResponseData {
  id: string;
  status: 'PAUSED';
  statusUpdatedAt: string;
}

export type PauseRolloutResponse = APISuccessResponse<PauseRolloutResponseData>;

/**
 * Resume Rollout Response
 * Per API spec lines 1223-1233
 */
export interface ResumeRolloutResponseData {
  id: string;
  status: 'LIVE';
  statusUpdatedAt: string;
}

export type ResumeRolloutResponse = APISuccessResponse<ResumeRolloutResponseData>;

/**
 * Cancel Submission Response
 * Per API spec lines 1157-1167
 */
export interface CancelSubmissionResponseData {
  id: string;
  status: 'CANCELLED';
  statusUpdatedAt: string;
}

export type CancelSubmissionResponse = APISuccessResponse<CancelSubmissionResponseData>;

/**
 * Halt Rollout Response
 * Per API spec lines 1261-1271
 */
export interface HaltRolloutResponseData {
  id: string;
  status: 'HALTED';
  statusUpdatedAt: string;
}

export type HaltRolloutResponse = APISuccessResponse<HaltRolloutResponseData>;

// ============================================================================
// UTILITY TYPES FOR UI
// ============================================================================

/**
 * Distribution Filters (for list page)
 */
export interface DistributionFilters {
  search?: string;
  status?: DistributionStatus[];
  platform?: Platform[];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Available actions for a submission
 * Calculated on frontend based on submission status and platform
 */
export interface SubmissionActions {
  canSubmit: boolean;           // PENDING → IN_REVIEW
  canCancel: boolean;           // IN_REVIEW → CANCELLED
  canResubmit: boolean;         // REJECTED/CANCELLED → create new submission
  canUpdateRollout: boolean;    // LIVE → update rolloutPercentage
  canPause: boolean;            // LIVE (iOS phased) → PAUSED
  canResume: boolean;           // PAUSED (iOS) → LIVE
  canHalt: boolean;             // LIVE → HALTED
  canCompleteEarly: boolean;    // LIVE (iOS phased) → 100%
}

// ============================================================================
// SUPPORTING TYPES - NOT IN DISTRIBUTION API SPEC
// These are needed by the broader system (pre-release, PM integration, etc.)
// ============================================================================

/** Build Upload Status */
export enum BuildUploadStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  FAILED = 'FAILED',
}

/** Build Strategy */
export enum BuildStrategy {
  CICD = 'CICD',
  MANUAL = 'MANUAL',
}

/** Build Type */
export enum BuildType {
  REGRESSION = 'REGRESSION',
  TESTFLIGHT = 'TESTFLIGHT',
  PRODUCTION = 'PRODUCTION',
}

/** Workflow Status */
export enum WorkflowStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/** CI Run Type */
export enum CIRunType {
  JENKINS = 'JENKINS',
  GITHUB_ACTIONS = 'GITHUB_ACTIONS',
  CIRCLE_CI = 'CIRCLE_CI',
  GITLAB_CI = 'GITLAB_CI',
}

/** Approver Role */
export enum ApproverRole {
  RELEASE_LEAD = 'RELEASE_LEAD',
  RELEASE_PILOT = 'RELEASE_PILOT',
}

/** Warning Severity */
export enum WarningSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

/** Submission Action */
export enum SubmissionAction {
  RETRY = 'RETRY',
  UPDATE_ROLLOUT = 'UPDATE_ROLLOUT',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  HALT = 'HALT',
}

/** Rollout Display Status */
export enum RolloutDisplayStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  HALTED = 'HALTED',
  COMPLETE = 'COMPLETE',
}

/** Rollout Action (subset) */
export type RolloutAction = Exclude<SubmissionAction, SubmissionAction.RETRY>;

/** Available Action */
export interface AvailableAction {
  action: SubmissionAction;
  enabled: boolean;
  reason?: string;
}

/** Version Info */
export interface VersionInfo {
  versionName: string;
  versionCode: string;
}

/** Entity Timestamps */
export interface EntityTimestamps {
  createdAt: string;
  updatedAt: string;
}

/** Rejection Details */
export interface RejectionDetails {
  guideline?: string;
  description?: string;
  screenshot?: string;
}

/** PM Ticket */
export interface PMTicket {
  id: string;
  title: string;
  status: string;
  url: string;
  lastUpdated: string;
}

/** PM Approval Status */
export interface PMApprovalStatus {
  hasPmIntegration: boolean;
  approved: boolean;
  requiresManualApproval?: boolean;
  approver?: ApproverRole;
  pmTicket?: PMTicket;
  approvedAt?: string;
  blockedReason?: string;
}

/** Commit Info */
export interface CommitInfo {
  sha: string;
  author: string;
  message: string;
  timestamp: string;
}

/** Warning */
export interface Warning {
  title: string;
  message: string;
  severity: WarningSeverity;
  recommendation: string;
}

/** Extra Commits Data */
export interface ExtraCommitsData {
  hasExtraCommits: boolean;
  releaseBranch: string;
  lastRegressionCommit: string;
  currentHeadCommit: string;
  commitsAhead: number;
  extraCommits?: CommitInfo[];
  warning?: Warning;
}

/** Build - Pre-release artifact */
export interface Build extends EntityTimestamps, VersionInfo {
  id: string;
  releaseId: string;
  platform: Platform;
  buildType: BuildType;
  artifactPath: string | null;
  testflightNumber: string | null;
  internalTrackLink: string | null;
  checksum: string | null;
  buildStrategy: BuildStrategy;
  ciRunId: string | null;
  ciRunType: CIRunType | null;
  ciRunUrl: string | null;
  workflowStatus: WorkflowStatus | null;
  queueLocation: string | null;
  buildUploadStatus: BuildUploadStatus;
}

/** Platform Build State */
export interface PlatformBuildState {
  exists: boolean;
  ready: boolean;
  status: string;
}

/** Builds Summary */
export interface BuildsSummary {
  android: PlatformBuildState;
  ios: PlatformBuildState;
}

/** Distribution Status Data - Overall status */
export interface DistributionStatusData {
  releaseId: string;
  distributionId: string;
  releaseVersion: string;
  releaseStatus: DistributionStatus;
  platforms: {
    android?: {
      submitted: boolean;
      submissionId: string | null;
      status: SubmissionStatus | null;
      rolloutPercentage: number;
      canRetry: boolean;
      error: { code: string; message: string; occurredAt: string } | null;
    };
    ios?: {
      submitted: boolean;
      submissionId: string | null;
      status: SubmissionStatus | null;
      rolloutPercentage: number;
      canRetry: boolean;
      error: { code: string; message: string; occurredAt: string } | null;
    };
  };
  isComplete: boolean;
  overallProgress: number;
  startedAt: string | null;
  completedAt: string | null;
}

/** Distribution With Submissions - Alias for DistributionDetail */
export type DistributionWithSubmissions = DistributionDetail;

// ============================================================================
// ADDITIONAL REQUEST/RESPONSE TYPES
// ============================================================================

/** Create Resubmission Request - Union type */
export type CreateResubmissionRequest = AndroidResubmissionRequest | IOSResubmissionRequest;

/** Upload AAB Request */
export interface UploadAABRequest {
  file: File;
  platform: 'ANDROID';
  releaseId: string;
  versionName?: string;
  versionCode?: string;
}

/** Verify TestFlight Request */
export interface VerifyTestFlightRequest {
  releaseId: string;
  testflightNumber: string;
  versionName: string;
}

/** Manual Approval Request */
export interface ManualApprovalRequest {
  releaseId: string;
  approverComments?: string;
}

/** Android Submit Options */
export interface AndroidSubmitOptions {
  track?: string;
  rolloutPercentage?: number;
  releaseNotes?: string;
  priority?: number;
}

/** iOS Submit Options */
export interface IOSSubmitOptions {
  releaseType?: string;
  releaseNotes?: string;
  phasedRelease?: boolean;
}

// REMOVED: SubmitToStoreRequest - Not in API spec
// Use SubmitSubmissionRequest per platform instead (API Spec Line 711)

// Response types

export interface BuildsResponse extends APISuccessResponse<{ builds: Build[]; summary: BuildsSummary }> {}
export interface BuildResponse extends APISuccessResponse<Build> {}
export interface UploadAABResponse extends APISuccessResponse<{ build: Build }> {}
export interface VerifyTestFlightResponse extends APISuccessResponse<{ build: Build; verified: boolean }> {}

// REMOVED: SubmissionsResponse - Not in API spec
// Use getReleaseDistribution() or getDistribution() which include submissions

// REMOVED: SubmitToStoreResponse - Not in API spec
// Use SubmissionResponse per platform instead

export interface PMStatusResponse extends APISuccessResponse<PMApprovalStatus> {}
export interface ExtraCommitsResponse extends APISuccessResponse<ExtraCommitsData> {}

export interface ApprovalResponse extends APISuccessResponse<{
  releaseId: string;
  approved: boolean;
  approvedBy: { id: string; name: string; role: ApproverRole };
  approvedAt: string;
  comments: string | null;
}> {}

export interface ReleaseStoresResponse extends APISuccessResponse<{
  releaseId: string;
  stores: Array<{
    id: string;
    channelType: 'PLAY_STORE' | 'APP_STORE';
    platform: Platform;
    displayName: string;
    appIdentifier: string;
    status: 'VERIFIED' | 'UNVERIFIED' | 'FAILED';
    lastVerifiedAt: string | null;
  }>;
}> {}

// REMOVED: DistributionStatusResponse - Not in API spec
// Use getReleaseDistribution() or getDistribution() instead which return full distribution with submissions

// ============================================================================
// PAGE-SPECIFIC FILTER TYPES
// ============================================================================

/**
 * Active filters for distribution list page
 * Simpler type for single-value filters (vs DistributionFilters which supports multi-select)
 */
export interface ActiveDistributionFilters {
  status: string | null;
  platform: string | null;
}
