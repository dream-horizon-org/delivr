/**
 * Slack Integration Controller
 * HTTP handlers for integration management endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { CommIntegrationService } from '~services/integrations/comm/comm-integration';
import type { CreateOrUpdateIntegrationDto } from '~types/integrations/comm';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successMessageResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { decryptIfEncrypted, decryptFields, encryptForStorage } from '~utils/encryption';
import { 
  COMM_INTEGRATION_ERROR_MESSAGES, 
  COMM_INTEGRATION_SUCCESS_MESSAGES,
  COMM_PROVIDERS 
} from './comm-integration.constants';
import {
  validateBotToken,
  validateBotUserId,
  validateWorkspaceId,
  validateWorkspaceName
} from './comm-integration.validation';

/**
 * Handler: Verify Slack Bot Token
 * POST /tenants/:tenantId/integrations/slack/verify
 */
const verifyTokenHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { botToken, _encrypted } = req.body;

      console.log('\n============ SLACK VERIFY REQUEST ============');
      console.log('[Slack] Token received:', !!botToken);
      console.log('[Slack] Token length:', botToken?.length);
      console.log('[Slack] Token starts with:', botToken?.substring(0, 15));
      console.log('[Slack] _encrypted flag:', _encrypted);

      // IMPORTANT: Decrypt FIRST if encrypted, then validate
      // If token is encrypted (doesn't start with xoxb-), try to decrypt
      const isEncrypted = _encrypted || (botToken && !botToken.startsWith('xoxb-'));
      console.log('[Slack] Will attempt decrypt:', isEncrypted);
      
      const decryptedToken = isEncrypted 
        ? decryptIfEncrypted(botToken, 'botToken')
        : botToken;

      console.log('[Slack] After decryption:');
      console.log('[Slack] - Decrypted starts with:', decryptedToken?.substring(0, 15));
      console.log('[Slack] - Starts with xoxb-:', decryptedToken?.startsWith('xoxb-'));
      console.log('==============================================\n');

      const tokenError = validateBotToken(decryptedToken);
      if (tokenError) {
        console.log('[Slack] VALIDATION FAILED:', tokenError);
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('botToken', tokenError)
        );
        return;
      }

      const verificationResult = await service.verifyCredentials('SLACK' as any, decryptedToken);

      res.status(HTTP_STATUS.OK).json(successResponse({
        verified: verificationResult.success,
        message: verificationResult.message,
        workspaceId: verificationResult.workspaceId,
        workspaceName: verificationResult.workspaceName,
        botUserId: verificationResult.botUserId,
        details: verificationResult.error ? { error: verificationResult.error } : undefined
      }));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.VERIFY_TOKEN_FAILED)
      );
    }
  };

/**
 * Handler: Fetch Slack Channels
 * POST /tenants/:tenantId/integrations/slack/channels
 */
const fetchChannelsHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { botToken, _encrypted } = req.body;

      // IMPORTANT: Decrypt FIRST if encrypted, then validate
      const decryptedToken = _encrypted 
        ? decryptIfEncrypted(botToken, 'botToken')
        : botToken;

      const tokenError = validateBotToken(decryptedToken);
      if (tokenError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('botToken', tokenError)
        );
        return;
      }

      const channelsResult = await service.fetchChannels('SLACK' as any, decryptedToken);

      res.status(HTTP_STATUS.OK).json(successResponse({
        channels: channelsResult.channels ?? [],
        metadata: {
          total: channelsResult.total
        }
      }));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.FETCH_CHANNELS_FAILED)
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
          errorResponse(new Error('Integration does not belong to this tenant'), 'Access denied')
        );
        return;
      }

      // Extract botToken
      const botToken = integration.slackBotToken;

      if (!botToken) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(new Error('Bot token not found in integration'), 'Integration is missing bot token')
        );
        return;
      }

      // Decrypt the stored token before making API calls
      const decryptedToken = decryptIfEncrypted(botToken, 'slackBotToken');

      // Fetch channels using the decrypted token
      const channelsResult = await service.fetchChannels('SLACK' as any, decryptedToken);

      res.status(HTTP_STATUS.OK).json(successResponse({
        channels: channelsResult.channels ?? [],
        metadata: {
          total: channelsResult.total
        }
      }));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.FETCH_CHANNELS_FAILED)
      );
    }
  };

/**
 * Handler: Create or Update Slack Integration
 * POST /tenants/:tenantId/integrations/slack
 */
const createOrUpdateIntegrationHandler = (service: CommIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const { botToken, botUserId, workspaceId, workspaceName, _encrypted } = req.body;
      
      // Log encryption status for debugging
      console.log('[Slack] Storing botToken (encrypted from frontend):', !!_encrypted);

      // IMPORTANT: Decrypt FIRST for validation, but store encrypted value
      const decryptedToken = _encrypted 
        ? decryptIfEncrypted(botToken, 'botToken')
        : botToken;

      const tokenError = validateBotToken(decryptedToken);
      if (tokenError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('botToken', tokenError)
        );
        return;
      }

      const botUserIdError = validateBotUserId(botUserId);
      if (botUserIdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('botUserId', botUserIdError)
        );
        return;
      }

      const workspaceIdError = validateWorkspaceId(workspaceId);
      if (workspaceIdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('workspaceId', workspaceIdError)
        );
        return;
      }

      const workspaceNameError = validateWorkspaceName(workspaceName);
      if (workspaceNameError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('workspaceName', workspaceNameError)
        );
        return;
      }

      // Double-layer encryption: Decrypt frontend-encrypted value, then encrypt with backend storage key
      const { decrypted: decryptedData } = decryptFields({ botToken }, ['botToken']);
      const backendEncryptedBotToken = encryptForStorage(decryptedData.botToken);
      
      const data: CreateOrUpdateIntegrationDto = {
        tenantId,
        data: {
          botToken: backendEncryptedBotToken, // Backend-encrypted value
          botUserId,
          workspaceId,
          workspaceName
        }
      };

      // Check if integration exists
      const existing = await service.getIntegrationByTenant(tenantId);
      
      let result;
      let isNew = false;
      
      if (existing) {
        // Update existing - store backend-encrypted value
        const updateData = {
          slackBotToken: backendEncryptedBotToken, // Backend-encrypted value
          slackBotUserId: botUserId,
          slackWorkspaceId: workspaceId,
          slackWorkspaceName: workspaceName
        };
        result = await service.updateIntegrationByTenant(tenantId, updateData);
        isNew = false;
      } else {
        // Create new - store backend-encrypted value
        result = await service.createIntegration(tenantId, 'SLACK' as any, {
          botToken: backendEncryptedBotToken, // Backend-encrypted value
          botUserId,
          workspaceId,
          workspaceName
        });
        isNew = true;
      }

      const statusCode = isNew ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;
      const message = isNew
        ? COMM_INTEGRATION_SUCCESS_MESSAGES.INTEGRATION_CREATED
        : COMM_INTEGRATION_SUCCESS_MESSAGES.INTEGRATION_UPDATED;

      res.status(statusCode).json(successResponse(result, message));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.CREATE_INTEGRATION_FAILED)
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

      // Decrypt the stored token before verification
      const decryptedToken = decryptIfEncrypted(integration.slackBotToken, 'slackBotToken');
      
      // Verify using the decrypted token
      const verificationResult = await service.verifyCredentials('SLACK' as any, decryptedToken);

      res.status(HTTP_STATUS.OK).json(successResponse({
        verified: verificationResult.success,
        message: verificationResult.message,
        workspaceId: verificationResult.workspaceId,
        workspaceName: verificationResult.workspaceName,
        botUserId: verificationResult.botUserId,
        details: verificationResult.error ? { error: verificationResult.error } : undefined
      }));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.VERIFY_TOKEN_FAILED)
      );
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
      const { botToken, botUserId, workspaceId, workspaceName, _encrypted } = req.body;

      // IMPORTANT: Decrypt FIRST for validation if token is encrypted
      if (botToken) {
        const isEncrypted = _encrypted || !botToken.startsWith('xoxb-');
        const decryptedToken = isEncrypted 
          ? decryptIfEncrypted(botToken, 'botToken')
          : botToken;
        
        const tokenError = validateBotToken(decryptedToken);
        if (tokenError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('botToken', tokenError)
          );
          return;
        }
      }

      if (botUserId) {
        const botUserIdError = validateBotUserId(botUserId);
        if (botUserIdError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('botUserId', botUserIdError)
          );
          return;
        }
      }

      if (workspaceId) {
        const workspaceIdError = validateWorkspaceId(workspaceId);
        if (workspaceIdError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('workspaceId', workspaceIdError)
          );
          return;
        }
      }

      if (workspaceName) {
        const workspaceNameError = validateWorkspaceName(workspaceName);
        if (workspaceNameError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('workspaceName', workspaceNameError)
          );
          return;
        }
      }

      // Double-layer encryption: Decrypt frontend-encrypted value, then encrypt with backend storage key
      const updateData: any = {};
      if (botToken) {
        const { decrypted: decryptedData } = decryptFields({ botToken }, ['botToken']);
        updateData.slackBotToken = encryptForStorage(decryptedData.botToken); // Backend-encrypted value
      }
      if (botUserId) updateData.slackBotUserId = botUserId;
      if (workspaceId) updateData.slackWorkspaceId = workspaceId;
      if (workspaceName) updateData.slackWorkspaceName = workspaceName;

      const updated = await service.updateIntegrationByTenant(tenantId, updateData);

      res.status(HTTP_STATUS.OK).json(
        successResponse(updated, COMM_INTEGRATION_SUCCESS_MESSAGES.INTEGRATION_UPDATED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_INTEGRATION_ERROR_MESSAGES.UPDATE_INTEGRATION_FAILED)
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
