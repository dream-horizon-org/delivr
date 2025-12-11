/**
 * Distribution Module - Pure Utility Functions
 * 
 * Reusable, testable functions with no React dependencies.
 * Each function is a single-purpose, deterministic transformation.
 */

import type {
  Platform,
  ReleaseStatus,
  SubmissionStatus,
  BuildUploadStatus,
  Build,
  PMApprovalStatus,
  SubmissionHistoryEventType,
  EventState,
  RolloutEventState,
  AvailableAction,
  RolloutAction,
  BuildStrategy,
} from '~/types/distribution.types';
import {
  BUILD_UPLOAD_STATUS_LABELS,
  BUILD_UPLOAD_STATUS_COLORS,
} from '~/constants/distribution.constants';

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if EventState is a RolloutEventState
 */
export function isRolloutState(value: EventState): value is RolloutEventState {
  return (
    value !== null &&
    typeof value === 'object' &&
    'percentage' in value &&
    typeof value.percentage === 'number'
  );
}

// ============================================================================
// PLATFORM UTILITIES
// ============================================================================

/**
 * Check if platform is Android
 */
export function isAndroidPlatform(platform: Platform): boolean {
  return platform === 'ANDROID';
}

/**
 * Check if platform is iOS
 */
export function isIOSPlatform(platform: Platform): boolean {
  return platform === 'IOS';
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format ISO date string to locale date
 */
export function formatDate(isoString: string): string {
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

/**
 * Derive build state from props (pure function, not a hook)
 */
export function deriveBuildState(
  build: Build | null,
  platform: Platform,
  buildStrategy: BuildStrategy
): BuildState {
  const hasBuild = build !== null;
  const isUploaded = build?.buildUploadStatus === 'UPLOADED';
  const isUploading = build?.buildUploadStatus === 'UPLOADING';
  const isFailed = build?.buildUploadStatus === 'FAILED';
  const isPending = build?.buildUploadStatus === 'PENDING';
  
  const isManualMode = buildStrategy === 'MANUAL';
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

/** Computed approval state */
export type ApprovalState = {
  hasIntegration: boolean;
  isApproved: boolean;
  requiresManualApproval: boolean;
  ticket: PMApprovalStatus['pmTicket'];
  blockedReason: string | undefined;
  statusLabel: string;
  statusColor: string;
};

/**
 * Derive approval state from PM status (pure function, not a hook)
 */
export function deriveApprovalState(pmStatus: PMApprovalStatus): ApprovalState {
  const hasIntegration = pmStatus.hasPmIntegration;
  const isApproved = pmStatus.approved;
  const requiresManualApproval = pmStatus.requiresManualApproval ?? false;
  const ticket = pmStatus.pmTicket;
  const blockedReason = pmStatus.blockedReason;
  
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

/** Action availability state */
export type ActionAvailability = {
  canUpdate: boolean;
  canPause: boolean;
  canResume: boolean;
  canHalt: boolean;
  updateReason: string | undefined;
  pauseReason: string | undefined;
  resumeReason: string | undefined;
  haltReason: string | undefined;
  supportsRollout: boolean;
  isPaused: boolean;
  isComplete: boolean;
};

/**
 * Derive action availability from props (pure function, not a hook)
 */
export function deriveActionAvailability(
  availableActions: AvailableAction<RolloutAction>[],
  status: SubmissionStatus,
  platform: Platform,
  currentPercentage: number
): ActionAvailability {
  const findAction = (actionName: RolloutAction) => 
    availableActions.find(a => a.action === actionName);

  const canUpdate = findAction('UPDATE_ROLLOUT')?.enabled ?? false;
  const canPause = findAction('PAUSE')?.enabled ?? false;
  const canResume = findAction('RESUME')?.enabled ?? false;
  const canHalt = findAction('HALT')?.enabled ?? false;

  const updateReason = findAction('UPDATE_ROLLOUT')?.reason;
  const pauseReason = findAction('PAUSE')?.reason;
  const resumeReason = findAction('RESUME')?.reason;
  const haltReason = findAction('HALT')?.reason;

  const supportsRollout = isAndroidPlatform(platform);
  const isPaused = status === 'IN_REVIEW';
  const isComplete = status === 'LIVE' && currentPercentage === 100;

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
 * Get rollout status for progress bar display
 */
export function getRolloutDisplayStatus(
  percentage: number,
  status: SubmissionStatus
): 'active' | 'paused' | 'halted' | 'complete' {
  if (percentage === 100) return 'complete';
  if (status === 'REJECTED' || status === 'HALTED') return 'halted';
  if (status === 'IN_REVIEW') return 'paused';
  return 'active';
}

/**
 * Get rollout percentage display string from event state
 */
export function getRolloutPercentageDisplay(newState: EventState): string {
  if (isRolloutState(newState)) {
    return `${newState.percentage}%`;
  }
  return newState ? String(newState) : 'N/A';
}

// ============================================================================
// STATUS COLOR/LABEL UTILITIES
// ============================================================================

/** Status to color mapping for release status */
export function getReleaseStatusColor(status: ReleaseStatus): string {
  const colorMap: Record<ReleaseStatus, string> = {
    PRE_RELEASE: 'gray',
    READY_FOR_SUBMISSION: 'cyan',
    COMPLETED: 'green',
  };
  return colorMap[status];
}

/** Status to color mapping for rollout status */
export function getRolloutStatusColor(status: 'active' | 'paused' | 'halted' | 'complete'): string {
  const colorMap = {
    complete: 'green',
    active: 'blue',
    paused: 'yellow',
    halted: 'red',
  };
  return colorMap[status];
}

/** Status to label mapping for rollout status */
export function getRolloutStatusLabel(status: 'active' | 'paused' | 'halted' | 'complete'): string {
  const labelMap = {
    complete: 'Complete',
    active: 'Active',
    paused: 'Paused',
    halted: 'Halted',
  };
  return labelMap[status];
}

// ============================================================================
// EVENT HISTORY UTILITIES
// ============================================================================

/** Event type to color mapping */
export function getEventColor(eventType: SubmissionHistoryEventType): string {
  const colorMap: Record<SubmissionHistoryEventType, string> = {
    SUBMITTED: 'blue',
    APPROVED: 'green',
    ROLLOUT_RESUMED: 'green',
    REJECTED: 'red',
    ROLLOUT_HALTED: 'red',
    ROLLOUT_PAUSED: 'yellow',
    ROLLOUT_UPDATED: 'cyan',
    RETRY_ATTEMPTED: 'orange',
    STATUS_CHANGED: 'gray',
  };
  return colorMap[eventType];
}

/** Event type to label mapping */
export function getEventLabel(eventType: SubmissionHistoryEventType): string {
  const labelMap: Record<SubmissionHistoryEventType, string> = {
    SUBMITTED: 'Submitted',
    STATUS_CHANGED: 'Status Changed',
    ROLLOUT_UPDATED: 'Rollout Updated',
    ROLLOUT_PAUSED: 'Rollout Paused',
    ROLLOUT_RESUMED: 'Rollout Resumed',
    ROLLOUT_HALTED: 'Rollout Halted',
    REJECTED: 'Rejected',
    APPROVED: 'Approved',
    RETRY_ATTEMPTED: 'Retry Attempted',
  };
  return labelMap[eventType];
}

