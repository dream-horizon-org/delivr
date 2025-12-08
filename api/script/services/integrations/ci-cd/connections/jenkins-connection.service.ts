import { ConnectionService } from './connection.service';
import { CICDProviderType, AuthType, VerificationStatus, type SafeCICDIntegration, type CreateCICDIntegrationDto, type UpdateCICDIntegrationDto } from '~types/integrations/ci-cd/connection.interface';
import { ProviderFactory } from '../providers/provider.factory';
import type { JenkinsProviderContract, JenkinsVerifyParams } from '../providers/jenkins/jenkins.interface';
import { PROVIDER_DEFAULTS, ERROR_MESSAGES } from '../../../../controllers/integrations/ci-cd/constants';
import * as shortid from 'shortid';
import { decryptIfEncrypted } from '~utils/encryption.utils';

type CreateInput = {
  displayName?: string;
  hostUrl: string;
  username: string;
  apiToken: string;
  providerConfig?: { useCrumb?: boolean; crumbPath?: string };
};

export class JenkinsConnectionService extends ConnectionService<CreateInput> {
  verifyConnection = async (params: JenkinsVerifyParams): Promise<{ isValid: boolean; message: string }> => {
    const provider = await ProviderFactory.getProvider(CICDProviderType.JENKINS);
    const jenkins = provider as JenkinsProviderContract;
    return jenkins.verifyConnection(params);
  };

  create = async (tenantId: string, accountId: string, input: CreateInput): Promise<SafeCICDIntegration> => {
    const existing = await this.repository.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    if (existing) {
      throw new Error(ERROR_MESSAGES.JENKINS_ALREADY_EXISTS);
    }
    const useCrumb = input.providerConfig?.useCrumb ?? true;
    const crumbPath = input.providerConfig?.crumbPath ?? PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;
    
    // Decrypt token for verification (may be encrypted from frontend)
    const decryptedToken = decryptIfEncrypted(input.apiToken, 'apiToken');
    const verify = await this.verifyConnection({
      hostUrl: input.hostUrl,
      username: input.username,
      apiToken: decryptedToken,
      useCrumb,
      crumbPath
    });

    // Store the ORIGINAL (encrypted) token in database
    const createData: CreateCICDIntegrationDto & { id: string } = {
      id: shortid.generate(),
      tenantId,
      providerType: CICDProviderType.JENKINS,
      displayName: input.displayName ?? 'Jenkins',
      hostUrl: input.hostUrl,
      authType: AuthType.BASIC,
      username: input.username,
      apiToken: input.apiToken, // Store encrypted value
      providerConfig: { useCrumb, crumbPath } as any,
      createdByAccountId: accountId,
      verificationStatus: verify.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID,
      lastVerifiedAt: new Date(),
      verificationError: verify.isValid ? null : verify.message
    };
    const created = await this.repository.create(createData);
    return this.toSafe(created);
  };

  get = async (tenantId: string): Promise<SafeCICDIntegration | null> => {
    const found = await this.repository.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    return found ? this.toSafe(found) : null;
  };

  update = async (tenantId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration> => {
    const existing = await this.repository.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    if (!existing) {
      throw new Error(ERROR_MESSAGES.JENKINS_NOT_FOUND);
    }
    // Always verify on update
    const providerConfig = updateData.providerConfig as Record<string, unknown> | undefined;
    const useCrumb = typeof providerConfig?.useCrumb === 'boolean' ? (providerConfig.useCrumb as boolean) : true;
    const crumbPathValue = providerConfig?.crumbPath;
    const crumbPath = typeof crumbPathValue === 'string' ? crumbPathValue : PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;
    const withSecrets = await this.repository.findById(existing.id);
    const hostUrlToUse = updateData.hostUrl ?? existing.hostUrl;
    const usernameToUse = updateData.username ?? existing.username as string;
    const storedToken = (withSecrets as any)?.apiToken as string | undefined;
    const tokenToUse = updateData.apiToken ?? storedToken;
    const tokenMissing = !tokenToUse;

    if (tokenMissing) {
      updateData.verificationStatus = VerificationStatus.INVALID;
      updateData.lastVerifiedAt = new Date();
      updateData.verificationError = ERROR_MESSAGES.JENKINS_VERIFY_REQUIRED;
    } else {
      // Decrypt the token before verification (may be stored encrypted)
      const decryptedToken = decryptIfEncrypted(tokenToUse, 'apiToken');
      const verify = await this.verifyConnection({
        hostUrl: hostUrlToUse,
        username: usernameToUse,
        apiToken: decryptedToken,
        useCrumb,
        crumbPath
      });
      updateData.verificationStatus = verify.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID;
      updateData.lastVerifiedAt = new Date();
      updateData.verificationError = verify.isValid ? null : verify.message;
    }
    const updated = await this.repository.update(existing.id, updateData);
    const wasInvalid = updateData.verificationStatus === VerificationStatus.INVALID;
    if (wasInvalid) {
      const errorMessage = updateData.verificationError ?? ERROR_MESSAGES.JENKINS_VERIFY_FAILED;
      throw new Error(errorMessage);
    }
    return this.toSafe(updated as any);
  };

  delete = async (tenantId: string): Promise<void> => {
    const existing = await this.repository.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    if (!existing) {
      throw new Error(ERROR_MESSAGES.JENKINS_NOT_FOUND);
    }
    await this.repository.delete(existing.id);
  };
}


