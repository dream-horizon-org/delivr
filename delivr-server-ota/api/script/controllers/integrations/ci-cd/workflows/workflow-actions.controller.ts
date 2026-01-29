import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES } from "../constants";
import { formatErrorMessage } from "~utils/error.utils";
import { getIntegrationForApp, getWorkflowAdapter } from "./workflow-adapter.utils";

export const getJobParameters = async (req: Request, res: Response): Promise<any> => {
  const appId = req.params.appId;
  const integrationId = req.params.integrationId;

  try {
    /**
     * Resolve integration and forward to provider adapter.
     * For GitHub Actions: returns workflow_dispatch inputs.
     * For Jenkins: returns job parameter definitions.
     */
    const integration = await getIntegrationForApp(appId, integrationId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const adapter = getWorkflowAdapter(integration.providerType);
    const body = (req.body || {}) as { workflowUrl?: string };
    const result = await adapter.fetchParameters(appId, body);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, parameters: result.parameters, error: null });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * Trigger a workflow using either explicit workflowId or (workflowType + platform).
 * Provider adapters translate this into dispatch/build operations.
 */
export const triggerWorkflow = async (req: Request, res: Response): Promise<any> => {
  const appId = req.params.appId;
  const integrationId = req.params.integrationId;
  const { workflowId, workflowType, platform, jobParameters = {} } = req.body || {};

  try {
    const integration = await getIntegrationForApp(appId, integrationId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const adapter = getWorkflowAdapter(integration.providerType);
    const adapterSupportsTrigger = typeof adapter.trigger === 'function';
    if (!adapterSupportsTrigger) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
    }
    const result = await adapter.trigger(appId, { workflowId, workflowType, platform, jobParameters });
    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS, queueLocation: result.queueLocation });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.JENKINS_TRIGGER_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * Poll Jenkins queue status using queueUrl.
 */
export const getQueueStatus = async (req: Request, res: Response): Promise<any> => {
  const appId = req.params.appId;
  const integrationId = req.params.integrationId;
  const queueUrl = typeof req.query.queueUrl === 'string' ? req.query.queueUrl : undefined;

  try {
    const integration = await getIntegrationForApp(appId, integrationId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const adapter = getWorkflowAdapter(integration.providerType);
    const adapterSupportsQueue = typeof adapter.queueStatus === 'function';
    if (!adapterSupportsQueue) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
    }
    const status = await adapter.queueStatus(appId, { queueUrl });
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status });
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    if (isTimeout) {
      return res.status(HTTP_STATUS.TIMEOUT).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_QUEUE_TIMEOUT });
    }
    const message = formatErrorMessage(e, ERROR_MESSAGES.JENKINS_QUEUE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * Fetch run status for GHA using either runUrl or owner/repo/runId.
 */
export const getRunStatus = async (req: Request, res: Response): Promise<any> => {
  const appId = req.params.appId;
  const integrationId = req.params.integrationId;
  const runUrl = typeof req.query.runUrl === 'string' ? req.query.runUrl : undefined;
  const owner = typeof req.query.owner === 'string' ? req.query.owner : undefined;
  const repo = typeof req.query.repo === 'string' ? req.query.repo : undefined;
  const runId = typeof req.query.runId === 'string' ? req.query.runId : undefined;

  try {
    const integration = await getIntegrationForApp(appId, integrationId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const adapter = getWorkflowAdapter(integration.providerType);
    const adapterSupportsRunStatus = typeof adapter.runStatus === 'function';
    if (!adapterSupportsRunStatus) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
    }
    const status = await adapter.runStatus(appId, { runUrl, owner, repo, runId });
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.GHA_FETCH_RUN_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};


