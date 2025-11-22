import type { SCMIntegration } from './scm-integration.interface';
import { SCMProviderFactory } from './providers/provider.factory';
import { getStorage } from '~storage/storage-instance';
import { SCM_ERROR_MESSAGES } from './scm.constants';
import { SCMType } from '~storage/integrations/scm';

/**
 * SCMService
 * Orchestrates SCM operations by selecting the appropriate provider
 * for the active tenant SCM integration and delegating calls.
 */
export class SCMService implements SCMIntegration {
  private getProviderForTenant = async (tenantId: string) => {
    const storage = getStorage() as unknown as { scmController?: { findActiveByTenantWithTokens: (tenantId: string) => Promise<{ scmType: SCMType } | null> } };
    const controller = storage?.scmController;
    const controllerMissing = !controller;
    if (controllerMissing) {
      throw new Error(SCM_ERROR_MESSAGES.ACTIVE_INTEGRATION_NOT_FOUND);
    }
    const integration = await controller.findActiveByTenantWithTokens(tenantId);
    const integrationMissing = !integration;
    if (integrationMissing) {
      throw new Error(SCM_ERROR_MESSAGES.ACTIVE_INTEGRATION_NOT_FOUND);
    }
    const provider = SCMProviderFactory.getProvider(integration.scmType as SCMType);
    return provider;
  };

  async checkBranchExists(tenantId: string, branch: string): Promise<boolean> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.checkBranchExists(tenantId, branch);
  }

  async forkOutBranch(tenantId: string, releaseBranch: string, baseBranch: string): Promise<void> {
    const provider = await this.getProviderForTenant(tenantId);
    await provider.forkOutBranch(tenantId, releaseBranch, baseBranch);
  }

  async createReleaseTag(
    tenantId: string,
    releaseBranch: string,
    tagName?: string,
    targets?: string[],
    version?: string
  ): Promise<string> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.createReleaseTag(tenantId, releaseBranch, tagName, targets, version);
  }

  async createReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    baseVersion?: string,
    parentTargets?: string[],
    releaseId?: string
  ): Promise<string> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.createReleaseNotes(tenantId, currentTag, previousTag, baseVersion, parentTargets, releaseId);
    }

  async createFinalReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    releaseDate?: Date
  ): Promise<string> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.createFinalReleaseNotes(tenantId, currentTag, previousTag, releaseDate);
  }

  async getCommitsDiff(
    tenantId: string,
    branch: string,
    tag: string,
    releaseId?: string
  ): Promise<number> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.getCommitsDiff(tenantId, branch, tag, releaseId);
  }

  async checkCherryPickStatus(tenantId: string, releaseId: string): Promise<boolean> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.checkCherryPickStatus(tenantId, releaseId);
  }
}