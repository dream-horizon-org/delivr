/**
 * Release Management Routes (Release Orchestration)
 *
 * Handles all release-related API endpoints by delegating to controllers.
 * Routes are minimal - routing only, no business logic.
 */
import { Request, Response, Router } from "express";
import * as multer from "multer";
import * as storageTypes from "../../storage/storage";
import * as tenantPermissions from "../../middleware/tenant-permissions";
import * as releasePermissions from "../../middleware/release-permissions";
import { ReleaseManagementController } from "../../controllers/release/release-management.controller";

import { verifyTestFlightBuild } from "../../controllers/release/testflight-verification.controller";
import { BuildCallbackController } from "../../controllers/release/build-callback.controller";

// Note: CronJobService is now accessed from storage instance (migrated from factory)
// Note: Services (BuildCallbackService, ManualUploadService, UploadValidationService, BuildArtifactService) 
// are now accessed from storage instance (migrated from factory)
import type { ManualUploadService } from "../../services/release/manual-upload.service";
import { createBuildListArtifactsHandler } from "~controllers/release-management/builds/list-artifacts.controller";
import { createBuildDownloadArtifactHandler } from "~controllers/release-management/builds/download-artifact.controller";
import { createCiTestflightVerifyHandler } from "~controllers/release-management/builds/testflight-ci-verify.controller";
import { createCiArtifactUploadHandler } from "~controllers/release-management/builds/ci-artifact-upload.controller";
import { HTTP_STATUS } from "../../constants/http";
import {
  hasReleaseCreationService,
  hasManualUploadDependencies,
  hasBuildCallbackDependencies,
  hasCronJobService,
  hasUploadValidationService,
  hasManualUploadService,
  hasBuildCallbackService,
  StorageWithReleaseServices
} from "../../types/release/storage-with-services.interface";

// Multer configuration for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});
import type { ReleaseActivityLogService } from "../../services/release/release-activity-log.service";

export interface ReleaseManagementConfig {
  storage: storageTypes.Storage;
}

/**
 * Creates and configures the Release Management router
 * 
 * Gets services from storage (initialized by S3Storage).
 * Gets CronJobService from factory.
 */
export function getReleaseManagementRouter(config: ReleaseManagementConfig): Router {
  const storage: storageTypes.Storage = config.storage;
  const router: Router = Router();

  // Check if release services are available using type guard
  const servicesInitialized = hasReleaseCreationService(storage);
  if (!servicesInitialized) {
    console.warn('[Release Orchestration Routes] Release services not initialized on storage');
    return router;
  }

  // TypeScript now knows storage has release services
  const storageWithServices: StorageWithReleaseServices = storage;

  // ✅ Get CronJobService from storage instance (migrated from factory)
  // Use proper type guard instead of 'as any'
  if (!hasCronJobService(storage)) {
    console.warn('[Release Orchestration Routes] CronJobService not available');
    return router;
  }
  
  // TypeScript now knows storage is StorageWithReleaseServices
  const storageWithAllServices: StorageWithReleaseServices = storage;
  const cronJobService = storageWithAllServices.cronJobService;

  // Inject ReleaseStatusService into CronJobService (for approval checks)
  if (storageWithServices.releaseStatusService) {
    cronJobService.setReleaseStatusService(storageWithServices.releaseStatusService);
    console.log('[Release Management] ReleaseStatusService injected into CronJobService');
  }

  // ✅ Get ManualUploadService from storage (centralized initialization - actively initialized in aws-storage.ts)
  if (!hasManualUploadService(storage)) {
    throw new Error('ManualUploadService not available on storage - initialization failed');
  }
  const manualUploadService = storageWithServices.manualUploadService;

  // Create ReleaseManagementController with services
  const controller = new ReleaseManagementController(
    storageWithServices.releaseCreationService,
    storageWithServices.releaseRetrievalService,
    storageWithServices.releaseStatusService,
    storageWithServices.releaseUpdateService,
    storageWithServices.releaseActivityLogService,
    cronJobService,
    manualUploadService  // ✅ Always provided - actively initialized
  );

  // ✅ Get BuildCallbackService from storage (centralized initialization - actively initialized in aws-storage.ts)
  if (!hasBuildCallbackService(storage)) {
    throw new Error('BuildCallbackService not available on storage - initialization failed');
  }
  const buildCallbackService = storageWithServices.buildCallbackService;
  const buildCallbackController = new BuildCallbackController(buildCallbackService);  // ✅ Always available - actively initialized

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  router.get(
    "/health",
    tenantPermissions.requireTenantMembership({ storage }),
    (req: Request, res: Response): Response => {
      return res.status(HTTP_STATUS.OK).json({
        service: "Release Management",
        status: "healthy",
        timestamp: new Date().toISOString()
      });
    }
  );

  // ============================================================================
  // RELEASE CRUD OPERATIONS
  // ============================================================================

  // Create a new release
  router.post(
    "/tenants/:tenantId/releases",
    tenantPermissions.requireEditor({ storage }),
    controller.createRelease
  );

  // Get a specific release
  router.get(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getRelease
  );

  // Get all releases for a tenant
  router.get(
    "/tenants/:tenantId/releases",
    tenantPermissions.requireTenantMembership({ storage }),
    controller.listReleases
  );

  // Update a release
  router.patch(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireEditor({ storage }),
    controller.updateRelease
  );

  // Delete a release
  router.delete(
    "/tenants/:tenantId/releases/:releaseId",
    releasePermissions.requireReleaseOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Delegate to controller.deleteRelease
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Release deletion endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================
  
  // Get tasks for a release
  router.get(
    "/tenants/:tenantId/releases/:releaseId/tasks",
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getTasks
  );

  // Get a specific task
  router.get(
    "/tenants/:tenantId/releases/:releaseId/tasks/:taskId",
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getTaskById
  );

  // Update task status
  router.put(
    "/tenants/:tenantId/releases/:releaseId/tasks/:taskId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Delegate to controller.updateTaskStatus
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Task status update endpoint coming soon"
      });
    }
  );
  
  // Start cron job
  router.post(
    "/tenants/:tenantId/releases/:releaseId/cron/start",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Delegate to controller.startCronJob
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Cron job start endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // STAGE 2 TRIGGER (Manual Build Upload Flow)
  // ============================================================================

  /**
   * POST /tenants/:tenantId/releases/:releaseId/trigger-regression-testing
   * 
   * Manually trigger Stage 2 (Regression Testing) after manual build upload.
   * This is used when hasManualBuildUpload = true.
   * 
   * Requirements:
   * - Stage 1 must be COMPLETED
   * - Stage 2 must not already be IN_PROGRESS or COMPLETED
   * 
   * Actions:
   * - Sets autoTransitionToStage2 = true
   * - Sets stage2Status = IN_PROGRESS
   * - Starts regression cron job
   */
  router.post(
    "/tenants/:tenantId/releases/:releaseId/trigger-regression-testing",
    tenantPermissions.requireEditor({ storage }),
    controller.triggerRegressionTesting
  );

  // ============================================================================
  // RELEASE PAUSE/RESUME
  // ============================================================================
  
  // Pause release (user-requested)
  router.post(
    "/tenants/:tenantId/releases/:releaseId/pause",
    tenantPermissions.requireEditor({ storage }),
    controller.pauseRelease
  );

  // Resume release (user-paused)
  router.post(
    "/tenants/:tenantId/releases/:releaseId/resume",
    tenantPermissions.requireEditor({ storage }),
    controller.resumeRelease
  );

  // NOTE: Regression slot management (add/delete) is now handled through updateRelease API
  // Update release with { cronJob: { upcomingRegressions: [...] } } to add/remove slots

  // ============================================================================
  // STATE HISTORY
  // ============================================================================
  
  // Get release timeline
  router.get(
    "/tenants/:tenantId/releases/:releaseId/timeline",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Delegate to controller.getTimeline
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Timeline endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // TASK RETRY
  // ============================================================================

  // Retry a failed task
  // Resets task status to PENDING, cron will re-execute on next tick
  router.post(
    "/tenants/:tenantId/releases/:releaseId/tasks/:taskId/retry",
    tenantPermissions.requireEditor({ storage }),
    controller.retryTask
  );

  // ============================================================================
  // MANUAL BUILD UPLOAD
  // ============================================================================

  /**
   * PUT /tenants/:tenantId/releases/:releaseId/stages/:stage/builds/:platform
   * 
   * Upload a build artifact manually for a specific platform.
   * Used when hasManualBuildUpload = true.
   * 
   * Request: multipart/form-data with 'artifact' file field
   * 
   * Actions:
   * - Validates upload is allowed (stage window, platform, hasManualBuildUpload)
   * - Uploads to S3
   * - Creates/updates entry in release_uploads staging table
   * - Returns upload status (all platforms ready or not)
   */
  router.put(
    "/tenants/:tenantId/releases/:releaseId/stages/:stage/builds/:platform",
    tenantPermissions.requireEditor({ storage }),
    upload.single('artifact'),
    controller.uploadManualBuild
  );

  // ============================================================================
  // BUILD CALLBACK (CI/CD Webhook)
  // ============================================================================

  /**
   * POST /webhooks/build-callback
   * 
   * Webhook endpoint for CI/CD systems to notify about build completion.
   * Called by CI/CD system (GitHub Actions, Jenkins, etc.) when a build finishes.
   * 
   * Request body:
   * - taskId: Task ID for the build task (required)
   * 
   * Note: This endpoint does NOT check tenant permissions as it's called by CI/CD.
   * The taskId must be valid and associated with a release.
   * 
   * The build system updates buildUploadStatus in the builds table.
   * This handler READS that status and updates task/release accordingly.
   */
  // ✅ Controller is always available - actively initialized in aws-storage.ts (no conditional check needed)
  router.post(
    "/webhooks/build-callback",
    buildCallbackController.handleBuildCallback
  );

  // ============================================================================
  // ARCHIVE RELEASE
  // ============================================================================

  // Archive (cancel) a release
  router.put(
    "/tenants/:tenantId/releases/:releaseId/archive",
    releasePermissions.requireReleaseOwner({ storage }),
    controller.archiveRelease
  );

  // ============================================================================
  // STAGE 3 TRIGGER
  // ============================================================================
  
  // Trigger Pre-Release (Stage 3)
  router.post(
    "/tenants/:tenantId/releases/:releaseId/trigger-pre-release",
    tenantPermissions.requireEditor({ storage }),
    controller.triggerPreRelease
  );

  // ============================================================================
  // STAGE 4 TRIGGER
  // ============================================================================
  
  // Trigger Distribution (Stage 4)
  router.post(
    "/tenants/:tenantId/releases/:releaseId/trigger-distribution",
    tenantPermissions.requireEditor({ storage }),
    controller.triggerDistribution
  );

  // ============================================================================
  // MANUAL APIS AFTER STAGE 3
  // ============================================================================
  
  // Store What's New
  router.post(
    "/tenants/:tenantId/releases/:releaseId/whats-new",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Delegate to controller.saveWhatsNew
      return res.status(501).json({
        error: "Not implemented yet",
        message: "What's New endpoint coming soon"
      });
    }
  );

  // Check Cherry Pick Status
  router.get(
    "/tenants/:tenantId/releases/:releaseId/check-cherry-pick-status",
    tenantPermissions.requireTenantMembership({ storage }),
    controller.checkCherryPickStatus
  );

  // Check project management run status
  router.get(
    "/tenants/:tenantId/releases/:releaseId/project-management-run-status",
    tenantPermissions.requireTenantMembership({ storage }),
    controller.checkProjectManagementRunStatus
  );

  // Check test management run status
  router.get(
    "/tenants/:tenantId/releases/:releaseId/test-management-run-status",
    tenantPermissions.requireTenantMembership({ storage }),
    controller.checkTestManagementRunStatus
  );

  // ============================================================================
  // ACTIVITY LOGS
  // ============================================================================

  // Get activity logs for a release
  router.get(
    "/tenants/:tenantId/releases/:releaseId/activity-logs",
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getActivityLogs
  );

  // ============================================================================
  // BUILD VERIFICATION
  // ============================================================================

  router.post(
    "/tenants/:tenantId/releases/:releaseId/stages/:stage/builds/ios/verify-testflight",
    tenantPermissions.requireEditor({ storage }),
    verifyTestFlightBuild
  );

  // CI/CD TestFlight verification
  // POST /builds/ci/testflight/verify
  // ciRunId is passed in request body (supports URLs with special characters)
  router.post(
    "/builds/ci/testflight/verify",
    tenantPermissions.requireOwner({ storage }),
    createCiTestflightVerifyHandler(storage)
  );

  // CI/CD Artifact Upload
  // POST /builds/ci/artifact
  // Body: multipart/form-data with ciRunId, artifactVersion, artifact file, optional buildNumber
  router.post(
    "/builds/ci/artifact",
    tenantPermissions.requireOwner({ storage }),
    upload.single('artifact'),
    createCiArtifactUploadHandler(storage)
  );

  // Get build artifacts
  router.get(
    "/tenants/:tenantId/releases/:releaseId/builds/artifacts",
    tenantPermissions.requireTenantMembership({ storage }),
    createBuildListArtifactsHandler(storage)
  );

  // Download build artifact
  // GET /tenants/:tenantId/builds/:buildId/artifact
  // Returns presigned download URL with expiry timestamp
  router.get(
    "/tenants/:tenantId/builds/:buildId/artifact",
    tenantPermissions.requireOwner({ storage }),
    createBuildDownloadArtifactHandler(storage)
  );

  return router;
}
