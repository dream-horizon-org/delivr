import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES } from "../constants";
import { formatErrorMessage, hasErrorCode } from "~utils/error.utils";
import {
  successResponse,
  successMessageResponse,
  detailedErrorResponse,
  notFoundResponse,
  simpleErrorResponse,
  getErrorStatusCode
} from "~utils/response.utils";
import { getStorage } from "../../../../storage/storage-instance";
import type { CICDIntegrationRepository } from "~models/integrations/ci-cd/connection/connection.repository";
import type { TenantCICDIntegration, UpdateCICDIntegrationDto, SafeCICDIntegration } from "~types/integrations/ci-cd/connection.interface";
import { CICDProviderType } from "~types/integrations/ci-cd/connection.interface";
import { getConnectionAdapter } from "./connection-adapter.utils";
import { validateUpdateJenkinsBody, validateUpdateGHABody } from "~middleware/validate-cicd";

const toSafe = (integration: TenantCICDIntegration): SafeCICDIntegration => {
  const { apiToken, headerValue, ...rest } = integration;
  return { ...rest };
};

/**
 * Get a CI/CD integration by id for a tenant.
 *
 * @param req Express request (expects params.tenantId, params.integrationId)
 * @param res Express response
 * @returns 200 with safe integration data or 404 if not found/mismatched tenant
 */
export const getIntegrationById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;
  try {
    const storage = getStorage();
    const repo = (storage as any).cicdIntegrationRepository as CICDIntegrationRepository;
    const integration = await repo.findById(integrationId);
    const notFoundOrMismatch = !integration || integration.tenantId !== tenantId;
    if (notFoundOrMismatch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        detailedErrorResponse(
          ERROR_MESSAGES.INTEGRATION_NOT_FOUND,
          'integration_not_found',
          ['The integration does not exist or does not belong to this tenant']
        )
      );
    }
    return res.status(HTTP_STATUS.OK).json(
      successResponse(toSafe(integration))
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.INTEGRATION_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      detailedErrorResponse(message, 'internal_error', [message])
    );
  }
};

/**
 * Update a CI/CD integration by id via provider adapter.
 *
 * @param req Express request (expects params.tenantId, params.integrationId; body partial update)
 * @param res Express response
 * @returns 200 with updated safe integration or 404 if not found/mismatched tenant
 */
export const updateIntegrationById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;
  const updateData = (req.body || {}) as UpdateCICDIntegrationDto;
  try {
    const storage = getStorage();
    const repo = (storage as any).cicdIntegrationRepository as CICDIntegrationRepository;
    const existing = await repo.findById(integrationId);
    const notFoundOrMismatch = !existing || existing.tenantId !== tenantId;
    if (notFoundOrMismatch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse('CI/CD integration', 'integration_not_found')
      );
    }
    
    // Handle Yup validation for Jenkins and GitHub Actions
    // Validation must be done here (not in middleware) because provider type comes from DB
    const provider = existing.providerType;
    if (provider === CICDProviderType.JENKINS) {
      await validateUpdateJenkinsBody(req, res, () => {});
      // If validation failed, response was already sent
      if (res.headersSent) return;
    } else if (provider === CICDProviderType.GITHUB_ACTIONS) {
      await validateUpdateGHABody(req, res, () => {});
      // If validation failed, response was already sent
      if (res.headersSent) return;
    }
    
    // Delegate update to provider adapter (which uses the appropriate service)
    const adapter = getConnectionAdapter(provider);
    if (!adapter.update) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        detailedErrorResponse(
          ERROR_MESSAGES.OPERATION_NOT_SUPPORTED,
          'unsupported_operation',
          ['This provider does not support updates']
        )
      );
    }
    const safe = await adapter.update(tenantId, updateData);
    return res.status(HTTP_STATUS.OK).json(
      successResponse(safe)
    );
  } catch (e: unknown) {
    const errorCode = hasErrorCode(e) ? e.code : 'update_failed';
    const statusCode = getErrorStatusCode(e);
    const message = formatErrorMessage(e, ERROR_MESSAGES.INTEGRATION_UPDATE_FAILED);
    const details = hasErrorCode(e) && e.details ? e.details : [e instanceof Error ? e.message : 'Unknown error'];
    
    return res.status(statusCode).json(
      detailedErrorResponse(message, errorCode, details)
    );
  }
};

/**
 * Delete a CI/CD integration by id.
 *
 * Validates that no workflows reference this integration before deletion.
 * If workflows exist, returns 400 with INTEGRATION_HAS_WORKFLOWS error.
 *
 * @param req Express request (expects params.tenantId, params.integrationId)
 * @param res Express response
 * @returns 200 on success, 400 if workflows exist, or 404 if not found/mismatched tenant
 */
export const deleteIntegrationById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;
  try {
    const storage = getStorage();
    const repo = (storage as any).cicdIntegrationRepository as CICDIntegrationRepository;
    const workflowRepo = (storage as any).cicdWorkflowRepository;

    const existing = await repo.findById(integrationId);
    const notFoundOrMismatch = !existing || existing.tenantId !== tenantId;
    if (notFoundOrMismatch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        detailedErrorResponse(
          ERROR_MESSAGES.INTEGRATION_NOT_FOUND,
          'integration_not_found',
          ['The integration does not exist or does not belong to this tenant']
        )
      );
    }

    // Check if any workflows reference this integration
    const workflows = await workflowRepo.findAll({ integrationId });
    const hasWorkflows = workflows.length > 0;
    if (hasWorkflows) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        detailedErrorResponse(
          ERROR_MESSAGES.INTEGRATION_HAS_WORKFLOWS,
          'integration_in_use',
          [`Cannot delete integration with ${workflows.length} workflow(s) still using it`]
        )
      );
    }

    await repo.delete(integrationId);
    return res.status(HTTP_STATUS.OK).json(
      successMessageResponse('Integration deleted successfully')
    );
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.INTEGRATION_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      detailedErrorResponse(
        message,
        'internal_error',
        [e instanceof Error ? e.message : 'Unknown error']
      )
    );
  }
};

/**
 * Verify provider credentials/body for the given providerType.
 *
 * @param req Express request (expects params.providerType; body varies per provider)
 * @param res Express response
 * @returns 200 if valid, 400 if invalid, 400 if unsupported/malformed
 */
export const verifyConnectionByProvider = async (req: Request, res: Response): Promise<any> => {
  try {
    const providerType = String(req.params.providerType || '').toUpperCase().replace('-', '_') as keyof typeof CICDProviderType;
    const provider = CICDProviderType[providerType] as CICDProviderType | undefined;
    if (!provider) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        ...detailedErrorResponse(
          ERROR_MESSAGES.OPERATION_NOT_SUPPORTED,
          'unsupported_provider',
          ['This provider type is not supported']
        ),
        verified: false
      });
    }
    
    // Validation is handled by middleware (validateConnectionVerifyBody)
    const adapter = getConnectionAdapter(provider);
    const result = await adapter.verify(req.body || {});
    
    if (result.success === true) {
      return res.status(HTTP_STATUS.OK).json({
        ...successResponse({ verified: true, ...(result.details && { details: result.details }) }),
        message: result.message
      });
    }
    
    // TypeScript now knows: result.statusCode, result.errorCode, result.details exist
    return res.status(result.statusCode).json({
      ...detailedErrorResponse(
        result.message,
        result.errorCode,
        result.details || []
      ),
      verified: false
    });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.FAILED_VERIFY_GHA);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...detailedErrorResponse(
        message,
        'verification_failed',
        [e instanceof Error ? e.message : 'Unknown error']
      ),
      verified: false
    });
  }
};

/**
 * Create a CI/CD integration for a providerType.
 *
 * @param req Express request (expects params.tenantId, params.providerType; body varies per provider)
 * @param res Express response
 * @returns 201 with created integration shape or 400/500 on error
 */
export const createConnectionByProvider = async (req: Request, res: Response): Promise<any> => {
  try {
    const tenantId = req.params.tenantId;
    const accountId: string = req.user?.id;
    const providerType = String(req.params.providerType || '').toUpperCase().replace('-', '_') as keyof typeof CICDProviderType;
    const provider = CICDProviderType[providerType] as CICDProviderType | undefined;
    if (!provider) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        detailedErrorResponse(
          ERROR_MESSAGES.OPERATION_NOT_SUPPORTED,
          'unsupported_provider',
          ['This provider type is not supported']
        )
      );
    }
    
    // Validation is handled by middleware (validateConnectionCreateBody)
    const adapter = getConnectionAdapter(provider);
    const created = await adapter.create(tenantId, accountId, req.body || {});
    return res.status(HTTP_STATUS.CREATED).json(
      successResponse({ integration: created })
    );
  } catch (e: unknown) {
    const errorCode = hasErrorCode(e) ? e.code : 'internal_error';
    const statusCode = hasErrorCode(e) && e.statusCode ? e.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = formatErrorMessage(e, ERROR_MESSAGES.FAILED_SAVE_GHA);
    const details = hasErrorCode(e) && e.details ? e.details : [e instanceof Error ? e.message : 'Unknown error'];
    
    return res.status(statusCode).json(
      detailedErrorResponse(message, errorCode, details)
    );
  }
};


