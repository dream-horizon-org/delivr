/**
 * Test Management Config Controller
 * HTTP handlers for test management configuration endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';
import type { CreateTestManagementConfigDto, UpdateTestManagementConfigDto, PlatformConfiguration } from '~types/integrations/test-management/test-management-config';
import {
  getErrorStatusCode,
  successMessageResponse,
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  simpleErrorResponse,
  detailedErrorResponse,
  buildValidationErrorResponse
} from '~utils/response.utils';
import { hasErrorCode } from '~utils/error.utils';
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

      // Validate with Yup schema
      const validationResult = await validateCreateConfig({
        tenantId,
        ...req.body
      });

      // If validation failed, send error response
      if (validationResult.success === false) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          buildValidationErrorResponse('Request validation failed', validationResult.errors)
        );
        return;
      }

      const validated = validationResult.data;

      // Check integration existence and enabled state
      const storage = getStorage();
      const integrationService = (storage as any).testManagementIntegrationService;
      
      if (integrationService) {
        try {
          const integration = await integrationService.getIntegrationById(validated.integrationId);
          
          if (!integration) {
            res.status(HTTP_STATUS.NOT_FOUND).json(
              notFoundResponse('Integration', 'integration_not_found')
            );
            return;
          }
          
          // Check if integration belongs to tenant
          if (integration.tenantId !== tenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json(
              forbiddenResponse('Integration does not belong to this tenant', 'integration_access_denied')
            );
            return;
          }
          
          // Check if integration is enabled
          if (integration.isEnabled === false) {
            res.status(HTTP_STATUS.BAD_REQUEST).json(
              simpleErrorResponse('Enable the integration before creating configurations', 'integration_disabled')
            );
            return;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to verify integration';
          const errorCode = hasErrorCode(error) ? error.code : 'integration_verification_failed';
          
          res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
            detailedErrorResponse(message, errorCode, [message])
          );
          return;
        }
      }

      const data: CreateTestManagementConfigDto = {
        tenantId: validated.tenantId,
        integrationId: validated.integrationId,
        name: validated.name,
        passThresholdPercent: validated.passThresholdPercent,
        platformConfigurations: validated.platformConfigurations,
        createdByAccountId: req.user?.id
      };

      const config = await service.createConfig(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(config));
    } catch (error) {
      console.error('[Test Management] Failed to create config:', error);

      const message = error instanceof Error ? error.message : TEST_MANAGEMENT_ERROR_MESSAGES.CREATE_CONFIG_FAILED;
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_create_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
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
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Configuration', 'config_not_found')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      const message = error instanceof Error ? error.message : TEST_MANAGEMENT_ERROR_MESSAGES.GET_CONFIG_FAILED;
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_fetch_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
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
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          simpleErrorResponse(tenantIdError, 'invalid_tenant_id')
        );
        return;
      }

      const configs = await service.listConfigsByTenant(tenantId);

      res.status(HTTP_STATUS.OK).json(successResponse(configs));
    } catch (error) {
      const message = error instanceof Error ? error.message : TEST_MANAGEMENT_ERROR_MESSAGES.LIST_CONFIGS_FAILED;
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_list_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
    }
  };

/**
 * Handler: Update config
 */
const updateConfigHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Validate with Yup schema
      const validationResult = await validateUpdateConfig(req.body);

      // If validation failed, send error response
      if (validationResult.success === false) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          buildValidationErrorResponse('Request validation failed', validationResult.errors)
        );
        return;
      }

      const validated = validationResult.data;

      // Build update DTO from validated data
      const updateData: UpdateTestManagementConfigDto = {
        name: validated.name,
        passThresholdPercent: validated.passThresholdPercent,
        platformConfigurations: validated.platformConfigurations
      };

      const config = await service.updateConfig(id, updateData);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Configuration', 'config_not_found')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      console.error('[Test Management] Failed to update config:', error);

      const message = error instanceof Error ? error.message : TEST_MANAGEMENT_ERROR_MESSAGES.UPDATE_CONFIG_FAILED;
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_update_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
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
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Configuration', 'config_not_found')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(TEST_MANAGEMENT_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : TEST_MANAGEMENT_ERROR_MESSAGES.DELETE_CONFIG_FAILED;
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_delete_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
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

