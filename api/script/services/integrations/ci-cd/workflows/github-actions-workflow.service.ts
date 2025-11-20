import { WorkflowService } from './workflow.service';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import { ProviderFactory } from '../providers/provider.factory';
import type { GitHubActionsProviderContract, GHAWorkflowInputsParams, GHARunStatusParams } from '../providers/github-actions/github-actions.interface';
import { ERROR_MESSAGES, HEADERS } from '../../../../constants/cicd';
import { parseGitHubRunUrl } from '../../../../utils/cicd';

export class GitHubActionsWorkflowService extends WorkflowService {
  private getGithubTokenForTenant = async (tenantId: string): Promise<string | null> => {
    const gha = await this.integrationRepository.findByTenantAndProvider(tenantId, CICDProviderType.GITHUB_ACTIONS);
    if (gha?.apiToken) return gha.apiToken as string;
    // TODO: consider retrieving token from SCM integration repository if needed
    return null;
  };

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


