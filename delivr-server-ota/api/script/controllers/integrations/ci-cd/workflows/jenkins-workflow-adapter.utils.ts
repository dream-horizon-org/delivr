import { ERROR_MESSAGES } from "../constants";
import { JenkinsWorkflowService } from "~services/integrations/ci-cd";
import type { ParametersResult, WorkflowStatus, WorkflowAdapter } from "./workflow-adapter.utils";

export const createJenkinsAdapter = (): WorkflowAdapter => {
  const service = new JenkinsWorkflowService();

  const fetchParameters: WorkflowAdapter["fetchParameters"] = async (tenantId, body) => {
    const workflowUrl = body.workflowUrl;
    const workflowUrlMissing = !workflowUrl;
    if (workflowUrlMissing) {
      throw new Error(ERROR_MESSAGES.WORKFLOW_MIN_PARAMS_REQUIRED);
    }
    try {
      // eslint-disable-next-line no-new
      new URL(workflowUrl as string);
    } catch {
      throw new Error(ERROR_MESSAGES.JENKINS_INVALID_WORKFLOW_URL);
    }
    const result = await service.fetchJobParameters(tenantId, workflowUrl as string);
    const mapped = result.parameters.map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      defaultValue: p.defaultValue,
      options: p.options
    }));
    const response: ParametersResult = { parameters: mapped };
    return response;
  };

  const trigger: WorkflowAdapter["trigger"] = async (tenantId, input) => {
    const hasWorkflowId = !!input.workflowId;
    const hasTypeAndPlatform = !!input.workflowType && !!input.platform;
    const invalid = !hasWorkflowId && !hasTypeAndPlatform;
    if (invalid) {
      throw new Error(ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED);
    }
    const result = await service.trigger(tenantId, {
      workflowId: input.workflowId,
      workflowType: input.workflowType,
      platform: input.platform,
      jobParameters: input.jobParameters ?? {}
    });
    return { queueLocation: result.queueLocation };
  };

  const queueStatus: WorkflowAdapter["queueStatus"] = async (tenantId, body) => {
    const queueUrl = body.queueUrl;
    const queueUrlMissing = !queueUrl;
    if (queueUrlMissing) {
      throw new Error(ERROR_MESSAGES.JENKINS_NO_QUEUE_URL);
    }
    try {
      // eslint-disable-next-line no-new
      new URL(queueUrl as string);
    } catch {
      throw new Error(ERROR_MESSAGES.JENKINS_INVALID_QUEUE_URL);
    }
    const result = await service.getQueueStatus(tenantId, queueUrl as string);
    // Extract just the status for the adapter (executableUrl used by polling service directly)
    const validStatus: WorkflowStatus = result.status;
    return validStatus;
  };

  return {
    fetchParameters,
    trigger,
    queueStatus
  };
};


