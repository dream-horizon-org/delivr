/**
 * Release Management Routes
 * 
 * Handles all release-related API endpoints by delegating to ReleaseManagementController.
 * Follows Controller-Service-Repository pattern.
 */

import { Request, Response, Router } from "express";
import * as storageTypes from "../../storage/storage";
import * as tenantPermissions from "../../middleware/tenant-permissions";
import { ReleaseManagementController } from "../../controllers/release/release-management.controller";
import type { ReleaseCreationService } from "../../services/release/release-creation.service";
import type { ReleaseRetrievalService } from "../../services/release/release-retrieval.service";
import { fileUploadMiddleware } from "../../file-upload-manager";
import { createManualBuildUploadHandler } from "~controllers/release-management/builds/manual-upload.controller";
import { createListBuildArtifactsHandler } from "~controllers/release-management/builds/list-artifacts.controller";
import { createCiArtifactUploadHandler } from "~controllers/release-management/builds/ci-artifact-upload.controller";

export interface ReleaseManagementConfig {
  storage: storageTypes.Storage;
  releaseCreationService: ReleaseCreationService;
  releaseRetrievalService: ReleaseRetrievalService;
}

/**
 * Creates and configures the Release Management router
 */
export function getReleaseManagementRouter(config: ReleaseManagementConfig): Router {
  const storage: storageTypes.Storage = config.storage;
  const router: Router = Router();
  const controller = new ReleaseManagementController(
    config.releaseCreationService,
    config.releaseRetrievalService
  );

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  router.get("/health", (req: Request, res: Response): Response => {
    return res.status(200).json({
      service: "Release Management",
      status: "healthy",
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // RELEASE CRUD OPERATIONS
  // ============================================================================

  // Create a new release
  router.post(
    "/tenants/:tenantId/releases",
    tenantPermissions.requireOwner({ storage }),
    controller.createRelease
  );

  // Get a specific release
  router.get(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireOwner({ storage }),
    controller.getRelease
  );

  // Get all releases for a tenant
  router.get(
    "/tenants/:tenantId/releases",
    tenantPermissions.requireOwner({ storage }),
    controller.listReleases
  );

  // Update a release
  router.patch(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Delegate to controller.updateRelease
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Release update endpoint coming soon"
      });
    }
  );

  // Delete a release
  router.delete(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireOwner({ storage }),
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
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
        // TODO: Delegate to controller.getTasks
        // Temporary: Keep existing logic or move to controller later
        // For now returning 501 to signal architectural shift, assuming tests will be updated
        return res.status(501).json({ error: "Not implemented yet", message: "Moved to controller" });
    }
  );

  // Get a specific task
  router.get(
    "/tenants/:tenantId/releases/:releaseId/tasks/:taskId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
        // TODO: Delegate to controller.getTask
        return res.status(501).json({ error: "Not implemented yet", message: "Moved to controller" });
    }
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

  // ============================================================================
  // CRON JOB MANAGEMENT
  // ============================================================================
  
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

  // Pause cron job
  router.post(
    "/tenants/:tenantId/releases/:releaseId/cron/pause",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Delegate to controller.pauseCronJob
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Cron job pause endpoint coming soon"
      });
    }
  );

  // Resume cron job
  router.post(
    "/tenants/:tenantId/releases/:releaseId/cron/resume",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Delegate to controller.resumeCronJob
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Cron job resume endpoint coming soon"
      });
    }
  );

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
  // STAGE 3 TRIGGER
  // ============================================================================
  
  // Trigger Pre-Release (Stage 3)
  router.post(
    "/tenants/:tenantId/releases/:releaseId/trigger-pre-release",
    tenantPermissions.requireOwner({ storage }),
    controller.triggerPreRelease
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
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Delegate to controller.checkCherryPickStatus
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Cherry pick status endpoint coming soon"
      });
    }
  );

  // Manual build upload (artifact upload to S3 + DB record)
  // Uses file upload middleware only for this route
  router.post(
    "/tenants/:tenantId/releases/:releaseId/builds/manual-upload",
    tenantPermissions.requireOwner({ storage }),
    fileUploadMiddleware,
    createManualBuildUploadHandler(storage)
  );

  // List artifact paths for a release filtered by platform (query param)
  // POST /tenants/:tenantId/releases/:releaseId/builds/artifacts?platform=ANDROID|IOS
  router.post(
    "/tenants/:tenantId/releases/:releaseId/builds/artifacts",
    tenantPermissions.requireOwner({ storage }),
    createListBuildArtifactsHandler(storage)
  );

  // CI artifact upload using ci_run_id lookup
  // POST /builds/ci/:ciRunId/artifact
  router.post(
    "/builds/ci/:ciRunId/artifact",
    tenantPermissions.allowAll({ storage }),
    fileUploadMiddleware,
    createCiArtifactUploadHandler(storage)
  );

  return router;
}
