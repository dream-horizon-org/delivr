import { WorkflowService } from './workflow.service';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import { ProviderFactory } from '../providers/provider.factory';
import type { GitHubActionsProviderContract, GHAWorkflowInputsParams, GHARunStatusParams, GHAWorkflowDispatchParams } from '../providers/github-actions/github-actions.interface';
import { ERROR_MESSAGES, HEADERS, PROVIDER_DEFAULTS } from '../../../../controllers/integrations/ci-cd/constants';
import { parseGitHubRunUrl, parseGitHubWorkflowUrl, mergeWorkflowInputs, fetchWithTimeout, extractWorkflowFilename, validateGitHubWorkflowUrl } from '../utils/cicd.utils';
import { WorkflowStatus } from '~controllers/integrations/ci-cd/workflows/workflow-adapter.utils';

export class GitHubActionsWorkflowService extends WorkflowService {
  /**
   * Resolve a GitHub token for the tenant if available from CI/CD integration.
   */
  private getGithubTokenForTenant = async (appId: string): Promise<string | null> => {
    const gha = await this.integrationRepository.findByTenantAndProvider(appId, CICDProviderType.GITHUB_ACTIONS);
    if (gha?.apiToken) return gha.apiToken as string;
    // TODO: consider retrieving token from SCM integration repository if needed
    return null;
  };

  /**
   * Fetch the default branch for a GitHub repository.
   * Falls back to environment variable or hardcoded default if API call fails.
   */
  private getDefaultBranch = async (token: string, owner: string, repo: string): Promise<string> => {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': HEADERS.ACCEPT_GITHUB_JSON,
        'User-Agent': HEADERS.USER_AGENT
      };
      const timeoutMs = Number(process.env.GHA_STATUS_TIMEOUT_MS || 8000);
      
      const response = await fetchWithTimeout(url, { headers }, timeoutMs);
      if (response.ok) {
        const data = await response.json();
        const defaultBranch = data.default_branch;
        if (defaultBranch && typeof defaultBranch === 'string') {
          return defaultBranch;
        }
      }
    } catch (error) {
      console.warn(`[GitHub Actions] Failed to fetch default branch for ${owner}/${repo}, using fallback:`, error);
    }
    
    // Fallback to environment variable or hardcoded default
    return process.env.GHA_DEFAULT_REF || PROVIDER_DEFAULTS.GHA_DEFAULT_REF;
  };

  /**
   * Read workflow file and extract workflow_dispatch inputs as parameters.
   */
  fetchWorkflowInputs = async (appId: string, workflowUrl: string): Promise<{ parameters: Array<{
    name: string; type: string; description?: string; defaultValue?: unknown; options?: string[]; required?: boolean;
  }>}> => {
    validateGitHubWorkflowUrl(workflowUrl);
    
    const token = await this.getGithubTokenForTenant(appId);
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
  trigger = async (appId: string, input: {
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
      const invalid = !item || item.appId !== appId || item.providerType !== CICDProviderType.GITHUB_ACTIONS;
      if (invalid) throw new Error(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
      workflow = item;
    } else {
      const items = await this.workflowRepository.findAll({
        appId,
        providerType: CICDProviderType.GITHUB_ACTIONS as any,
        workflowType: input.workflowType as any,
        platform: input.platform
      } as any);
      if (!items.length) throw new Error(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
      if (items.length > 1) throw new Error(ERROR_MESSAGES.WORKFLOW_MULTIPLE_FOUND);
      workflow = items[0];
    }

    validateGitHubWorkflowUrl(workflow.workflowUrl);
    
    const parsed = parseGitHubWorkflowUrl(workflow.workflowUrl);
    if (!parsed) {
      throw new Error(ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL);
    }

    const token = await this.getGithubTokenForTenant(appId);
    if (!token) throw new Error(ERROR_MESSAGES.GHA_NO_TOKEN_AVAILABLE);

    // Merge workflow defaults with provided job parameters (ignores extra keys from overrides)
    const inputs = mergeWorkflowInputs(workflow.parameters, input.jobParameters);

    // If no ref in URL (actions format), fetch default branch
    const ref = parsed.ref;
    const finalRef = ref ?? await this.getDefaultBranch(token, parsed.owner, parsed.repo);

    const provider = await ProviderFactory.getProvider(CICDProviderType.GITHUB_ACTIONS) as GitHubActionsProviderContract;
    
    // GitHub workflow dispatch API expects just the filename, not the full path
    // Both URL formats (actions/workflows/X and blob/ref/.github/workflows/X) are normalized to full path by parser
    const workflowFilename = extractWorkflowFilename(parsed.path);
    
    const args: GHAWorkflowDispatchParams = {
      token,
      owner: parsed.owner,
      repo: parsed.repo,
      workflow: workflowFilename,
      ref: finalRef,
      inputs,
      acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
      userAgent: HEADERS.USER_AGENT,
      timeoutMs: Number(process.env.GHA_DISPATCH_TIMEOUT_MS || 8000)
    };
    const result = await provider.triggerWorkflowDispatch(args);
    if (!result.accepted) {
      throw new Error(ERROR_MESSAGES.GHA_DISPATCH_FAILED);
    }
    
    const htmlUrlFromDispatch = result.htmlUrl;
    const hasUrlFromDispatch = htmlUrlFromDispatch !== undefined && htmlUrlFromDispatch !== null && htmlUrlFromDispatch.length > 0;
    
    if (hasUrlFromDispatch) {
      return { queueLocation: htmlUrlFromDispatch };
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
    const queueLocation = foundUrl;
    if (!queueLocation) throw new Error(ERROR_MESSAGES.GHA_DISPATCH_FAILED);
    return { queueLocation };
  };

  /**
   * Get normalized run status for a GitHub Actions workflow run.
   * 
   * @returns 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
   */
  getRunStatus = async (appId: string, input: { runUrl?: string; owner?: string; repo?: string; runId?: string; }): Promise<WorkflowStatus> => {
    let parsed = { owner: input.owner, repo: input.repo, runId: input.runId };
    if (input.runUrl) {
      const p = parseGitHubRunUrl(input.runUrl);
      if (!p) throw new Error(ERROR_MESSAGES.GHA_INVALID_RUN_URL);
      parsed = p;
    }
    if (!parsed.owner || !parsed.repo || !parsed.runId) throw new Error(ERROR_MESSAGES.GHA_RUN_IDENTIFIERS_REQUIRED);
    const token = await this.getGithubTokenForTenant(appId);
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


