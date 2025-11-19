import { Request, Response } from "express";
import fetch from "node-fetch";
import { getStorage } from "../../storage/storage-instance";
import { CICDIntegrationController } from "../../storage/integrations/ci-cd/ci-cd-controller";
import { CICDWorkflowController } from "../../storage/integrations/ci-cd/workflows-controller";
import { CreateWorkflowDto, UpdateWorkflowDto, WorkflowType, CICDProviderType as Provider } from "../../storage/integrations/ci-cd/workflows-types";
import { 
  CICDProviderType, 
  AuthType, 
  VerificationStatus, 
  CreateCICDIntegrationDto, 
  UpdateCICDIntegrationDto, 
  SafeCICDIntegration
} from "../../storage/integrations/ci-cd/ci-cd-types";
import { HTTP_STATUS, RESPONSE_STATUS, CONTENT_TYPE } from "../../constants/http";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, PROVIDER_DEFAULTS, HEADERS } from "../../constants/cicd";
import {
  normalizePlatform,
  getErrorMessage,
  fetchWithTimeout,
  sanitizeJoin,
  appendApiJson,
  extractJenkinsParameters,
  ensureTrailingSlash,
  parseGitHubWorkflowUrl,
  extractWorkflowDispatchInputs,
  parseGitHubRunUrl,
  mapGitHubRunStatus,
  extractDefaultsFromWorkflow
} from "../../utils/cicd";

const getCICDController = (): CICDIntegrationController => {
  const storage = getStorage();
  return (storage as any).cicdController;
};

const getWorkflowController = (): CICDWorkflowController => {
  const storage = getStorage();
  return (storage as any).cicdWorkflowController;
};


// ============================================================================
// JENKINS: FETCH JOB PARAMETERS
// GET /tenants/:tenantId/integrations/ci-cd/jenkins/job-parameters
// Body: { jobUrl: string }
// ============================================================================
export async function fetchJenkinsJobParameters(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const { jobUrl } = req.body;

  const isJobUrlMissing = !jobUrl;
  if (isJobUrlMissing) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.JENKINS_JOB_URL_REQUIRED });
  }

  let jobUrlObj: URL;
  try {
    jobUrlObj = new URL(jobUrl);
  } catch {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.JENKINS_INVALID_JOB_URL });
  }

  try {
    const cicd = getCICDController();
    const integration = await cicd.findByTenantAndProviderWithSecrets(tenantId, CICDProviderType.JENKINS);
    const integrationNotFound = !integration;
    if (integrationNotFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.JENKINS_CONNECTION_NOT_FOUND });
    }

    const hasBasicCreds = integration.authType === AuthType.BASIC && !!integration.username && !!integration.apiToken;
    const lacksBasicCreds = !hasBasicCreds;
    if (lacksBasicCreds) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.JENKINS_BASIC_REQUIRED });
    }

    // Enforce same host as stored connection
    const hostFromIntegration = new URL(integration.hostUrl).host;
    const hostMismatch = hostFromIntegration !== jobUrlObj.host;
    if (hostMismatch) {
      const errorMessage = `${ERROR_MESSAGES.JENKINS_HOST_MISMATCH}: ${jobUrlObj.host} != ${hostFromIntegration}`;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: errorMessage });
    }

    const apiToken = integration.apiToken as string;
    const username = integration.username as string;

    const headers: any = {
      'Authorization': 'Basic ' + Buffer.from(`${username}:${apiToken}`).toString('base64'),
      'Accept': HEADERS.ACCEPT_JSON
    };

    // Optional crumb (not strictly required for GET but enabled by default)
    const useCrumb = integration.providerConfig?.useCrumb ?? true;
    const crumbPath = integration.providerConfig?.crumbPath ?? PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;
    if (useCrumb) {
      try {
        const crumbResp = await fetch(sanitizeJoin(integration.hostUrl, crumbPath), { headers });
        if (crumbResp.ok) {
          const crumbJson: any = await crumbResp.json();
          const field = crumbJson.crumbRequestField || HEADERS.JENKINS_CRUMB_HEADER_FALLBACK;
          const crumb = crumbJson.crumb;
          if (crumb) {
            headers[field] = crumb;
          }
        }
      } catch {
        // ignore crumb errors for GET
      }
    }

    // Build job API URL: {jobUrl}/api/json?... (preserve job path)
    const jobApiUrl = appendApiJson(jobUrl, "property[parameterDefinitions[name,type,description,defaultParameterValue[value],choices[*]]]");
    const resp = await fetch(jobApiUrl, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      const errorMessage = `${ERROR_MESSAGES.JENKINS_FETCH_PARAMS_FAILED}: ${text}`;
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: errorMessage });
    }

    const json = await resp.json();
    const parameters = extractJenkinsParameters(json);

    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, parameters, error: null });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_FETCH_PARAMS_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: message });
  }
}

// ============================================================================
// JENKINS: VERIFY CONNECTION
// GET /tenants/:tenantId/integrations/ci-cd/jenkins/verify
// Body: { hostUrl, username, apiToken, useCrumb?, crumbPath? }
// ============================================================================
export async function verifyJenkinsConnection(req: Request, res: Response): Promise<any> {
  const { hostUrl, username, apiToken, useCrumb = true, crumbPath = "/crumbIssuer/api/json" } = req.body;

  const hasAllRequired = !!hostUrl && !!username && !!apiToken;
  const missingRequired = !hasAllRequired;
  if (missingRequired) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: ERROR_MESSAGES.JENKINS_VERIFY_REQUIRED });
  }

  try {
    const result = await probeJenkins(hostUrl, username, apiToken, useCrumb, crumbPath);

    const isInvalid = !result.isValid;
    if (isInvalid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ verified: false, message: result.message });
    }

    return res.status(HTTP_STATUS.OK).json({ verified: result.isValid, message: result.message });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_VERIFY_FAILED);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ verified: false, message });
  }
}

// ============================================================================
// GITHUB ACTIONS: VERIFY CONNECTION (PAT or from SCM)
// GET /tenants/:tenantId/integrations/ci-cd/github-actions/verify
// Body: { apiToken?: string }
// ============================================================================
export async function verifyGitHubActionsConnection(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  let { apiToken } = req.body || {};
  try {
    if (!apiToken) {
      const storage = getStorage();
      const scmController = (storage as any).scmController;
      const scmModel = (scmController as any).model;
      if (scmModel) {
        const scm = await scmModel.findOne({ where: { tenantId, isActive: true, scmType: 'GITHUB' } });
        if (scm) apiToken = scm.toJSON().accessToken;
      }
    }
    const tokenMissing = !apiToken;
    if (tokenMissing) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: ERROR_MESSAGES.MISSING_TOKEN_AND_SCM });
    }
    const ok = await verifyGitHubToken(apiToken);
    const tokenInvalid = !ok;
    if (tokenInvalid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ verified: false, message: ERROR_MESSAGES.INVALID_GITHUB_TOKEN });
    }
    return res.status(HTTP_STATUS.OK).json({ verified: true, message: SUCCESS_MESSAGES.VERIFIED });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_VERIFY_GHA);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ verified: false, message });
  }
}

// ============================================================================
// GITHUB ACTIONS: CREATE CONNECTION
// POST /tenants/:tenantId/integrations/ci-cd/github-actions
// Body: { displayName?, apiToken?, hostUrl? }
// ============================================================================
export async function createGitHubActionsConnection(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const accountId: string = req.user.id;

  let { displayName, apiToken, hostUrl } = req.body || {};

  try {
    if (!apiToken) {
      const storage = getStorage();
      const scmController = (storage as any).scmController;
      const scmModel = (scmController as any).model;
      if (scmModel) {
        const scm = await scmModel.findOne({ where: { tenantId, isActive: true, scmType: 'GITHUB' } });
        if (scm) apiToken = scm.toJSON().accessToken;
      }
      if (!apiToken) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.MISSING_TOKEN_AND_SCM });
      }
    }

    const cicd = getCICDController();
    const existing = await cicd.findByTenantAndProvider(tenantId, Provider.GITHUB_ACTIONS);

    const payload = {
      hostUrl: hostUrl || PROVIDER_DEFAULTS.GITHUB_API,
      authType: AuthType.BEARER,
      apiToken,
      providerConfig: null as any,
    };

    if (existing) {
      const updated = await cicd.update(existing.id, {
        displayName,
        ...payload,
      });
      return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, integration: updated });
    } else {
      const created = await cicd.create({
        tenantId,
        providerType: Provider.GITHUB_ACTIONS,
        displayName: displayName || 'GitHub Actions',
        ...payload,
        createdByAccountId: accountId,
      });
      return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS, integration: created });
    }
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_SAVE_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

// GET /tenants/:tenantId/integrations/ci-cd/github-actions
export async function getGitHubActionsConnection(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  try {
    const cicd = getCICDController();
    const integration = await cicd.findByTenantAndProvider(tenantId, Provider.GITHUB_ACTIONS);
    const notFound = !integration;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.GHA_NOT_FOUND });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, integration });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_FETCH_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

// PATCH /tenants/:tenantId/integrations/ci-cd/github-actions
export async function updateGitHubActionsConnection(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const updateData = req.body || {};
  try {
    const cicd = getCICDController();
    const existing = await cicd.findByTenantAndProvider(tenantId, Provider.GITHUB_ACTIONS);
    const notFound = !existing;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.GHA_NOT_FOUND });
    }

    if (updateData.apiToken && !updateData.verificationStatus) {
      const ok = await verifyGitHubToken(updateData.apiToken);
      updateData.verificationStatus = ok ? VerificationStatus.VALID : VerificationStatus.INVALID;
      updateData.lastVerifiedAt = new Date();
      if (!ok) updateData.verificationError = ERROR_MESSAGES.INVALID_GITHUB_TOKEN;
    }

    const updated = await cicd.update((existing as any).id, updateData);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, integration: updated });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_UPDATE_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

// DELETE /tenants/:tenantId/integrations/ci-cd/github-actions
export async function deleteGitHubActionsConnection(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  try {
    const cicd = getCICDController();
    const existing = await cicd.findByTenantAndProvider(tenantId, Provider.GITHUB_ACTIONS);
    const notFound = !existing;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.GHA_NOT_FOUND });
    }
    await cicd.delete((existing as any).id);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.JENKINS_DELETED });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_DELETE_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

// ============================================================================
// GITHUB ACTIONS: WORKFLOW INPUTS (job-parameters analogue)
// GET /tenants/:tenantId/integrations/ci-cd/github-actions/job-parameters
// Body: { workflowUrl: string }  // e.g., https://github.com/{owner}/{repo}/blob/{ref}/.github/workflows/{file}.yml
// ============================================================================
export async function fetchGitHubActionsWorkflowInputs(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const { workflowUrl } = req.body || {};
  const workflowUrlMissing = !workflowUrl;
  if (workflowUrlMissing) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL });
  }

  try {
    const token = await getGitHubTokenForTenant(tenantId);
    const tokenMissing = !token;
    if (tokenMissing) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.GHA_NO_TOKEN_AVAILABLE });
    }

    const parsed = parseGitHubWorkflowUrl(workflowUrl);
    const parsedInvalid = !parsed;
    if (parsedInvalid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL });
    }

    const { owner, repo, path, ref } = parsed;
    const timeoutMs = Number(process.env.GHA_INPUTS_TIMEOUT_MS || 8000);
    const contentResp = await fetchWithTimeout(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': HEADERS.ACCEPT_GITHUB_JSON,
          'User-Agent': HEADERS.USER_AGENT
        }
      },
      timeoutMs
    );

    if (!contentResp.ok) {
      const txt = await contentResp.text();
      const errorMessage = `${ERROR_MESSAGES.GHA_FETCH_INPUTS_FAILED}: ${txt}`;
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: errorMessage });
    }

    const contentJson: any = await contentResp.json();
    const fileContent = Buffer.from(contentJson.content || '', contentJson.encoding || 'base64').toString('utf8');

    // Minimal YAML scanning to extract workflow_dispatch inputs
    const inputs = extractWorkflowDispatchInputs(fileContent);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, parameters: inputs, error: null });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.GHA_FETCH_INPUTS_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, parameters: [], error: message });
  }
}

// ============================================================================
// GITHUB ACTIONS: RUN STATUS (queue-status analogue)
// GET /tenants/:tenantId/integrations/ci-cd/github-actions/run-status
// Body: { runUrl?: string, owner?: string, repo?: string, runId?: string }
// ============================================================================
export async function getGitHubActionsRunStatus(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const { runUrl, owner, repo, runId } = req.body || {};

  try {
    let parsed = { owner, repo, runId };
    if (runUrl) {
      const p = parseGitHubRunUrl(runUrl);
      const invalid = !p;
      if (invalid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.GHA_INVALID_RUN_URL });
      }
      parsed = p;
    }
    const hasOwner = !!parsed.owner;
    const hasRepo = !!parsed.repo;
    const hasRunId = !!parsed.runId;
    const identifiersMissing = !hasOwner || !hasRepo || !hasRunId;
    if (identifiersMissing) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.GHA_RUN_IDENTIFIERS_REQUIRED });
    }

    const token = await getGitHubTokenForTenant(tenantId);
    const tokenMissing = !token;
    if (tokenMissing) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.GHA_NO_TOKEN_AVAILABLE });
    }

    const timeoutMs = Number(process.env.GHA_STATUS_TIMEOUT_MS || 8000);
    const runResp = await fetchWithTimeout(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/actions/runs/${parsed.runId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': HEADERS.ACCEPT_GITHUB_JSON,
          'User-Agent': HEADERS.USER_AGENT
        }
      },
      timeoutMs
    );

    if (!runResp.ok) {
      const txt = await runResp.text();
      const errorMessage = `${ERROR_MESSAGES.GHA_FETCH_RUN_FAILED}: ${txt}`;
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: errorMessage });
    }

    const runJson: any = await runResp.json();
    const mapped = mapGitHubRunStatus(runJson.status, runJson.conclusion);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status: mapped });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.GHA_FETCH_RUN_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

async function getGitHubTokenForTenant(tenantId: string): Promise<string | null> {
  // Prefer CI/CD GitHub Actions connection token; fallback to SCM GitHub token
  const cicd = getCICDController();
  const gha = await (cicd as any).findByTenantAndProviderWithSecrets?.(tenantId, Provider.GITHUB_ACTIONS);
  if (gha?.apiToken) return gha.apiToken as string;
  const storage = getStorage();
  const scmController = (storage as any).scmController;
  const scmModel = (scmController as any).model;
  if (scmModel) {
    const scm = await scmModel.findOne({ where: { tenantId, isActive: true, scmType: 'GITHUB' } });
    if (scm) return (scm.toJSON().accessToken as string) || null;
  }
  return null;
}

// ============================================================================
// JENKINS: CREATE CONNECTION
// POST /tenants/:tenantId/integrations/ci-cd/jenkins
// Creates a new Jenkins connection for tenant
// ============================================================================
export async function createJenkinsConnection(req: Request, res: Response): Promise<any> {
  try {
    const tenantId: string = req.params.tenantId;
    const accountId: string = req.user.id;

    let {
      displayName,
      hostUrl,
      username,
      apiToken,
      providerConfig = { useCrumb: true, crumbPath: PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH },
      verificationStatus,
      lastVerifiedAt,
      verificationError
    } = req.body;
  
    const missingRequired = !hostUrl || !username || !apiToken;
    if (missingRequired) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_CREATE_REQUIRED });
    }
  
    if (!verificationStatus) {
      const result = await probeJenkins(hostUrl, username, apiToken, providerConfig.useCrumb, providerConfig.crumbPath);
      verificationStatus = result.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID;
      lastVerifiedAt = new Date();
      if (!result.isValid) {
        verificationError = result.message;
      } else {
        verificationError = null;
      }
    }

    const cicd = getCICDController();

    const createData: CreateCICDIntegrationDto = {
      tenantId,
      providerType: CICDProviderType.JENKINS,
      displayName: displayName || "Jenkins",
      hostUrl,
      authType: AuthType.BASIC,
      username,
      apiToken,
      providerConfig,
      createdByAccountId: accountId,
      verificationStatus,
      lastVerifiedAt,
      verificationError
    };

    const created: SafeCICDIntegration = await cicd.create(createData);

    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.JENKINS_CREATED, integration: created });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_SAVE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, message });
  }
}

// ============================================================================
// JENKINS: GET CONNECTION
// GET /tenants/:tenantId/integrations/ci-cd/jenkins
// ============================================================================
export async function getJenkinsConnection(req: Request, res: Response): Promise<any> {
  try {
    const tenantId: string = req.params.tenantId;
    const cicd = getCICDController();
    const integration = await cicd.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    const notFound = !integration;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_NOT_FOUND });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, integration });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_SAVE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

// ============================================================================
// JENKINS: UPDATE CONNECTION
// PATCH /tenants/:tenantId/integrations/ci-cd/jenkins
// ============================================================================
export async function updateJenkinsConnection(req: Request, res: Response): Promise<any> {
  try {
    const tenantId: string = req.params.tenantId;
    const updateData: UpdateCICDIntegrationDto = req.body;
    const cicd = getCICDController();
    const existing = await cicd.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    const notFound = !existing;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, message: ERROR_MESSAGES.JENKINS_NOT_FOUND });
    }

    // If updating credentials and verification status is not provided, reset verification
    if ((updateData.apiToken || updateData.username || updateData.hostUrl) && !updateData.verificationStatus) {
      const result = await probeJenkins(updateData.hostUrl, updateData.username, updateData.apiToken, updateData.providerConfig?.useCrumb ?? true, updateData.providerConfig?.crumbPath ?? PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH);
      updateData.verificationStatus = result.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID;
      updateData.lastVerifiedAt = new Date();
      if (!result.isValid) {
        updateData.verificationError = result.message;
      } else {
        updateData.verificationError = null;
      }
    }

    const updated: SafeCICDIntegration = await cicd.update(existing.id, updateData);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.JENKINS_UPDATED, integration: updated });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_UPDATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, message });
  }
}

// ============================================================================
// JENKINS: DELETE CONNECTION
// DELETE /tenants/:tenantId/integrations/ci-cd/jenkins
// ============================================================================
export async function deleteJenkinsConnection(req: Request, res: Response): Promise<any> {
  try {
    const tenantId: string = req.params.tenantId;
    const cicd = getCICDController();
    const existing = await cicd.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    const notFound = !existing;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, message: ERROR_MESSAGES.JENKINS_NOT_FOUND });
    }
    await cicd.delete(existing.id);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.JENKINS_DELETED });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, message });
  }
}

// ============================================================================
// HELPERS (provider calls remain here; pure utils moved to utils/cicd)
// ============================================================================

async function probeJenkins(
  hostUrl: string,
  username: string,
  apiToken: string,
  useCrumb: boolean,
  crumbPath: string
): Promise<{ isValid: boolean; message: string; details?: any; }> {
  const headers: any = {
    'Authorization': 'Basic ' + Buffer.from(`${username}:${apiToken}`).toString('base64'),
    'Accept': HEADERS.ACCEPT_JSON
  };

  try {
    const timeoutMs = Number(process.env.JENKINS_PROBE_TIMEOUT_MS || 2000);
    // Optional crumb
    if (useCrumb) {
      const crumbResp = await fetchWithTimeout(sanitizeJoin(hostUrl, crumbPath), { headers }, timeoutMs);
      if (crumbResp.ok) {
        const crumbJson: any = await crumbResp.json();
        const field = crumbJson.crumbRequestField || HEADERS.JENKINS_CRUMB_HEADER_FALLBACK;
        const crumb = crumbJson.crumb;
        if (crumb) {
          headers[field] = crumb;
        }
      }
      // If crumb endpoint fails (404/403), continue without crumb for GET probe
    }

    // Probe main API
    const resp = await fetchWithTimeout(sanitizeJoin(hostUrl, '/api/json'), { headers }, timeoutMs);
    if (!resp.ok) {
      return { isValid: false, message: `Jenkins API error: ${resp.status} ${resp.statusText}`};
    }

    return { isValid: true, message: SUCCESS_MESSAGES.VERIFIED };
  } catch (e: any) {
    if (e && (e.name === 'AbortError' || e.code === 'ABORT_ERR')) {
      return { isValid: false, message: ERROR_MESSAGES.JENKINS_QUEUE_TIMEOUT };
    }
    return { isValid: false, message: `Connection failed: ${e.message}` };
  }
}

async function verifyGitHubToken(apiToken: string): Promise<boolean> {
  const timeoutMs = Number(process.env.GHA_VERIFY_TIMEOUT_MS || 6000);
  try {
    const resp = await fetchWithTimeout('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': HEADERS.ACCEPT_GITHUB_JSON,
        'User-Agent': HEADERS.USER_AGENT
      }
    }, timeoutMs);
    return resp.ok;
  } catch {
    return false;
  }
}

// Pure helpers moved to utils/cicd

// ============================================================================
// JENKINS: TRIGGER WORKFLOW
// POST /tenants/:tenantId/integrations/ci-cd/jenkins/trigger
// Body: { workflowId?: string, workflowType?: string, platform?: string, jobParameters?: Record<string, any> }
// ============================================================================
export async function triggerJenkinsWorkflow(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const { workflowId, workflowType, platform, jobParameters = {} } = req.body || {};

  const hasWorkflowId = !!workflowId;
  const hasTypeAndPlatform = !!workflowType && !!platform;
  const selectionMissing = !hasWorkflowId && !hasTypeAndPlatform;
  if (selectionMissing) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED });
  }

  try {
    const wfController = getWorkflowController();
    let workflow: any = null;

    if (hasWorkflowId) {
      const item = await wfController.findById(workflowId);
      const notFound = !item || item.tenantId !== tenantId || item.providerType !== Provider.JENKINS;
      if (notFound) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
      }
      workflow = item;
    } else {
      const workflows = await wfController.findAll({
        tenantId,
        providerType: Provider.JENKINS,
        workflowType,
        platform: normalizePlatform(platform),
      } as any);

      const hasNoWorkflows = !workflows.length;
      if (hasNoWorkflows) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
      }
      const hasMultiple = workflows.length > 1;
      if (hasMultiple) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_MULTIPLE_FOUND });
      }
      workflow = workflows[0];
    }

    // Load integration with secrets
    const cicd = getCICDController();
    const integrationWithSecrets = await cicd.findById(workflow.integrationId, true) as any;
    const noIntegration = !integrationWithSecrets;
    if (noIntegration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: 'Jenkins credentials not found' });
    }

    const hasBasicCreds = integrationWithSecrets.authType === AuthType.BASIC && !!integrationWithSecrets.username && !!integrationWithSecrets.apiToken;
    const lacksBasicCreds = !hasBasicCreds;
    if (lacksBasicCreds) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_BASIC_REQUIRED });
    }

    // Ensure job host matches configured host
    const hostFromIntegration = new URL(integrationWithSecrets.hostUrl).host;
    const jobUrlObj = new URL(workflow.workflowUrl);
    const hostMismatch = hostFromIntegration !== jobUrlObj.host;
    if (hostMismatch) {
      const errorMessage = `${ERROR_MESSAGES.JENKINS_HOST_MISMATCH}: ${jobUrlObj.host} != ${hostFromIntegration}`;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: errorMessage });
    }

    // Merge parameters (override defaults with provided jobParameters)
    const defaults = extractDefaultsFromWorkflow(workflow.parameters);
    const mergedParams = { ...defaults, ...jobParameters };
    const form = new URLSearchParams();
    Object.entries(mergedParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v));
    });

    const headers: any = {
      'Authorization': 'Basic ' + Buffer.from(`${integrationWithSecrets.username}:${integrationWithSecrets.apiToken}`).toString('base64'),
      'Accept': HEADERS.ACCEPT_JSON,
      'Content-Type': CONTENT_TYPE.FORM_URLENCODED,
    };

    // Optional crumb for POST
    const useCrumb = integrationWithSecrets.providerConfig?.useCrumb ?? true;
    const crumbPath = integrationWithSecrets.providerConfig?.crumbPath ?? PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;
    if (useCrumb) {
      try {
        const crumbResp = await fetch(sanitizeJoin(integrationWithSecrets.hostUrl, crumbPath), { headers });
        if (crumbResp.ok) {
          const crumbJson: any = await crumbResp.json();
          const field = crumbJson.crumbRequestField || HEADERS.JENKINS_CRUMB_HEADER_FALLBACK;
          const crumb = crumbJson.crumb;
          if (crumb) {
            headers[field] = crumb;
          }
        }
      } catch {
        // proceed without crumb if not available
      }
    }

    // Trigger URL
    const triggerUrl = ensureTrailingSlash(workflow.workflowUrl) + 'buildWithParameters';
    const triggerResp = await fetch(triggerUrl, { method: 'POST', headers, body: form });

    const isAccepted = triggerResp.status === HTTP_STATUS.CREATED || triggerResp.status === HTTP_STATUS.OK || triggerResp.status === HTTP_STATUS.ACCEPTED;
    if (isAccepted) {
      const location = triggerResp.headers.get('location') || undefined;
      const noLocation = !location;
      if (noLocation) {
        const bodyText = await triggerResp.text().catch(() => '');
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_TRIGGER_NO_LOCATION, details: bodyText || undefined });
      }
      return res.status(HTTP_STATUS.ACCEPTED).json({ success: RESPONSE_STATUS.SUCCESS, queueLocation: location });
    }

    const errorText = await triggerResp.text();
    const errorMessage = `${ERROR_MESSAGES.JENKINS_TRIGGER_FAILED}: ${triggerResp.status} ${triggerResp.statusText}`;
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: errorMessage, details: errorText });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.JENKINS_TRIGGER_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

// Pure helpers moved to utils/cicd

// ============================================================================
// WORKFLOWS CRUD (Provider-agnostic)
// ============================================================================

export async function createWorkflow(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const accountId: string = req.user.id;

  const body = req.body as Partial<CreateWorkflowDto>;

  const missingRequired = !body.providerType || !body.integrationId || !body.workflowUrl || !body.displayName || !body.platform || !body.workflowType;
  if (missingRequired) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_CREATE_REQUIRED });
  }

  try {
    const cicd = getCICDController();
    const integration = await cicd.findById(body.integrationId, true);
    const invalidIntegration = !integration || integration.id !== body.integrationId;
    if (invalidIntegration) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_INTEGRATION_INVALID });
    }

    const wfController = getWorkflowController();
    const created = await wfController.create({
      tenantId,
      providerType: body.providerType as any,
      integrationId: body.integrationId,
      displayName: body.displayName,
      workflowUrl: body.workflowUrl,
      providerIdentifiers: body.providerIdentifiers ?? null,
      platform: normalizePlatform(body.platform),
      workflowType: body.workflowType as any,
      parameters: body.parameters ?? null,
      createdByAccountId: accountId,
    });

    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_CREATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

export async function listWorkflows(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const { providerType, integrationId, platform, workflowType } = req.query as any;

  try {
    const wfController = getWorkflowController();
    const items = await wfController.findAll({
      tenantId,
      providerType: providerType as any,
      integrationId: integrationId as string | undefined,
      platform: normalizePlatform(platform),
      workflowType: workflowType as any,
    });
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflows: items });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_LIST_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

export async function getWorkflowById(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  try {
    const wfController = getWorkflowController();
    const item = await wfController.findById(id);
    const notFound = !item || item.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflow: item });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

export async function updateWorkflow(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  const body = req.body as UpdateWorkflowDto;
  try {
    const wfController = getWorkflowController();
    const existing = await wfController.findById(id);
    const notFound = !existing || existing.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    const updated = await wfController.update(id, body);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflow: updated });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_UPDATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}

export async function deleteWorkflow(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  try {
    const wfController = getWorkflowController();
    const existing = await wfController.findById(id);
    const notFound = !existing || existing.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    await wfController.delete(id);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.WORKFLOW_DELETED });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.WORKFLOW_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}


// ============================================================================
// JENKINS: QUEUE STATUS
// GET /tenants/:tenantId/integrations/ci-cd/jenkins/queue-status
// Body: { queueUrl: string }
// Returns: { status: 'pending' | 'running' | 'completed' | 'cancelled' }
// ============================================================================
export async function getJenkinsQueueStatus(req: Request, res: Response): Promise<any> {
  const tenantId = req.params.tenantId;
  const { queueUrl } = req.body || {};
  const queueUrlMissing = !queueUrl;
  if (queueUrlMissing) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_NO_QUEUE_URL });
  }
  let queueUrlObj: URL;
  try {
    queueUrlObj = new URL(queueUrl);
  } catch {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_INVALID_QUEUE_URL });
  }

  try {
    // Load Jenkins integration with secrets
    const cicd = getCICDController();
    const integration = await cicd.findByTenantAndProviderWithSecrets(tenantId, CICDProviderType.JENKINS);
    const notFound = !integration;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_CONNECTION_NOT_FOUND });
    }
    const hasBasicCreds = integration.authType === AuthType.BASIC && !!integration.username && !!integration.apiToken;
    const lacksBasicCreds = !hasBasicCreds;
    if (lacksBasicCreds) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_BASIC_REQUIRED });
    }

    // Host check
    const hostFromIntegration = new URL(integration.hostUrl).host;
    const hostMismatch = hostFromIntegration !== queueUrlObj.host;
    if (hostMismatch) {
      const errorMessage = `${ERROR_MESSAGES.JENKINS_HOST_MISMATCH}: ${queueUrlObj.host} != ${hostFromIntegration}`;
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: errorMessage });
    }

    const timeoutMs = Number(process.env.JENKINS_QUEUE_TIMEOUT_MS || process.env.JENKINS_PROBE_TIMEOUT_MS || 5000);
    const headers: any = {
      'Authorization': 'Basic ' + Buffer.from(`${integration.username}:${integration.apiToken}`).toString('base64'),
      'Accept': HEADERS.ACCEPT_JSON
    };

    // Query queue item
    const queueApi = ensureTrailingSlash(queueUrl) + 'api/json';
    const qResp = await fetchWithTimeout(queueApi, { headers }, timeoutMs);
    if (!qResp.ok) {
      const text = await qResp.text();
      const errorMessage = `${ERROR_MESSAGES.JENKINS_QUEUE_FAILED}: ${text}`;
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: errorMessage });
    }
    const qJson: any = await qResp.json();

    // Cancelled
    if (qJson.cancelled) {
      return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status: 'cancelled' });
    }

    // Still queued/blocked
    if (qJson.blocked === true) {
      return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status: 'pending' });
    }

    // If executable assigned, we have a build URL
    const executable = qJson.executable;
    if (executable && executable.url) {
      const buildUrl: string = ensureTrailingSlash(executable.url);
      const buildApi = buildUrl + 'api/json';
      const bResp = await fetchWithTimeout(buildApi, { headers }, timeoutMs);
      if (!bResp.ok) {
        // If build metadata not yet available, treat as running
        return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status: 'running' });
      }
      const bJson: any = await bResp.json();
      const building = !!bJson.building;
      const computedStatus = building ? 'running' : 'completed';
      return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status: computedStatus });
    }

    // Otherwise still pending in queue
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, status: 'pending' });
  } catch (e: any) {
    const isTimeout = e && (e.name === 'AbortError' || e.code === 'ABORT_ERR');
    if (isTimeout) {
      return res.status(HTTP_STATUS.REQUEST_TIMEOUT).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_QUEUE_TIMEOUT });
    }
    const message = getErrorMessage(e, ERROR_MESSAGES.JENKINS_QUEUE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
}


