/**
 * Release Config Controller
 * HTTP handlers for release configuration endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ReleaseConfigService } from '~services/release-configs';
import type { ReleaseConfigActivityLogService } from '~services/release-configs';
import type { CreateReleaseConfigRequest } from '~types/release-configs';
import { errorResponse, getErrorStatusCode, notFoundResponse, successResponse, validationErrorResponse } from '~utils/response.utils';
import { RELEASE_CONFIG_ERROR_MESSAGES, RELEASE_CONFIG_SUCCESS_MESSAGES } from './constants';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
};

// ============================================================================
// HANDLERS
// ============================================================================
// NOTE: All handlers return VERBOSE format (no more "safe" format)
// Verbose format includes full nested integration config objects

/**
 * Handler: Create release config
 */
const createConfigHandler = (service: ReleaseConfigService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const requestBody: CreateReleaseConfigRequest = req.body;
      const { tenantId } = req.params;
      const currentUserId = req.user?.id || 'default-user';

      // Validate required fields
      if (!requestBody.name) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('name', 'Configuration name is required')
        );
        return;
      }

      if (!requestBody.releaseType) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('releaseType', 'Release type is required')
        );
        return;
      }

      if (!requestBody.platformTargets || !Array.isArray(requestBody.platformTargets) || requestBody.platformTargets.length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platformTargets', 'platformTargets must be a non-empty array')
        );
        return;
      }

      // Validate each platform-target pair
      const validPlatforms = ['IOS', 'ANDROID', 'WEB'];
      const validTargets = ['WEB', 'PLAY_STORE', 'APP_STORE'];
      
      for (const pt of requestBody.platformTargets) {
        if (!pt.platform || !pt.target) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('platformTargets', 'Each platformTarget must have platform and target fields')
          );
          return;
        }

        if (!validPlatforms.includes(pt.platform)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('platformTargets', `Invalid platform: ${pt.platform}. Must be one of: ${validPlatforms.join(', ')}`)
          );
          return;
        }

        if (!validTargets.includes(pt.target)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('platformTargets', `Invalid target: ${pt.target}. Must be one of: ${validTargets.join(', ')}`)
          );
          return;
        }
      }

      // ========================================================================
      // STEP 1: Create release config with integration orchestration
      // ========================================================================

      // Override body's tenantId with URL param (security: prevent tenant spoofing)
      const requestWithTenant = { ...requestBody, tenantId };
      const result = await service.createConfig(requestWithTenant, currentUserId);
      
      if (!result.success) {
        const errorResult = result as { success: false; error: any };
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: errorResult.error.message,
          code: errorResult.error.code,
          details: errorResult.error.details
        });
        return;
      }

      // Return verbose format to match GET and UPDATE responses
      const verboseConfig = await service.getConfigByIdVerbose(result.data.id);
      res.status(HTTP_STATUS.CREATED).json(
        successResponse(verboseConfig, RELEASE_CONFIG_SUCCESS_MESSAGES.CONFIG_CREATED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.CREATE_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: Get config by ID (with verbose integration data)
 */
const getConfigByIdHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const config = await service.getConfigByIdVerbose(configId);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Release configuration')
        );
        return;
      }

      // For verbose response, we don't use toSafeConfig as we want full nested objects
      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.GET_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: List configs by tenant (verbose format)
 */
const listConfigsByTenantHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('tenantId', 'tenantId parameter is required')
        );
        return;
      }

      // Return verbose format to match other endpoints
      const verboseConfigs = await service.listConfigsByTenantVerbose(tenantId);

      res.status(HTTP_STATUS.OK).json(successResponse(verboseConfigs));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.LIST_CONFIGS_FAILED)
      );
    }
  };

/**
 * Handler: Update config
 */
const updateConfigHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;
      // Strip tenantId from update data - configs cannot change tenant (defense in depth)
      const { tenantId: _ignoredTenantId, ...updateData } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(new Error('User ID not found'), 'Authentication required')
        );
        return;
      }

      // Update returns the basic config, but we need to return verbose format
      const config = await service.updateConfig(configId, updateData, currentUserId);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Release configuration')
        );
        return;
      }

      // Fetch the verbose version to match GET format
      const verboseConfig = await service.getConfigByIdVerbose(configId);

      res.status(HTTP_STATUS.OK).json(
        successResponse(verboseConfig, RELEASE_CONFIG_SUCCESS_MESSAGES.CONFIG_UPDATED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.UPDATE_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: Delete config
 */
/**
 * Handler: Delete config (HARD DELETE)
 * Permanently removes the config from the database
 */
const deleteConfigHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const deleted = await service.deleteConfig(configId);

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Release configuration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(undefined, RELEASE_CONFIG_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.DELETE_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: Get activity logs for a release config
 */
const getActivityLogsHandler = (activityLogService: ReleaseConfigActivityLogService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      if (!configId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('configId', 'configId is required')
        );
        return;
      }

      // Delegate to activity log service directly
      const logs = await activityLogService.getActivityLogs(configId);

      res.status(HTTP_STATUS.OK).json(
        successResponse(logs)
      );
    } catch (error) {
      console.error('[Get Activity Logs] Error:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.GET_CONFIG_FAILED)
      );
    }
  };

/**
 * Factory: Create controller with all handlers
 */
export const createReleaseConfigController = (
  service: ReleaseConfigService,
  activityLogService: ReleaseConfigActivityLogService
) => ({
  createConfig: createConfigHandler(service),
  getConfigById: getConfigByIdHandler(service),
  listConfigsByTenant: listConfigsByTenantHandler(service),
  updateConfig: updateConfigHandler(service),
  deleteConfig: deleteConfigHandler(service),
  getActivityLogs: getActivityLogsHandler(activityLogService)
});

