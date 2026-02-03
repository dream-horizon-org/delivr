import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ProjectManagementConfigService } from '~services/integrations/project-management';
import { PROJECT_MANAGEMENT_ERROR_MESSAGES, PROJECT_MANAGEMENT_SUCCESS_MESSAGES } from '~services/integrations/project-management';
import type {
  CreateProjectManagementConfigDto,
  UpdateProjectManagementConfigDto,
  PlatformConfiguration
} from '~types/integrations/project-management';
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
import {
  validateCreateConfig,
  validateUpdateConfig
} from './configuration.validation';
import { getStorage } from '~storage/storage-instance';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

/**
 * Create new project management configuration
 * POST /tenants/:tenantId/project-management/configs
 */
const createConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const { integrationId, name, description, platformConfigurations } = req.body;

      // Validate with Yup schema
      const validationResult = await validateCreateConfig({
        name,
        integrationId,
        platformConfigurations
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
      const integrationService = (storage as any).projectManagementIntegrationService;
      
      if (integrationService) {
        try {
          const integration = await integrationService.getIntegration(validated.integrationId);
          
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

      const data: CreateProjectManagementConfigDto = {
        tenantId,
        integrationId: validated.integrationId,
        name: validated.name,
        description,
        platformConfigurations: validated.platformConfigurations,
        createdByAccountId: req.user?.id
      };

      const config = await service.createConfig(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(config));
    } catch (error) {
      console.error('[Project Management] Failed to create config:', error);

      const message = error instanceof Error ? error.message : PROJECT_MANAGEMENT_ERROR_MESSAGES.CREATE_CONFIG_FAILED;
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_create_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
    }
  };

/**
 * List all configurations for a tenant
 * GET /tenants/:tenantId/project-management/configs
 */
const listConfigsHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      const configs = await service.listConfigsByProject(tenantId);

      res.status(HTTP_STATUS.OK).json(successResponse(configs));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list project management configurations';
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_list_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
    }
  };

/**
 * Get single configuration by ID
 * GET /tenants/:tenantId/project-management/configs/:configId
 */
const getConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const config = await service.getConfigById(configId);
      const configNotFound = !config;

      if (configNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Configuration', 'config_not_found')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get project management configuration';
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_fetch_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
    }
  };

/**
 * Update configuration
 * PUT /tenants/:tenantId/project-management/configs/:configId
 */
const updateConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;
      const { name, description, platformConfigurations, isActive } = req.body;

      // Validate with Yup schema
      const validationResult = await validateUpdateConfig({
        name,
        platformConfigurations
      });

      // If validation failed, send error response
      if (validationResult.success === false) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          buildValidationErrorResponse('Request validation failed', validationResult.errors)
        );
        return;
      }

      const validated = validationResult.data;

      const data: UpdateProjectManagementConfigDto = {
        name: validated.name,
        description,
        platformConfigurations: validated.platformConfigurations,
        isActive
      };

      const config = await service.updateConfig(configId, data);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Configuration', 'config_not_found')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      console.error('[Project Management] Failed to update config:', error);

      const message = error instanceof Error ? error.message : PROJECT_MANAGEMENT_ERROR_MESSAGES.UPDATE_CONFIG_FAILED;
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_update_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
    }
  };

/**
 * Delete configuration
 * DELETE /tenants/:tenantId/project-management/configs/:configId
 */
const deleteConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const deleted = await service.deleteConfig(configId);
      const configNotFound = !deleted;

      if (configNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Configuration', 'config_not_found')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(PROJECT_MANAGEMENT_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error) {
      console.error('[Project Management] Failed to delete config:', error);
      const message = error instanceof Error ? error.message : PROJECT_MANAGEMENT_ERROR_MESSAGES.DELETE_CONFIG_FAILED;
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_delete_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
    }
  };

/**
 * Verify configuration
 * POST /tenants/:tenantId/project-management/configs/:configId/verify
 */
const verifyConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const result = await service.verifyConfig(configId);

      res.status(HTTP_STATUS.OK).json(successResponse(result));
    } catch (error) {
      console.error('[Project Management] Failed to verify config:', error);
      const message = error instanceof Error ? error.message : PROJECT_MANAGEMENT_ERROR_MESSAGES.VERIFY_CONFIG_FAILED;
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_verify_failed';
      
      res.status(statusCode).json(
        detailedErrorResponse(message, errorCode, [message])
      );
    }
  };

/**
 * Create and export controller
 */
export const createProjectManagementConfigController = (
  service: ProjectManagementConfigService
) => ({
  createConfig: createConfigHandler(service),
  listConfigs: listConfigsHandler(service),
  getConfig: getConfigHandler(service),
  updateConfig: updateConfigHandler(service),
  deleteConfig: deleteConfigHandler(service),
  verifyConfig: verifyConfigHandler(service)
});

