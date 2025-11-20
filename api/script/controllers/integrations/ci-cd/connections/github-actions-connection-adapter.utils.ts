import { GitHubActionsConnectionService } from "../../../../services/integrations/ci-cd/connections/github-actions-connection.service";
import { ERROR_MESSAGES } from "../../../../constants/cicd";
import type { ConnectionAdapter, VerifyResult } from "./connection-adapter.utils";
import { PROVIDER_DEFAULTS, HEADERS } from "../../../../constants/cicd";
import { fetchWithTimeout } from "../../../../utils/cicd";

export const createGitHubActionsConnectionAdapter = (): ConnectionAdapter => {
  const service = new GitHubActionsConnectionService();

  const verify: ConnectionAdapter["verify"] = async (body) => {
    const apiToken = body.apiToken as string | undefined;
    const tokenMissing = !apiToken || typeof apiToken !== 'string' || apiToken.trim().length === 0;
    if (tokenMissing) {
      return { isValid: false, message: ERROR_MESSAGES.MISSING_TOKEN_AND_SCM } as VerifyResult;
    }
    // Direct probe, consistent with existing controller
    const timeoutMs = Number(process.env.GHA_VERIFY_TIMEOUT_MS || 6000);
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': HEADERS.ACCEPT_GITHUB_JSON,
      'User-Agent': HEADERS.USER_AGENT
    };
    const resp = await fetchWithTimeout(`${PROVIDER_DEFAULTS.GITHUB_API}/user`, { headers }, timeoutMs);
    if (!resp?.ok) {
      return { isValid: false, message: ERROR_MESSAGES.INVALID_GITHUB_TOKEN };
    }
    return { isValid: true, message: 'Connection verified successfully' };
  };

  const create: ConnectionAdapter["create"] = async (tenantId, accountId, body) => {
    const displayName = body.displayName as string | undefined;
    const apiToken = body.apiToken as string | undefined;
    const tokenInvalid = !apiToken || typeof apiToken !== 'string' || apiToken.trim().length === 0;
    if (tokenInvalid) {
      throw new Error(ERROR_MESSAGES.GHA_CREATE_REQUIRED);
    }
    const created = await service.create(tenantId, accountId, { displayName, apiToken });
    return created;
  };

  return { verify, create };
};


