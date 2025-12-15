/**
 * useSubmitModalProps Hook
 * Extracts complex logic for determining submit modal props
 * Follows clean architecture: no logic in JSX
 */

import { useMemo } from 'react';
import {
  DistributionStatus,
  Platform,
  type DistributionEntry
} from '~/types/distribution.types';

export type SubmitModalPropsData = {
  isFirstSubmission: boolean;
  androidArtifact?: {
    name: string;
    size: string;
    internalTrackLink?: string;
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

    // Extract Android artifact if available
    const androidArtifact =
      distribution.platforms.includes(Platform.ANDROID) &&
      distribution.artifacts?.android
        ? {
            name: distribution.artifacts.android.name,
            size: distribution.artifacts.android.size,
            internalTrackLink:
              distribution.artifacts.android.internalTrackLink,
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
      androidArtifact,
      iosArtifact,
    };
  }, [distribution]);
}

