import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import type { GitHubActionsProviderContract, GHAVerifyParams, GHAVerifyResult, GHAWorkflowInputsParams, GHAWorkflowInputsResult, GHARunStatusParams, GHARunStatus, GHAWorkflowDispatchParams, GHAWorkflowDispatchResult, GHAFindDispatchedRunParams, GHAFindDispatchedRunResult } from './github-actions.interface';
import { fetchWithTimeout, parseGitHubWorkflowUrl, extractWorkflowDispatchInputs, mapGitHubRunStatus } from '../../utils/cicd.utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../../../controllers/integrations/ci-cd/constants';

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

  triggerWorkflowDispatch = async (params: GHAWorkflowDispatchParams): Promise<GHAWorkflowDispatchResult> => {
    const { token, owner, repo, workflow, ref, inputs, acceptHeader, userAgent, timeoutMs } = params;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': acceptHeader,
      'User-Agent': userAgent,
      'Content-Type': 'application/json'
    };
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;
    const resp = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify({ ref, inputs }) }, timeoutMs);
    if (resp.status === 204) {
      return { accepted: true };
    }
    const txt = await resp.text().catch(() => '');
    const errorMessage = `${ERROR_MESSAGES.GHA_DISPATCH_FAILED}${txt ? `: ${txt}` : ''}`;
    throw new Error(errorMessage);
  };

  findLatestWorkflowDispatchRun = async (params: GHAFindDispatchedRunParams): Promise<GHAFindDispatchedRunResult> => {
    const { token, owner, repo, workflow, ref, createdSinceIso, acceptHeader, userAgent, timeoutMs } = params;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': acceptHeader,
      'User-Agent': userAgent
    };
    const base = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs`;
    const qs = new URLSearchParams();
    qs.set('event', 'workflow_dispatch');
    qs.set('branch', ref);
    qs.set('created', `>=${createdSinceIso}`);
    qs.set('per_page', '1');
    const url = `${base}?${qs.toString()}`;
    const resp = await fetchWithTimeout(url, { headers }, timeoutMs);
    if (!resp.ok) {
      const _ = await resp.text().catch(() => '');
      return null;
    }
    const json: any = await resp.json();
    const first = Array.isArray(json?.workflow_runs) && json.workflow_runs.length > 0 ? json.workflow_runs[0] : null;
    if (!first) return null;
    const id = first?.id;
    const html = first?.html_url;
    const idValid = typeof id === 'number' || typeof id === 'string';
    const htmlValid = typeof html === 'string' && html.length > 0;
    if (!idValid || !htmlValid) return null;
    return { runId: String(id), htmlUrl: html };
  };
}


