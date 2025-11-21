import { GitHubActionsConnectionService } from "../../../../services/integrations/ci-cd/connections/github-actions-connection.service";
import { ERROR_MESSAGES } from "../constants";
import type { ConnectionAdapter, VerifyResult } from "./connection-adapter.utils";
import type { UpdateCICDIntegrationDto, SafeCICDIntegration } from "~types/integrations/ci-cd/connection.interface";
import { PROVIDER_DEFAULTS, HEADERS } from "../constants";

export const createGitHubActionsConnectionAdapter = (): ConnectionAdapter => {
  const service = new GitHubActionsConnectionService();

  const verify: ConnectionAdapter["verify"] = async (body) => {
    const apiToken = body.apiToken as string | undefined;
    const tokenMissing = !apiToken || typeof apiToken !== 'string' || apiToken.trim().length === 0;
    if (tokenMissing) {
      return { isValid: false, message: ERROR_MESSAGES.MISSING_TOKEN_AND_SCM } as VerifyResult;
    }
    const result = await service.verifyConnection({
      apiToken,
      githubApiBase: PROVIDER_DEFAULTS.GITHUB_API,
      userAgent: HEADERS.USER_AGENT,
      acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
      timeoutMs: Number(process.env.GHA_VERIFY_TIMEOUT_MS || 6000)
    });
    return result;
  };

  // prepareVerifyOnUpdate removed; update handled via service.update

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

  const update = async (tenantId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration> => {
    const safe = await service.update(tenantId, updateData);
    return safe;
  };

  return { verify, create, update };
};


