/**
 * Distribution Routes
 *
 * Handles all distribution and store submission endpoints.
 * Routes are minimal - routing only, no business logic.
 */
import { Request, Response, Router } from "express";
import * as multer from "multer";
import * as storageTypes from "../storage/storage";
import * as releasePermissions from "../middleware/release-permissions";
import { HTTP_STATUS } from "../constants/http";
import { 
  AndroidSubmissionBuildRepository,
  IosSubmissionBuildRepository,
  SubmissionActionHistoryRepository,
  DistributionRepository,
  createAndroidSubmissionBuildModel,
  createIosSubmissionBuildModel,
  createSubmissionActionHistoryModel,
  createDistributionModel
} from "../models/distribution";
import { SubmissionService } from "../services/distribution";
import { DistributionService } from "../services/distribution/distribution.service";
import { createSubmissionController } from "../controllers/distribution";
import { createDistributionController } from "../controllers/distribution/distribution.controller";

// Multer configuration for AAB file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for AAB files
  }
});

export interface DistributionRouterConfig {
  storage: storageTypes.Storage;
}

/**
 * Creates and configures the Distribution router
 */
export function getDistributionRouter(config: DistributionRouterConfig): Router {
  const storage: storageTypes.Storage = config.storage;
  const router: Router = Router();

  // Check if storage has sequelize property (AWS Storage)
  const storageHasSequelize = 'sequelize' in storage && storage.sequelize;
  
  if (!storageHasSequelize) {
    console.warn('[Distribution Routes] Storage does not have sequelize - distribution services not initialized');
    return router;
  }

  // Initialize distribution repositories
  const sequelize = (storage as any).sequelize;
  const distributionModel = createDistributionModel(sequelize);
  const androidSubmissionModel = createAndroidSubmissionBuildModel(sequelize);
  const iosSubmissionModel = createIosSubmissionBuildModel(sequelize);
  const actionHistoryModel = createSubmissionActionHistoryModel(sequelize);

  const distributionRepository = new DistributionRepository(distributionModel);
  const androidSubmissionRepository = new AndroidSubmissionBuildRepository(androidSubmissionModel);
  const iosSubmissionRepository = new IosSubmissionBuildRepository(iosSubmissionModel);
  const actionHistoryRepository = new SubmissionActionHistoryRepository(actionHistoryModel);

  // Initialize services
  // Note: AppleAppStoreConnectService is created dynamically per-request from integration credentials
  // The service automatically:
  // - Fetches credentials from store_integrations and store_credentials tables
  // - Decrypts credentials using backend encryption
  // - Generates JWT token using existing implementation from store-controllers
  // - Makes authenticated API calls to Apple App Store Connect
  
  const submissionService = new SubmissionService(
    androidSubmissionRepository,
    iosSubmissionRepository,
    actionHistoryRepository,
    distributionRepository
    // appleAppStoreConnectService is optional - service dynamically creates it when needed
  );

  // Initialize controllers
  const submissionController = createSubmissionController(submissionService);

  // Initialize distribution service and controller
  const distributionService = new DistributionService(
    distributionRepository,
    iosSubmissionRepository,
    androidSubmissionRepository,
    actionHistoryRepository
  );
  const distributionController = createDistributionController(distributionService);

  // ============================================================================
  // DISTRIBUTION - GET BY RELEASE ID OR DISTRIBUTION ID
  // ============================================================================

  /**
   * GET /releases/:releaseId/distribution
   * 
   * Get distribution by release ID with all submissions and action history.
   * 
   * Use Case: View distribution details for a specific release
   */
  router.get(
    "/releases/:releaseId/distribution",
    releasePermissions.requireReleaseAccess({ storage }),
    distributionController.getDistributionByReleaseId
  );

  /**
   * GET /distributions/:distributionId
   * 
   * Get distribution by distribution ID with all submissions and action history.
   * 
   * Use Case: View distribution details when you have the distribution ID directly
   */
  router.get(
    "/distributions/:distributionId",
    releasePermissions.requireDistributionAccess({ storage }),
    distributionController.getDistributionById
  );

  // ============================================================================
  // SUBMISSION - SUBMIT EXISTING (FIRST-TIME)
  // ============================================================================
  
  /**
   * PUT /submissions/:submissionId/submit?platform=<ANDROID|IOS>
   * 
   * Submit an existing PENDING submission to the store (first-time submission).
   * 
   * Query Parameters:
   * - platform: Required (ANDROID | IOS) - identifies which database table to query
   * 
   * Request Body (Android):
   * - rolloutPercent: float (0-100)
   * - inAppPriority: number (0-5)
   * - releaseNotes: string
   * 
   * Request Body (iOS):
   * - phasedRelease: boolean
   * - resetRating: boolean
   * - releaseNotes: string
   * 
   * Process:
   * 1. Updates submission details in database
   * 2. Calls store API (Google Play / App Store Connect) to submit
   * 3. If successful, changes status to SUBMITTED
   */
  router.put(
    "/submissions/:submissionId/submit",
    submissionController.submitExistingSubmission
  );

  // ============================================================================
  // SUBMISSION - CREATE NEW (RESUBMISSION)
  // ============================================================================
  
  /**
   * POST /distributions/:distributionId/submissions
   * 
   * Create a completely new submission after rejection or cancellation.
   * 
   * Content-Type:
   * - Android: multipart/form-data (with AAB file) - NOT YET IMPLEMENTED
   * - iOS: application/json
   * 
   * Request Body (Android) - TODO: To be implemented later:
   * - platform: "ANDROID"
   * - version: string
   * - versionCode: number (optional - extracted from AAB if not provided)
   * - aabFile: file (multipart)
   * - rolloutPercent: float (0-100)
   * - inAppPriority: number (0-5)
   * - releaseNotes: string
   * 
   * Request Body (iOS) - IMPLEMENTED:
   * - platform: "IOS"
   * - version: string
   * - testflightNumber: number or string
   * - phasedRelease: boolean
   * - resetRating: boolean
   * - releaseNotes: string
   * 
   * What happens:
   * 1. Creates completely new submission with new ID
   * 2. Marks old submission as inactive
   * 3. Associates new artifact (TestFlight build)
   * 4. Calls Apple API to submit for review
   * 5. Sets status to SUBMITTED
   * 6. Old submission remains in history
   */
  router.post(
    "/distributions/:distributionId/submissions",
    upload.single('aabFile'),
    submissionController.createNewSubmission
  );

  // ============================================================================
  // SUBMISSION - GET DETAILS
  // ============================================================================
  
  /**
   * GET /submissions/:submissionId
   * 
   * Get full details for a specific submission with artifact information.
   * 
   * Use Case: Submission details page
   */
  router.get(
    "/submissions/:submissionId",
    submissionController.getSubmissionDetails
  );

  // ============================================================================
  // SUBMISSION - UPDATE ROLLOUT PERCENTAGE
  // ============================================================================
  
  /**
   * PATCH /submissions/:submissionId/rollout?platform=<ANDROID|IOS>
   * 
   * Increase/decrease rollout percentage for a submission.
   * 
   * Query Parameters:
   * - platform: string (required) - "ANDROID" or "IOS"
   * 
   * Platform-Specific Rules:
   * - Android: Can rollout to any percentage (0-100, supports decimals)
   * - iOS Manual: Always 100% (returns 409 conflict)
   * - iOS Phased: Can only update to 100% (to complete rollout early, returns 409 if not 100)
   * 
   * Request Body:
   * - rolloutPercent: float (0-100)
   */
  router.patch(
    "/submissions/:submissionId/rollout",
    submissionController.updateRolloutPercentage
  );

  // ============================================================================
  // SUBMISSION - CANCEL
  // ============================================================================
  
  /**
   * PATCH /submissions/:submissionId/cancel
   * 
   * Cancel an in-review submission.
   * 
   * Request Body:
   * - reason: string (optional)
   */
  router.patch(
    "/submissions/:submissionId/cancel",
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement submissionController.cancelSubmission
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json({
        error: "Not implemented yet",
        message: "Cancel submission endpoint"
      });
    }
  );

  // ============================================================================
  // SUBMISSION - PAUSE ROLLOUT (iOS ONLY)
  // ============================================================================
  
  /**
   * PATCH /submissions/:submissionId/rollout/pause?platform=IOS
   * 
   * Pause an active rollout (iOS only).
   * 
   * Query Parameters:
   * - platform: string (required) - Must be "IOS" (throws error if "ANDROID")
   * 
   * Request Body:
   * - reason: string (required)
   */
  router.patch(
    "/submissions/:submissionId/rollout/pause",
    submissionController.pauseRollout
  );

  // ============================================================================
  // SUBMISSION - RESUME ROLLOUT (iOS ONLY)
  // ============================================================================
  
  /**
   * PATCH /submissions/:submissionId/rollout/resume?platform=IOS
   * 
   * Resume a paused rollout (iOS only).
   * 
   * Query Parameters:
   * - platform: string (required) - Must be "IOS" (throws error if "ANDROID")
   */
  router.patch(
    "/submissions/:submissionId/rollout/resume",
    submissionController.resumeRollout
  );

  // ============================================================================
  // SUBMISSION - EMERGENCY HALT
  // ============================================================================
  
  /**
   * PATCH /submissions/:submissionId/rollout/halt
   * 
   * Immediately halt a release (cannot resubmit, must create new release).
   * 
   * Request Body:
   * - reason: string (required)
   */
  router.patch(
    "/submissions/:submissionId/rollout/halt",
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement submissionController.emergencyHalt
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json({
        error: "Not implemented yet",
        message: "Emergency halt endpoint"
      });
    }
  );

  return router;
}

