/**
 * Mock SCM Service for Testing
 * 
 * Provides mock implementations of SCM operations without requiring
 * actual GitHub integrations in the database.
 */

/**
 * Mock SCM Service
 * Returns successful mock responses for all SCM operations
 */
export class MockSCMService {
  /**
   * Mock fork branch operation
   */
  async forkOutBranch(
    tenantId: string,
    branchName: string,
    baseBranch: string
  ): Promise<void> {
    console.log(`[MockSCM] Fork branch: ${branchName} from ${baseBranch}`);
    return Promise.resolve();
  }

  /**
   * Mock create release tag
   */
  async createReleaseTag(
    tenantId: string,
    branchName: string,
    tagName: string,
    targets?: string[],
    version?: string
  ): Promise<string> {
    console.log(`[MockSCM] Create tag: ${tagName} on ${branchName}`);
    return Promise.resolve(tagName || `v${version || '1.0.0'}-rc1`);
  }

  /**
   * Mock create release notes
   */
  async createReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string
  ): Promise<string> {
    console.log(`[MockSCM] Create release notes: ${currentTag}`);
    return Promise.resolve(`Mock release notes for ${currentTag}`);
  }

  /**
   * Mock create final release notes (GitHub Release)
   */
  async createFinalReleaseNotes(
    tenantId: string,
    tagName: string,
    releaseDate: Date
  ): Promise<string> {
    console.log(`[MockSCM] Create final release: ${tagName}`);
    return Promise.resolve(`https://github.com/mock-org/mock-repo/releases/tag/${tagName}`);
  }
}


