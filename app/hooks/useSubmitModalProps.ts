/**
 * useSubmitModalProps Hook
 * Extracts complex logic for determining submit modal props
 * Follows clean architecture: no logic in JSX
 */

import { useMemo } from 'react';
import {
  DistributionStatus,
  Platform,
  SubmissionStatus,
  type DistributionEntry,
} from '~/types/distribution.types';

export type SubmitModalPropsData = {
  isFirstSubmission: boolean;
  isResubmission: boolean;
  androidArtifact?: {
    name: string;
    size: string;
    internalTestingLink?: string;
  };
  iosArtifact?: {
    buildNumber: string;
    testflightLink?: string;
  };
};

/**
 * Hook to derive submit modal props from distribution entry
 */
export function useSubmitModalProps(
  distribution: DistributionEntry | null
): SubmitModalPropsData | null {
  return useMemo(() => {
    if (!distribution) return null;

    // Check if this is the first submission
    const isFirstSubmission =
      distribution.status === DistributionStatus.PENDING &&
      distribution.submissions.length === 0;

    // Check if this is a resubmission (after rejection or cancellation)
    const isResubmission = distribution.submissions.some(
      (s) =>
        s.status === SubmissionStatus.REJECTED ||
        s.status === SubmissionStatus.CANCELLED
    );

    // Extract Android artifact if available
    const androidArtifact =
      distribution.platforms.includes(Platform.ANDROID) &&
      distribution.artifacts?.android
        ? {
            name: distribution.artifacts.android.name,
            size: distribution.artifacts.android.size,
            internalTestingLink:
              distribution.artifacts.android.internalTestingLink,
          }
        : undefined;

    // Extract iOS artifact if available
    const iosArtifact =
      distribution.platforms.includes(Platform.IOS) &&
      distribution.artifacts?.ios
        ? {
            buildNumber: distribution.artifacts.ios.buildNumber,
            testflightLink: distribution.artifacts.ios.testflightLink,
          }
        : undefined;

    return {
      isFirstSubmission,
      isResubmission,
      androidArtifact,
      iosArtifact,
    };
  }, [distribution]);
}

