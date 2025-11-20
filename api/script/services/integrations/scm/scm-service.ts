/**
 * SCM Service
 * Main service class that implements SCMIntegration interface
 * Routes calls to appropriate provider (GitHub, GitLab, etc.) based on tenant configuration
 * 
 * This is the service that Release Management will use to interact with SCM providers
 */

import { SCMIntegration } from './scm-integration.interface';
import { SCMServiceFactory } from './scm-service-factory';
import { GitHubService } from './github-service';

export class SCMService implements SCMIntegration {
  /**
   * Check if a branch exists in the repository
   */
  async checkBranchExists(
    tenantId: string,
    branch: string,
    customConfig?: any
  ): Promise<boolean> {
    const provider = await this.getProvider(tenantId, customConfig);
    
    try {
      await provider.getBranch(branch);
      return true;
    } catch (error: any) {
      // GitHub returns 404 if branch doesn't exist
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Fork out a new branch from a base branch
   */
  async forkOutBranch(
    tenantId: string,
    releaseBranch: string,
    baseBranch: string,
    customConfig?: any
  ): Promise<void> {
    const provider = await this.getProvider(tenantId, customConfig);
    
    await provider.createBranch({
      baseBranch,
      newBranch: releaseBranch
    });
  }

  /**
   * Create release tag in repository
   */
  async createReleaseTag(
    tenantId: string,
    releaseBranch: string,
    tagName?: string,
    targets?: string[],
    version?: string,
    customConfig?: any
  ): Promise<string> {
    const provider = await this.getProvider(tenantId, customConfig);
    
    // Business logic: Determine tag name
    let finalTagName: string;
    
    if (tagName) {
      // Use explicit tag name (for RC tags)
      finalTagName = tagName;
    } else if (targets && version) {
      // Generate tag name from targets + version
      finalTagName = this.generateTagFromTargets(targets, version);
    } else {
      throw new Error('Either tagName or (targets + version) must be provided');
    }
    
    // Create the tag
    await provider.createTag({
      tagName: finalTagName,
      branchName: releaseBranch,
      message: `Release ${finalTagName}`
    });
    
    return finalTagName;
  }

  /**
   * Create GitHub release with auto-generated notes
   */
  async createGitHubRelease(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    baseVersion?: string,
    parentTargets?: string[],
    releaseDate?: Date,
    releaseId?: string,
    customConfig?: any
  ): Promise<string> {
    const provider = await this.getProvider(tenantId, customConfig);
    
    // Business logic: Determine previous tag
    let finalPreviousTag: string | undefined;
    
    if (previousTag) {
      // Use provided previous tag
      finalPreviousTag = previousTag;
    } else if (previousTag === null && baseVersion && parentTargets) {
      // Generate previous tag from baseVersion + parentTargets
      finalPreviousTag = this.generateTagFromTargets(parentTargets, baseVersion);
    } else {
      // Let provider find latest tag
      finalPreviousTag = undefined;
    }
    
    // Generate release notes
    const notes = await provider.generateReleaseNotes(
      currentTag,
      finalPreviousTag || '' // Provide empty string if undefined
    );
    
    // Format release body
    const releaseBody = this.formatReleaseBody(notes.markdown, releaseDate);
    
    // Create release
    const release = await provider.createRelease({
      tagName: currentTag,
      releaseName: currentTag,
      releaseBody: releaseBody,
      draft: false,
      prerelease: currentTag.includes('_rc_')
    });
    
    return release.html_url;
  }

  /**
   * Create release notes between two tags
   */
  async createReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    baseVersion?: string,
    parentTargets?: string[],
    releaseId?: string,
    customConfig?: any
  ): Promise<string> {
    const provider = await this.getProvider(tenantId, customConfig);
    
    // Business logic: Determine previous tag (same as createGitHubRelease)
    let finalPreviousTag: string | undefined;
    
    if (previousTag) {
      finalPreviousTag = previousTag;
    } else if (previousTag === null && baseVersion && parentTargets) {
      finalPreviousTag = this.generateTagFromTargets(parentTargets, baseVersion);
    } else {
      finalPreviousTag = undefined;
    }
    
    const notes = await provider.generateReleaseNotes(
      currentTag,
      finalPreviousTag || '' // Provide empty string if undefined
    );
    
    return this.formatReleaseBody(notes.markdown, new Date());
  }

  /**
   * Get commit diff between branch and tag
   */
  async getCommitsDiff(
    tenantId: string,
    branch: string,
    tag: string,
    releaseId?: string,
    customConfig?: any
  ): Promise<number> {
    const provider = await this.getProvider(tenantId, customConfig);
    
    const comparison = await provider.compareCommits(
      tag,    // base
      branch  // head
    );
    
    return comparison.total_commits;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get SCM provider instance for tenant
   */
  private async getProvider(tenantId: string, customConfig?: any): Promise<GitHubService> {
    if (customConfig) {
      // Use custom config if provided (for testing or overrides)
      return SCMServiceFactory.create(customConfig);
    }
    
    // Fetch provider based on tenant's SCM integration
    return SCMServiceFactory.createForTenant(tenantId);
  }

  /**
   * Generate tag name from targets and version
   * Format: {initials}_{version}
   * 
   * Example:
   * - targets: ['WEB', 'PLAY_STORE', 'APP_STORE'] + version: '1.0.0' → 'wps_1.0.0'
   * - targets: ['PLAY_STORE'] + version: '2.1.3' → 'p_2.1.3'
   */
  private generateTagFromTargets(targets: string[], version: string): string {
    const initials = targets
      .map(target => {
        // Extract first letter of each word
        // WEB → w, PLAY_STORE → ps, APP_STORE → as
        return target
          .split('_')
          .map(word => word.charAt(0).toLowerCase())
          .join('');
      })
      .join('');
    
    return `${initials}_${version}`;
  }

  /**
   * Format release body with date and notes
   */
  private formatReleaseBody(notes: string, releaseDate: Date = new Date()): string {
    const formattedDate = releaseDate.toISOString().split('T')[0];
    
    return `## Release Date: ${formattedDate}\n\n${notes}`;
  }
}

