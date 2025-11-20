import { ERROR_MESSAGES } from "../../../../constants/cicd";
import { GitHubActionsWorkflowService } from "../../../../services/integrations/ci-cd/workflows/github-actions-workflow.service";
import type { ParametersResult, RunStatus, WorkflowAdapter } from "./workflow-adapter.utils";

export const createGitHubActionsAdapter = (): WorkflowAdapter => {
  const service = new GitHubActionsWorkflowService();

  const fetchParameters: WorkflowAdapter["fetchParameters"] = async (tenantId, body) => {
    const workflowUrl = body.workflowUrl;
    const workflowUrlMissing = !workflowUrl;
    if (workflowUrlMissing) {
      throw new Error(ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL);
    }
    const result = await service.fetchWorkflowInputs(tenantId, workflowUrl as string);
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

  const runStatus: WorkflowAdapter["runStatus"] = async (tenantId, body) => {
    const { runUrl, owner, repo, runId } = body;
    const status = await service.getRunStatus(tenantId, { runUrl, owner, repo, runId });
    const validStatus: RunStatus = status;
    return validStatus;
  };

  return {
    fetchParameters,
    runStatus
  };
};


