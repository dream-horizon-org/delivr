/**
 * App Platform Target Controller
 * HTTP handlers for App Platform Target management
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { AppPlatformTargetService } from '~services/app-platform-target/app-platform-target.service';
import type {
  ConfigurePlatformTargetsRequest,
  CreateAppPlatformTargetRequest,
  UpdateAppPlatformTargetRequest
} from '~types/app-platform-target.types';
import { Platform, Target } from '~types/app-platform-target.types';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';

/**
 * Configure platform targets for an app (replace all)
 * PUT /apps/:appId/platform-targets
 */
const configurePlatformTargetsHandler = (service: AppPlatformTargetService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      const { platformTargets } = req.body;

      if (!platformTargets || !Array.isArray(platformTargets)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platformTargets', 'platformTargets must be an array')
        );
        return;
      }

      const data: ConfigurePlatformTargetsRequest = {
        platformTargets
      };

      const result = await service.configurePlatformTargets(appId, data);

      res.status(HTTP_STATUS.OK).json(
        successResponse({ platformTargets: result }, 'Platform targets configured successfully')
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to configure platform targets')
      );
    }
  };

/**
 * Get all platform targets for an app
 * GET /apps/:appId/platform-targets
 */
const getPlatformTargetsHandler = (service: AppPlatformTargetService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      const activeOnly = req.query.activeOnly === 'true';

      const platformTargets = await service.getPlatformTargets(appId, activeOnly);

      res.status(HTTP_STATUS.OK).json(
        successResponse({ platformTargets })
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to get platform targets')
      );
    }
  };

/**
 * Get platform targets by platform
 * GET /apps/:appId/platform-targets/:platform
 */
const getPlatformTargetsByPlatformHandler = (service: AppPlatformTargetService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, platform } = req.params;

      // Validate and cast platform to Platform enum
      if (!Object.values(Platform).includes(platform as Platform)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', `Invalid platform. Must be one of: ${Object.values(Platform).join(', ')}`)
        );
        return;
      }

      const platformTargets = await service.getPlatformTargetsByPlatform(appId, platform as Platform);

      res.status(HTTP_STATUS.OK).json(
        successResponse({ platformTargets })
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to get platform targets by platform')
      );
    }
  };

/**
 * Create a new platform target
 * POST /apps/:appId/platform-targets
 */
const createPlatformTargetHandler = (service: AppPlatformTargetService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      const { platform, target, isActive } = req.body;

      if (!platform || !target) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform/target', 'Platform and target are required')
        );
        return;
      }

      // Validate platform and target enums
      if (!Object.values(Platform).includes(platform as Platform)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', `Invalid platform. Must be one of: ${Object.values(Platform).join(', ')}`)
        );
        return;
      }

      if (!Object.values(Target).includes(target as Target)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('target', `Invalid target. Must be one of: ${Object.values(Target).join(', ')}`)
        );
        return;
      }

      const data: CreateAppPlatformTargetRequest = {
        appId,
        platform: platform as Platform,
        target: target as Target,
        isActive: isActive !== undefined ? isActive : true
      };

      const platformTarget = await service.createPlatformTarget(appId, data);

      res.status(HTTP_STATUS.CREATED).json(
        successResponse({ platformTarget }, 'Platform target created successfully')
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to create platform target')
      );
    }
  };

/**
 * Update a platform target
 * PATCH /apps/:appId/platform-targets/:platformTargetId
 */
const updatePlatformTargetHandler = (service: AppPlatformTargetService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, platformTargetId } = req.params;
      const { platform, target, isActive } = req.body;

      const updates: UpdateAppPlatformTargetRequest = {
        ...(platform !== undefined && { platform }),
        ...(target !== undefined && { target }),
        ...(isActive !== undefined && { isActive })
      };

      const updatedPlatformTarget = await service.updatePlatformTarget(
        appId,
        platformTargetId,
        updates
      );

      if (!updatedPlatformTarget) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Platform target')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse({ platformTarget: updatedPlatformTarget }, 'Platform target updated successfully')
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to update platform target')
      );
    }
  };

/**
 * Delete a platform target
 * DELETE /apps/:appId/platform-targets/:platformTargetId
 */
const deletePlatformTargetHandler = (service: AppPlatformTargetService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, platformTargetId } = req.params;

      const deleted = await service.deletePlatformTarget(appId, platformTargetId);

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Platform target')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(undefined, 'Platform target deleted successfully')
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to delete platform target')
      );
    }
  };

/**
 * Set platform target active/inactive
 * PATCH /apps/:appId/platform-targets/:platformTargetId/active
 */
const setPlatformTargetActiveHandler = (service: AppPlatformTargetService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, platformTargetId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('isActive', 'isActive must be a boolean')
        );
        return;
      }

      const updatedPlatformTarget = await service.setPlatformTargetActive(
        appId,
        platformTargetId,
        isActive
      );

      if (!updatedPlatformTarget) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Platform target')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse({ platformTarget: updatedPlatformTarget }, 'Platform target status updated successfully')
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to update platform target status')
      );
    }
  };

/**
 * Create and export controller
 */
export const createAppPlatformTargetController = (
  service: AppPlatformTargetService
) => ({
  configurePlatformTargets: configurePlatformTargetsHandler(service),
  getPlatformTargets: getPlatformTargetsHandler(service),
  getPlatformTargetsByPlatform: getPlatformTargetsByPlatformHandler(service),
  createPlatformTarget: createPlatformTargetHandler(service),
  updatePlatformTarget: updatePlatformTargetHandler(service),
  deletePlatformTarget: deletePlatformTargetHandler(service),
  setPlatformTargetActive: setPlatformTargetActiveHandler(service)
});

export type AppPlatformTargetController = ReturnType<typeof createAppPlatformTargetController>;
