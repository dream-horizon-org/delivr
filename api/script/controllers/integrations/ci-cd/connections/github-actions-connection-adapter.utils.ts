import { GitHubActionsConnectionService } from "../../../../services/integrations/ci-cd/connections/github-actions-connection.service";
import { ERROR_MESSAGES } from "../constants";
import type { ConnectionAdapter, VerifyResult, VerifyPreparation } from "./connection-adapter.utils";
import { PROVIDER_DEFAULTS, HEADERS } from "../constants";
import { fetchWithTimeout } from "../../../../utils/cicd";
import type { TenantCICDIntegration, UpdateCICDIntegrationDto } from "~types/integrations/ci-cd/connection.interface";

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

  const prepareVerifyOnUpdate: NonNullable<ConnectionAdapter["prepareVerifyOnUpdate"]> = (args) => {
    const { existing, update, secrets } = args;
    const hasApiTokenUpdate = typeof update.apiToken === 'string';
    const shouldVerify = hasApiTokenUpdate;
    if (!shouldVerify) {
      return { shouldVerify: false };
    }
    const preferredToken = update.apiToken;
    const tokenFromSecrets = typeof secrets.apiToken === 'string' ? secrets.apiToken : undefined;
    const tokenToCheck = typeof preferredToken === 'string' && preferredToken.trim().length > 0
      ? preferredToken
      : (tokenFromSecrets && tokenFromSecrets.trim().length > 0 ? tokenFromSecrets : undefined);
    const tokenMissing = !tokenToCheck;
    if (tokenMissing) {
      return { shouldVerify: true, missingSecretMessage: ERROR_MESSAGES.MISSING_TOKEN_AND_SCM };
    }
    const body: Record<string, unknown> = { apiToken: tokenToCheck };
    return { shouldVerify: true, body } as VerifyPreparation;
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

  return { verify, create, prepareVerifyOnUpdate };
};


