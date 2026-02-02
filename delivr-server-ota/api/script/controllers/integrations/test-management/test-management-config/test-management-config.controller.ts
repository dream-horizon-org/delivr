/**
 * Test Management Config Controller
 * HTTP handlers for test management configuration endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';
import type { CreateTestManagementConfigDto, UpdateTestManagementConfigDto } from '~types/integrations/test-management/test-management-config';
import { getErrorStatusCode, successMessageResponse, successResponse } from '~utils/response.utils';
import { TEST_MANAGEMENT_ERROR_MESSAGES, TEST_MANAGEMENT_SUCCESS_MESSAGES } from '../constants';
import {
  validateTenantId,
  validateCreateConfig,
  validateUpdateConfig
} from './test-management-config.validation';
import { getStorage } from '~storage/storage-instance';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

/**
 * Handler: Create test management config
 * POST /test-management/tenants/:tenantId/configs
 */
const createConfigHandler = (service: TestManagementConfigService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      // Validate with Yup schema - sends error response automatically if validation fails
      const validated = await validateCreateConfig({
        tenantId,
        ...req.body
      }, res);

      // If validation failed, response already sent
      if (!validated) {
        return;
      }

      // Check integration existence and enabled state
      const storage = getStorage();
      const integrationService = (storage as any).testManagementIntegrationService;
      
      if (integrationService) {
        try {
          const integration = await integrationService.getIntegrationById(validated.integrationId);
          
          if (!integration) {
            res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'Integration not found',
              details: {
                errorCode: 'integration_not_found',
                message: 'The specified integration does not exist'
              }
            });
            return;
          }
          
          // Check if integration belongs to tenant
          if (integration.tenantId !== tenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Access denied',
              details: {
                errorCode: 'integration_access_denied',
                message: 'Integration does not belong to this tenant'
              }
            });
            return;
          }
          
          // Check if integration is enabled
          if (integration.isEnabled === false) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              error: 'Integration is disabled',
              details: {
                errorCode: 'integration_disabled',
                message: 'Enable the integration before creating configurations'
              }
            });
            return;
          }
        } catch (error: any) {
          res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to verify integration',
            details: {
              errorCode: 'integration_verification_failed',
              message: error.message || 'An error occurred while verifying the integration'
            }
          });
          return;
        }
      }

      const data: CreateTestManagementConfigDto = {
        tenantId: validated.tenantId,
        integrationId: validated.integrationId,
        name: validated.name,
        passThresholdPercent: validated.passThresholdPercent,
        platformConfigurations: validated.platformConfigurations as any,
        createdByAccountId: req.user?.id
      };

      const config = await service.createConfig(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(config));
    } catch (error: any) {
      console.error('[Test Management] Failed to create config:', error);

      // Handle errors with proper status code
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || TEST_MANAGEMENT_ERROR_MESSAGES.CREATE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_create_failed',
          message: error.message || 'An unexpected error occurred while creating the configuration'
        }
      });
    }
  };

/**
 * Handler: Get config by ID
 */
const getConfigByIdHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const config = await service.getConfigById(id);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested test management configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || TEST_MANAGEMENT_ERROR_MESSAGES.GET_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_fetch_failed',
          message: error.message || 'An unexpected error occurred while fetching the configuration'
        }
      });
    }
  };

/**
 * Handler: List configs by tenant
 * GET /test-management/tenants/:tenantId/configs
 */
const listConfigsByTenantHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      const tenantIdError = validateTenantId(tenantId);
      if (tenantIdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: tenantIdError,
          details: {
            errorCode: 'invalid_tenant_id',
            message: tenantIdError
          }
        });
        return;
      }

      const configs = await service.listConfigsByTenant(tenantId);

      res.status(HTTP_STATUS.OK).json(successResponse(configs));
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || TEST_MANAGEMENT_ERROR_MESSAGES.LIST_CONFIGS_FAILED,
        details: {
          errorCode: error.code || 'config_list_failed',
          message: error.message || 'An unexpected error occurred while listing configurations'
        }
      });
    }
  };

/**
 * Handler: Update config
 */
const updateConfigHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Validate with Yup schema - sends error response automatically if validation fails
      const validated = await validateUpdateConfig(req.body, res);

      // If validation failed, response already sent
      if (!validated) {
        return;
      }

      // Build update DTO from validated data
      const updateData: UpdateTestManagementConfigDto = {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.passThresholdPercent !== undefined && { passThresholdPercent: validated.passThresholdPercent }),
        ...(validated.platformConfigurations !== undefined && { platformConfigurations: validated.platformConfigurations as any })
      };

      const config = await service.updateConfig(id, updateData);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested test management configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error: any) {
      console.error('[Test Management] Failed to update config:', error);

      // Handle errors with proper status code
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || TEST_MANAGEMENT_ERROR_MESSAGES.UPDATE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_update_failed',
          message: error.message || 'An unexpected error occurred while updating the configuration'
        }
      });
    }
  };

/**
 * Handler: Delete config
 */
const deleteConfigHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const deleted = await service.deleteConfig(id);

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested test management configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(TEST_MANAGEMENT_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || TEST_MANAGEMENT_ERROR_MESSAGES.DELETE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_delete_failed',
          message: error.message || 'An unexpected error occurred while deleting the configuration'
        }
      });
    }
  };

/**
 * Factory: Create controller with all handlers
 */
export const createTestManagementConfigController = (service: TestManagementConfigService) => ({
  createConfig: createConfigHandler(service),
  getConfigById: getConfigByIdHandler(service),
  listConfigsByTenant: listConfigsByTenantHandler(service),
  updateConfig: updateConfigHandler(service),
  deleteConfig: deleteConfigHandler(service)
});

