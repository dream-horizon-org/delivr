import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "../../../../constants/http";
import { ERROR_MESSAGES } from "../../../../constants/cicd";
import { getErrorMessage } from "../../../../utils/cicd";
import { getIntegrationForTenant, getWorkflowAdapter } from "./workflow-adapter.utils";

export const getJobParameters = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;

  try {
    const integration = await getIntegrationForTenant(tenantId, integrationId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const adapter = getWorkflowAdapter(integration.providerType);
    const body = (req.body || {}) as { jobUrl?: string; workflowUrl?: string };
    const result = await adapter.fetchParameters(tenantId, body);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, parameters: result.parameters, error: null });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const triggerWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;
  const { workflowId, workflowType, platform, jobParameters = {} } = req.body || {};

  try {
    const integration = await getIntegrationForTenant(tenantId, integrationId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const adapter = getWorkflowAdapter(integration.providerType);
    const adapterSupportsTrigger = typeof adapter.trigger === 'function';
    if (!adapterSupportsTrigger) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
    }
    const result = await adapter.trigger(tenantId, { workflowId, workflowType, platform, jobParameters });
    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS, queueLocation: result.queueLocation });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.JENKINS_TRIGGER_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const getQueueStatus = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;
  const { queueUrl } = req.body || {};

  try {
    const integration = await getIntegrationForTenant(tenantId, integrationId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const adapter = getWorkflowAdapter(integration.providerType);
    const adapterSupportsQueue = typeof adapter.queueStatus === 'function';
    if (!adapterSupportsQueue) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
    }
    const status = await adapter.queueStatus(tenantId, { queueUrl });
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status });
  } catch (e: any) {
    const isTimeout = e && (e.name === 'AbortError' || e.code === 'ABORT_ERR');
    if (isTimeout) {
      return res.status(HTTP_STATUS.TIMEOUT).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_QUEUE_TIMEOUT });
    }
    const message = getErrorMessage(e, ERROR_MESSAGES.JENKINS_QUEUE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const getRunStatus = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;
  const { runUrl, owner, repo, runId } = req.body || {};

  try {
    const integration = await getIntegrationForTenant(tenantId, integrationId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const adapter = getWorkflowAdapter(integration.providerType);
    const adapterSupportsRunStatus = typeof adapter.runStatus === 'function';
    if (!adapterSupportsRunStatus) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
    }
    const status = await adapter.runStatus(tenantId, { runUrl, owner, repo, runId });
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.GHA_FETCH_RUN_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};


