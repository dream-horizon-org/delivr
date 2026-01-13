/**
 * Distribution Service
 * Business logic for distribution operations
 */

import { v4 as uuidv4 } from 'uuid';
import { DistributionRepository } from '~models/distribution';
import { IosSubmissionBuildRepository } from '~models/distribution';
import { AndroidSubmissionBuildRepository } from '~models/distribution';
import { SubmissionActionHistoryRepository } from '~models/distribution';
import { ReleaseRepository, BuildRepository, ReleasePlatformTargetMappingRepository } from '~models/release';
import type { Build } from '~models/release';
import type { Distribution, DistributionFilters } from '~types/distribution/distribution.interface';
import type { IosSubmissionBuild } from '~types/distribution/ios-submission.interface';
import type { AndroidSubmissionBuild } from '~types/distribution/android-submission.interface';
import type { SubmissionActionHistory } from '~types/distribution/submission-action-history.interface';
import { SUBMISSION_PLATFORM, ANDROID_SUBMISSION_STATUS } from '~types/distribution/submission.constants';
import type { DistributionStatus } from '~types/distribution/distribution.constants';
import { 
  BUILD_PLATFORM, 
  STORE_TYPE, 
  BUILD_STAGE, 
  BUILD_UPLOAD_STATUS 
} from '~types/release-management/builds/build.constants';
import { createAppleServiceFromIntegration } from './apple-app-store-connect.service';
import type { AppleAppStoreConnectService } from './apple-app-store-connect.service';
import type { MockAppleAppStoreConnectService } from './apple-app-store-connect.mock';
import { getStorage } from '../../storage/storage-instance';
import { StoreIntegrationController } from '../../storage/integrations/store/store-controller';
import { StoreType } from '../../storage/integrations/store/store-types';
import { getAccountDetails } from '~utils/account.utils';

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
      totalPauseDuration?: number | null;
      totalRemainingPauseDuration?: number | null;
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
    private readonly actionHistoryRepository: SubmissionActionHistoryRepository,
    private readonly releaseRepository: ReleaseRepository,
    private readonly buildRepository: BuildRepository,
    private readonly platformTargetMappingRepository: ReleasePlatformTargetMappingRepository
  ) {}

  /**
   * Get user email from user ID
   * Helper method to look up email for submissions
   */
  private async getUserEmail(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    try {
      const storage = getStorage();
      const accountDetails = await getAccountDetails(storage, userId, 'DistributionService');
      return accountDetails?.email ?? null;
    } catch (error) {
      console.error(`[DistributionService] Failed to get email for user ${userId}:`, error);
      return null;
    }
  }

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
    const formattedIosSubmissions = await Promise.all(
      iosSubmissions.map(async (submission) => {
        const actionHistory = actionHistoryMap.get(submission.id) ?? [];
        const submitterEmail = await this.getUserEmail(submission.submittedBy);
        const enrichedHistory = await Promise.all(
          actionHistory.map(async (history) => {
            const creatorEmail = await this.getUserEmail(history.createdBy);
            return {
              action: history.action,
              createdBy: creatorEmail ?? history.createdBy,
              createdAt: history.createdAt,
              reason: history.reason
            };
          })
        );
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
          submittedBy: submitterEmail ?? submission.submittedBy,
          statusUpdatedAt: submission.statusUpdatedAt,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt,
          isActive: submission.isActive,
          artifact: {
            testflightNumber: submission.testflightNumber
          },
          actionHistory: enrichedHistory
        };
      })
    );

    // Enrich iOS submissions with totalPauseDuration from Apple API
    await this.enrichIosSubmissionsWithPauseDuration(formattedIosSubmissions, distribution.tenantId);

    // Format Android submissions to match expected response structure
    const formattedAndroidSubmissions = await Promise.all(
      androidSubmissions.map(async (submission) => {
        const actionHistory = actionHistoryMap.get(submission.id) ?? [];
        const submitterEmail = await this.getUserEmail(submission.submittedBy);
        const enrichedHistory = await Promise.all(
          actionHistory.map(async (history) => {
            const creatorEmail = await this.getUserEmail(history.createdBy);
            return {
              action: history.action,
              createdBy: creatorEmail ?? history.createdBy,
              createdAt: history.createdAt,
              reason: history.reason
            };
          })
        );
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
          submittedBy: submitterEmail ?? submission.submittedBy,
          statusUpdatedAt: submission.statusUpdatedAt,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt,
          isActive: submission.isActive,
          artifact: {
            artifactPath: submission.artifactPath,
            internalTrackLink: submission.internalTrackLink
          },
          actionHistory: enrichedHistory
        };
      })
    );

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
    const formattedIosSubmissions = await Promise.all(
      iosSubmissions.map(async (submission) => {
        const actionHistory = actionHistoryMap.get(submission.id) ?? [];
        const submitterEmail = await this.getUserEmail(submission.submittedBy);
        const enrichedHistory = await Promise.all(
          actionHistory.map(async (history) => {
            const creatorEmail = await this.getUserEmail(history.createdBy);
            return {
              action: history.action,
              createdBy: creatorEmail ?? history.createdBy,
              createdAt: history.createdAt,
              reason: history.reason
            };
          })
        );
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
          submittedBy: submitterEmail ?? submission.submittedBy,
          statusUpdatedAt: submission.statusUpdatedAt,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt,
          isActive: submission.isActive,
          artifact: {
            testflightNumber: submission.testflightNumber
          },
          actionHistory: enrichedHistory
        };
      })
    );

    // Format Android submissions to match expected response structure
    const formattedAndroidSubmissions = await Promise.all(
      androidSubmissions.map(async (submission) => {
        const actionHistory = actionHistoryMap.get(submission.id) ?? [];
        const submitterEmail = await this.getUserEmail(submission.submittedBy);
        const enrichedHistory = await Promise.all(
          actionHistory.map(async (history) => {
            const creatorEmail = await this.getUserEmail(history.createdBy);
            return {
              action: history.action,
              createdBy: creatorEmail ?? history.createdBy,
              createdAt: history.createdAt,
              reason: history.reason
            };
          })
        );
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
          submittedBy: submitterEmail ?? submission.submittedBy,
          statusUpdatedAt: submission.statusUpdatedAt,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt,
          isActive: submission.isActive,
          artifact: {
            artifactPath: submission.artifactPath,
            internalTrackLink: submission.internalTrackLink
          },
          actionHistory: enrichedHistory
        };
      })
    );

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
      releaseId: string;
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

        // Enrich iOS submissions with current rollout percentage from Apple API
        const iosSubmissions = submissions.filter(s => s.platform === 'IOS') as Array<{
          id: string;
          platform: 'IOS';
          version: string;
          status: string;
          rolloutPercentage: number;
          createdAt: Date;
          updatedAt: Date;
          statusUpdatedAt: Date;
          isActive: boolean;
        }>;
        
        if (iosSubmissions.length > 0) {
          await this.enrichIosSubmissionsWithRolloutPercentage(iosSubmissions, distribution.tenantId);
        }

        // Calculate distribution's statusUpdatedAt as max of all submissions' statusUpdatedAt
        const submissionStatusDates = submissions.map(s => s.statusUpdatedAt);
        const distributionStatusUpdatedAt = submissionStatusDates.length > 0
          ? new Date(Math.max(...submissionStatusDates.map(d => d.getTime())))
          : distribution.statusUpdatedAt;

        return {
          id: distribution.id,
          releaseId: distribution.releaseId,
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
      releaseId: string;
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

  /**
   * Create distribution and submissions from release builds
   * 
   * This function:
   * 1. Validates releaseId and tenantId exist in releases table
   * 2. Gets platform & target mappings from release_platforms_targets_mapping
   * 3. Creates a distribution entry with platform & store type mappings
   * 4. Creates Android/iOS submission entries based on builds table data
   * 5. Validates that all configured platforms have corresponding submissions
   * 6. Rolls back (deletes distribution) if any platform is missing a submission
   * 
   * @param releaseId - Release ID to create distribution for
   * @param tenantId - Tenant ID to validate against release
   * @returns Object with distributionId and message on success, or distributionId: null and error on failure
   */
  async createDistributionFromRelease(
    releaseId: string,
    tenantId: string
  ): Promise<{ distributionId: string | null; message?: string; error?: string }> {
    try {
      // Step 1: Validate releaseId and tenantId exist in releases table
      const release = await this.releaseRepository.findById(releaseId);
      if (!release) {
        return {
          distributionId: null,
          error: `Release with id ${releaseId} not found`
        };
      }
      
      if (release.tenantId !== tenantId) {
        return {
          distributionId: null,
          error: `Release ${releaseId} does not belong to tenant ${tenantId}`
        };
      }

      // Step 2: Get platform & target mappings from release_platforms_targets_mapping
      const platformTargetMappings = await this.platformTargetMappingRepository.getByReleaseId(releaseId);
      
      if (platformTargetMappings.length === 0) {
        return {
          distributionId: null,
          error: `No platform-target mappings found for release ${releaseId}`
        };
      }

      // Extract unique platforms and store types from mappings
      const platforms = [...new Set(platformTargetMappings.map(m => m.platform))] as Array<'ANDROID' | 'IOS' | 'WEB'>;
      const storeTypes = [...new Set(platformTargetMappings.map(m => m.target))] as Array<'PLAY_STORE' | 'APP_STORE' | 'WEB'>;

      // Filter out WEB platform and store type
      const filteredPlatforms = platforms.filter(p => p !== BUILD_PLATFORM.WEB) as Array<'ANDROID' | 'IOS'>;
      const filteredStoreTypes = storeTypes.filter(s => s !== STORE_TYPE.WEB) as Array<'PLAY_STORE' | 'APP_STORE'>;

      if (filteredPlatforms.length === 0) {
        return {
          distributionId: null,
          error: `No valid platforms (${BUILD_PLATFORM.ANDROID}/${BUILD_PLATFORM.IOS}) found for release ${releaseId}`
        };
      }

      // Step 3: Create distribution entry
      const distributionId = uuidv4();
      const distribution = await this.distributionRepository.create({
        id: distributionId,
        tenantId,
        releaseId,
        branch: release.branch ?? 'master',
        configuredListOfPlatforms: filteredPlatforms,
        configuredListOfStoreTypes: filteredStoreTypes,
        status: 'PENDING'
      });

      // Step 4: Create submissions based on platforms
      // Track which platforms had submissions created successfully
      const createdSubmissions: { android: boolean; ios: boolean } = {
        android: false,
        ios: false
      };

      const submissionErrors: string[] = [];

      for (const mapping of platformTargetMappings) {
        // Skip WEB platform/target
        if (mapping.platform === BUILD_PLATFORM.WEB || mapping.target === STORE_TYPE.WEB) {
          continue;
        }

        // Map target to storeType
        const storeType = mapping.target === STORE_TYPE.PLAY_STORE ? STORE_TYPE.PLAY_STORE : 
                         mapping.target === STORE_TYPE.APP_STORE ? STORE_TYPE.APP_STORE : null;
        
        if (!storeType) {
          continue; // Skip if target is not PLAY_STORE or APP_STORE
        }

        if (mapping.platform === BUILD_PLATFORM.ANDROID) {
          try {
            // Get Android build data from builds table
            // Query: releaseId, tenantId, platform='ANDROID', storeType, buildStage='PRE_RELEASE', buildUploadStatus='UPLOADED'
            const androidBuilds = await this.buildRepository.findBuilds({
              releaseId,
              tenantId,
              platform: BUILD_PLATFORM.ANDROID,
              storeType: storeType,
              buildStage: BUILD_STAGE.PRE_RELEASE,
              buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED
            });

            if (androidBuilds.length > 0) {
              const build = androidBuilds[0];
              
              // Extract versionCode from buildNumber (buildNumber is typically the versionCode as string)
              const versionCode = build.buildNumber ? parseInt(build.buildNumber, 10) : 0;
              
              // Create Android submission
              await this.androidSubmissionRepository.create({
                id: uuidv4(),
                distributionId: distribution.id,
                internalTrackLink: build.internalTrackLink ?? null,
                artifactPath: build.artifactPath ?? '',
                version: build.artifactVersionName ?? mapping.version,
                versionCode: versionCode || 0,
                buildType: build.buildType,
                storeType: storeType,
                status: ANDROID_SUBMISSION_STATUS.PENDING,
                isActive: true
              });
              
              createdSubmissions.android = true;
            } else {
              submissionErrors.push(`No Android build found for release ${releaseId} with storeType ${storeType}, buildStage ${BUILD_STAGE.PRE_RELEASE}, and buildUploadStatus ${BUILD_UPLOAD_STATUS.UPLOADED}`);
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            submissionErrors.push(`Failed to create Android submission: ${errorMessage}`);
          }
        } else if (mapping.platform === BUILD_PLATFORM.IOS) {
          try {
            // Get iOS build data from builds table
            // Query: releaseId, tenantId, platform='IOS', storeType, buildStage='PRE_RELEASE', buildUploadStatus='UPLOADED'
            const iosBuilds = await this.buildRepository.findBuilds({
              releaseId,
              tenantId,
              platform: BUILD_PLATFORM.IOS,
              storeType: storeType,
              buildStage: BUILD_STAGE.PRE_RELEASE,
              buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED
            });

            if (iosBuilds.length > 0) {
              const build = iosBuilds[0];
              
              // Create iOS submission
              await this.iosSubmissionRepository.create({
                id: uuidv4(),
                distributionId: distribution.id,
                testflightNumber: build.testflightNumber ?? '',
                version: build.artifactVersionName ?? mapping.version,
                buildType: build.buildType,
                storeType: storeType,
                status: 'PENDING',
                releaseType: 'AFTER_APPROVAL',
                isActive: true
              });
              
              createdSubmissions.ios = true;
            } else {
              submissionErrors.push(`No iOS build found for release ${releaseId} with storeType ${storeType}, buildStage ${BUILD_STAGE.PRE_RELEASE}, and buildUploadStatus ${BUILD_UPLOAD_STATUS.UPLOADED}`);
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            submissionErrors.push(`Failed to create iOS submission: ${errorMessage}`);
          }
        }
      }

      // Step 5: Validate that all configured platforms have corresponding submissions
      const missingPlatforms: string[] = [];
      
      if (filteredPlatforms.includes(BUILD_PLATFORM.ANDROID) && !createdSubmissions.android) {
        missingPlatforms.push(BUILD_PLATFORM.ANDROID);
      }
      
      if (filteredPlatforms.includes(BUILD_PLATFORM.IOS) && !createdSubmissions.ios) {
        missingPlatforms.push(BUILD_PLATFORM.IOS);
      }

      // If any platform is missing a submission, rollback (delete distribution)
      if (missingPlatforms.length > 0 || submissionErrors.length > 0) {
        // Delete the distribution that was created
        await this.distributionRepository.delete(distribution.id);
        
        // Build error message
        const errorMessages: string[] = [];
        
        if (missingPlatforms.length > 0) {
          errorMessages.push(`Missing submissions for platform(s): ${missingPlatforms.join(', ')}`);
        }
        
        if (submissionErrors.length > 0) {
          errorMessages.push(...submissionErrors);
        }
        
        return {
          distributionId: null,
          error: errorMessages.join('; ')
        };
      }

      return {
        distributionId: distribution.id,
        message: 'Distribution created successfully from release'
      };
    } catch (error: unknown) {
      // Handle unexpected errors (database errors, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        distributionId: null,
        error: `Failed to create distribution: ${errorMessage}`
      };
    }
  }

  /**
   * Enrich iOS submissions with totalPauseDuration and totalRemainingPauseDuration from Apple API
   * Only fetches for submissions with:
   * - phasedRelease = true
   * - isActive = true
   * - status in ['LIVE', 'PAUSED', 'COMPLETE']
   * 
   * Calculates:
   * - totalPauseDuration: Total days paused (from Apple API)
   * - totalRemainingPauseDuration: Remaining pause days allowed (30 - totalPauseDuration)
   * 
   * @param submissions - Array of formatted iOS submissions
   * @param tenantId - Tenant ID to fetch store integration
   * @returns Promise resolving when enrichment is complete (modifies submissions in place)
   */
  private async enrichIosSubmissionsWithPauseDuration(
    submissions: Array<FormattedSubmission & { platform: 'IOS' }>,
    tenantId: string
  ): Promise<void> {
    // Filter submissions that need Apple API enrichment
    const submissionsNeedingEnrichment = submissions.filter(sub => 
      sub.phasedRelease === true &&
      sub.isActive === true &&
      ['LIVE', 'PAUSED', 'COMPLETE'].includes(sub.status)
    );

    if (submissionsNeedingEnrichment.length === 0) {
      console.log('[DistributionService] No iOS submissions need totalPauseDuration enrichment');
      return;
    }

    console.log(
      `[DistributionService] Enriching ${submissionsNeedingEnrichment.length} iOS submission(s) with totalPauseDuration from Apple`
    );

    // Get store integration for tenant
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    let targetAppId: string;

    try {
      const storage = getStorage();
      const storeIntegrationController = (storage as any).storeIntegrationController as StoreIntegrationController;
      
      if (!storeIntegrationController) {
        console.error('[DistributionService] StoreIntegrationController not initialized');
        return;
      }

      // Find iOS App Store integration for tenant
      const integrations = await storeIntegrationController.findAll({
        tenantId,
        platform: 'IOS',
        storeType: StoreType.APP_STORE
      });

      if (integrations.length === 0) {
        console.warn(`[DistributionService] No iOS store integration found for tenant ${tenantId}`);
        return;
      }

      const integration = integrations[0];
      targetAppId = integration.targetAppId ?? '';

      if (!targetAppId) {
        console.warn(`[DistributionService] No targetAppId in integration ${integration.id}`);
        return;
      }

      // Create Apple service instance (will be reused for all submissions)
      appleService = await createAppleServiceFromIntegration(integration.id);
      
    } catch (error) {
      console.error('[DistributionService] Failed to initialize Apple service:', error);
      return;
    }

    // Enrich each submission in parallel
    await Promise.all(
      submissionsNeedingEnrichment.map(async (submission) => {
        try {
          console.log(`[DistributionService] Fetching pause duration for submission ${submission.id} (v${submission.version})`);
          
          // Step 1: Get app store version ID (use cached if available)
          let appStoreVersionId = (submission as any).appStoreVersionId;

          if (appStoreVersionId) {
            console.log(`[DistributionService] Using cached appStoreVersionId: ${appStoreVersionId}`);
          } else {
            console.log(`[DistributionService] No cached appStoreVersionId, fetching from Apple API...`);
            const versionData = await appleService.getAppStoreVersionByVersionString(
              targetAppId,
              submission.version
            );

            if (!versionData) {
              console.warn(`[DistributionService] Version ${submission.version} not found in Apple for submission ${submission.id}`);
              submission.totalPauseDuration = null;
              submission.totalRemainingPauseDuration = null;
              return;
            }

            appStoreVersionId = versionData.id;
            console.log(`[DistributionService] Found appStoreVersionId: ${appStoreVersionId} for v${submission.version}`);
            
            // Cache it for next time (fire-and-forget update)
            this.iosSubmissionRepository.update(submission.id, {
              appStoreVersionId: appStoreVersionId
            }).catch(err => {
              console.warn(`[DistributionService] Failed to cache appStoreVersionId for ${submission.id}:`, err);
            });
          }

          // Step 2: Get phased release data
          const phasedReleaseData = await appleService.getPhasedReleaseForVersion(appStoreVersionId);

          if (!phasedReleaseData || !phasedReleaseData.data) {
            console.warn(`[DistributionService] No phased release found for version ${appStoreVersionId}`);
            submission.totalPauseDuration = null;
            submission.totalRemainingPauseDuration = null;
            return;
          }

          // Step 3: Extract totalPauseDuration and calculate totalRemainingPauseDuration
          const totalPauseDuration = phasedReleaseData.data.attributes?.totalPauseDuration;
          submission.totalPauseDuration = totalPauseDuration ?? null;

          // Calculate remaining pause duration (30 days max - days already paused)
          if (totalPauseDuration !== null && totalPauseDuration !== undefined) {
            const MAX_PAUSE_DURATION_DAYS = 30;
            submission.totalRemainingPauseDuration = Math.max(0, MAX_PAUSE_DURATION_DAYS - totalPauseDuration);
          } else {
            submission.totalRemainingPauseDuration = null;
          }

          console.log(
            `[DistributionService] Successfully enriched submission ${submission.id}: ` +
            `totalPauseDuration: ${totalPauseDuration} days, ` +
            `totalRemainingPauseDuration: ${submission.totalRemainingPauseDuration} days`
          );
          
        } catch (error) {
          console.error(`[DistributionService] Failed to enrich submission ${submission.id}:`, error);
          submission.totalPauseDuration = null;
          submission.totalRemainingPauseDuration = null;
        }
      })
    );

    console.log('[DistributionService] Completed totalPauseDuration enrichment for iOS submissions');
  }

  /**
   * Map Apple's currentDayNumber to rollout percentage based on 7-day schedule
   * @param currentDayNumber - Day number from Apple (1-7)
   * @returns Rollout percentage (1-100)
   */
  private mapDayNumberToRolloutPercentage(currentDayNumber: number): number {
    const schedule: Record<number, number> = {
      1: 1,
      2: 2,
      3: 5,
      4: 10,
      5: 20,
      6: 50,
      7: 100
    };
    return schedule[currentDayNumber] ?? 100;
  }

  /**
   * Enrich iOS submissions with current rollout percentage from Apple API
   * Only updates for submissions with:
   * - phasedRelease = true
   * - isActive = true
   * - status in ['LIVE', 'PAUSED', 'COMPLETE']
   * 
   * Fetches currentDayNumber from Apple and:
   * 1. Maps it to rollout percentage
   * 2. Updates database with new percentage
   * 3. Updates in-memory submission object
   * 
   * @param submissions - Array of iOS submissions (lightweight format for list API)
   * @param tenantId - Tenant ID to fetch store integration
   * @returns Promise resolving when enrichment is complete (modifies submissions in place)
   */
  private async enrichIosSubmissionsWithRolloutPercentage(
    submissions: Array<{
      id: string;
      platform: 'IOS';
      version: string;
      status: string;
      rolloutPercentage: number;
      isActive: boolean;
    }>,
    tenantId: string
  ): Promise<void> {
    // Filter submissions that need Apple API enrichment
    const submissionsNeedingEnrichment = submissions.filter(sub => 
      sub.isActive === true &&
      ['LIVE', 'PAUSED', 'COMPLETE'].includes(sub.status)
    );

    if (submissionsNeedingEnrichment.length === 0) {
      console.log('[DistributionService] No iOS submissions need rollout percentage enrichment');
      return;
    }

    console.log(
      `[DistributionService] Enriching ${submissionsNeedingEnrichment.length} iOS submission(s) with rollout percentage from Apple`
    );

    // Get store integration for tenant
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    let targetAppId: string;

    try {
      const storage = getStorage();
      const storeIntegrationController = (storage as any).storeIntegrationController as StoreIntegrationController;
      
      if (!storeIntegrationController) {
        console.error('[DistributionService] StoreIntegrationController not initialized');
        return;
      }

      // Find iOS App Store integration for tenant
      const integrations = await storeIntegrationController.findAll({
        tenantId,
        platform: 'IOS',
        storeType: StoreType.APP_STORE
      });

      if (integrations.length === 0) {
        console.warn(`[DistributionService] No iOS store integration found for tenant ${tenantId}`);
        return;
      }

      const integration = integrations[0];
      targetAppId = integration.targetAppId ?? '';

      if (!targetAppId) {
        console.warn(`[DistributionService] No targetAppId in integration ${integration.id}`);
        return;
      }

      // Create Apple service instance (will be reused for all submissions)
      appleService = await createAppleServiceFromIntegration(integration.id);
      
    } catch (error) {
      console.error('[DistributionService] Failed to initialize Apple service:', error);
      return;
    }

    // Enrich each submission in parallel
    await Promise.all(
      submissionsNeedingEnrichment.map(async (submission) => {
        try {
          console.log(`[DistributionService] Fetching rollout percentage for submission ${submission.id} (v${submission.version})`);
          
          // Step 1: Get app store version ID (use cached if available)
          let appStoreVersionId = (submission as any).appStoreVersionId;

          if (appStoreVersionId) {
            console.log(`[DistributionService] Using cached appStoreVersionId: ${appStoreVersionId}`);
          } else {
            console.log(`[DistributionService] No cached appStoreVersionId, fetching from Apple API...`);
            const versionData = await appleService.getAppStoreVersionByVersionString(
              targetAppId,
              submission.version
            );

            if (!versionData) {
              console.warn(`[DistributionService] Version ${submission.version} not found in Apple for submission ${submission.id}`);
              return;
            }

            appStoreVersionId = versionData.id;
            console.log(`[DistributionService] Found appStoreVersionId: ${appStoreVersionId} for v${submission.version}`);
            
            // Cache it for next time (fire-and-forget update)
            this.iosSubmissionRepository.update(submission.id, {
              appStoreVersionId: appStoreVersionId
            }).catch(err => {
              console.warn(`[DistributionService] Failed to cache appStoreVersionId for ${submission.id}:`, err);
            });
          }

          // Step 2: Get phased release data
          const phasedReleaseData = await appleService.getPhasedReleaseForVersion(appStoreVersionId);

          if (!phasedReleaseData || !phasedReleaseData.data) {
            console.warn(`[DistributionService] No phased release found for version ${appStoreVersionId}`);
            return;
          }

          // Step 3: Extract currentDayNumber and map to percentage
          const currentDayNumber = phasedReleaseData.data.attributes?.currentDayNumber;
          
          if (currentDayNumber === null || currentDayNumber === undefined) {
            console.warn(`[DistributionService] No currentDayNumber found for submission ${submission.id}`);
            return;
          }

          const newRolloutPercentage = this.mapDayNumberToRolloutPercentage(currentDayNumber);
          
          console.log(
            `[DistributionService] Submission ${submission.id}: currentDayNumber = ${currentDayNumber}, ` +
            `rolloutPercentage = ${newRolloutPercentage}%`
          );

          // Step 4: Update database if percentage has changed
          if (newRolloutPercentage !== submission.rolloutPercentage) {
            await this.iosSubmissionRepository.update(submission.id, {
              rolloutPercentage: newRolloutPercentage
            });
            
            console.log(
              `[DistributionService] Updated submission ${submission.id} rollout percentage: ` +
              `${submission.rolloutPercentage}% → ${newRolloutPercentage}%`
            );
          }

          // Step 5: Update in-memory object for response
          submission.rolloutPercentage = newRolloutPercentage;
          
        } catch (error) {
          console.error(`[DistributionService] Failed to enrich submission ${submission.id}:`, error);
          // Keep existing rolloutPercentage on error
        }
      })
    );

    console.log('[DistributionService] Completed rollout percentage enrichment for iOS submissions');
  }
}

