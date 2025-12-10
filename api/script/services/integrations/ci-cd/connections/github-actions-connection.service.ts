import { ConnectionService } from './connection.service';
import { CICDProviderType, AuthType, VerificationStatus, type SafeCICDIntegration, type CreateCICDIntegrationDto, type UpdateCICDIntegrationDto } from '~types/integrations/ci-cd/connection.interface';
import { ProviderFactory } from '../providers/provider.factory';
import type { GitHubActionsProviderContract, GHAVerifyParams } from '../providers/github-actions/github-actions.interface';
import { ERROR_MESSAGES, HEADERS, PROVIDER_DEFAULTS } from '../../../../controllers/integrations/ci-cd/constants';
import * as shortid from 'shortid';
import { decryptIfEncrypted, decryptFromStorage } from '~utils/encryption';

type CreateInput = {
  displayName?: string;
  apiToken: string;
};

export class GitHubActionsConnectionService extends ConnectionService<CreateInput> {
  verifyConnection = async (params: GHAVerifyParams): Promise<{ isValid: boolean; message: string }> => {
    const provider = await ProviderFactory.getProvider(CICDProviderType.GITHUB_ACTIONS);
    const gha = provider as GitHubActionsProviderContract;
    return gha.verifyConnection(params);
  };

  create = async (tenantId: string, accountId: string, input: CreateInput): Promise<SafeCICDIntegration> => {
    const existing = await this.repository.findByTenantAndProvider(tenantId, CICDProviderType.GITHUB_ACTIONS);
    if (existing) {
      throw new Error(ERROR_MESSAGES.GHA_ALREADY_EXISTS);
    }
    
    // Decrypt token for verification
    // The adapter already handles frontend decryption and backend encryption,
    // so input.apiToken is backend-encrypted at this point
    let decryptedToken: string;
    try {
      decryptedToken = decryptFromStorage(input.apiToken);
    } catch (error) {
      throw new Error(`Failed to decrypt API token for verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    const verify = await this.verifyConnection({
      apiToken: decryptedToken,
      githubApiBase: PROVIDER_DEFAULTS.GITHUB_API,
      userAgent: HEADERS.USER_AGENT,
      acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
      timeoutMs: Number(process.env.GHA_VERIFY_TIMEOUT_MS || 6000)
    });
    
    // Store the ORIGINAL (encrypted) token in database
    const createData: CreateCICDIntegrationDto & { id: string } = {
      id: shortid.generate(),
      tenantId,
      providerType: CICDProviderType.GITHUB_ACTIONS,
      displayName: input.displayName ?? 'GitHub Actions',
      hostUrl: PROVIDER_DEFAULTS.GITHUB_API,
      authType: AuthType.BEARER,
      apiToken: input.apiToken, // Store encrypted value
      providerConfig: null as any,
      createdByAccountId: accountId,
      verificationStatus: verify.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID,
      lastVerifiedAt: new Date(),
      verificationError: verify.isValid ? null : verify.message
    };
    const created = await this.repository.create(createData);
    return this.toSafe(created);
  };

  get = async (tenantId: string): Promise<SafeCICDIntegration | null> => {
    const found = await this.repository.findByTenantAndProvider(tenantId, CICDProviderType.GITHUB_ACTIONS);
    return found ? this.toSafe(found) : null;
  };

  update = async (tenantId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration> => {
    const existing = await this.repository.findByTenantAndProvider(tenantId, CICDProviderType.GITHUB_ACTIONS);
    if (!existing) {
      throw new Error(ERROR_MESSAGES.GHA_NOT_FOUND);
    }

    // Always verify on update
    const withSecrets = await this.repository.findById(existing.id);
    const storedToken: string | undefined = (withSecrets as any)?.apiToken as (string | undefined);
    const tokenToCheck: string | undefined = updateData.apiToken ?? storedToken;
    const tokenMissing = !tokenToCheck;
    if (tokenMissing) {
      updateData.verificationStatus = VerificationStatus.INVALID;
      updateData.lastVerifiedAt = new Date();
      updateData.verificationError = ERROR_MESSAGES.MISSING_TOKEN_AND_SCM;
    } else {
      // Decrypt the token before verification
      // updateData.apiToken is now backend-encrypted (from adapter), storedToken might be either format
      // decryptFromStorage handles both backend and frontend formats
      let decryptedToken: string | undefined;
      try {
        decryptedToken = decryptFromStorage(tokenToCheck);
      } catch (error: any) {
        //console.error('[GitHub Actions] Failed to decrypt token for verification:', error.message);
        updateData.verificationStatus = VerificationStatus.INVALID;
        updateData.lastVerifiedAt = new Date();
        updateData.verificationError = 'Failed to decrypt token for verification';
        // Continue to save with invalid status
      }
      
      if (decryptedToken) {
        const verify = await this.verifyConnection({
          apiToken: decryptedToken,
          githubApiBase: PROVIDER_DEFAULTS.GITHUB_API,
          userAgent: HEADERS.USER_AGENT,
          acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
          timeoutMs: Number(process.env.GHA_VERIFY_TIMEOUT_MS || 6000)
        });
        updateData.verificationStatus = verify.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID;
        updateData.lastVerifiedAt = new Date();
        updateData.verificationError = verify.isValid ? null : verify.message;
      }
    }

    const updated = await this.repository.update(existing.id, updateData);
    const wasInvalid = updateData.verificationStatus === VerificationStatus.INVALID;
    if (wasInvalid) {
      const errorMessage = updateData.verificationError ?? ERROR_MESSAGES.FAILED_VERIFY_GHA;
      throw new Error(errorMessage);
    }
    return this.toSafe(updated as any);
  };

  delete = async (tenantId: string): Promise<void> => {
    const existing = await this.repository.findByTenantAndProvider(tenantId, CICDProviderType.GITHUB_ACTIONS);
    if (!existing) {
      throw new Error(ERROR_MESSAGES.GHA_NOT_FOUND);
    }
    await this.repository.delete(existing.id);
  };
}


