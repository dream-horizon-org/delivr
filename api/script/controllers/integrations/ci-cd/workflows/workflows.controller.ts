import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES } from "../constants";
import { getStorage } from "../../../../storage/storage-instance";
import { normalizePlatform } from "../../../../services/integrations/ci-cd/utils/cicd.utils";
import { formatErrorMessage } from "~utils/error.utils";
import type { CreateWorkflowDto, UpdateWorkflowDto, WorkflowType } from "~types/integrations/ci-cd/workflow.interface";
import shortid = require("shortid");
import { CICDProviderType } from "~types/integrations/ci-cd";

const getCICDIntegrationRepository = () => {
  const storage = getStorage();
  return (storage as any).cicdIntegrationRepository;
};

const getWorkflowRepository = () => {
  const storage = getStorage();
  return (storage as any).cicdWorkflowRepository;
};

export const createWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const accountId: string = req.user.id;

  const body = req.body as Partial<CreateWorkflowDto>;
  /**
   * Required attributes for provider-agnostic workflow metadata.
   * Keep validation minimal here; domain-specific checks live in services.
   */
  const missingRequired = !body.providerType || !body.integrationId || !body.workflowUrl || !body.displayName || !body.platform || !body.workflowType;
  if (missingRequired) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_CREATE_REQUIRED });
  }

  try {
    const cicd = getCICDIntegrationRepository();
    const integration = await cicd.findById(body.integrationId);
    const invalidIntegration = !integration || integration.id !== body.integrationId;
    if (invalidIntegration || integration.tenantId !== tenantId || integration.providerType !== body.providerType) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_INTEGRATION_INVALID });
    }

    const wfRepository = getWorkflowRepository();

    await wfRepository.create({
      id: shortid.generate(),
      tenantId,
      providerType: integration.providerType as CICDProviderType,
      integrationId: body.integrationId,
      displayName: body.displayName,
      workflowUrl: body.workflowUrl,
      providerIdentifiers: body.providerIdentifiers ?? null,
      platform: normalizePlatform(body.platform),
      workflowType: body.workflowType as WorkflowType,
      parameters: body.parameters ?? null,
      createdByAccountId: accountId,
    });

    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_CREATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * List workflows for a tenant, optionally filtered by providerType, integrationId, platform, workflowType.
 */
export const listWorkflows = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const { providerType, integrationId, platform, workflowType } = req.query as any;

  try {
    const wfRepository = getWorkflowRepository();
    const items = await wfRepository.findAll({
      tenantId,
      providerType: providerType as any,
      integrationId: integrationId as string | undefined,
      platform: normalizePlatform(platform),
      workflowType: workflowType as any,
    });
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflows: items });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_LIST_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * Get a workflow by id within tenant scope.
 */
export const getWorkflowById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  try {
    const wfRepository = getWorkflowRepository();
    const item = await wfRepository.findById(id);
    const notFound = !item || item.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflow: item });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * Update a workflow by id.
 */
export const updateWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  const body = req.body as UpdateWorkflowDto;
  try {
    const wfRepository = getWorkflowRepository();
    const existing = await wfRepository.findById(id);
    const notFound = !existing || existing.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    const updated = await wfRepository.update(id, body);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflow: updated });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_UPDATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * Delete a workflow by id.
 */
export const deleteWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  try {
    const wfRepository = getWorkflowRepository();
    const existing = await wfRepository.findById(id);
    const notFound = !existing || existing.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    await wfRepository.delete(id);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: 'Workflow deleted' });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};


