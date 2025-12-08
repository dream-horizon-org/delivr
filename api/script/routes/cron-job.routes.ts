/**
 * Cron Job Routes
 * 
 * State Machine-based cron job API.
 * Simplified routes - no stage-specific endpoints needed.
 * 
 * The State Machine automatically determines which stage to execute
 * based on the current state in the database.
 * 
 * Routes:
 * - POST /releases/:releaseId/cron/start - Start cron (State Machine handles stage transitions)
 * - POST /releases/:releaseId/cron/stop - Stop cron
 * - GET /releases/:releaseId/cron/status - Get current status
 */

import { Router } from 'express';
import type { Storage } from '~storage/storage';
import { CronJobService } from '~services/release/cron-job/cron-job.service';
import { CronJobController } from '~controllers/cron-job.controller';

export interface CronJobRoutesConfig {
  storage: Storage;
}

export function createCronJobRoutes(config: CronJobRoutesConfig): Router {
  const router = Router();
  
  // Initialize service and controller
  const cronJobService = new CronJobService(config.storage);
  const cronJobController = new CronJobController(cronJobService);

  /**
   * Start cron job
   * POST /releases/:releaseId/cron/start
   * 
   * State Machine automatically determines which stage to execute based on DB state.
   * Handles Stage 1 → 2 → 3 transitions automatically (if autoTransitionToStageX is true).
   */
  router.post(
    '/releases/:releaseId/cron/start',
    cronJobController.startCronJob
  );

  /**
   * Stop cron job
   * POST /releases/:releaseId/cron/stop
   * 
   * Stops the cron job for the release (regardless of current stage).
   */
  router.post(
    '/releases/:releaseId/cron/stop',
    cronJobController.stopCronJob
  );

  /**
   * Get cron job status
   * GET /releases/:releaseId/cron/status
   * 
   * Returns current stage statuses and whether cron is running.
   */
  router.get(
    '/releases/:releaseId/cron/status',
    cronJobController.getCronJobStatus
  );

  return router;
}

