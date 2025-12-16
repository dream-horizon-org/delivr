/**
 * Distribution Service
 * Business logic for distribution operations
 */

import { DistributionRepository } from '~models/distribution';
import { IosSubmissionBuildRepository } from '~models/distribution';
import { AndroidSubmissionBuildRepository } from '~models/distribution';
import { SubmissionActionHistoryRepository } from '~models/distribution';
import type { Distribution, DistributionFilters } from '~types/distribution/distribution.interface';
import type { IosSubmissionBuild } from '~types/distribution/ios-submission.interface';
import type { AndroidSubmissionBuild } from '~types/distribution/android-submission.interface';
import type { SubmissionActionHistory } from '~types/distribution/submission-action-history.interface';
import { SUBMISSION_PLATFORM } from '~types/distribution/submission.constants';
import type { DistributionStatus } from '~types/distribution/distribution.constants';

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
      isActive: boolean;
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
      isActive: boolean;
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
  statusUpdatedAt: Date;
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
   * Get distribution by ID with all submissions and action history
   */
  async getDistributionById(distributionId: string): Promise<DistributionWithSubmissions | null> {
    // Get distribution
    const distribution = await this.distributionRepository.findById(distributionId);
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
        isActive: submission.isActive,
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
        isActive: submission.isActive,
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
      statusUpdatedAt: distribution.statusUpdatedAt,
      submissions: allSubmissions
    };
  }

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
        isActive: submission.isActive,
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
        isActive: submission.isActive,
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
      statusUpdatedAt: distribution.statusUpdatedAt,
      submissions: allSubmissions
    };
  }

  /**
   * List all distributions with pagination, filtering, and stats
   */
  async listDistributions(
    filters: {
      status?: string;
      platform?: string;
      tenantId?: string;
    } = {},
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    distributions: Array<{
      id: string;
      branch: string;
      status: string;
      platforms: string[];
      createdAt: Date;
      updatedAt: Date;
      statusUpdatedAt: Date;
      submissions: Array<{
        id: string;
        platform: 'ANDROID' | 'IOS';
        version: string;
        status: string;
        rolloutPercentage: number;
        createdAt: Date;
        updatedAt: Date;
        statusUpdatedAt: Date;
      }>;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalItems: number;
      hasMore: boolean;
    };
    stats: {
      totalDistributions: number;
      totalSubmissions: number;
      inReviewSubmissions: number;
      releasedSubmissions: number;
    };
  }> {
    // Normalize platform filter to uppercase for case-insensitive comparison
    const normalizedPlatform = filters.platform ? filters.platform.toUpperCase() : undefined;

    // Build filters for repository
    const repositoryFilters: DistributionFilters = {};
    if (filters.status) {
      repositoryFilters.status = filters.status as DistributionStatus;
    }
    if (filters.tenantId) {
      repositoryFilters.tenantId = filters.tenantId;
    }

    // Get paginated distributions
    const { distributions, total } = await this.distributionRepository.findAllPaginated(
      repositoryFilters,
      page,
      pageSize
    );

    // Get ALL distributions for stats calculation (not just current page)
    const allDistributions = await this.distributionRepository.findAll(repositoryFilters);

    // Get latest submissions for each distribution in current page
    const distributionsWithSubmissions = await Promise.all(
      distributions.map(async (distribution) => {
        // Get latest submissions per platform
        const iosSubmission = await this.iosSubmissionRepository.findLatestByDistributionId(distribution.id);
        const androidSubmission = await this.androidSubmissionRepository.findLatestByDistributionId(distribution.id);

        // Filter by platform if specified (case-insensitive)
        const submissions: Array<{
          id: string;
          platform: 'ANDROID' | 'IOS';
          version: string;
          status: string;
          rolloutPercentage: number;
          createdAt: Date;
          updatedAt: Date;
          statusUpdatedAt: Date;
          isActive: boolean;
        }> = [];

        if (androidSubmission && (!normalizedPlatform || normalizedPlatform === 'ANDROID')) {
          submissions.push({
            id: androidSubmission.id,
            platform: 'ANDROID',
            version: androidSubmission.version,
            status: androidSubmission.status,
            rolloutPercentage: androidSubmission.rolloutPercentage ?? 0,
            createdAt: androidSubmission.createdAt,
            updatedAt: androidSubmission.updatedAt,
            statusUpdatedAt: androidSubmission.statusUpdatedAt,
            isActive: androidSubmission.isActive
          });
        }

        if (iosSubmission && (!normalizedPlatform || normalizedPlatform === 'IOS')) {
          submissions.push({
            id: iosSubmission.id,
            platform: 'IOS',
            version: iosSubmission.version,
            status: iosSubmission.status,
            rolloutPercentage: iosSubmission.rolloutPercentage ?? 0,
            createdAt: iosSubmission.createdAt,
            updatedAt: iosSubmission.updatedAt,
            statusUpdatedAt: iosSubmission.statusUpdatedAt,
            isActive: iosSubmission.isActive
          });
        }

        // If platform filter is specified and no submissions match, return null to filter out
        if (normalizedPlatform && submissions.length === 0) {
          return null;
        }

        // Calculate distribution's statusUpdatedAt as max of all submissions' statusUpdatedAt
        const submissionStatusDates = submissions.map(s => s.statusUpdatedAt);
        const distributionStatusUpdatedAt = submissionStatusDates.length > 0
          ? new Date(Math.max(...submissionStatusDates.map(d => d.getTime())))
          : distribution.statusUpdatedAt;

        return {
          id: distribution.id,
          branch: distribution.branch,
          status: distribution.status,
          platforms: distribution.configuredListOfPlatforms,
          createdAt: distribution.createdAt,
          updatedAt: distribution.updatedAt,
          statusUpdatedAt: distributionStatusUpdatedAt,
          submissions
        };
      })
    );

    // Filter out null distributions (those that don't match platform filter)
    const filteredDistributions = distributionsWithSubmissions.filter(d => d !== null) as Array<{
      id: string;
      branch: string;
      status: string;
      platforms: string[];
      createdAt: Date;
      updatedAt: Date;
      statusUpdatedAt: Date;
      submissions: Array<{
        id: string;
        platform: 'ANDROID' | 'IOS';
        version: string;
        status: string;
        rolloutPercentage: number;
        createdAt: Date;
        updatedAt: Date;
        statusUpdatedAt: Date;
        isActive: boolean;
      }>;
    }>;

    // Calculate stats from ALL distributions (not just current page)
    const allDistributionsWithSubmissions = await Promise.all(
      allDistributions.map(async (distribution) => {
        const iosSubmission = await this.iosSubmissionRepository.findLatestByDistributionId(distribution.id);
        const androidSubmission = await this.androidSubmissionRepository.findLatestByDistributionId(distribution.id);

        const submissions: Array<{
          id: string;
          platform: 'ANDROID' | 'IOS';
          status: string;
          rolloutPercentage: number;
        }> = [];

        if (androidSubmission) {
          submissions.push({
            id: androidSubmission.id,
            platform: 'ANDROID',
            status: androidSubmission.status,
            rolloutPercentage: androidSubmission.rolloutPercentage ?? 0
          });
        }

        if (iosSubmission) {
          submissions.push({
            id: iosSubmission.id,
            platform: 'IOS',
            status: iosSubmission.status,
            rolloutPercentage: iosSubmission.rolloutPercentage ?? 0
          });
        }

        return { submissions };
      })
    );

    // Calculate stats
    const totalSubmissions = allDistributionsWithSubmissions.reduce(
      (sum, d) => sum + d.submissions.length,
      0
    );

    const inReviewSubmissions = allDistributionsWithSubmissions.reduce(
      (sum, d) => sum + d.submissions.filter(s => s.status === 'IN_REVIEW').length,
      0
    );

    const releasedSubmissions = allDistributionsWithSubmissions.reduce(
      (sum, d) => sum + d.submissions.filter(s => s.status === 'LIVE' && s.rolloutPercentage === 100).length,
      0
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      distributions: filteredDistributions,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems: total,
        hasMore: page < totalPages
      },
      stats: {
        totalDistributions: allDistributions.length,
        totalSubmissions,
        inReviewSubmissions,
        releasedSubmissions
      }
    };
  }
}

