/**
 * SCM Integration Interface
 * Defines the contract that all SCM services must implement
 * Used by Release Service to interact with SCM providers (GitHub, GitLab, Bitbucket, etc.)
 */

export interface SCMIntegration {
  /**
   * Check if a branch exists in the repository
   * 
   * @param tenantId - Tenant ID to fetch integration config
   * @param branch - Branch name to check
   * @param customConfig - Optional per-request config overrides
   * @returns true if branch exists, false otherwise
   */
  checkBranchExists(
    tenantId: string,
    branch: string
  ): Promise<boolean>;

  /**
   * Fork out a new branch from a base branch
   * Creates a new branch for the release
   * 
   * @param tenantId - Tenant ID to fetch integration config
   * @param releaseBranch - Name of the new branch to create
   * @param baseBranch - Base branch to fork from
   * @param customConfig - Optional per-request config overrides
   */
  forkOutBranch(
    tenantId: string,
    releaseBranch: string,
    baseBranch: string
  ): Promise<void>;

  /**
   * Create release tag in repository
   * 
   * Supports two use cases:
   * 1. **RC Tags (Stage 2 - Regression)**: Pass explicit tagName (e.g., "v1.0.0_rc_0")
   * 2. **Final Release Tags (Stage 3 - Release)**: Pass targets + version, integration generates tag (e.g., "wps_1.0.0")
   * 
   * Business logic handled by integration:
   * - If tagName provided: Uses it directly (for RC tags)
   * - If tagName not provided: Generates from targets + version (for final release tags)
   *   - Format: {initials}_{version} (e.g., "wps_1.0.0" from ['WEB', 'PLAY_STORE'] + "1.0.0")
   * - Creates git tag pointing to releaseBranch
   * 
   * NOTE: Orchestration layer stores tag name in release.stageData (integration just returns it)
   * 
   * @param tenantId - Tenant ID to fetch integration config
   * @param releaseBranch - Branch to tag (e.g., 'release/v1.0.0')
   * @param tagName - Optional explicit tag name (for RC tags: "v1.0.0_rc_0")
   * @param targets - Optional array of target names (for final tags: ['WEB', 'PLAY_STORE', 'APP_STORE'])
   * @param version - Release version (e.g., '1.0.0') - required if tagName not provided
   * @param customConfig - Optional per-request config overrides
   * @returns Created tag name
   */
  createReleaseTag(
    tenantId: string,
    releaseBranch: string,
    tagName?: string,
    targets?: string[],
    version?: string
  ): Promise<string>;

  /**
   * Create release notes between two tags
   * 
   * Optional method - typically not needed separately since createGitHubRelease handles it.
   * Only use if you need notes without creating a release.
   * 
   * Business logic handled by integration:
   * - Determines previousTag using one of these (in order):
   *   1. If previousTag provided: Uses it directly
   *   2. If previousTag is null but baseVersion + parentTargets provided: 
   *      Generates previousTag using createReleaseTag(parentTargets, baseVersion)
   *   3. If neither provided: Finds latest tag from repository
   * - Compares commits between currentTag and previousTag
   * - Extracts PR info or commit messages
   * - Formats release notes content
   * 
   * @param tenantId - Tenant ID to fetch integration config
   * @param currentTag - Current release tag
   * @param previousTag - Optional previous release tag (from parent.releaseTag)
   *                      If null, integration will determine it using baseVersion + parentTargets or find latest tag
   * @param baseVersion - Optional base version (required if previousTag is null)
   *                      Used to generate previousTag: createReleaseTag(parentTargets, baseVersion)
   * @param parentTargets - Optional array of parent target names (required if previousTag is null)
   *                        Used to generate previousTag: createReleaseTag(parentTargets, baseVersion)
   *                        Example: ['WEB', 'PLAY_STORE', 'APP_STORE']
   * @param releaseId - Optional release ID for logging/debugging (not required for GitHub operation)
   * @param customConfig - Optional per-request config overrides
   * @returns Formatted release notes content as string
   */
  createReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    baseVersion?: string,
    parentTargets?: string[],
    releaseId?: string
  ): Promise<string>;

  /**
   * Create final release notes
   * 
   * @param tenantId - Tenant ID to fetch integration config
   * @param currentTag - Current release tag
   * @param previousTag - Optional previous release tag (from parent.releaseTag)
   * @param releaseDate - Release date
   * @returns Formatted release notes content as string
   */
  createFinalReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    releaseDate?: Date,
  ): Promise<string>;

  /**
   * Get commit diff between branch and tag
   * Used for checking cherry picks (new commits in release branch)
   * 
   * @param tenantId - Tenant ID to fetch integration config
   * @param branch - Release branch name (e.g., 'release/v1.0.0')
   * @param tag - Previous release tag (e.g., "v1.0.0_rc_2")
   * @param releaseId - Optional release ID for logging/debugging (not required for GitHub operation)
   * @param customConfig - Optional per-request config overrides
   * @returns Number of commits between branch and tag
   */
  getCommitsDiff(
    tenantId: string,
    branch: string,
    tag: string,
    releaseId?: string
  ): Promise<number>;

  /**
   * Check whether the commit pointed to by the release tag matches
   * the current HEAD commit on the release branch.
   *
   * Returns:
   * - true  → they differ (branch has diverged since tag; cherry-picks present)
   * - false → tag commit and branch HEAD are the same (no extra commits)
   */
  checkCherryPickStatus(
    tenantId: string,
    releaseId: string
  ): Promise<boolean>;
}

