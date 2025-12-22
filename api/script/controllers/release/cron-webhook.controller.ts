/**
 * Cron Webhook Controller
 * 
 * Handles incoming webhook calls from Cronicle to process releases.
 * This replaces the per-release setInterval with a global scheduler.
 * 
 * Endpoint: POST /internal/cron/releases
 * - Called by Cronicle every 60 seconds
 * - Processes ALL releases with cronStatus=RUNNING and pauseType=NONE
 * - Protected by cronicleAuthMiddleware
 * 
 * Architecture:
 * - Controller (THIS) → Thin layer, handles validation + HTTP concerns
 * - Service (GlobalSchedulerService) → Business logic
 */

import { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { GlobalSchedulerService } from '~services/release/cron-job/global-scheduler.service';

// ============================================================================
// CONTROLLER FACTORY
// ============================================================================

/**
 * Create cron webhook controller
 * 
 * @param globalSchedulerService - Service that handles release processing logic (✅ Required - actively initialized in aws-storage.ts)
 */
export const createCronWebhookController = (
  globalSchedulerService: GlobalSchedulerService  // ✅ Required - actively initialized in aws-storage.ts
) => {
  
  // ─────────────────────────────────────────────────────────────
  // Handler: Process all active releases
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Handle release tick from Cronicle
   * 
   * Delegates to GlobalSchedulerService to process all active releases.
   */
  const handleReleaseTick = async (_req: Request, res: Response): Promise<void> => {
    // ✅ globalSchedulerService is required - actively initialized in aws-storage.ts, no null check needed
    
    // Delegate to service (business logic)
    const result = await globalSchedulerService.processAllActiveReleases();
    
    // Handle HTTP response based on service result
    if (result.success) {
      res.status(HTTP_STATUS.OK).json(result);
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(result);
    }
  };
  
  return {
    handleReleaseTick
  };
};
