import { ERROR_MESSAGES } from "../constants";
import { GitHubActionsWorkflowService } from "~services/integrations/ci-cd";
import type { ParametersResult, WorkflowStatus, WorkflowAdapter } from "./workflow-adapter.utils";

export const createGitHubActionsAdapter = (): WorkflowAdapter => {
  const service = new GitHubActionsWorkflowService();

  const fetchParameters: WorkflowAdapter["fetchParameters"] = async (appId, body) => {
    const workflowUrl = body.workflowUrl;
    const workflowUrlMissing = !workflowUrl;
    if (workflowUrlMissing) {
      throw new Error(ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL);
    }
    const result = await service.fetchWorkflowInputs(appId, workflowUrl as string);
    const mapped = result.parameters.map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      defaultValue: p.defaultValue,
      options: p.options,
      required: p.required
    }));
    const response: ParametersResult = { parameters: mapped };
    return response;
  };

  const trigger: NonNullable<WorkflowAdapter["trigger"]> = async (appId, input) => {
    const hasWorkflowId = !!input.workflowId;
    const hasTypeAndPlatform = !!input.workflowType && !!input.platform;
    const invalid = !hasWorkflowId && !hasTypeAndPlatform;
    if (invalid) {
      throw new Error(ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED);
    }
    const result = await service.trigger(appId, {
      workflowId: input.workflowId,
      workflowType: input.workflowType,
      platform: input.platform,
      jobParameters: input.jobParameters ?? {}
    });
    return { queueLocation: result.queueLocation };
  };

  const runStatus: WorkflowAdapter["runStatus"] = async (appId, body) => {
    const { runUrl, owner, repo, runId } = body;
    const status = await service.getRunStatus(appId, { runUrl, owner, repo, runId });
    const validStatus: WorkflowStatus = status;
    return validStatus;
  };

  return {
    fetchParameters,
    trigger,
    runStatus
  };
};


