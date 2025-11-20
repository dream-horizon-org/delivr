import { ConnectionService } from './connection.service';
import { CICDProviderType, AuthType, VerificationStatus, type SafeCICDIntegration, type CreateCICDIntegrationDto, type UpdateCICDIntegrationDto } from '~types/integrations/ci-cd/connection.interface';
import { ProviderFactory } from '../providers/provider.factory';
import type { GitHubActionsProviderContract, GHAVerifyParams } from '../providers/github-actions/github-actions.interface';
import { ERROR_MESSAGES, HEADERS, PROVIDER_DEFAULTS } from '../../../../constants/cicd';

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
    const verify = await this.verifyConnection({
      apiToken: input.apiToken,
      githubApiBase: PROVIDER_DEFAULTS.GITHUB_API,
      userAgent: HEADERS.USER_AGENT,
      acceptHeader: HEADERS.ACCEPT_GITHUB_JSON,
      timeoutMs: Number(process.env.GHA_VERIFY_TIMEOUT_MS || 6000)
    });
    const created = await this.repository.create({
      tenantId,
      providerType: CICDProviderType.GITHUB_ACTIONS,
      displayName: input.displayName ?? 'GitHub Actions',
      hostUrl: PROVIDER_DEFAULTS.GITHUB_API,
      authType: AuthType.BEARER,
      apiToken: input.apiToken,
      providerConfig: null as any,
      createdByAccountId: accountId,
      verificationStatus: verify.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID,
      lastVerifiedAt: new Date(),
      verificationError: verify.isValid ? null : verify.message
    } as CreateCICDIntegrationDto);
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

    const requiresVerification = (!!updateData.apiToken) && !updateData.verificationStatus;
    if (requiresVerification) {
      const withSecrets = await this.repository.findById(existing.id);
      const tokenToCheck: string | undefined = updateData.apiToken ?? (withSecrets as any)?.apiToken as (string | undefined);

      if (!tokenToCheck) {
        updateData.verificationStatus = VerificationStatus.INVALID;
        updateData.lastVerifiedAt = new Date();
        updateData.verificationError = ERROR_MESSAGES.MISSING_TOKEN_AND_SCM;
      } else {
        const verify = await this.verifyConnection({
          apiToken: tokenToCheck,
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


