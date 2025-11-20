import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "../../../../constants/http";
import { ERROR_MESSAGES } from "../../../../constants/cicd";
import { getStorage } from "../../../../storage/storage-instance";
import type { CICDIntegrationController } from "../../../../storage/integrations/ci-cd/ci-cd-controller";
import type { CICDWorkflowController } from "../../../../storage/integrations/ci-cd/workflows-controller";
import { normalizePlatform, getErrorMessage } from "../../../../utils/cicd";
import type { CreateWorkflowDto, UpdateWorkflowDto } from "../../../../storage/integrations/ci-cd/workflows-types";

const getCICDController = (): CICDIntegrationController => {
  const storage = getStorage();
  return (storage as any).cicdController;
};

const getWorkflowController = (): CICDWorkflowController => {
  const storage = getStorage();
  return (storage as any).cicdWorkflowController;
};

export const createWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const accountId: string = req.user.id;

  const body = req.body as Partial<CreateWorkflowDto>;
  const missingRequired = !body.providerType || !body.integrationId || !body.workflowUrl || !body.displayName || !body.platform || !body.workflowType;
  if (missingRequired) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_CREATE_REQUIRED });
  }

  try {
    const cicd = getCICDController();
    const integration = await cicd.findById(body.integrationId, true);
    const invalidIntegration = !integration || integration.id !== body.integrationId;
    if (invalidIntegration) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_INTEGRATION_INVALID });
    }

    const wfController = getWorkflowController();
    await wfController.create({
      tenantId,
      providerType: body.providerType as any,
      integrationId: body.integrationId,
      displayName: body.displayName,
      workflowUrl: body.workflowUrl,
      providerIdentifiers: body.providerIdentifiers ?? null,
      platform: normalizePlatform(body.platform),
      workflowType: body.workflowType as any,
      parameters: body.parameters ?? null,
      createdByAccountId: accountId,
    });

    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_CREATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const listWorkflows = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const { providerType, integrationId, platform, workflowType } = req.query as any;

  try {
    const wfController = getWorkflowController();
    const items = await wfController.findAll({
      tenantId,
      providerType: providerType as any,
      integrationId: integrationId as string | undefined,
      platform: normalizePlatform(platform),
      workflowType: workflowType as any,
    });
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflows: items });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_LIST_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const getWorkflowById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  try {
    const wfController = getWorkflowController();
    const item = await wfController.findById(id);
    const notFound = !item || item.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflow: item });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const updateWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  const body = req.body as UpdateWorkflowDto;
  try {
    const wfController = getWorkflowController();
    const existing = await wfController.findById(id);
    const notFound = !existing || existing.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    const updated = await wfController.update(id, body);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflow: updated });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_UPDATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const deleteWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  try {
    const wfController = getWorkflowController();
    const existing = await wfController.findById(id);
    const notFound = !existing || existing.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    await wfController.delete(id);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: 'Workflow deleted' });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};


