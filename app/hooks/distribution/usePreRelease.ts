/**
 * usePreRelease Hook
 * 
 * Manages pre-release stage state and logic
 * - Build status for Android/iOS
 * - PM approval status
 * - Extra commits warning
 * - Promotion readiness
 */

import { useCallback, useMemo, useState } from 'react';
import type {
  Build,
  BuildsSummary,
  ExtraCommitsData,
  PMApprovalStatus
} from '~/types/distribution/distribution.types';
import { ApproverRole, BuildUploadStatus as BuildStatus, BuildStrategy, Platform } from '~/types/distribution/distribution.types';

// ============================================================================
// TYPES
// ============================================================================

type UsePreReleaseParams = {
  builds: Build[];
  summary: BuildsSummary;
  pmStatus: PMApprovalStatus;
  extraCommits: ExtraCommitsData;
  buildStrategy?: BuildStrategy;
};

type UsePreReleaseReturn = {
  // Build states
  androidBuild: Build | null;
  iosBuild: Build | null;
  buildStrategy: BuildStrategy;
  
  // Build readiness
  androidReady: boolean;
  iosReady: boolean;
  allBuildsReady: boolean;
  
  // Approval state
  isApproved: boolean;
  requiresManualApproval: boolean;
  approverRole: ApproverRole;
  
  // Warnings
  hasExtraCommits: boolean;
  extraCommitsAcknowledged: boolean;
  acknowledgeExtraCommits: () => void;
  
  // Promotion
  canPromote: boolean;
  promotionBlockedReason: string | null;
  
  // UI state
  showUploadDialog: boolean;
  showVerifyDialog: boolean;
  showApprovalDialog: boolean;
  openUploadDialog: () => void;
  closeUploadDialog: () => void;
  openVerifyDialog: () => void;
  closeVerifyDialog: () => void;
  openApprovalDialog: () => void;
  closeApprovalDialog: () => void;
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function usePreRelease(params: UsePreReleaseParams): UsePreReleaseReturn {
  const { builds, summary, pmStatus, extraCommits, buildStrategy: configBuildStrategy } = params;

  // UI Dialog states
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [extraCommitsAcknowledged, setExtraCommitsAcknowledged] = useState(false);

  // Extract builds by platform
  const androidBuild = useMemo(() => {
    return builds.find(b => b.platform === Platform.ANDROID) ?? null;
  }, [builds]);

  const iosBuild = useMemo(() => {
    return builds.find(b => b.platform === Platform.IOS) ?? null;
  }, [builds]);

  // Determine build strategy (from config or infer from builds)
  const buildStrategy = useMemo(() => {
    if (configBuildStrategy) return configBuildStrategy;
    
    // Infer from existing builds
    const firstBuild = builds[0];
    return firstBuild?.buildStrategy ?? BuildStrategy.CICD;
  }, [configBuildStrategy, builds]);

  // Build readiness
  const androidReady = useMemo(() => {
    return summary.android.ready || androidBuild?.buildUploadStatus === BuildStatus.UPLOADED;
  }, [summary.android.ready, androidBuild]);

  const iosReady = useMemo(() => {
    return summary.ios.ready || iosBuild?.buildUploadStatus === BuildStatus.UPLOADED;
  }, [summary.ios.ready, iosBuild]);

  const allBuildsReady = useMemo(() => {
    // Check if both platforms are configured
    const hasAndroid = summary.android.exists || androidBuild !== null;
    const hasIOS = summary.ios.exists || iosBuild !== null;
    
    // If both platforms exist, both must be ready
    if (hasAndroid && hasIOS) {
      return androidReady && iosReady;
    }
    
    // If only one platform, that one must be ready
    if (hasAndroid) return androidReady;
    if (hasIOS) return iosReady;
    
    // No builds at all
    return false;
  }, [summary, androidBuild, iosBuild, androidReady, iosReady]);

  // Approval state
  const isApproved = pmStatus.approved;
  const requiresManualApproval = pmStatus.requiresManualApproval ?? !pmStatus.hasPmIntegration;
  const approverRole = pmStatus.approver ?? ApproverRole.RELEASE_LEAD;

  // Extra commits
  const hasExtraCommits = extraCommits.hasExtraCommits;

  // Promotion readiness
  const { canPromote, promotionBlockedReason } = useMemo(() => {
    // Check builds
    if (!allBuildsReady) {
      return {
        canPromote: false,
        promotionBlockedReason: 'All builds must be ready before promoting to distribution.',
      };
    }

    // Check approval
    if (!isApproved) {
      if (pmStatus.hasPmIntegration && pmStatus.pmTicket) {
        return {
          canPromote: false,
          promotionBlockedReason: `PM ticket "${pmStatus.pmTicket.id}" must be marked as DONE.`,
        };
      }
      return {
        canPromote: false,
        promotionBlockedReason: 'Release must be approved before promoting to distribution.',
      };
    }

    // Check extra commits (warning, but can proceed if acknowledged)
    if (hasExtraCommits && !extraCommitsAcknowledged) {
      return {
        canPromote: false,
        promotionBlockedReason: 'Please acknowledge the extra commits warning to proceed.',
      };
    }

    return {
      canPromote: true,
      promotionBlockedReason: null,
    };
  }, [allBuildsReady, isApproved, pmStatus, hasExtraCommits, extraCommitsAcknowledged]);

  // Dialog handlers
  const openUploadDialog = useCallback(() => setShowUploadDialog(true), []);
  const closeUploadDialog = useCallback(() => setShowUploadDialog(false), []);
  const openVerifyDialog = useCallback(() => setShowVerifyDialog(true), []);
  const closeVerifyDialog = useCallback(() => setShowVerifyDialog(false), []);
  const openApprovalDialog = useCallback(() => setShowApprovalDialog(true), []);
  const closeApprovalDialog = useCallback(() => setShowApprovalDialog(false), []);
  const acknowledgeExtraCommits = useCallback(() => setExtraCommitsAcknowledged(true), []);

  return {
    // Build states
    androidBuild,
    iosBuild,
    buildStrategy,
    
    // Build readiness
    androidReady,
    iosReady,
    allBuildsReady,
    
    // Approval state
    isApproved,
    requiresManualApproval,
    approverRole,
    
    // Warnings
    hasExtraCommits,
    extraCommitsAcknowledged,
    acknowledgeExtraCommits,
    
    // Promotion
    canPromote,
    promotionBlockedReason,
    
    // UI state
    showUploadDialog,
    showVerifyDialog,
    showApprovalDialog,
    openUploadDialog,
    closeUploadDialog,
    openVerifyDialog,
    closeVerifyDialog,
    openApprovalDialog,
    closeApprovalDialog,
  };
}

