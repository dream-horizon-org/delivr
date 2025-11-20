import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "../../../../constants/http";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, PROVIDER_DEFAULTS, HEADERS } from "../../../../constants/cicd";
import { getErrorMessage, parseGitHubRepoUrl, fetchWithTimeout } from "../../../../utils/cicd";
import { GitHubActionsConnectionService } from "../../../../services/integrations/ci-cd/connections/github-actions-connection.service";

export const verifyGitHubActionsConnection = async (req: Request, res: Response): Promise<any> => {
  const { apiToken } = req.body || {};
  try {
    const tokenMissing = !apiToken || typeof apiToken !== 'string' || apiToken.trim().length === 0;
    if (tokenMissing) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: ERROR_MESSAGES.MISSING_TOKEN_AND_SCM });
    }

    const timeoutMs = Number(process.env.GHA_VERIFY_TIMEOUT_MS || 6000);
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': HEADERS.ACCEPT_GITHUB_JSON,
      'User-Agent': HEADERS.USER_AGENT
    };

    const response = await fetchWithTimeout(`${PROVIDER_DEFAULTS.GITHUB_API}/user`, { headers }, timeoutMs);
    const tokenInvalid = !response?.ok;
    if (tokenInvalid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ verified: false, message: ERROR_MESSAGES.INVALID_GITHUB_TOKEN });
    }

    return res.status(HTTP_STATUS.OK).json({ verified: true, message: SUCCESS_MESSAGES.VERIFIED });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_VERIFY_GHA);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ verified: false, message });
  }
};

export const createGitHubActionsConnection = async (req: Request, res: Response): Promise<any> => {
  try {
    const tenantId = req.params.tenantId;
    const accountId = req.user?.id;
    const { displayName, apiToken } = req.body || {};

    const tokenInvalid = !apiToken || typeof apiToken !== 'string' || apiToken.trim().length === 0;
    if (tokenInvalid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.GHA_CREATE_REQUIRED });
    }

    const service = new GitHubActionsConnectionService();
    const created = await service.create(tenantId, accountId, { displayName, apiToken });
    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS, integration: created });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_SAVE_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const getGitHubActionsConnection = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  try {
    const service = new GitHubActionsConnectionService();
    const integration = await service.get(tenantId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.GHA_NOT_FOUND });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, integration });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_FETCH_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const updateGitHubActionsConnection = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const updateData = req.body || {};
  try {
    const service = new GitHubActionsConnectionService();
    const updated = await service.update(tenantId, updateData);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, integration: updated });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_UPDATE_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const deleteGitHubActionsConnection = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  try {
    const service = new GitHubActionsConnectionService();
    await service.delete(tenantId);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.JENKINS_DELETED });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_DELETE_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};


