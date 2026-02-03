import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import type { GitHubActionsProviderContract, GHAVerifyParams, GHAVerifyResult, GHAWorkflowInputsParams, GHAWorkflowInputsResult, GHARunStatusParams, GHAWorkflowDispatchParams, GHAWorkflowDispatchResult, GHAFindDispatchedRunParams, GHAFindDispatchedRunResult } from './github-actions.interface';
import { fetchWithTimeout, parseGitHubWorkflowUrl, extractWorkflowDispatchInputs, mapGitHubRunStatus, extractWorkflowFilename } from '../../utils/cicd.utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../../../controllers/integrations/ci-cd/constants';
import { WorkflowStatus } from '~controllers/integrations/ci-cd/workflows/workflow-adapter.utils';

export class GitHubActionsProvider implements GitHubActionsProviderContract {
  readonly type = CICDProviderType.GITHUB_ACTIONS;

  /**
   * Verify a GitHub token by probing the /user endpoint.
   *
   * @returns Verification result with human-readable message.
   */
  verifyConnection = async (params: GHAVerifyParams): Promise<GHAVerifyResult> => {
    const { apiToken, githubApiBase, userAgent, acceptHeader, timeoutMs } = params;

    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': acceptHeader,
      'User-Agent': userAgent
    };

    try {
      const userResp = await fetchWithTimeout(`${githubApiBase}/user`, { headers }, timeoutMs);
      
      if (!userResp.ok) {
        const status = userResp.status;
        const statusText = userResp.statusText;
        
        // Handle specific HTTP status codes
        if (status === 401) {
          return {
            success: false,
            message: 'Invalid GitHub token. Please verify your token is correct.',
            statusCode: 401,
            errorCode: 'invalid_credentials',
            details: ['Generate a new personal access token or fine-grained token from GitHub → Settings → Developer settings → Tokens']
          };
        }
        
        if (status === 403) {
          return {
            success: false,
            message: 'GitHub token is valid but lacks required permissions.',
            statusCode: 403,
            errorCode: 'insufficient_permissions',
            details: ['Ensure your token has the following scopes: repo, workflow, read:org']
          };
        }
        
        if (status === 404) {
          return {
            success: false,
            message: 'GitHub API endpoint not found. Please verify the API base URL.',
            statusCode: 404,
            errorCode: 'api_not_found',
            details: ['Check that you are using the correct GitHub API endpoint (https://api.github.com)']
          };
        }
        
        if (status >= 500 && status < 600) {
          return {
            success: false,
            message: `GitHub service temporarily unavailable (${status}). Please try again later.`,
            statusCode: 503,
            errorCode: 'service_unavailable',
            details: ['GitHub servers are experiencing issues. This is not a token problem - retry in a few minutes.']
          };
        }
        
        return {
          success: false,
          message: `GitHub API error (${status}): ${statusText}`,
          statusCode: status,
          errorCode: 'api_error',
          details: [statusText]
        };
      }
      
      return { success: true, message: SUCCESS_MESSAGES.VERIFIED };
    } catch (e: any) {
      const isTimeout = e && (e.name === 'AbortError' || e.code === 'ABORT_ERR');
      if (isTimeout) {
        return {
          success: false,
          message: 'Connection timeout. Please check your GitHub token and try again.',
          statusCode: 408,
          errorCode: 'timeout',
          details: ['The request took too long to complete. Verify GitHub API is accessible and responding']
        };
      }
      
      const errorMessage = e?.message ? String(e.message) : 'Unknown error';
      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
        statusCode: 503,
        errorCode: 'network_error',
        details: ['Unable to reach GitHub API. Check your internet connection and try again']
      };
    }
  };

  /**
   * Fetch workflow_dispatch inputs by reading workflow file contents and extracting inputs.
   */
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

  /**
   * Get normalized run status for a workflow run.
   */
  getRunStatus = async (params: GHARunStatusParams): Promise<WorkflowStatus> => {
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

  /**
   * Trigger workflow_dispatch for a workflow path on a ref with optional inputs.
   * Returns accepted=true with optional run information if GitHub provides it.
   */
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
    
    const statusIsNoContent = resp.status === 204;
    if (statusIsNoContent) {
      return { accepted: true };
    }
    
    const statusIsSuccess = resp.status === 200 || resp.status === 201;
    if (statusIsSuccess) {
      const responseText = await resp.text().catch(() => '');
      const responseIsEmpty = !responseText || responseText.trim().length === 0;
      
      if (responseIsEmpty) {
        return { accepted: true };
      }
      
      try {
        const responseJson = JSON.parse(responseText) as {
          workflow_run_id?: number | string;
          run_url?: string;
          html_url?: string;
        };
        
        const workflowRunId = responseJson.workflow_run_id;
        const runUrl = responseJson.run_url;
        const htmlUrl = responseJson.html_url;
        
        const hasRunInfo = workflowRunId !== undefined || runUrl !== undefined || htmlUrl !== undefined;
        
        if (hasRunInfo) {
          return {
            accepted: true,
            htmlUrl
          };
        }
        
        return { accepted: true };
      } catch {
        return { accepted: true };
      }
    }
    
    const errorText = await resp.text().catch(() => '');
    const errorMessage = `${ERROR_MESSAGES.GHA_DISPATCH_FAILED}${errorText ? `: ${errorText}` : ''}`;
    throw new Error(errorMessage);
  };

  /**
   * Find latest workflow_dispatch run created since a timestamp.
   * Used to surface an HTML URL to the run after dispatch.
   */
  findLatestWorkflowDispatchRun = async (params: GHAFindDispatchedRunParams): Promise<GHAFindDispatchedRunResult> => {
    const { token, owner, repo, workflow, ref, createdSinceIso, acceptHeader, userAgent, timeoutMs } = params;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': acceptHeader,
      'User-Agent': userAgent
    };
    
    // GitHub workflow runs API expects just the filename, not the full path
    const workflowFilename = extractWorkflowFilename(workflow);
    
    const base = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFilename)}/runs`;
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


