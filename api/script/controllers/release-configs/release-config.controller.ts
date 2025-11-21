/**
 * Release Config Controller
 * HTTP handlers for release configuration endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ReleaseConfigService } from '~services/release-configs';
import type { CreateReleaseConfigRequest, CreateReleaseConfigDto, SafeReleaseConfiguration } from '~types/release-configs';
import { errorResponse, getErrorStatusCode, notFoundResponse, successResponse, validationErrorResponse } from '~utils/response.utils';
import { RELEASE_CONFIG_ERROR_MESSAGES, RELEASE_CONFIG_SUCCESS_MESSAGES } from './constants';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';
import type { ReleaseConfiguration } from '~types/release-configs';

type AuthenticatedRequest = Request & {
  accountId?: string;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert ReleaseConfiguration to SafeReleaseConfiguration (metadata only)
 */
const toSafeConfig = (config: ReleaseConfiguration): SafeReleaseConfiguration => {
  return {
    id: config.id,
    tenantId: config.tenantId,
    name: config.name,
    description: config.description,
    releaseType: config.releaseType,
    targets: config.targets,
    isActive: config.isActive,
    isDefault: config.isDefault,
    createdBy: {
      id: config.createdByAccountId
    },
    createdAt: config.createdAt instanceof Date ? config.createdAt.toISOString() : new Date(config.createdAt).toISOString(),
    updatedAt: config.updatedAt instanceof Date ? config.updatedAt.toISOString() : new Date(config.updatedAt).toISOString()
  };
};

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Handler: Create release config
 */
const createConfigHandler = (service: ReleaseConfigService, testManagementConfigService?: TestManagementConfigService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const requestBody: CreateReleaseConfigRequest = req.body;
      const { tenantId } = req.params;
      const currentUserId = req.accountId || 'default-user';

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

      if (!requestBody.defaultTargets || !Array.isArray(requestBody.defaultTargets)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('defaultTargets', 'Default targets must be an array')
        );
        return;
      }

      // ========================================================================
      // STEP 1: Create release config with integration orchestration
      // ========================================================================

      const result = await service.createConfig(requestBody, currentUserId);
      
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

      const safeConfig = toSafeConfig(result.data);
      res.status(HTTP_STATUS.CREATED).json(
        successResponse(safeConfig, RELEASE_CONFIG_SUCCESS_MESSAGES.CONFIG_CREATED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.CREATE_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: Get config by ID
 */
const getConfigByIdHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const config = await service.getConfigById(configId);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Release configuration')
        );
        return;
      }

      const safeConfig = toSafeConfig(config);
      res.status(HTTP_STATUS.OK).json(successResponse(safeConfig));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.GET_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: List configs by tenant
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

      const configs = await service.listConfigsByTenant(tenantId);
      const safeConfigs = configs.map(toSafeConfig);

      res.status(HTTP_STATUS.OK).json(successResponse(safeConfigs));
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
      const updateData = req.body;

      const config = await service.updateConfig(configId, updateData);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Release configuration')
        );
        return;
      }

      const safeConfig = toSafeConfig(config);
      res.status(HTTP_STATUS.OK).json(
        successResponse(safeConfig, RELEASE_CONFIG_SUCCESS_MESSAGES.CONFIG_UPDATED)
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
 * Factory: Create controller with all handlers
 */
export const createReleaseConfigController = (
  service: ReleaseConfigService,
  testManagementConfigService?: TestManagementConfigService
) => ({
  createConfig: createConfigHandler(service, testManagementConfigService),
  getConfigById: getConfigByIdHandler(service),
  listConfigsByTenant: listConfigsByTenantHandler(service),
  updateConfig: updateConfigHandler(service),
  deleteConfig: deleteConfigHandler(service)
});

