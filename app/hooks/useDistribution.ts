/**
 * useDistribution Hook
 * 
 * Manages distribution stage state and logic
 * - Distribution status
 * - Submissions management
 * - Rollout controls
 * - Dialog visibility
 */

import { useCallback, useMemo, useState } from 'react';
import type {
  DistributionStatusData,
  Submission
} from '~/types/distribution.types';
import { DistributionStatus, Platform, SubmissionStatus as SubmissionStatusEnum } from '~/types/distribution.types';

// ============================================================================
// TYPES
// ============================================================================

type UseDistributionParams = {
  distributionStatus: DistributionStatusData;
  submissions: Submission[];
};

type UseDistributionReturn = {
  // Status
  releaseStatus: DistributionStatus;
  isComplete: boolean;
  isDistributing: boolean;
  isFailed: boolean;
  isHalted: boolean;
  overallProgress: number;
  
  // Submissions
  submissions: Submission[];
  androidSubmission: Submission | null;
  iosSubmission: Submission | null;
  hasSubmissions: boolean;
  
  // Submission states
  androidRejected: boolean;
  iosRejected: boolean;
  hasRejections: boolean;
  
  // Actions
  canSubmitToStores: boolean;
  canRetryAndroid: boolean;
  canRetryIOS: boolean;
  availablePlatforms: Platform[];
  
  // Rollout
  androidRolloutPercent: number;
  iosRolloutPercent: number;
  
  // UI state
  showSubmitDialog: boolean;
  showHaltDialog: boolean;
  selectedSubmissionForHalt: string | null;
  openSubmitDialog: () => void;
  closeSubmitDialog: () => void;
  openHaltDialog: (submissionId: string) => void;
  closeHaltDialog: () => void;
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDistribution(params: UseDistributionParams): UseDistributionReturn {
  const { distributionStatus, submissions } = params;

  // UI Dialog states
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showHaltDialog, setShowHaltDialog] = useState(false);
  const [selectedSubmissionForHalt, setSelectedSubmissionForHalt] = useState<string | null>(null);

  // Extract status info
  const releaseStatus = distributionStatus.releaseStatus;
  const isComplete = distributionStatus.isComplete;
  const overallProgress = distributionStatus.overallProgress;

  // Status flags
  const isDistributing = 
    releaseStatus === DistributionStatus.PARTIALLY_SUBMITTED ||
    releaseStatus === DistributionStatus.SUBMITTED ||
    releaseStatus === DistributionStatus.PARTIALLY_RELEASED ||
    releaseStatus === DistributionStatus.RELEASED;
  const isFailed = false; // FAILED status removed - handled at submission level
  const isHalted = false; // HALTED status removed - handled at submission level

  // Extract submissions by platform
  const androidSubmission = useMemo(() => {
    return submissions.find(s => s.platform === Platform.ANDROID) ?? null;
  }, [submissions]);

  const iosSubmission = useMemo(() => {
    return submissions.find(s => s.platform === Platform.IOS) ?? null;
  }, [submissions]);

  const hasSubmissions = androidSubmission !== null || iosSubmission !== null;

  // Submission states
  const androidRejected = androidSubmission?.submissionStatus === SubmissionStatusEnum.REJECTED;
  const iosRejected = iosSubmission?.submissionStatus === SubmissionStatusEnum.REJECTED;
  const hasRejections = androidRejected || iosRejected;

  // Rollout percentages
  const androidRolloutPercent = androidSubmission?.rolloutPercent ?? 0;
  const iosRolloutPercent = iosSubmission?.rolloutPercent ?? 0;

  // Actions availability
  const canSubmitToStores = useMemo(() => {
    // Can only submit when distribution is pending (not yet started)
    return releaseStatus === DistributionStatus.PENDING;
  }, [releaseStatus]);

  const canRetryAndroid = useMemo(() => {
    return androidRejected && androidSubmission !== null;
  }, [androidRejected, androidSubmission]);

  const canRetryIOS = useMemo(() => {
    return iosRejected && iosSubmission !== null;
  }, [iosRejected, iosSubmission]);

  // Available platforms for submission
  const availablePlatforms = useMemo(() => {
    const platforms: Platform[] = [];
    
    // Check if platform has builds ready from distributionStatus
    if (distributionStatus.platforms.android && !androidSubmission) {
      platforms.push(Platform.ANDROID);
    }
    if (distributionStatus.platforms.ios && !iosSubmission) {
      platforms.push(Platform.IOS);
    }
    
    return platforms;
  }, [distributionStatus.platforms, androidSubmission, iosSubmission]);

  // Dialog handlers
  const openSubmitDialog = useCallback(() => setShowSubmitDialog(true), []);
  const closeSubmitDialog = useCallback(() => setShowSubmitDialog(false), []);
  
  const openHaltDialog = useCallback((submissionId: string) => {
    setSelectedSubmissionForHalt(submissionId);
    setShowHaltDialog(true);
  }, []);
  
  const closeHaltDialog = useCallback(() => {
    setShowHaltDialog(false);
    setSelectedSubmissionForHalt(null);
  }, []);

  return {
    // Status
    releaseStatus,
    isComplete,
    isDistributing,
    isFailed,
    isHalted,
    overallProgress,
    
    // Submissions
    submissions,
    androidSubmission,
    iosSubmission,
    hasSubmissions,
    
    // Submission states
    androidRejected,
    iosRejected,
    hasRejections,
    
    // Actions
    canSubmitToStores,
    canRetryAndroid,
    canRetryIOS,
    availablePlatforms,
    
    // Rollout
    androidRolloutPercent,
    iosRolloutPercent,
    
    // UI state
    showSubmitDialog,
    showHaltDialog,
    selectedSubmissionForHalt,
    openSubmitDialog,
    closeSubmitDialog,
    openHaltDialog,
    closeHaltDialog,
  };
}

