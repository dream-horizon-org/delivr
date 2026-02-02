import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ProjectManagementConfigService } from '~services/integrations/project-management';
import { PROJECT_MANAGEMENT_ERROR_MESSAGES, PROJECT_MANAGEMENT_SUCCESS_MESSAGES } from '~services/integrations/project-management';
import type {
  CreateProjectManagementConfigDto,
  UpdateProjectManagementConfigDto
} from '~types/integrations/project-management';
import {
  getErrorStatusCode,
  successMessageResponse,
  successResponse
} from '~utils/response.utils';
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
      const validated = await validateCreateConfig({
        name,
        integrationId,
        platformConfigurations
      }, res);

      // If validation failed, response already sent
      if (!validated) {
        return;
      }

      // Check integration existence and enabled state
      const storage = getStorage();
      const integrationService = (storage as any).projectManagementIntegrationService;
      
      if (integrationService) {
        try {
          const integration = await integrationService.getIntegration(validated.integrationId);
          
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

      const data: CreateProjectManagementConfigDto = {
        tenantId,
        integrationId: validated.integrationId,
        name: validated.name,
        description,
        platformConfigurations: validated.platformConfigurations as any,
        createdByAccountId: req.user?.id
      };

      const config = await service.createConfig(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(config));
    } catch (error: any) {
      console.error('[Project Management] Failed to create config:', error);

      // Handle errors with proper status code
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || PROJECT_MANAGEMENT_ERROR_MESSAGES.CREATE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_create_failed',
          message: error.message || 'An unexpected error occurred while creating the configuration'
        }
      });
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
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to list project management configurations',
        details: {
          errorCode: error.code || 'config_list_failed',
          message: error.message || 'An unexpected error occurred while listing configurations'
        }
      });
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
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested project management configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to get project management configuration',
        details: {
          errorCode: error.code || 'config_fetch_failed',
          message: error.message || 'An unexpected error occurred while fetching the configuration'
        }
      });
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
      const validated = await validateUpdateConfig({
        name,
        platformConfigurations
      }, res);

      // If validation failed, response already sent
      if (!validated) {
        return;
      }

      const data: UpdateProjectManagementConfigDto = {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(description !== undefined && { description }),
        ...(validated.platformConfigurations !== undefined && { platformConfigurations: validated.platformConfigurations as any }),
        ...(isActive !== undefined && { isActive })
      };

      const config = await service.updateConfig(configId, data);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested project management configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error: any) {
      console.error('[Project Management] Failed to update config:', error);

      // Handle errors with proper status code
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || PROJECT_MANAGEMENT_ERROR_MESSAGES.UPDATE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_update_failed',
          message: error.message || 'An unexpected error occurred while updating the configuration'
        }
      });
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
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested project management configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(PROJECT_MANAGEMENT_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error: any) {
      console.error('[Project Management] Failed to delete config:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || PROJECT_MANAGEMENT_ERROR_MESSAGES.DELETE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_delete_failed',
          message: error.message || 'An unexpected error occurred while deleting the configuration'
        }
      });
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
    } catch (error: any) {
      console.error('[Project Management] Failed to verify config:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || PROJECT_MANAGEMENT_ERROR_MESSAGES.VERIFY_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_verify_failed',
          message: error.message || 'An unexpected error occurred while verifying the configuration'
        }
      });
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

