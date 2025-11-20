import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "../../../../constants/http";
import { ERROR_MESSAGES } from "../../../../constants/cicd";
import { getErrorMessage } from "../../../../utils/cicd";
import { GitHubActionsWorkflowService } from "../../../../services/integrations/ci-cd/workflows/github-actions-workflow.service";

export const fetchGitHubActionsWorkflowInputs = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const { workflowUrl } = req.body || {};
  const workflowUrlMissing = !workflowUrl;
  if (workflowUrlMissing) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL });
  }

  try {
    const service = new GitHubActionsWorkflowService();
    const result = await service.fetchWorkflowInputs(tenantId, workflowUrl);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, parameters: result.parameters, error: null });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.GHA_FETCH_INPUTS_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: message });
  }
};

export const getGitHubActionsRunStatus = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const { runUrl, owner, repo, runId } = req.body || {};

  try {
    const service = new GitHubActionsWorkflowService();
    const status = await service.getRunStatus(tenantId, { runUrl, owner, repo, runId });
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.GHA_FETCH_RUN_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};


