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

    // Note: Artifact details (AAB files, TestFlight builds) are not available in the list view
    // DistributionEntry only contains minimal submission info (SubmissionInDistribution[])
    // Full artifact details would require:
    // 1. Navigating to the detail view (which has full Submission objects), OR
    // 2. Fetching from a separate builds/artifacts endpoint
    // For now, return undefined - the submit modal will handle this gracefully

    return {
      isFirstSubmission,
      androidArtifact: undefined,
      iosArtifact: undefined,
    };
  }, [distribution]);
}

