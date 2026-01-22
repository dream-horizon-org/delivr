import { WorkflowService } from './workflow.service';
import { CICDProviderType, AuthType } from '~types/integrations/ci-cd/connection.interface';
import { ProviderFactory } from '../providers/provider.factory';
import type {
  JenkinsProviderContract,
  JenkinsJobParamsRequest,
  JenkinsTriggerRequest,
  JenkinsQueueStatusRequest,
  JenkinsQueueStatusResult,
  JenkinsBuildStatusRequest,
  JenkinsBuildStatusResult
} from '../providers/jenkins/jenkins.interface';
import { PROVIDER_DEFAULTS, HEADERS, ERROR_MESSAGES } from '../../../../controllers/integrations/ci-cd/constants';
import { normalizePlatform, mergeWorkflowInputs } from '../utils/cicd.utils';
import { getEnvNumber, ENV_DEFAULTS } from '~constants/env';

export class JenkinsWorkflowService extends WorkflowService {
  /**
   * Discover parameter definitions for a Jenkins job URL.
   * Validates tenant credentials and host match before forwarding to provider.
   */
  fetchJobParameters = async (tenantId: string, workflowUrl: string): Promise<{ parameters: Array<{
    name: string; type: 'boolean' | 'string' | 'choice'; description?: string; defaultValue?: unknown; options?: string[];
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

  /**
   * Trigger a Jenkins job with parameters.
   * Accepts either workflowId or (workflowType + platform) to resolve the workflow.
   * Validates Jenkins BASIC credentials and host alignment.
   */
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

    // Merge workflow defaults with provided job parameters, converting to strings for Jenkins form
    const formParams = mergeWorkflowInputs(workflow.parameters, input.jobParameters, String);

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

  /**
   * Poll Jenkins queue status and return status with executable URL when available.
   * The executableUrl is the ciRunId that should be stored in the build table.
   * 
   * @param tenantId - Tenant identifier for credential lookup
   * @param queueUrl - Jenkins queue item URL (queueLocation from trigger)
   * @returns Status and executableUrl (ciRunId) when job has started
   */
  getQueueStatus = async (tenantId: string, queueUrl: string): Promise<JenkinsQueueStatusResult> => {
    const urlObj = new URL(queueUrl);
    const integration = await this.integrationRepository.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    const integrationNotFound = !integration;
    if (integrationNotFound) {
      throw new Error(ERROR_MESSAGES.JENKINS_CONNECTION_NOT_FOUND);
    }

    const hasBasicCreds = integration.authType === AuthType.BASIC && !!integration.username && !!integration.apiToken;
    const missingCreds = !hasBasicCreds;
    if (missingCreds) {
      throw new Error(ERROR_MESSAGES.JENKINS_BASIC_REQUIRED);
    }

    const hostFromIntegration = new URL(integration.hostUrl).host;
    const hostMismatch = hostFromIntegration !== urlObj.host;
    if (hostMismatch) {
      const msg = `${ERROR_MESSAGES.JENKINS_HOST_MISMATCH}: ${urlObj.host} != ${hostFromIntegration}`;
      throw new Error(msg);
    }

    const provider = await ProviderFactory.getProvider(CICDProviderType.JENKINS) as JenkinsProviderContract;
    const timeoutMs = getEnvNumber('JENKINS_QUEUE_TIMEOUT_MS', ENV_DEFAULTS.JENKINS_QUEUE_TIMEOUT_MS);
    const req: JenkinsQueueStatusRequest = {
      queueUrl,
      authHeader: 'Basic ' + Buffer.from(`${integration.username}:${integration.apiToken}`).toString('base64'),
      timeoutMs
    };
    const result = await provider.getQueueStatus(req);
    return result;
  };

  /**
   * Check status of a running Jenkins build using its build URL (ciRunId).
   * Use this after a build has started running (when you have ciRunId from getQueueStatus).
   * 
   * @param tenantId - Tenant identifier for credential lookup
   * @param buildUrl - Jenkins build URL (ciRunId from build table)
   * @returns Build status (running, completed, failed) and result info
   */
  getBuildStatus = async (tenantId: string, buildUrl: string): Promise<JenkinsBuildStatusResult> => {
    const urlObj = new URL(buildUrl);
    const integration = await this.integrationRepository.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    const integrationNotFound = !integration;
    if (integrationNotFound) {
      throw new Error(ERROR_MESSAGES.JENKINS_CONNECTION_NOT_FOUND);
    }

    const hasBasicCreds = integration.authType === AuthType.BASIC && !!integration.username && !!integration.apiToken;
    const missingCreds = !hasBasicCreds;
    if (missingCreds) {
      throw new Error(ERROR_MESSAGES.JENKINS_BASIC_REQUIRED);
    }

    const hostFromIntegration = new URL(integration.hostUrl).host;
    const hostMismatch = hostFromIntegration !== urlObj.host;
    if (hostMismatch) {
      const msg = `${ERROR_MESSAGES.JENKINS_HOST_MISMATCH}: ${urlObj.host} != ${hostFromIntegration}`;
      throw new Error(msg);
    }

    const provider = await ProviderFactory.getProvider(CICDProviderType.JENKINS) as JenkinsProviderContract;
    const timeoutMs = getEnvNumber('JENKINS_BUILD_TIMEOUT_MS', ENV_DEFAULTS.JENKINS_BUILD_TIMEOUT_MS);
    const req: JenkinsBuildStatusRequest = {
      buildUrl,
      authHeader: 'Basic ' + Buffer.from(`${integration.username}:${integration.apiToken}`).toString('base64'),
      timeoutMs
    };
    const result = await provider.getBuildStatus(req);
    return result;
  };
}


