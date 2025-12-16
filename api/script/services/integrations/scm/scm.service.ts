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

  /**
   * Check if cherry picks are available (branch diverged from tag)
   * 
   * @param tenantId - Tenant ID (to get the right SCM provider and config)
   * @param branch - Branch name to check
   * @param tag - Tag name to compare against
   * @returns true if branch HEAD !== tag commit (cherry picks exist), false otherwise
   */
  async checkCherryPickStatus(tenantId: string, branch: string, tag: string): Promise<boolean> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.checkCherryPickStatus(tenantId, branch, tag);
  }

  /**
   * Get the URL for a branch in the repository
   * 
   * @param tenantId - Tenant ID to fetch integration config
   * @param branch - Branch name (e.g., 'release/v1.0.0')
   * @returns Full URL to the branch
   */
  async getBranchUrl(tenantId: string, branch: string): Promise<string> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.getBranchUrl(tenantId, branch);
  }

  /**
   * Get the URL for a tag in the repository
   * 
   * @param tenantId - Tenant ID to fetch integration config
   * @param tag - Tag name (e.g., 'v1.0.0_rc_1')
   * @returns Full URL to the tag
   */
  async getTagUrl(tenantId: string, tag: string): Promise<string> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.getTagUrl(tenantId, tag);
  }
}