import fetch from 'node-fetch';
import { CICDProviderType } from '../../../../../storage/integrations/ci-cd/ci-cd-types';
import type { JenkinsProviderContract, JenkinsVerifyParams, JenkinsVerifyResult, JenkinsJobParamsRequest, JenkinsJobParamsResult } from './jenkins.interface';
import { fetchWithTimeout, sanitizeJoin, appendApiJson, extractJenkinsParameters } from '../../../../../utils/cicd';
import { HEADERS, PROVIDER_DEFAULTS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../../../../constants/cicd';

export class JenkinsProvider implements JenkinsProviderContract {
  readonly type = CICDProviderType.JENKINS;

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

  fetchJobParameters = async (req: JenkinsJobParamsRequest): Promise<JenkinsJobParamsResult> => {
    const { jobUrl, authHeader, useCrumb, crumbUrl, crumbHeaderFallback } = req;

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
      jobUrl,
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
      return {
        name: p.name as string,
        type: normalizedType,
        description: p.description,
        defaultValue: p.defaultValue,
        choices: Array.isArray(p.choices) ? p.choices : undefined
      };
    });
    return { parameters };
  };

  triggerJob = async (req) => {
    const { jobUrl, authHeader, useCrumb, crumbUrl, crumbHeaderFallback, formParams } = req;
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

    const triggerUrl = (jobUrl.endsWith('/') ? jobUrl : jobUrl + '/') + 'buildWithParameters';
    const triggerResp = await fetch(triggerUrl, { method: 'POST', headers, body: form });
    const accepted = triggerResp.status === 201 || triggerResp.status === 200;
    if (accepted) {
      const queueLocation = triggerResp.headers.get('location') || undefined;
      return { accepted: true, queueLocation, status: triggerResp.status, statusText: triggerResp.statusText };
    }
    const errorText = await triggerResp.text().catch(() => '');
    return { accepted: false, status: triggerResp.status, statusText: triggerResp.statusText, errorText };
  };

  getQueueStatus = async (req) => {
    const { queueUrl, authHeader, timeoutMs } = req;
    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'Accept': HEADERS.ACCEPT_JSON
    };
    const queueApi = (queueUrl.endsWith('/') ? queueUrl : queueUrl + '/') + 'api/json';
    const qResp = await fetchWithTimeout(queueApi, { headers }, timeoutMs);
    if (!qResp.ok) {
      // Treat fetch failure as pending to allow polling to continue
      return 'pending';
    }
    const qJson: any = await qResp.json();
    if (qJson.cancelled) return 'cancelled';
    if (qJson.blocked === true) return 'pending';
    const executable = qJson.executable;
    if (executable && executable.url) {
      const buildUrl: string = executable.url.endsWith('/') ? executable.url : executable.url + '/';
      const buildApi = buildUrl + 'api/json';
      const bResp = await fetchWithTimeout(buildApi, { headers }, timeoutMs);
      if (!bResp.ok) return 'running';
      const bJson: any = await bResp.json();
      const building = !!bJson.building;
      return building ? 'running' : 'completed';
    }
    return 'pending';
  };
}


