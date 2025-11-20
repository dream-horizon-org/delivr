// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Octokit } from 'octokit';
import { Webhooks } from '@octokit/webhooks';
import type { EmitterWebhookEventName } from '@octokit/webhooks';
import * as schedule from 'node-schedule';

import type {
  SCMConfig,
  CreateBranchArgs,
  TriggerWorkflowArgs,
  WorkflowRun,
  RerunFailedJobsArgs,
  CreateTagArgs,
  CreateReleaseArgs,
  Release,
  CommitComparison,
  PullRequest,
  CreateWebhookArgs,
  Webhook,
  Branch,
  Tag,
  ReleaseNotes,
  WorkflowStatus,
  WorkflowConclusion
} from './scm-types';

/**
 * GitHub Service
 * Implements all GitHub API operations for Release Management
 */
export class GitHubService {
  private client: Octokit['rest'];
  private webhooks: Webhooks | null = null;
  private config: {
    owner: string;
    repo: string;
  };

  constructor(private scmConfig: SCMConfig) {
    this.client = new Octokit({
      auth: scmConfig.accessToken
    }).rest;

    this.config = {
      owner: scmConfig.owner,
      repo: scmConfig.repo
    };

    // Initialize webhooks if secret is provided
    if (scmConfig.webhookSecret) {
      this.webhooks = new Webhooks({
        secret: scmConfig.webhookSecret
      });
    }
  }

  // ============================================================================
  // GIT OPERATIONS - Branch & Tag Management
  // ============================================================================

  /**
   * Create a new branch from a base branch
   */
  async createBranch({ baseBranch, newBranch }: CreateBranchArgs): Promise<void> {
    try {
      // Get latest commit SHA of base branch
      const { data: baseRef } = await this.client.git.getRef({
        ...this.config,
        ref: `heads/${baseBranch}`
      });

      // Create new branch pointing to the same commit
      await this.client.git.createRef({
        ...this.config,
        ref: `refs/heads/${newBranch}`,
        sha: baseRef.object.sha
      });

      console.log(`✅ Branch '${newBranch}' created from '${baseBranch}'`);
    } catch (error) {
      console.error(`Failed to create branch '${newBranch}':`, error);
      throw error;
    }
  }

  /**
   * Get a specific branch details
   */
  async getBranch(branchName: string): Promise<Branch> {
    try {
      const { data } = await this.client.repos.getBranch({
        ...this.config,
        branch: branchName
      });

      return {
        name: data.name,
        commit: {
          sha: data.commit.sha,
          url: data.commit.url
        },
        protected: data.protected
      };
    } catch (error) {
      console.error(`Failed to get branch '${branchName}':`, error);
      throw error;
    }
  }

  /**
   * List all branches (with pagination and caching support)
   */
  async listBranches(searchQuery?: string): Promise<Branch[]> {
    try {
      let allBranches: Branch[] = [];
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const { data: branches } = await this.client.repos.listBranches({
          ...this.config,
          per_page: 100,
          page
        });

        allBranches.push(...branches.map(b => ({
          name: b.name,
          commit: {
            sha: b.commit.sha,
            url: b.commit.url
          }
        })));

        hasMorePages = branches.length === 100;
        page++;
      }

      // Filter by search query if provided
      if (searchQuery && searchQuery.length > 0) {
        const lowerQuery = searchQuery.toLowerCase();
        allBranches = allBranches.filter(b => 
          b.name.toLowerCase().includes(lowerQuery)
        );
      }

      console.log(`✅ Fetched ${allBranches.length} branches`);
      return allBranches;
    } catch (error) {
      console.error('Failed to list branches:', error);
      throw error;
    }
  }

  /**
   * Create an annotated tag
   */
  async createTag({ tagName, branchName, message }: CreateTagArgs): Promise<Tag> {
    try {
      // Get commit SHA from branch
      const branch = await this.getBranch(branchName);
      const commitSHA = branch.commit.sha;

      // Create annotated tag object
      const { data: tagObject } = await this.client.git.createTag({
        ...this.config,
        tag: tagName,
        message: message || `Release tag: ${tagName} created for ${branchName}`,
        object: commitSHA,
        type: 'commit'
      });

      // Check if tag reference already exists
      let tagExists = false;
      try {
        await this.client.git.getRef({
          ...this.config,
          ref: `tags/${tagName}`
        });
        tagExists = true;
        console.log(`⚠️  Tag '${tagName}' already exists`);
      } catch (error: any) {
        if (error?.status !== 404) {
          throw error;
        }
      }

      // Create tag reference if it doesn't exist
      if (!tagExists) {
        await this.client.git.createRef({
          ...this.config,
          ref: `refs/tags/${tagName}`,
          sha: tagObject.sha
        });
      }

      console.log(`✅ Tag '${tagName}' created successfully`);
      
      return {
        name: tagName,
        commit: {
          sha: commitSHA,
          url: branch.commit.url
        }
      };
    } catch (error) {
      console.error(`Failed to create tag '${tagName}':`, error);
      throw error;
    }
  }

  /**
   * Get a specific tag
   */
  async getTag(tagName: string): Promise<Tag> {
    try {
      const { data } = await this.client.git.getRef({
        ...this.config,
        ref: `tags/${tagName}`
      });

      return {
        name: tagName,
        commit: {
          sha: data.object.sha,
          url: data.url
        }
      };
    } catch (error) {
      console.error(`Failed to get tag '${tagName}':`, error);
      throw error;
    }
  }

  // ============================================================================
  // REPOSITORY OPERATIONS - Commits & PRs
  // ============================================================================

  /**
   * Compare commits between two refs (branches/tags)
   */
  async compareCommits(base: string, head: string): Promise<CommitComparison> {
    try {
      const { data } = await this.client.repos.compareCommits({
        ...this.config,
        base,
        head
      });

      console.log(`✅ Compared ${base}...${head}: ${data.total_commits} commits`);

      return {
        total_commits: data.total_commits,
        commits: data.commits.map(c => ({
          sha: c.sha,
          commit: {
            message: c.commit.message,
            author: {
              name: c.commit.author?.name || 'Unknown',
              email: c.commit.author?.email || '',
              date: c.commit.author?.date || ''
            }
          }
        }))
      };
    } catch (error) {
      console.error(`Failed to compare commits ${base}...${head}:`, error);
      throw error;
    }
  }

  /**
   * Get Pull Requests associated with a commit
   */
  async getPRsForCommit(commitSha: string): Promise<PullRequest[]> {
    try {
      const { data: prs } = await this.client.repos.listPullRequestsAssociatedWithCommit({
        ...this.config,
        commit_sha: commitSha
      });

      return prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        html_url: pr.html_url,
        user: {
          login: pr.user?.login || 'Unknown'
        },
        merged: pr.merged_at !== null
      }));
    } catch (error) {
      console.error(`Failed to get PRs for commit ${commitSha}:`, error);
      throw error;
    }
  }

  /**
   * Generate release notes from commits between two tags
   */
  async generateReleaseNotes(latestTag: string, previousTag: string): Promise<ReleaseNotes> {
    try {
      const comparison = await this.compareCommits(previousTag, latestTag);
      const releaseNotes: string[] = [];
      let prCount = 0;

      for (const commit of comparison.commits) {
        const prs = await this.getPRsForCommit(commit.sha);

        if (prs.length > 0) {
          for (const pr of prs) {
            releaseNotes.push(
              `- ${pr.title} (#${pr.number}) by @${pr.user.login}`
            );
            prCount++;
          }
        } else {
          const author = commit.commit.author.name;
          const message = commit.commit.message.split('\n')[0]; // First line only
          releaseNotes.push(`- ${message} (by ${author})`);
        }
      }

      const fullChangelog = `\n\n## Full Changelog:\nhttps://github.com/${this.config.owner}/${this.config.repo}/compare/${previousTag}...${latestTag}\n`;
      const markdown = releaseNotes.join('\n') + fullChangelog;

      console.log(`✅ Generated release notes: ${comparison.total_commits} commits, ${prCount} PRs`);

      return {
        markdown,
        commits: comparison.total_commits,
        pullRequests: prCount
      };
    } catch (error) {
      console.error('Failed to generate release notes:', error);
      throw error;
    }
  }

  // ============================================================================
  // RELEASE OPERATIONS
  // ============================================================================

  /**
   * Create a GitHub release
   */
  async createRelease({
    tagName,
    previousTag,
    releaseName,
    releaseBody,
    draft = false,
    prerelease = false
  }: CreateReleaseArgs): Promise<Release> {
    try {
      let body = releaseBody;

      // Auto-generate release notes if not provided and previousTag is available
      if (!body && previousTag) {
        const notes = await this.generateReleaseNotes(tagName, previousTag);
        const releaseDate = new Date().toISOString().split('T')[0];
        body = `## Release Date: \n${releaseDate}\n\n## What's Changed\n${notes.markdown}`;
      }

      const { data } = await this.client.repos.createRelease({
        ...this.config,
        tag_name: tagName,
        name: releaseName || tagName,
        body: body || '',
        draft,
        prerelease
      });

      console.log(`✅ Release created: ${data.html_url}`);

      return {
        id: data.id,
        tag_name: data.tag_name,
        name: data.name,
        body: data.body || '',
        html_url: data.html_url,
        created_at: data.created_at,
        published_at: data.published_at || '',
        draft: data.draft,
        prerelease: data.prerelease
      };
    } catch (error) {
      console.error('Failed to create release:', error);
      throw error;
    }
  }

  /**
   * Get a release by tag name
   */
  async getReleaseByTag(tagName: string): Promise<Release> {
    try {
      const { data } = await this.client.repos.getReleaseByTag({
        ...this.config,
        tag: tagName
      });

      return {
        id: data.id,
        tag_name: data.tag_name,
        name: data.name,
        body: data.body || '',
        html_url: data.html_url,
        created_at: data.created_at,
        published_at: data.published_at || '',
        draft: data.draft,
        prerelease: data.prerelease
      };
    } catch (error) {
      console.error(`Failed to get release for tag '${tagName}':`, error);
      throw error;
    }
  }

  // ============================================================================
  // GITHUB ACTIONS - Workflow Management
  // ============================================================================

  /**
   * Trigger a workflow
   */
  async triggerWorkflow<T = Record<string, any>>({
    workflowId,
    ref,
    inputs
  }: TriggerWorkflowArgs<T>): Promise<void> {
    try {
      await this.client.actions.createWorkflowDispatch({
        ...this.config,
        workflow_id: workflowId,
        ref,
        inputs: inputs as any
      });

      console.log(`✅ Workflow '${workflowId}' triggered on '${ref}'`);
    } catch (error) {
      console.error(`Failed to trigger workflow '${workflowId}':`, error);
      throw error;
    }
  }

  /**
   * Get workflow run status
   */
  async getWorkflowRun(runId: number): Promise<WorkflowRun> {
    try {
      const { data } = await this.client.actions.getWorkflowRun({
        ...this.config,
        run_id: runId
      });

      return {
        id: data.id,
        status: data.status as WorkflowStatus,
        conclusion: data.conclusion as WorkflowConclusion | null,
        html_url: data.html_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
        run_started_at: data.run_started_at || undefined
      };
    } catch (error) {
      console.error(`Failed to get workflow run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Re-run failed jobs in a workflow
   */
  async rerunFailedJobs({ runId }: RerunFailedJobsArgs): Promise<void> {
    try {
      await this.client.actions.reRunWorkflowFailedJobs({
        ...this.config,
        run_id: parseInt(runId, 10)
      });

      console.log(`✅ Re-running failed jobs for workflow run ${runId}`);
    } catch (error) {
      console.error(`Failed to re-run failed jobs for run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Poll workflow status with callback
   * Returns a cancellable polling function
   */
  pollWorkflowStatus(
    runId: number,
    onUpdate: (run: WorkflowRun) => void | Promise<void>,
    intervalMinutes: number = 3,
    timeoutHours: number = 4
  ): { cancel: () => void } {
    const startTime = Date.now();
    const timeoutMs = timeoutHours * 60 * 60 * 1000;
    const intervalMs = intervalMinutes * 60 * 1000;

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (cancelled) return;

      const elapsedTime = Date.now() - startTime;
      
      if (elapsedTime > timeoutMs) {
        console.log(`⏱️  Polling timeout reached for workflow run ${runId}`);
        return;
      }

      try {
        const run = await this.getWorkflowRun(runId);
        await onUpdate(run);

        // Stop polling if workflow is completed
        if (run.status === 'completed') {
          console.log(`✅ Workflow run ${runId} completed with ${run.conclusion}`);
          return;
        }

        // Schedule next poll
        timeoutId = setTimeout(poll, intervalMs);
      } catch (error) {
        console.error(`Error polling workflow run ${runId}:`, error);
        timeoutId = setTimeout(poll, intervalMs);
      }
    };

    // Start polling immediately
    poll();

    return {
      cancel: () => {
        cancelled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        console.log(`🛑 Stopped polling workflow run ${runId}`);
      }
    };
  }

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  /**
   * Create a webhook for the repository
   */
  async createWebhook({
    webhookUrl,
    secret,
    events = ['workflow_run', 'push', 'pull_request', 'create', 'release'],
    active = true
  }: CreateWebhookArgs): Promise<Webhook> {
    try {
      const { data } = await this.client.repos.createWebhook({
        ...this.config,
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret,
          insecure_ssl: '0'
        },
        events,
        active
      });

      console.log(`✅ Webhook created (ID: ${data.id}): ${webhookUrl}`);

      return {
        id: data.id,
        name: data.name,
        active: data.active,
        events: data.events,
        config: data.config,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Failed to create webhook:', error);
      throw error;
    }
  }

  /**
   * List all webhooks for the repository
   */
  async listWebhooks(): Promise<Webhook[]> {
    try {
      const { data } = await this.client.repos.listWebhooks(this.config);

      return data.map(hook => ({
        id: hook.id,
        name: hook.name,
        active: hook.active,
        events: hook.events,
        config: hook.config,
        created_at: hook.created_at,
        updated_at: hook.updated_at
      }));
    } catch (error) {
      console.error('Failed to list webhooks:', error);
      throw error;
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: number): Promise<void> {
    try {
      await this.client.repos.deleteWebhook({
        ...this.config,
        hook_id: webhookId
      });

      console.log(`✅ Webhook ${webhookId} deleted`);
    } catch (error) {
      console.error(`Failed to delete webhook ${webhookId}:`, error);
      throw error;
    }
  }

  /**
   * Test webhook by sending a ping
   */
  async pingWebhook(webhookId: number): Promise<void> {
    try {
      await this.client.repos.pingWebhook({
        ...this.config,
        hook_id: webhookId
      });

      console.log(`✅ Ping sent to webhook ${webhookId}`);
    } catch (error) {
      console.error(`Failed to ping webhook ${webhookId}:`, error);
      throw error;
    }
  }

  /**
   * Setup webhook event handlers (if webhooks are initialized)
   */
  setupWebhookHandlers(
    handlers: {
      [eventName: string]: (payload: any) => void | Promise<void>;
    }
  ): void {
    if (!this.webhooks) {
      throw new Error('Webhooks not initialized. Provide webhookSecret in config.');
    }

    Object.entries(handlers).forEach(([eventName, handler]) => {
      this.webhooks!.on(eventName as EmitterWebhookEventName, async ({ payload }) => {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`Error handling webhook event '${eventName}':`, error);
        }
      });
    });

    console.log(`✅ Webhook handlers registered for: ${Object.keys(handlers).join(', ')}`);
  }

  /**
   * Verify and receive a webhook
   */
  async handleWebhook(
    name: EmitterWebhookEventName,
    id: string,
    signature: string,
    rawBody: string
  ): Promise<void> {
    if (!this.webhooks) {
      throw new Error('Webhooks not initialized. Provide webhookSecret in config.');
    }

    await this.webhooks.verifyAndReceive({
      id,
      name,
      signature,
      payload: rawBody
    });
  }
}

