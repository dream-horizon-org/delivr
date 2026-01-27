import { JenkinsConnectionService } from "~services/integrations/ci-cd";
import { ERROR_MESSAGES, PROVIDER_DEFAULTS } from "../constants";
import type { ConnectionAdapter, VerifyResult } from "./connection-adapter.utils";
import type { UpdateCICDIntegrationDto, SafeCICDIntegration } from "~types/integrations/ci-cd/connection.interface";
import { decryptIfEncrypted, decryptFields, encryptForStorage } from "~utils/encryption";

export const createJenkinsConnectionAdapter = (): ConnectionAdapter => {
  const service = new JenkinsConnectionService();

  const verify: ConnectionAdapter["verify"] = async (body) => {
    const hostUrl = body.hostUrl as string | undefined;
    const username = body.username as string | undefined;
    const apiToken = body.apiToken as string | undefined;
    const _encrypted = body._encrypted as boolean | undefined;
    const useCrumb = (body.useCrumb as boolean | undefined) ?? true;
    const crumbPath = (body.crumbPath as string | undefined) ?? PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;

    const missing = !hostUrl || !username || !apiToken;
    if (missing) {
      return { isValid: false, message: ERROR_MESSAGES.JENKINS_VERIFY_REQUIRED } as VerifyResult;
    }
    
    // Decrypt apiToken if encrypted from frontend (Layer 1)
    const decryptedToken = _encrypted 
      ? decryptIfEncrypted(apiToken, 'apiToken')
      : apiToken;
    
    const result = await service.verifyConnection({ hostUrl, username, apiToken: decryptedToken, useCrumb, crumbPath });
    return result;
  };

  // prepareVerifyOnUpdate removed; update handled via service.update

  const create: ConnectionAdapter["create"] = async (appId, accountId, body) => {
    const displayName = body.displayName as string | undefined;
    const hostUrl = body.hostUrl as string | undefined;
    const username = body.username as string | undefined;
    const apiToken = body.apiToken as string | undefined;
    const _encrypted = body._encrypted as boolean | undefined;
    const providerConfig = (body.providerConfig as { useCrumb?: boolean; crumbPath?: string } | undefined) ?? { useCrumb: true, crumbPath: PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH };
    const missing = !hostUrl || !username || !apiToken;
    if (missing) {
      throw new Error(ERROR_MESSAGES.JENKINS_CREATE_REQUIRED);
    }
    
    // Decrypt frontend-encrypted value if needed (Layer 1), then encrypt with backend storage key (Layer 2)
    const decryptedToken = _encrypted 
      ? decryptIfEncrypted(apiToken, 'apiToken')
      : apiToken;
    
    // Encrypt with backend storage key for database storage
    const backendEncryptedApiToken = encryptForStorage(decryptedToken);
    const created = await service.create(appId, accountId, { displayName, hostUrl, username, apiToken: backendEncryptedApiToken, providerConfig });
    return created;
  };

  const update = async (appId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration> => {
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
    
    const safe = await service.update(appId, processedUpdateData);
    return safe;
  };

  return { verify, create, update };
};


