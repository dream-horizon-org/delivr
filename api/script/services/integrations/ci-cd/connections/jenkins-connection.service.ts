import { ConnectionService } from './connection.service';
import { CICDProviderType, AuthType, VerificationStatus } from '../../../../storage/integrations/ci-cd/ci-cd-types';
import type { SafeCICDIntegration, CreateCICDIntegrationDto, UpdateCICDIntegrationDto } from '../../../../storage/integrations/ci-cd/ci-cd-types';
import { ProviderFactory } from '../providers/provider.factory';
import type { JenkinsProviderContract, JenkinsVerifyParams } from '../providers/jenkins/jenkins.interface';
import { PROVIDER_DEFAULTS, ERROR_MESSAGES } from '../../../../constants/cicd';

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
    const existing = await this.cicd.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    if (existing) {
      throw new Error(ERROR_MESSAGES.JENKINS_ALREADY_EXISTS);
    }
    const useCrumb = input.providerConfig?.useCrumb ?? true;
    const crumbPath = input.providerConfig?.crumbPath ?? PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;
    const verify = await this.verifyConnection({
      hostUrl: input.hostUrl,
      username: input.username,
      apiToken: input.apiToken,
      useCrumb,
      crumbPath
    });

    const createData: CreateCICDIntegrationDto = {
      tenantId,
      providerType: CICDProviderType.JENKINS,
      displayName: input.displayName ?? 'Jenkins',
      hostUrl: input.hostUrl,
      authType: AuthType.BASIC,
      username: input.username,
      apiToken: input.apiToken,
      providerConfig: { useCrumb, crumbPath } as any,
      createdByAccountId: accountId,
      verificationStatus: verify.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID,
      lastVerifiedAt: new Date(),
      verificationError: verify.isValid ? null : verify.message
    };
    const created: SafeCICDIntegration = await this.cicd.create(createData);
    return created;
  };

  get = async (tenantId: string): Promise<SafeCICDIntegration | null> => {
    return this.cicd.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
  };

  update = async (tenantId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration> => {
    const existing = await this.cicd.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    if (!existing) {
      throw new Error(ERROR_MESSAGES.JENKINS_NOT_FOUND);
    }
    const needsVerify = (updateData.apiToken || updateData.username || updateData.hostUrl) && !updateData.verificationStatus;
    if (needsVerify) {
      const useCrumb = updateData.providerConfig?.useCrumb ?? true;
      const crumbPath = updateData.providerConfig?.crumbPath ?? PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;
      const withSecrets = await this.cicd.findById(existing.id, true);
      const verify = await this.verifyConnection({
        hostUrl: updateData.hostUrl ?? existing.hostUrl,
        username: updateData.username ?? existing.username as string,
        apiToken: (updateData.apiToken ?? (withSecrets as any)?.apiToken) as string,
        useCrumb,
        crumbPath
      });
      updateData.verificationStatus = verify.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID;
      updateData.lastVerifiedAt = new Date();
      updateData.verificationError = verify.isValid ? null : verify.message;
    }
    const updated: SafeCICDIntegration = await this.cicd.update(existing.id, updateData);
    return updated;
  };

  delete = async (tenantId: string): Promise<void> => {
    const existing = await this.cicd.findByTenantAndProvider(tenantId, CICDProviderType.JENKINS);
    if (!existing) {
      throw new Error(ERROR_MESSAGES.JENKINS_NOT_FOUND);
    }
    await this.cicd.delete(existing.id);
  };
}


