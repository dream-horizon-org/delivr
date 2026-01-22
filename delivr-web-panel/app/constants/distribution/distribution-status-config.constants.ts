/**
 * SINGLE SOURCE OF TRUTH for Submission Status Behavior
 * 
 * This configuration defines ALL characteristics and rules for each submission status.
 * All utility functions and UI logic MUST derive from this configuration.
 * 
 * DO NOT hardcode status checks elsewhere - query this configuration instead.
 */

import { Platform, SubmissionStatus } from '~/types/distribution/distribution.types';

/**
 * Status characteristics configuration
 */
export interface SubmissionStatusConfig {
  /** High-level category for UI rendering */
  category: 'pending' | 'reviewing' | 'approved' | 'active' | 'paused' | 'completed' | 'error' | 'cancelled';
  
  /** Display label for UI */
  label: string;
  
  /** Color for badges/indicators */
  color: string;
  
  /** State flags */
  flags: {
    isPaused: boolean;           // Is rollout paused?
    isActive: boolean;           // Is actively rolling out?
    isError: boolean;            // Needs user action/resubmission?
    isTerminal: boolean;         // Final state, no further actions?
    isReviewable: boolean;       // Waiting for store review?
    canResubmit: boolean;        // Can create new submission?
    showsProgressBar: boolean;   // Should display rollout progress bar?
  };
  
  /** Action availability (platform-agnostic rules) */
  actions: {
    canUpdateRollout: boolean;   // Can adjust rollout percentage?
    canPause: boolean;           // Can pause rollout?
    canResume: boolean;          // Can resume from pause?
    canCancel: boolean;          // Can cancel submission?
  };
  
  /** Platform-specific overrides */
  platformOverrides?: {
    [Platform.ANDROID]?: Partial<SubmissionStatusConfig>;
    [Platform.IOS]?: Partial<SubmissionStatusConfig>;
  };
}

/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH: SUBMISSION STATUS CONFIGURATION
 * ============================================================================
 * 
 * All status behavior is defined here. Do not hardcode status checks elsewhere.
 */
export const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatus, SubmissionStatusConfig> = {
  // ============================
  // PENDING (Not yet submitted)
  // ============================
  [SubmissionStatus.PENDING]: {
    category: 'pending',
    label: 'Pending',
    color: 'gray',
    flags: {
      isPaused: false,
      isActive: false,
      isError: false,
      isTerminal: false,
      isReviewable: false,
      canResubmit: false,
      showsProgressBar: false,  // No progress to show yet
    },
    actions: {
      canUpdateRollout: false,
      canPause: false,
      canResume: false,
      canCancel: false,
    },
  },

  // ============================
  // SUBMITTED (Both platforms - submitted to store, awaiting review)
  // ============================
  [SubmissionStatus.SUBMITTED]: {
    category: 'reviewing',
    label: 'Submitted',
    color: 'blue',
    flags: {
      isPaused: false,
      isActive: false,
      isError: false,
      isTerminal: false,
      isReviewable: true,
      canResubmit: false,
      showsProgressBar: false,  // In review, no rollout progress yet
    },
    actions: {
      canUpdateRollout: false,
      canPause: false,
      canResume: false,
      canCancel: false, // Platform-specific override below
    },
    platformOverrides: {
      [Platform.IOS]: {
        actions: {
          canUpdateRollout: false,
          canPause: false,
          canResume: false,
          canCancel: true, // iOS can cancel during submission review
        },
      },
    },
  },

  // ============================
  // IN_REVIEW (iOS - waiting for App Store review)
  // ============================
  [SubmissionStatus.IN_REVIEW]: {
    category: 'reviewing',
    label: 'In Review',
    color: 'yellow',
    flags: {
      isPaused: false,
      isActive: false,
      isError: false,
      isTerminal: false,
      isReviewable: true,
      canResubmit: false,
      showsProgressBar: false,  // In review, no rollout progress yet
    },
    actions: {
      canUpdateRollout: false,
      canPause: false,
      canResume: false,
      canCancel: false, // Platform-specific override below
    },
    platformOverrides: {
      [Platform.IOS]: {
        actions: {
          canUpdateRollout: false,
          canPause: false,
          canResume: false,
          canCancel: true, // iOS can cancel during review
        },
      },
    },
  },

  // ============================
  // APPROVED (Store approved, ready to release)
  // ============================
  [SubmissionStatus.APPROVED]: {
    category: 'approved',
    label: 'Approved',
    color: 'cyan',
    flags: {
      isPaused: false,
      isActive: false,
      isError: false,
      isTerminal: false,
      isReviewable: false,
      canResubmit: false,
      showsProgressBar: true,  // Show progress bar - ready to release
    },
    actions: {
      canUpdateRollout: false,  // Can start rollout
      canPause: false,
      canResume: false,
      canCancel: false, // Platform-specific override below
    },
    platformOverrides: {
      [Platform.IOS]: {
        actions: {
          canUpdateRollout: false, // Cannot update rollout - not yet released
          canPause: false,
          canResume: false,
          canCancel: true, // iOS can cancel before release
        },
      },
    },
  },

  // ============================
  // IN_PROGRESS (Android - actively rolling out)
  // ============================
  [SubmissionStatus.IN_PROGRESS]: {
    category: 'active',
    label: 'In Progress',
    color: 'green',
    flags: {
      isPaused: false,
      isActive: true,
      isError: false,
      isTerminal: false,
      isReviewable: false,
      canResubmit: false,
      showsProgressBar: true,  // Show rollout progress
    },
    actions: {
      canUpdateRollout: true,
      canPause: true,  // Android can pause to HALTED
      canResume: false,
      canCancel: false,
    },
  },

  // ============================
  // LIVE (iOS - live to users)
  // ============================
  [SubmissionStatus.LIVE]: {
    category: 'active',
    label: 'Live',
    color: 'green',
    flags: {
      isPaused: false,
      isActive: true,
      isError: false,
      isTerminal: false,
      isReviewable: false,
      canResubmit: false,
      showsProgressBar: true,  // Show rollout progress
    },
    actions: {
      canUpdateRollout: true,  // iOS can complete early if phased release
      canPause: true,          // iOS can pause phased release
      canResume: false,
      canCancel: false,
    },
  },

  // ============================
  // PAUSED (iOS - phased release paused)
  // ============================
  [SubmissionStatus.PAUSED]: {
    category: 'paused',
    label: 'Rollout Paused',
    color: 'orange',
    flags: {
      isPaused: true,
      isActive: false,
      isError: false,
      isTerminal: false,
      isReviewable: false,
      canResubmit: false,
      showsProgressBar: true,  // Show paused progress
    },
    actions: {
      canUpdateRollout: false,
      canPause: false,
      canResume: true,  // Can resume to LIVE
      canCancel: false,
    },
  },

  // ============================
  // HALTED (Android - rollout paused/halted)
  // ============================
  [SubmissionStatus.HALTED]: {
    category: 'paused',
    label: 'Rollout Paused',  // Displayed same as PAUSED for consistency
    color: 'orange',
    flags: {
      isPaused: true,
      isActive: false,
      isError: false,
      isTerminal: false,
      isReviewable: false,
      canResubmit: false,
      showsProgressBar: true,  // Show paused progress
    },
    actions: {
      canUpdateRollout: false,  // 🚨 CRITICAL: Must resume first before updating rollout
      canPause: false,
      canResume: true,  // Can resume to IN_PROGRESS
      canCancel: false,
    },
  },

  // ============================
  // COMPLETED (100% rollout complete)
  // ============================
  [SubmissionStatus.COMPLETED]: {
    category: 'completed',
    label: 'Completed',
    color: 'green',
    flags: {
      isPaused: false,
      isActive: false,
      isError: false,
      isTerminal: true,
      isReviewable: false,
      canResubmit: false,
      showsProgressBar: true,  // Show 100% complete progress
    },
    actions: {
      canUpdateRollout: false,
      canPause: false,
      canResume: false,
      canCancel: false,
    },
  },

  // ============================
  // REJECTED (iOS - Store rejected)
  // ============================
  [SubmissionStatus.REJECTED]: {
    category: 'error',
    label: 'Rejected',
    color: 'red',
    flags: {
      isPaused: false,
      isActive: false,
      isError: true,
      isTerminal: false,
      isReviewable: false,
      canResubmit: true,  // Can resubmit
      showsProgressBar: false,  // No progress for rejected submissions
    },
    actions: {
      canUpdateRollout: false,
      canPause: false,
      canResume: false,
      canCancel: false,
    },
  },

  // ============================
  // CANCELLED (iOS - User cancelled)
  // ============================
  [SubmissionStatus.CANCELLED]: {
    category: 'cancelled',
    label: 'Cancelled',
    color: 'gray',
    flags: {
      isPaused: false,
      isActive: false,
      isError: false,
      isTerminal: true,
      isReviewable: false,
      canResubmit: true,  // Can resubmit
      showsProgressBar: false,  // No progress for cancelled submissions
    },
    actions: {
      canUpdateRollout: false,
      canPause: false,
      canResume: false,
      canCancel: false,
    },
  },

  // ============================
  // USER_ACTION_PENDING (Android - needs user verification)
  // ============================
  [SubmissionStatus.USER_ACTION_PENDING]: {
    category: 'error',
    label: 'User Action Pending',
    color: 'orange',
    flags: {
      isPaused: false,
      isActive: false,
      isError: true,
      isTerminal: false,
      isReviewable: false,
      canResubmit: true,  // Can resubmit after checking Play Store
      showsProgressBar: false,  // No progress - waiting for user action
    },
    actions: {
      canUpdateRollout: false,
      canPause: false,
      canResume: false,
      canCancel: false,
    },
  },

  // ============================
  // SUSPENDED (Android - terminal state after prolonged inaction)
  // ============================
  [SubmissionStatus.SUSPENDED]: {
    category: 'error',
    label: 'Suspended',
    color: 'red',
    flags: {
      isPaused: false,
      isActive: false,
      isError: true,
      isTerminal: true,
      isReviewable: false,
      canResubmit: false,  // Terminal state, no resubmission
      showsProgressBar: false,  // No progress - terminal state
    },
    actions: {
      canUpdateRollout: false,
      canPause: false,
      canResume: false,
      canCancel: false,
    },
  },
};

/**
 * ============================================================================
 * HELPER: Get status configuration with platform overrides applied
 * ============================================================================
 */
export function getStatusConfig(
  status: SubmissionStatus,
  platform?: Platform
): SubmissionStatusConfig {
  const baseConfig = SUBMISSION_STATUS_CONFIG[status];
  
  if (!platform || !baseConfig.platformOverrides?.[platform]) {
    return baseConfig;
  }
  
  // Deep merge platform overrides
  const override = baseConfig.platformOverrides[platform];
  return {
    ...baseConfig,
    ...override,
    flags: {
      ...baseConfig.flags,
      ...(override.flags || {}),
    },
    actions: {
      ...baseConfig.actions,
      ...(override.actions || {}),
    },
  };
}

