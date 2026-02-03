/**
 * Slack Integration Controller
 * HTTP handlers for integration management endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { CommIntegrationService } from '~services/integrations/comm/comm-integration';
import type { CreateOrUpdateIntegrationDto, UpdateSlackIntegrationDto } from '~types/integrations/comm';
import { CommType } from '~services/integrations/comm';
import { CommunicationType } from '~types/integrations/comm';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successMessageResponse,
  successResponse,
  validationErrorResponse,
  detailedErrorResponse,
  forbiddenResponse,
  buildValidationErrorResponse
} from '~utils/response.utils';
import { hasErrorCode } from '~utils/error.utils';
import { decryptIfEncrypted, decryptFields, encryptForStorage, decryptFromStorage, isBackendEncrypted } from '~utils/encryption';
import { 
  COMM_INTEGRATION_ERROR_MESSAGES, 
  COMM_INTEGRATION_SUCCESS_MESSAGES,
  COMM_PROVIDERS 
} from './comm-integration.constants';
import {
  validateSlackVerifyRequest,
  validateSlackConfig,
  validateSlackUpdateConfig
} from './comm-integration.validation';

/**
 * Handler: Verify Slack Bot Token
 * POST /tenants/:tenantId/integrations/slack/verify
 */
const verifyTokenHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Use Yup validation
      const validationResult = await validateSlackVerifyRequest(req.body);
      if (validationResult.success === false) {
        // Add "verified: false" for verify endpoint
        const errorResponse = buildValidationErrorResponse('Request validation failed', validationResult.errors);
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          ...errorResponse,
          verified: false
        });
        return;
      }

      const validated = validationResult.data;
      
      const decryptedToken = validated._encrypted 
        ? decryptIfEncrypted(validated.botToken, 'botToken')
        : validated.botToken;

      const verificationResult = await service.verifyCredentials(CommType.SLACK, decryptedToken);

      // Return proper status codes
      if (verificationResult.success) {
        res.status(HTTP_STATUS.OK).json({
          ...successResponse({
            verified: true,
            workspaceId: verificationResult.workspaceId,
            workspaceName: verificationResult.workspaceName,
            botUserId: verificationResult.botUserId
          }),
          message: verificationResult.message  // If needed
        });
      } else {
        // Read statusCode from result
        const statusCode = verificationResult.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
        res.status(statusCode).json({
          ...detailedErrorResponse(
            verificationResult.message,
            verificationResult.details?.errorCode || 'verification_failed',
            [verificationResult.message]
          ),
          verified: false  // Add custom field if needed
        });
      }
    } catch (error: unknown) {
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'verification_failed';
      const errorMessage = error instanceof Error ? error.message : COMM_INTEGRATION_ERROR_MESSAGES.VERIFY_TOKEN_FAILED;
      
      res.status(statusCode).json({
        ...detailedErrorResponse(errorMessage, errorCode, [errorMessage]),
        verified: false
      });
    }
  };

/**
 * Handler: Fetch Slack Channels
 * POST /tenants/:tenantId/integrations/slack/channels
 */
const fetchChannelsHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    // Use Yup validation
    const validationResult = await validateSlackVerifyRequest(req.body);
    if (validationResult.success === false) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        buildValidationErrorResponse('Request validation failed', validationResult.errors)
      );
      return;
    }

    const validated = validationResult.data;

    const decryptedToken = validated._encrypted 
      ? decryptIfEncrypted(validated.botToken, 'botToken')
      : validated.botToken;

    const result = await service.fetchChannels(CommType.SLACK, decryptedToken);

    if (result.success) {
      res.status(HTTP_STATUS.OK).json(successResponse({
        channels: result.channels ?? [],
        metadata: {
          total: result.total ?? 0
        }
      }));
    } else {
      // Map error codes to HTTP status codes (same as verify method pattern)
      let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      if (result.details?.errorCode === 'invalid_credentials' || result.details?.errorCode === 'token_revoked') {
        statusCode = HTTP_STATUS.UNAUTHORIZED;
      } else if (result.details?.errorCode === 'missing_scope' || result.details?.errorCode === 'account_inactive') {
        statusCode = HTTP_STATUS.FORBIDDEN;
      } else if (result.details?.errorCode === 'network_error') {
        statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
      }

      res.status(statusCode).json(
        detailedErrorResponse(
          result.message,
          result.details?.errorCode || 'fetch_channels_failed',
          [result.message]
        )
      );
    }
  };

/**
 * Handler: Fetch Slack Channels by Integration ID
 * GET /tenants/:tenantId/integrations/slack/:integrationId/channels
 * 
 * Fetches channels using stored token from the integration
 */
const fetchChannelsByIntegrationIdHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, integrationId } = req.params;

      if (!integrationId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('integrationId', 'Integration ID is required')
        );
        return;
      }

      // Get integration with token
      const integration = await service.getIntegrationById(integrationId);

      if (!integration) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Slack integration not found')
        );
        return;
      }

      // Validate that integration belongs to the tenant
      if (integration.tenantId !== tenantId) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          forbiddenResponse('Integration does not belong to this tenant', 'integration_access_denied')
        );
        return;
      }

      // Extract botToken
      const botToken = integration.slackBotToken;

      if (!botToken) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          detailedErrorResponse(
            'Integration is missing bot token',
            'missing_bot_token',
            ['Bot token not found in integration']
          )
        );
        return;
      }

      // Repository already decrypts token using decryptFromStorage() when includeToken=true
      // If still encrypted (error case), decrypt using Layer 2; otherwise use as-is (already plaintext)
      const decryptedToken = isBackendEncrypted(botToken) 
        ? decryptFromStorage(botToken)  // Layer 2 - from DB (error case: repository decryption failed)
        : botToken;  // Already plaintext (repository successfully decrypted it)

      // Fetch channels using the decrypted token
      const result = await service.fetchChannels(CommType.SLACK, decryptedToken);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(successResponse({
          channels: result.channels ?? [],
          metadata: {
            total: result.total ?? 0
          }
        }));
      } else {
        // Map error codes to HTTP status codes (same as verify method pattern)
        let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        if (result.details?.errorCode === 'invalid_credentials' || result.details?.errorCode === 'token_revoked') {
          statusCode = HTTP_STATUS.UNAUTHORIZED;
        } else if (result.details?.errorCode === 'missing_scope' || result.details?.errorCode === 'account_inactive') {
          statusCode = HTTP_STATUS.FORBIDDEN;
        } else if (result.details?.errorCode === 'network_error') {
          statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
        }

        res.status(statusCode).json(
          detailedErrorResponse(
            result.message,
            result.details?.errorCode || 'fetch_channels_failed',
            [result.message]
          )
        );
      }
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.FETCH_CHANNELS_FAILED)
      );
    }
  };

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

/**
 * Handler: Create or Update Slack Integration
 * POST /tenants/:tenantId/integrations/slack
 */
const createOrUpdateIntegrationHandler = (service: CommIntegrationService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      
      // Use Yup validation
      const validationResult = await validateSlackConfig(req.body);
      if (validationResult.success === false) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          buildValidationErrorResponse('Request validation failed', validationResult.errors)
        );
        return;
      }

      const validated = validationResult.data;

      // Double-layer encryption: Decrypt frontend-encrypted value (if encrypted), then encrypt with backend storage key
      const decryptedToken = validated._encrypted 
        ? decryptFields({ botToken: validated.botToken }, ['botToken']).decrypted.botToken
        : validated.botToken;
      
      const data: CreateOrUpdateIntegrationDto = {
        tenantId,
        data: {
          botToken: decryptedToken,
          botUserId: validated.botUserId,
          workspaceId: validated.workspaceId,
          workspaceName: validated.workspaceName
        }
      };

      // Check if integration exists
      const existing = await service.getIntegrationByTenant(tenantId);
      
      let result;
      let isNew = false;
      
      if (existing) {
        // Update existing - store backend-encrypted value
        const updateData = {
          slackBotToken: decryptedToken,
          slackBotUserId: validated.botUserId,
          slackWorkspaceId: validated.workspaceId,
          slackWorkspaceName: validated.workspaceName
        };
        result = await service.updateIntegrationByTenant(tenantId, updateData);
        isNew = false;
      } else {
        // Create new - store backend-encrypted value
        result = await service.createIntegration(tenantId, CommunicationType.SLACK, {
          botToken: decryptedToken,
          botUserId: validated.botUserId,
          workspaceId: validated.workspaceId,
          workspaceName: validated.workspaceName,
          createdByAccountId: req.user?.id ?? null
        });
        isNew = true;
      }

      const statusCode = isNew ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;
      const message = isNew
        ? COMM_INTEGRATION_SUCCESS_MESSAGES.INTEGRATION_CREATED
        : COMM_INTEGRATION_SUCCESS_MESSAGES.INTEGRATION_UPDATED;

      res.status(statusCode).json(successResponse(result, message));
    } catch (error: unknown) {
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'integration_create_failed';
      const errorMessage = error instanceof Error ? error.message : COMM_INTEGRATION_ERROR_MESSAGES.CREATE_INTEGRATION_FAILED;
      
      res.status(statusCode).json(
        detailedErrorResponse(errorMessage, errorCode, [errorMessage])
      );
    }
  };

/**
 * Handler: Get Slack Integration by Tenant
 * GET /tenants/:tenantId/integrations/slack
 */
const getIntegrationHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      const integration = await service.getIntegrationByTenant(tenantId);

      if (!integration) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Communication integration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(integration));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.FETCH_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Handler: List Integrations (all for tenant)
 * GET /comm/tenants/:tenantId/integrations
 */
const listIntegrationsHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const integrations = await service.listIntegrations(tenantId);
      res.status(HTTP_STATUS.OK).json(successResponse(integrations));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.FETCH_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Handler: Get Integration by ID
 * GET /comm/integrations/:integrationId
 */
const getIntegrationByIdHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      if (!integrationId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('integrationId', 'Integration ID is required')
        );
        return;
      }

      const integration = await service.getIntegrationById(integrationId);

      if (!integration) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Communication integration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(integration));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.FETCH_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Handler: Verify Integration
 * POST /comm/integrations/:integrationId/verify
 */
const verifyIntegrationHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationId } = req.params;

      if (!integrationId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('integrationId', 'Integration ID is required')
        );
        return;
      }

      // Get integration to verify
      const integration = await service.getIntegrationById(integrationId);

      if (!integration) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Communication integration')
        );
        return;
      }

      // Repository already decrypts token using decryptFromStorage() when includeToken=true
      // If still encrypted (error case), decrypt using Layer 2; otherwise use as-is (already plaintext)
      const botToken = integration.slackBotToken;
      const decryptedToken = botToken && isBackendEncrypted(botToken)
        ? decryptFromStorage(botToken)  // Layer 2 - from DB (error case: repository decryption failed)
        : botToken;  // Already plaintext (repository successfully decrypted it) or undefined
      
      // Verify using the decrypted token
      const verificationResult = await service.verifyCredentials(CommType.SLACK, decryptedToken);

      // Return proper status codes
      if (verificationResult.success) {
        res.status(HTTP_STATUS.OK).json({
          ...successResponse({
            verified: true,
            workspace: {
              id: verificationResult.workspaceId,
              name: verificationResult.workspaceName
            },
            botUserId: verificationResult.botUserId,
            ...(verificationResult.details && { details: verificationResult.details })
          }),
          message: verificationResult.message
        });
      } else {
        const statusCode = verificationResult.statusCode || HTTP_STATUS.BAD_REQUEST;
        res.status(statusCode).json({
          ...detailedErrorResponse(
            verificationResult.message,
            verificationResult.details?.errorCode || 'verification_failed',
            [verificationResult.message]
          ),
          verified: false
        });
      }
    } catch (error: unknown) {
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'verification_failed';
      const errorMessage = error instanceof Error ? error.message : COMM_INTEGRATION_ERROR_MESSAGES.VERIFY_TOKEN_FAILED;
      
      res.status(statusCode).json({
        ...detailedErrorResponse(errorMessage, errorCode, [errorMessage]),
        verified: false
      });
    }
  };

/**
 * Handler: Update Slack Integration
 * PATCH /tenants/:tenantId/integrations/slack
 */
const updateIntegrationHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      
      // Use Yup validation
      const validationResult = await validateSlackUpdateConfig(req.body);
      if (validationResult.success === false) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          buildValidationErrorResponse('Request validation failed', validationResult.errors)
        );
        return;
      }

      const validated = validationResult.data;

      // Double-layer encryption: Decrypt frontend-encrypted value (if encrypted), then encrypt with backend storage key
      const updateData: UpdateSlackIntegrationDto = {};
      if (validated.botToken) {
        const decryptedToken = validated._encrypted 
          ? decryptFields({ botToken: validated.botToken }, ['botToken']).decrypted.botToken
          : validated.botToken;
        updateData.slackBotToken = decryptedToken;
      }
      if (validated.botUserId) updateData.slackBotUserId = validated.botUserId;
      if (validated.workspaceId) updateData.slackWorkspaceId = validated.workspaceId;
      if (validated.workspaceName) updateData.slackWorkspaceName = validated.workspaceName;

      const updated = await service.updateIntegrationByTenant(tenantId, updateData);

      res.status(HTTP_STATUS.OK).json(
        successResponse(updated, COMM_INTEGRATION_SUCCESS_MESSAGES.INTEGRATION_UPDATED)
      );
    } catch (error: unknown) {
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'integration_update_failed';
      const errorMessage = error instanceof Error ? error.message : COMM_INTEGRATION_ERROR_MESSAGES.UPDATE_INTEGRATION_FAILED;
      
      res.status(statusCode).json(
        detailedErrorResponse(errorMessage, errorCode, [errorMessage])
      );
    }
  };

/**
 * Handler: Delete Slack Integration
 * DELETE /tenants/:tenantId/integrations/slack
 */
const deleteIntegrationHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      await service.deleteIntegrationByTenant(tenantId);

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(COMM_INTEGRATION_SUCCESS_MESSAGES.INTEGRATION_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.DELETE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Handler: Get Available Providers
 * GET /providers
 * 
 * Returns list of available communication providers
 */
const getAvailableProvidersHandler = () =>
  async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(HTTP_STATUS.OK).json(successResponse(COMM_PROVIDERS));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.FETCH_PROVIDERS_FAILED)
      );
    }
  };

/**
 * Create integration controller with service dependencies
 */
export const createCommIntegrationController = (service: CommIntegrationService) => ({
  // Tenant-scoped handlers
  getAvailableProviders: getAvailableProvidersHandler(),
  verifyCredentials: verifyTokenHandler(service),
  fetchChannels: fetchChannelsHandler(service),
  fetchChannelsByIntegrationId: fetchChannelsByIntegrationIdHandler(service),
  createIntegration: createOrUpdateIntegrationHandler(service),
  getIntegration: getIntegrationHandler(service),  // Uses tenantId
  updateIntegration: updateIntegrationHandler(service),
  deleteIntegration: deleteIntegrationHandler(service)
});
