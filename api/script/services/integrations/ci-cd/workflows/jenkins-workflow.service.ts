import { WorkflowService } from './workflow.service';
import { CICDProviderType, AuthType } from '~types/integrations/ci-cd/connection.interface';
import { ProviderFactory } from '../providers/provider.factory';
import type { JenkinsProviderContract, JenkinsJobParamsRequest, JenkinsTriggerRequest, JenkinsQueueStatusRequest } from '../providers/jenkins/jenkins.interface';
import { PROVIDER_DEFAULTS, HEADERS, ERROR_MESSAGES } from '../../../../controllers/integrations/ci-cd/constants';
import { normalizePlatform, extractDefaultsFromWorkflow } from '../utils/cicd.utils';

export class JenkinsWorkflowService extends WorkflowService {
  fetchJobParameters = async (tenantId: string, workflowUrl: string): Promise<{ parameters: Array<{
    name: string; type: 'boolean' | 'string' | 'choice'; description?: string; defaultValue?: unknown; choices?: string[];
  }>}> => {
    const integration = await this.integrationRepository.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    if (!integration) throw new Error(ERROR_MESSAGES.JENKINS_CONNECTION_NOT_FOUND);
    const hasBasicCreds = integration.authType === AuthType.BASIC && !!integration.username && !!integration.apiToken;
    if (!hasBasicCreds) throw new Error(ERROR_MESSAGES.JENKINS_BASIC_REQUIRED);
    const hostFromIntegration = new URL(integration.hostUrl).host;
    const workflowUrlObj = new URL(workflowUrl);
    if (hostFromIntegration !== workflowUrlObj.host) {
      const msg = `${ERROR_MESSAGES.JENKINS_HOST_MISMATCH}: ${workflowUrlObj.host} != ${hostFromIntegration}`;
      throw new Error(msg);
    }
    const authHeader = 'Basic ' + Buffer.from(`${integration.username}:${integration.apiToken}`).toString('base64');
    const providerConfig = integration.providerConfig as Record<string, unknown> | null | undefined;
    const useCrumb = typeof providerConfig?.useCrumb === 'boolean' ? (providerConfig.useCrumb as boolean) : true;
    const crumbPathValue = providerConfig?.crumbPath;
    const crumbPath = typeof crumbPathValue === 'string' ? crumbPathValue : PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;
    const crumbUrl = `${integration.hostUrl.endsWith('/') ? integration.hostUrl.slice(0, -1) : integration.hostUrl}${crumbPath}`;

    const provider = await ProviderFactory.getProvider(CICDProviderType.JENKINS) as JenkinsProviderContract;
    const req: JenkinsJobParamsRequest = {
      workflowUrl,
      authHeader,
      useCrumb,
      crumbUrl,
      crumbHeaderFallback: HEADERS.JENKINS_CRUMB_HEADER_FALLBACK
    };
    const result = await provider.fetchJobParameters(req);
    return { parameters: result.parameters };
  };

  trigger = async (tenantId: string, input: {
    workflowId?: string;
    workflowType?: string;
    platform?: string;
    jobParameters?: Record<string, unknown>;
  }): Promise<{ queueLocation: string }> => {
    const hasWorkflowId = !!input.workflowId;
    const hasTypeAndPlatform = !!input.workflowType && !!input.platform;
    if (!hasWorkflowId && !hasTypeAndPlatform) throw new Error(ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED);

    let workflow: any;
    if (hasWorkflowId) {
      const item = await this.workflowRepository.findById(input.workflowId as string);
      const invalid = !item || item.tenantId !== tenantId || item.providerType !== CICDProviderType.JENKINS;
      if (invalid) throw new Error(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
      workflow = item;
    } else {
      const items = await this.workflowRepository.findAll({
        tenantId,
        providerType: CICDProviderType.JENKINS as any,
        workflowType: input.workflowType as any,
        platform: normalizePlatform(input.platform)
      } as any);
      if (!items.length) throw new Error(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
      if (items.length > 1) throw new Error(ERROR_MESSAGES.WORKFLOW_MULTIPLE_FOUND);
      workflow = items[0];
    }

    const integration = await this.integrationRepository.findById(workflow.integrationId) as any;
    if (!integration) throw new Error('Jenkins credentials not found');
    const hasBasicCreds = integration.authType === AuthType.BASIC && !!integration.username && !!integration.apiToken;
    if (!hasBasicCreds) throw new Error(ERROR_MESSAGES.JENKINS_BASIC_REQUIRED);

    const hostFromIntegration = new URL(integration.hostUrl).host;
    const jobUrlObj = new URL(workflow.workflowUrl);
    if (hostFromIntegration !== jobUrlObj.host) {
      const msg = `${ERROR_MESSAGES.JENKINS_HOST_MISMATCH}: ${jobUrlObj.host} != ${hostFromIntegration}`;
      throw new Error(msg);
    }

    const defaults = extractDefaultsFromWorkflow(workflow.parameters);
    const provided = input.jobParameters ?? {};
    const formParams: Record<string, string> = {};
    const allKeys = new Set<string>([...Object.keys(defaults), ...Object.keys(provided as Record<string, unknown>)]);
    for (const key of allKeys) {
      const value = (provided as any)[key] ?? (defaults as any)[key];
      if (value !== undefined && value !== null) formParams[key] = String(value);
    }

    const provider = await ProviderFactory.getProvider(CICDProviderType.JENKINS) as JenkinsProviderContract;
    const authHeader = 'Basic ' + Buffer.from(`${integration.username}:${integration.apiToken}`).toString('base64');
    const providerConfig2 = integration.providerConfig as Record<string, unknown> | null | undefined;
    const useCrumb = typeof providerConfig2?.useCrumb === 'boolean' ? (providerConfig2.useCrumb as boolean) : true;
    const crumbPathValue2 = providerConfig2?.crumbPath;
    const crumbPath = typeof crumbPathValue2 === 'string' ? crumbPathValue2 : PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;
    const crumbUrl = `${integration.hostUrl.endsWith('/') ? integration.hostUrl.slice(0, -1) : integration.hostUrl}${crumbPath}`;
    const req: JenkinsTriggerRequest = {
      workflowUrl: workflow.workflowUrl,
      authHeader,
      useCrumb,
      crumbUrl,
      crumbHeaderFallback: HEADERS.JENKINS_CRUMB_HEADER_FALLBACK,
      formParams
    };
    const result = await provider.triggerJob(req);
    if (!result.accepted || !result.queueLocation) throw new Error(ERROR_MESSAGES.JENKINS_TRIGGER_NO_LOCATION);
    return { queueLocation: result.queueLocation };
  };

  getQueueStatus = async (tenantId: string, queueUrl: string): Promise<'pending'|'running'|'completed'|'cancelled'> => {
    const urlObj = new URL(queueUrl);
    const integration = await this.integrationRepository.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    if (!integration) throw new Error(ERROR_MESSAGES.JENKINS_CONNECTION_NOT_FOUND);

    const hasBasicCreds = integration.authType === AuthType.BASIC && !!integration.username && !!integration.apiToken;
    if (!hasBasicCreds) throw new Error(ERROR_MESSAGES.JENKINS_BASIC_REQUIRED);

    const hostFromIntegration = new URL(integration.hostUrl).host;
    if (hostFromIntegration !== urlObj.host) {
      const msg = `${ERROR_MESSAGES.JENKINS_HOST_MISMATCH}: ${urlObj.host} != ${hostFromIntegration}`;
      throw new Error(msg);
    }

    const provider = await ProviderFactory.getProvider(CICDProviderType.JENKINS) as JenkinsProviderContract;
    const req: JenkinsQueueStatusRequest = {
      queueUrl,
      authHeader: 'Basic ' + Buffer.from(`${integration.username}:${integration.apiToken}`).toString('base64'),
      timeoutMs: Number(process.env.JENKINS_QUEUE_TIMEOUT_MS || process.env.JENKINS_PROBE_TIMEOUT_MS || 5000)
    };
    const status = await provider.getQueueStatus(req);
    return status;
  };
}


