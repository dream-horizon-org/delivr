/**
 * SCM Integration Module
 * 
 * This module provides a unified interface for interacting with Source Control Management systems
 * (GitHub, GitLab, Bitbucket, etc.)
 * 
 * Usage by Release Service:
 * 
 * ```typescript
 * import { SCMService, SCMIntegration } from '~/services/integrations/scm';
 * 
 * // In Release Service
 * class ReleaseService {
 *   private scmService: SCMIntegration;
 * 
 *   constructor() {
 *     this.scmService = new SCMService();
 *   }
 * 
 *   async kickoffRelease(releaseId: string, appId: string) {
 *     // Check if branch exists
 *     const exists = await this.scmService.checkBranchExists(appId, 'main');
 *     
 *     if (exists) {
 *       // Fork out release branch
 *       await this.scmService.forkOutBranch(appId, 'release/v1.0.0', 'main');
 *     }
 *   }
 * 
 *   async createRCTag(releaseId: string, appId: string, rcNumber: number) {
 *     const tagName = `v1.0.0_rc_${rcNumber}`;
 *     await this.scmService.createReleaseTag(appId, 'release/v1.0.0', tagName);
 *   }
 * 
 *   async finalizeRelease(releaseId: string, appId: string) {
 *     // Create final tag
 *     const tag = await this.scmService.createReleaseTag(
 *       appId,
 *       'release/v1.0.0',
 *       undefined, // no explicit tag
 *       ['WEB', 'PLAY_STORE', 'APP_STORE'], // targets
 *       '1.0.0' // version
 *     );
 *     
 *     // Create GitHub release
 *     const releaseUrl = await this.scmService.createGitHubRelease(
 *       appId,
 *       tag,
 *       'v0.9.0_final', // previous tag
 *       undefined, // baseVersion (not needed if previousTag provided)
 *       undefined // parentTargets (not needed if previousTag provided)
 *     );
 *     
 *     return releaseUrl;
 *   }
 * }
 * ```
 */

export { SCMIntegration } from './scm-integration.interface';
export { SCMService } from './scm.service';
export { SCMProviderFactory } from './providers/provider.factory';
export { GitHubProvider } from './providers/github/github.provider';