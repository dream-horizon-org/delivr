/**
 * Distribution Controller
 * Handles HTTP requests for distribution operations
 */

import { Request, Response } from 'express';
import { DistributionService } from '~services/distribution/distribution.service';
import { HTTP_STATUS } from '~constants/http';
import { successResponse, errorResponse, notFoundResponse } from '~utils/response.utils';
import { getUserTenantPermission } from '~middleware/tenant-permissions';
import type { Storage } from '~storage/storage';

/**
 * Create distribution controller
 */
export const createDistributionController = (service: DistributionService, storage?: Storage) => {
  /**
   * Get distribution by release ID with all submissions and action history
   * GET /api/v1/tenants/:tenantId/releases/:releaseId/distribution
   */
  const getDistributionByReleaseId = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { tenantId, releaseId } = req.params;

      if (!tenantId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(new Error('Tenant ID is required'), 'Get Distribution')
        );
      }

      if (!releaseId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(new Error('Release ID is required'), 'Get Distribution')
        );
      }

      const distribution = await service.getDistributionByReleaseId(releaseId);

      // Return 200 OK with null if not found (valid empty state, not an error)
      return res.status(HTTP_STATUS.OK).json(
        successResponse(distribution ?? null)
      );
    } catch (error: unknown) {
      console.error('[Get Distribution by Release ID] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        errorResponse(error, 'Failed to get distribution')
      );
    }
  };

  /**
   * Get distribution by ID with all submissions and action history
   * GET /api/v1/tenants/:tenantId/distributions/:distributionId
   */
  const getDistributionById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { tenantId, distributionId } = req.params;

      if (!tenantId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(new Error('Tenant ID is required'), 'Get Distribution')
        );
      }

      if (!distributionId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(new Error('Distribution ID is required'), 'Get Distribution')
        );
      }

      const distribution = await service.getDistributionById(distributionId);

      if (!distribution) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Distribution')
        );
      }

      return res.status(HTTP_STATUS.OK).json(
        successResponse(distribution)
      );
    } catch (error: unknown) {
      console.error('[Get Distribution by ID] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        errorResponse(error, 'Failed to get distribution')
      );
    }
  };

  /**
   * List all distributions with pagination and filtering
   * GET /api/v1/distributions
   */
  const listDistributions = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
      const status = req.query.status as string | undefined;
      const platform = req.query.platform as string | undefined;
      const tenantId = req.query.tenantId as string | undefined;

      // Validate pagination
      if (page < 1) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(new Error('Page must be >= 1'), 'List Distributions')
        );
      }

      if (pageSize < 1 || pageSize > 100) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(new Error('Page size must be between 1 and 100'), 'List Distributions')
        );
      }

      // If tenantId is provided, check permissions
      if (tenantId) {
        const userId = (req as any).user?.id;
        if (!userId) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json(
            errorResponse(new Error('Unauthorized'), 'List Distributions')
          );
        }

        if (!storage) {
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
            errorResponse(new Error('Storage not available'), 'List Distributions')
          );
        }

        const userPermission = await getUserTenantPermission(storage, userId, tenantId);
        if (!userPermission) {
          return res.status(HTTP_STATUS.FORBIDDEN).json(
            errorResponse(new Error('You are not a member of this organization'), 'List Distributions')
          );
        }
      }

      const result = await service.listDistributions(
        { status, platform, tenantId },
        page,
        pageSize
      );

      // Always return 200 OK with result (empty array is valid, not an error)
      return res.status(HTTP_STATUS.OK).json(
        successResponse(result)
      );
    } catch (error: unknown) {
      console.error('[List Distributions] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        errorResponse(error, 'Failed to list distributions')
      );
    }
  };

  return {
    getDistributionByReleaseId,
    getDistributionById,
    listDistributions
  };
};

