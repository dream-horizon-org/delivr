import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { TestManagementIntegrationService } from '~services/integrations/test-management/tenant-integration';
import { CreateTenantTestManagementIntegrationDto, UpdateTenantTestManagementIntegrationDto } from '~types/integrations/test-management/tenant-integration';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successMessageResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { TEST_MANAGEMENT_ERROR_MESSAGES, TEST_MANAGEMENT_SUCCESS_MESSAGES } from '../constants';
import { TEST_MANAGEMENT_PROVIDERS } from './tenant-integration.constants';
import {
  validateConfigStructure,
  validatePartialConfigStructure,
  validateIntegrationName,
  validateProviderType,
  validateVerifyRequest,
  validateCheckmateConfig,
  validateCheckmateUpdateConfig
} from './tenant-integration.validation';
import { TestManagementProviderType } from '~types/integrations/test-management';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

/**
 * Create new test management integration for a tenant
 * 
 * @route POST /tenants/:tenantId/integrations/test-management
 * @param {string} req.params.tenantId - Tenant identifier
 * @param {string} req.body.name - Integration name (e.g., "Checkmate Production")
 * @param {string} req.body.providerType - Provider type (checkmate, testrail, etc.)
 * @param {object} req.body.config - Provider-specific configuration (baseUrl, authToken, etc.)
 * @returns {201} Success - Integration created
 * @returns {400} Bad Request - Validation error or creation failure
 */
const createIntegrationHandler = (service: TestManagementIntegrationService) => 
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
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

      // Validate config structure for CHECKMATE (Yup validation)
      // TODO: Implement Yup validation for TESTRAIL and other providers
      let validatedConfig = config;
      if (providerType === TestManagementProviderType.CHECKMATE) {
        const validated = await validateCheckmateConfig(config, res);
        if (!validated) {
          return; // Response already sent by validation function
        }
        validatedConfig = validated;
      }

      // Config validation (connection test) happens in service layer
      const data: CreateTenantTestManagementIntegrationDto = {
        tenantId,
        name,
        providerType,
        config: validatedConfig,
        createdByAccountId: req.user?.id
      };

      const integration = await service.createTenantIntegration(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(integration));
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || TEST_MANAGEMENT_ERROR_MESSAGES.CREATE_INTEGRATION_FAILED,
        ...(error.details && { details: error.details })
      });
    }
  };

/**
 * List all integrations for a tenant
 * 
 * @route GET /tenants/:tenantId/integrations/test-management
 * @param {string} req.params.tenantId - Tenant identifier
 * @returns {200} Success - Array of integrations (credentials redacted)
 * @returns {500} Server Error - Failed to fetch integrations
 */
const listIntegrationsHandler = (service: TestManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      const integrations = await service.listTenantIntegrations(tenantId);

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
 * 
 * @route GET /tenants/:tenantId/integrations/test-management/:integrationId
 * @param {string} req.params.integrationId - Integration identifier
 * @returns {200} Success - Integration details (credentials redacted)
 * @returns {404} Not Found - Integration doesn't exist
 * @returns {500} Server Error - Failed to fetch integration
 */
const getIntegrationHandler = (service: TestManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      const integration = await service.getTenantIntegration(integrationId);
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
 * 
 * @route PUT /tenants/:tenantId/integrations/test-management/:integrationId
 * @param {string} req.params.integrationId - Integration identifier
 * @param {string} [req.body.name] - Updated integration name (optional)
 * @param {object} [req.body.config] - Updated configuration (optional, merged with existing)
 * @returns {200} Success - Updated integration
 * @returns {400} Bad Request - Validation error
 * @returns {404} Not Found - Integration doesn't exist
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

      // Validate config if provided (partial update - only validate fields present)
      if (config !== undefined) {
        // Need to get existing integration to know the providerType
        const existing = await service.getTenantIntegration(integrationId);
        
        if (!existing) {
          res.status(HTTP_STATUS.NOT_FOUND).json(
            notFoundResponse('Test management integration')
          );
          return;
        }

        // Use Yup validation for Checkmate
        // TODO: Implement Yup validation for TESTRAIL and other providers
        if (existing.providerType === TestManagementProviderType.CHECKMATE) {
          const validated = await validateCheckmateUpdateConfig(config, res);
          if (!validated) {
            return; // Response already sent by validation function
          }
          // Replace config with validated (trimmed, transformed) data
          req.body.config = validated;
        } else {
          // Fallback validation for non-Checkmate providers (not implemented yet)
          const configError = validatePartialConfigStructure(config, existing.providerType);
          if (configError) {
            res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('config', configError));
            return;
          }
        }
      }

      const data: UpdateTenantTestManagementIntegrationDto = {
        name,
        config
      };

      const integration = await service.updateTenantIntegration(integrationId, data);
      
      if (!integration) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Test management integration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(integration));
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || TEST_MANAGEMENT_ERROR_MESSAGES.UPDATE_INTEGRATION_FAILED,
        ...(error.details && { details: error.details })
      });
    }
  };

/**
 * Delete integration
 * 
 * @route DELETE /tenants/:tenantId/integrations/test-management/:integrationId
 * @param {string} req.params.integrationId - Integration identifier
 * @returns {200} Success - Integration deleted
 * @returns {404} Not Found - Integration doesn't exist
 * @returns {500} Server Error - Failed to delete integration
 */
const deleteIntegrationHandler = (service: TestManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      const deleted = await service.deleteTenantIntegration(integrationId);
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
 * 
 * @route POST /tenants/:tenantId/integrations/test-management/:integrationId/verify
 * @param {string} req.params.integrationId - Integration identifier
 * @returns {200} Success - { success: boolean, message: string } (always 200, check success field)
 * @returns {500} Server Error - Failed to verify (network/system error)
 * @description Returns 200 OK even if credentials are invalid. Check result.success for actual verification status.
 */
const verifyIntegrationHandler = (service: TestManagementIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      const result = await service.verifyTenantIntegration(integrationId);
      
      // Always return 200 OK - the HTTP status indicates the API call succeeded,
      // not whether credentials are valid. Credential validity is in result.success.
      res.status(HTTP_STATUS.OK).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.VERIFY_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Verify credentials without saving (stateless verification)
 * 
 * @route POST /integrations/test-management/verify
 * @param {string} req.body.providerType - Provider type to verify
 * @param {object} req.body.config - Provider configuration to test
 * @returns {200} Success - { success: boolean, message: string } (always 200, check success field)
 * @returns {400} Bad Request - Invalid provider type or config structure
 * @returns {500} Server Error - Failed to verify (network/system error)
 * @description Tests credentials before saving. Useful for "Test Connection" button in UI.
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

      // Unified validation (handles CHECKMATE Yup and others manual validation internally)
      const validated = await validateVerifyRequest(req.body, providerType as TestManagementProviderType, res);
      if (!validated) {
        return; // Response already sent by validation function
      }

      const result = await service.verifyCredentials(providerType, validated.config);
      
      // Return proper status codes based on verification result
      if (result.success) {
        res.status(HTTP_STATUS.OK).json({
          success: true,
          verified: true,
          message: result.message,
          ...(result.details && { details: result.details })
        });
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          verified: false,
          error: result.message,
          ...(result.details && { details: result.details })
        });
      }
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        verified: false,
        error: error.message || TEST_MANAGEMENT_ERROR_MESSAGES.VERIFY_INTEGRATION_FAILED,
        ...(error.details && { details: error.details })
      });
    }
  };

/**
 * Get list of available test management providers
 * 
 * @route GET /integrations/test-management/providers
 * @returns {200} Success - Array of providers with type, name, description, enabled, status, features
 * @returns {500} Server Error - Failed to fetch providers
 * @description Returns all available providers including those not yet implemented (status: "coming_soon")
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

