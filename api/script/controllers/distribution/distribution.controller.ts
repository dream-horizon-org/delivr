/**
 * Distribution Controller
 * Handles HTTP requests for distribution operations
 */

import { Request, Response } from 'express';
import { DistributionService } from '~services/distribution/distribution.service';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, errorResponse, notFoundResponse } from '~utils/response.utils';

/**
 * Create distribution controller
 */
export const createDistributionController = (service: DistributionService) => {
  /**
   * Get distribution by release ID with all submissions and action history
   * GET /api/v1/releases/:releaseId/distribution
   */
  const getDistributionByReleaseId = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { releaseId } = req.params;

      if (!releaseId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(new Error('Release ID is required'), 'Get Distribution')
        );
      }

      const distribution = await service.getDistributionByReleaseId(releaseId);

      if (!distribution) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Distribution')
        );
      }

      return res.status(HTTP_STATUS.OK).json(
        successResponse(distribution)
      );
    } catch (error: unknown) {
      console.error('[Get Distribution by Release ID] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        errorResponse(error, 'Failed to get distribution')
      );
    }
  };

  return {
    getDistributionByReleaseId
  };
};

