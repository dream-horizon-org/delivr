/**
 * Distribution Components - Type Definitions
 * 
 * Props interfaces for all distribution components.
 * Uses composition from core types to avoid duplication.
 */

import type {
  ApproverRole,
  Build,
  BuildStrategy,
  BuildUploadStatus,
  DistributionStatusData,
  ExtraCommitsData,
  // HaltSeverity removed - deprecated, not used per API spec
  Platform,
  PMApprovalStatus,
  RejectionDetails,
  RolloutDisplayStatus,
  Submission,
  SubmissionInDistribution,
  SubmissionStatus
} from '~/types/distribution/distribution.types';

// ============================================================================
// BASE PROP TYPES - Reusable across components
// ============================================================================

/** Base props with optional className */
type BaseProps = {
  className?: string;
};

/** Props for components with loading state */
type WithLoading = {
  isLoading?: boolean;
};

/** Props for closeable dialogs/forms */
type Closeable = {
  onClose?: () => void;
};

/** Props for required close handler (dialogs) */
type RequiredClose = {
  onClose: () => void;
};

/** Props for dialog open state */
type DialogState = {
  opened: boolean;
};

/** Props requiring release ID */
type WithReleaseId = {
  releaseId: string;
};

/** Props requiring submission ID */
type WithSubmissionId = {
  submissionId: string;
};

/** Props with platform */
type WithPlatform = {
  platform: Platform;
};

// ============================================================================
// FORM CALLBACK TYPES - Standardized callback patterns
// ============================================================================

/** Callback with Build result */
type OnBuildResult = {
  onUploadComplete?: (result?: unknown) => void;
  onUploadError?: (error: string) => void;
};

/** Callback with verify result */
type OnVerifyResult = {
  onVerifyComplete?: (result?: unknown) => void;
  onVerifyError?: (error: string) => void;
};

// ============================================================================
// BUILD COMPONENTS (Pre-Release)
// ============================================================================
// These types are for pre-release components and are NOT exported from distribution module
// They remain here so pre-release team can use them

export type BuildStatusCardProps = BaseProps & WithPlatform & {
  build: Build | null;
  isLoading?: boolean;
  buildStrategy: BuildStrategy;
  // Manual mode callbacks
  onUploadRequested?: () => void;
  onVerifyRequested?: () => void;
  // CICD mode callback
  onRetryBuild?: (buildId: string) => void;
  ciRetryUrl?: string;
};

export type UploadAABFormProps = BaseProps & Closeable & WithReleaseId & OnBuildResult & {
  isUploading?: boolean;
  uploadProgress?: number;
};

export type VerifyTestFlightFormProps = BaseProps & Closeable & WithReleaseId & OnVerifyResult & {
  expectedVersion?: string;
  isVerifying?: boolean;
};

// ============================================================================
// APPROVAL COMPONENTS
// ============================================================================

export type PMApprovalStatusProps = BaseProps & {
  pmStatus: PMApprovalStatus;
  isApproving?: boolean;
  onApproveRequested?: () => void;
};

export type ManualApprovalDialogProps = DialogState & RequiredClose & WithReleaseId & {
  approverRole: ApproverRole;
  isApproving?: boolean;
  onApprove: (comments?: string) => void;
};

// ============================================================================
// WARNING COMPONENTS
// ============================================================================

export type ExtraCommitsWarningProps = BaseProps & {
  extraCommits: ExtraCommitsData;
  canDismiss?: boolean;
  onProceed?: () => void;
  onCreateRegression?: () => void;
};

// ============================================================================
// PRE-RELEASE STAGE
// ============================================================================

export type PreReleaseStageProps = WithReleaseId & {
  org: string;
  androidBuild: Build | null;
  iosBuild: Build | null;
  buildStrategy: BuildStrategy;
  pmStatus: PMApprovalStatus;
  extraCommits: ExtraCommitsData;
  canPromote: boolean;
  promotionBlockedReason?: string;
  onPromote?: () => void;
};

/** Platform-specific build summary (extended from core type) */
export type PlatformBuildSummary = {
  exists: boolean;
  ready: boolean;
  status: BuildUploadStatus | null;
  build: Build | null;
};

export type BuildSummaryState = {
  android: PlatformBuildSummary;
  ios: PlatformBuildSummary;
  allReady: boolean;
};

// ============================================================================
// DISTRIBUTION STATUS COMPONENTS
// ============================================================================

export type DistributionStatusPanelProps = BaseProps & WithLoading & {
  status: DistributionStatusData;
};

export type PlatformSubmissionCardProps = BaseProps & WithPlatform & {
  submission: Submission | null;
  isSubmitting?: boolean;
  onViewDetails?: () => void;
  onRetry?: () => void;
};

// ============================================================================
// SUBMISSION COMPONENTS
// ============================================================================

export type SubmitToStoresFormProps = BaseProps & Closeable & {
  tenantId: string; // Required - for tenant-scoped API calls
  releaseId?: string; // Optional - only needed in Release Process, not in Distribution Management
  distributionId: string; // Required - needed for API calls
  submissions: Submission[] | SubmissionInDistribution[]; // Required - to get submission IDs for per-platform submit
  hasAndroidActiveRollout?: boolean;
  isSubmitting?: boolean;
  onSubmitComplete?: () => void;
  // First submission (promotion from pre-release)
  isFirstSubmission?: boolean;
  androidArtifact?: {
    name: string;
    size: string;
    internalTrackLink?: string;  // Renamed from internalTestingLink
  };
  iosArtifact?: {
    buildNumber: string;
    testflightLink?: string;
  };
};

export type SubmissionCardProps = BaseProps & {
  submission: Submission;
  compact?: boolean;
  onClick?: () => void;
};

// ============================================================================
// ROLLOUT COMPONENTS
// ============================================================================

/** Size variants */
export type SizeVariant = 'sm' | 'md' | 'lg';

export type RolloutProgressBarProps = BaseProps & {
  percentage: number;
  targetPercentage?: number;
  status: RolloutDisplayStatus;
  showLabel?: boolean;
  size?: SizeVariant;
};

export type RolloutControlsProps = BaseProps & WithSubmissionId & WithPlatform & WithLoading & {
  currentPercentage: number;
  status: SubmissionStatus;
  phasedRelease?: boolean; // For iOS: true = phased (7-day), false = manual (immediate 100%)
  onUpdateRollout?: (percentage: number) => void;
  onPause?: (reason?: string) => void; // Optional reason for pause (Android→HALTED, iOS→PAUSED)
  onResume?: () => void;
  // Note: No onHalt - HALT is just Android's status name for PAUSE
};

// ============================================================================
// REJECTION COMPONENTS
// ============================================================================

export type RejectionDetailsCardProps = BaseProps & {
  reason: string;
  details: RejectionDetails | null;
  canRetry?: boolean;
  onRetry?: () => void;
};

// ============================================================================
// DERIVED STATE TYPES (from utility functions)
// ============================================================================

/** Computed build state (no React hooks) */
export type BuildState = {
  hasBuild: boolean;
  isUploaded: boolean;
  isUploading: boolean;
  isFailed: boolean;
  isPending: boolean;
  isManualMode: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  canUpload: boolean;
  canVerify: boolean;
  testingLink: string | null;
  statusLabel: string;
  statusColor: string;
};

/** Computed approval state */
export type ApprovalState = {
  hasIntegration: boolean;
  isApproved: boolean;
  requiresManualApproval: boolean;
  ticket: PMApprovalStatus['pmTicket'];
  blockedReason: string | null;
  statusLabel: string;
  statusColor: string;
};

/** Action availability state */
export type ActionAvailability = {
  canUpdate: boolean;
  canPause: boolean; // Android→HALTED, iOS→PAUSED (both displayed as "Rollout Paused")
  canResume: boolean; // HALTED→IN_PROGRESS (Android), PAUSED→LIVE (iOS)
  updateReason?: string;
  pauseReason?: string;
  resumeReason?: string;
  supportsRollout: boolean;
  isPaused: boolean;
  isComplete: boolean;
};
