import { GitHubActionsConnectionService } from "~services/integrations/ci-cd";
import type { ConnectionAdapter } from "./connection-adapter.utils";
import type { UpdateCICDIntegrationDto, SafeCICDIntegration } from "~types/integrations/ci-cd/connection.interface";
import { PROVIDER_DEFAULTS, HEADERS } from "../constants";
import { decryptIfEncrypted, decryptFields, encryptForStorage } from "~utils/encryption";

interface GitHubActionsVerifyBody {
  apiToken: string;
  _encrypted?: boolean;
}

interface GitHubActionsCreateBody {
  displayName?: string;
  apiToken: string;
}

export const createGitHubActionsConnectionAdapter = (): ConnectionAdapter => {
  const service = new GitHubActionsConnectionService();

  const verify: ConnectionAdapter["verify"] = async (body) => {
    // Validated by middleware, safe to cast
    const typedBody = body as unknown as GitHubActionsVerifyBody;
    const { apiToken, _encrypted } = typedBody;
    
    // Decrypt apiToken if encrypted from frontend
    const decryptedToken = _encrypted 
      ? decryptIfEncrypted(apiToken, 'apiToken')
      : apiToken;
    
    const result = await service.verifyConnection({
      apiToken: decryptedToken,
      githubApiBase: PROVIDER_DEFAULTS.GITHUB_API,
      userAgent: HEADERS.USER_AGENT,
      acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
      timeoutMs: Number(process.env.GHA_VERIFY_TIMEOUT_MS || 6000)
    });
    return result;
  };

  // prepareVerifyOnUpdate removed; update handled via service.update

  const create: ConnectionAdapter["create"] = async (tenantId, accountId, body) => {
    // Validated by middleware, safe to cast
    const typedBody = body as unknown as GitHubActionsCreateBody;
    const { displayName, apiToken } = typedBody;
    
    // Double-layer encryption: Decrypt frontend-encrypted value, then encrypt with backend storage key
    const { decrypted: decryptedData } = decryptFields({ apiToken }, ['apiToken']);
    const backendEncryptedApiToken = encryptForStorage(decryptedData.apiToken);
    
    console.log('[GitHub Actions] Storing apiToken with backend storage encryption (double-layer security)');
    const created = await service.create(tenantId, accountId, { displayName, apiToken: backendEncryptedApiToken });
    return created;
  };

  const update = async (tenantId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration> => {
    // Double-layer encryption: Decrypt frontend-encrypted apiToken if provided, then encrypt with backend storage key
    const processedUpdateData = { ...updateData };
    
    if (processedUpdateData.apiToken) {
      // Decrypt frontend-encrypted value, then encrypt with backend storage encryption
      const { decrypted: decryptedData } = decryptFields({ apiToken: processedUpdateData.apiToken }, ['apiToken']);
      processedUpdateData.apiToken = encryptForStorage(decryptedData.apiToken);
      console.log('[GitHub Actions] Updating apiToken with backend storage encryption (double-layer security)');
    }
    
    const safe = await service.update(tenantId, processedUpdateData);
    return safe;
  };

  return { verify, create, update };
};


