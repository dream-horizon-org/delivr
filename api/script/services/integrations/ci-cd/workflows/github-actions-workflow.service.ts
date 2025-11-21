import { WorkflowService } from './workflow.service';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import { ProviderFactory } from '../providers/provider.factory';
import type { GitHubActionsProviderContract, GHAWorkflowInputsParams, GHARunStatusParams, GHAWorkflowDispatchParams } from '../providers/github-actions/github-actions.interface';
import { ERROR_MESSAGES, HEADERS, PROVIDER_DEFAULTS } from '../../../../controllers/integrations/ci-cd/constants';
import { parseGitHubRunUrl, parseGitHubWorkflowUrl, extractDefaultsFromWorkflow } from '../utils/cicd.utils';

export class GitHubActionsWorkflowService extends WorkflowService {
  /**
   * Resolve a GitHub token for the tenant if available from CI/CD integration.
   */
  private getGithubTokenForTenant = async (tenantId: string): Promise<string | null> => {
    const gha = await this.integrationRepository.findByTenantAndProvider(tenantId, CICDProviderType.GITHUB_ACTIONS);
    if (gha?.apiToken) return gha.apiToken as string;
    // TODO: consider retrieving token from SCM integration repository if needed
    return null;
  };

  /**
   * Read workflow file and extract workflow_dispatch inputs as parameters.
   */
  fetchWorkflowInputs = async (tenantId: string, workflowUrl: string): Promise<{ parameters: Array<{
    name: string; type: string; description?: string; defaultValue?: unknown; options?: string[]; required?: boolean;
  }>}> => {
    const token = await this.getGithubTokenForTenant(tenantId);
    if (!token) throw new Error(ERROR_MESSAGES.GHA_NO_TOKEN_AVAILABLE);
    const provider = await ProviderFactory.getProvider(CICDProviderType.GITHUB_ACTIONS) as GitHubActionsProviderContract;
    const args: GHAWorkflowInputsParams = {
      token,
      workflowUrl,
      acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
      userAgent: HEADERS.USER_AGENT,
      timeoutMs: Number(process.env.GHA_INPUTS_TIMEOUT_MS || 8000)
    };
    const result = await provider.fetchWorkflowInputs(args);
    return { parameters: result.inputs };
  };

  /**
   * Trigger a GitHub Actions workflow via workflow_dispatch.
   * Accepts either workflowId or (workflowType + platform) to resolve the workflow.
   * Attempts to find a human URL to the dispatched run for convenience.
   */
  trigger = async (tenantId: string, input: {
    workflowId?: string;
    workflowType?: string;
    platform?: string;
    jobParameters?: Record<string, unknown>;
  }): Promise<{ queueLocation: string }> => {
    const startedAtIso = new Date().toISOString();
    const hasWorkflowId = !!input.workflowId;
    const hasTypeAndPlatform = !!input.workflowType && !!input.platform;
    if (!hasWorkflowId && !hasTypeAndPlatform) {
      throw new Error(ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED);
    }

    let workflow: any;
    if (hasWorkflowId) {
      const item = await this.workflowRepository.findById(input.workflowId as string);
      const invalid = !item || item.tenantId !== tenantId || item.providerType !== CICDProviderType.GITHUB_ACTIONS;
      if (invalid) throw new Error(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
      workflow = item;
    } else {
      const items = await this.workflowRepository.findAll({
        tenantId,
        providerType: CICDProviderType.GITHUB_ACTIONS as any,
        workflowType: input.workflowType as any,
        platform: input.platform
      } as any);
      if (!items.length) throw new Error(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
      if (items.length > 1) throw new Error(ERROR_MESSAGES.WORKFLOW_MULTIPLE_FOUND);
      workflow = items[0];
    }

    const parsed = parseGitHubWorkflowUrl(workflow.workflowUrl);
    if (!parsed) {
      throw new Error(ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL);
    }

    const token = await this.getGithubTokenForTenant(tenantId);
    if (!token) throw new Error(ERROR_MESSAGES.GHA_NO_TOKEN_AVAILABLE);

    const defaults = extractDefaultsFromWorkflow(workflow.parameters);
    const provided = input.jobParameters ?? {};
    const inputs: Record<string, unknown> = {};
    const allKeys = new Set<string>([...Object.keys(defaults), ...Object.keys(provided as Record<string, unknown>)]);
    for (const key of allKeys) {
      const value = (provided as any)[key] ?? (defaults as any)[key];
      if (value !== undefined && value !== null) inputs[key] = value;
    }

    const provider = await ProviderFactory.getProvider(CICDProviderType.GITHUB_ACTIONS) as GitHubActionsProviderContract;
    const args: GHAWorkflowDispatchParams = {
      token,
      owner: parsed.owner,
      repo: parsed.repo,
      workflow: parsed.path,
      ref: parsed.ref || (process.env.GHA_DEFAULT_REF || PROVIDER_DEFAULTS.GHA_DEFAULT_REF),
      inputs,
      acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
      userAgent: HEADERS.USER_AGENT,
      timeoutMs: Number(process.env.GHA_DISPATCH_TIMEOUT_MS || 8000)
    };
    const result = await provider.triggerWorkflowDispatch(args);
    if (!result.accepted) {
      throw new Error(ERROR_MESSAGES.GHA_DISPATCH_FAILED);
    }
    const attempts = Number(process.env.GHA_RUN_POLL_ATTEMPTS || PROVIDER_DEFAULTS.GHA_RUN_POLL_ATTEMPTS);
    const delayMs = Number(process.env.GHA_RUN_POLL_DELAY_MS || PROVIDER_DEFAULTS.GHA_RUN_POLL_DELAY_MS);
    let foundUrl: string | null = null;
    for (let i = 0; i < attempts; i++) {
      const found = await provider.findLatestWorkflowDispatchRun({
        token,
        owner: parsed.owner,
        repo: parsed.repo,
        workflow: parsed.path,
        ref: args.ref,
        createdSinceIso: startedAtIso,
        acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
        userAgent: HEADERS.USER_AGENT,
        timeoutMs: Number(process.env.GHA_STATUS_TIMEOUT_MS || 8000)
      });
      if (found && found.htmlUrl) {
        foundUrl = found.htmlUrl;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    const queueLocation = foundUrl ?? PROVIDER_DEFAULTS.GHA_NO_QUEUE_LOCATION;
    return { queueLocation };
  };

  /**
   * Get normalized run status for a GitHub Actions workflow run.
   */
  getRunStatus = async (tenantId: string, input: { runUrl?: string; owner?: string; repo?: string; runId?: string; }): Promise<'pending'|'running'|'completed'> => {
    let parsed = { owner: input.owner, repo: input.repo, runId: input.runId };
    if (input.runUrl) {
      const p = parseGitHubRunUrl(input.runUrl);
      if (!p) throw new Error(ERROR_MESSAGES.GHA_INVALID_RUN_URL);
      parsed = p;
    }
    if (!parsed.owner || !parsed.repo || !parsed.runId) throw new Error(ERROR_MESSAGES.GHA_RUN_IDENTIFIERS_REQUIRED);
    const token = await this.getGithubTokenForTenant(tenantId);
    if (!token) throw new Error(ERROR_MESSAGES.GHA_NO_TOKEN_AVAILABLE);
    const provider = await ProviderFactory.getProvider(CICDProviderType.GITHUB_ACTIONS) as GitHubActionsProviderContract;
    const args: GHARunStatusParams = {
      token,
      owner: parsed.owner as string,
      repo: parsed.repo as string,
      runId: parsed.runId as string,
      acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
      userAgent: HEADERS.USER_AGENT,
      timeoutMs: Number(process.env.GHA_STATUS_TIMEOUT_MS || 8000)
    };
    const status = await provider.getRunStatus(args);
    return status;
  };
}


