/**
 * Release Schedule Controller
 * HTTP handlers for release schedule endpoints
 * 
 * Contains both:
 * - Internal webhook handler (called by Cronicle)
 * - User-facing handlers (called by frontend)
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ReleaseScheduleService } from '~services/release-schedules';
import {
  errorResponse,
  getErrorStatusCode,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import {
  RELEASE_SCHEDULE_ERROR_MESSAGES,
  RELEASE_SCHEDULE_SUCCESS_MESSAGES
} from './release-schedule.constants';

// ============================================================================
// INTERNAL WEBHOOK HANDLERS (Called by Cronicle)
// ============================================================================

/**
 * Handler: Create scheduled release (Cronicle webhook)
 * 
 * POST /internal/release-schedules/create-release
 * Body: { scheduleId: string }
 * 
 * This handler runs daily for each schedule. The service handles all
 * business logic checks (exists, enabled, time to create).
 */
const createScheduledReleaseHandler = (service: ReleaseScheduleService) =>
  async (req: Request, res: Response): Promise<void> => {
    const { scheduleId } = req.body;

    // Validate scheduleId (request validation - belongs in controller)
    const scheduleIdMissing = !scheduleId || typeof scheduleId !== 'string';
    if (scheduleIdMissing) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorResponse('scheduleId', RELEASE_SCHEDULE_ERROR_MESSAGES.MISSING_SCHEDULE_ID)
      );
      return;
    }

    console.log('[createScheduledRelease] Received webhook for scheduleId:', scheduleId);

    try {
      // Delegate to service - it handles all business logic
      const result = await service.tryCreateScheduledReleaseFromWebhook(scheduleId);

      // Map result status to HTTP response
      switch (result.status) {
        case 'not_found':
          console.log('[createScheduledRelease] Schedule not found:', scheduleId);
          res.status(HTTP_STATUS.NOT_FOUND).json(
            errorResponse(new Error(RELEASE_SCHEDULE_ERROR_MESSAGES.SCHEDULE_NOT_FOUND))
          );
          return;

        case 'disabled':
          console.log('[createScheduledRelease] Schedule is disabled:', scheduleId);
          res.status(HTTP_STATUS.OK).json(
            successResponse(
              { skipped: true, reason: RELEASE_SCHEDULE_ERROR_MESSAGES.SCHEDULE_DISABLED },
              RELEASE_SCHEDULE_SUCCESS_MESSAGES.RELEASE_SKIPPED
            )
          );
          return;

        case 'skipped':
          console.log('[createScheduledRelease] Not time to create release yet:', {
            scheduleId,
            nextKickoffDate: result.nextKickoffDate
          });
          res.status(HTTP_STATUS.OK).json(
            successResponse(
              { skipped: true, reason: 'Not time to create release yet', nextKickoffDate: result.nextKickoffDate },
              RELEASE_SCHEDULE_SUCCESS_MESSAGES.RELEASE_SKIPPED
            )
          );
          return;

        case 'created':
          console.log('[createScheduledRelease] Release created successfully:', {
            releaseId: result.releaseId,
            releaseInternalId: result.releaseInternalId
          });
          res.status(HTTP_STATUS.OK).json(
            successResponse(
              { releaseId: result.releaseId, releaseInternalId: result.releaseInternalId },
              RELEASE_SCHEDULE_SUCCESS_MESSAGES.RELEASE_CREATED
            )
          );
          return;
      }
    } catch (error) {
      console.error('[createScheduledRelease] Unexpected error:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_SCHEDULE_ERROR_MESSAGES.CREATE_RELEASE_FAILED)
      );
    }
  };

// ============================================================================
// USER-FACING HANDLERS (Called by Frontend)
// ============================================================================

/**
 * Handler: List release schedules by tenant
 * 
 * GET /tenants/:tenantId/release-schedules
 */
const listSchedulesByTenantHandler = (service: ReleaseScheduleService) =>
  async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = req.params;

    console.log('[listSchedulesByTenant] Fetching schedules for tenant:', tenantId);

    try {
      const schedules = await service.getByTenantId(tenantId);

      res.status(HTTP_STATUS.OK).json(
        successResponse(schedules)
      );
    } catch (error) {
      console.error('[listSchedulesByTenant] Failed:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_SCHEDULE_ERROR_MESSAGES.LIST_SCHEDULES_FAILED)
      );
    }
  };

// ============================================================================
// CONTROLLER FACTORY
// ============================================================================

/**
 * Factory: Create release schedule controller with all handlers
 */
export const createReleaseScheduleController = (
  service: ReleaseScheduleService
) => ({
  // Internal webhook
  createScheduledRelease: createScheduledReleaseHandler(service),
  // User-facing
  listSchedulesByTenant: listSchedulesByTenantHandler(service)
});
