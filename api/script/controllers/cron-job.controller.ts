/**
 * Cron Job Controller
 * 
 * Simplified controller for State Machine-based cron job operations.
 * 
 * Responsibilities:
 * - Extract parameters from request
 * - Call service methods
 * - Format responses (success/error)
 * - Return appropriate HTTP status codes
 * 
 * Note: No stage-specific endpoints needed - State Machine handles transitions.
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { CronJobService } from '~services/release/cron-job/cron-job.service';

export class CronJobController {
  constructor(private readonly cronJobService: CronJobService) {}

  /**
   * Start cron job
   * POST /releases/:releaseId/cron/start
   * 
   * State Machine determines which stage to execute based on DB state.
   */
  startCronJob = async (req: Request, res: Response): Promise<Response> => {
    const releaseId = req.params.releaseId;

    try {
      await this.cronJobService.startCronJob(releaseId);
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Cron job started for release ${releaseId}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: `Failed to start cron job: ${errorMessage}`,
      });
    }
  };

  /**
   * Stop cron job
   * POST /releases/:releaseId/cron/stop
   */
  stopCronJob = (req: Request, res: Response): Response => {
    const releaseId = req.params.releaseId;

    try {
      this.cronJobService.stopCronJob(releaseId);
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Cron job stopped for release ${releaseId}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: `Failed to stop cron job: ${errorMessage}`,
      });
    }
  };

  /**
   * Get cron job status
   * GET /releases/:releaseId/cron/status
   */
  getCronJobStatus = (req: Request, res: Response): Response => {
    const releaseId = req.params.releaseId;

    try {
      const isRunning = this.cronJobService.isCronJobRunning(releaseId);
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          releaseId,
          isRunning,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: `Failed to get cron job status: ${errorMessage}`,
      });
    }
  };
}

