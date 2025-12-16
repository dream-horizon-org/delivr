import type { AndroidSubmissionBuildRepository } from '~models/distribution/android-submission.repository';
import type { IosSubmissionBuildRepository } from '~models/distribution/ios-submission.repository';
import type { SubmissionActionHistoryRepository } from '~models/distribution/submission-action-history.repository';
import type { DistributionRepository } from '~models/distribution/distribution.repository';
import type { AndroidSubmissionBuild } from '~types/distribution/android-submission.interface';
import type { IosSubmissionBuild } from '~types/distribution/ios-submission.interface';
import type { SubmissionActionHistory } from '~types/distribution/submission-action-history.interface';
import { 
  SUBMISSION_ERROR_MESSAGES,
  SUBMISSION_STATUS,
  SUBMISSION_PLATFORM,
  SUBMISSION_ACTION
} from '~types/distribution/submission.constants';
import { DISTRIBUTION_STATUS } from '~types/distribution/distribution.constants';
import { v4 as uuidv4 } from 'uuid';
import type { AppleAppStoreConnectService } from './apple-app-store-connect.service';
import { createAppleServiceFromIntegration } from './apple-app-store-connect.service';
import { getStorage } from '../../storage/storage-instance';
import { StoreIntegrationController } from '../../storage/integrations/store/store-controller';
import { StoreType, IntegrationStatus } from '../../storage/integrations/store/store-types';
import { validateIntegrationStatus } from '../../controllers/integrations/store-controllers';

/**
 * Submission response format for API
 */
export type SubmissionDetailsResponse = {
  id: string;
  distributionId: string;
  platform: 'ANDROID' | 'IOS';
  storeType: string;
  status: string;
  version: string;
  rolloutPercentage: number;
  releaseNotes: string | null;
  submittedAt: Date | null;
  submittedBy: string | null;
  statusUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  artifact: {
    artifactPath?: string;
    internalTrackLink?: string | null;
    testflightNumber?: string;
  };
  actionHistory: Array<{
    action: string;
    createdBy: string;
    createdAt: Date;
    reason: string;
  }>;
  // Android-specific fields
  versionCode?: number;
  inAppPriority?: number;
  // iOS-specific fields
  releaseType?: string;
  phasedRelease?: boolean;
  resetRating?: boolean;
};

/**
 * iOS submission request data
 */
export type SubmitIosRequest = {
  phasedRelease: boolean;
  resetRating: boolean;
  releaseNotes: string;
};

/**
 * Android submission request data
 */
export type SubmitAndroidRequest = {
  rolloutPercent: number;
  inAppPriority: number;
  releaseNotes: string;
};

/**
 * iOS new submission request data (for resubmission)
 */
export type CreateNewIosSubmissionRequest = {
  version: string;
  testflightNumber: string;
  phasedRelease: boolean;
  resetRating: boolean;
  releaseNotes: string;
};

/**
 * Android new submission request data (for resubmission)
 */
export type CreateNewAndroidSubmissionRequest = {
  version: string;
  versionCode?: number;
  aabFile: Buffer;
  rolloutPercent: number;
  inAppPriority: number;
  releaseNotes: string;
};

/**
 * Helper function to get StoreIntegrationController from storage
 */
const getStoreIntegrationController = (): StoreIntegrationController => {
  const storage = getStorage();
  const controller = (storage as any).storeIntegrationController;
  const controllerMissing = !controller;
  if (controllerMissing) {
    throw new Error('StoreIntegrationController not initialized. Storage setup may not have completed.');
  }
  return controller;
};

/**
 * Submission Service
 * Handles business logic for fetching submission details
 */
export class SubmissionService {
  constructor(
    private readonly androidSubmissionRepository: AndroidSubmissionBuildRepository,
    private readonly iosSubmissionRepository: IosSubmissionBuildRepository,
    private readonly actionHistoryRepository: SubmissionActionHistoryRepository,
    private readonly distributionRepository: DistributionRepository,
    private readonly appleAppStoreConnectService?: AppleAppStoreConnectService
  ) {}

  /**
   * Get submission details by ID
   * Attempts to find in both Android and iOS tables
   */
  async getSubmissionDetails(submissionId: string): Promise<SubmissionDetailsResponse | null> {
    // Try to find in Android submissions first
    const androidSubmission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (androidSubmission) {
      const actionHistory = await this.actionHistoryRepository.findBySubmissionId(submissionId);
      return this.mapAndroidSubmissionToResponse(androidSubmission, actionHistory);
    }

    // If not found in Android, try iOS submissions
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (iosSubmission) {
      const actionHistory = await this.actionHistoryRepository.findBySubmissionId(submissionId);
      return this.mapIosSubmissionToResponse(iosSubmission, actionHistory);
    }

    // Not found in either table
    return null;
  }

  /**
   * Map Android submission to API response format
   */
  private mapAndroidSubmissionToResponse(
    submission: AndroidSubmissionBuild,
    actionHistory: SubmissionActionHistory[]
  ): SubmissionDetailsResponse {
    return {
      id: submission.id,
      distributionId: submission.distributionId,
      platform: 'ANDROID',
      storeType: submission.storeType,
      status: submission.status,
      version: submission.version,
      versionCode: submission.versionCode,
      rolloutPercentage: submission.rolloutPercentage ?? 0,
      inAppPriority: submission.inAppUpdatePriority ?? 0,
      releaseNotes: submission.releaseNotes,
      submittedAt: submission.submittedAt,
      submittedBy: submission.submittedBy,
      statusUpdatedAt: submission.statusUpdatedAt,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      artifact: {
        artifactPath: submission.artifactPath,
        internalTrackLink: submission.internalTrackLink
      },
      actionHistory: actionHistory.map(h => ({
        action: h.action,
        createdBy: h.createdBy,
        createdAt: h.createdAt,
        reason: h.reason
      }))
    };
  }

  /**
   * Map iOS submission to API response format
   */
  private mapIosSubmissionToResponse(
    submission: IosSubmissionBuild,
    actionHistory: SubmissionActionHistory[]
  ): SubmissionDetailsResponse {
    return {
      id: submission.id,
      distributionId: submission.distributionId,
      platform: 'IOS',
      storeType: submission.storeType,
      status: submission.status,
      version: submission.version,
      releaseType: submission.releaseType,
      phasedRelease: submission.phasedRelease ?? false,
      resetRating: submission.resetRating ?? false,
      rolloutPercentage: submission.rolloutPercentage ?? 0,
      releaseNotes: submission.releaseNotes,
      submittedAt: submission.submittedAt,
      submittedBy: submission.submittedBy,
      statusUpdatedAt: submission.statusUpdatedAt,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      artifact: {
        testflightNumber: submission.testflightNumber
      },
      actionHistory: actionHistory.map(h => ({
        action: h.action,
        createdBy: h.createdBy,
        createdAt: h.createdAt,
        reason: h.reason
      }))
    };
  }

  /**
   * Submit existing iOS submission to App Store for review
   * Complete flow:
   * 1. Data validation
   * 2. Save data to database
   * 3. Get store integration and credentials
   * 4. Decrypt and validate credentials
   * 5. Get version from Apple (check if exists)
   * 6. Create version if doesn't exist (+ button scenario)
   * 7. Validate version status is PREPARE_FOR_SUBMISSION
   * 8. Configure version before submission:
   *    a. Set release type (MANUAL, AFTER_APPROVAL, or SCHEDULED)
   *    b. Update "What's New" with release notes
   *    c. Associate build with version (using testflightNumber)
   *    d. Configure phased release (7-day gradual rollout if enabled)
   *    e. Configure reset ratings (reset App Store summary rating if enabled)
   *    f. Submit for review
   * 9. Change submission status to SUBMITTED
   * 10. Update distribution status based on configured platforms
   */
  async submitExistingIosSubmission(
    submissionId: string,
    data: SubmitIosRequest,
    submittedBy: string
  ): Promise<SubmissionDetailsResponse | null> {
    // Find iOS submission
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (!iosSubmission) {
      return null;
    }

    // Step 1: Data Validation
    // Verify submission is in PENDING state
    if (iosSubmission.status !== SUBMISSION_STATUS.PENDING) {
      throw new Error(`Cannot submit submission with status: ${iosSubmission.status}. Must be PENDING.`);
    }

    // Validate required fields
    if (!data.releaseNotes || data.releaseNotes.trim().length === 0) {
      throw new Error('Release notes are required for submission');
    }

    if (data.phasedRelease === undefined || data.phasedRelease === null) {
      throw new Error('phasedRelease boolean is required');
    }

    if (data.resetRating === undefined || data.resetRating === null) {
      throw new Error('resetRating boolean is required');
    }

    // Step 2: Save data to database first
    const updatedSubmission = await this.iosSubmissionRepository.update(submissionId, {
      phasedRelease: data.phasedRelease,
      resetRating: data.resetRating,
      releaseNotes: data.releaseNotes,
      releaseType: 'AFTER_APPROVAL', // Fixed: Automatically release after App Review approval
      rolloutPercentage: data.phasedRelease ? 1 : 100, // Phased starts at 1% (Day 1), manual at 100%
      submittedAt: new Date(),
      submittedBy
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update submission');
    }

    // Step 3: Get distribution to retrieve tenantId
    const distribution = await this.distributionRepository.findById(iosSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    const tenantId = distribution.tenantId;

    // Step 4: Get store integration and credentials
    const storeIntegrationController = getStoreIntegrationController();
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: 'IOS',
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      throw new Error(`No iOS store integration found for tenant ${tenantId}. Please configure App Store Connect credentials first.`);
    }

    const integration = integrations[0];

    // Step 5: Validate integration status is VERIFIED
    validateIntegrationStatus(integration);

    // Validate targetAppId exists
    const targetAppId = integration.targetAppId;
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    // Step 6: Create Apple service (decrypts credentials, generates JWT token)
    let appleService: AppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 7: Get or create app store version before submission
    let appStoreVersionId: string;
    const versionString = updatedSubmission.version;

    try {
      console.log(`[SubmissionService] Checking for existing version ${versionString} in Apple App Store Connect`);
      
      // Step 7a: Check if version exists in Apple
      let versionData = await appleService.getAppStoreVersionByVersionString(targetAppId, versionString);
      
      if (!versionData) {
        // Version doesn't exist (+ button scenario) - create new version
        console.log(`[SubmissionService] Version ${versionString} not found, creating new version`);
        
        const createResponse = await appleService.createAppStoreVersion(targetAppId, versionString, 'IOS');
        versionData = (createResponse as any).data;
        
        console.log(`[SubmissionService] Created new version ${versionString}, ID: ${versionData.id}`);
      } else {
        console.log(`[SubmissionService] Found existing version ${versionString}, ID: ${versionData.id}`);
      }

      appStoreVersionId = versionData.id;
      const versionStringFromApple = versionData.attributes?.versionString;
      const appStoreState = versionData.attributes?.appStoreState;

      // Step 7b: Validate version string matches
      if (versionStringFromApple !== versionString) {
        throw new Error(
          `Version mismatch: Database version is ${versionString}, but Apple version is ${versionStringFromApple}`
        );
      }

      console.log(`[SubmissionService] Version match confirmed: ${versionString}`);
      console.log(`[SubmissionService] App Store state: ${appStoreState}`);

      // Step 7c: Check version status
      // Valid state for submission:
      // - PREPARE_FOR_SUBMISSION: Ready to fill details and submit (ONLY valid state)
     
      // Invalid states:
      // - PENDING_APPLE_RELEASE: Already approved, waiting for release
      // - PENDING_DEVELOPER_RELEASE: Approved, waiting for developer to release
      // - IN_REVIEW: Currently in review
      // - WAITING_FOR_REVIEW: Submitted, waiting in queue
      // - READY_FOR_SALE: Already live
      // - REJECTED: Use createNewIosSubmission API for rejected submissions
      // - DEVELOPER_REMOVED_FROM_SALE: Use createNewIosSubmission API for resubmission

      const validStateForSubmission = 'PREPARE_FOR_SUBMISSION';
      
      if (appStoreState !== validStateForSubmission) {
        const requiresResubmission = 
          appStoreState === 'REJECTED' || 
          appStoreState === 'DEVELOPER_REMOVED_FROM_SALE';
        
        if (requiresResubmission) {
          throw new Error(
            `Cannot submit version with status "${appStoreState}". ` +
            `For rejected or removed submissions, use the "Create New Submission" (resubmission) API instead.`
          );
        }
        
        throw new Error(
          `Cannot submit version with status "${appStoreState}". ` +
          `Version must be in "${validStateForSubmission}" state. ` +
          `Current state indicates the version is already submitted, in review, or live.`
        );
      }

      console.log(`[SubmissionService] Version status is valid for submission (${validStateForSubmission})`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to validate version in Apple App Store Connect: ${errorMessage}`);
    }

    // Step 8: Configure version and submit for review
    // Parameters: releaseNotes, testflightNumber, releaseType, phasedRelease, resetRating
    try {
      console.log(`[SubmissionService] Configuring and submitting iOS app ${targetAppId} version ${versionString} for review`);
      console.log(`[SubmissionService] Configuration parameters:`, {
        appStoreVersionId,
        testflightNumber: updatedSubmission.testflightNumber,
        version: updatedSubmission.version,
        releaseType: updatedSubmission.releaseType,
        phasedRelease: updatedSubmission.phasedRelease,
        resetRating: updatedSubmission.resetRating
      });

      // Step 8a: Configure App Store Version Release Type
      // Fixed to AFTER_APPROVAL: Automatically release this version after App Review approval
      console.log(`[SubmissionService] Setting release type to AFTER_APPROVAL (automatically release after approval)`);
      await appleService.updateAppStoreVersionReleaseType(appStoreVersionId);

      // Step 8b: Update "What's New" with release notes
      console.log(`[SubmissionService] Updating release notes (What's New)`);
      await appleService.updateReleaseNotes(
        appStoreVersionId,
        updatedSubmission.releaseNotes || 'Bug fixes and performance improvements',
        'en-US'
      );
      console.log(`[SubmissionService] Release notes updated successfully`);

      // Step 8c: Associate build with version
      console.log(`[SubmissionService] Associating build ${updatedSubmission.testflightNumber} (version ${updatedSubmission.version}) with version`);
      const buildId = await appleService.getBuildIdByBuildNumber(
        targetAppId,
        updatedSubmission.testflightNumber,
        updatedSubmission.version
      );
      
      if (!buildId) {
        throw new Error(
          `Build not found with testflight number ${updatedSubmission.testflightNumber} and version ${updatedSubmission.version}. ` +
          `Please ensure the build has been uploaded to TestFlight and processed by Apple (processingState must be VALID).`
        );
      }
      
      await appleService.associateBuildWithVersion(appStoreVersionId, buildId);
      console.log(`[SubmissionService] Build ${buildId} associated successfully`);

      // Step 8d: Configure Phased Release for App Store Automatic Updates
      // If phasedRelease is true, create phased release (7-day gradual rollout)
      // If false, release update to all users immediately
      if (updatedSubmission.phasedRelease) {
        console.log(`[SubmissionService] Creating phased release (7-day gradual rollout)`);
        await appleService.createPhasedRelease(appStoreVersionId);
        console.log(`[SubmissionService] Phased release created successfully`);
      } else {
        console.log(`[SubmissionService] Phased release disabled - will release to all users immediately`);
      }

      // Step 8e: Configure Reset iOS App Store Summary Rating
      // If resetRating is true, reset ratings when this version is released
      // If false, keep existing rating
      if (updatedSubmission.resetRating) {
        console.log(`[SubmissionService] Enabling reset ratings when version is released`);
        await appleService.updateResetRatings(appStoreVersionId, true);
        console.log(`[SubmissionService] Reset ratings enabled`);
      } else {
        console.log(`[SubmissionService] Keep existing rating - reset ratings disabled`);
        await appleService.updateResetRatings(appStoreVersionId, false);
      }
      
      // Step 8f: Submit for review
      await appleService.submitForReview(appStoreVersionId);
      
      console.log(`[SubmissionService] Successfully submitted version ${versionString} to Apple App Store for review`);
    } catch (error) {
      // If Apple API call fails, throw error to prevent status update
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to submit to Apple App Store for review: ${errorMessage}`);
    }

    // Step 9: Change submission status to SUBMITTED (only after Apple API succeeds)
    const finalSubmission = await this.iosSubmissionRepository.update(submissionId, {
      status: SUBMISSION_STATUS.SUBMITTED
    });

    if (!finalSubmission) {
      throw new Error('Failed to update submission status to SUBMITTED');
    }

    console.log(`[SubmissionService] Updated iOS submission ${submissionId} status to SUBMITTED`);

    // Step 10: Update distribution status based on configured platforms
    const configuredPlatforms = distribution.configuredListOfPlatforms;
    const currentDistributionStatus = distribution.status;

    // Check if only iOS is configured
    const onlyIOS = configuredPlatforms.length === 1 && configuredPlatforms.includes('IOS');
    
    // Check if both platforms are configured
    const bothPlatforms = configuredPlatforms.includes('IOS') && configuredPlatforms.includes('ANDROID');

    let newDistributionStatus = currentDistributionStatus;

    if (onlyIOS) {
      // Only iOS configured → change to SUBMITTED
      newDistributionStatus = DISTRIBUTION_STATUS.SUBMITTED;
      console.log(`[SubmissionService] Only iOS configured, updating distribution status to SUBMITTED`);
    } else if (bothPlatforms) {
      // Both platforms configured
      if (currentDistributionStatus === DISTRIBUTION_STATUS.PENDING) {
        // First platform submitted → PARTIALLY_SUBMITTED
        newDistributionStatus = DISTRIBUTION_STATUS.PARTIALLY_SUBMITTED;
        console.log(`[SubmissionService] First platform submitted, updating distribution status to PARTIALLY_SUBMITTED`);
      } else if (currentDistributionStatus === DISTRIBUTION_STATUS.PARTIALLY_SUBMITTED) {
        // Second platform submitted → SUBMITTED
        newDistributionStatus = DISTRIBUTION_STATUS.SUBMITTED;
        console.log(`[SubmissionService] Second platform submitted, updating distribution status to SUBMITTED`);
      }
    }

    // Update distribution status if changed
    if (newDistributionStatus !== currentDistributionStatus) {
      await this.distributionRepository.update(distribution.id, {
        status: newDistributionStatus
      });
      console.log(`[SubmissionService] Updated distribution ${distribution.id} status from ${currentDistributionStatus} to ${newDistributionStatus}`);
    }

    // Get action history and return
    const actionHistory = await this.actionHistoryRepository.findBySubmissionId(submissionId);

    return this.mapIosSubmissionToResponse(finalSubmission, actionHistory);
  }

  /**
   * Submit existing Android submission to Play Store for review
   * 1. Saves data to database (updates submission details)
   * 2. Calls Google Play Console API to submit for review
   * 3. If successful, changes status to SUBMITTED
   * 
   * TODO: Android implementation to be completed later
   */
  async submitExistingAndroidSubmission(
    submissionId: string,
    data: SubmitAndroidRequest,
    submittedBy: string
  ): Promise<SubmissionDetailsResponse | null> {
    // Find Android submission
    const androidSubmission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (!androidSubmission) {
      return null;
    }

    // Verify submission is in PENDING state
    if (androidSubmission.status !== SUBMISSION_STATUS.PENDING) {
      throw new Error(`Cannot submit submission with status: ${androidSubmission.status}. Must be PENDING.`);
    }

    // Validate rollout percentage
    if (data.rolloutPercent < 0 || data.rolloutPercent > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    // Validate inAppPriority
    if (data.inAppPriority < 0 || data.inAppPriority > 5) {
      throw new Error('In-app priority must be between 0 and 5');
    }

    // Step 1: Save data to database first
    const updatedSubmission = await this.androidSubmissionRepository.update(submissionId, {
      rolloutPercentage: data.rolloutPercent,
      inAppUpdatePriority: data.inAppPriority,
      releaseNotes: data.releaseNotes,
      submittedAt: new Date(),
      submittedBy
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update submission');
    }

    // Step 2: Call Google Play Console API to submit for review
    // TODO: Implement Google Play API call (to be done later)
    // Parameters to use:
    // - artifactPath: updatedSubmission.artifactPath
    // - versionCode: updatedSubmission.versionCode
    // - releaseNotes: updatedSubmission.releaseNotes
    // - rolloutPercent: updatedSubmission.rolloutPercentage
    // - inAppPriority: updatedSubmission.inAppUpdatePriority

    // Step 3: If Google API call is successful, update status to SUBMITTED
    const finalSubmission = await this.androidSubmissionRepository.update(submissionId, {
      status: SUBMISSION_STATUS.SUBMITTED
    });

    if (!finalSubmission) {
      throw new Error('Failed to update submission status to SUBMITTED');
    }

    // Get action history
    const actionHistory = await this.actionHistoryRepository.findBySubmissionId(submissionId);

    return this.mapAndroidSubmissionToResponse(finalSubmission, actionHistory);
  }

  /**
   * Create new iOS submission (resubmission after rejection/cancellation)
   * Creates a completely new submission with new artifact
   * 1. Marks old submissions as inactive
   * 2. Creates new submission with new ID and artifact
   * 3. Calls Apple API to submit for review
   * 4. Sets status to SUBMITTED
   */
  async createNewIosSubmission(
    distributionId: string,
    data: CreateNewIosSubmissionRequest,
    submittedBy: string
  ): Promise<SubmissionDetailsResponse> {
    // Step 1: Mark all existing iOS submissions for this distribution as inactive
    const existingSubmissions = await this.iosSubmissionRepository.findByDistributionId(distributionId);
    
    for (const submission of existingSubmissions) {
      if (submission.isActive) {
        await this.iosSubmissionRepository.update(submission.id, {
          isActive: false
        });
      }
    }

    // Step 2: Create completely new submission with new ID
    const newSubmissionId = uuidv4();
    const newSubmission = await this.iosSubmissionRepository.create({
      id: newSubmissionId,
      distributionId,
      testflightNumber: data.testflightNumber,
      version: data.version,
      buildType: 'MANUAL', // Resubmissions are always manual
      storeType: 'APP_STORE',
      status: SUBMISSION_STATUS.PENDING, // Will be updated to SUBMITTED after API call
      releaseNotes: data.releaseNotes,
      phasedRelease: data.phasedRelease,
      releaseType: 'AFTER_APPROVAL', // Fixed: Automatically release after App Review approval
      resetRating: data.resetRating,
      rolloutPercentage: data.phasedRelease ? 1 : 100, // Phased starts at 1% (Day 1), manual at 100%
      isActive: true,
      submittedBy: null // Will be set after submission
    });

    // Step 3: Update submission with submitted details before API call
    const updatedSubmission = await this.iosSubmissionRepository.update(newSubmissionId, {
      submittedAt: new Date(),
      submittedBy
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update new submission');
    }

    // Step 4: Call Apple App Store Connect API to submit for review
    if (this.appleAppStoreConnectService) {
      try {
        // TODO: Get actual IDs from database or Apple API
        const appStoreVersionId = `version_${data.version}`;
        const buildId = `build_${data.testflightNumber}`;
        
        // First, associate the new build with the AppStoreVersion
        await this.appleAppStoreConnectService.associateBuildWithVersion(
          appStoreVersionId,
          buildId
        );
        
        // Then submit for review
        await this.appleAppStoreConnectService.submitForReview(appStoreVersionId);
      } catch (error) {
        // If Apple API call fails, throw error to prevent status update
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to resubmit to Apple App Store for review: ${errorMessage}`);
      }
    } else {
      console.warn('[SubmissionService] Apple App Store Connect service not configured - skipping API call');
    }

    // Step 5: If Apple API call is successful, update status to SUBMITTED
    const finalSubmission = await this.iosSubmissionRepository.update(newSubmissionId, {
      status: SUBMISSION_STATUS.SUBMITTED
    });

    if (!finalSubmission) {
      throw new Error('Failed to update submission status to SUBMITTED');
    }

    // Get action history (will be empty for new submission)
    const actionHistory = await this.actionHistoryRepository.findBySubmissionId(newSubmissionId);

    return this.mapIosSubmissionToResponse(finalSubmission, actionHistory);
  }

  /**
   * Create new Android submission (resubmission after rejection/cancellation)
   * Creates a completely new submission with new artifact
   * 
   * TODO: Android implementation to be completed later
   */
  async createNewAndroidSubmission(
    distributionId: string,
    data: CreateNewAndroidSubmissionRequest,
    submittedBy: string
  ): Promise<SubmissionDetailsResponse> {
    // TODO: Implement Android resubmission
    // Similar process:
    // 1. Mark old submissions as inactive
    // 2. Upload new AAB to S3
    // 3. Extract versionCode from AAB if not provided
    // 4. Create new submission
    // 5. Call Google Play API
    // 6. Update status to SUBMITTED
    
    throw new Error('Android resubmission will be implemented later');
  }

  /**
   * Pause iOS rollout (iOS only)
   * Updates submission status to PAUSED and records action in history
   */
  async pauseRollout(
    submissionId: string, 
    reason: string, 
    createdBy: string
  ): Promise<{ id: string; status: string; statusUpdatedAt: Date } | null> {
    // Step 1: Find iOS submission (pause only applies to iOS)
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (!iosSubmission) {
      return null;
    }

    // Step 2: Verify submission can be paused (must be LIVE)
    if (iosSubmission.status !== SUBMISSION_STATUS.LIVE) {
      throw new Error(`Cannot pause submission with status: ${iosSubmission.status}. Must be LIVE.`);
    }

    // Step 3: Verify it's a phased release (can only pause phased releases)
    if (!iosSubmission.phasedRelease) {
      throw new Error('Only phased releases can be paused.');
    }

    // Step 4: Get distribution to retrieve tenantId
    const distribution = await this.distributionRepository.findById(iosSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    const tenantId = distribution.tenantId;

    // Step 5: Find iOS store integration by tenantId + platform + storeType
    const storeIntegrationController = getStoreIntegrationController();
    
    // Validate storeType is APP_STORE (only supported type for iOS)
    const storeTypeUpper = iosSubmission.storeType.toUpperCase();
    

    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: 'IOS',
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      throw new Error(`No iOS store integration found for tenant ${tenantId}. Please configure App Store Connect credentials first.`);
    }

    // Use first integration found (should typically be only one per tenant + platform + storeType)
    const integration = integrations[0];

    // Validate integration status is VERIFIED
    // This ensures credentials are valid and verified before attempting Apple API operations
    validateIntegrationStatus(integration);

    // Step 6: Create Apple service from integration (loads credentials, decrypts, generates JWT token)
    let appleService: AppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 7: Get targetAppId from integration and fetch current phased release ID
    const targetAppId = integration.targetAppId;
    
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    // Step 8: Dynamically fetch the current ACTIVE phased release ID from Apple
    // This follows Apple's recommended workflow:
    // 1. Get READY_FOR_SALE app store version (sorted by creation date)
    // 2. Get phased release for that version
    // 3. Validate state is ACTIVE (only ACTIVE releases can be paused)
    // 4. Extract phased release ID
    let phasedReleaseId: string | null;
    try {
      console.log(`[SubmissionService] Fetching current ACTIVE phased release ID for app ${targetAppId}`);
      phasedReleaseId = await appleService.getCurrentPhasedReleaseId(targetAppId, 'ACTIVE');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch phased release from Apple App Store Connect: ${errorMessage}`);
    }

    // Step 9: Validate ACTIVE phased release exists
    if (!phasedReleaseId) {
      throw new Error(
        'No ACTIVE phased release found for this app. ' +
        'The phased release may not be enabled, may already be paused, may have completed, ' +
        'or no READY_FOR_SALE version exists. Only ACTIVE phased releases can be paused.'
      );
    }

    // Step 10: Call Apple API to pause the phased release
    try {
      console.log(`[SubmissionService] Pausing phased release ${phasedReleaseId} for submission ${submissionId}`);
      await appleService.pausePhasedRelease(phasedReleaseId);
      console.log(`[SubmissionService] Successfully paused phased release ${phasedReleaseId}`);
    } catch (error) {
      // If Apple API call fails, throw error to prevent database update
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to pause phased release in Apple App Store Connect: ${errorMessage}`);
    }

    // Step 11: Update submission status to PAUSED in database (only after Apple API succeeds)
    const updatedSubmission = await this.iosSubmissionRepository.update(submissionId, {
      status: SUBMISSION_STATUS.PAUSED
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update submission status to PAUSED');
    }

    // Step 12: Record action in history
    await this.actionHistoryRepository.create({
      id: uuidv4(),
      submissionId,
      platform: SUBMISSION_PLATFORM.IOS,
      action: SUBMISSION_ACTION.PAUSED,
      reason,
      createdBy
    });

    console.log(`[SubmissionService] Successfully paused submission ${submissionId}`);

    return {
      id: updatedSubmission.id,
      status: updatedSubmission.status,
      statusUpdatedAt: updatedSubmission.statusUpdatedAt
    };
  }

  /**
   * Resume iOS rollout (iOS only)
   * Updates submission status from PAUSED back to LIVE
   */
  async resumeRollout(
    submissionId: string,
    createdBy: string
  ): Promise<{ id: string; status: string; statusUpdatedAt: Date } | null> {
    // Step 1: Find iOS submission (resume only applies to iOS)
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (!iosSubmission) {
      return null;
    }

    // Step 2: Verify submission can be resumed (must be PAUSED)
    if (iosSubmission.status !== SUBMISSION_STATUS.PAUSED) {
      throw new Error(`Cannot resume submission with status: ${iosSubmission.status}. Must be PAUSED.`);
    }

    // Step 3: Get distribution to retrieve tenantId
    const distribution = await this.distributionRepository.findById(iosSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    const tenantId = distribution.tenantId;

    // Step 4: Find iOS store integration
    const storeIntegrationController = getStoreIntegrationController();
    
    // Validate storeType is APP_STORE (only supported type for iOS)
    const storeTypeUpper = iosSubmission.storeType.toUpperCase();
    
    if (storeTypeUpper !== 'APP_STORE') {
      throw new Error(`Invalid iOS store type: ${iosSubmission.storeType}. Only APP_STORE is supported.`);
    }
    
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: 'IOS',
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      throw new Error(`No iOS store integration found for tenant ${tenantId}. Please configure App Store Connect credentials first.`);
    }

    const integration = integrations[0];

    // Validate integration status is VERIFIED
    // This ensures credentials are valid and verified before attempting Apple API operations
    validateIntegrationStatus(integration);

    // Step 5: Create Apple service from integration (loads credentials, decrypts, generates JWT token)
    let appleService: AppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 6: Get targetAppId from integration and fetch current phased release ID
    const targetAppId = integration.targetAppId;
    
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    // Step 7: Dynamically fetch the current PAUSED phased release ID from Apple
    // Only PAUSED releases can be resumed
    let phasedReleaseId: string | null;
    try {
      console.log(`[SubmissionService] Fetching current PAUSED phased release ID for app ${targetAppId}`);
      phasedReleaseId = await appleService.getCurrentPhasedReleaseId(targetAppId, 'PAUSED');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch phased release from Apple App Store Connect: ${errorMessage}`);
    }

    // Step 8: Validate PAUSED phased release exists
    if (!phasedReleaseId) {
      throw new Error(
        'No PAUSED phased release found for this app. ' +
        'The phased release may not be paused, may have completed, or does not exist. ' +
        'Only PAUSED phased releases can be resumed.'
      );
    }

    // Step 9: Call Apple API to resume the phased release
    try {
      console.log(`[SubmissionService] Resuming phased release ${phasedReleaseId} for submission ${submissionId}`);
      await appleService.resumePhasedRelease(phasedReleaseId);
      console.log(`[SubmissionService] Successfully resumed phased release ${phasedReleaseId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resume phased release in Apple App Store Connect: ${errorMessage}`);
    }

    // Step 10: Update submission status to LIVE in database (only after Apple API succeeds)
    const updatedSubmission = await this.iosSubmissionRepository.update(submissionId, {
      status: SUBMISSION_STATUS.LIVE
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update submission status to LIVE');
    }

    // Step 11: Record action in history
    await this.actionHistoryRepository.create({
      id: uuidv4(),
      submissionId,
      platform: SUBMISSION_PLATFORM.IOS,
      action: SUBMISSION_ACTION.RESUMED,
      reason: 'Rollout resumed',
      createdBy
    });

    console.log(`[SubmissionService] Successfully resumed submission ${submissionId}`);

    return {
      id: updatedSubmission.id,
      status: updatedSubmission.status,
      statusUpdatedAt: updatedSubmission.statusUpdatedAt
    };
  }

  /**
   * Update rollout percentage for iOS submission
   * 
   * iOS Rules:
   * - Manual release (phasedRelease = false): Already at 100%, cannot update
   * - Phased release (phasedRelease = true): Can only update to 100% (to complete early)
   */
  async updateIosRolloutPercentage(
    submissionId: string,
    rolloutPercent: number
  ): Promise<{ id: string; rolloutPercentage: number; statusUpdatedAt: Date } | null> {
    // Step 1: Find iOS submission
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (!iosSubmission) {
      return null;
    }

    // Step 2: Check if manual release (phasedRelease = false)
    if (!iosSubmission.phasedRelease) {
      throw new Error('iOS manual release is already at 100%. Rollout percentage cannot be updated.');
    }

    // Step 3: For phased release, can only update to 100% (to complete early)
    if (rolloutPercent !== 100) {
      throw new Error('iOS phased release can only be updated to 100% to complete rollout early. Cannot set partial percentages manually.');
    }

    // Step 4: Get distribution to retrieve tenantId
    const distribution = await this.distributionRepository.findById(iosSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    const tenantId = distribution.tenantId;

    // Step 5: Find iOS store integration
    const storeIntegrationController = getStoreIntegrationController();
    
    // Validate storeType is APP_STORE (only supported type for iOS)
    const storeTypeUpper = iosSubmission.storeType.toUpperCase();
    
    if (storeTypeUpper !== 'APP_STORE') {
      throw new Error(`Invalid iOS store type: ${iosSubmission.storeType}. Only APP_STORE is supported.`);
    }
    
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: 'IOS',
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      throw new Error(`No iOS store integration found for tenant ${tenantId}. Please configure App Store Connect credentials first.`);
    }

    const integration = integrations[0];

    // Validate integration status is VERIFIED
    // This ensures credentials are valid and verified before attempting Apple API operations
    validateIntegrationStatus(integration);

    // Step 6: Create Apple service from integration
    let appleService: AppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 7: Get targetAppId from integration and fetch current phased release ID
    const targetAppId = integration.targetAppId;
    
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    // Step 8: Dynamically fetch the current ACTIVE phased release ID from Apple
    // Only ACTIVE releases can be completed (set to 100%)
    let phasedReleaseId: string | null;
    try {
      console.log(`[SubmissionService] Fetching current ACTIVE phased release ID for app ${targetAppId}`);
      phasedReleaseId = await appleService.getCurrentPhasedReleaseId(targetAppId, 'ACTIVE');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch phased release from Apple App Store Connect: ${errorMessage}`);
    }

    // Step 9: Validate ACTIVE phased release exists
    if (!phasedReleaseId) {
      throw new Error(
        'No ACTIVE phased release found for this app. ' +
        'The phased release may be paused, may have already completed, or does not exist. ' +
        'Only ACTIVE phased releases can be completed to 100%.'
      );
    }

    // Step 10: Call Apple API to complete the phased release (set to 100%)
    try {
      console.log(`[SubmissionService] Completing phased release ${phasedReleaseId} for submission ${submissionId}`);
      await appleService.completePhasedRelease(phasedReleaseId);
      console.log(`[SubmissionService] Successfully completed phased release ${phasedReleaseId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to complete phased release in Apple App Store Connect: ${errorMessage}`);
    }

    // Step 11: Update rollout percentage to 100% in database (only after Apple API succeeds)
    const updatedSubmission = await this.iosSubmissionRepository.update(submissionId, {
      rolloutPercentage: 100
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update rollout percentage');
    }

    console.log(`[SubmissionService] Successfully updated rollout percentage to 100% for submission ${submissionId}`);

    return {
      id: updatedSubmission.id,
      rolloutPercentage: updatedSubmission.rolloutPercentage ?? 100,
      statusUpdatedAt: updatedSubmission.statusUpdatedAt
    };
  }

  /**
   * Update rollout percentage for Android submission
   * 
   * Android Rules:
   * - Can rollout to any percentage between 0-100
   * - Supports decimal values (e.g., 5.5, 27.3, 99.9)
   * - Can increase or decrease
   */
  async updateAndroidRolloutPercentage(
    submissionId: string,
    rolloutPercent: number
  ): Promise<{ id: string; rolloutPercentage: number; statusUpdatedAt: Date } | null> {
    // Find Android submission
    const androidSubmission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (!androidSubmission) {
      return null;
    }

    // Validate rollout percentage (0-100)
    if (rolloutPercent < 0 || rolloutPercent > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    // Update rollout percentage
    const updatedSubmission = await this.androidSubmissionRepository.update(submissionId, {
      rolloutPercentage: rolloutPercent
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update rollout percentage');
    }

    // TODO: Call Google Play Console API to update rollout percentage
    // This will be implemented later

    return {
      id: updatedSubmission.id,
      rolloutPercentage: updatedSubmission.rolloutPercentage ?? 0,
      statusUpdatedAt: updatedSubmission.statusUpdatedAt
    };
  }
}

