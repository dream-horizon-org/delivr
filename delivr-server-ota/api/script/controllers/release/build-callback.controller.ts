/**
 * Build Callback Controller
 * 
 * Handles HTTP requests for CI/CD build callbacks.
 * Focuses on validation and delegates to BuildCallbackService.
 * 
 * Note: This endpoint does NOT check tenant permissions as it's called by CI/CD.
 * The taskId must be valid and associated with a release.
 */

import { Request, Response } from 'express';
import { BuildCallbackService } from '../../services/release/build-callback.service';
import { HTTP_STATUS } from '../../constants/http';

export class BuildCallbackController {
  constructor(
    private readonly buildCallbackService: BuildCallbackService
  ) {}

  /**
   * Handle build callback from CI/CD system
   * 
   * POST /webhooks/build-callback
   * 
   * Request body:
   * - taskId: Task ID for the build task (required)
   * 
   * The build system updates buildUploadStatus in the builds table.
   * This handler READS that status and updates task/release accordingly.
   */
  handleBuildCallback = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { taskId } = req.body;

      // Validation
      if (!taskId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'taskId is required'
        });
      }

      // Validate taskId is a string
      const taskIdIsString = typeof taskId === 'string';
      if (!taskIdIsString) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'taskId must be a string'
        });
      }

      // Delegate to service
      const result = await this.buildCallbackService.processCallback(taskId);

      if (!result.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: result.message
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
        data: {
          taskId: result.taskId,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus
        }
      });
    } catch (error: unknown) {
      console.error('[BuildCallbackController] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to process build callback',
        message: errorMessage
      });
    }
  };
}

