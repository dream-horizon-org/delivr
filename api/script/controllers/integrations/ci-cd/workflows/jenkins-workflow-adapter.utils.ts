import { ERROR_MESSAGES } from "../../../../constants/cicd";
import { JenkinsWorkflowService } from "../../../../services/integrations/ci-cd/workflows/jenkins-workflow.service";
import type { ParametersResult, QueueStatus, WorkflowAdapter } from "./workflow-adapter.utils";

export const createJenkinsAdapter = (): WorkflowAdapter => {
  const service = new JenkinsWorkflowService();

  const fetchParameters: WorkflowAdapter["fetchParameters"] = async (tenantId, body) => {
    const jobUrl = body.jobUrl;
    const jobUrlMissing = !jobUrl;
    if (jobUrlMissing) {
      throw new Error(ERROR_MESSAGES.JENKINS_JOB_URL_REQUIRED);
    }

    try {
      // Validate URL format
      // eslint-disable-next-line no-new
      new URL(jobUrl as string);
    } catch {
      throw new Error(ERROR_MESSAGES.JENKINS_INVALID_JOB_URL);
    }

    const result = await service.fetchJobParameters(tenantId, jobUrl as string);
    const mapped = result.parameters.map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      defaultValue: p.defaultValue,
      choices: p.choices
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
    const status = await service.getQueueStatus(tenantId, queueUrl as string);
    const validStatus: QueueStatus = status;
    return validStatus;
  };

  return {
    fetchParameters,
    trigger,
    queueStatus
  };
};


