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
import type { SubmissionStatus } from '~types/distribution/submission.constants';
import { DISTRIBUTION_STATUS } from '~types/distribution/distribution.constants';
import { v4 as uuidv4 } from 'uuid';
import type { AppleAppStoreConnectService } from './apple-app-store-connect.service';
import type { MockAppleAppStoreConnectService } from './apple-app-store-connect.mock';
import { createAppleServiceFromIntegration } from './apple-app-store-connect.service';
import { createGoogleServiceFromIntegration, GooglePlayStoreService } from './google-play-store.service';
import { getStorage } from '../../storage/storage-instance';
import { StoreIntegrationController } from '../../storage/integrations/store/store-controller';
import { StoreType, IntegrationStatus } from '../../storage/integrations/store/store-types';
import { validateIntegrationStatus } from '../../controllers/integrations/store-controllers';
import { BUILD_PLATFORM, STORE_TYPE } from '~types/release-management/builds/build.constants';
import { PLAY_STORE_UPLOAD_ERROR_MESSAGES } from '../../constants/store';

/**
 * Submission response format for API
 */
export type SubmissionDetailsResponse = {
  id: string;
  distributionId: string;
  platform: typeof BUILD_PLATFORM.ANDROID | typeof BUILD_PLATFORM.IOS;
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
      platform: BUILD_PLATFORM.ANDROID,
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
      platform: BUILD_PLATFORM.IOS,
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
   *    - If version already has "What's New" filled, it will be overwritten
   *    - If version already has a build associated, it will be replaced
   * 8. Configure version before submission:
   *    a. Set release type (MANUAL, AFTER_APPROVAL, or SCHEDULED)
   *    b. Update "What's New" with release notes (overwrites existing)
   *    c. Check for existing build and replace if necessary, then associate new build
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
      platform: BUILD_PLATFORM.IOS,
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
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
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
        
        const createResponse = await appleService.createAppStoreVersion(targetAppId, versionString, BUILD_PLATFORM.IOS);
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
      console.log(`[SubmissionService] Starting configuration for iOS app ${targetAppId} version ${versionString}`);
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
      // Note: This will overwrite existing release notes if they were already filled
      console.log(`[SubmissionService] Updating release notes (What's New)`);
      await appleService.updateReleaseNotes(
        appStoreVersionId,
        updatedSubmission.releaseNotes || 'Bug fixes and performance improvements',
        'en-US'
      );
      console.log(`[SubmissionService] Release notes updated successfully (overwrites existing if present)`);

      // Step 8c: Associate build with version
      // Note: Check if a build is already associated and replace it if necessary
      console.log(`[SubmissionService] Checking for existing build association with version ${appStoreVersionId}`);
      const existingBuild = await appleService.getAssociatedBuild(appStoreVersionId);
      
      if (existingBuild) {
        console.log(`[SubmissionService] Found existing build associated with version:`);
        console.log(`[SubmissionService] - Existing Build ID: ${existingBuild.id}`);
        console.log(`[SubmissionService] - Existing Build Number: ${existingBuild.attributes?.buildNumber}`);
        console.log(`[SubmissionService] - Existing Build Version: ${existingBuild.attributes?.version}`);
        console.log(`[SubmissionService] This build will be replaced with the new build`);
      } else {
        console.log(`[SubmissionService] No existing build found associated with version`);
      }
      
      console.log(`[SubmissionService] Fetching new build ${updatedSubmission.testflightNumber} (version ${updatedSubmission.version}) for association`);
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
      
      if (existingBuild) {
        console.log(`[SubmissionService] Replacing existing build ${existingBuild.id} with new build ${buildId}`);
      } else {
        console.log(`[SubmissionService] Associating new build ${buildId} with version`);
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
      
      // Step 8f: Submit for review (ONLY after all configuration is complete)
      console.log(`[SubmissionService] All configuration complete. Now submitting version ${versionString} for Apple review...`);
      await appleService.submitForReview(appStoreVersionId);
      console.log(`[SubmissionService] ✓ Successfully submitted version ${versionString} to Apple App Store for review`);
    } catch (error) {
      // If Apple API call fails, throw error to prevent status update
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to submit to Apple App Store for review: ${errorMessage}`);
    }

    // Step 9: Change submission status to SUBMITTED and save appStoreVersionId (only after Apple API succeeds)
    const finalSubmission = await this.iosSubmissionRepository.update(submissionId, {
      status: SUBMISSION_STATUS.SUBMITTED,
      appStoreVersionId: appStoreVersionId
    });

    if (!finalSubmission) {
      throw new Error('Failed to update submission status to SUBMITTED');
    }

    console.log(`[SubmissionService] Updated iOS submission ${submissionId} status to SUBMITTED, saved appStoreVersionId: ${appStoreVersionId}`);

    // Step 10: Update distribution status based on configured platforms
    const configuredPlatforms = distribution.configuredListOfPlatforms;
    const currentDistributionStatus = distribution.status;

    // Check if only iOS is configured
    const onlyIOS = configuredPlatforms.length === 1 && configuredPlatforms.includes(BUILD_PLATFORM.IOS);
    
    // Check if both platforms are configured
    const bothPlatforms = configuredPlatforms.includes(BUILD_PLATFORM.IOS) && configuredPlatforms.includes(BUILD_PLATFORM.ANDROID);

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
   * Helper function to parse releaseNotes from XML-like format to array format
   * Converts: "<en-US>Text</en-US><en-GB>Text</en-GB>" 
   * To: [{ language: "en-US", text: "Text" }, { language: "en-GB", text: "Text" }]
   */
  private parseReleaseNotes(releaseNotes: string): Array<{ language: string; text: string }> {
    if (!releaseNotes || releaseNotes.trim().length === 0) {
      return [];
    }

    // Pattern to match: <language-code>text content</language-code>
    const pattern = /<([a-z]{2}(?:-[A-Z]{2})?)>([^<]*)<\/\1>/gi;
    const parsed: Array<{ language: string; text: string }> = [];
    let match;

    while ((match = pattern.exec(releaseNotes)) !== null) {
      const language = match[1];
      const text = match[2].trim();
      if (text.length > 0) {
        parsed.push({ language, text });
      }
    }

    return parsed;
  }

  /**
   * Submit existing Android submission to Play Store for review
   * 1. Saves data to database (updates submission details)
   * 2. Calls Google Play Console API to submit for review
   * 3. If successful, changes status to SUBMITTED
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

    // Step 2: Get distribution to retrieve tenantId
    const distribution = await this.distributionRepository.findById(updatedSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    const tenantId = distribution.tenantId;

    // Step 3: Get store integration and credentials
    const storeIntegrationController = getStoreIntegrationController();
    const integrations = await storeIntegrationController.findAll({
      tenantId,
      storeType: StoreType.PLAY_STORE,
      platform: BUILD_PLATFORM.ANDROID,
    });

    if (integrations.length === 0) {
      throw new Error(PLAY_STORE_UPLOAD_ERROR_MESSAGES.INTEGRATION_NOT_FOUND_FOR_UPLOAD);
    }

    // Use first integration found
    const integration = integrations[0];

    // Step 4: Validate integration status is VERIFIED
    validateIntegrationStatus(integration);

    // Step 5: Create Google service (decrypts credentials, generates access token)
    let googleService: GooglePlayStoreService;
    try {
      googleService = await createGoogleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Google Play Store credentials: ${errorMessage}`);
    }

    // Step 6: Create edit
    const editData = await googleService.createEdit();
    const editId = editData.id;

    console.log(`[SubmitAndroidSubmission] Created edit with ID: ${editId}`);

    try {
      // Step 7: Get current production state
      const productionStateData = await googleService.getProductionTrack(editId);
      
      console.log('[SubmitAndroidSubmission] Current production state:', JSON.stringify(productionStateData, null, 2));

      // Step 8: Parse releaseNotes from XML-like format to array format
      const parsedReleaseNotes = this.parseReleaseNotes(updatedSubmission.releaseNotes ?? '');
      
      // Determine status and userFraction based on rolloutPercentage
      const rolloutPercentage = updatedSubmission.rolloutPercentage;
      const isFullRollout = rolloutPercentage === 100;
      const status = isFullRollout ? 'completed' : 'inProgress';
      
      // Calculate userFraction (minimum 0.0001 if rolloutPercentage < 100)
      // rolloutPercentage 0.01 = userFraction 0.0001
      // rolloutPercentage 1 = userFraction 0.01
      // rolloutPercentage 10 = userFraction 0.1
      const userFraction = isFullRollout ? undefined : Math.max(0.0001, rolloutPercentage / 100);

      // Build new release object
      const newRelease: {
        name: string;
        versionCodes: string[];
        status: string;
        inAppUpdatePriority: number;
        releaseNotes: Array<{ language: string; text: string }>;
        userFraction?: number;
      } = {
        name: updatedSubmission.version,
        versionCodes: [String(updatedSubmission.versionCode)],
        status: status,
        inAppUpdatePriority: updatedSubmission.inAppUpdatePriority,
        releaseNotes: parsedReleaseNotes.length > 0 ? parsedReleaseNotes : [
          {
            language: 'en-US',
            text: updatedSubmission.releaseNotes ?? 'Release notes'
          }
        ],
      };

      // Add userFraction only if not full rollout
      if (!isFullRollout && userFraction !== undefined) {
        newRelease.userFraction = userFraction;
      }

      // Build track update payload - preserve existing releases and add new one
      const trackUpdatePayload = {
        track: 'production',
        releases: [
          newRelease,
          ...(productionStateData.releases || [])
        ],
      };

      // Step 9: Update track (promotion)
      await googleService.updateProductionTrack(editId, trackUpdatePayload);
      console.log('[SubmitAndroidSubmission] Track updated successfully');

      // Step 10: Validate the edit (optional dry run)
      try {
        await googleService.validateEdit(editId);
        console.log('[SubmitAndroidSubmission] Edit validation successful');
      } catch (validationError) {
        // Validation failed - get error details and throw
        const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
        console.error('[SubmitAndroidSubmission] Validation failed:', errorMessage);
        throw new Error(`Edit validation failed: ${errorMessage}`);
      }

      // Step 11: Commit edit
      const commitResult = await googleService.commitEdit(editId);
      console.log('[SubmitAndroidSubmission] Edit committed successfully:', JSON.stringify(commitResult, null, 2));

      // Step 12: If Google API call is successful, update status to SUBMITTED
      const finalSubmission = await this.androidSubmissionRepository.update(submissionId, {
        status: SUBMISSION_STATUS.SUBMITTED
      });

      if (!finalSubmission) {
        throw new Error('Failed to update submission status to SUBMITTED');
      }

      // Get action history
      const actionHistory = await this.actionHistoryRepository.findBySubmissionId(submissionId);

      return this.mapAndroidSubmissionToResponse(finalSubmission, actionHistory);
    } catch (error) {
      // Clean up: Delete edit if it was created
      console.log(`[SubmitAndroidSubmission] Error occurred, deleting edit ${editId}`);
      await googleService.deleteEdit(editId);
      throw error;
    }
  }

  /**
   * Create new iOS submission (resubmission after rejection/cancellation)
   * Creates a completely new submission with new artifact
   * 
   * Prerequisites (Database):
   * - An existing iOS submission must exist for this distribution
   * - That submission must be in REJECTED or CANCELLED status
   * - That submission must be active (isActive = true)
   * 
   * Prerequisites (Apple App Store Connect):
   * - The version MUST already exist in Apple App Store Connect
   * - The version MUST be in one of the 4 allowed resubmission states
   * 
   * Use cases (ONLY these Apple states allow resubmission):
   * - REJECTED: Version failed Apple review (guideline violation, crash, etc.)
   * - METADATA_REJECTED: Metadata issues (screenshots, description, etc.)
   * - INVALID_BINARY: Binary processing failed (corrupted, wrong SDK, etc.)
   * - DEVELOPER_REJECTED: Developer cancelled submission
   * 
   * Note: This creates a NEW submission record with a new UUID
   * 
   * Complete flow:
   * 1. Validate distribution exists and get tenantId
   * 2. Validate existing submission is in REJECTED or CANCELLED status (Database)
   * 3. Mark old submission as inactive (isActive = false)
   * 4. Create new submission record in database
   * 5. Get store integration and credentials
   * 6. Validate version EXISTS in Apple and is in allowed state (STRICT validation)
   * 7. Configure version before submission:
   *    a. Set release type
   *    b. Update release notes (overwrites existing)
   *    c. Check for existing build and replace if necessary
   *    d. Configure phased release (only creates if doesn't exist)
   *    e. Configure reset ratings
   *    f. Submit for review
   * 8. Update submission status to SUBMITTED
   * 9. Distribution status is NOT updated (already set during first-time submission)
   * 10. Return response with submission details
   */
  async createNewIosSubmission(
    distributionId: string,
    data: CreateNewIosSubmissionRequest,
    submittedBy: string
  ): Promise<SubmissionDetailsResponse> {
    // Step 1: Validate distribution exists and get tenantId
    const distribution = await this.distributionRepository.findById(distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found: ${distributionId}`);
    }

    const tenantId = distribution.tenantId;

    // Step 2: Validate existing submission exists and is in valid state for resubmission
    const existingSubmissions = await this.iosSubmissionRepository.findByDistributionId(distributionId);
    
    if (existingSubmissions.length === 0) {
      throw new Error(
        `No existing iOS submission found for distribution ${distributionId}. ` +
        `Use submitExistingSubmission API for first-time submissions.`
      );
    }

    // Find active submission with REJECTED or CANCELLED status
    const resubmittableSubmission = existingSubmissions.find(
      sub => sub.isActive && 
             (sub.status === SUBMISSION_STATUS.REJECTED || sub.status === SUBMISSION_STATUS.CANCELLED)
    );

    if (!resubmittableSubmission) {
      throw new Error(
        `Cannot create new iOS submission for distribution ${distributionId}. ` +
        `No active submission found with REJECTED or CANCELLED status. ` +
        `Resubmission is only allowed after a submission has been rejected or cancelled.`
      );
    }

    console.log(
      `[SubmissionService] Found existing ${resubmittableSubmission.status} iOS submission: ${resubmittableSubmission.id}. ` +
      `Will mark as inactive and create new submission.`
    );

    // Step 3: Mark old submission as inactive
    await this.iosSubmissionRepository.update(resubmittableSubmission.id, {
          isActive: false
        });

    console.log(`[SubmissionService] Marked old iOS submission ${resubmittableSubmission.id} as inactive`);

    // Step 4: Create completely new submission with new ID
    console.log(`[SubmissionService] Creating new iOS submission for distribution ${distributionId}`);
    
    const newSubmissionId = uuidv4();
    const newSubmission = await this.iosSubmissionRepository.create({
      id: newSubmissionId,
      distributionId,
      testflightNumber: data.testflightNumber,
      version: data.version,
      buildType: 'MANUAL', // Resubmissions are always manual
      storeType: STORE_TYPE.APP_STORE,
      status: SUBMISSION_STATUS.PENDING, // Will be updated to SUBMITTED after API call
      releaseNotes: data.releaseNotes,
      phasedRelease: data.phasedRelease,
      releaseType: 'AFTER_APPROVAL', // Fixed: Automatically release after App Review approval
      resetRating: data.resetRating,
      rolloutPercentage: data.phasedRelease ? 1 : 100, // Phased starts at 1% (Day 1), manual at 100%
      isActive: true,
      submittedBy: null // Will be set after submission
    });

    if (!newSubmission) {
      throw new Error('Failed to create new submission');
    }

    // Step 3: Get store integration and credentials
    const storeIntegrationController = getStoreIntegrationController();
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: BUILD_PLATFORM.IOS,
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      throw new Error(`No iOS store integration found for tenant ${tenantId}. Please configure App Store Connect credentials first.`);
    }

    const integration = integrations[0];

    // Validate integration status is VERIFIED
    validateIntegrationStatus(integration);

    // Validate targetAppId exists
    const targetAppId = integration.targetAppId;
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    // Step 4: Create Apple service (decrypts credentials, generates JWT token)
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 5: Get or create app store version and validate state
    let appStoreVersionId: string;
    const versionString = data.version;

    try {
      console.log(`[SubmissionService] Checking for existing version ${versionString} in Apple App Store Connect`);
      
      // Step 5a: Check if version exists in Apple
      let versionData = await appleService.getAppStoreVersionByVersionString(targetAppId, versionString);
      
      // CRITICAL: For resubmission, version MUST already exist in Apple in a rejected/cancelled state
      if (!versionData) {
        throw new Error(
          `Cannot resubmit version ${versionString} - version not found in Apple App Store Connect. ` +
          `Resubmission requires the version to already exist in a rejected or cancelled state ` +
          `(REJECTED, METADATA_REJECTED, INVALID_BINARY, or DEVELOPER_REJECTED). ` +
          `If you're creating a new version for the first time, use the submitExistingSubmission API instead.`
        );
      }
      
      // Version exists - validate state allows resubmission
      const appStoreState = versionData.attributes?.appStoreState;
      console.log(`[SubmissionService] Found existing version ${versionString}, state: ${appStoreState}`);
      
      // STRICT: Only these 4 states allow resubmission of same version number
      const allowedResubmissionStates = [
        'REJECTED',              // Failed Apple review
        'METADATA_REJECTED',     // Metadata issues
        'INVALID_BINARY',        // Binary processing failed
        'DEVELOPER_REJECTED'     // Cancelled by developer
      ];
      
      if (!allowedResubmissionStates.includes(appStoreState)) {
        throw new Error(
          `Cannot resubmit version ${versionString} in state "${appStoreState}". ` +
          `Resubmission is only allowed for versions in these states: ${allowedResubmissionStates.join(', ')}. ` +
          `For versions in other states, you must create a NEW version number instead.`
        );
      }
      
      appStoreVersionId = versionData.id;
      console.log(`[SubmissionService] Version ${versionString} in state ${appStoreState} - resubmission allowed`);

      const versionStringFromApple = versionData.attributes?.versionString;

      // Validate version string matches
      if (versionStringFromApple !== versionString) {
        throw new Error(
          `Version mismatch: Database version is ${versionString}, but Apple version is ${versionStringFromApple}`
        );
      }

      console.log(`[SubmissionService] Version match confirmed: ${versionString}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to validate or create version in Apple App Store Connect: ${errorMessage}`);
    }

    // Step 6: Configure version and submit for review
    try {
      console.log(`[SubmissionService] Starting configuration for iOS app ${targetAppId} version ${versionString}`);
      console.log(`[SubmissionService] Configuration parameters:`, {
        appStoreVersionId,
        testflightNumber: data.testflightNumber,
        version: data.version,
        releaseType: 'AFTER_APPROVAL',
        phasedRelease: data.phasedRelease,
        resetRating: data.resetRating
      });

      // Step 6a: Configure App Store Version Release Type
      console.log(`[SubmissionService] Setting release type to AFTER_APPROVAL (automatically release after approval)`);
      await appleService.updateAppStoreVersionReleaseType(appStoreVersionId);

      // Step 6b: Update "What's New" with release notes (overwrites existing)
      console.log(`[SubmissionService] Updating release notes (What's New)`);
      await appleService.updateReleaseNotes(
        appStoreVersionId,
        data.releaseNotes || 'Bug fixes and performance improvements',
        'en-US'
      );
      console.log(`[SubmissionService] Release notes updated successfully (overwrites existing if present)`);

      // Step 6c: Check for existing build and replace if necessary
      console.log(`[SubmissionService] Checking for existing build association with version ${appStoreVersionId}`);
      const existingBuild = await appleService.getAssociatedBuild(appStoreVersionId);
      
      if (existingBuild) {
        console.log(`[SubmissionService] Found existing build associated with version:`);
        console.log(`[SubmissionService] - Existing Build ID: ${existingBuild.id}`);
        console.log(`[SubmissionService] - Existing Build Number: ${existingBuild.attributes?.buildNumber}`);
        console.log(`[SubmissionService] - Existing Build Version: ${existingBuild.attributes?.version}`);
        console.log(`[SubmissionService] This build will be replaced with the new build`);
    } else {
        console.log(`[SubmissionService] No existing build found associated with version`);
      }
      
      console.log(`[SubmissionService] Fetching new build ${data.testflightNumber} (version ${data.version}) for association`);
      const buildId = await appleService.getBuildIdByBuildNumber(
        targetAppId,
        data.testflightNumber,
        data.version
      );
      
      if (!buildId) {
        throw new Error(
          `Build not found with testflight number ${data.testflightNumber} and version ${data.version}. ` +
          `Please ensure the build has been uploaded to TestFlight and processed by Apple (processingState must be VALID).`
        );
      }
      
      if (existingBuild) {
        console.log(`[SubmissionService] Replacing existing build ${existingBuild.id} with new build ${buildId}`);
      } else {
        console.log(`[SubmissionService] Associating new build ${buildId} with version`);
      }
      
      await appleService.associateBuildWithVersion(appStoreVersionId, buildId);
      console.log(`[SubmissionService] Build ${buildId} associated successfully`);

      // Step 6d: Configure Phased Release for App Store Automatic Updates
      if (data.phasedRelease) {
        console.log(`[SubmissionService] Checking for existing phased release`);
        const existingPhasedRelease = await appleService.getPhasedReleaseForVersion(appStoreVersionId);
        
        if (existingPhasedRelease) {
          console.log(`[SubmissionService] Phased release already exists from previous submission - keeping existing configuration`);
        } else {
          console.log(`[SubmissionService] Creating phased release (7-day gradual rollout)`);
          await appleService.createPhasedRelease(appStoreVersionId);
          console.log(`[SubmissionService] Phased release created successfully`);
        }
      } else {
        console.log(`[SubmissionService] Phased release disabled - will release to all users immediately`);
    }

      // Step 6e: Configure Reset iOS App Store Summary Rating
      if (data.resetRating) {
        console.log(`[SubmissionService] Enabling reset ratings when version is released`);
        await appleService.updateResetRatings(appStoreVersionId, true);
        console.log(`[SubmissionService] Reset ratings enabled`);
      } else {
        console.log(`[SubmissionService] Keep existing rating - reset ratings disabled`);
        await appleService.updateResetRatings(appStoreVersionId, false);
      }
      
      // Step 6f: Submit for review (ONLY after all configuration is complete)
      console.log(`[SubmissionService] All configuration complete. Now submitting version ${versionString} for Apple review...`);
      await appleService.submitForReview(appStoreVersionId);
      console.log(`[SubmissionService] ✓ Successfully submitted version ${versionString} to Apple App Store for review`);
    } catch (error) {
      // If Apple API call fails, throw error to prevent status update
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to submit to Apple App Store for review: ${errorMessage}`);
    }

    // Step 7: Change submission status to SUBMITTED and save appStoreVersionId (only after Apple API succeeds)
    const finalSubmission = await this.iosSubmissionRepository.update(newSubmissionId, {
      status: SUBMISSION_STATUS.SUBMITTED,
      submittedAt: new Date(),
      submittedBy,
      appStoreVersionId: appStoreVersionId
    });

    if (!finalSubmission) {
      throw new Error('Failed to update submission status to SUBMITTED');
    }

    console.log(`[SubmissionService] Updated iOS submission ${newSubmissionId} status to SUBMITTED, saved appStoreVersionId: ${appStoreVersionId}`);

    // Step 8: Distribution status is NOT updated during resubmission
    // Note: Distribution status was already updated during the first-time submission.
    // Resubmission is just fixing a rejected/cancelled submission, so the distribution
    // remains in its current state (likely SUBMITTED or PARTIALLY_SUBMITTED).
    console.log(`[SubmissionService] Resubmission complete - distribution status not modified (remains: ${distribution.status})`);

    // Step 9: Get action history and return response
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
    // Step 1: Validate distribution exists
    const distribution = await this.distributionRepository.findById(distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found: ${distributionId}`);
    }

    // Step 2: Validate existing submission exists and is in valid state for resubmission
    const existingSubmissions = await this.androidSubmissionRepository.findByDistributionId(distributionId);
    
    if (existingSubmissions.length === 0) {
      throw new Error(
        `No existing Android submission found for distribution ${distributionId}. ` +
        `Use submitExistingSubmission API for first-time submissions.`
      );
    }

    // Find active submission with REJECTED or CANCELLED status
    const resubmittableSubmission = existingSubmissions.find(
      sub => sub.isActive && 
             (sub.status === SUBMISSION_STATUS.REJECTED || sub.status === SUBMISSION_STATUS.CANCELLED)
    );

    if (!resubmittableSubmission) {
      throw new Error(
        `Cannot create new Android submission for distribution ${distributionId}. ` +
        `No active submission found with REJECTED or CANCELLED status. ` +
        `Resubmission is only allowed after a submission has been rejected or cancelled.`
      );
    }

    console.log(
      `[SubmissionService] Found existing ${resubmittableSubmission.status} Android submission: ${resubmittableSubmission.id}. ` +
      `Will mark as inactive and create new submission.`
    );

    // Step 3: Mark old submission as inactive
    await this.androidSubmissionRepository.update(resubmittableSubmission.id, {
      isActive: false
    });

    console.log(`[SubmissionService] Marked old Android submission ${resubmittableSubmission.id} as inactive`);

    // TODO: Step 4: Upload new AAB to S3
    // TODO: Step 5: Extract versionCode from AAB if not provided
    // TODO: Step 6: Create new submission
    // TODO: Step 7: Call Google Play API
    // TODO: Step 8: Update status to SUBMITTED
    
    throw new Error('Android resubmission implementation in progress - validation complete, upload/submission logic pending');
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
      platform: BUILD_PLATFORM.IOS,
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
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 7: Get phased release ID using cached appStoreVersionId (optimized!)
    let phasedReleaseId: string | null;
    
    // Try to use cached appStoreVersionId first (skip 1 Apple API call!)
    const cachedAppStoreVersionId = iosSubmission.appStoreVersionId;
    
    if (cachedAppStoreVersionId) {
      console.log(`[SubmissionService] Using cached appStoreVersionId: ${cachedAppStoreVersionId}`);
      
      try {
        // ✅ Direct API call using cached version ID (skip getAppStoreVersions call!)
        const phasedReleaseResponse = await appleService.getPhasedReleaseForVersion(cachedAppStoreVersionId);
        
        if (!phasedReleaseResponse || !phasedReleaseResponse.data) {
          throw new Error('No phased release found for this version');
        }
        
        const phasedReleaseState = phasedReleaseResponse.data.attributes?.phasedReleaseState;
        phasedReleaseId = phasedReleaseResponse.data.id;
        
        console.log(`[SubmissionService] Found phased release: ${phasedReleaseId}, state: ${phasedReleaseState}`);
        
        // Validate state is ACTIVE (only ACTIVE releases can be paused)
        if (phasedReleaseState !== 'ACTIVE') {
          throw new Error(
            `Cannot pause phased release in state "${phasedReleaseState}". ` +
            `Only ACTIVE releases can be paused. Current state suggests the release may already be paused or completed.`
          );
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch phased release from Apple App Store Connect: ${errorMessage}`);
      }
      
    } else {
      // Fallback: Use old method if appStoreVersionId is not cached (backward compatibility)
      console.log(`[SubmissionService] No cached appStoreVersionId, using fallback method with targetAppId`);
      
    const targetAppId = integration.targetAppId;
    
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    try {
      console.log(`[SubmissionService] Fetching current ACTIVE phased release ID for app ${targetAppId}`);
      phasedReleaseId = await appleService.getCurrentPhasedReleaseId(targetAppId, 'ACTIVE');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch phased release from Apple App Store Connect: ${errorMessage}`);
    }

    if (!phasedReleaseId) {
      throw new Error(
        'No ACTIVE phased release found for this app. ' +
        'The phased release may not be enabled, may already be paused, may have completed, ' +
        'or no READY_FOR_SALE version exists. Only ACTIVE phased releases can be paused.'
      );
      }
    }

    // Step 10: Call Apple API to pause the phased release
    let appleResponse: any;
    try {
      console.log(`[SubmissionService] Pausing phased release ${phasedReleaseId} for submission ${submissionId}`);
      appleResponse = await appleService.pausePhasedRelease(phasedReleaseId);
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
    
    if (storeTypeUpper !== STORE_TYPE.APP_STORE) {
      throw new Error(`Invalid iOS store type: ${iosSubmission.storeType}. Only ${STORE_TYPE.APP_STORE} is supported.`);
    }
    
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: BUILD_PLATFORM.IOS,
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
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 6: Get phased release ID using cached appStoreVersionId (optimized!)
    let phasedReleaseId: string | null;
    
    // Try to use cached appStoreVersionId first (skip 1 Apple API call!)
    const cachedAppStoreVersionId = iosSubmission.appStoreVersionId;
    
    if (cachedAppStoreVersionId) {
      console.log(`[SubmissionService] Using cached appStoreVersionId: ${cachedAppStoreVersionId}`);
      
      try {
        // ✅ Direct API call using cached version ID (skip getAppStoreVersions call!)
        const phasedReleaseResponse = await appleService.getPhasedReleaseForVersion(cachedAppStoreVersionId);
        
        if (!phasedReleaseResponse || !phasedReleaseResponse.data) {
          throw new Error('No phased release found for this version');
        }
        
        const phasedReleaseState = phasedReleaseResponse.data.attributes?.phasedReleaseState;
        phasedReleaseId = phasedReleaseResponse.data.id;
        
        console.log(`[SubmissionService] Found phased release: ${phasedReleaseId}, state: ${phasedReleaseState}`);
        
        // Validate state is PAUSED (only PAUSED releases can be resumed)
        if (phasedReleaseState !== 'PAUSED') {
          throw new Error(
            `Cannot resume phased release in state "${phasedReleaseState}". ` +
            `Only PAUSED releases can be resumed. Current state: ${phasedReleaseState}`
          );
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch phased release from Apple App Store Connect: ${errorMessage}`);
      }
      
    } else {
      // Fallback: Use old method if appStoreVersionId is not cached (backward compatibility)
      console.log(`[SubmissionService] No cached appStoreVersionId, using fallback method with targetAppId`);
      
    const targetAppId = integration.targetAppId;
    
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    try {
      console.log(`[SubmissionService] Fetching current PAUSED phased release ID for app ${targetAppId}`);
      phasedReleaseId = await appleService.getCurrentPhasedReleaseId(targetAppId, 'PAUSED');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch phased release from Apple App Store Connect: ${errorMessage}`);
    }

    if (!phasedReleaseId) {
      throw new Error(
        'No PAUSED phased release found for this app. ' +
        'The phased release may not be paused, may have completed, or does not exist. ' +
        'Only PAUSED phased releases can be resumed.'
      );
      }
    }

    // Step 9: Call Apple API to resume the phased release
    let appleResponse: any;
    try {
      console.log(`[SubmissionService] Resuming phased release ${phasedReleaseId} for submission ${submissionId}`);
      appleResponse = await appleService.resumePhasedRelease(phasedReleaseId);
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

    // Step 4: Validate submission status - can only complete when LIVE
    // If PAUSED, user must resume first before completing
    if (iosSubmission.status === SUBMISSION_STATUS.PAUSED) {
      throw new Error(
        `Please resume the rollout first, then try completing to 100%.`
      );
    }
    
    if (iosSubmission.status !== SUBMISSION_STATUS.LIVE) {
      throw new Error(
        `Cannot complete phased release with submission status: ${iosSubmission.status}. ` +
        `Must be LIVE. Current status: ${iosSubmission.status}`
      );
    }

    // Step 5: Get distribution to retrieve tenantId
    const distribution = await this.distributionRepository.findById(iosSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    const tenantId = distribution.tenantId;

    // Step 6: Find iOS store integration
    const storeIntegrationController = getStoreIntegrationController();
    
    // Validate storeType is APP_STORE (only supported type for iOS)
    const storeTypeUpper = iosSubmission.storeType.toUpperCase();
    
    if (storeTypeUpper !== STORE_TYPE.APP_STORE) {
      throw new Error(`Invalid iOS store type: ${iosSubmission.storeType}. Only ${STORE_TYPE.APP_STORE} is supported.`);
    }
    
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: BUILD_PLATFORM.IOS,
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      throw new Error(`No iOS store integration found for tenant ${tenantId}. Please configure App Store Connect credentials first.`);
    }

    const integration = integrations[0];

    // Validate integration status is VERIFIED
    // This ensures credentials are valid and verified before attempting Apple API operations
    validateIntegrationStatus(integration);

    // Step 7: Create Apple service from integration
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 8: Get phased release ID using cached appStoreVersionId (optimized!)
    let phasedReleaseId: string | null;
    
    // Try to use cached appStoreVersionId first (skip 1 Apple API call!)
    const cachedAppStoreVersionId = iosSubmission.appStoreVersionId;
    
    if (cachedAppStoreVersionId) {
      console.log(`[SubmissionService] Using cached appStoreVersionId: ${cachedAppStoreVersionId}`);
      
      try {
        // ✅ Direct API call using cached version ID (skip getAppStoreVersions call!)
        const phasedReleaseResponse = await appleService.getPhasedReleaseForVersion(cachedAppStoreVersionId);
        
        if (!phasedReleaseResponse || !phasedReleaseResponse.data) {
          throw new Error('No phased release found for this version');
        }
        
        const phasedReleaseState = phasedReleaseResponse.data.attributes?.phasedReleaseState;
        phasedReleaseId = phasedReleaseResponse.data.id;
        
        console.log(`[SubmissionService] Found phased release: ${phasedReleaseId}, state: ${phasedReleaseState}`);
        
        // Validate state is ACTIVE (must resume first if PAUSED)
        if (phasedReleaseState !== 'ACTIVE') {
          throw new Error(
            `Cannot complete phased release in Apple state "${phasedReleaseState}". ` +
            `Must be ACTIVE. If paused, please resume the rollout first before completing to 100%.`
          );
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch phased release from Apple App Store Connect: ${errorMessage}`);
      }
      
    } else {
      // Fallback: Use old method if appStoreVersionId is not cached (backward compatibility)
      console.log(`[SubmissionService] No cached appStoreVersionId, using fallback method with targetAppId`);
      
    const targetAppId = integration.targetAppId;
    
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    try {
      console.log(`[SubmissionService] Fetching current ACTIVE phased release ID for app ${targetAppId}`);
      phasedReleaseId = await appleService.getCurrentPhasedReleaseId(targetAppId, 'ACTIVE');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch phased release from Apple App Store Connect: ${errorMessage}`);
    }

    if (!phasedReleaseId) {
      throw new Error(
        'No ACTIVE phased release found for this app. ' +
        'If the release is PAUSED, please resume it first, then try completing. ' +
        'Note: This limitation only applies to older submissions without cached version IDs.'
      );
      }
    }

    // Step 9: Call Apple API to complete the phased release (set to 100%)
    let appleResponse: any;
    try {
      console.log(`[SubmissionService] Completing phased release ${phasedReleaseId} for submission ${submissionId}`);
      appleResponse = await appleService.completePhasedRelease(phasedReleaseId);
      console.log(`[SubmissionService] Successfully completed phased release ${phasedReleaseId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to complete phased release in Apple App Store Connect: ${errorMessage}`);
    }

    // Step 10: Update rollout percentage to 100% and status to LIVE in database (only after Apple API succeeds)
    // Note: If status was PAUSED, it becomes LIVE again since the rollout is now active at 100%
    const updatedSubmission = await this.iosSubmissionRepository.update(submissionId, {
      rolloutPercentage: 100,
      status: SUBMISSION_STATUS.LIVE
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update rollout percentage');
    }

    console.log(`[SubmissionService] Successfully completed rollout to 100% for submission ${submissionId}. Status: LIVE`);

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

  /**
   * Get submission artifact path for download.
   * Validates submission exists, belongs to tenant, and has artifact available.
   * 
   * Note: Only Android submissions have downloadable artifacts (AAB files).
   * iOS submissions reference TestFlight builds which cannot be downloaded.
   * 
   * Steps:
   * 1. Validate platform is ANDROID (iOS not supported)
   * 2. Query Android submission
   * 3. Validate submission exists
   * 4. Get distribution and validate tenant ownership
   * 5. Validate artifact path exists
   * 6. Return artifact path for presigned URL generation
   * 
   * @param submissionId - The submission ID
   * @param platform - Platform (must be ANDROID)
   * @param tenantId - Tenant ID for ownership validation
   * @returns The S3 artifact path
   * @throws Error if submission not found, doesn't belong to tenant, or artifact unavailable
   */
  async getSubmissionArtifactPath(
    submissionId: string,
    platform: 'ANDROID' | 'IOS',
    tenantId: string
  ): Promise<string> {
    // Step 1: Validate platform is ANDROID
    // iOS submissions don't have downloadable artifacts (only TestFlight reference)
    if (platform === 'IOS') {
      throw new Error('Artifact download not supported for iOS submissions. iOS builds are uploaded directly to TestFlight.');
    }

    // Step 2: Query Android submission
    const submission = await this.androidSubmissionRepository.findById(submissionId);

    // Step 3: Validate submission exists
    const submissionNotFound = !submission;
    if (submissionNotFound) {
      throw new Error(SUBMISSION_ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    // Step 4: Get distribution and validate tenant ownership
    const distribution = await this.distributionRepository.findById(submission.distributionId);
    
    const distributionNotFound = !distribution;
    if (distributionNotFound) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    // Security: Don't leak submission existence if tenant mismatch
    const tenantMismatch = distribution.tenantId !== tenantId;
    if (tenantMismatch) {
      throw new Error(SUBMISSION_ERROR_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    // Step 5: Validate artifact path exists
    const artifactPathMissing = !submission.artifactPath;
    if (artifactPathMissing) {
      throw new Error('Artifact not available for this submission');
    }

    // Step 6: Return artifact path
    return submission.artifactPath;
  }

  /**
   * Cancel iOS submission (iOS only)
   * Deletes the app store review submission in Apple App Store Connect
   * Updates submission status to CANCELLED in database
   * 
   * Requirements:
   * - Status must be SUBMITTED or IN_REVIEW
   * - Must be active (isActive = true)
   * - After cancellation, keeps isActive = true (for future resubmission)
   */
  async cancelSubmission(
    submissionId: string,
    reason: string,
    createdBy: string
  ): Promise<{ id: string; status: string; statusUpdatedAt: Date } | null> {
    // Step 1: Find iOS submission (cancel only applies to iOS for now)
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (!iosSubmission) {
      return null;
    }

    // Step 2: Verify submission can be cancelled (must be SUBMITTED or IN_REVIEW)
    const cancellableStatuses: SubmissionStatus[] = [SUBMISSION_STATUS.SUBMITTED, SUBMISSION_STATUS.IN_REVIEW];
    const isCancellable = cancellableStatuses.includes(iosSubmission.status);
    
    if (!isCancellable) {
      throw new Error(
        `Cannot cancel submission with status: ${iosSubmission.status}. ` +
        `Must be SUBMITTED or IN_REVIEW. Current status indicates the submission may have already been approved, rejected, or is live.`
      );
    }

    // Step 3: Verify submission is active
    if (!iosSubmission.isActive) {
      throw new Error('Cannot cancel inactive submission. Only active submissions can be cancelled.');
    }

    // Step 4: Get distribution to retrieve tenantId
    const distribution = await this.distributionRepository.findById(iosSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    const tenantId = distribution.tenantId;

    // Step 5: Find iOS store integration
    const storeIntegrationController = getStoreIntegrationController();
    
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: BUILD_PLATFORM.IOS,
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      throw new Error(`No iOS store integration found for tenant ${tenantId}. Please configure App Store Connect credentials first.`);
    }

    const integration = integrations[0];

    // Validate integration status is VERIFIED
    validateIntegrationStatus(integration);

    // Step 6: Create Apple service from integration
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 7: Get app store review submission ID to delete
    // We need to find the review submission for this version
    let reviewSubmissionId: string | null = null;
    
    // Try to use cached appStoreVersionId first (optimized!)
    const cachedAppStoreVersionId = iosSubmission.appStoreVersionId;
    
    if (cachedAppStoreVersionId) {
      console.log(`[SubmissionService] Using cached appStoreVersionId: ${cachedAppStoreVersionId}`);
      
      try {
        // Get review submissions for this version
        reviewSubmissionId = await appleService.getReviewSubmissionIdForVersion(cachedAppStoreVersionId);
        
        if (!reviewSubmissionId) {
          throw new Error('No app store review submission found for this version');
        }
        
        console.log(`[SubmissionService] Found review submission: ${reviewSubmissionId}`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch review submission from Apple App Store Connect: ${errorMessage}`);
      }
      
    } else {
      // Fallback: Use targetAppId to find the version first (backward compatibility)
      console.log(`[SubmissionService] No cached appStoreVersionId, using fallback method with targetAppId`);
      
      const targetAppId = integration.targetAppId;
      
      if (!targetAppId) {
        throw new Error(
          `Missing targetAppId in store integration ${integration.id}. ` +
          'Please configure the App Store Connect integration with the target app ID.'
        );
      }
      
      try {
        // Get app store version by version string
        const versionData = await appleService.getAppStoreVersionByVersionString(
          targetAppId,
          iosSubmission.version
        );
        
        if (!versionData) {
          throw new Error(`Version ${iosSubmission.version} not found in Apple App Store Connect`);
        }
        
        const appStoreVersionId = versionData.id;
        
        // Get review submission for this version
        reviewSubmissionId = await appleService.getReviewSubmissionIdForVersion(appStoreVersionId);
        
        if (!reviewSubmissionId) {
          throw new Error('No app store review submission found for this version');
        }
        
        console.log(`[SubmissionService] Found review submission: ${reviewSubmissionId}`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch review submission from Apple App Store Connect: ${errorMessage}`);
      }
    }

    // Step 8: Call Apple API to delete the review submission (cancel the submission)
    try {
      console.log(`[SubmissionService] Cancelling review submission ${reviewSubmissionId} for submission ${submissionId}`);
      await appleService.deleteReviewSubmission(reviewSubmissionId);
      console.log(`[SubmissionService] Successfully cancelled review submission ${reviewSubmissionId}`);
    } catch (error) {
      // If Apple API call fails, throw error to prevent database update
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cancel review submission in Apple App Store Connect: ${errorMessage}`);
    }

    // Step 9: Update submission status to CANCELLED in database (only after Apple API succeeds)
    // NOTE: Keep isActive = true (as per user requirement) for potential future resubmission
    const updatedSubmission = await this.iosSubmissionRepository.update(submissionId, {
      status: SUBMISSION_STATUS.CANCELLED
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update submission status to CANCELLED');
    }

    // Step 10: Record action in history
    await this.actionHistoryRepository.create({
      id: uuidv4(),
      submissionId,
      platform: SUBMISSION_PLATFORM.IOS,
      action: SUBMISSION_ACTION.CANCELLED,
      reason,
      createdBy
    });

    console.log(`[SubmissionService] Successfully cancelled submission ${submissionId}, isActive remains true`);

    return {
      id: updatedSubmission.id,
      status: updatedSubmission.status,
      statusUpdatedAt: updatedSubmission.statusUpdatedAt
    };
  }
}

