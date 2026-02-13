import { JenkinsConnectionService } from "~services/integrations/ci-cd";
import { PROVIDER_DEFAULTS } from "../constants";
import type { ConnectionAdapter } from "./connection-adapter.utils";
import type { UpdateCICDIntegrationDto, SafeCICDIntegration } from "~types/integrations/ci-cd/connection.interface";
import { decryptIfEncrypted, encryptForStorage } from "~utils/encryption";

interface JenkinsVerifyBody {
  hostUrl: string;
  username: string;
  apiToken: string;
  _encrypted?: boolean;
  useCrumb?: boolean;
  crumbPath?: string;
}

interface JenkinsCreateBody {
  displayName?: string;
  hostUrl: string;
  username: string;
  apiToken: string;
  _encrypted?: boolean;
  providerConfig?: {
    useCrumb?: boolean;
    crumbPath?: string;
  };
}

export const createJenkinsConnectionAdapter = (): ConnectionAdapter => {
  const service = new JenkinsConnectionService();

  const verify: ConnectionAdapter["verify"] = async (body) => {
    // Validated by middleware, safe to cast
    const typedBody = body as unknown as JenkinsVerifyBody;
    const {
      hostUrl,
      username,
      apiToken,
      _encrypted,
      useCrumb = true,
      crumbPath = PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH
    } = typedBody;
    
    // Decrypt apiToken if encrypted from frontend (Layer 1)
    const decryptedToken = _encrypted 
      ? decryptIfEncrypted(apiToken, 'apiToken')
      : apiToken;
    
    const result = await service.verifyConnection({ hostUrl, username, apiToken: decryptedToken, useCrumb, crumbPath });
    return result;
  };

  // prepareVerifyOnUpdate removed; update handled via service.update

  const create: ConnectionAdapter["create"] = async (tenantId, accountId, body) => {
    // Validated by middleware, safe to cast
    const typedBody = body as unknown as JenkinsCreateBody;
    const {
      displayName,
      hostUrl,
      username,
      apiToken,
      _encrypted,
      providerConfig = { useCrumb: true, crumbPath: PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH }
    } = typedBody;
    
    // Decrypt frontend-encrypted value if needed (Layer 1), then encrypt with backend storage key (Layer 2)
    const decryptedToken = _encrypted 
      ? decryptIfEncrypted(apiToken, 'apiToken')
      : apiToken;
    
    // Encrypt with backend storage key for database storage
    const backendEncryptedApiToken = encryptForStorage(decryptedToken);
    const created = await service.create(tenantId, accountId, { displayName, hostUrl, username, apiToken: backendEncryptedApiToken, providerConfig });
    return created;
  };

  const update = async (tenantId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration> => {
    // Decrypt frontend-encrypted apiToken if provided, then encrypt with backend storage key
    // For partial updates, if apiToken is not provided, let the service use the stored token from database
    const processedUpdateData = { ...updateData };
    const _encrypted = (updateData as any)._encrypted as boolean | undefined;
    
    // Only process token if it's actually provided (not undefined, null, or empty string)
    const hasToken = processedUpdateData.apiToken && 
                     typeof processedUpdateData.apiToken === 'string' && 
                     processedUpdateData.apiToken.trim().length > 0;
    
    if (hasToken) {
      
      // Decrypt frontend-encrypted value if needed (Layer 1)
      const decryptedToken = _encrypted 
        ? decryptIfEncrypted(processedUpdateData.apiToken, 'apiToken')
        : processedUpdateData.apiToken;
      // Encrypt with backend storage key for database storage
      processedUpdateData.apiToken = encryptForStorage(decryptedToken);
    } else {
      // Partial update - token not provided, remove it from updateData so service uses stored token
      delete processedUpdateData.apiToken;
    }
    
    const safe = await service.update(tenantId, processedUpdateData);
    return safe;
  };

  return { verify, create, update };
};


