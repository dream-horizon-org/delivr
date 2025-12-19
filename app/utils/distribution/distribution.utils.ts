/**
 * Distribution Module - Pure Utility Functions
 * 
 * Reusable, testable functions with no React dependencies.
 * Each function is a single-purpose, deterministic transformation.
 * 
 * NOTE: For submission status-related logic, use distribution-state.utils.ts
 * which queries the Single Source of Truth (SSOT) configuration.
 */

import {
  BUILD_UPLOAD_STATUS_COLORS,
  BUILD_UPLOAD_STATUS_LABELS,
  RELEASE_STATUS_COLORS,
  ROLLOUT_COMPLETE_PERCENT,
  ROLLOUT_STATUS_COLORS,
  ROLLOUT_STATUS_LABELS,
} from '~/constants/distribution/distribution.constants';
import type {
  ActionAvailability,
  ApprovalState,
  BuildState,
} from '~/types/distribution/distribution-component.types';
import type {
  AvailableAction,
  Build,
  PMApprovalStatus,
  RolloutAction,
} from '~/types/distribution/distribution.types';
import {
  BuildStrategy,
  BuildUploadStatus,
  DistributionStatus,
  Platform,
  RolloutDisplayStatus,
  SubmissionAction,
  SubmissionStatus,
} from '~/types/distribution/distribution.types';
import { isSubmissionPaused, isSubmissionTerminal } from './distribution-state.utils';

// ============================================================================
// TYPE GUARDS
// ============================================================================


// ============================================================================
// PLATFORM UTILITIES
// ============================================================================

/**
 * Check if platform is Android
 */
export function isAndroidPlatform(platform: Platform): boolean {
  return platform === Platform.ANDROID;
}

/**
 * Check if platform is iOS
 */
export function isIOSPlatform(platform: Platform): boolean {
  return platform === Platform.IOS;
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format ISO date string to locale date
 */
export function formatDate(isoString: string | null): string {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleDateString();
}

/**
 * Format ISO date string to locale date and time
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString();
}

/**
 * Format ISO date string to relative time (e.g., "2 days ago", "3 hours ago")
 */
export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'N/A';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) {
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  }
  if (diffHour > 0) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  }
  if (diffMin > 0) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}

// ============================================================================
// BUILD UTILITIES
// ============================================================================

/**
 * Derive build state from props (pure function, not a hook)
 */
export function deriveBuildState(
  build: Build | null,
  platform: Platform,
  buildStrategy: BuildStrategy
): BuildState {
  const hasBuild = build !== null;
  const isUploaded = build?.buildUploadStatus === BuildUploadStatus.UPLOADED;
  const isUploading = build?.buildUploadStatus === BuildUploadStatus.UPLOADING;
  const isFailed = build?.buildUploadStatus === BuildUploadStatus.FAILED;
  const isPending = build?.buildUploadStatus === BuildUploadStatus.PENDING;
  
  const isManualMode = buildStrategy === BuildStrategy.MANUAL;
  const isAndroid = isAndroidPlatform(platform);
  const isIOS = isIOSPlatform(platform);
  
  const canUpload = isManualMode && isAndroid && !hasBuild;
  const canVerify = isManualMode && isIOS && !hasBuild;
  
  const testingLink = isAndroid 
    ? build?.internalTrackLink ?? null
    : build?.testflightNumber 
      ? `TestFlight #${build.testflightNumber}` 
      : null;

  const statusLabel = hasBuild 
    ? BUILD_UPLOAD_STATUS_LABELS[build.buildUploadStatus] 
    : 'Not Available';

  const statusColor = hasBuild 
    ? BUILD_UPLOAD_STATUS_COLORS[build.buildUploadStatus] 
    : 'gray';

  return {
    hasBuild,
    isUploaded,
    isUploading,
    isFailed,
    isPending,
    isManualMode,
    isAndroid,
    isIOS,
    canUpload,
    canVerify,
    testingLink,
    statusLabel,
    statusColor,
  };
}

// ============================================================================
// APPROVAL UTILITIES
// ============================================================================

/**
 * Derive approval state from PM status (pure function, not a hook)
 */
export function deriveApprovalState(pmStatus: PMApprovalStatus): ApprovalState {
  const hasIntegration = pmStatus.hasPmIntegration;
  const isApproved = pmStatus.approved;
  const requiresManualApproval = pmStatus.requiresManualApproval ?? false;
  const ticket = pmStatus.pmTicket;
  const blockedReason = pmStatus.blockedReason ?? null;
  
  const statusLabel = isApproved 
    ? 'Approved' 
    : hasIntegration 
      ? ticket?.status ?? 'Pending'
      : 'Manual Approval Required';

  const statusColor = isApproved ? 'green' : hasIntegration ? 'yellow' : 'orange';

  return {
    hasIntegration,
    isApproved,
    requiresManualApproval,
    ticket,
    blockedReason,
    statusLabel,
    statusColor,
  };
}

// ============================================================================
// ROLLOUT UTILITIES
// ============================================================================

/**
 * Derive action availability from props (pure function, not a hook)
 * 
 * NOTE: This function uses backend-provided availableActions array.
 * For direct status-based checks, use distribution-state.utils.ts functions.
 */
export function deriveActionAvailability(
  availableActions: AvailableAction[],
  status: SubmissionStatus,
  platform: Platform,
  currentPercentage: number
): ActionAvailability {
  const findAction = (actionName: RolloutAction) => 
    availableActions.find(a => a.action === actionName);

  const canUpdate = findAction(SubmissionAction.UPDATE_ROLLOUT as RolloutAction)?.enabled ?? false;
  const canPause = findAction(SubmissionAction.PAUSE as RolloutAction)?.enabled ?? false;
  const canResume = findAction(SubmissionAction.RESUME as RolloutAction)?.enabled ?? false;
  const canHalt = findAction(SubmissionAction.HALT as RolloutAction)?.enabled ?? false;

  const updateReason = findAction(SubmissionAction.UPDATE_ROLLOUT as RolloutAction)?.reason;
  const pauseReason = findAction(SubmissionAction.PAUSE as RolloutAction)?.reason;
  const resumeReason = findAction(SubmissionAction.RESUME as RolloutAction)?.reason;
  const haltReason = findAction(SubmissionAction.HALT as RolloutAction)?.reason;

  const supportsRollout = isAndroidPlatform(platform);
  
  // Query SSOT instead of hardcoded checks
  const isPaused = isSubmissionPaused(status);
  const isComplete = 
    isSubmissionTerminal(status) || // Use SSOT for terminal check
    currentPercentage === ROLLOUT_COMPLETE_PERCENT;

  return {
    canUpdate: canUpdate && supportsRollout,
    canPause,
    canResume,
    canHalt,
    updateReason,
    pauseReason,
    resumeReason,
    haltReason,
    supportsRollout,
    isPaused,
    isComplete,
  };
}

/**
 * Get rollout status for progress bar display.
 * Queries SSOT configuration instead of hardcoded status checks.
 */
export function getRolloutDisplayStatus(
  percentage: number,
  status: SubmissionStatus
): RolloutDisplayStatus {
  // Complete state
  if (percentage === ROLLOUT_COMPLETE_PERCENT || status === SubmissionStatus.COMPLETED) {
    return RolloutDisplayStatus.COMPLETE;
  }
  
  // Error/terminal states - Query SSOT
  if (isSubmissionTerminal(status) || 
      status === SubmissionStatus.REJECTED || 
      status === SubmissionStatus.SUSPENDED) {
    return RolloutDisplayStatus.HALTED;
  }
  
  // Paused states - Query SSOT
  if (isSubmissionPaused(status)) {
    return RolloutDisplayStatus.PAUSED;
  }
  
  // Default: Active rollout
  return RolloutDisplayStatus.ACTIVE;
}


// ============================================================================
// STATUS COLOR/LABEL UTILITIES
// ============================================================================

/** Status to color mapping for release status */
export function getReleaseStatusColor(status: DistributionStatus): string {
  return RELEASE_STATUS_COLORS[status];
}

/** Status to color mapping for rollout status */
export function getRolloutStatusColor(status: RolloutDisplayStatus): string {
  return ROLLOUT_STATUS_COLORS[status];
}

/** Status to label mapping for rollout status */
export function getRolloutStatusLabel(status: RolloutDisplayStatus): string {
  return ROLLOUT_STATUS_LABELS[status];
}
