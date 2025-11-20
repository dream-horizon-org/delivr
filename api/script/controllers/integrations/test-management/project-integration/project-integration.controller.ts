import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { TestManagementIntegrationService } from '~services/integrations/test-management/project-integration';
import type {
  CreateProjectTestManagementIntegrationDto,
  UpdateProjectTestManagementIntegrationDto
} from '~types/integrations/test-management/project-integration';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successMessageResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { TEST_MANAGEMENT_ERROR_MESSAGES, TEST_MANAGEMENT_SUCCESS_MESSAGES } from '../constants';
import { TEST_MANAGEMENT_PROVIDERS } from './project-integration.constants';
import {
  validateConfigStructure,
  validateIntegrationName,
  validateProviderType
} from './project-integration.validation';

interface AuthenticatedRequest extends Request {
  accountId?: string;
}

/**
 * Create new test management integration for a project
 * POST /projects/:projectId/integrations/test-management
 */
const createIntegrationHandler = (service: TestManagementIntegrationService) => 
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
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

      // Validate config structure (JSONB)
      const configError = validateConfigStructure(config, providerType);
      if (configError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('config', configError));
        return;
      }

      const data: CreateProjectTestManagementIntegrationDto = {
        projectId,
        name,
        providerType,
        config,
        createdByAccountId: req.accountId
      };

      const integration = await service.createProjectIntegration(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(integration));
    } catch (error) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.CREATE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * List all integrations for a project
 * GET /projects/:projectId/integrations/test-management
 */
const listIntegrationsHandler = (service: TestManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      const integrations = await service.listProjectIntegrations(projectId);

      res.status(HTTP_STATUS.OK).json(successResponse(integrations));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.LIST_INTEGRATIONS_FAILED)
      );
    }
  };

/**
 * Get single integration by ID
 * GET /projects/:projectId/integrations/test-management/:integrationId
 */
const getIntegrationHandler = (service: TestManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      const integration = await service.getProjectIntegration(integrationId);
      const integrationNotFound = !integration;

      if (integrationNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Test management integration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(integration));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.GET_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Update integration
 * PUT /projects/:projectId/integrations/test-management/:integrationId
 */
const updateIntegrationHandler = (service: TestManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;
      const { name, config } = req.body;

      // Validate name if provided
      if (name !== undefined) {
        const nameError = validateIntegrationName(name);
        if (nameError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('name', nameError));
          return;
        }
      }

      // Validate config if provided
      if (config !== undefined) {
        // Need to get existing integration to know the providerType
        const existing = await service.getProjectIntegration(integrationId);
        
        if (!existing) {
          res.status(HTTP_STATUS.NOT_FOUND).json(
            notFoundResponse('Test management integration')
          );
          return;
        }

        const configError = validateConfigStructure(config, existing.providerType);
        if (configError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('config', configError));
          return;
        }
      }

      const data: UpdateProjectTestManagementIntegrationDto = {
        name,
        config
      };

      const integration = await service.updateProjectIntegration(integrationId, data);
      
      if (!integration) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Test management integration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(integration));
    } catch (error) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.UPDATE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Delete integration (soft delete)
 * DELETE /projects/:projectId/integrations/test-management/:integrationId
 */
const deleteIntegrationHandler = (service: TestManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      const deleted = await service.deleteProjectIntegration(integrationId);
      const integrationNotFound = !deleted;

      if (integrationNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Test management integration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(TEST_MANAGEMENT_SUCCESS_MESSAGES.INTEGRATION_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.DELETE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Verify integration by testing connection
 * POST /projects/:projectId/integrations/test-management/:integrationId/verify
 */
const verifyIntegrationHandler = (service: TestManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      const result = await service.verifyProjectIntegration(integrationId);
      
      const isVerificationSuccessful = result.success;
      const statusCode = isVerificationSuccessful ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;

      res.status(statusCode).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.VERIFY_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Verify credentials without saving (stateless verification)
 * POST /integrations/test-management/verify
 */
const verifyCredentialsHandler = (service: TestManagementIntegrationService) =>
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

      const result = await service.verifyCredentials(providerType, config);
      
      const isVerificationSuccessful = result.success;
      const statusCode = isVerificationSuccessful ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST;

      res.status(statusCode).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.VERIFY_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Get list of available test management providers
 * GET /integrations/test-management/providers
 */
const getAvailableProvidersHandler = () =>
  async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(HTTP_STATUS.OK).json(successResponse(TEST_MANAGEMENT_PROVIDERS));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.FETCH_PROVIDERS_FAILED)
      );
    }
  };

export const createTestManagementIntegrationController = (service: TestManagementIntegrationService) => ({
  createIntegration: createIntegrationHandler(service),
  listIntegrations: listIntegrationsHandler(service),
  getIntegration: getIntegrationHandler(service),
  updateIntegration: updateIntegrationHandler(service),
  deleteIntegration: deleteIntegrationHandler(service),
  verifyIntegration: verifyIntegrationHandler(service),
  verifyCredentials: verifyCredentialsHandler(service),
  getAvailableProviders: getAvailableProvidersHandler()
});

