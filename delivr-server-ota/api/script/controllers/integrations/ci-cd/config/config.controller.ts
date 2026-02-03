import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES } from "../constants";
import { formatErrorMessage, hasErrorCode } from "~utils/error.utils";
import {
  getErrorStatusCode,
  successResponse,
  successMessageResponse,
  validationErrorsResponse,
  detailedErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  buildValidationErrorResponse
} from "~utils/response.utils";
import { getStorage } from "../../../../storage/storage-instance";
import type { CICDConfigService } from "../../../../services/integrations/ci-cd/config/config.service";
import { validateCreateConfig, validateUpdateConfig } from "~services/integrations/ci-cd/config/config.validation";
import type { CICDIntegrationRepository } from "~models/integrations/ci-cd";
import { VerificationStatus } from "~types/integrations/ci-cd/connection.interface";

/**
 * Helper: Validate workflow integrations
 * Checks that each workflow's integration exists, is verified, and belongs to tenant
 */
interface WorkflowWithIntegration {
  integrationId?: string;
  [key: string]: unknown;
}

interface ValidateWorkflowIntegrationsParams {
  workflows: WorkflowWithIntegration[];
  tenantId: string;
  cicdIntegrationRepo: CICDIntegrationRepository;
  res: Response;
}

async function validateWorkflowIntegrations({
  workflows,
  tenantId,
  cicdIntegrationRepo,
  res
}: ValidateWorkflowIntegrationsParams): Promise<boolean> {
  // Validate all workflows in parallel and collect all errors
  const validationPromises = workflows.map(async (workflow, i) => {
    if (!workflow.integrationId) {
      return {
        valid: false,
        error: {
          field: `workflows[${i}].integrationId`,
          errorCode: 'integration_id_required',
          message: 'Integration ID is required'
        }
      };
    }
    
    const integration = await cicdIntegrationRepo.findById(workflow.integrationId);
    
    if (!integration) {
      return {
        valid: false,
        error: {
          field: `workflows[${i}].integrationId`,
          errorCode: 'integration_not_found',
          message: 'CI/CD integration not found'
        }
      };
    }
    
    if (integration.tenantId !== tenantId) {
      return {
        valid: false,
        error: {
          field: `workflows[${i}].integrationId`,
          errorCode: 'integration_access_denied',
          message: 'Integration does not belong to this tenant'
        }
      };
    }
    
    if (integration.verificationStatus !== VerificationStatus.VALID) {
      return {
        valid: false,
        error: {
          field: `workflows[${i}].integrationId`,
          errorCode: 'integration_not_verified',
          message: 'CI/CD integration is not in VALID status'
        }
      };
    }
    
    return { valid: true, error: null };
  });

  const results = await Promise.allSettled(validationPromises);
  
  // Collect all validation errors
  const errors = results
    .filter(r => r.status === 'fulfilled' && !r.value.valid)
    .map(r => (r as PromiseFulfilledResult<{ valid: boolean; error: any }>).value.error);
  
  if (errors.length > 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      validationErrorsResponse('Workflow validation failed', errors.map(err => ({
        field: err.field,
        errorCode: err.errorCode,
        messages: [err.message]
      })))
    );
    return false;
  }
  
  return true;
}

export const createConfig = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const accountId = req.user?.id;
  const missingUser = !accountId || typeof accountId !== 'string';
  if (missingUser) {
    // Route: POST /tenants/:tenantId/integrations/ci-cd/configs
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      unauthorizedResponse('Authentication required')
    );
  }
  
  const body = req.body || {};
  
  // Validate request body using Yup
  const validationResult = await validateCreateConfig(body, tenantId);
  if (validationResult.success === false) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      buildValidationErrorResponse('Request validation failed', validationResult.errors)
    );
    return;
  }

  const validated = validationResult.data;

  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const cicdIntegrationRepo = (storage as any).cicdIntegrationRepository;
    
    // Validate each workflow's integration exists, is enabled, and belongs to tenant
    const workflows = validated.workflows;
    const isValid = await validateWorkflowIntegrations({
      workflows,
      tenantId,
      cicdIntegrationRepo,
      res
    });
    if (!isValid) {
      return; // Response already sent by validation function
    }
    
    const result = await service.createConfig({
      tenantId,
      createdByAccountId: accountId,
      workflows: workflows.map(wf => ({
        ...wf,
        tenantId,
        createdByAccountId: accountId
      }))
    });
    
    return res.status(HTTP_STATUS.CREATED).json(
      successResponse({
        configId: result.configId,
        workflowIds: result.workflowIds
      })
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.CONFIG_CREATE_FAILED);
    const statusCode = getErrorStatusCode(error);
    const errorCode = hasErrorCode(error) ? error.code : 'config_create_failed';
    
    return res.status(statusCode).json(
      detailedErrorResponse(message, errorCode, [message])
    );
  }
};

/**
 * List all CI/CD configs for a tenant.
 */
export const listConfigsByTenant = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const items = await service.listByTenant(tenantId);
    return res.status(HTTP_STATUS.OK).json(
      successResponse({ configs: items })
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.CONFIG_LIST_FAILED);
    const statusCode = getErrorStatusCode(error);
    const errorCode = hasErrorCode(error) ? error.code : 'config_list_failed';
    
    return res.status(statusCode).json(
      detailedErrorResponse(message, errorCode, [message])
    );
  }
};

/**
 * Fetch a CI/CD config by id (tenant-scoped).
 */
export const getConfigById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const configId = req.params.configId;
  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const config = await service.findById(configId);
    const notFound = !config || config.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse('CI/CD configuration', 'config_not_found')
      );
    }
    return res.status(HTTP_STATUS.OK).json(
      successResponse({ config })
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.CONFIG_FETCH_FAILED);
    const statusCode = getErrorStatusCode(error);
    const errorCode = hasErrorCode(error) ? error.code : 'config_fetch_failed';
    
    return res.status(statusCode).json(
      detailedErrorResponse(message, errorCode, [message])
    );
  }
};

/**
 * Update a CI/CD config by id. Supports updating workflowIds.
 */
export const updateConfigById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const configId = req.params.configId;
  const body = req.body || {};
  const accountId = req.user?.id;

  // Validate request body using Yup
  const validationResult = await validateUpdateConfig(body, tenantId);
  if (validationResult.success === false) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      buildValidationErrorResponse('Request validation failed', validationResult.errors)
    );
    return;
  }

  const validated = validationResult.data;

  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const cicdIntegrationRepo = (storage as any).cicdIntegrationRepository;
    
    // Validate each workflow's integration exists, is enabled, and belongs to tenant
    const workflows = validated.workflows;
    const isValid = await validateWorkflowIntegrations({
      workflows,
      tenantId,
      cicdIntegrationRepo,
      res
    });
    if (!isValid) {
      return; // Response already sent by validation function
    }
    
    const updated = await service.updateConfig({
      tenantId,
      configId,
      createdByAccountId: accountId,
      workflows: workflows.map(wf => ({
        ...wf,
        tenantId,
        createdByAccountId: accountId
      }))
    });
    
    const notFound = !updated;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse('CI/CD configuration', 'config_not_found')
      );
    }
    
    return res.status(HTTP_STATUS.OK).json(
      successResponse({ config: updated })
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.CONFIG_UPDATE_FAILED);
    const statusCode = getErrorStatusCode(error);
    const errorCode = hasErrorCode(error) ? error.code : 'config_update_failed';
    
    return res.status(statusCode).json(
      detailedErrorResponse(message, errorCode, [message])
    );
  }
};

/**
 * Delete a CI/CD config by id.
 */
export const deleteConfigById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const configId = req.params.configId;
  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const deleted = await service.deleteConfig(configId, tenantId);
    const notFound = !deleted;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse('CI/CD configuration', 'config_not_found')
      );
    }
    return res.status(HTTP_STATUS.OK).json(
      successMessageResponse('Configuration deleted successfully')
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.CONFIG_DELETE_FAILED);
    const statusCode = getErrorStatusCode(error);
    const errorCode = hasErrorCode(error) ? error.code : 'config_delete_failed';
    
    return res.status(statusCode).json(
      detailedErrorResponse(message, errorCode, [message])
    );
  }
};


