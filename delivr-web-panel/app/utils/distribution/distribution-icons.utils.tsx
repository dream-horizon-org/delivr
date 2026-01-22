/**
 * Distribution Icons Utilities
 * Helper functions that return JSX icons
 * These functions CAN return JSX (unlike pure utils)
 */

import {
  IconCheck,
  IconClock,
  IconPlayerPause,
  IconProgress,
  IconX,
  IconBrandAndroid,
  IconBrandApple,
} from '@tabler/icons-react';
import { DistributionStatus, Platform, SubmissionStatus } from '~/types/distribution/distribution.types';

/**
 * Get status icon based on status enum
 */
export function getStatusIcon(status: string) {
  // Distribution-level statuses
  if (status === DistributionStatus.PENDING) return <IconClock size={14} />;
  if (status === DistributionStatus.PARTIALLY_SUBMITTED) return <IconProgress size={14} />;
  if (status === DistributionStatus.SUBMITTED) return <IconProgress size={14} />;
  if (status === DistributionStatus.PARTIALLY_RELEASED) return <IconProgress size={14} />;
  if (status === DistributionStatus.RELEASED) return <IconCheck size={14} />;
  
  // Submission-level statuses
  switch (status) {
    // Success states (Android: IN_PROGRESS, COMPLETED; iOS: APPROVED, LIVE)
    case SubmissionStatus.IN_PROGRESS:
    case SubmissionStatus.COMPLETED:
    case SubmissionStatus.LIVE:
    case SubmissionStatus.APPROVED:
      return <IconCheck size={14} />;
    
    // In-review/pending states
    case SubmissionStatus.SUBMITTED:  // Android: submitted to Play Store
    case SubmissionStatus.IN_REVIEW:  // iOS: awaiting Apple review
    case SubmissionStatus.PENDING:
      return <IconClock size={14} />;
    
    // Paused states (both platforms)
    case SubmissionStatus.PAUSED:     // iOS: phased release paused
    case SubmissionStatus.HALTED:     // Android: rollout paused (resumable)
      return <IconPlayerPause size={14} />;
    
    // Error/terminal states
    case SubmissionStatus.REJECTED:   // iOS: rejected by Apple
    case SubmissionStatus.USER_ACTION_PENDING:  // Android: needs user action
    case SubmissionStatus.SUSPENDED:  // Android: terminal suspended state
      return <IconX size={14} />;
    
    case SubmissionStatus.CANCELLED:  // iOS: user cancelled
      return <IconPlayerPause size={14} />;
    
    default:
      return <IconClock size={14} />;
  }
}

/**
 * Get platform icon with size and stroke
 */
export function getPlatformIcon(platform: Platform, size: number = 24, stroke: number = 2) {
  return platform === Platform.ANDROID ? (
    <IconBrandAndroid size={size} stroke={stroke} />
  ) : (
    <IconBrandApple size={size} stroke={stroke} />
  );
}

