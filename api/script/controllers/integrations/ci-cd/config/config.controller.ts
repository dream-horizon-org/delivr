import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES } from "../constants";
import { formatErrorMessage } from "~utils/error.utils";
import { getStorage } from "../../../../storage/storage-instance";
import type { CICDConfigService } from "../../../../services/integrations/ci-cd/config/config.service";

export const createConfig = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const accountId = req.user?.id;
  const missingUser = !accountId || typeof accountId !== 'string';
  if (missingUser) {
    // Route: POST /tenants/:tenantId/integrations/ci-cd/configs
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: RESPONSE_STATUS.FAILURE,
      error: 'Unauthorized'
    });
  }
  const body = req.body || {};
  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const isArrayWorkflows = Array.isArray(body.workflows);
    const workflows = isArrayWorkflows ? body.workflows : [];
    const result = await service.createConfig({
      tenantId,
      createdByAccountId: accountId,
      workflows
    });
    return res.status(HTTP_STATUS.CREATED).json({
      success: RESPONSE_STATUS.SUCCESS,
      configId: result.configId,
      workflowIds: result.workflowIds
    });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_CREATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message
    });
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
    return res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      configs: items
    });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_LIST_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message
    });
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
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.CONFIG_NOT_FOUND
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      config
    });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message
    });
  }
};

/**
 * Update a CI/CD config by id. Supports updating workflowIds.
 */
export const updateConfigById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const configId = req.params.configId;
  const body = req.body || {};
  const isArrayWorkflows = Array.isArray(body.workflowIds);
  const workflowIds = isArrayWorkflows ? body.workflowIds : undefined;
  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const updated = await service.updateConfig(configId, tenantId, { workflowIds });
    const notFound = !updated;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.CONFIG_NOT_FOUND
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      config: updated
    });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_UPDATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message
    });
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
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.CONFIG_NOT_FOUND
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS
    });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message
    });
  }
};


