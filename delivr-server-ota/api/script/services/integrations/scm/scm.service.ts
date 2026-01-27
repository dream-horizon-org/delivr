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
  private getProviderForTenant = async (appId: string) => {
    const storage = getStorage() as unknown as { scmController?: { findActiveByTenantWithTokens: (appId: string) => Promise<{ scmType: SCMType } | null> } };
    const controller = storage?.scmController;
    const controllerMissing = !controller;
    if (controllerMissing) {
      throw new Error(SCM_ERROR_MESSAGES.ACTIVE_INTEGRATION_NOT_FOUND);
    }
    const integration = await controller.findActiveByTenantWithTokens(appId);
    const integrationMissing = !integration;
    if (integrationMissing) {
      throw new Error(SCM_ERROR_MESSAGES.ACTIVE_INTEGRATION_NOT_FOUND);
    }
    const provider = SCMProviderFactory.getProvider(integration.scmType as SCMType);
    return provider;
  };

  async checkBranchExists(appId: string, branch: string): Promise<boolean> {
    const provider = await this.getProviderForTenant(appId);
    return provider.checkBranchExists(appId, branch);
  }

  async forkOutBranch(appId: string, releaseBranch: string, baseBranch: string): Promise<void> {
    const provider = await this.getProviderForTenant(appId);
    await provider.forkOutBranch(appId, releaseBranch, baseBranch);
  }

  async createReleaseTag(
    appId: string,
    releaseBranch: string,
    tagName?: string,
    targets?: string[],
    version?: string
  ): Promise<string> {
    const provider = await this.getProviderForTenant(appId);
    return provider.createReleaseTag(appId, releaseBranch, tagName, targets, version);
  }

  async createReleaseNotes(
    appId: string,
    currentTag: string,
    previousTag?: string | null,
    baseVersion?: string,
    parentTargets?: string[],
    releaseId?: string
  ): Promise<string> {
    const provider = await this.getProviderForTenant(appId);
    return provider.createReleaseNotes(appId, currentTag, previousTag, baseVersion, parentTargets, releaseId);
    }

  async createFinalReleaseNotes(
    appId: string,
    currentTag: string,
    previousTag?: string | null,
    releaseDate?: Date
  ): Promise<string> {
    const provider = await this.getProviderForTenant(appId);
    return provider.createFinalReleaseNotes(appId, currentTag, previousTag, releaseDate);
  }

  async getCommitsDiff(
    appId: string,
    branch: string,
    tag: string,
    releaseId?: string
  ): Promise<number> {
    const provider = await this.getProviderForTenant(appId);
    return provider.getCommitsDiff(appId, branch, tag, releaseId);
  }

  /**
   * Check if cherry picks are available (branch diverged from tag)
   * 
   * @param appId - app id (to get the right SCM provider and config)
   * @param branch - Branch name to check
   * @param tag - Tag name to compare against
   * @returns true if branch HEAD !== tag commit (cherry picks exist), false otherwise
   */
  async checkCherryPickStatus(appId: string, branch: string, tag: string): Promise<boolean> {
    const provider = await this.getProviderForTenant(appId);
    return provider.checkCherryPickStatus(appId, branch, tag);
  }

  /**
   * Get the URL for a branch in the repository
   * 
   * @param appId - app id to fetch integration config
   * @param branch - Branch name (e.g., 'release/v1.0.0')
   * @returns Full URL to the branch
   */
  async getBranchUrl(appId: string, branch: string): Promise<string> {
    const provider = await this.getProviderForTenant(appId);
    return provider.getBranchUrl(appId, branch);
  }

  /**
   * Get the URL for a tag in the repository
   * 
   * @param appId - app id to fetch integration config
   * @param tag - Tag name (e.g., 'v1.0.0_rc_1')
   * @returns Full URL to the tag
   */
  async getTagUrl(appId: string, tag: string): Promise<string> {
    const provider = await this.getProviderForTenant(appId);
    return provider.getTagUrl(appId, tag);
  }
}