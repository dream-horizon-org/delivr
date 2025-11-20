import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "../../../../constants/http";
import { ERROR_MESSAGES } from "../../../../constants/cicd";
import { getErrorMessage } from "../../../../utils/cicd";
import { JenkinsWorkflowService } from "../../../../services/integrations/ci-cd/workflows/jenkins-workflow.service";

export const fetchJenkinsJobParameters = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const { jobUrl } = req.body;

  const isJobUrlMissing = !jobUrl;
  if (isJobUrlMissing) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.JENKINS_JOB_URL_REQUIRED });
  }

  try {
    new URL(jobUrl);
  } catch {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.JENKINS_INVALID_JOB_URL });
  }

  try {
    const service = new JenkinsWorkflowService();
    const result = await service.fetchJobParameters(tenantId, jobUrl);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, parameters: result.parameters, error: null });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_FETCH_PARAMS_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: message });
  }
};

export const triggerJenkinsWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const { workflowId, workflowType, platform, jobParameters = {} } = req.body || {};

  const hasWorkflowId = !!workflowId;
  const hasTypeAndPlatform = !!workflowType && !!platform;
  if (!hasWorkflowId && !hasTypeAndPlatform) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED });
  }

  try {
    const service = new JenkinsWorkflowService();
    const result = await service.trigger(tenantId, { workflowId, workflowType, platform, jobParameters });
    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS, queueLocation: result.queueLocation });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.JENKINS_TRIGGER_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const getJenkinsQueueStatus = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const { queueUrl } = req.body || {};
  const queueUrlMissing = !queueUrl;
  if (queueUrlMissing) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_NO_QUEUE_URL });
  }
  try {
    new URL(queueUrl);
  } catch {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_INVALID_QUEUE_URL });
  }

  try {
    const service = new JenkinsWorkflowService();
    const status = await service.getQueueStatus(tenantId, queueUrl);
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


