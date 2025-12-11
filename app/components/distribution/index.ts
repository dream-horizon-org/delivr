/**
 * Distribution Module - Component Exports
 * 
 * All distribution-related components for Pre-Release and Distribution stages
 */

// ============================================================================
// Pre-Release Stage Components (Week 3)
// ============================================================================
export { BuildStatusCard } from './BuildStatusCard';
export { ExtraCommitsWarning } from './ExtraCommitsWarning';
export { ManualApprovalDialog } from './ManualApprovalDialog';
export { PMApprovalStatus } from './PMApprovalStatus';
export { UploadAABForm } from './UploadAABForm';
export { VerifyTestFlightForm } from './VerifyTestFlightForm';

// ============================================================================
// Distribution Stage Components (Week 4-5)
// ============================================================================
export { DistributionStatusPanel } from './DistributionStatusPanel';
export { HaltRolloutDialog } from './HaltRolloutDialog';
export { PauseRolloutDialog } from './PauseRolloutDialog';
export { PlatformSubmissionCard } from './PlatformSubmissionCard';
export { ResumeRolloutDialog } from './ResumeRolloutDialog';
export { RolloutControls } from './RolloutControls';
export { RolloutProgressBar } from './RolloutProgressBar';
export { SubmissionCard } from './SubmissionCard';
export { SubmissionStatusCard } from './SubmissionStatusCard';
export { SubmissionHistoryPanel } from './SubmissionHistoryPanel';
export { SubmitToStoresForm } from './SubmitToStoresForm';

// ============================================================================
// Conflict Resolution Dialogs (Per API Spec Section 4.7)
// ============================================================================
export { ExposureControlDialog } from './ExposureControlDialog';
export { VersionConflictDialog } from './VersionConflictDialog';

// ============================================================================
// Rejection Recovery Components (Per API Spec Section 4.9, 4.11)
// ============================================================================
export { RejectedSubmissionView } from './RejectedSubmissionView';
export { ReSubmissionDialog } from './ReSubmissionDialog';

// ============================================================================
// Release Complete View (Per Spec Week 5)
// ============================================================================
export { ReleaseCompleteView } from './ReleaseCompleteView';

// ============================================================================
// Utility Functions (Pure, testable helpers)
// ============================================================================
export {
  deriveActionAvailability, deriveApprovalState,
  // State derivation functions
  deriveBuildState,
  // Date formatting
  formatDate,
  formatDateTime, getEventColor,
  getEventLabel, getReleaseStatusColor,
  // Display helpers
  getRolloutDisplayStatus,
  getRolloutPercentageDisplay, getRolloutStatusColor,
  getRolloutStatusLabel,
  // Type guards
  isRolloutState
} from './distribution.utils';

// ============================================================================
// Component Types
// ============================================================================
export type {
  // Pre-Release
  BuildStatusCardProps, BuildSummaryState,

  // Distribution
  DistributionStatusPanelProps, ExtraCommitsWarningProps, HaltRolloutDialogProps, ManualApprovalDialogProps, PlatformSubmissionCardProps, PMApprovalStatusProps, PreReleaseStageProps, RejectionDetailsCardProps, RolloutControlsProps, RolloutProgressBarProps, SubmissionCardProps,
  SubmissionHistoryPanelProps, SubmitToStoresFormProps, UploadAABFormProps,
  VerifyTestFlightFormProps
} from './distribution.types';

// Conflict Resolution Dialog Types
export type { ExposureControlConflictDetails, ExposureControlDialogProps } from './ExposureControlDialog';
export type { VersionConflictDetails, VersionConflictDialogProps } from './VersionConflictDialog';

// Rejection Recovery Types
export type { RejectedSubmissionViewProps, RejectionDetails } from './RejectedSubmissionView';
export type { ReSubmissionDialogProps, ReSubmissionFormData } from './ReSubmissionDialog';

// Rollout Dialog Types
export type { PauseRolloutDialogProps } from './PauseRolloutDialog';
export type { ResumeRolloutDialogProps } from './ResumeRolloutDialog';

// Release Complete Types
export type { PlatformReleaseInfo, ReleaseCompleteViewProps } from './ReleaseCompleteView';

// Utility types
export type {
  ActionAvailability, ApprovalState, BuildState
} from './distribution.utils';
