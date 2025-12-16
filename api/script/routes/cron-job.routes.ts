/**
 * Cron Job Routes
 * 
 * State Machine-based cron job API.
 * Routes delegate to CronJobController - minimal code at route level.
 * 
 * Routes:
 * - POST /releases/:releaseId/cron/start - Start cron
 * - POST /releases/:releaseId/cron/stop - Stop cron
 * - GET /releases/:releaseId/cron/status - Get status
 */

import { Router } from 'express';
import type { Storage } from '~storage/storage';
import { CronJobController } from '~controllers/cron-job.controller';
import { getCronJobService } from '~services/release/cron-job/cron-job-service.factory';

export interface CronJobRoutesConfig {
  storage: Storage;
}

export function createCronJobRoutes(config: CronJobRoutesConfig): Router {
  const router = Router();
  
  // Get service from factory (handles all initialization)
  const cronJobService = getCronJobService(config.storage);
  if (!cronJobService) {
    console.warn('[Cron Job Routes] CronJobService not available - routes disabled');
    return router;
  }
  
  const controller = new CronJobController(cronJobService);

  // Route definitions - minimal, delegation only
  router.post('/releases/:releaseId/cron/start', controller.startCronJob);
  router.post('/releases/:releaseId/cron/stop', controller.stopCronJob);
  router.get('/releases/:releaseId/cron/status', controller.getCronJobStatus);

  return router;
}

