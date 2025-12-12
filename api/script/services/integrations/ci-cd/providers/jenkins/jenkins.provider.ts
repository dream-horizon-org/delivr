import fetch from 'node-fetch';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import type {
  JenkinsProviderContract,
  JenkinsVerifyParams,
  JenkinsVerifyResult,
  JenkinsJobParamsRequest,
  JenkinsJobParamsResult,
  JenkinsQueueStatusResult,
  JenkinsBuildStatusRequest,
  JenkinsBuildStatusResult
} from './jenkins.interface';
import { JENKINS_BUILD_RESULTS } from './jenkins.interface';
import { fetchWithTimeout, sanitizeJoin, appendApiJson, extractJenkinsParameters } from '../../utils/cicd.utils';
import { HEADERS, PROVIDER_DEFAULTS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../../../../controllers/integrations/ci-cd/constants';

export class JenkinsProvider implements JenkinsProviderContract {
  readonly type = CICDProviderType.JENKINS;

  /**
   * Verify Jenkins connectivity (optionally fetches crumb) and probe /api/json.
   */
  verifyConnection = async (params: JenkinsVerifyParams): Promise<JenkinsVerifyResult> => {
    const { hostUrl, username, apiToken, useCrumb, crumbPath } = params;

    const headers: Record<string, string> = {
      'Authorization': 'Basic ' + Buffer.from(`${username}:${apiToken}`).toString('base64'),
      'Accept': HEADERS.ACCEPT_JSON
    };

    try {
      const timeoutMs = Number(process.env.JENKINS_PROBE_TIMEOUT_MS || 2000);

      if (useCrumb) {
        const crumbResp = await fetchWithTimeout(sanitizeJoin(hostUrl, crumbPath), { headers }, timeoutMs);
        if (crumbResp.ok) {
          const crumbJson: any = await crumbResp.json();
          const field = crumbJson.crumbRequestField || HEADERS.JENKINS_CRUMB_HEADER_FALLBACK;
          const crumb = crumbJson.crumb;
          if (crumb) {
            (headers as any)[field] = crumb;
          }
        }
      }

      const resp = await fetchWithTimeout(sanitizeJoin(hostUrl, '/api/json'), { headers }, timeoutMs);
      if (!resp.ok) {
        return { isValid: false, message: `Jenkins API error: ${resp.status} ${resp.statusText}` };
      }

      return { isValid: true, message: SUCCESS_MESSAGES.VERIFIED };
    } catch (e: any) {
      const isTimeout = e && (e.name === 'AbortError' || e.code === 'ABORT_ERR');
      if (isTimeout) {
        return { isValid: false, message: ERROR_MESSAGES.JENKINS_QUEUE_TIMEOUT };
      }
      const message = e?.message ? String(e.message) : 'Unknown error';
      return { isValid: false, message: `Connection failed: ${message}` };
    }
  };

  /**
   * Discover job parameter definitions from a Jenkins job URL.
   * Attempts crumb retrieval when configured; ignores crumb failures for GET.
   */
  fetchJobParameters = async (req: JenkinsJobParamsRequest): Promise<JenkinsJobParamsResult> => {
    const { workflowUrl, authHeader, useCrumb, crumbUrl, crumbHeaderFallback } = req;

    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'Accept': HEADERS.ACCEPT_JSON
    };

    // Optional crumb (ignore failures for GET)
    if (useCrumb) {
      try {
        const crumbResp = await fetch(crumbUrl, { headers });
        if (crumbResp.ok) {
          const crumbJson: any = await crumbResp.json();
          const field = crumbJson.crumbRequestField || crumbHeaderFallback;
          const crumb = crumbJson.crumb;
          if (crumb) {
            (headers as any)[field] = crumb;
          }
        }
      } catch {
        // ignore crumb errors for GET
      }
    }

    const jobApiUrl = appendApiJson(
      workflowUrl,
      'property[parameterDefinitions[name,type,description,defaultParameterValue[value],choices[*]]]'
    );
    const resp = await fetch(jobApiUrl, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      const message = `${ERROR_MESSAGES.JENKINS_FETCH_PARAMS_FAILED}: ${text}`;
      throw new Error(message);
    }
    const json = await resp.json();
    const rawParams = extractJenkinsParameters(json);
    const parameters = rawParams.map((p: any) => {
      const isBoolean = p.type === 'boolean';
      const isChoice = p.type === 'choice';
      const normalizedType: 'boolean' | 'string' | 'choice' = isBoolean ? 'boolean' : (isChoice ? 'choice' : 'string');
      // Normalize Jenkins 'choices' to 'options' for consistency across providers
      const choicesArray = Array.isArray(p.choices) ? p.choices : undefined;
      return {
        name: p.name as string,
        type: normalizedType,
        description: p.description,
        defaultValue: p.defaultValue,
        options: choicesArray  // Use 'options' for consistency (Jenkins calls it 'choices')
      };
    });
    return { parameters };
  };

  /**
   * Trigger Jenkins job with parameters. Returns queue location on success.
   */
  triggerJob = async (req) => {
    const { workflowUrl, authHeader, useCrumb, crumbUrl, crumbHeaderFallback, formParams } = req;
    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'Accept': HEADERS.ACCEPT_JSON,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    if (useCrumb) {
      try {
        const crumbResp = await fetch(crumbUrl, { headers });
        if (crumbResp.ok) {
          const crumbJson: any = await crumbResp.json();
          const field = crumbJson.crumbRequestField || crumbHeaderFallback;
          const crumb = crumbJson.crumb;
          if (crumb) {
            (headers as any)[field] = crumb;
          }
        }
      } catch {
        // continue without crumb
      }
    }

    const form = new URLSearchParams();
    Object.entries(formParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v));
    });

    const triggerUrl = (workflowUrl.endsWith('/') ? workflowUrl : workflowUrl + '/') + 'buildWithParameters';
    const triggerResp = await fetch(triggerUrl, { method: 'POST', headers, body: form });
    const accepted = triggerResp.status === 201 || triggerResp.status === 200;
    if (accepted) {
      const queueLocation = triggerResp.headers.get('location') || undefined;
      return { accepted: true, queueLocation, status: triggerResp.status, statusText: triggerResp.statusText };
    }
    const errorText = await triggerResp.text().catch(() => '');
    return { accepted: false, status: triggerResp.status, statusText: triggerResp.statusText, errorText };
  };

  /**
   * Poll queue item and return status with executable URL when available.
   * The executableUrl is the actual build URL (ciRunId) that should be stored
   * in the build table for subsequent status checks.
   * 
   * Jenkins Queue API behavior:
   * - Queue item exists while job is waiting or just started
   * - Queue item is deleted after job starts (Jenkins cleans up old items)
   * - 404 on queue item usually means job started and queue was cleaned up
   */
  getQueueStatus = async (req): Promise<JenkinsQueueStatusResult> => {
    const { queueUrl, authHeader, timeoutMs } = req;
    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'Accept': HEADERS.ACCEPT_JSON
    };
    const queueApi = (queueUrl.endsWith('/') ? queueUrl : queueUrl + '/') + 'api/json';
    const qResp = await fetchWithTimeout(queueApi, { headers }, timeoutMs);
    const fetchFailed = !qResp.ok;
    if (fetchFailed) {
      // 404 = Queue item no longer exists (job started and queue was cleaned up, or cancelled)
      // Other errors = Treat as temporary, return pending to retry
      const isNotFound = qResp.status === 404;
      if (isNotFound) {
        // Queue item expired - job either started (and we missed it) or was cancelled
        // Return 'cancelled' so we don't keep polling a non-existent queue item
        // The build's workflowStatus will be marked FAILED
        return { status: 'cancelled' };
      }
      return { status: 'pending' };
    }
    const qJson: any = await qResp.json();
    const isCancelled = !!qJson.cancelled;
    if (isCancelled) {
      return { status: 'cancelled' };
    }
    const isBlocked = qJson.blocked === true;
    if (isBlocked) {
      return { status: 'pending' };
    }
    const executable = qJson.executable;
    const hasExecutableUrl = executable && executable.url;
    if (hasExecutableUrl) {
      // Job has started - return the executableUrl (ciRunId)
      const executableUrl: string = executable.url.endsWith('/') ? executable.url : executable.url + '/';
      const buildApi = executableUrl + 'api/json';
      const bResp = await fetchWithTimeout(buildApi, { headers }, timeoutMs);
      const buildFetchFailed = !bResp.ok;
      if (buildFetchFailed) {
        // Can't fetch build info, but job has started - return running with URL
        return { status: 'running', executableUrl };
      }
      const bJson: any = await bResp.json();
      const isBuilding = !!bJson.building;
      // Note: We don't check SUCCESS/FAILURE here - that's getBuildStatus's job
      // getQueueStatus just reports: pending → running → completed
      const status = isBuilding ? 'running' : 'completed';
      return { status, executableUrl };
    }
    return { status: 'pending' };
  };

  /**
   * Check status of a running Jenkins build using its build URL (ciRunId).
   * Use this after a build has started (when you have executableUrl from getQueueStatus).
   */
  getBuildStatus = async (req: JenkinsBuildStatusRequest): Promise<JenkinsBuildStatusResult> => {
    const { buildUrl, authHeader, timeoutMs } = req;
    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'Accept': HEADERS.ACCEPT_JSON
    };
    const buildApi = (buildUrl.endsWith('/') ? buildUrl : buildUrl + '/') + 'api/json';
    const bResp = await fetchWithTimeout(buildApi, { headers }, timeoutMs);
    const fetchFailed = !bResp.ok;
    if (fetchFailed) {
      // Can't fetch build info - assume still running
      return { status: 'running' };
    }
    const bJson: any = await bResp.json();
    const isBuilding = !!bJson.building;
    if (isBuilding) {
      return { status: 'running' };
    }
    // Build is complete - SUCCESS = completed, anything else = failed
    const result = bJson.result as string | null;
    const isSuccess = result === JENKINS_BUILD_RESULTS.SUCCESS;
    const status = isSuccess ? 'completed' : 'failed';
    return { status };
  };
}


