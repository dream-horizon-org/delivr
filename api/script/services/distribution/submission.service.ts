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
  ANDROID_SUBMISSION_STATUS,
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
import { BUILD_PLATFORM, STORE_TYPE, BUILD_TYPE } from '~types/release-management/builds/build.constants';
import { PLAY_STORE_UPLOAD_ERROR_MESSAGES, GOOGLE_PLAY_RELEASE_STATUS, PLAY_STORE_UPLOAD_CONSTANTS } from '../../constants/store';
import type { BuildArtifactService } from '~services/release/build';
import { S3Storage } from '../../storage/aws-storage';
import { buildArtifactS3Key, buildS3Uri, deriveStandardArtifactFilename } from '~utils/s3-path.utils';
import { inferContentType } from '~utils/s3-upload.utils';
import fetch from 'node-fetch';
const { GoogleAuth } = require('google-auth-library');
import { decryptFromStorage } from '../../utils/encryption';
import { StoreCredentialController } from '../../storage/integrations/store/store-controller';
import type { TestFlightBuildVerificationService } from '../release/testflight-build-verification.service';
import type { CronicleService } from '~services/cronicle';
import type { CronJobService } from '../release/cron-job/cron-job.service';
import type { ReleaseNotificationService } from '~services/release-notification';
import { NotificationType } from '~types/release-notification';
import { getAccountDetails } from '~utils/account.utils';

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
 * Helper function to get GoogleAuth client from integration
 */
const getGoogleAuthClientFromIntegration = async (
  integrationId: string
): Promise<{ accessToken: string; appIdentifier: string }> => {
  const storage = getStorage();
  const credentialController = (storage as any).storeCredentialController as StoreCredentialController;
  
  if (!credentialController) {
    throw new Error('StoreCredentialController not initialized. Storage setup may not have completed.');
  }
  
  // Get credentials from DB
  const existingCredential = await credentialController.findByIntegrationId(integrationId);
  if (!existingCredential) {
    throw new Error(PLAY_STORE_UPLOAD_ERROR_MESSAGES.CREDENTIALS_NOT_FOUND);
  }

  // Read and decrypt existing credential payload
  let decryptedPayload: string;
  try {
    const buffer = existingCredential.encryptedPayload;
    
    // Decrypt using backend storage decryption
    if (Buffer.isBuffer(buffer)) {
      // Convert buffer to string first
      const encryptedString = buffer.toString('utf8');
      decryptedPayload = decryptFromStorage(encryptedString);
    } else {
      decryptedPayload = decryptFromStorage(String(buffer));
    }
  } catch (readError) {
    throw new Error('Failed to decrypt existing credentials');
  }

  // Parse credential JSON
  let credentialData: any;
  try {
    credentialData = JSON.parse(decryptedPayload);
  } catch (parseError) {
    throw new Error('Failed to parse existing credential data');
  }

  // Get service account JSON
  const serviceAccountJson = credentialData;
  
  // Fix escaped newlines in private key
  const privateKey = serviceAccountJson.private_key.replace(/\\n/g, '\n');

  // Create GoogleAuth instance with service account credentials
  const credentials: any = {
    type: serviceAccountJson.type,
    private_key: privateKey,
    client_email: serviceAccountJson.client_email,
  };

  // Add optional fields if present
  if (serviceAccountJson.project_id) {
    credentials.project_id = serviceAccountJson.project_id;
  }
  if (serviceAccountJson.private_key_id) {
    credentials.private_key_id = serviceAccountJson.private_key_id;
  }
  if (serviceAccountJson.client_id) {
    credentials.client_id = serviceAccountJson.client_id;
  }
  if (serviceAccountJson.auth_uri) {
    credentials.auth_uri = serviceAccountJson.auth_uri;
  } else {
    credentials.auth_uri = 'https://accounts.google.com/o/oauth2/auth';
  }
  if (serviceAccountJson.token_uri) {
    credentials.token_uri = serviceAccountJson.token_uri;
  } else {
    credentials.token_uri = 'https://oauth2.googleapis.com/token';
  }
  if (serviceAccountJson.auth_provider_x509_cert_url) {
    credentials.auth_provider_x509_cert_url = serviceAccountJson.auth_provider_x509_cert_url;
  }
  if (serviceAccountJson.client_x509_cert_url) {
    credentials.client_x509_cert_url = serviceAccountJson.client_x509_cert_url;
  }

  const googleAuth = new GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/androidpublisher',
    ],
  });

  // Get access token
  const client = await googleAuth.getClient();
  const tokenResponse = await client.getAccessToken();
  const tokenMissing = !tokenResponse.token;
  
  if (tokenMissing) {
    throw new Error('Failed to obtain access token from Google service account');
  }

  // Get appIdentifier from integration
  const integrationController = getStoreIntegrationController();
  const integration = await integrationController.findById(integrationId);
  if (!integration) {
    throw new Error('Store integration not found');
  }

  return {
    accessToken: tokenResponse.token,
    appIdentifier: integration.appIdentifier,
  };
};

/**
 * Submission Service
 * Handles business logic for fetching submission details and Cronicle job management
 */
export class SubmissionService {
  constructor(
    private readonly androidSubmissionRepository: AndroidSubmissionBuildRepository,
    private readonly iosSubmissionRepository: IosSubmissionBuildRepository,
    private readonly actionHistoryRepository: SubmissionActionHistoryRepository,
    private readonly distributionRepository: DistributionRepository,
    private readonly buildArtifactService: BuildArtifactService,
    private readonly cronicleService: CronicleService | null,
    private readonly testflightBuildVerificationService?: TestFlightBuildVerificationService,
    private readonly appleAppStoreConnectService?: AppleAppStoreConnectService,
    private cronJobService?: CronJobService,
    private readonly releaseNotificationService?: ReleaseNotificationService
  ) {}

  /**
   * Set CronJobService after initialization (resolves circular dependency)
   */
  setCronJobService(cronJobService: CronJobService): void {
    this.cronJobService = cronJobService;
    console.log('[SubmissionService] CronJobService injected');
  }

  /**
   * Get user email from user ID
   * Helper method to look up email for notifications
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const storage = getStorage();
      const accountDetails = await getAccountDetails(storage, userId, 'SubmissionService');
      return accountDetails?.email ?? null;
    } catch (error) {
      console.error(`[SubmissionService] Failed to get email for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get submission details by ID
   * Attempts to find in both Android and iOS tables
   */
  async getSubmissionDetails(submissionId: string): Promise<SubmissionDetailsResponse | null> {
    // Try to find in Android submissions first
    const androidSubmission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (androidSubmission) {
      const actionHistory = await this.actionHistoryRepository.findBySubmissionId(submissionId);
      return await this.mapAndroidSubmissionToResponse(androidSubmission, actionHistory);
    }

    // If not found in Android, try iOS submissions
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (iosSubmission) {
      const actionHistory = await this.actionHistoryRepository.findBySubmissionId(submissionId);
      return await this.mapIosSubmissionToResponse(iosSubmission, actionHistory);
    }

    // Not found in either table
    return null;
  }

  /**
   * Map Android submission to API response format
   */
  private async mapAndroidSubmissionToResponse(
    submission: AndroidSubmissionBuild,
    actionHistory: SubmissionActionHistory[]
  ): Promise<SubmissionDetailsResponse> {
    const submitterEmail = submission.submittedBy 
      ? await this.getUserEmail(submission.submittedBy) 
      : null;
    
    const enrichedActionHistory = await Promise.all(
      actionHistory.map(async (h) => {
        const creatorEmail = h.createdBy ? await this.getUserEmail(h.createdBy) : null;
        return {
          action: h.action,
          createdBy: creatorEmail ?? h.createdBy,
          createdAt: h.createdAt,
          reason: h.reason
        };
      })
    );

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
      submittedBy: submitterEmail ?? submission.submittedBy,
      statusUpdatedAt: submission.statusUpdatedAt,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      artifact: {
        artifactPath: submission.artifactPath,
        internalTrackLink: submission.internalTrackLink
      },
      actionHistory: enrichedActionHistory
    };
  }

  /**
   * Map iOS submission to API response format
   */
  private async mapIosSubmissionToResponse(
    submission: IosSubmissionBuild,
    actionHistory: SubmissionActionHistory[]
  ): Promise<SubmissionDetailsResponse> {
    const submitterEmail = submission.submittedBy 
      ? await this.getUserEmail(submission.submittedBy) 
      : null;
    
    const enrichedActionHistory = await Promise.all(
      actionHistory.map(async (h) => {
        const creatorEmail = h.createdBy ? await this.getUserEmail(h.createdBy) : null;
        return {
          action: h.action,
          createdBy: creatorEmail ?? h.createdBy,
          createdAt: h.createdAt,
          reason: h.reason
        };
      })
    );

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
      submittedBy: submitterEmail ?? submission.submittedBy,
      statusUpdatedAt: submission.statusUpdatedAt,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      artifact: {
        testflightNumber: submission.testflightNumber
      },
      actionHistory: enrichedActionHistory
    };
  }

  /**
   * Comprehensive validation for iOS submission
   * 
   * Validates ALL prerequisites before submission:
   * 1. Request body fields (phasedRelease, resetRating, releaseNotes)
   * 2. iOS submission exists
   * 3. Submission is in PENDING state
   * 4. Distribution exists
   * 5. Tenant ownership validation (distribution.tenantId === tenantId)
   * 6. Store integration exists for the tenant
   * 7. Integration status is VERIFIED
   * 8. Integration has targetAppId configured
   */
  async validateIosSubmission(
    submissionId: string,
    data: SubmitIosRequest,
    tenantId: string
  ): Promise<{ valid: boolean; statusCode: number; error?: string; field?: string }> {
    // Step 1: Validate request body fields
    if (typeof data.phasedRelease !== 'boolean') {
      return {
        valid: false,
        statusCode: 400,
        error: 'phasedRelease must be a boolean',
        field: 'phasedRelease'
      };
    }

    if (typeof data.resetRating !== 'boolean') {
      return {
        valid: false,
        statusCode: 400,
        error: 'resetRating must be a boolean',
        field: 'resetRating'
      };
    }

    if (!data.releaseNotes || typeof data.releaseNotes !== 'string') {
      return {
        valid: false,
        statusCode: 400,
        error: 'releaseNotes is required and must be a string',
        field: 'releaseNotes'
      };
    }

    if (data.releaseNotes.trim().length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: 'Release notes cannot be empty',
        field: 'releaseNotes'
      };
    }

    // Step 2: Check if iOS submission exists
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (!iosSubmission) {
      return {
        valid: false,
        statusCode: 404,
        error: 'iOS submission not found'
      };
    }

    // Step 3: Check if submission is in PENDING state
    if (iosSubmission.status !== SUBMISSION_STATUS.PENDING) {
      return {
        valid: false,
        statusCode: 400,
        error: `Cannot submit submission with status: ${iosSubmission.status}. Must be PENDING.`
      };
    }

    // Step 4: Check if distribution exists
    const distribution = await this.distributionRepository.findById(iosSubmission.distributionId);
    
    if (!distribution) {
      return {
        valid: false,
        statusCode: 404,
        error: `Distribution not found for submission ${submissionId}`
      };
    }

    // Step 5: Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      return {
        valid: false,
        statusCode: 403,
        error: 'Submission does not belong to this tenant'
      };
    }

    // Step 6: Check if store integration exists
    const storeIntegrationController = getStoreIntegrationController();
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: 'IOS',
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: `No iOS store integration found for tenant ${tenantId}. Please configure App Store Connect credentials first.`
      };
    }

    const integration = integrations[0];

    // Step 7: Check if integration status is VERIFIED
    try {
      validateIntegrationStatus(integration);
    } catch (error) {
      return {
        valid: false,
        statusCode: 400,
        error: error instanceof Error ? error.message : 'Integration status validation failed'
      };
    }

    // Step 8: Check if targetAppId exists
    if (!integration.targetAppId) {
      return {
        valid: false,
        statusCode: 400,
        error: `Missing targetAppId in store integration ${integration.id}. Please configure the App Store Connect integration with the target app ID.`
      };
    }

    return { valid: true, statusCode: 200 };
  }

  /**
   * Comprehensive validation for Android submission
   * 
   * Validates ALL prerequisites before submission:
   * 1. Request body fields (rolloutPercent, inAppPriority, releaseNotes)
   * 2. Android submission exists
   * 3. Submission is in PENDING state
   * 4. Distribution exists
   * 5. Tenant ownership validation (distribution.tenantId === tenantId)
   * 6. Store integration exists for the tenant
   * 7. Integration status is VERIFIED
   */
  async validateAndroidSubmission(
    submissionId: string,
    data: SubmitAndroidRequest,
    tenantId: string
  ): Promise<{ valid: boolean; statusCode: number; error?: string; field?: string }> {
    // Step 1: Validate request body fields
    if (typeof data.rolloutPercent !== 'number') {
      return {
        valid: false,
        statusCode: 400,
        error: 'rolloutPercent must be a number',
        field: 'rolloutPercent'
      };
    }

    if (data.rolloutPercent < 0 || data.rolloutPercent > 100) {
      return {
        valid: false,
        statusCode: 400,
        error: 'rolloutPercent must be between 0 and 100',
        field: 'rolloutPercent'
      };
    }

    if (typeof data.inAppPriority !== 'number') {
      return {
        valid: false,
        statusCode: 400,
        error: 'inAppPriority must be a number',
        field: 'inAppPriority'
      };
    }

    if (data.inAppPriority < 0 || data.inAppPriority > 5) {
      return {
        valid: false,
        statusCode: 400,
        error: 'inAppPriority must be between 0 and 5',
        field: 'inAppPriority'
      };
    }

    if (!data.releaseNotes || typeof data.releaseNotes !== 'string') {
      return {
        valid: false,
        statusCode: 400,
        error: 'releaseNotes is required and must be a string',
        field: 'releaseNotes'
      };
    }

    if (data.releaseNotes.trim().length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: 'Release notes cannot be empty',
        field: 'releaseNotes'
      };
    }

    // Step 2: Check if Android submission exists
    const androidSubmission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (!androidSubmission) {
      return {
        valid: false,
        statusCode: 404,
        error: 'Android submission not found'
      };
    }

    // Step 3: Check if submission is in PENDING state
    if (androidSubmission.status !== SUBMISSION_STATUS.PENDING) {
      return {
        valid: false,
        statusCode: 400,
        error: `Cannot submit submission with status: ${androidSubmission.status}. Must be PENDING.`
      };
    }

    // Step 4: Check if distribution exists
    const distribution = await this.distributionRepository.findById(androidSubmission.distributionId);
    
    if (!distribution) {
      return {
        valid: false,
        statusCode: 404,
        error: `Distribution not found for submission ${submissionId}`
      };
    }

    // Step 5: Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      return {
        valid: false,
        statusCode: 403,
        error: 'Submission does not belong to this tenant'
      };
    }

    // Step 6: Check if store integration exists
    const storeIntegrationController = getStoreIntegrationController();
    const mappedStoreType = StoreType.PLAY_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: BUILD_PLATFORM.ANDROID,
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: `No Android store integration found for tenant ${tenantId}. Please configure Google Play Store credentials first.`
      };
    }

    const integration = integrations[0];

    // Step 7: Check if integration status is VERIFIED
    try {
      validateIntegrationStatus(integration);
    } catch (error) {
      return {
        valid: false,
        statusCode: 400,
        error: error instanceof Error ? error.message : 'Integration status validation failed'
      };
    }

    return { valid: true, statusCode: 200 };
  }

  /**
   * Comprehensive validation for creating new iOS submission (resubmission)
   * 
   * Validates ALL prerequisites before creating a new submission:
   * 1. Request body fields (version, testflightNumber, phasedRelease, resetRating, releaseNotes)
   * 2. Distribution exists
   * 3. Tenant ownership validation (distribution.tenantId === tenantId)
   * 4. Existing submission exists with REJECTED or CANCELLED status
   * 5. Version matches the last submission version (resubmissions must use same version)
   * 6. TestFlight build exists and matches version (via TestFlightBuildVerificationService)
   * 7. Store integration exists for the tenant
   * 8. Integration status is VERIFIED
   * 9. Integration has targetAppId configured
   */
  async validateCreateIosSubmission(
    distributionId: string,
    data: CreateNewIosSubmissionRequest,
    tenantId: string
  ): Promise<{ valid: boolean; statusCode: number; error?: string; field?: string }> {
    // Step 1: Validate request body fields
    if (!data.version || typeof data.version !== 'string') {
      return {
        valid: false,
        statusCode: 400,
        error: 'version is required and must be a string',
        field: 'version'
      };
    }

    if (data.version.trim().length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: 'version cannot be empty',
        field: 'version'
      };
    }

    if (!data.testflightNumber) {
      return {
        valid: false,
        statusCode: 400,
        error: 'testflightNumber is required',
        field: 'testflightNumber'
      };
    }

    if (typeof data.testflightNumber !== 'string' && typeof data.testflightNumber !== 'number') {
      return {
        valid: false,
        statusCode: 400,
        error: 'testflightNumber must be a string or number',
        field: 'testflightNumber'
      };
    }

    if (typeof data.phasedRelease !== 'boolean') {
      return {
        valid: false,
        statusCode: 400,
        error: 'phasedRelease must be a boolean',
        field: 'phasedRelease'
      };
    }

    if (typeof data.resetRating !== 'boolean') {
      return {
        valid: false,
        statusCode: 400,
        error: 'resetRating must be a boolean',
        field: 'resetRating'
      };
    }

    if (!data.releaseNotes || typeof data.releaseNotes !== 'string') {
      return {
        valid: false,
        statusCode: 400,
        error: 'releaseNotes is required and must be a string',
        field: 'releaseNotes'
      };
    }

    if (data.releaseNotes.trim().length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: 'Release notes cannot be empty',
        field: 'releaseNotes'
      };
    }

    // Step 2: Check if distribution exists
    const distribution = await this.distributionRepository.findById(distributionId);
    
    if (!distribution) {
      return {
        valid: false,
        statusCode: 404,
        error: `Distribution not found: ${distributionId}`
      };
    }

    // Step 3: Security validation - distribution must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      return {
        valid: false,
        statusCode: 403,
        error: 'Distribution does not belong to this tenant'
      };
    }

    // Step 4: Check if existing submission exists with valid resubmission state
    const existingSubmissions = await this.iosSubmissionRepository.findByDistributionId(distributionId);
    
    if (existingSubmissions.length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: `No existing iOS submission found for distribution ${distributionId}. Please create a new submission.`
      };
    }

    // Check for resubmittable submission (REJECTED or CANCELLED)
    const resubmittableSubmission = existingSubmissions.find(
      sub => sub.isActive && 
             (sub.status === SUBMISSION_STATUS.REJECTED || sub.status === SUBMISSION_STATUS.CANCELLED)
    );

    if (!resubmittableSubmission) {
      return {
        valid: false,
        statusCode: 400,
        error: `Cannot create new iOS submission for distribution ${distributionId}. No active submission found with REJECTED or CANCELLED status. Resubmission is only allowed after a submission has been rejected or cancelled.`
      };
    }

    // Step 5: Verify version matches the last submission version
    const lastSubmissionVersion = resubmittableSubmission.version;
    if (data.version !== lastSubmissionVersion) {
      return {
        valid: false,
        statusCode: 400,
        error: `Version mismatch: provided version '${data.version}' does not match last submission version '${lastSubmissionVersion}'. Resubmissions must use the same version.`,
        field: 'version'
      };
    }

    // Step 6: Verify TestFlight build number exists
    if (this.testflightBuildVerificationService) {
      try {
        const buildVerificationResult = await this.testflightBuildVerificationService.verifyBuild({
          releaseId: distribution.releaseId ?? '',
          tenantId,
          testflightBuildNumber: String(data.testflightNumber)
        });

        if (!buildVerificationResult.success) {
          const errorMessage = buildVerificationResult.error?.message ?? 'TestFlight build verification failed';
          return {
            valid: false,
            statusCode: 400,
            error: `TestFlight build verification failed: ${errorMessage}`,
            field: 'testflightNumber'
          };
        }

        // Additional check: verify the build data matches
        if (buildVerificationResult.data) {
          const buildData = buildVerificationResult.data;
          
          // Verify build number matches
          if (buildData.buildNumber !== String(data.testflightNumber)) {
            return {
              valid: false,
              statusCode: 400,
              error: `TestFlight build number mismatch: expected '${data.testflightNumber}', found '${buildData.buildNumber}'`,
              field: 'testflightNumber'
            };
          }

          // Verify version matches
          if (buildData.version !== data.version) {
            return {
              valid: false,
              statusCode: 400,
              error: `TestFlight build version mismatch: expected '${data.version}', found '${buildData.version}'`,
              field: 'version'
            };
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          valid: false,
          statusCode: 500,
          error: `Failed to verify TestFlight build: ${errorMessage}`,
          field: 'testflightNumber'
        };
      }
    }

    // Step 7: Check if store integration exists
    const storeIntegrationController = getStoreIntegrationController();
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: 'IOS',
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: `No iOS store integration found for tenant ${tenantId}. Please configure App Store Connect credentials first.`
      };
    }

    const integration = integrations[0];

    // Step 8: Check if integration status is VERIFIED
    try {
      validateIntegrationStatus(integration);
    } catch (error) {
      return {
        valid: false,
        statusCode: 400,
        error: error instanceof Error ? error.message : 'Integration status validation failed'
      };
    }

    // Step 9: Check if targetAppId exists
    if (!integration.targetAppId) {
      return {
        valid: false,
        statusCode: 400,
        error: `Missing targetAppId in store integration ${integration.id}. Please configure the App Store Connect integration with the target app ID.`
      };
    }

    return { valid: true, statusCode: 200 };
  }

  /**
   * Comprehensive validation for creating new Android submission (resubmission)
   * 
   * Validates ALL prerequisites before creating a new submission:
   * 1. Request body fields (version, versionCode, aabFile, rolloutPercent, inAppPriority, releaseNotes)
   * 2. Distribution exists
   * 3. Tenant ownership validation (distribution.tenantId === tenantId)
   * 4. Existing submission exists with SUSPENDED or HALTED status
   * 5. Store integration exists for the tenant
   * 6. Integration status is VERIFIED
   */
  async validateCreateAndroidSubmission(
    distributionId: string,
    data: CreateNewAndroidSubmissionRequest,
    tenantId: string
  ): Promise<{ valid: boolean; statusCode: number; error?: string; field?: string }> {
    // Step 1: Validate request body fields
    if (!data.version || typeof data.version !== 'string') {
      return {
        valid: false,
        statusCode: 400,
        error: 'version is required and must be a string',
        field: 'version'
      };
    }

    if (data.version.trim().length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: 'version cannot be empty',
        field: 'version'
      };
    }

    // versionCode is optional, but if provided must be a number
    if (data.versionCode !== undefined && typeof data.versionCode !== 'number') {
      return {
        valid: false,
        statusCode: 400,
        error: 'versionCode must be a number',
        field: 'versionCode'
      };
    }

    if (!data.aabFile) {
      return {
        valid: false,
        statusCode: 400,
        error: 'aabFile is required',
        field: 'aabFile'
      };
    }

    if (!(data.aabFile instanceof Buffer)) {
      return {
        valid: false,
        statusCode: 400,
        error: 'aabFile must be a Buffer',
        field: 'aabFile'
      };
    }

    if (data.aabFile.length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: 'aabFile cannot be empty',
        field: 'aabFile'
      };
    }

    if (typeof data.rolloutPercent !== 'number') {
      return {
        valid: false,
        statusCode: 400,
        error: 'rolloutPercent must be a number',
        field: 'rolloutPercent'
      };
    }

    if (data.rolloutPercent < 0 || data.rolloutPercent > 100) {
      return {
        valid: false,
        statusCode: 400,
        error: 'rolloutPercent must be between 0 and 100',
        field: 'rolloutPercent'
      };
    }

    if (typeof data.inAppPriority !== 'number') {
      return {
        valid: false,
        statusCode: 400,
        error: 'inAppPriority must be a number',
        field: 'inAppPriority'
      };
    }

    if (data.inAppPriority < 0 || data.inAppPriority > 5) {
      return {
        valid: false,
        statusCode: 400,
        error: 'inAppPriority must be between 0 and 5',
        field: 'inAppPriority'
      };
    }

    if (!data.releaseNotes || typeof data.releaseNotes !== 'string') {
      return {
        valid: false,
        statusCode: 400,
        error: 'releaseNotes is required and must be a string',
        field: 'releaseNotes'
      };
    }

    if (data.releaseNotes.trim().length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: 'Release notes cannot be empty',
        field: 'releaseNotes'
      };
    }

    // Step 2: Check if distribution exists
    const distribution = await this.distributionRepository.findById(distributionId);
    
    if (!distribution) {
      return {
        valid: false,
        statusCode: 404,
        error: `Distribution not found: ${distributionId}`
      };
    }

    // Step 3: Security validation - distribution must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      return {
        valid: false,
        statusCode: 403,
        error: 'Distribution does not belong to this tenant'
      };
    }

    // Step 4: Check if existing submission exists with valid resubmission state
    const existingSubmissions = await this.androidSubmissionRepository.findByDistributionId(distributionId);
    
    if (existingSubmissions.length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: `No existing Android submission found for distribution ${distributionId}. Use submitExistingSubmission API for first-time submissions.`
      };
    }

    // Check for resubmittable submission (SUSPENDED or HALTED for Android)
    const resubmittableSubmission = existingSubmissions.find(
      sub => sub.isActive && 
             (sub.status === ANDROID_SUBMISSION_STATUS.SUSPENDED || sub.status === ANDROID_SUBMISSION_STATUS.HALTED)
    );

    if (!resubmittableSubmission) {
      return {
        valid: false,
        statusCode: 400,
        error: `Cannot create new Android submission for distribution ${distributionId}. No active submission found with SUSPENDED or HALTED status. Resubmission is only allowed after a submission has been suspended or halted.`
      };
    }

    const lastSubmissionVersion = resubmittableSubmission.version;
    if (data.version !== lastSubmissionVersion) {
      return {
        valid: false,
        statusCode: 400,
        error: `Version mismatch: provided version '${data.version}' does not match last submission version '${lastSubmissionVersion}'. Resubmissions must use the same version.`,
        field: 'version'
      };
    }

    // Step 5: Check if store integration exists
    const storeIntegrationController = getStoreIntegrationController();
    const mappedStoreType = StoreType.PLAY_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: BUILD_PLATFORM.ANDROID,
      storeType: mappedStoreType
    });

    if (integrations.length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: `No Android store integration found for tenant ${tenantId}. Please configure Google Play Store credentials first.`
      };
    }

    const integration = integrations[0];

    // Step 6: Check if integration status is VERIFIED
    try {
      validateIntegrationStatus(integration);
    } catch (error) {
      return {
        valid: false,
        statusCode: 400,
        error: error instanceof Error ? error.message : 'Integration status validation failed'
      };
    }
    

    return { valid: true, statusCode: 200 };
  }

  /**
   * Submit existing iOS submission to App Store for review
   * Complete flow:
   * 1. Data validation
   * 2. Save data to database
   * 3. Validate tenant ownership
   * 4. Get store integration and credentials
   * 5. Decrypt and validate credentials
   * 6. Get version from Apple (check if exists)
   * 7. Create version if doesn't exist (+ button scenario)
   * 8. Validate version status is PREPARE_FOR_SUBMISSION
   *    - If version already has "What's New" filled, it will be overwritten
   *    - If version already has a build associated, it will be replaced
   * 9. Configure version before submission:
   *    a. Set release type (MANUAL, AFTER_APPROVAL, or SCHEDULED)
   *    b. Update "What's New" with release notes (overwrites existing)
   *    c. Check for existing build and replace if necessary, then associate new build
   *    d. Configure phased release (7-day gradual rollout if enabled)
   *    e. Configure reset ratings (reset App Store summary rating if enabled)
   *    f. Submit for review
   * 10. Change submission status to SUBMITTED
   * 11. Update distribution status based on configured platforms
   * 
   * NOTE: This method assumes all prerequisites have been validated by validateIosSubmission()
   */
  async submitExistingIosSubmission(
    submissionId: string,
    data: SubmitIosRequest,
    submittedBy: string,
    tenantId: string
  ): Promise<SubmissionDetailsResponse | null> {
    // NOTE: All validations are done in controller via validateIosSubmissionPrerequisites()
    // This method assumes all prerequisites are valid
    
    // Get iOS submission (guaranteed to exist by validation)
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (!iosSubmission) {
      return null; // Should never happen if validation was done
    }

    // Step 1: Save submission data to database
    const updatedSubmission = await this.iosSubmissionRepository.update(submissionId, {
      phasedRelease: data.phasedRelease,
      resetRating: data.resetRating,
      releaseNotes: data.releaseNotes,
      releaseType: 'AFTER_APPROVAL', // Fixed: Automatically release after App Review approval
      rolloutPercentage: 0, // Always start at 0% - will be set to 1% or 100% when LIVE
      submittedAt: new Date(),
      submittedBy
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update submission');
    }

    // Step 2: Get distribution to retrieve tenantId (guaranteed to exist by validation)
    const distribution = await this.distributionRepository.findById(iosSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    // Step 3: Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      throw new Error('Submission does not belong to this tenant');
    }

    // Step 4: Get store integration and credentials (guaranteed to exist and be valid by validation)
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
    const targetAppId = integration.targetAppId;

    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    // Step 5: Create Apple service (decrypts credentials, generates JWT token)
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 6: Get or create app store version before submission
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
      // Note: Pass testflightNumber as BOTH parameters because build.attributes.version equals the TestFlight build number
      const buildId = await appleService.getBuildIdByBuildNumber(
        targetAppId,
        updatedSubmission.testflightNumber,
        updatedSubmission.testflightNumber  
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
      await appleService.submitForReview(targetAppId, appStoreVersionId);
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

    // Step 9.5: Send notification (iOS App Store Build Submitted)
    if (this.releaseNotificationService && distribution.releaseId) {
      try {
        console.log(`[SubmissionService] Sending iOS App Store submission notification for release ${distribution.releaseId}`);
        
        // Get user email from ID for notification
        const submitterEmail = await this.getUserEmail(submittedBy);
        
        if (submitterEmail) {
          await this.releaseNotificationService.notify({
            type: NotificationType.IOS_APPSTORE_BUILD_SUBMITTED,
            tenantId: distribution.tenantId,
            releaseId: distribution.releaseId,
            version: finalSubmission.version,
            testflightBuild: finalSubmission.testflightNumber,
            submittedBy: submitterEmail
          });
          
          console.log(`[SubmissionService] iOS App Store submission notification sent successfully`);
        } else {
          console.warn('[SubmissionService] Skipping notification: submitter email not found for user ID:', submittedBy);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SubmissionService] Failed to send iOS submission notification:', errorMessage);
        // Don't fail the submission if notification fails
      }
    }

    // Step 9.6: Create Cronicle job for status sync (if Cronicle is available)
    if (this.cronicleService) {
      try {
        const cronicleJobId = await this.createIosSubmissionJob(
          submissionId,
          finalSubmission.version
        );

        // Store job ID in database
        await this.iosSubmissionRepository.update(submissionId, {
          cronicleJobId
        });

        console.log(`[SubmissionService] Created Cronicle job ${cronicleJobId} for submission ${submissionId}`);
      } catch (error) {
        console.error('[SubmissionService] Failed to create Cronicle job for submission:', error);
        // Don't fail the submission if job creation fails
      }
    }

    // Step 10: Update distribution status based on configured platforms
    const configuredPlatforms = distribution.configuredListOfPlatforms;
    const currentDistributionStatus = distribution.status;

    // Check if only iOS is configured
    const onlyIOS = configuredPlatforms.length === 1 && configuredPlatforms.includes(BUILD_PLATFORM.IOS);
    
    // Check if both platforms are configured
    const bothPlatforms = configuredPlatforms.includes(BUILD_PLATFORM.IOS) && configuredPlatforms.includes(BUILD_PLATFORM.ANDROID);

    let newDistributionStatus = currentDistributionStatus;

    // Rule: Don't change if already in release phase (PARTIALLY_RELEASED or RELEASED)
    const isInReleasePhase = currentDistributionStatus === DISTRIBUTION_STATUS.PARTIALLY_RELEASED || 
                              currentDistributionStatus === DISTRIBUTION_STATUS.RELEASED;

    if (isInReleasePhase) {
      console.log(`[SubmissionService] Distribution already in release phase (${currentDistributionStatus}), not changing status`);
    } else if (onlyIOS) {
      // Only one platform configured → change to SUBMITTED
      newDistributionStatus = DISTRIBUTION_STATUS.SUBMITTED;
      console.log(`[SubmissionService] Only iOS configured, updating distribution status to SUBMITTED`);
    } else if (bothPlatforms) {
      // Both platforms configured
      if (currentDistributionStatus === DISTRIBUTION_STATUS.PENDING) {
        // First platform submitted → PARTIALLY_SUBMITTED
        newDistributionStatus = DISTRIBUTION_STATUS.PARTIALLY_SUBMITTED;
        console.log(`[SubmissionService] First platform submitted (iOS), updating distribution status to PARTIALLY_SUBMITTED`);
      } else if (currentDistributionStatus === DISTRIBUTION_STATUS.PARTIALLY_SUBMITTED) {
        // Second platform submitted → SUBMITTED
        newDistributionStatus = DISTRIBUTION_STATUS.SUBMITTED;
        console.log(`[SubmissionService] Second platform submitted (iOS), updating distribution status to SUBMITTED`);
      }
    }

    // Update distribution status if changed
    if (newDistributionStatus !== currentDistributionStatus) {
      await this.distributionRepository.update(distribution.id, {
        status: newDistributionStatus
      });
      console.log(`[SubmissionService] Updated distribution ${distribution.id} status from ${currentDistributionStatus} to ${newDistributionStatus}`);
      
      // Complete release if all platforms submitted (status is terminal submission state)
      const shouldCompleteRelease = 
        newDistributionStatus === DISTRIBUTION_STATUS.SUBMITTED ||
        newDistributionStatus === DISTRIBUTION_STATUS.PARTIALLY_RELEASED ||
        newDistributionStatus === DISTRIBUTION_STATUS.RELEASED;
      
      if (shouldCompleteRelease && distribution.releaseId && this.cronJobService) {
        try {
          console.log(`[SubmissionService] Distribution ${distribution.id} is ${newDistributionStatus} - calling completeRelease for release ${distribution.releaseId}`);
          
          const result = await this.cronJobService.completeRelease(
            distribution.releaseId,
            submittedBy
          );

          if (result.success) {
            console.log(`[SubmissionService] Successfully completed release ${distribution.releaseId}:`, result.data);
          } else {
            console.warn(`[SubmissionService] Failed to complete release ${distribution.releaseId}:`, result);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[SubmissionService] Error calling completeRelease:', errorMessage);
        }
      }
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
   * 2. Validates tenant ownership
   * 3. Calls Google Play Console API to submit for review
   * 4. If successful, changes status to SUBMITTED
   */
  async submitExistingAndroidSubmission(
    submissionId: string,
    data: SubmitAndroidRequest,
    submittedBy: string,
    tenantId: string
  ): Promise<SubmissionDetailsResponse | null> {
    // NOTE: All validations are done in controller via validateAndroidSubmission()
    // This method assumes all prerequisites are valid
    
    // Get Android submission (guaranteed to exist by validation)
    const androidSubmission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (!androidSubmission) {
      return null;
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

    // Step 3: Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      throw new Error('Submission does not belong to this tenant');
    }

    // Step 4: Get store integration and credentials
    const storeIntegrationController = getStoreIntegrationController();
    const integrations = await storeIntegrationController.findAll({
      tenantId,
      storeType: StoreType.PLAY_STORE,
      platform: BUILD_PLATFORM.ANDROID,
    });

    // Use first integration found
    const integration = integrations[0];


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
      const status = isFullRollout ? GOOGLE_PLAY_RELEASE_STATUS.COMPLETED : GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS;
      
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
        status: ANDROID_SUBMISSION_STATUS.SUBMITTED
    });

    if (!finalSubmission) {
      throw new Error('Failed to update submission status to SUBMITTED');
    }

      console.log(`[SubmitAndroidSubmission] Updated Android submission ${submissionId} status to SUBMITTED`);

      // Step 12.5: Send notification (Android Play Store Build Submitted)
      if (this.releaseNotificationService && distribution.releaseId) {
        try {
          console.log(`[SubmitAndroidSubmission] Sending Android Play Store submission notification for release ${distribution.releaseId}`);
          
          // Get user email from ID for notification
          const submitterEmail = await this.getUserEmail(submittedBy);
          
          if (submitterEmail) {
            await this.releaseNotificationService.notify({
              type: NotificationType.ANDROID_PLAYSTORE_BUILD_SUBMITTED,
              tenantId: distribution.tenantId,
              releaseId: distribution.releaseId,
              version: finalSubmission.version,
              versionCode: String(finalSubmission.versionCode),
              submittedBy: submitterEmail
            });
            
            console.log(`[SubmitAndroidSubmission] Android Play Store submission notification sent successfully`);
          } else {
            console.warn('[SubmitAndroidSubmission] Skipping notification: submitter email not found for user ID:', submittedBy);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[SubmitAndroidSubmission] Failed to send Android submission notification:', errorMessage);
          // Don't fail the submission if notification fails
        }
      }

      // Step 12.6: Create Cronicle job for status sync (if Cronicle is available)
      if (this.cronicleService) {
        try {
          const cronicleJobId = await this.createAndroidSubmissionJob( // TODO: Implement this
            submissionId,
            finalSubmission.version
          );

          const cronicleCreatedDate = new Date();

          // Store job ID and creation date in database
          await this.androidSubmissionRepository.update(submissionId, {
            cronicleJobId,
            cronicleCreatedDate
          });

          console.log(`[SubmitAndroidSubmission] Created Cronicle job ${cronicleJobId} for submission ${submissionId} (created: ${cronicleCreatedDate.toISOString()})`);
        } catch (error) {
          console.error('[SubmitAndroidSubmission] Failed to create Cronicle job:', error);
          // Don't fail the submission if job creation fails
        }
      }

      // Step 13: Update distribution status based on configured platforms
      const configuredPlatforms = distribution.configuredListOfPlatforms;
      const currentDistributionStatus = distribution.status;

      // Check if only Android is configured
      const onlyAndroid = configuredPlatforms.length === 1 && configuredPlatforms.includes(BUILD_PLATFORM.ANDROID);
      
      // Check if both platforms are configured
      const bothPlatforms = configuredPlatforms.includes(BUILD_PLATFORM.IOS) && configuredPlatforms.includes(BUILD_PLATFORM.ANDROID);

      let newDistributionStatus = currentDistributionStatus;

      // Rule: Don't change if already in release phase (PARTIALLY_RELEASED or RELEASED)
      const isInReleasePhase = currentDistributionStatus === DISTRIBUTION_STATUS.PARTIALLY_RELEASED || 
                                currentDistributionStatus === DISTRIBUTION_STATUS.RELEASED;

      if (isInReleasePhase) {
        console.log(`[SubmitAndroidSubmission] Distribution already in release phase (${currentDistributionStatus}), not changing status`);
      } else if (onlyAndroid) {
        // Only one platform configured → change to SUBMITTED
        newDistributionStatus = DISTRIBUTION_STATUS.SUBMITTED;
        console.log(`[SubmitAndroidSubmission] Only Android configured, updating distribution status to SUBMITTED`);
      } else if (bothPlatforms) {
        // Both platforms configured
        if (currentDistributionStatus === DISTRIBUTION_STATUS.PENDING) {
          // First platform submitted → PARTIALLY_SUBMITTED
          newDistributionStatus = DISTRIBUTION_STATUS.PARTIALLY_SUBMITTED;
          console.log(`[SubmitAndroidSubmission] First platform submitted (Android), updating distribution status to PARTIALLY_SUBMITTED`);
        } else if (currentDistributionStatus === DISTRIBUTION_STATUS.PARTIALLY_SUBMITTED) {
          // Second platform submitted → SUBMITTED
          newDistributionStatus = DISTRIBUTION_STATUS.SUBMITTED;
          console.log(`[SubmitAndroidSubmission] Second platform submitted (Android), updating distribution status to SUBMITTED`);
        }
      }

      // Update distribution status if changed
      if (newDistributionStatus !== currentDistributionStatus) {
        await this.distributionRepository.update(distribution.id, {
          status: newDistributionStatus
        });
        console.log(`[SubmitAndroidSubmission] Updated distribution ${distribution.id} status from ${currentDistributionStatus} to ${newDistributionStatus}`);
        
        // Complete release if all platforms submitted (status is terminal submission state)
        const shouldCompleteRelease = 
          newDistributionStatus === DISTRIBUTION_STATUS.SUBMITTED ||
          newDistributionStatus === DISTRIBUTION_STATUS.PARTIALLY_RELEASED ||
          newDistributionStatus === DISTRIBUTION_STATUS.RELEASED;
        
        if (shouldCompleteRelease && distribution.releaseId && this.cronJobService) {
          try {
            console.log(`[SubmitAndroidSubmission] Distribution ${distribution.id} is ${newDistributionStatus} - calling completeRelease for release ${distribution.releaseId}`);
            
            const result = await this.cronJobService.completeRelease(
              distribution.releaseId,
              submittedBy
            );

            if (result.success) {
              console.log(`[SubmitAndroidSubmission] Successfully completed release ${distribution.releaseId}:`, result.data);
            } else {
              console.warn(`[SubmitAndroidSubmission] Failed to complete release ${distribution.releaseId}:`, result);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[SubmitAndroidSubmission] Error calling completeRelease:', errorMessage);
          }
        }
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
    submittedBy: string,
    tenantId: string
  ): Promise<SubmissionDetailsResponse> {
    // NOTE: All validations are done in controller via validateCreateIosSubmission()
    // This method assumes all prerequisites are valid
    
    // Get distribution (guaranteed to exist by validation)
    const distribution = await this.distributionRepository.findById(distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found: ${distributionId}`);
    }

    // Security validation - distribution must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      throw new Error('Distribution does not belong to this tenant');
    }

    // Get existing submissions (guaranteed to exist by validation)
    const existingSubmissions = await this.iosSubmissionRepository.findByDistributionId(distributionId);
    
    // Find active submission with REJECTED or CANCELLED status (guaranteed to exist by validation)
    const resubmittableSubmission = existingSubmissions.find(
      sub => sub.isActive && 
             (sub.status === SUBMISSION_STATUS.REJECTED || sub.status === SUBMISSION_STATUS.CANCELLED)
    );

    console.log(
      `[SubmissionService] Found existing ${resubmittableSubmission.status} iOS submission: ${resubmittableSubmission.id}. ` +
      `Will validate Apple version state before making any database changes.`
    );

    // Step 1: Get store integration and credentials FIRST (before any DB writes)
    // This ensures we can validate with Apple before modifying the database
    const storeIntegrationController = getStoreIntegrationController();
    const mappedStoreType = StoreType.APP_STORE;

    const integrations = await storeIntegrationController.findAll({
      tenantId,
      platform: BUILD_PLATFORM.IOS,
      storeType: mappedStoreType
    });

    const integration = integrations[0];
    const targetAppId = integration.targetAppId;

    // Step 2: Create Apple service (decrypts credentials, generates JWT token)
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 3: VALIDATE Apple version state BEFORE any database writes
    // CRITICAL: This must happen BEFORE marking old submission inactive or creating new one
    // If validation fails, no database changes should be made
    let appStoreVersionId: string;
    const versionString = data.version;

    try {
      console.log(`[SubmissionService] Checking for existing version ${versionString} in Apple App Store Connect`);
      
      // Step 3a: Check if version exists in Apple
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

    // ==================================================================================
    // VALIDATION PASSED - Now safe to make database changes
    // ==================================================================================

    // Step 4: Create completely new submission with new ID
    // NOTE: Create new submission FIRST, mark old as inactive AFTER success
    // This ensures atomicity - if submission fails, old submission remains active for retry
    console.log(`[SubmissionService] Validation passed. Creating new iOS submission for distribution ${distributionId}`);
    
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
      rolloutPercentage: 0, // Always start at 0% - will be set to 1% or 100% when LIVE
      isActive: true,
      submittedBy: null // Will be set after submission
    });

    if (!newSubmission) {
      throw new Error('Failed to create new submission');
    }

    console.log(`[SubmissionService] Successfully created new submission ${newSubmissionId}`);

    // Step 5: Configure version and submit for review
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
      // Note: Pass testflightNumber as BOTH parameters because build.attributes.version equals the TestFlight build number
      const buildId = await appleService.getBuildIdByBuildNumber(
        targetAppId,
        data.testflightNumber,
        data.testflightNumber  // ✅ Use testflightNumber for API filter (same as test API fix)
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
      await appleService.submitForReview(targetAppId, appStoreVersionId);
      console.log(`[SubmissionService] ✓ Successfully submitted version ${versionString} to Apple App Store for review`);
    } catch (error) {
      // If Apple API call fails, throw error to prevent status update
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to submit to Apple App Store for review: ${errorMessage}`);
    }

    // Step 6: Change submission status to SUBMITTED and save appStoreVersionId (only after Apple API succeeds)
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

    // Step 7: Mark old submission as inactive (ONLY after new submission is successfully created and submitted)
    // This ensures atomicity - if anything above failed, old submission remains active for retry
    console.log(`[SubmissionService] New submission successful. Now marking old submission ${resubmittableSubmission.id} as inactive`);
    await this.iosSubmissionRepository.update(resubmittableSubmission.id, {
      isActive: false
    });
    console.log(`[SubmissionService] Marked old iOS submission ${resubmittableSubmission.id} as inactive`);

    // Step 7.5: Send notification (iOS App Store Build Resubmitted)
    if (this.releaseNotificationService && distribution.releaseId) {
      try {
        console.log(`[SubmissionService] Sending iOS App Store resubmission notification for release ${distribution.releaseId}`);
        
        // Get user email from ID for notification
        const submitterEmail = await this.getUserEmail(submittedBy);
        
        if (submitterEmail) {
          await this.releaseNotificationService.notify({
            type: NotificationType.IOS_APPSTORE_BUILD_RESUBMITTED,
            tenantId: distribution.tenantId,
            releaseId: distribution.releaseId,
            version: finalSubmission.version,
            testflightBuild: finalSubmission.testflightNumber,
            submittedBy: submitterEmail
          });
          
          console.log(`[SubmissionService] iOS App Store resubmission notification sent successfully`);
        } else {
          console.warn('[SubmissionService] Skipping notification: submitter email not found for user ID:', submittedBy);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SubmissionService] Failed to send iOS resubmission notification:', errorMessage);
        // Don't fail the submission if notification fails
      }
    }

    // Step 7.6: Create Cronicle job for status sync (if Cronicle is available)
    if (this.cronicleService) {
      try {
        const cronicleJobId = await this.createIosSubmissionJob(
          newSubmissionId,
          finalSubmission.version
        );

        // Store job ID in database
        await this.iosSubmissionRepository.update(newSubmissionId, {
          cronicleJobId
        });

        console.log(`[SubmissionService] Created Cronicle job ${cronicleJobId} for new submission ${newSubmissionId}`);
      } catch (error) {
        console.error('[SubmissionService] Failed to create Cronicle job for new submission:', error);
        // Don't fail the submission if job creation fails
      }
    }

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
   * Complete flow:
   * 1. Validate distribution exists and get tenantId
   * 2. Check for active submission (any status) - mark as inactive if found
   * 3. Check for active releases in production track - mark as SUSPENDED if found
   * 4. Upload AAB to S3
   * 5. Create new submission record
   * 6. Create edit session
   * 7. Upload bundle to Google Play
   * 8. Fetch current production track state
   * 9. Update track (assigning release)
   * 10. Validate (dry run)
   * 11. Commit (live submission)
   * 12. Update submission status to SUBMITTED
   */
  async createNewAndroidSubmission(
    distributionId: string,
    data: CreateNewAndroidSubmissionRequest,
    submittedBy: string,
    tenantId: string
  ): Promise<SubmissionDetailsResponse> {
    let editId: string | null = null;
    let packageName: string | null = null;
    let accessToken: string | null = null;
    let artifactPath: string | null = null;
    let previousVersionCode: number | null = null;
    let productionTrackState: any = null;

    try {
      // Step 1: Validate distribution exists and get tenantId
    const distribution = await this.distributionRepository.findById(distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found: ${distributionId}`);
    }

      // Security validation - distribution must belong to the claimed tenant
      if (distribution.tenantId !== tenantId) {
        throw new Error('Distribution does not belong to this tenant');
      }

      console.log(`[SubmissionService] Step 1 completed: Distribution found for ${distributionId}, tenantId: ${tenantId}`);

      // Step 2: Validate existing submission exists and check for active submission with USER_ACTION_PENDING or SUSPENDED status
    const existingSubmissions = await this.androidSubmissionRepository.findByDistributionId(distributionId);
    

    // Find active submission with USER_ACTION_PENDING or SUSPENDED status
    const activeSubmission = existingSubmissions.find(
      sub => sub.isActive && 
             (sub.status === ANDROID_SUBMISSION_STATUS.USER_ACTION_PENDING || 
              sub.status === ANDROID_SUBMISSION_STATUS.SUSPENDED)
    );

    if (!activeSubmission) {
      throw new Error(
        `Cannot create new Android submission for distribution ${distributionId}. ` +
        `No active submission found with ${ANDROID_SUBMISSION_STATUS.USER_ACTION_PENDING} or ${ANDROID_SUBMISSION_STATUS.SUSPENDED} status. ` +
        `Resubmission requires an existing active submission in one of these states.`
      );
    }

    // Extract versionCode from previous active submission
    previousVersionCode = activeSubmission.versionCode ?? null;

    // Validate that versionCode exists for active submission
    if (previousVersionCode === null || previousVersionCode === undefined) {
      throw new Error(
        `Cannot create new Android submission for distribution ${distributionId}. ` +
        `Active submission ${activeSubmission.id} does not have a valid versionCode. ` +
        `versionCode is required for resubmission.`
      );
    }

    console.log(
      `[SubmissionService] Step 2 completed: Found active Android submission: ${activeSubmission.id} with status ${activeSubmission.status}. ` +
      `Previous versionCode: ${previousVersionCode}. ` +
      `This submission is still active (Cronicle set it to SUSPENDED but kept isActive=true for resubmission). ` +
      `Will mark as inactive and create new submission.`
    );

    // NOTE: We keep the old submission active until new one succeeds
    // Even though status is SUSPENDED, isActive remains true (set by Cronicle for resubmission)
    // Old submission's Cronicle job is already stopped (Cronicle stopped it when status became SUSPENDED)
    console.log(`[SubmissionService] Step 3: Old submission ${activeSubmission.id} will remain active until new submission succeeds.`);

      // Step 3: Get store integration to get packageName and credentials
      const storeIntegrationController = getStoreIntegrationController();
      const integrations = await storeIntegrationController.findAll({
        tenantId,
        storeType: StoreType.PLAY_STORE,
        platform: BUILD_PLATFORM.ANDROID,
      });

      if (integrations.length === 0) {
        throw new Error(`No Play Store integration found for tenant ${tenantId}. Please configure Play Store credentials first.`);
      }

      const verifiedIntegration = integrations.find(i => i.status === IntegrationStatus.VERIFIED);
      if (!verifiedIntegration) {
        throw new Error('No verified Play Store integration found for this tenant');
      }

      packageName = verifiedIntegration.appIdentifier;
      const integrationId = verifiedIntegration.id;

      validateIntegrationStatus(verifiedIntegration);

      // Get GoogleAuth client and access token
      const authResult = await getGoogleAuthClientFromIntegration(integrationId);
      accessToken = authResult.accessToken;

      const apiBaseUrl = PLAY_STORE_UPLOAD_CONSTANTS.API_BASE_URL;

      // Step 4: Check for active releases in production track and remove old version
      console.log(`[SubmissionService] Step 6: Checking for active releases in production track`);
      
      // Create edit to check for active releases
      const createEditUrlForCheck = `${apiBaseUrl}/applications/${packageName}/edits`;
      const createEditResponseForCheck = await fetch(createEditUrlForCheck, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!createEditResponseForCheck.ok) {
        const errorText = await createEditResponseForCheck.text().catch(() => 'Unknown error');
        throw new Error(`Failed to create edit for active release check: ${createEditResponseForCheck.status} ${errorText}`);
      }

      const editDataForCheck = await createEditResponseForCheck.json();
      const editIdForCheck = editDataForCheck.id;

      try {
        // Get current production track state
        const productionStateUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editIdForCheck}/tracks/production`;
        const productionStateResponse = await fetch(productionStateUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (productionStateResponse.ok) {
          // Store the full production track state response
          productionTrackState = await productionStateResponse.json();
          
          console.log(`[SubmissionService] Step 6: Fetched production track state`);
          console.log(`[SubmissionService] Response body:`, JSON.stringify(productionTrackState, null, 2));
          
          // Remove the release containing previousVersionCode
          const releases = productionTrackState.releases || [];
          const filteredReleases = releases.filter((release: any) => {
            // Check if this release contains the previousVersionCode
            const hasPreviousVersionCode = release.versionCodes && 
                                           release.versionCodes.includes(String(previousVersionCode));
            return !hasPreviousVersionCode;
          });
          
          // Update the stored productionTrackState with filtered releases
          productionTrackState = {
            ...productionTrackState,
            releases: filteredReleases
          };
          
          console.log(`[SubmissionService] Step 6 completed: Removed release with versionCode ${previousVersionCode} from track state`);
          console.log(`[SubmissionService] Remaining releases:`, JSON.stringify(filteredReleases, null, 2));
        } else {
          // If we can't get the track state, we'll need to fetch it later
          console.warn(`[SubmissionService] Step 6: Could not fetch production track state, will fetch later`);
        }
      } finally {
        // Always delete the check edit
        try {
          const deleteEditUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editIdForCheck}`;
          await fetch(deleteEditUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
        } catch (deleteError) {
          console.warn('[SubmissionService] Failed to delete check edit, it will expire automatically');
        }
      }

      // Step 5: Upload AAB to S3 first
      console.log(`[SubmissionService] Step 7: Uploading AAB to S3`);
      const storage = getStorage();
      const isS3Storage = storage instanceof S3Storage;
      
      if (!isS3Storage) {
        throw new Error('S3Storage not available - cannot upload AAB to S3');
      }

      const s3Storage = storage as S3Storage;

      // Generate a temporary buildId for S3 upload
      const tempBuildId = uuidv4();
      const originalFilename = 'resubmission.aab';
      
      // Generate S3 key from metadata
      const fileName = deriveStandardArtifactFilename(originalFilename, tempBuildId);
      const s3Key = buildArtifactS3Key(
        { tenantId, releaseId: distribution.releaseId, platform: BUILD_PLATFORM.ANDROID, artifactVersionName: data.version },
        fileName
      );
      const contentType = inferContentType(fileName);
      const bucketName = s3Storage.getS3BucketName();

      // Upload buffer to S3
      await s3Storage.uploadBufferToS3(s3Key, data.aabFile, contentType);

      // Generate S3 URI
      artifactPath = buildS3Uri(bucketName, s3Key);
      console.log(`[SubmissionService] Step 7 completed: AAB uploaded to S3 at ${artifactPath}`);

      // Step 6: Create new submission record
      console.log(`[SubmissionService] Step 8: Creating new Android submission record`);
      const newSubmissionId = uuidv4();
      
      // Extract versionCode from AAB if not provided (will be updated after Google API call)
      const versionCode = data.versionCode ?? 0; // Will be updated after bundle upload

      const newSubmission = await this.androidSubmissionRepository.create({
        id: newSubmissionId,
        distributionId,
        artifactPath,
        version: data.version,
        versionCode,
        buildType: BUILD_TYPE.MANUAL, // Resubmissions are always manual
        storeType: STORE_TYPE.PLAY_STORE,
        status: ANDROID_SUBMISSION_STATUS.PENDING, // Will be updated to SUBMITTED after API call
        releaseNotes: data.releaseNotes,
        rolloutPercentage: data.rolloutPercent,
        inAppUpdatePriority: data.inAppPriority,
        submittedBy,
        isActive: true,
      });

      console.log(`[SubmissionService] Step 8 completed: Created new Android submission ${newSubmissionId}`);

      // Step 7: Create edit session for resubmission
      console.log(`[SubmissionService] Step 9: Creating edit session for resubmission`);
      console.log(`[SubmissionService] Request body: {}`);
      
      const createEditUrl = `${apiBaseUrl}/applications/${packageName}/edits`;
      const createEditResponse = await fetch(createEditUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!createEditResponse.ok) {
        const errorText = await createEditResponse.text().catch(() => 'Unknown error');
        throw new Error(`Failed to create edit: ${createEditResponse.status} ${errorText}`);
      }

      const editData = await createEditResponse.json();
      editId = editData.id;

      console.log(`[SubmissionService] Step 9 completed: Edit session created with ID ${editId}`);
      console.log(`[SubmissionService] Response body:`, JSON.stringify(editData, null, 2));

      // Step 8: Upload bundle to Google Play
      console.log(`[SubmissionService] Step 10: Uploading AAB bundle to Google Play`);
      const uploadBundleUrl = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}/edits/${editId}/bundles?uploadType=media`;
      
      const uploadBundleResponse = await fetch(uploadBundleUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: data.aabFile,
      });

      if (!uploadBundleResponse.ok) {
        const errorText = await uploadBundleResponse.text().catch(() => 'Unknown error');
        throw new Error(`Failed to upload bundle: ${uploadBundleResponse.status} ${errorText}`);
      }

      const bundleData = await uploadBundleResponse.json();
      const uploadedVersionCode = bundleData.versionCode;

      if (!uploadedVersionCode || typeof uploadedVersionCode !== 'number') {
        throw new Error('Failed to get version code from bundle upload response');
      }

      console.log(`[SubmissionService] Step 10 completed: Bundle uploaded with versionCode ${uploadedVersionCode}`);
      console.log(`[SubmissionService] Response body:`, JSON.stringify(bundleData, null, 2));

      // Update submission with actual versionCode
      await this.androidSubmissionRepository.update(newSubmissionId, {
        versionCode: uploadedVersionCode,
      });

      // Step 9: Update track (assigning the release)
      // Using stored productionTrackState from Step 6 (already has previousVersionCode release removed)
      console.log(`[SubmissionService] Step 11: Updating production track with new release`);
      
      if (!productionTrackState) {
        throw new Error('Production track state not available. Cannot update track without track state data.');
      }
      
      // Use all remaining releases from Step 5 (already has previousVersionCode removed)
      const existingReleases = productionTrackState.releases || [];

      const parsedReleaseNotes = this.parseReleaseNotes(data.releaseNotes ?? '');
      
      // Determine status and userFraction based on rolloutPercentage
      const rolloutPercentage = data.rolloutPercent;
      const isFullRollout = rolloutPercentage === 100;
      const status = isFullRollout ? GOOGLE_PLAY_RELEASE_STATUS.COMPLETED : GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS;
      
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
        name: data.version,
        versionCodes: [String(uploadedVersionCode)],
        status: status,
        inAppUpdatePriority: data.inAppPriority,
        releaseNotes: parsedReleaseNotes.length > 0 ? parsedReleaseNotes : [
          {
            language: 'en-US',
            text: data.releaseNotes ?? 'Release notes'
          }
        ],
      };

      // Add userFraction only if not full rollout
      if (!isFullRollout && userFraction !== undefined) {
        newRelease.userFraction = userFraction;
      }

      // Build track update payload - preserve existing releases and add new one
      const updatedReleases = [
        newRelease,
        ...existingReleases
      ];

      const updateTrackRequestBody = {
        track: 'production',
        releases: updatedReleases,
      };

      console.log(`[SubmissionService] Request body:`, JSON.stringify(updateTrackRequestBody, null, 2));

      const updateTrackUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}/tracks/production`;
      const updateTrackResponse = await fetch(updateTrackUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateTrackRequestBody),
      });

      if (!updateTrackResponse.ok) {
        const errorText = await updateTrackResponse.text().catch(() => 'Unknown error');
        throw new Error(`Failed to update track: ${updateTrackResponse.status} ${errorText}`);
      }

      const updateTrackData = await updateTrackResponse.json();
      console.log(`[SubmissionService] Step 11 completed: Track updated successfully`);
      console.log(`[SubmissionService] Response body:`, JSON.stringify(updateTrackData, null, 2));

      // Step 10: Validate (dry run)
      console.log(`[SubmissionService] Step 12: Validating edit (dry run)`);
      const validateUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}:validate`;
      const validateResponse = await fetch(validateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!validateResponse.ok) {
        const errorText = await validateResponse.text().catch(() => 'Unknown error');
        throw new Error(`Validation failed: ${validateResponse.status} ${errorText}`);
      }

      const validateData = await validateResponse.json();
      console.log(`[SubmissionService] Step 12 completed: Validation successful`);
      console.log(`[SubmissionService] Response body:`, JSON.stringify(validateData, null, 2));

      // Step 11: Commit (live submission)
      console.log(`[SubmissionService] Step 13: Committing edit (live submission)`);
      const commitUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}:commit`;
      const commitResponse = await fetch(commitUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!commitResponse.ok) {
        const errorText = await commitResponse.text().catch(() => 'Unknown error');
        throw new Error(`Failed to commit edit: ${commitResponse.status} ${errorText}`);
      }

      const commitData = await commitResponse.json();
      console.log(`[SubmissionService] Step 13 completed: Edit committed successfully`);
      console.log(`[SubmissionService] Response body:`, JSON.stringify(commitData, null, 2));

      // Step 12: Update submission status to SUBMITTED
      console.log(`[SubmissionService] Step 13: Updating submission status to SUBMITTED`);
      await this.androidSubmissionRepository.update(newSubmissionId, {
        status: ANDROID_SUBMISSION_STATUS.SUBMITTED,
        submittedAt: new Date()
      });

      console.log(`[SubmissionService] Step 12 completed: Submission status updated to SUBMITTED`);

      // Step 13: Mark old submission as inactive (ONLY after new submission is successfully created and submitted)
      // This ensures atomicity - if anything above failed, old submission remains active for retry
      console.log(`[SubmissionService] Step 13: New submission successful. Now marking old submission ${activeSubmission.id} as inactive with status SUSPENDED`);
      await this.androidSubmissionRepository.update(activeSubmission.id, {
        isActive: false,
        status: ANDROID_SUBMISSION_STATUS.SUSPENDED,
        cronicleJobId: null // Clear the job ID
      });
      console.log(`[SubmissionService] Step 13 completed: Marked old Android submission ${activeSubmission.id} as inactive with status SUSPENDED`);

      // Step 13.5: Stop old submission's Cronicle job if it still exists (AFTER marking as inactive)
      // NOTE: For SUSPENDED submissions, Cronicle already stopped the job (cronicleJobId should be null)
      // For HALTED submissions, the job might still be running, so we stop it here
      // This ensures proper cleanup order - submission is inactive first, then job is stopped
      if (activeSubmission.cronicleJobId) {
        console.log(`[SubmissionService] Step 13.5: Stopping Cronicle job ${activeSubmission.cronicleJobId} for old submission ${activeSubmission.id}`);
        try {
          await this.deleteSubmissionJob(activeSubmission.id, activeSubmission.cronicleJobId);
          console.log(`[SubmissionService] Step 13.5 completed: Stopped Cronicle job ${activeSubmission.cronicleJobId}`);
        } catch (error) {
          console.error(`[SubmissionService] Failed to stop Cronicle job ${activeSubmission.cronicleJobId}:`, error);
          // Don't fail the resubmission if job deletion fails (job is already disabled in DB by clearing cronicleJobId)
        }
      } else {
        console.log(`[SubmissionService] Step 13.5: No Cronicle job to stop (already stopped by Cronicle when status became SUSPENDED)`);
      }

      // Step 14: Create Cronicle job for status sync (if Cronicle is available)
      if (this.cronicleService) {
        try {
          const cronicleJobId = await this.createAndroidSubmissionJob(
            newSubmissionId,
            data.version
          );

          // Store job ID and creation date in database
          const cronicleCreatedDate = new Date();
          
          await this.androidSubmissionRepository.update(newSubmissionId, {
            cronicleJobId,
            cronicleCreatedDate
          });

          console.log(`[SubmissionService] Step 14 completed: Created Cronicle job ${cronicleJobId} for new submission ${newSubmissionId} (created: ${cronicleCreatedDate.toISOString()})`);
        } catch (error) {
          console.error('[SubmissionService] Failed to create Cronicle job for new submission:', error);
          // Don't fail the submission if job creation fails
        }
      }

      // Step 15: Get full submission details for response
      const finalSubmission = await this.androidSubmissionRepository.findById(newSubmissionId);
      if (!finalSubmission) {
        throw new Error('Failed to retrieve created submission');
      }

      // Build response
      const response: SubmissionDetailsResponse = {
        id: finalSubmission.id,
        distributionId: finalSubmission.distributionId,
        platform: BUILD_PLATFORM.ANDROID,
        storeType: finalSubmission.storeType,
        status: finalSubmission.status,
        version: finalSubmission.version,
        rolloutPercentage: finalSubmission.rolloutPercentage ?? 0,
        releaseNotes: finalSubmission.releaseNotes,
        submittedAt: finalSubmission.submittedAt,
        submittedBy: finalSubmission.submittedBy,
        statusUpdatedAt: finalSubmission.statusUpdatedAt,
        createdAt: finalSubmission.createdAt,
        updatedAt: finalSubmission.updatedAt,
        artifact: {
          artifactPath: finalSubmission.artifactPath,
        },
        actionHistory: [], // No action history entry for Android resubmission
        versionCode: finalSubmission.versionCode,
        inAppPriority: finalSubmission.inAppUpdatePriority ?? undefined,
      };

      console.log(`[SubmissionService] Android resubmission completed successfully for submission ${newSubmissionId}`);
      return response;

    } catch (error) {
      // Clean up edit on error if it was created
      if (editId && packageName && accessToken) {
        try {
          const apiBaseUrlForCleanup = PLAY_STORE_UPLOAD_CONSTANTS.API_BASE_URL;
          const deleteEditUrl = `${apiBaseUrlForCleanup}/applications/${packageName}/edits/${editId}`;
          await fetch(deleteEditUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          console.log(`[SubmissionService] Cleaned up edit ${editId} after error`);
        } catch (deleteError) {
          console.warn(`[SubmissionService] Failed to delete edit after error, it will expire automatically`);
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SubmissionService] Android resubmission failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Pause iOS rollout (iOS only)
   * Updates submission status to PAUSED and records action in history
   */
  async pauseRollout(
    submissionId: string, 
    reason: string, 
    createdBy: string,
    tenantId: string
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

    // Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      throw new Error('Submission does not belong to this tenant');
    }

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

    // Step 7: Get phased release ID using appStoreVersionId
    const appStoreVersionId = iosSubmission.appStoreVersionId;
    
    if (!appStoreVersionId) {
      throw new Error(
        `Missing appStoreVersionId for submission ${submissionId}. ` +
        'Cannot pause phased release without version ID.'
      );
    }
    
    console.log(`[SubmissionService] Using appStoreVersionId: ${appStoreVersionId}`);
    
    let phasedReleaseId: string;
    
    try {
      const phasedReleaseResponse = await appleService.getPhasedReleaseForVersion(appStoreVersionId);
        
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
   * Halt Android rollout (Android only)
   * Updates submission status to HALTED and records action in history
   * 
   * Note: This is the Android equivalent of iOS pause functionality
   */
  async haltAndroidRollout(
    submissionId: string, 
    reason: string, 
    createdBy: string,
    tenantId: string
  ): Promise<{ id: string; status: string; statusUpdatedAt: Date }> {
    // Step 1: Find Android submission (halt only applies to Android)
    const androidSubmission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (!androidSubmission) {
      throw new Error(`Android submission not found: ${submissionId}`);
    }

    // Step 2: Verify submission can be halted (must be IN_PROGRESS or COMPLETED)
    const canHalt = androidSubmission.status === ANDROID_SUBMISSION_STATUS.IN_PROGRESS || 
                    androidSubmission.status === ANDROID_SUBMISSION_STATUS.COMPLETED;
    
    if (!canHalt) {
      throw new Error(
        `Cannot halt submission with status: ${androidSubmission.status}. ` +
        `Must be ${ANDROID_SUBMISSION_STATUS.IN_PROGRESS} or ${ANDROID_SUBMISSION_STATUS.COMPLETED}.`
      );
    }

    // Step 3: Get distribution to retrieve tenantId
    const distribution = await this.distributionRepository.findById(androidSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    // Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      throw new Error('Submission does not belong to this tenant');
    }

    // Step 4: Get store integration and verify status is VERIFIED
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

    // Verify integration status is VERIFIED
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

    console.log(`[HaltAndroidRollout] Created edit with ID: ${editId}`);

    try {
      // Step 7: Get current production state
      const productionStateData = await googleService.getProductionTrack(editId);
      
      console.log('[HaltAndroidRollout] Current production state:', JSON.stringify(productionStateData, null, 2));

      // Step 8: Find the release that matches this submission's versionCode
      const submissionVersionCode = String(androidSubmission.versionCode);
      const existingReleases = productionStateData.releases || [];
      
      const releaseIndex = existingReleases.findIndex(release => 
        release.versionCodes && release.versionCodes.includes(submissionVersionCode)
      );

      if (releaseIndex === -1) {
        throw new Error(
          `No release found in production track with versionCode ${submissionVersionCode}. ` +
          `The submission must be submitted to production first before halting.`
        );
      }

      // Get the release to validate
      const existingRelease = existingReleases[releaseIndex] as {
        name: string;
        versionCodes: string[];
        status: string;
        userFraction?: number;
        inAppUpdatePriority?: number;
        releaseNotes?: Array<{ language: string; text: string }>;
      };

      // Validate release status must be IN_PROGRESS or COMPLETED (can only halt active releases)
      const isValidStatus = existingRelease.status === GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS || 
                             existingRelease.status === GOOGLE_PLAY_RELEASE_STATUS.COMPLETED;
      if (!isValidStatus) {
        throw new Error(
          `Release with versionCode ${submissionVersionCode} cannot be halted. ` +
          `Current status: ${existingRelease.status}. ` +
          `Only releases with status '${GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS}' or '${GOOGLE_PLAY_RELEASE_STATUS.COMPLETED}' can be halted.`
        );
      }

      // Step 9: Update the release to halt it
      // For Android, halting means changing status to 'halted' and keeping userFraction unchanged
      const updatedReleases = [...existingReleases] as Array<{
        name: string;
        versionCodes: string[];
        status: string;
        userFraction?: number;
        inAppUpdatePriority?: number;
        releaseNotes?: Array<{ language: string; text: string }>;
      }>;
      
      const releaseToUpdate = { ...updatedReleases[releaseIndex] };
      
      // Change status to 'halted' to halt the rollout (keep userFraction as it was)
      releaseToUpdate.status = GOOGLE_PLAY_RELEASE_STATUS.HALTED;
      // userFraction remains unchanged

      updatedReleases[releaseIndex] = releaseToUpdate;

      // Step 10: Build track update payload
      const trackUpdatePayload = {
        track: 'production',
        releases: updatedReleases,
      };

      console.log('[HaltAndroidRollout] Updating track with payload:', JSON.stringify(trackUpdatePayload, null, 2));

      // Step 11: Update track
      await googleService.updateProductionTrack(editId, trackUpdatePayload);
      console.log('[HaltAndroidRollout] Track updated successfully');

      // Step 12: Validate the edit (optional dry run)
      try {
        await googleService.validateEdit(editId);
        console.log('[HaltAndroidRollout] Edit validation successful');
      } catch (validationError) {
        const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
        console.error('[HaltAndroidRollout] Validation failed:', errorMessage);
        throw new Error(`Edit validation failed: ${errorMessage}`);
      }

      // Step 13: Commit edit
      const commitResult = await googleService.commitEdit(editId);
      console.log('[HaltAndroidRollout] Edit committed successfully:', JSON.stringify(commitResult, null, 2));

      // Step 14: Update submission status to HALTED in database (only after Google API succeeds)
      const updatedSubmission = await this.androidSubmissionRepository.update(submissionId, {
        status: ANDROID_SUBMISSION_STATUS.HALTED
      });

      if (!updatedSubmission) {
        throw new Error('Failed to update submission status to HALTED');
      }

      // Step 15: Record action in history
      await this.actionHistoryRepository.create({
        id: uuidv4(),
        submissionId,
        platform: SUBMISSION_PLATFORM.ANDROID,
        action: SUBMISSION_ACTION.HALTED,
        reason,
        createdBy
      });

      console.log(`[HaltAndroidRollout] Successfully halted submission ${submissionId}`);

      return {
        id: updatedSubmission.id,
        status: updatedSubmission.status,
        statusUpdatedAt: updatedSubmission.statusUpdatedAt
      };
    } catch (error) {
      // Clean up: Delete edit if it was created
      console.log(`[HaltAndroidRollout] Error occurred, deleting edit ${editId}`);
      await googleService.deleteEdit(editId);
      throw error;
    }
  }

  /**
   * Resume rollout (iOS or Android)
   * Updates submission status from PAUSED/HALTED back to LIVE/IN_PROGRESS/COMPLETED
   */
  async resumeRollout(
    submissionId: string,
    createdBy: string,
    platform: string,
    tenantId: string
  ): Promise<{ id: string; status: string; statusUpdatedAt: Date } | null> {
    // If platform is specified and it's Android, use Android resume
    if (platform && platform.toUpperCase() === 'ANDROID') {
      return this.resumeAndroidRollout(submissionId, createdBy, tenantId);
    }

    // Default to iOS resume (backward compatibility)
    return this.resumeRolloutIOS(submissionId, createdBy, tenantId);
  }

  /**
   * Resume Android rollout (Android only)
   * Updates submission status from HALTED back to IN_PROGRESS or COMPLETED
   */
  async resumeAndroidRollout(
    submissionId: string,
    createdBy: string,
    tenantId: string
  ): Promise<{ id: string; status: string; statusUpdatedAt: Date }> {
    // Step 1: Find Android submission (resume only applies to Android)
    const androidSubmission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (!androidSubmission) {
      throw new Error(`Android submission not found: ${submissionId}`);
    }

    // Step 2: Verify submission can be resumed (must be HALTED)
    if (androidSubmission.status !== ANDROID_SUBMISSION_STATUS.HALTED) {
      throw new Error(
        `Cannot resume submission with status: ${androidSubmission.status}. ` +
        `Must be ${ANDROID_SUBMISSION_STATUS.HALTED}.`
      );
    }

    // Step 3: Get distribution to retrieve tenantId
    const distribution = await this.distributionRepository.findById(androidSubmission.distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution not found for submission ${submissionId}`);
    }

    // Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      throw new Error('Submission does not belong to this tenant');
    }

    // Step 4: Get store integration and verify status is VERIFIED
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

    // Verify integration status is VERIFIED
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

    console.log(`[ResumeAndroidRollout] Created edit with ID: ${editId}`);

    try {
      // Step 7: Get current production state
      const productionStateData = await googleService.getProductionTrack(editId);
      
      console.log('[ResumeAndroidRollout] Current production state:', JSON.stringify(productionStateData, null, 2));

      // Step 8: Find the release that matches this submission's versionCode
      const submissionVersionCode = String(androidSubmission.versionCode);
      const existingReleases = productionStateData.releases || [];
      
      const releaseIndex = existingReleases.findIndex(release => 
        release.versionCodes && release.versionCodes.includes(submissionVersionCode)
      );

      if (releaseIndex === -1) {
        throw new Error(
          `No release found in production track with versionCode ${submissionVersionCode}. ` +
          `The submission must be submitted to production first before resuming.`
        );
      }

      // Get the release to validate
      const existingRelease = existingReleases[releaseIndex] as {
        name: string;
        versionCodes: string[];
        status: string;
        userFraction?: number;
        inAppUpdatePriority?: number;
        releaseNotes?: Array<{ language: string; text: string }>;
      };

      // Validate release status must be HALTED (can only resume halted releases)
      if (existingRelease.status !== GOOGLE_PLAY_RELEASE_STATUS.HALTED) {
        throw new Error(
          `Release with versionCode ${submissionVersionCode} cannot be resumed. ` +
          `Current status: ${existingRelease.status}. ` +
          `Only releases with status '${GOOGLE_PLAY_RELEASE_STATUS.HALTED}' can be resumed.`
        );
      }

      // Step 9: Update the release to resume it
      // For Android, resuming means changing status from 'halted' back to 'inProgress' or 'completed'
      // based on userFraction: if userFraction === 1.0 or missing, status = 'completed', else 'inProgress'
      const updatedReleases = [...existingReleases] as Array<{
        name: string;
        versionCodes: string[];
        status: string;
        userFraction?: number;
        inAppUpdatePriority?: number;
        releaseNotes?: Array<{ language: string; text: string }>;
      }>;
      
      const releaseToUpdate = { ...updatedReleases[releaseIndex] };
      
      // Determine status based on userFraction
      const userFraction = releaseToUpdate.userFraction;
      
      // Check if it's a full rollout (userFraction === 1.0 or missing)
      const isFullRollout = userFraction === undefined || userFraction === 1.0;
      
      if (isFullRollout) {
        // If userFraction is exactly 1.0 or missing, set status to completed and remove userFraction
        releaseToUpdate.status = GOOGLE_PLAY_RELEASE_STATUS.COMPLETED;
      } else {
        // Validate userFraction is in valid range for inProgress (0.0001 to < 1.0)
        const MIN_USER_FRACTION = 0.0001;
        const MAX_USER_FRACTION = 1.0;
        
        if (userFraction < MIN_USER_FRACTION) {
          throw new Error(
            `Invalid userFraction: ${userFraction}. ` +
            `For inProgress status, userFraction must be between ${MIN_USER_FRACTION} and ${MAX_USER_FRACTION}. ` +
            `Current value is too low.`
          );
        }
        
        // Valid range (0.0001 to < 1.0): set status to inProgress and keep userFraction
        releaseToUpdate.status = GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS;
        // userFraction is already in the object, no need to set it again
      }

      updatedReleases[releaseIndex] = releaseToUpdate;

      // Step 10: Build track update payload
      const trackUpdatePayload = {
        track: 'production',
        releases: updatedReleases,
      };

      console.log('[ResumeAndroidRollout] Updating track with payload:', JSON.stringify(trackUpdatePayload, null, 2));

      // Step 11: Update track
      await googleService.updateProductionTrack(editId, trackUpdatePayload);
      console.log('[ResumeAndroidRollout] Track updated successfully');

      // Step 12: Validate the edit (optional dry run)
      try {
        await googleService.validateEdit(editId);
        console.log('[ResumeAndroidRollout] Edit validation successful');
      } catch (validationError) {
        const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
        console.error('[ResumeAndroidRollout] Validation failed:', errorMessage);
        throw new Error(`Edit validation failed: ${errorMessage}`);
      }

      // Step 13: Commit edit
      const commitResult = await googleService.commitEdit(editId);
      console.log('[ResumeAndroidRollout] Edit committed successfully:', JSON.stringify(commitResult, null, 2));

      // Step 14: Update submission status in database (only after Google API succeeds)
      // Status should match the Google Play API status: IN_PROGRESS or COMPLETED
      const newStatus = isFullRollout 
        ? ANDROID_SUBMISSION_STATUS.COMPLETED 
        : ANDROID_SUBMISSION_STATUS.IN_PROGRESS;
      
      const updatedSubmission = await this.androidSubmissionRepository.update(submissionId, {
        status: newStatus
      });

      if (!updatedSubmission) {
        throw new Error(`Failed to update submission status to ${newStatus}`);
      }

      // Step 15: Record action in history
      await this.actionHistoryRepository.create({
        id: uuidv4(),
        submissionId,
        platform: SUBMISSION_PLATFORM.ANDROID,
        action: SUBMISSION_ACTION.RESUMED,
        reason: null,
        createdBy
      });

      console.log(`[ResumeAndroidRollout] Successfully resumed submission ${submissionId}`);

      return {
        id: updatedSubmission.id,
        status: updatedSubmission.status,
        statusUpdatedAt: updatedSubmission.statusUpdatedAt
      };

    } catch (error) {
      // Cleanup: Delete edit on error
      try {
        await googleService.deleteEdit(editId);
        console.log(`[ResumeAndroidRollout] Cleaned up edit ${editId} after error`);
      } catch (cleanupError) {
        console.warn(`[ResumeAndroidRollout] Failed to cleanup edit ${editId}:`, cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Resume iOS rollout (iOS only)
   * Updates submission status from PAUSED back to LIVE
   */
  async resumeRolloutIOS(
    submissionId: string,
    createdBy: string,
    tenantId: string
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

    // Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      throw new Error('Submission does not belong to this tenant');
    }

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

    // Step 6: Get phased release ID using appStoreVersionId
    const appStoreVersionId = iosSubmission.appStoreVersionId;
    
    if (!appStoreVersionId) {
      throw new Error(
        `Missing appStoreVersionId for submission ${submissionId}. ` +
        'Cannot resume phased release without version ID.'
      );
    }
    
    console.log(`[SubmissionService] Using appStoreVersionId: ${appStoreVersionId}`);
    
    let phasedReleaseId: string;
    
    try {
      const phasedReleaseResponse = await appleService.getPhasedReleaseForVersion(appStoreVersionId);
        
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
      reason: null,
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
    rolloutPercent: number,
    tenantId: string
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

    // Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      throw new Error('Submission does not belong to this tenant');
    }

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

    // Step 8: Get phased release ID using appStoreVersionId
    const appStoreVersionId = iosSubmission.appStoreVersionId;
    
    if (!appStoreVersionId) {
      throw new Error(
        `Missing appStoreVersionId for submission ${submissionId}. ` +
        'Cannot complete phased release without version ID.'
      );
    }
    
    console.log(`[SubmissionService] Using appStoreVersionId: ${appStoreVersionId}`);
    
    let phasedReleaseId: string;
    
    try {
      const phasedReleaseResponse = await appleService.getPhasedReleaseForVersion(appStoreVersionId);
        
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
    rolloutPercent: number,
    tenantId: string
  ): Promise<{ id: string; rolloutPercentage: number; statusUpdatedAt: Date }> {
    // Find Android submission
    const androidSubmission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (!androidSubmission) {
      throw new Error(`Android submission not found: ${submissionId}`);
    }

  // Validate rollout percentage (0-100, supports decimals like 0.01)
  const isInvalidNumber = !Number.isFinite(rolloutPercent) || isNaN(rolloutPercent);
  if (isInvalidNumber) {
    throw new Error('Rollout percentage must be a valid number');
  }

  const isOutOfRange = rolloutPercent < 0 || rolloutPercent > 100;
  if (isOutOfRange) {
    throw new Error('Rollout percentage must be between 0 and 100 (supports decimals like 0.01)');
  }

  // Step 1: Get distribution to retrieve tenantId
  const distribution = await this.distributionRepository.findById(androidSubmission.distributionId);
  
  if (!distribution) {
    throw new Error(`Distribution not found for submission ${submissionId}`);
  }

  // Security validation - submission must belong to the claimed tenant
  if (distribution.tenantId !== tenantId) {
    throw new Error('Submission does not belong to this tenant');
  }

  // Step 2: Get store integration and verify status is VERIFIED
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

  // Verify integration status is VERIFIED
  validateIntegrationStatus(integration);

  // Step 3: Create Google service (decrypts credentials, generates access token)
  let googleService: GooglePlayStoreService;
  try {
    googleService = await createGoogleServiceFromIntegration(integration.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load Google Play Store credentials: ${errorMessage}`);
  }

  // Step 4: Create edit
  const editData = await googleService.createEdit();
  const editId = editData.id;

  console.log(`[UpdateAndroidRollout] Created edit with ID: ${editId}`);

  try {
    // Step 5: Get current production state
    const productionStateData = await googleService.getProductionTrack(editId);
    
    console.log('[UpdateAndroidRollout] Current production state:', JSON.stringify(productionStateData, null, 2));

    // Step 6: Find the release that matches this submission's versionCode
    const submissionVersionCode = String(androidSubmission.versionCode);
    const existingReleases = productionStateData.releases || [];
    
    // Find the release with matching versionCode
    const releaseIndex = existingReleases.findIndex(release => 
      release.versionCodes && release.versionCodes.includes(submissionVersionCode)
    );

    if (releaseIndex === -1) {
      throw new Error(
        `No release found in production track with versionCode ${submissionVersionCode}. ` +
        `The submission must be submitted to production first before updating rollout percentage.`
      );
    }

    // Get the release to validate and update
    const existingRelease = existingReleases[releaseIndex] as {
      name: string;
      versionCodes: string[];
      status: string;
      userFraction?: number;
      inAppUpdatePriority?: number;
      releaseNotes?: Array<{ language: string; text: string }>;
    };

    // Validation 1: Check release status must be IN_PROGRESS or COMPLETED
    const isValidStatus = existingRelease.status === GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS || 
                          existingRelease.status === GOOGLE_PLAY_RELEASE_STATUS.COMPLETED;
    if (!isValidStatus) {
      throw new Error(
        `Release with versionCode ${submissionVersionCode} is not yet released. ` +
        `Current status: ${existingRelease.status}. ` +
        `Only releases with status '${GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS}' or '${GOOGLE_PLAY_RELEASE_STATUS.COMPLETED}' can have their rollout percentage updated.`
      );
    }

    // Step 7: Calculate userFraction from rolloutPercent
    // Convert rolloutPercent (0-100) to userFraction (0-1)
    const userFraction = rolloutPercent / 100;
    
    // Validation 2: Check that new userFraction is greater than existing userFraction
    // (We can only increase rollout, not decrease)
    const existingUserFraction = existingRelease.userFraction;
    if (existingUserFraction !== undefined) {
      const isDecreasing = userFraction <= existingUserFraction;
      if (isDecreasing) {
        throw new Error(
          `Cannot decrease rollout percentage. ` +
          `Current rollout: ${(existingUserFraction * 100).toFixed(2)}%, ` +
          `Requested rollout: ${rolloutPercent}%. ` +
          `Rollout percentage can only be increased, not decreased.`
        );
      }
    }

    // Validation 3: Fix isFullRollout check - rolloutPercent max is 100, so userFraction max is 1
    const isFullRollout = rolloutPercent === 100 || userFraction === 1;

    // Step 8: Update the matching release
    // Use a more flexible type to handle optional fields like userFraction and releaseNotes
    const updatedReleases = [...existingReleases] as Array<{
      name: string;
      versionCodes: string[];
      status: string;
      userFraction?: number;
      inAppUpdatePriority?: number;
      releaseNotes?: Array<{ language: string; text: string }>;
    }>;
    
    const releaseToUpdate = { ...updatedReleases[releaseIndex] };

    if (isFullRollout) {
      // If rollout = 100% or userFraction = 1, remove userFraction and set status to completed
      delete releaseToUpdate.userFraction;
      releaseToUpdate.status = GOOGLE_PLAY_RELEASE_STATUS.COMPLETED;
    } else {
      // Otherwise, update userFraction and keep status as inProgress
      releaseToUpdate.userFraction = userFraction;
      releaseToUpdate.status = GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS;
    }

    updatedReleases[releaseIndex] = releaseToUpdate;

    // Step 9: Build track update payload - preserve all releases with updated one
    const trackUpdatePayload = {
      track: 'production',
      releases: updatedReleases,
    };

    console.log('[UpdateAndroidRollout] Updating track with payload:', JSON.stringify(trackUpdatePayload, null, 2));

    // Step 10: Update track
    await googleService.updateProductionTrack(editId, trackUpdatePayload);
    console.log('[UpdateAndroidRollout] Track updated successfully');

    // Step 11: Validate the edit (optional dry run)
    try {
      await googleService.validateEdit(editId);
      console.log('[UpdateAndroidRollout] Edit validation successful');
    } catch (validationError) {
      // Validation failed - get error details and throw
      const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
      console.error('[UpdateAndroidRollout] Validation failed:', errorMessage);
      throw new Error(`Edit validation failed: ${errorMessage}`);
    }

    // Step 12: Commit edit
    const commitResult = await googleService.commitEdit(editId);
    console.log('[UpdateAndroidRollout] Edit committed successfully:', JSON.stringify(commitResult, null, 2));

    // Step 13: Update rollout percentage in database (only after Google API succeeds)
    const updatedSubmission = await this.androidSubmissionRepository.update(submissionId, {
      rolloutPercentage: rolloutPercent
    });

    if (!updatedSubmission) {
      throw new Error('Failed to update rollout percentage in database');
    }

    console.log(`[UpdateAndroidRollout] Successfully updated rollout percentage to ${rolloutPercent}% for submission ${submissionId}`);

    return {
      id: updatedSubmission.id,
      rolloutPercentage: updatedSubmission.rolloutPercentage ?? 0,
      statusUpdatedAt: updatedSubmission.statusUpdatedAt
    };
  } catch (error) {
    // Clean up: Delete edit if it was created
    console.log(`[UpdateAndroidRollout] Error occurred, deleting edit ${editId}`);
    await googleService.deleteEdit(editId);
    throw error;
  }
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
   * Get presigned download URL for submission artifact
   * Complete flow: validates tenant ownership, generates presigned URL with expiry
   * 
   * @param submissionId - The submission ID
   * @param platform - Platform (ANDROID or IOS)
   * @param tenantId - Tenant ID for ownership validation
   * @returns Object with presigned URL and expiry timestamp
   * @throws Error if submission not found, doesn't belong to tenant, or artifact unavailable
   */
  async getSubmissionArtifactDownloadUrl(
    submissionId: string,
    platform: 'ANDROID' | 'IOS',
    tenantId: string
  ): Promise<{ url: string; expiresAt: string }> {
    // Step 1: Get artifact path (validates tenant ownership and platform)
    const artifactPath = await this.getSubmissionArtifactPath(
      submissionId,
      platform,
      tenantId
    );

    // Step 2: Generate presigned URL
    const url = await this.buildArtifactService.generatePresignedUrl(artifactPath);

    // Step 3: Calculate expiry (1 hour)
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return { url, expiresAt };
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
    createdBy: string,
    tenantId: string
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

    // Security validation - submission must belong to the claimed tenant
    if (distribution.tenantId !== tenantId) {
      throw new Error('Submission does not belong to this tenant');
    }

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

    // Get targetAppId (needed for cancellation)
    const targetAppId = integration.targetAppId;
    
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    // Step 6: Create Apple service from integration
    let appleService: AppleAppStoreConnectService | MockAppleAppStoreConnectService;
    try {
      appleService = await createAppleServiceFromIntegration(integration.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Apple App Store Connect credentials: ${errorMessage}`);
    }

    // Step 7: Get appStoreVersionId for cancelling review submission
    const appStoreVersionId = iosSubmission.appStoreVersionId;
        
    if (!appStoreVersionId) {
      throw new Error(
        `Missing appStoreVersionId for submission ${submissionId}. ` +
        'Cannot cancel review submission without version ID.'
      );
      }
    
    console.log(`[SubmissionService] Using appStoreVersionId: ${appStoreVersionId}`);

    // Step 8: Call Apple API to delete the review submission (cancel the submission)
    // Find the review submission by querying with appId and checking which one contains this version
    try {
      console.log(`[SubmissionService] Cancelling review submission for version ${appStoreVersionId}`);
      await appleService.deleteVersionSubmissionRelationship(appStoreVersionId, targetAppId);
      console.log(`[SubmissionService] Successfully cancelled review submission`);
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

    // Step 9.5: Send notification (iOS App Store Build Cancelled)
    if (this.releaseNotificationService && distribution && distribution.releaseId) {
      try {
        console.log(`[SubmissionService] Sending iOS App Store cancellation notification for release ${distribution.releaseId}`);
        
        // Get user email from ID for notification
        const cancellerEmail = await this.getUserEmail(createdBy);
        
        if (cancellerEmail) {
          await this.releaseNotificationService.notify({
            type: NotificationType.IOS_APPSTORE_BUILD_CANCELLED,
            tenantId: distribution.tenantId,
            releaseId: distribution.releaseId,
            version: updatedSubmission.version,
            testflightBuild: updatedSubmission.testflightNumber,
            cancelledBy: cancellerEmail,
            reason: reason
          });
          
          console.log(`[SubmissionService] iOS App Store cancellation notification sent successfully`);
        } else {
          console.warn('[SubmissionService] Skipping notification: canceller email not found for user ID:', createdBy);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SubmissionService] Failed to send iOS cancellation notification:', errorMessage);
        // Don't fail the cancellation if notification fails
      }
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

  /**
   * Get iOS submission status from Apple App Store Connect
   * Fetches current status and rejection details
   * 
   * @param submissionId - iOS submission ID
   * @returns Current status from Apple including resolutionDescription if rejected
   */
  async getIosSubmissionStatus(submissionId: string): Promise<{
    id: string;
    version: string;
    localStatus: SubmissionStatus;
    appleStatus: string;
    appleState: string;
    resolutionDescription: string | null;
    lastSyncedAt: Date;
  } | null> {
    // Get submission from database
    const iosSubmission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (!iosSubmission) {
      return null;
    }

    // Get distribution to find tenant
    const distribution = await this.distributionRepository.findById(iosSubmission.distributionId);
    
    if (!distribution) {
      throw new Error('Distribution not found for submission');
    }

    // Get Apple App Store Connect service
    const appleService = await createAppleServiceFromIntegration(distribution.tenantId);

    // Get store integration to find targetAppId
    const storage = getStorage();
    const storageHasStoreIntegrationController = 'storeIntegrationController' in storage;
    
    if (!storageHasStoreIntegrationController) {
      throw new Error('StoreIntegrationController not initialized');
    }

    const storeIntegrationController = (storage as any).storeIntegrationController as StoreIntegrationController;
    const integrations = await storeIntegrationController.findByTenantAndStoreType(
      distribution.tenantId,
      StoreType.APP_STORE
    );

    if (!integrations || integrations.length === 0) {
      throw new Error(`No Apple App Store integration found for tenant ${distribution.tenantId}`);
    }

    const integration = integrations[0];
    const targetAppId = integration.targetAppId;
    
    if (!targetAppId) {
      throw new Error(
        `Missing targetAppId in store integration ${integration.id}. ` +
        'Please configure the App Store Connect integration with the target app ID.'
      );
    }

    // Query Apple API for current app store version status
    let appleStatus = 'UNKNOWN';
    let appleState = 'UNKNOWN';
    let resolutionDescription: string | null = null;
    
    try {
      console.log(`[getIosSubmissionStatus] Querying Apple for version ${iosSubmission.version} status`);
      
      const versionData = await appleService.getAppStoreVersionByVersionString(
        targetAppId,
        iosSubmission.version
      );
      
      if (versionData && versionData.attributes) {
        appleStatus = versionData.attributes.appStoreState ?? 'UNKNOWN';
        appleState = versionData.attributes.releaseType ?? 'UNKNOWN';
        resolutionDescription = versionData.attributes.resolutionDescription ?? null;
        
        console.log(`[getIosSubmissionStatus] Apple status: ${appleStatus}, release type: ${appleState}`);
        
        if (resolutionDescription) {
          console.log(`[getIosSubmissionStatus] Rejection reason: ${resolutionDescription}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[getIosSubmissionStatus] Failed to fetch status from Apple:', errorMessage);
      appleStatus = 'API_ERROR';
      appleState = 'API_ERROR';
    }

    return {
      id: iosSubmission.id,
      version: iosSubmission.version,
      localStatus: iosSubmission.status,
      appleStatus,
      appleState,
      resolutionDescription,
      lastSyncedAt: new Date()
    };
  }

  /**
   * iOS submission status update from Apple App Store Connect
   * Called by Cronicle webhook every 4 hours
   * 
   * Process:
   * 1. Get submission from database
   * 2. Get current status from Apple API
   * 3. Map Apple status to DB status
   * 4. Update DB if status changed
   * 5. If rejected: add action history with reason
   * 6. If terminal state (LIVE/REJECTED/CANCELLED): delete Cronicle job
   * 
   * @param submissionId - iOS submission ID
   * @returns Status update result
   */
  async IosSubmissionStatus(submissionId: string): Promise<{
    status: 'synced' | 'not_found';
    submissionId: string;
    version?: string;
    oldStatus?: SubmissionStatus;
    newStatus?: SubmissionStatus;
    isTerminal?: boolean;
    jobDeleted?: boolean;
  }> {
    console.log(`[IosSubmissionStatus] Updating submission status ${submissionId}`);

    // Step 1: Get submission from database
    const submission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (!submission) {
      console.warn(`[IosSubmissionStatus] Submission ${submissionId} not found`);
      return { 
        status: 'not_found',
        submissionId
      };
    }

    const oldStatus = submission.status;

    // Step 2: Get current status from Apple API
    const statusResult = await this.getIosSubmissionStatus(submissionId);
    
    if (!statusResult) {
      throw new Error('Failed to fetch status from Apple App Store Connect');
    }

    // Step 3: Map Apple status to DB status
    const newStatus = this.mapAppleStatusToDbStatus(statusResult.appleStatus);
    
    let jobDeleted = false;

    // Step 4: Update if status changed
    if (newStatus !== oldStatus) {
      console.log(`[IosSubmissionStatus] Status changed: ${oldStatus} → ${newStatus}`);

      // Prepare update data
      const updateData: any = {
        status: newStatus,
        statusUpdatedAt: new Date()
      };

      // If transitioning to LIVE, set rollout percentage
      if (newStatus === SUBMISSION_STATUS.LIVE) {
        updateData.rolloutPercentage = submission.phasedRelease ? 1 : 100;
        console.log(`[IosSubmissionStatus] Setting rolloutPercentage to ${updateData.rolloutPercentage}% (phasedRelease: ${submission.phasedRelease})`);
      }

      // Update status (and rollout percentage if LIVE) in database
      await this.iosSubmissionRepository.update(submissionId, updateData);

      // Step 5: Check if terminal state reached
      const isTerminalState = newStatus === SUBMISSION_STATUS.LIVE || 
                              newStatus === SUBMISSION_STATUS.REJECTED ||
                              newStatus === SUBMISSION_STATUS.CANCELLED;

      if (isTerminalState) {
        console.log(`[IosSubmissionStatus] Terminal state reached: ${newStatus}`);

        // Handle LIVE status - send notification and update distribution status
        if (newStatus === SUBMISSION_STATUS.LIVE) {
          const distribution = await this.distributionRepository.findById(submission.distributionId);
          
          if (this.releaseNotificationService && distribution && distribution.releaseId) {
            try {
              console.log(`[IosSubmissionStatus] Sending iOS App Store LIVE notification for release ${distribution.releaseId}`);
              
              await this.releaseNotificationService.notify({
                type: NotificationType.IOS_APPSTORE_LIVE,
                tenantId: distribution.tenantId,
                releaseId: distribution.releaseId,
                version: submission.version,
                testflightBuild: submission.testflightNumber
              });
              
              console.log(`[IosSubmissionStatus] iOS App Store LIVE notification sent successfully`);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error('[IosSubmissionStatus] Failed to send iOS LIVE notification:', errorMessage);
              // Don't fail the status update if notification fails
            }
          }

          // Update distribution status when submission goes LIVE
          if (distribution) {
            const configuredPlatforms = distribution.configuredListOfPlatforms;
            const currentDistributionStatus = distribution.status;

            // Check if only iOS is configured
            const onlyIOS = configuredPlatforms.length === 1 && configuredPlatforms.includes(BUILD_PLATFORM.IOS);
            
            // Check if both platforms are configured
            const bothPlatforms = configuredPlatforms.includes(BUILD_PLATFORM.IOS) && configuredPlatforms.includes(BUILD_PLATFORM.ANDROID);

            let newDistributionStatus = currentDistributionStatus;

            if (onlyIOS) {
              // Only one platform configured → RELEASED
              newDistributionStatus = DISTRIBUTION_STATUS.RELEASED;
              console.log(`[IosSubmissionStatus] Only iOS configured, updating distribution status to RELEASED`);
            } else if (bothPlatforms) {
              // Both platforms configured
              if (currentDistributionStatus === DISTRIBUTION_STATUS.PARTIALLY_RELEASED) {
                // Already partially released (Android is live) → RELEASED
                newDistributionStatus = DISTRIBUTION_STATUS.RELEASED;
                console.log(`[IosSubmissionStatus] Both platforms configured, old status is PARTIALLY_RELEASED, updating to RELEASED`);
              } else {
                // Not partially released yet (Android not live) → PARTIALLY_RELEASED
                newDistributionStatus = DISTRIBUTION_STATUS.PARTIALLY_RELEASED;
                console.log(`[IosSubmissionStatus] Both platforms configured, old status is ${currentDistributionStatus}, updating to PARTIALLY_RELEASED`);
              }
            }

            // Update distribution status if changed
            if (newDistributionStatus !== currentDistributionStatus) {
              await this.distributionRepository.update(distribution.id, {
                status: newDistributionStatus
              });
              console.log(`[IosSubmissionStatus] Updated distribution ${distribution.id} status from ${currentDistributionStatus} to ${newDistributionStatus}`);
            } else {
              console.log(`[IosSubmissionStatus] Distribution status unchanged (${currentDistributionStatus})`);
            }
          }
        }

        // Handle rejection - add action history with reason
        if (newStatus === SUBMISSION_STATUS.REJECTED) {
          await this.handleRejection(
            submissionId,
            statusResult.resolutionDescription
          );
        }

        // Delete Cronicle job (stop checking)
        if (submission.cronicleJobId) {
          await this.deleteSubmissionJob(submissionId, submission.cronicleJobId);
          jobDeleted = true;

          // Clear job ID from database
          await this.iosSubmissionRepository.update(submissionId, {
            cronicleJobId: null
          });
        }
      }
    }

    const isTerminal = newStatus === SUBMISSION_STATUS.LIVE || 
                       newStatus === SUBMISSION_STATUS.REJECTED ||
                       newStatus === SUBMISSION_STATUS.CANCELLED;

    return {
      status: 'synced',
      submissionId,
      version: submission.version,
      oldStatus,
      newStatus,
      isTerminal,
      jobDeleted
    };
  }

  /**
   * Map Apple's appStoreState to DB SubmissionStatus
   */
  private mapAppleStatusToDbStatus(appleStatus: string): SubmissionStatus {
    const statusMap: Record<string, SubmissionStatus> = {
      'WAITING_FOR_REVIEW': SUBMISSION_STATUS.SUBMITTED,
      'IN_REVIEW': SUBMISSION_STATUS.IN_REVIEW,
      'PENDING_DEVELOPER_RELEASE': SUBMISSION_STATUS.APPROVED,
      'PENDING_APPLE_RELEASE': SUBMISSION_STATUS.APPROVED,
      'READY_FOR_SALE': SUBMISSION_STATUS.LIVE,
      'REJECTED': SUBMISSION_STATUS.REJECTED,
      'METADATA_REJECTED': SUBMISSION_STATUS.REJECTED,
      'INVALID_BINARY': SUBMISSION_STATUS.REJECTED,
      'DEVELOPER_REJECTED': SUBMISSION_STATUS.CANCELLED,
    };

    return statusMap[appleStatus] ?? SUBMISSION_STATUS.SUBMITTED;
  }

  /**
   * Handle rejection - add action history with Apple's rejection reason and send notification
   */
  private async handleRejection(
    submissionId: string,
    resolutionDescription: string | null
  ): Promise<void> {
    console.log(`[handleRejection] Handling rejection for submission ${submissionId}`);
    console.log(`[handleRejection] Resolution: ${resolutionDescription ?? 'Not provided by Apple'}`);

    // Build rejection reason (use Apple's description or fallback)
    const reason = resolutionDescription ?? 'App rejected by Apple';

    // Get submission details for notification
    const submission = await this.iosSubmissionRepository.findById(submissionId);
    
    if (submission) {
      // Get distribution for notification
      const distribution = await this.distributionRepository.findById(submission.distributionId);
      
      // Send notification (iOS App Store Build Rejected)
      if (this.releaseNotificationService && distribution && distribution.releaseId) {
        try {
          console.log(`[handleRejection] Sending iOS App Store rejection notification for release ${distribution.releaseId}`);
          
          await this.releaseNotificationService.notify({
            type: NotificationType.IOS_APPSTORE_BUILD_REJECTED,
            tenantId: distribution.tenantId,
            releaseId: distribution.releaseId,
            version: submission.version,
            testflightBuild: submission.testflightNumber,
            reason: reason
          });
          
          console.log(`[handleRejection] iOS App Store rejection notification sent successfully`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[handleRejection] Failed to send iOS rejection notification:', errorMessage);
          // Don't fail the rejection handling if notification fails
        }
      }
    }

    // Add to action history
    await this.actionHistoryRepository.create({
      id: uuidv4(),
      submissionId,
      platform: SUBMISSION_PLATFORM.IOS,
      action: SUBMISSION_ACTION.REJECTED,
      reason,
      createdBy: 'system'
    });

    console.log(`[handleRejection] Rejection recorded: ${reason}`);
  }

  /**
   * Create Cronicle job for iOS submission status sync
   * Called when submission is first submitted to App Store
   * Job runs every 2 hours and calls POST /submissions/:submissionId/status
   * 
   * @param submissionId - iOS submission ID
   * @param version - App version (for job title)
   * @returns Cronicle job ID
   */
  private async createIosSubmissionJob(
    submissionId: string,
    version: string
  ): Promise<string> {
    if (!this.cronicleService) {
      throw new Error('Cronicle service not configured');
    }

    const jobId = await this.cronicleService.createJob({
      title: `iOS Submission Status: ${version} (${submissionId})`,
      category: 'Submission Status',
      timing: {
        hours: [0, 4, 8, 12, 16, 20],  
        minutes: [0], 
        days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]  // Every day
      },
      timezone: 'UTC',
      params: {
        method: 'POST',
        url: this.cronicleService.buildDirectUrl(`/api/v1/submissions/${submissionId}/status?platform=IOS&storeType=APP_STORE`),
        body: {}
      },
      notes: `Auto-generated job for iOS submission ${submissionId}. Checks status every 4 hours. Stops when LIVE or REJECTED.`,
      catchUp: false
    });

    console.log(`[createSubmissionJob] Created Cronicle job ${jobId} for submission ${submissionId}`);
    return jobId;
  }

  /**
   * Create Cronicle job for Android submission status sync
   * Called when Android submission is successfully submitted to Play Store
   * 
   * Job configuration:
   * - Runs every 4 hours, every day
   * - Maximum duration: 15 days
   * - Webhook: GET /api/v1/integrations/store/play-store/production-state?submissionId=X&platform=Android&store_type=play_store
   * 
   * Logic:
   * - Day 1-4: Check status, if IN_PROGRESS/COMPLETED → stop
   * - Day 5: If still SUBMITTED → update to USER_ACTION_PENDING
   * - Day 6-14: Continue checking
   * - Day 15: If not completed → update to SUSPENDED and stop
   * 
   * @param submissionId - Android submission ID
   * @param version - App version (for job title)
   * @returns Cronicle job ID
   */
  private async createAndroidSubmissionJob(
    submissionId: string,
    version: string
  ): Promise<string> {
    if (!this.cronicleService) {
      throw new Error('Cronicle service not configured');
    }

    // Build production-state URL with query parameters
    const productionStateUrl = `/api/v1/integrations/store/play-store/production-state?submissionId=${submissionId}&platform=Android&storeType=play_store`;

    const jobId = await this.cronicleService.createJob({
      title: `Android Submission Status: ${version} (${submissionId})`,
      category: 'Submission Status',
      timing: {
        hours: [0, 12],  // Every 12 hours
        minutes: [0],
        days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]  // Every day
      },
      timezone: 'UTC',
      params: {
        method: 'GET',  // ✅ GET request (different from iOS)
        url: this.cronicleService.buildDirectUrl(productionStateUrl),
        body: {}
      },
      notes: `Auto-generated job for Android submission ${submissionId}. Checks status every 4 hours for 15 days. Auto-stops on Day 15 or when IN_PROGRESS/COMPLETED.`,
      catchUp: false
    });

    console.log(`[createAndroidSubmissionJob] Created Cronicle job ${jobId} for Android submission ${submissionId}`);
    return jobId;
  }

  /**
   * Android submission status update from Google Play Store production state
   * Called by Cronicle webhook every 4 hours
   * 
   * Process:
   * 1. Get submission from database
   * 2. Check days elapsed since cronicleCreatedDate
   * 3. Get current status from Play Store production-state API
   * 4. Check if version exists in response with inProgress/completed status
   * 5. Update DB status accordingly:
   *    - If inProgress/completed found → update status and stop cron
   *    - Day 5: No status change → USER_ACTION_PENDING
   *    - Day 15: No status change → SUSPENDED and stop cron
   * 
   * @param submissionId - Android submission ID
   * @param productionStateData - Response from Play Store production-state API
   * @returns Status update result
   */
  async updateAndroidSubmissionStatus(
    submissionId: string,
    productionStateData: {
      track: string;
      releases: Array<{
        name: string;
        versionCodes: string[];
        status: string;
        userFraction?: number;
        releaseNotes?: Array<{ language: string; text: string }>;
      }>;
    }
  ): Promise<{
    status: 'synced' | 'not_found' | 'no_change';
    submissionId: string;
    version?: string;
    oldStatus?: string;
    newStatus?: string;
    daysElapsed?: number;
    isTerminal?: boolean;
    jobDeleted?: boolean;
  }> {
    console.log(`[updateAndroidSubmissionStatus] Updating submission status ${submissionId}`);

    // Step 1: Get submission from database
    const submission = await this.androidSubmissionRepository.findById(submissionId);
    
    if (!submission) {
      console.warn(`[updateAndroidSubmissionStatus] Submission ${submissionId} not found`);
      return { 
        status: 'not_found',
        submissionId
      };
    }

    const oldStatus = submission.status;
    const version = submission.version;
    const versionCode = String(submission.versionCode);

    // Step 2: Calculate days elapsed since cronicleCreatedDate
    const cronicleCreatedDate = submission.cronicleCreatedDate;
    
    if (!cronicleCreatedDate) {
      console.warn(`[updateAndroidSubmissionStatus] No cronicleCreatedDate for submission ${submissionId}`);
      return {
        status: 'no_change',
        submissionId,
        version,
        oldStatus
      };
    }

    const now = new Date();
    const msElapsed = now.getTime() - cronicleCreatedDate.getTime();
    const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
    
    console.log(`[updateAndroidSubmissionStatus] Days elapsed since cron started: ${daysElapsed}`);

    // Step 3: Check if version exists in Play Store response with inProgress/completed status
    const releases = productionStateData.releases ?? [];
    const matchingRelease = releases.find(release => 
      release.versionCodes && release.versionCodes.includes(versionCode)
    );

    let newStatus = oldStatus;
    let isTerminal = false;
    let jobDeleted = false;

    if (matchingRelease) {
      console.log(`[updateAndroidSubmissionStatus] Found version ${version} (${versionCode}) in Play Store with status: ${matchingRelease.status}`);
      
      // Step 4: Update status based on Play Store status
      const playStoreStatus = matchingRelease.status.toLowerCase();
      
      if (playStoreStatus === 'inprogress') {
        newStatus = ANDROID_SUBMISSION_STATUS.IN_PROGRESS;
        isTerminal = true;
        console.log(`[updateAndroidSubmissionStatus] Version is IN_PROGRESS in Play Store`);
      } else if (playStoreStatus === 'completed') {
        newStatus = ANDROID_SUBMISSION_STATUS.COMPLETED;
        isTerminal = true;
        console.log(`[updateAndroidSubmissionStatus] Version is COMPLETED in Play Store`);
      }
    } else {
      console.log(`[updateAndroidSubmissionStatus] Version ${version} (${versionCode}) not found in Play Store response`);
      
      // Step 5: Check if we need to update status based on days elapsed
      const userActionPendingDays = 5;
      const suspendedDays = 15;
      
      if (daysElapsed >= suspendedDays && oldStatus !== ANDROID_SUBMISSION_STATUS.SUSPENDED) {
        // Day 15+: Set to SUSPENDED and stop cron
        newStatus = ANDROID_SUBMISSION_STATUS.SUSPENDED;
        isTerminal = true;
        console.log(`[updateAndroidSubmissionStatus] ${daysElapsed} days elapsed, setting status to SUSPENDED`);
      } else if (daysElapsed >= userActionPendingDays && oldStatus === ANDROID_SUBMISSION_STATUS.SUBMITTED) {
        // Day 5+: Set to USER_ACTION_PENDING (only if currently SUBMITTED)
        newStatus = ANDROID_SUBMISSION_STATUS.USER_ACTION_PENDING;
        console.log(`[updateAndroidSubmissionStatus] ${daysElapsed} days elapsed, setting status to USER_ACTION_PENDING`);
      }
    }

    // Step 6: Update database if status changed
    if (newStatus !== oldStatus) {
      console.log(`[updateAndroidSubmissionStatus] Status changed: ${oldStatus} → ${newStatus}`);

      await this.androidSubmissionRepository.update(submissionId, {
        status: newStatus
      });

      // Step 6.5: Send notification based on new status
      const distribution = await this.distributionRepository.findById(submission.distributionId);
      
      if (this.releaseNotificationService && distribution && distribution.releaseId) {
        try {
          // Android Live (IN_PROGRESS status - rolling out)
          if (newStatus === ANDROID_SUBMISSION_STATUS.IN_PROGRESS) {
            console.log(`[updateAndroidSubmissionStatus] Sending Android Play Store LIVE (IN_PROGRESS) notification for release ${distribution.releaseId}`);
            
            await this.releaseNotificationService.notify({
              type: NotificationType.ANDROID_PLAYSTORE_LIVE,
              tenantId: distribution.tenantId,
              releaseId: distribution.releaseId,
              version: submission.version,
              versionCode: String(submission.versionCode)
            });
            
            console.log(`[updateAndroidSubmissionStatus] Android Play Store LIVE (IN_PROGRESS) notification sent successfully`);
          }
          
          // Android Live (COMPLETED status)
          else if (newStatus === ANDROID_SUBMISSION_STATUS.COMPLETED) {
            console.log(`[updateAndroidSubmissionStatus] Sending Android Play Store LIVE notification for release ${distribution.releaseId}`);
            
            await this.releaseNotificationService.notify({
              type: NotificationType.ANDROID_PLAYSTORE_LIVE,
              tenantId: distribution.tenantId,
              releaseId: distribution.releaseId,
              version: submission.version,
              versionCode: String(submission.versionCode)
            });
            
            console.log(`[updateAndroidSubmissionStatus] Android Play Store LIVE notification sent successfully`);
          }
          
          // Android User Action Pending
          else if (newStatus === ANDROID_SUBMISSION_STATUS.USER_ACTION_PENDING) {
            console.log(`[updateAndroidSubmissionStatus] Sending Android Play Store USER ACTION PENDING notification for release ${distribution.releaseId}`);
            
            // Get user email from ID for notification (submittedBy is already an ID in DB)
            const submittedById = submission.submittedBy;
            const submitterEmail = submittedById ? await this.getUserEmail(submittedById) : null;
            
            if (!submitterEmail) {
              console.warn('[updateAndroidSubmissionStatus] Cannot send USER ACTION PENDING notification: submitter email not found for user ID:', submittedById);
            } else {
              await this.releaseNotificationService.notify({
                type: NotificationType.ANDROID_PLAYSTORE_USER_ACTION_PENDING,
                tenantId: distribution.tenantId,
                releaseId: distribution.releaseId,
                version: submission.version,
                versionCode: String(submission.versionCode),
                submittedBy: submitterEmail
              });
              
              console.log(`[updateAndroidSubmissionStatus] Android Play Store USER ACTION PENDING notification sent successfully`);
            }
          }
          
          // Android Suspended
          else if (newStatus === ANDROID_SUBMISSION_STATUS.SUSPENDED) {
            console.log(`[updateAndroidSubmissionStatus] Sending Android Play Store SUSPENDED notification for release ${distribution.releaseId}`);
            
            // Get user email from ID for notification (submittedBy is already an ID in DB)
            const submittedById = submission.submittedBy;
            const submitterEmail = submittedById ? await this.getUserEmail(submittedById) : null;
            
            if (!submitterEmail) {
              console.warn('[updateAndroidSubmissionStatus] Cannot send SUSPENDED notification: submitter email not found for user ID:', submittedById);
            } else {
              await this.releaseNotificationService.notify({
                type: NotificationType.ANDROID_PLAYSTORE_SUSPENDED,
                tenantId: distribution.tenantId,
                releaseId: distribution.releaseId,
                version: submission.version,
                versionCode: String(submission.versionCode),
                submittedBy: submitterEmail
              });
              
              console.log(`[updateAndroidSubmissionStatus] Android Play Store SUSPENDED notification sent successfully`);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[updateAndroidSubmissionStatus] Failed to send Android status notification:', errorMessage);
          // Don't fail the status update if notification fails
        }
      }

      // Step 6.6: Update distribution status when Android submission goes LIVE (IN_PROGRESS or COMPLETED)
      if (distribution && (newStatus === ANDROID_SUBMISSION_STATUS.IN_PROGRESS || newStatus === ANDROID_SUBMISSION_STATUS.COMPLETED)) {
        const configuredPlatforms = distribution.configuredListOfPlatforms;
        const currentDistributionStatus = distribution.status;

        // Check if only Android is configured
        const onlyAndroid = configuredPlatforms.length === 1 && configuredPlatforms.includes(BUILD_PLATFORM.ANDROID);
        
        // Check if both platforms are configured
        const bothPlatforms = configuredPlatforms.includes(BUILD_PLATFORM.IOS) && configuredPlatforms.includes(BUILD_PLATFORM.ANDROID);

        let newDistributionStatus = currentDistributionStatus;

        if (onlyAndroid) {
          // Only one platform configured → RELEASED
          newDistributionStatus = DISTRIBUTION_STATUS.RELEASED;
          console.log(`[updateAndroidSubmissionStatus] Only Android configured, updating distribution status to RELEASED`);
        } else if (bothPlatforms) {
          // Both platforms configured
          if (currentDistributionStatus === DISTRIBUTION_STATUS.PARTIALLY_RELEASED) {
            // Already partially released (iOS is live) → RELEASED
            newDistributionStatus = DISTRIBUTION_STATUS.RELEASED;
            console.log(`[updateAndroidSubmissionStatus] Both platforms configured, old status is PARTIALLY_RELEASED, updating to RELEASED`);
          } else {
            // Not partially released yet (iOS not live) → PARTIALLY_RELEASED
            newDistributionStatus = DISTRIBUTION_STATUS.PARTIALLY_RELEASED;
            console.log(`[updateAndroidSubmissionStatus] Both platforms configured, old status is ${currentDistributionStatus}, updating to PARTIALLY_RELEASED`);
          }
        }

        // Update distribution status if changed
        if (newDistributionStatus !== currentDistributionStatus) {
          await this.distributionRepository.update(distribution.id, {
            status: newDistributionStatus
          });
          console.log(`[updateAndroidSubmissionStatus] Updated distribution ${distribution.id} status from ${currentDistributionStatus} to ${newDistributionStatus}`);
        } else {
          console.log(`[updateAndroidSubmissionStatus] Distribution status unchanged (${currentDistributionStatus})`);
        }
      }

      // Step 7: Delete Cronicle job if terminal state reached
      if (isTerminal && submission.cronicleJobId) {
        console.log(`[updateAndroidSubmissionStatus] Terminal state reached: ${newStatus}`);
        
        await this.deleteSubmissionJob(submissionId, submission.cronicleJobId);
        jobDeleted = true;

        // Clear job ID from database
        // NOTE: Keep submission as active even when SUSPENDED - it remains active until resubmission
        // Only IN_PROGRESS, COMPLETED, and SUSPENDED stop the Cronicle job (terminal states)
        // The submission will be marked inactive only when a new submission successfully replaces it
        await this.androidSubmissionRepository.update(submissionId, {
          cronicleJobId: null
        });
        
        console.log(`[updateAndroidSubmissionStatus] Cleared Cronicle job ID. Submission remains active (isActive=true) until resubmission.`);
      }
    } else {
      console.log(`[updateAndroidSubmissionStatus] No status change (current: ${oldStatus})`);
    }

    return {
      status: newStatus !== oldStatus ? 'synced' : 'no_change',
      submissionId,
      version,
      oldStatus,
      newStatus,
      daysElapsed,
      isTerminal,
      jobDeleted
    };
  }

  /**
   * Delete Cronicle job for submission
   * Called when terminal state reached (LIVE or REJECTED for iOS, IN_PROGRESS/COMPLETED/SUSPENDED for Android)
   * 
   * Strategy:
   * 1. Disable job first (prevents new runs while we're deleting)
   * 2. Then delete the job
   * 
   * Note: If job has running instances, disable will succeed but delete may fail.
   * This is OK - disabled job won't run again, and we clear cronicleJobId from DB.
   */
  private async deleteSubmissionJob(
    submissionId: string,
    cronicleJobId: string
  ): Promise<void> {
    if (!this.cronicleService) {
      console.warn('[deleteSubmissionJob] Cronicle service not configured');
      return;
    }

    try {
      // Step 1: Disable job first (prevents new runs)
      await this.cronicleService.setJobEnabled(cronicleJobId, false);
      console.log(`[deleteSubmissionJob] Disabled Cronicle job ${cronicleJobId} for submission ${submissionId}`);
      
      // Step 2: Delete the job
      await this.cronicleService.deleteJob(cronicleJobId);
      console.log(`[deleteSubmissionJob] Deleted Cronicle job ${cronicleJobId} for submission ${submissionId}`);
    } catch (error) {
      console.error(`[deleteSubmissionJob] Failed to delete Cronicle job ${cronicleJobId}:`, error);
      // Don't throw - submission status update should succeed even if job deletion fails
      // Job is disabled, so it won't run again even if deletion failed
    }
  }
}

