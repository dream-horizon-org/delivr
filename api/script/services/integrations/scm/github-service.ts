// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { Octokit } from 'octokit';
import type { SCMIntegration } from './scm-integration.interface';
import { HTTP_STATUS } from '~constants/http';
import { SCM_ERROR_MESSAGES } from './scm.constants';
import { getStorage } from '~storage/storage-instance';
import { SCMIntegrationController } from '~storage/integrations/scm';
import {
  generateTagNameFromTargetsAndVersion,
  tryGenerateTagFromTargets,
  getLatestTagName,
  generateReleaseNotes
} from './github.utils';
type OctokitClient = InstanceType<typeof Octokit>;

export class GitHubService implements SCMIntegration {
  private readonly scmController: SCMIntegrationController;

  constructor(deps?: { scmController?: SCMIntegrationController }) {
    const hasProvidedController = !!deps?.scmController;
    if (hasProvidedController) {
      this.scmController = deps!.scmController as SCMIntegrationController;
      return;
    }
    const storage = getStorage() as unknown as { scmController?: SCMIntegrationController };
    const controllerAvailable = !!storage && !!storage.scmController;
    if (!controllerAvailable) {
      throw new Error(SCM_ERROR_MESSAGES.ACTIVE_INTEGRATION_NOT_FOUND);
    }
    this.scmController = storage.scmController as SCMIntegrationController;
  }

  async checkBranchExists(
    tenantId: string,
    branch: string
  ): Promise<boolean> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    try {
      await client.repos.getBranch({ owner, repo, branch });
      return true;
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status ?? 0;
      const isNotFound = status === HTTP_STATUS.NOT_FOUND;
      if (isNotFound) {
        return false;
      }
      throw error;
    }
  }

  async forkOutBranch(
    tenantId: string,
    releaseBranch: string,
    baseBranch: string,
  ): Promise<void> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);

    const baseRefResponse = await client.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`
    });
    const baseSha = baseRefResponse.data.object.sha;

    await client.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${releaseBranch}`,
      sha: baseSha
    });
  }

  async createReleaseTag(
    tenantId: string,
    releaseBranch: string,
    tagName?: string,
    targets?: string[],
    version?: string,
  ): Promise<string> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);

    const hasExplicitTag = typeof tagName === 'string' && tagName.length > 0;
    const finalTagName = hasExplicitTag ? (tagName as string) : generateTagNameFromTargetsAndVersion(targets, version);

    const branch = await client.repos.getBranch({ owner, repo, branch: releaseBranch });
    const commitSha = branch.data.commit.sha;

    const tagObject = await client.git.createTag({
      owner,
      repo,
      tag: finalTagName,
      message: `Release tag: ${finalTagName} created for ${releaseBranch}`,
      object: commitSha,
      type: 'commit'
    });

    let tagExists = false;
    try {
      await client.git.getRef({ owner, repo, ref: `tags/${finalTagName}` });
      tagExists = true;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 0;
      if (status !== HTTP_STATUS.NOT_FOUND) {
        throw err;
      }
    }
    if (!tagExists) {
      await client.git.createRef({
        owner,
        repo,
        ref: `refs/tags/${finalTagName}`,
        sha: tagObject.data.sha
      });
    }

    return finalTagName;
  }

  async createReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    baseVersion?: string,
    parentTargets?: string[],
    _releaseId?: string,
  ): Promise<string> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);

    const hasExplicitPrevious = typeof previousTag === 'string' && previousTag.length > 0;
    let prev = hasExplicitPrevious
      ? (previousTag as string)
      : tryGenerateTagFromTargets(parentTargets, baseVersion);

    if (!prev) {
      const latest = await getLatestTagName(client, owner, repo);
      prev = latest ?? currentTag;
    }

    const notes = await generateReleaseNotes(client, owner, repo, currentTag, prev);
    return notes;
  }

  async createFinalReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    releaseDate?: Date,
  ): Promise<string> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);

    const notes = await generateReleaseNotes(client, owner, repo, currentTag, previousTag);
    const dateStr = (releaseDate ?? new Date()).toISOString().split('T')[0];
    const body = `## Release Date: \n${dateStr}\n\n## What's Changed\n${notes}`;

    const { data } = await client.repos.createRelease({
      owner,
      repo,
      tag_name: currentTag,
      name: currentTag,
      body
    });
    return data.html_url;
  }

  async getCommitsDiff(
    tenantId: string,
    branch: string,
    tag: string,
    _releaseId?: string
  ): Promise<number> {
    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    const { data } = await client.repos.compareCommits({
      owner,
      repo,
      base: tag,
      head: branch
    });
    return data.total_commits;
  }

  async checkCherryPickStatus(
    tenantId: string,
    releaseId: string
  ): Promise<boolean> {
    const storage = getStorage() as unknown as { setupPromise?: Promise<void>; sequelize?: any };
    const hasSetup = !!storage && !!storage.setupPromise;
    if (hasSetup) {
      await storage.setupPromise;
    }

    const sequelize = (storage as any).sequelize;
    const hasSequelize = !!sequelize && !!sequelize.models && !!sequelize.models.release;
    if (!hasSequelize) {
      // If we cannot read release data, conservatively return false
      return false;
    }

    const ReleaseModel = sequelize.models.release;
    const release = await ReleaseModel.findOne({ where: { id: releaseId, tenantId } });
    const releaseNotFound = !release;
    if (releaseNotFound) {
      return false;
    }

    const data = release.dataValues || {};
    const releaseBranch: string | undefined = data.branchRelease;
    const releaseTag: string | undefined = data.releaseTag;

    const releaseBranchMissing = !releaseBranch || releaseBranch.length === 0;
    const releaseTagMissing = !releaseTag || releaseTag.length === 0;
    const cannotCompare = releaseBranchMissing || releaseTagMissing;
    if (cannotCompare) {
      return false;
    }

    const { client, owner, repo } = await this.getClientAndRepo(tenantId);
    // Get HEAD commit of release branch
    const branchResp = await client.repos.getBranch({ owner, repo, branch: releaseBranch as string });
    const branchHeadSha = branchResp.data?.commit?.sha ?? '';

    // Resolve tag to underlying commit SHA
    const tagCommitSha = await this.resolveTagCommitSha(client, owner, repo, releaseTag as string);
    const tagMissing = !tagCommitSha || tagCommitSha.length === 0;
    if (tagMissing) {
      return false;
    }

    const hasCherryPicks = branchHeadSha !== tagCommitSha;
    return hasCherryPicks;
  }

  private getClientAndRepo = async (
    tenantId: string
  ): Promise<{ client: OctokitClient; owner: string; repo: string }> => {
    const integration = await this.scmController.findActiveByTenantWithTokens(tenantId);
    const notFound = !integration;
    if (notFound) {
      throw new Error(SCM_ERROR_MESSAGES.ACTIVE_INTEGRATION_NOT_FOUND);
    }

    const dbOwner = (integration as any).owner as string | undefined;
    const dbRepo = (integration as any).repo as string | undefined;
    const dbToken = (integration as any).accessToken as string | undefined;

    const owner = dbOwner ?? '';
    const repo = dbRepo ?? '';
    const accessToken = dbToken ?? '';

    const ownerMissing = owner.length === 0;
    if (ownerMissing) {
      throw new Error(SCM_ERROR_MESSAGES.MISSING_REPOSITORY_CONFIGURATION);
    }
    const repoMissing = repo.length === 0;
    if (repoMissing) {
      throw new Error(SCM_ERROR_MESSAGES.MISSING_REPOSITORY_CONFIGURATION);
    }
    const tokenMissing = accessToken.length === 0;
    if (tokenMissing) {
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
      const refResp = await client.git.getRef({ owner, repo, ref: `tags/${tagName}` });
      let sha = (refResp.data as any)?.object?.sha ?? refResp.data?.object?.sha ?? '';
      let type = (refResp.data as any)?.object?.type ?? refResp.data?.object?.type ?? 'commit';

      // If annotated tag, dereference once (and one more time if nested)
      const deref = async (currentSha: string): Promise<{ sha: string; type: string }> => {
        const tagResp = await client.git.getTag({ owner, repo, tag_sha: currentSha });
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