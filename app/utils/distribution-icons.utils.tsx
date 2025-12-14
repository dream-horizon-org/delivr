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
import { DistributionStatus, Platform, SubmissionStatus } from '~/types/distribution.types';

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
    case SubmissionStatus.LIVE:
    case SubmissionStatus.APPROVED:
      return <IconCheck size={14} />;
    case SubmissionStatus.IN_REVIEW:
      return <IconClock size={14} />;
    case SubmissionStatus.PAUSED:
      return <IconPlayerPause size={14} />;
    case SubmissionStatus.REJECTED:
      return <IconX size={14} />;
    case SubmissionStatus.HALTED:
    case SubmissionStatus.CANCELLED:
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

