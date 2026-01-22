/**
 * Custom hook for version suggestions in release creation
 * Handles automatic version and branch name suggestions based on existing releases
 */

import { useEffect, useMemo } from 'react';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import type { ReleaseType, PlatformTargetWithVersion } from '~/types/release-creation-backend';
import { 
  getVersionSuggestions, 
  applyVersionSuggestions 
} from '~/utils/release-version-suggestions';
import { DEFAULT_VERSIONS, DEFAULT_BRANCH_PATTERNS } from '~/constants/release-creation';

interface UseVersionSuggestionsParams {
  releases: BackendReleaseResponse[];
  releaseType: ReleaseType | undefined;
  platformTargets: PlatformTargetWithVersion[] | undefined;
  currentBranch: string | undefined;
  isEditMode: boolean;
}

interface UseVersionSuggestionsResult {
  suggestions: ReturnType<typeof getVersionSuggestions> | null;
  needsVersionSuggestions: boolean;
  shouldUpdateBranch: (newBranchName: string, versionsChanged: boolean) => boolean;
}

export function useVersionSuggestions({
  releases,
  releaseType,
  platformTargets,
  currentBranch,
  isEditMode,
}: UseVersionSuggestionsParams): UseVersionSuggestionsResult {
  // Check if versions need suggestions
  const needsVersionSuggestions = useMemo(() => {
    if (!platformTargets || platformTargets.length === 0) return false;
    
    return platformTargets.some(
      (pt) => !pt.version || 
              pt.version === '' || 
              DEFAULT_VERSIONS.includes(pt.version as any)
    );
  }, [platformTargets]);

  // Calculate suggestions
  const suggestions = useMemo(() => {
    if (isEditMode || !releaseType || !platformTargets || platformTargets.length === 0 || releases.length === 0) {
      return null;
    }

    try {
      return getVersionSuggestions(releases, releaseType, platformTargets);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useVersionSuggestions] Failed to generate suggestions:', error);
      }
      return null;
    }
  }, [releases, releaseType, platformTargets, isEditMode]);

  // Determine if branch should be updated
  const shouldUpdateBranch = (newBranchName: string, versionsChanged: boolean): boolean => {
    if (versionsChanged) return true;
    if (!currentBranch || currentBranch === '') return true;
    if (DEFAULT_BRANCH_PATTERNS.includes(currentBranch as any)) return true;
    if (newBranchName && !currentBranch.includes('android') && !currentBranch.includes('ios')) {
      return true;
    }
    return false;
  };

  return {
    suggestions,
    needsVersionSuggestions,
    shouldUpdateBranch,
  };
}
