/**
 * Release Management Routes (Release Orchestration)
 * 
 * Handles all release-related API endpoints by delegating to ReleaseManagementController.
 * Routes are minimal - delegation to controller only.
 */

import { Request, Response, Router } from "express";
import * as storageTypes from "../../storage/storage";
import * as tenantPermissions from "../../middleware/tenant-permissions";
import { ReleaseManagementController } from "../../controllers/release/release-management.controller";
import { getCronJobService } from "../../services/release/cron-job/cron-job-service.factory";
import { HTTP_STATUS } from "../../constants/http";

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

  // Get services from storage (cast to access services)
  const storageWithServices = storage as any;
  
  // Check if services are available
  if (!storageWithServices.releaseCreationService) {
    console.warn('[Release Orchestration Routes] Release services not initialized on storage');
    return router;
  }

  // Get CronJobService from factory
  const cronJobService = getCronJobService(storage);
  if (!cronJobService) {
    console.warn('[Release Orchestration Routes] CronJobService not available');
    return router;
  }

  // Create controller with services
  const controller = new ReleaseManagementController(
    storageWithServices.releaseCreationService,
    storageWithServices.releaseRetrievalService,
    storageWithServices.releaseStatusService,
    storageWithServices.releaseUpdateService,
    cronJobService
  );

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  router.get("/health", (req: Request, res: Response): Response => {
    return res.status(HTTP_STATUS.OK).json({
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
    controller.updateRelease
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
    controller.getTasks
  );

  // Get a specific task
  router.get(
    "/tenants/:tenantId/releases/:releaseId/tasks/:taskId",
    tenantPermissions.requireOwner({ storage }),
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
    tenantPermissions.requireOwner({ storage }),
    controller.triggerRegressionTesting
  );

  // ============================================================================
  // CRON JOB CONTROL
  // ============================================================================
  
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
  // ARCHIVE RELEASE
  // ============================================================================

  // Archive (cancel) a release
  router.put(
    "/tenants/:tenantId/releases/:releaseId/archive",
    tenantPermissions.requireOwner({ storage }),
    controller.archiveRelease
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

  // Check project management run status
  router.get(
    "/tenants/:tenantId/releases/:releaseId/project-management-run-status",
    tenantPermissions.requireOwner({ storage }),
    controller.checkProjectManagementRunStatus
  );

  // Check test management run status
  router.get(
    "/tenants/:tenantId/releases/:releaseId/test-management-run-status",
    tenantPermissions.requireOwner({ storage }),
    controller.checkTestManagementRunStatus
  );

  return router;
}
