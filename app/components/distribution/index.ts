/**
 * Distribution Module - Component Exports
 * 
 * All distribution-related components for Pre-Release and Distribution stages.
 * 
 * NOTE: Hooks are in ~/hooks/distribution/
 * NOTE: Utils are in ~/utils/distribution/
 */

// ============================================================================
// Pre-Release Stage Components
// ============================================================================
export { BuildStatusCard } from './BuildStatusCard';
export { ExtraCommitsWarning } from './ExtraCommitsWarning';
export { ManualApprovalDialog } from './ManualApprovalDialog';
export { PMApprovalStatus } from './PMApprovalStatus';
export { UploadAABForm } from './UploadAABForm';
export { VerifyTestFlightForm } from './VerifyTestFlightForm';

// ============================================================================
// Distribution Stage Components
// ============================================================================
export { ActionButton } from './ActionButton';
export { DistributionStatusPanel } from './DistributionStatusPanel';
export { PauseRolloutDialog } from './PauseRolloutDialog';
export { PlatformSubmissionCard } from './PlatformSubmissionCard';
export { PresetButtons } from './PresetButtons';
export { ResumeRolloutDialog } from './ResumeRolloutDialog';
export { RolloutControls } from './RolloutControls';
export { RolloutProgressBar } from './RolloutProgressBar';
export { SubmissionCard } from './SubmissionCard';
export { SubmissionStatusCard } from './SubmissionStatusCard';
export { SubmitToStoresForm } from './SubmitToStoresForm';

// ============================================================================
// Conflict Resolution Dialogs
// ============================================================================
export { ExposureControlDialog } from './ExposureControlDialog';
export { VersionConflictDialog } from './VersionConflictDialog';

// ============================================================================
// Rejection Recovery Components
// ============================================================================
export { RejectedSubmissionView } from './RejectedSubmissionView';
export { ResubmissionDialog } from './ReSubmissionDialog';

// ============================================================================
// Release Complete View
// ============================================================================
export { ReleaseCompleteView } from './ReleaseCompleteView';

// ============================================================================
// Page Layout Components (migrated from routes/_components)
// ============================================================================
export { DistributionPageHeader } from './DistributionPageHeader';
export { EmptySubmissionsCard } from './EmptySubmissionsCard';
export { PlatformTabContent } from './PlatformTabContent';
export { PreReleaseTab } from './PreReleaseTab';
export { RejectionWarningCard } from './RejectionWarningCard';
export { SubmissionManagementCard } from './SubmissionManagementCard';

// ============================================================================
// Component Types
// ============================================================================
export type {
  ActionAvailability,
  ApprovalState,
  BuildState, BuildStatusCardProps,
  BuildSummaryState,
  DistributionStatusPanelProps,
  ExtraCommitsWarningProps,
  ManualApprovalDialogProps,
  PlatformSubmissionCardProps,
  PMApprovalStatusProps,
  PreReleaseStageProps,
  RejectionDetailsCardProps,
  RolloutControlsProps,
  RolloutProgressBarProps,
  SubmissionCardProps,
  SubmitToStoresFormProps,
  UploadAABFormProps,
  VerifyTestFlightFormProps
} from '~/types/distribution/distribution-component.types';

export type { ExposureControlConflictDetails, ExposureControlDialogProps } from './ExposureControlDialog';
export type { PauseRolloutDialogProps } from './PauseRolloutDialog';
export type { RejectedSubmissionViewProps } from './RejectedSubmissionView';
export type { PlatformReleaseInfo, ReleaseCompleteViewProps } from './ReleaseCompleteView';
export type { ResubmissionDialogProps } from './ReSubmissionDialog';
export type { ResumeRolloutDialogProps } from './ResumeRolloutDialog';
export type { VersionConflictDetails, VersionConflictDialogProps } from './VersionConflictDialog';

// Page Layout Component Types
export type { DistributionPageHeaderProps } from './DistributionPageHeader';
export type { EmptySubmissionsCardProps } from './EmptySubmissionsCard';
export type { PlatformTabContentProps } from './PlatformTabContent';
export type { PreReleaseTabProps } from './PreReleaseTab';
export type { SubmissionManagementCardProps } from './SubmissionManagementCard';

