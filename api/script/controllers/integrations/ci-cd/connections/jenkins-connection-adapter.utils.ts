import { JenkinsConnectionService } from "~services/integrations/ci-cd";
import { ERROR_MESSAGES, PROVIDER_DEFAULTS } from "../constants";
import type { ConnectionAdapter, VerifyResult } from "./connection-adapter.utils";
import type { UpdateCICDIntegrationDto, SafeCICDIntegration } from "~types/integrations/ci-cd/connection.interface";
import { decryptIfEncrypted, decryptFields, decrypt, encryptForStorage } from "~utils/encryption";

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
    
    // Decrypt apiToken if encrypted from frontend
    let decryptedToken: string;
    if (_encrypted) {
      try {
        decryptedToken = decrypt(apiToken);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown decryption error';
        return { 
          isValid: false, 
          message: `Failed to decrypt API token: ${errorMessage}. Please verify ENCRYPTION_KEY is set correctly.` 
        } as VerifyResult;
      }
    } else {
      // Not encrypted, use as-is
      decryptedToken = apiToken;
    }
    
    const result = await service.verifyConnection({ hostUrl, username, apiToken: decryptedToken, useCrumb, crumbPath });
    return result;
  };

  // prepareVerifyOnUpdate removed; update handled via service.update

  const create: ConnectionAdapter["create"] = async (tenantId, accountId, body) => {
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
    
    // Decrypt frontend-encrypted value if needed, then encrypt with backend storage key
    let decryptedToken: string;
    if (_encrypted) {
      try {
        decryptedToken = decrypt(apiToken);
      } catch (error) {
        throw new Error(`Failed to decrypt API token: ${error instanceof Error ? error.message : 'Unknown error'}. Please verify ENCRYPTION_KEY is set correctly.`);
      }
    } else {
      // Not encrypted, use as-is
      decryptedToken = apiToken;
    }
    
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
      
      let decryptedToken: string;
      if (_encrypted) {
        try {
          // Directly call decrypt() which throws on failure, ensuring we don't use encrypted value
          decryptedToken = decrypt(processedUpdateData.apiToken);
          
        } catch (error) {
          
          throw new Error(`Failed to decrypt API token: ${error instanceof Error ? error.message : 'Unknown error'}. Please verify ENCRYPTION_KEY is set correctly.`);
        }
      } else {
        // Not encrypted, use as-is
        decryptedToken = processedUpdateData.apiToken;
      }
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


