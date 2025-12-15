/**
 * Distribution Service
 * Business logic for distribution operations
 */

import { DistributionRepository } from '~models/distribution';
import { IosSubmissionBuildRepository } from '~models/distribution';
import { AndroidSubmissionBuildRepository } from '~models/distribution';
import { SubmissionActionHistoryRepository } from '~models/distribution';
import type { Distribution } from '~types/distribution/distribution.interface';
import type { IosSubmissionBuild } from '~types/distribution/ios-submission.interface';
import type { AndroidSubmissionBuild } from '~types/distribution/android-submission.interface';
import type { SubmissionActionHistory } from '~types/distribution/submission-action-history.interface';
import { SUBMISSION_PLATFORM } from '~types/distribution/submission.constants';

/**
 * Formatted submission response (matches API contract)
 */
type FormattedSubmission = 
  | {
      id: string;
      distributionId: string;
      platform: 'IOS';
      storeType: string;
      status: string;
      version: string;
      releaseType: string;
      phasedRelease: boolean | null;
      resetRating: boolean | null;
      rolloutPercentage: number;
      releaseNotes: string;
      submittedAt: Date | null;
      submittedBy: string | null;
      statusUpdatedAt: Date;
      createdAt: Date;
      updatedAt: Date;
      artifact: {
        testflightNumber: string;
      };
      actionHistory: Array<{
        action: string;
        createdBy: string;
        createdAt: Date;
        reason: string;
      }>;
    }
  | {
      id: string;
      distributionId: string;
      platform: 'ANDROID';
      storeType: string;
      status: string;
      version: string;
      versionCode: number;
      rolloutPercentage: number;
      inAppUpdatePriority: number;
      releaseNotes: string;
      submittedAt: Date | null;
      submittedBy: string | null;
      statusUpdatedAt: Date;
      createdAt: Date;
      updatedAt: Date;
      artifact: {
        artifactPath: string;
        internalTrackLink: string | null;
      };
      actionHistory: Array<{
        action: string;
        createdBy: string;
        createdAt: Date;
        reason: string;
      }>;
    };

/**
 * Distribution with submissions and action history
 */
export type DistributionWithSubmissions = {
  id: string;
  releaseId: string;
  branch: string;
  status: string;
  platforms: string[];
  createdAt: Date;
  updatedAt: Date;
  submissions: FormattedSubmission[];
};

/**
 * Distribution Service
 */
export class DistributionService {
  constructor(
    private readonly distributionRepository: DistributionRepository,
    private readonly iosSubmissionRepository: IosSubmissionBuildRepository,
    private readonly androidSubmissionRepository: AndroidSubmissionBuildRepository,
    private readonly actionHistoryRepository: SubmissionActionHistoryRepository
  ) {}

  /**
   * Get distribution by release ID with all submissions and action history
   */
  async getDistributionByReleaseId(releaseId: string): Promise<DistributionWithSubmissions | null> {
    // Get distribution
    const distribution = await this.distributionRepository.findByReleaseId(releaseId);
    if (!distribution) {
      return null;
    }

    // Get all submissions for this distribution
    const iosSubmissions = await this.iosSubmissionRepository.findByDistributionId(distribution.id);
    const androidSubmissions = await this.androidSubmissionRepository.findByDistributionId(distribution.id);

    // Get action history for all submissions
    const allSubmissionIds = [
      ...iosSubmissions.map(s => s.id),
      ...androidSubmissions.map(s => s.id)
    ];

    const allActionHistories = await Promise.all(
      allSubmissionIds.map(id => this.actionHistoryRepository.findBySubmissionId(id))
    );

    // Create a map of submission ID to action history
    const actionHistoryMap = new Map<string, SubmissionActionHistory[]>();
    allSubmissionIds.forEach((id, index) => {
      actionHistoryMap.set(id, allActionHistories[index]);
    });

    // Format iOS submissions to match expected response structure
    const formattedIosSubmissions = iosSubmissions.map(submission => {
      const actionHistory = actionHistoryMap.get(submission.id) ?? [];
      return {
        id: submission.id,
        distributionId: submission.distributionId,
        platform: 'IOS' as const,
        storeType: submission.storeType,
        status: submission.status,
        version: submission.version,
        releaseType: submission.releaseType,
        phasedRelease: submission.phasedRelease,
        resetRating: submission.resetRating,
        rolloutPercentage: submission.rolloutPercentage ?? 0,
        releaseNotes: submission.releaseNotes ?? '',
        submittedAt: submission.submittedAt,
        submittedBy: submission.submittedBy,
        statusUpdatedAt: submission.statusUpdatedAt,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        artifact: {
          testflightNumber: submission.testflightNumber
        },
        actionHistory: actionHistory.map(history => ({
          action: history.action,
          createdBy: history.createdBy,
          createdAt: history.createdAt,
          reason: history.reason
        }))
      };
    });

    // Format Android submissions to match expected response structure
    const formattedAndroidSubmissions = androidSubmissions.map(submission => {
      const actionHistory = actionHistoryMap.get(submission.id) ?? [];
      return {
        id: submission.id,
        distributionId: submission.distributionId,
        platform: 'ANDROID' as const,
        storeType: submission.storeType,
        status: submission.status,
        version: submission.version,
        versionCode: submission.versionCode,
        rolloutPercentage: submission.rolloutPercentage ?? 0,
        inAppUpdatePriority: submission.inAppUpdatePriority ?? 0,
        releaseNotes: submission.releaseNotes ?? '',
        submittedAt: submission.submittedAt,
        submittedBy: submission.submittedBy,
        statusUpdatedAt: submission.statusUpdatedAt,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        artifact: {
          artifactPath: submission.artifactPath,
          internalTrackLink: submission.internalTrackLink
        },
        actionHistory: actionHistory.map(history => ({
          action: history.action,
          createdBy: history.createdBy,
          createdAt: history.createdAt,
          reason: history.reason
        }))
      };
    });

    // Combine all submissions
    const allSubmissions = [...formattedIosSubmissions, ...formattedAndroidSubmissions];

    // Format distribution to match expected response structure
    return {
      id: distribution.id,
      releaseId: distribution.releaseId,
      branch: distribution.branch,
      status: distribution.status,
      platforms: distribution.configuredListOfPlatforms,
      createdAt: distribution.createdAt,
      updatedAt: distribution.updatedAt,
      submissions: allSubmissions
    };
  }
}

