/**
 * Distribution Components - Type Definitions
 * 
 * Props interfaces for all distribution components.
 * Uses composition from core types to avoid duplication.
 */

import type {
  Build,
  BuildStrategy,
  BuildUploadStatus,
  Platform,
  PMApprovalStatus,
  ExtraCommitsData,
  DistributionStatus,
  Submission,
  SubmissionStatus,
  SubmissionHistoryEvent,
  ApproverRole,
  HaltSeverity,
  AvailableAction,
  RolloutAction,
  RejectionDetails,
} from '~/types/distribution.types';

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
// BUILD COMPONENTS
// ============================================================================

export type BuildStatusCardProps = BaseProps & WithPlatform & {
  build: Build | null;
  isLoading?: boolean;
  buildStrategy: BuildStrategy;
  // Manual mode callbacks
  onUploadRequested?: () => void;
  onVerifyRequested?: () => void;
  // Note: No onRetryBuild - CICD builds are auto-triggered by Release Orchestrator
  // If CI fails, user retries via their CI system directly (Jenkins, GitHub Actions)
  // We link to the CI run URL so user can retry there
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
  status: DistributionStatus;
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

export type SubmitToStoresFormProps = BaseProps & Closeable & WithReleaseId & {
  availablePlatforms: Platform[];
  hasAndroidActiveRollout?: boolean;
  isSubmitting?: boolean;
  onSubmitComplete?: () => void;
};

export type SubmissionCardProps = BaseProps & {
  submission: Submission;
  compact?: boolean;
  onClick?: () => void;
};

export type SubmissionHistoryPanelProps = BaseProps & {
  events: SubmissionHistoryEvent[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
};

// ============================================================================
// ROLLOUT COMPONENTS
// ============================================================================

/** Rollout status for progress display */
export type RolloutStatus = 'active' | 'paused' | 'halted' | 'complete';

/** Size variants */
export type SizeVariant = 'sm' | 'md' | 'lg';

export type RolloutProgressBarProps = BaseProps & {
  percentage: number;
  targetPercentage?: number;
  status: RolloutStatus;
  showLabel?: boolean;
  size?: SizeVariant;
};

export type RolloutControlsProps = BaseProps & WithSubmissionId & WithPlatform & WithLoading & {
  currentPercentage: number;
  status: SubmissionStatus;
  availableActions: AvailableAction<RolloutAction>[];
  onUpdateRollout?: (percentage: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  onHalt?: () => void;
};

export type HaltRolloutDialogProps = DialogState & RequiredClose & WithSubmissionId & WithPlatform & {
  isHalting?: boolean;
  onHalt: (reason: string, severity: HaltSeverity) => void;
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
