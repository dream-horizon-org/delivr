import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import type { GitHubActionsProviderContract, GHAVerifyParams, GHAVerifyResult, GHAWorkflowInputsParams, GHAWorkflowInputsResult, GHARunStatusParams, GHARunStatus } from './github-actions.interface';
import { fetchWithTimeout, parseGitHubWorkflowUrl, extractWorkflowDispatchInputs, mapGitHubRunStatus } from '../../../../../utils/cicd';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../../../constants/cicd';

export class GitHubActionsProvider implements GitHubActionsProviderContract {
  readonly type = CICDProviderType.GITHUB_ACTIONS;

  verifyConnection = async (params: GHAVerifyParams): Promise<GHAVerifyResult> => {
    const { apiToken, githubApiBase, userAgent, acceptHeader, timeoutMs } = params;

    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': acceptHeader,
      'User-Agent': userAgent
    };

    try {
      const userResp = await fetchWithTimeout(`${githubApiBase}/user`, { headers }, timeoutMs);
      const tokenInvalid = !userResp.ok;
      if (tokenInvalid) {
        return { isValid: false, message: ERROR_MESSAGES.INVALID_GITHUB_TOKEN };
      }
    } catch {
      return { isValid: false, message: ERROR_MESSAGES.FAILED_VERIFY_GHA };
    }

    return { isValid: true, message: SUCCESS_MESSAGES.VERIFIED };
  };

  fetchWorkflowInputs = async (params: GHAWorkflowInputsParams): Promise<GHAWorkflowInputsResult> => {
    const { token, workflowUrl, acceptHeader, userAgent, timeoutMs } = params;
    const parsed = parseGitHubWorkflowUrl(workflowUrl);
    if (!parsed) {
      throw new Error(ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL);
    }
    const { owner, repo, path, ref } = parsed;
    const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': acceptHeader, 'User-Agent': userAgent };
    const contentResp = await fetchWithTimeout(contentUrl, { headers }, timeoutMs);
    if (!contentResp.ok) {
      const txt = await contentResp.text().catch(() => '');
      const errorMessage = `${ERROR_MESSAGES.GHA_FETCH_INPUTS_FAILED}: ${txt}`;
      throw new Error(errorMessage);
    }
    const contentJson: any = await contentResp.json();
    const fileContent = Buffer.from(contentJson.content || '', contentJson.encoding || 'base64').toString('utf8');
    const inputs = extractWorkflowDispatchInputs(fileContent);
    return { inputs };
  };

  getRunStatus = async (params: GHARunStatusParams): Promise<GHARunStatus> => {
    const { token, owner, repo, runId, acceptHeader, userAgent, timeoutMs } = params;
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': acceptHeader, 'User-Agent': userAgent };
    const runUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`;
    const runResp = await fetchWithTimeout(runUrl, { headers }, timeoutMs);
    if (!runResp.ok) {
      throw new Error(ERROR_MESSAGES.GHA_FETCH_RUN_FAILED);
    }
    const runJson: any = await runResp.json();
    const mapped = mapGitHubRunStatus(runJson.status, runJson.conclusion);
    return mapped;
  };
}


