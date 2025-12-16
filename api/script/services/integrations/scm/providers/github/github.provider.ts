import { Octokit } from 'octokit';
import type { SCMIntegration } from '../../scm-integration.interface';
import { HTTP_STATUS } from '~constants/http';
import { SCM_ERROR_MESSAGES } from '../../scm.constants';
import { getStorage } from '~storage/storage-instance';
import { SCMIntegrationController } from '~storage/integrations/scm';
import {
  generateTagNameFromTargetsAndVersion,
  tryGenerateTagFromTargets,
  getLatestTagName,
  generateReleaseNotes
} from './github.utils';

type OctokitClient = InstanceType<typeof Octokit>;

export class GitHubProvider implements SCMIntegration {
  private readonly scmController: SCMIntegrationController;

  constructor(deps?: { scmController?: SCMIntegrationController }) {
    if (deps?.scmController) {
      this.scmController = deps.scmController;
      return;
    }
    const storage = getStorage() as unknown as { scmController?: SCMIntegrationController };
    if (!storage || !storage.scmController) {
      throw new Error(SCM_ERROR_MESSAGES.ACTIVE_INTEGRATION_NOT_FOUND);
    }
    this.scmController = storage.scmController;
  }

  async checkBranchExists(tenantId: string, branch: string): Promise<boolean> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    try {
      await client.rest.repos.getBranch({ owner, repo, branch });
      return true;
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status ?? 0;
      return status === HTTP_STATUS.NOT_FOUND ? false : Promise.reject(error);
    }
  }

  async forkOutBranch(tenantId: string, releaseBranch: string, baseBranch: string): Promise<void> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    const baseRef = await client.rest.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
    const baseSha = baseRef.data.object.sha;
    await client.rest.git.createRef({ owner, repo, ref: `refs/heads/${releaseBranch}`, sha: baseSha });
  }

  async createReleaseTag(
    tenantId: string,
    releaseBranch: string,
    tagName?: string,
    targets?: string[],
    version?: string
  ): Promise<string> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    const hasExplicitTag = typeof tagName === 'string' && tagName.length > 0;
    const finalTagName = hasExplicitTag ? (tagName as string) : generateTagNameFromTargetsAndVersion(targets, version);

    const branch = await client.rest.repos.getBranch({ owner, repo, branch: releaseBranch });
    const commitSha = branch.data.commit.sha;

    const tagObject = await client.rest.git.createTag({
      owner,
      repo,
      tag: finalTagName,
      message: `Release tag: ${finalTagName} created for ${releaseBranch}`,
      object: commitSha,
      type: 'commit'
    });

    try {
      await client.rest.git.getRef({ owner, repo, ref: `tags/${finalTagName}` });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 0;
      if (status !== HTTP_STATUS.NOT_FOUND) throw err;
      await client.rest.git.createRef({ owner, repo, ref: `refs/tags/${finalTagName}`, sha: tagObject.data.sha });
    }
    return finalTagName;
  }

  async createReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    baseVersion?: string,
    parentTargets?: string[],
    _releaseId?: string
  ): Promise<string> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    const hasExplicitPrevious = typeof previousTag === 'string' && previousTag.length > 0;
    let prev = hasExplicitPrevious ? (previousTag as string) : tryGenerateTagFromTargets(parentTargets, baseVersion);
    if (!prev) {
      const latest = await getLatestTagName(client, owner, repo);
      prev = latest ?? currentTag;
    }
    return await generateReleaseNotes(client, owner, repo, currentTag, prev);
  }

  async createFinalReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    releaseDate?: Date
  ): Promise<string> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    const notes = await generateReleaseNotes(client, owner, repo, currentTag, previousTag ?? currentTag);
    const dateStr = (releaseDate ?? new Date()).toISOString().split('T')[0];
    const body = `## Release Date: \n${dateStr}\n\n## What's Changed\n${notes}`;
    const { data } = await client.rest.repos.createRelease({ owner, repo, tag_name: currentTag, name: currentTag, body });
    return data.html_url;
  }

  async getCommitsDiff(tenantId: string, branch: string, tag: string, _releaseId?: string): Promise<number> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    const { data } = await client.rest.repos.compareCommits({ owner, repo, base: tag, head: branch });
    return data.total_commits;
  }

  /**
   * Check if cherry picks are available (branch diverged from tag)
   * 
   * @param tenantId - Tenant ID (to fetch tenant-specific SCM config)
   * @param branch - Branch name to check
   * @param tag - Tag name to compare against
   * @returns true if branch HEAD !== tag commit (cherry picks exist), false otherwise
   */
  async checkCherryPickStatus(tenantId: string, branch: string, tag: string): Promise<boolean> {
    // Get tenant-specific client, owner, and repo
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    const branchResp = await client.rest.repos.getBranch({ owner, repo, branch });
    const branchHeadSha = branchResp.data?.commit?.sha ?? '';
    
    // Get tag commit SHA
    const tagCommitSha = await this.resolveTagCommitSha(client, owner, repo, tag);
    
    if (!tagCommitSha) {
      return false;
    }
    
    // Compare: cherry picks exist if branch HEAD differs from tag
    return branchHeadSha !== tagCommitSha;
  }

  private getClientAndRepo = async (
    tenantId: string
  ): Promise<{ client: OctokitClient; owner: string; repo: string }> => {
    const integration = await this.scmController.findActiveByTenantWithTokens(tenantId);
    if (!integration) {
      throw new Error(SCM_ERROR_MESSAGES.ACTIVE_INTEGRATION_NOT_FOUND);
    }
    const dbOwner = (integration as any).owner as string | undefined;
    const dbRepo = (integration as any).repo as string | undefined;
    const dbToken = (integration as any).accessToken as string | undefined;
    const owner = dbOwner ?? '';
    const repo = dbRepo ?? '';
    const accessToken = dbToken ?? '';
    if (!owner || !repo) {
      throw new Error(SCM_ERROR_MESSAGES.MISSING_REPOSITORY_CONFIGURATION);
    }
    if (!accessToken) {
      throw new Error(SCM_ERROR_MESSAGES.MISSING_ACCESS_TOKEN);
    }
    const client = new Octokit({ auth: accessToken });
    return { client, owner, repo };
  };

  private resolveTagCommitSha = async (
    client: OctokitClient,
    owner: string,
    repo: string,
    tagName: string
  ): Promise<string> => {
    try {
      const refResp = await client.rest.git.getRef({ owner, repo, ref: `tags/${tagName}` });
      let sha = (refResp.data as any)?.object?.sha ?? refResp.data?.object?.sha ?? '';
      let type = (refResp.data as any)?.object?.type ?? refResp.data?.object?.type ?? 'commit';
      const deref = async (currentSha: string): Promise<{ sha: string; type: string }> => {
        const tagResp = await client.rest.git.getTag({ owner, repo, tag_sha: currentSha });
        const obj = tagResp.data?.object as any;
        const objSha = obj?.sha ?? '';
        const objType = obj?.type ?? 'commit';
        return { sha: objSha, type: objType };
      };
      if (type === 'tag') {
        const first = await deref(sha);
        sha = first.sha;
        type = first.type;
        if (type === 'tag') {
          const second = await deref(sha);
          sha = second.sha;
          type = second.type;
        }
      }
      return sha;
    } catch {
      return '';
    }
  };
}


