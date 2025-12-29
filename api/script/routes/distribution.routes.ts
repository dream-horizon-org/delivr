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
import * as tenantPermissions from "../middleware/tenant-permissions";
import { HTTP_STATUS } from "../constants/http";
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

  // Check if storage has distribution services initialized
  const hasDistributionServices = 'submissionService' in storage && 'distributionService' in storage;
  
  if (!hasDistributionServices) {
    console.warn('[Distribution Routes] Distribution services not initialized in storage');
    return router;
  }

  // Extract pre-initialized services from storage (singleton pattern)
  const submissionService = (storage as any).submissionService;
  const distributionService = (storage as any).distributionService;
  
  // Initialize controllers with singleton services
  const submissionController = createSubmissionController(submissionService);
  const distributionController = createDistributionController(distributionService, storage);

  // ============================================================================
  // DISTRIBUTION - LIST, GET BY RELEASE ID OR DISTRIBUTION ID
  // ============================================================================


  
  /**
   * GET /distributions?tenantId=xxx&page=1&pageSize=10
   * 
   * List all distributions with pagination, filtering, and stats.
   * 
   * Query Parameters:
   * - page: number (default: 1)
   * - pageSize: number (default: 10, max: 100)
   * - status: string (filter by distribution status)
   * - platform: string (filter by platform: ANDROID or IOS)
   * 
   * Use Case: Distribution management page, view all distributions
   */
  router.get(
    "/distributions",
    tenantPermissions.requireTenantMembership({ storage }),
    distributionController.listDistributions
  );

  /**
   * GET /tenants/:tenantId/releases/:releaseId/distribution
   * 
   * Get distribution by release ID with all submissions and action history.
   * 
   * Use Case: View distribution details for a specific release
   */
  router.get(
    "/tenants/:tenantId/releases/:releaseId/distribution",
    tenantPermissions.requireTenantMembership({ storage }),
    distributionController.getDistributionByReleaseId
  );

  /**
   * GET /tenants/:tenantId/distributions/:distributionId
   * 
   * Get distribution by distribution ID with all submissions and action history.
   * 
   * Use Case: View distribution details when you have the distribution ID directly
   */
  router.get(
      "/tenants/:tenantId/distributions/:distributionId",
      tenantPermissions.requireTenantMembership({ storage }),
      distributionController.getDistributionById
  );
  // ============================================================================
  // SUBMISSION - SUBMIT EXISTING (FIRST-TIME)
  // ============================================================================
  
  /**
   * PUT /tenants/:tenantId/submissions/:submissionId/submit?platform=<ANDROID|IOS>
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
    "/tenants/:tenantId/submissions/:submissionId/submit",
    releasePermissions.requireReleaseOwner({ storage }),
    submissionController.submitExistingSubmission
  );

  // ============================================================================
  // SUBMISSION - CREATE NEW (RESUBMISSION)
  // ============================================================================
  
  /**
   * POST /tenants/:tenantId/distributions/:distributionId/submissions
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
    "/tenants/:tenantId/distributions/:distributionId/submissions",
    releasePermissions.requireReleaseOwner({ storage }),
    upload.single('aabFile'),
    submissionController.createNewSubmission
  );

  // ============================================================================
  // SUBMISSION - GET DETAILS
  // ============================================================================
  
  /**
   * GET /tenants/:tenantId/submissions/:submissionId
   * 
   * Get full details for a specific submission with artifact information.
   * 
   * Use Case: Submission details page
   */
  router.get(
    "/tenants/:tenantId/submissions/:submissionId",
    tenantPermissions.requireTenantMembership({ storage }),
    submissionController.getSubmissionDetails
  );

  /**
   * GET /tenants/:tenantId/submissions/:submissionId/artifact?platform={android|ios}
   * 
   * Get presigned download URL for submission artifact.
   * 
   * Query Parameters:
   * - platform: string (required) - "android" or "ios" (case-insensitive)
   * 
   * Response:
   * - url: string - Presigned S3 download URL (expires in 1 hour)
   * - expiresAt: string - ISO 8601 timestamp when URL expires
   * 
   * Use Case: Download submission artifact for local testing or review
   */
  router.get(
    "/tenants/:tenantId/submissions/:submissionId/artifact",
    tenantPermissions.requireTenantMembership({ storage }),
    submissionController.getSubmissionArtifactDownload
  );

  // ============================================================================
  // SUBMISSION - UPDATE ROLLOUT PERCENTAGE
  // ============================================================================
  
  /**
   * PATCH /tenants/:tenantId/submissions/:submissionId/rollout?platform=<ANDROID|IOS>
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
    "/tenants/:tenantId/submissions/:submissionId/rollout",
    releasePermissions.requireReleaseOwner({ storage }),
    submissionController.updateRolloutPercentage
  );

    // ============================================================================
  // SUBMISSION - CANCEL
  // ============================================================================
  
  /**
   * PATCH /submissions/:submissionId/cancel?platform=IOS
   * 
   * Cancel an iOS submission (iOS only).
   * Deletes the app store review submission in Apple App Store Connect.
   * 
   * Requirements:
   * - Status must be SUBMITTED or IN_REVIEW
   * - Must be active (isActive = true)
   * - After cancellation, keeps isActive = true (for future resubmission)
   * 
   * Query Parameters:
   * - platform: string (required) - Must be "IOS" (Android not yet supported)
   * 
   * Request Body:
   * - reason: string (required) - Reason for cancellation
   */
  router.patch(
    "/tenants/:tenantId/submissions/:submissionId/cancel",
    releasePermissions.requireReleaseOwner({ storage }),
    submissionController.cancelSubmission
  );

  // ============================================================================
  // SUBMISSION - PAUSE ROLLOUT (iOS) / HALT ROLLOUT (Android)
  // ============================================================================
  
  /**
   * PATCH /tenants/:tenantId/submissions/:submissionId/rollout/pause?platform=<IOS|ANDROID>
   * 
   * - iOS: Pause an active rollout (iOS only).
   * - Android: Halt an active rollout (Android only).
   * 
   * Query Parameters:
   * - platform: string (required) - "IOS" or "ANDROID"
   * 
   * Request Body:
   * - reason: string (required)
   */
  router.patch(
    "/tenants/:tenantId/submissions/:submissionId/rollout/pause",
    releasePermissions.requireReleaseOwner({ storage }),
    submissionController.pauseRollout
  );

  // ============================================================================
  // SUBMISSION - RESUME ROLLOUT (iOS or Android)
  // ============================================================================
  
  /**
   * PATCH /tenants/:tenantId/submissions/:submissionId/rollout/resume?platform=<IOS|ANDROID>
   * 
   * Resume a paused/halted rollout.
   * 
   * - iOS: Resumes a paused iOS phased release rollout
   * - Android: Resumes a halted Android release rollout
   * 
   * Query Parameters:
   * - platform: string (required) - "IOS" or "ANDROID"
   */
  router.patch(
    "/tenants/:tenantId/submissions/:submissionId/rollout/resume",
    releasePermissions.requireReleaseOwner({ storage }),
    submissionController.resumeRollout
  );

  // ============================================================================
  // SUBMISSION - EMERGENCY HALT
  // ============================================================================
  
  /**
   * PATCH /tenants/:tenantId/submissions/:submissionId/rollout/halt
   * 
   * Immediately halt a release (cannot resubmit, must create new release).
   * 
   * Request Body:
   * - reason: string (required)
   */
  router.patch(
    "/tenants/:tenantId/submissions/:submissionId/rollout/halt",
    releasePermissions.requireReleaseOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement submissionController.emergencyHalt
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json({
        error: "Not implemented yet",
        message: "Emergency halt endpoint"
      });
    }
  );

  // ============================================================================
  // INTERNAL - SUBMISSION STATUS UPDATE (Cronicle Webhook)
  // ============================================================================
  
  /**
   * POST /tenants/:tenantId/submissions/:submissionId/status
   * 
   * Internal webhook for Cronicle to update a specific submission's status.
   * Each submission has its own Cronicle job that calls this endpoint every 2 hours.
   * 
   * - Checks current status from Apple App Store Connect (iOS) or Google Play Console (Android)
   * - Updates database if status changed
   * - Adds action history if rejected
   * - Deletes Cronicle job when terminal state reached (LIVE or REJECTED)
   * 
   * Path Parameters:
   * - submissionId: string (required) - Submission ID
   * 
   * Query Parameters:
   * - platform: string (required) - "IOS" 
   * - storeType: string (required) - "APP_STORE" 
   * 
   * Response:
   * - status: 'synced' | 'not_found'
   * - oldStatus: previous status
   * - newStatus: current status
   * - isTerminal: whether terminal state reached
   * - jobDeleted: whether Cronicle job was deleted
   */
  router.post(
    "/tenants/:tenantId/submissions/:submissionId/status",
    tenantPermissions.requireTenantMembership({ storage }),
    submissionController.submissionStatus
  );

  return router;
}

