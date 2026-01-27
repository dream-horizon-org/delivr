import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ProjectManagementIntegrationService } from '~services/integrations/project-management';
import { PROJECT_MANAGEMENT_ERROR_MESSAGES, PROJECT_MANAGEMENT_SUCCESS_MESSAGES } from '~services/integrations/project-management';
import type {
  CreateProjectManagementIntegrationDto,
  UpdateProjectManagementIntegrationDto
} from '~types/integrations/project-management';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successMessageResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { PROJECT_MANAGEMENT_PROVIDERS } from './integration.constants';
import {
  validateConfigStructure,
  validatePartialConfigStructure,
  validateIntegrationName,
  validateProviderType
} from './integration.validation';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

/**
 * Mask sensitive data in config for API responses
 * Replaces apiToken with masked version
 */
function maskSensitiveConfig(integration: any): any {
  if (!integration?.config?.apiToken) {
    return integration;
  }
  
  return {
    ...integration,
    config: {
      ...integration.config,
      apiToken: '***' + integration.config.apiToken.slice(-4) // Show last 4 chars only
    }
  };
}

/**
 * Get available providers
 * GET /integrations/project-management/providers
 */
const getAvailableProvidersHandler = () =>
  async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(HTTP_STATUS.OK).json(
        successResponse({
          providers: PROJECT_MANAGEMENT_PROVIDERS
        })
      );
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        errorResponse(error, 'Failed to get available providers')
      );
    }
  };

/**
 * Create new project management integration for a tenant
 * POST /apps/:appId/integrations/project-management
 */
const createIntegrationHandler = (service: ProjectManagementIntegrationService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      const { name, providerType, config } = req.body;

      // Validate name
      const nameError = validateIntegrationName(name);
      if (nameError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('name', nameError));
        return;
      }

      // Validate providerType
      const providerTypeError = validateProviderType(providerType);
      if (providerTypeError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('providerType', providerTypeError)
        );
        return;
      }

      // Validate config structure
      const configError = validateConfigStructure(config, providerType);
      if (configError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('config', configError));
        return;
      }

      const data: CreateProjectManagementIntegrationDto = {
        appId,
        name,
        providerType,
        config,
        createdByAccountId: req.user?.id
      };

      const integration = await service.createIntegration(data);

      // Mask sensitive data in response
      res.status(HTTP_STATUS.CREATED).json(successResponse(maskSensitiveConfig(integration)));
    } catch (error) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.CREATE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * List all integrations for a tenant
 * GET /apps/:appId/integrations/project-management
 */
const listIntegrationsHandler = (service: ProjectManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;

      const integrations = await service.listIntegrations(appId);

      // Mask sensitive data in all integrations
      const maskedIntegrations = integrations.map(maskSensitiveConfig);
      res.status(HTTP_STATUS.OK).json(successResponse(maskedIntegrations));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to list project management integrations')
      );
    }
  };

/**
 * Get single integration by ID
 * GET /apps/:appId/integrations/project-management/:integrationId
 */
const getIntegrationHandler = (service: ProjectManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      const integration = await service.getIntegration(integrationId);
      const integrationNotFound = !integration;

      if (integrationNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Project management integration')
        );
        return;
      }

      // Mask sensitive data in response
      res.status(HTTP_STATUS.OK).json(successResponse(maskSensitiveConfig(integration)));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to get project management integration')
      );
    }
  };

/**
 * Update integration
 * PUT /apps/:appId/integrations/project-management/:integrationId
 */
const updateIntegrationHandler = (service: ProjectManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;
      const { name, config, isEnabled } = req.body;

      // Validate name if provided
      if (name !== undefined) {
        const nameError = validateIntegrationName(name);
        if (nameError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('name', nameError));
          return;
        }
      }

      // Validate config if provided (partial update - only validate fields present)
      if (config !== undefined) {
        const existing = await service.getIntegration(integrationId);

        if (!existing) {
          res.status(HTTP_STATUS.NOT_FOUND).json(
            notFoundResponse('Project management integration')
          );
          return;
        }

        const configError = validatePartialConfigStructure(config, existing.providerType);
        if (configError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('config', configError));
          return;
        }
      }

      const data: UpdateProjectManagementIntegrationDto = {
        name,
        config,
        isEnabled
      };

      const integration = await service.updateIntegration(integrationId, data);

      if (!integration) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Project management integration')
        );
        return;
      }

      // Mask sensitive data in response
      res.status(HTTP_STATUS.OK).json(successResponse(maskSensitiveConfig(integration)));
    } catch (error) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.UPDATE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Delete integration
 * DELETE /apps/:appId/integrations/project-management/:integrationId
 */
const deleteIntegrationHandler = (service: ProjectManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      const deleted = await service.deleteIntegration(integrationId);
      const integrationNotFound = !deleted;

      if (integrationNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Project management integration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(PROJECT_MANAGEMENT_SUCCESS_MESSAGES.INTEGRATION_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.DELETE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Verify credentials without saving (stateless verification)
 * POST /apps/:appId/integrations/project-management/verify
 */
const verifyCredentialsHandler = (_service: ProjectManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerType, config } = req.body;

      // Validate providerType
      const providerTypeError = validateProviderType(providerType);
      if (providerTypeError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('providerType', providerTypeError)
        );
        return;
      }

      // Validate config structure
      const configError = validateConfigStructure(config, providerType);
      if (configError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('config', configError));
        return;
      }

      // Use ProviderFactory to validate config
      const { ProviderFactory } = await import('~services/integrations/project-management/providers');
      const provider = ProviderFactory.getProvider(providerType);
      const isValid = await provider.validateConfig(config);

      res.status(HTTP_STATUS.OK).json(
        successResponse({
          success: isValid,
          verified: isValid,
          message: isValid ? 'Credentials are valid' : 'Credentials are invalid'
        })
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.VERIFY_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Verify integration
 * POST /apps/:appId/integrations/project-management/:integrationId/verify
 */
const verifyIntegrationHandler = (service: ProjectManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      const result = await service.verifyIntegration(integrationId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(successResponse(result));
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(result.message, result.message));
      }
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.VERIFY_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Create and export controller
 */
export const createProjectManagementIntegrationController = (
  service: ProjectManagementIntegrationService
) => ({
  getAvailableProviders: getAvailableProvidersHandler(),
  createIntegration: createIntegrationHandler(service),
  listIntegrations: listIntegrationsHandler(service),
  getIntegration: getIntegrationHandler(service),
  updateIntegration: updateIntegrationHandler(service),
  deleteIntegration: deleteIntegrationHandler(service),
  verifyCredentials: verifyCredentialsHandler(service),
  verifyIntegration: verifyIntegrationHandler(service)
});

