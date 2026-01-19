# SCM Service Guide

Complete guide for using the SCM (Source Control Management) service in delivr-server-ota-managed.

## Overview

The SCM service provides a unified interface for interacting with source control platforms (GitHub, GitLab, Bitbucket). Currently, **GitHub is fully implemented** with all features from OG Delivr 1.0.

## Features Implemented

### ✅ Git Operations
- Create branches
- Get branch details
- List all branches (with search/filter)
- Create annotated tags
- Get tag details

### ✅ Repository Operations
- Compare commits between refs
- Get Pull Requests for commits
- Auto-generate release notes

### ✅ Release Management
- Create GitHub releases
- Auto-generate release notes from commits + PRs
- Get release by tag

### ✅ GitHub Actions (Workflows)
- Trigger workflows with inputs
- Get workflow run status
- Re-run failed jobs
- Poll workflow status with callbacks

### ✅ Webhook Management
- Create webhooks programmatically
- List webhooks
- Delete webhooks
- Ping/test webhooks
- Setup webhook event handlers
- Verify and receive webhooks

---

## Installation

### Required Dependencies

```bash
cd api
npm install octokit @octokit/webhooks node-schedule
npm install --save-dev @types/node-schedule
```

---

## Usage

### 1. Basic Usage - Create Service for Tenant

```typescript
import { SCMServiceFactory } from '../services/scm';

// Automatically loads SCM config from tenant's integration
const scmService = await SCMServiceFactory.createForTenant('tenant-id-here');

// Now use any SCM operation
const branches = await scmService.listBranches();
```

### 2. Direct Usage - With Explicit Config

```typescript
import { GitHubService, SCMType, SCMConfig } from '../services/scm';

const config: SCMConfig = {
  scmType: SCMType.GITHUB,
  owner: 'dream11',
  repo: 'd11-react-native',
  accessToken: 'ghp_xxx',
  webhookSecret: 'my-secret'
};

const github = new GitHubService(config);
```

---

## API Examples

### Branch Operations

```typescript
// Create a new branch
await github.createBranch({
  baseBranch: 'master',
  newBranch: 'release/v1.2.0'
});

// Get branch details
const branch = await github.getBranch('release/v1.2.0');
console.log(branch.commit.sha);

// List all branches
const allBranches = await github.listBranches();

// Search branches
const releaseBranches = await github.listBranches('release/');
```

### Tag Operations

```typescript
// Create an annotated tag
const tag = await github.createTag({
  tagName: 'v1.2.0',
  branchName: 'release/v1.2.0',
  message: 'Release v1.2.0'
});

// Get tag details
const existingTag = await github.getTag('v1.2.0');
```

### Workflow Operations

```typescript
// Trigger a workflow
await github.triggerWorkflow({
  workflowId: '12345678',  // Workflow ID or filename
  ref: 'release/v1.2.0',
  inputs: {
    environment: 'production',
    version: '1.2.0'
  }
});

// Get workflow run status
const run = await github.getWorkflowRun(987654321);
console.log(`Status: ${run.status}, Conclusion: ${run.conclusion}`);

// Re-run failed jobs
await github.rerunFailedJobs({ runId: '987654321' });

// Poll workflow status (with auto-stop on completion)
const polling = github.pollWorkflowStatus(
  987654321,
  async (run) => {
    console.log(`Status: ${run.status}`);
    // Update database here
    await updateTaskStatus(run.id, run.status);
  },
  3,  // Poll every 3 minutes
  4   // Timeout after 4 hours
);

// Cancel polling if needed
polling.cancel();
```

### Release Operations

```typescript
// Auto-generate and create release
const release = await github.createRelease({
  tagName: 'v1.2.0',
  previousTag: 'v1.1.0',  // For auto-generating release notes
  releaseName: 'Version 1.2.0',
  draft: false,
  prerelease: false
});

console.log(`Release created: ${release.html_url}`);

// Get existing release
const existingRelease = await github.getReleaseByTag('v1.2.0');

// Generate release notes only (without creating release)
const notes = await github.generateReleaseNotes('v1.2.0', 'v1.1.0');
console.log(notes.markdown);
console.log(`${notes.commits} commits, ${notes.pullRequests} PRs`);
```

### Commit Comparison

```typescript
// Compare commits between tags/branches
const comparison = await github.compareCommits('v1.1.0', 'v1.2.0');
console.log(`Total commits: ${comparison.total_commits}`);

comparison.commits.forEach(commit => {
  console.log(`- ${commit.commit.message}`);
});

// Get PRs associated with a commit
const prs = await github.getPRsForCommit('abc123def456');
prs.forEach(pr => {
  console.log(`PR #${pr.number}: ${pr.title}`);
});
```

### Webhook Management

```typescript
// Create webhook (during SCM setup)
const webhook = await github.createWebhook({
  webhookUrl: 'https://delivr.yourdomain.com/api/github-webhooks',
  secret: 'your-webhook-secret',
  events: ['workflow_run', 'push', 'pull_request'],
  active: true
});

console.log(`Webhook created: ${webhook.id}`);

// List all webhooks
const webhooks = await github.listWebhooks();
webhooks.forEach(hook => {
  console.log(`${hook.id}: ${hook.config.url}`);
});

// Test webhook
await github.pingWebhook(webhook.id);

// Delete webhook (during SCM disconnection)
await github.deleteWebhook(webhook.id);

// Setup webhook handlers
github.setupWebhookHandlers({
  workflow_run: async (payload) => {
    console.log(`Workflow ${payload.workflow_run.id} is ${payload.workflow_run.status}`);
    // Update database
  },
  push: async (payload) => {
    console.log(`Push to ${payload.ref}`);
  }
});

// Handle incoming webhook (in your route handler)
await github.handleWebhook(
  'workflow_run',
  'delivery-id',
  'sha256=signature',
  rawBody
);
```

---

## Controller Integration Example

### In Release Management Controller

```typescript
import { SCMServiceFactory } from '../../services/scm';

export async function createReleaseBranch(req: Request, res: Response) {
  const { tenantId } = req.params;
  const { baseBranch, newBranch } = req.body;

  try {
    // Get SCM service for tenant
    const scm = await SCMServiceFactory.createForTenant(tenantId);

    // Create branch
    await scm.createBranch({
      baseBranch,
      newBranch
    });

    res.status(201).json({
      success: true,
      branch: newBranch
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function triggerRegressionBuilds(req: Request, res: Response) {
  const { tenantId, releaseId } = req.params;
  const { workflowId, branchRef } = req.body;

  try {
    const scm = await SCMServiceFactory.createForTenant(tenantId);

    // Trigger workflow
    await scm.triggerWorkflow({
      workflowId,
      ref: branchRef,
      inputs: {
        releaseId,
        environment: 'staging'
      }
    });

    // Start polling (returns runId from webhook or polling)
    // Implementation depends on how you track the runId

    res.status(200).json({
      success: true,
      message: 'Workflow triggered'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## Database Schema Updates Needed

### Add to `tenant_scm_integrations` table

```sql
ALTER TABLE tenant_scm_integrations
ADD COLUMN webhookId INT DEFAULT NULL,
ADD COLUMN webhookSecret VARCHAR(255) DEFAULT NULL;
```

This stores the GitHub webhook ID for cleanup when integration is deleted.

---

## Environment Variables

```env
# Required for webhook verification
GITHUB_WEBHOOK_SECRET=your-super-secret-webhook-key

# Optional: Default sender for webhook filtering
GITHUB_SENDER_LOGIN=github-actions[bot]

# Your public URL for webhooks
PUBLIC_URL=https://delivr.yourdomain.com
```

---

## Error Handling

All methods throw errors on failure. Wrap calls in try-catch:

```typescript
try {
  const branches = await scm.listBranches();
} catch (error) {
  if (error.status === 404) {
    console.error('Repository not found');
  } else if (error.status === 401) {
    console.error('Invalid access token');
  } else {
    console.error('GitHub API error:', error);
  }
}
```

---

## Common Workflow IDs (Example for Dream11)

```typescript
export const WORKFLOWS = {
  TRIGGER_REGRESSION_BUILDS: '53404336',
  TRIGGER_PLANNED_RELEASE: '47786722',
  UPDATE_GITHUB_VARIABLES: '66637627',
  TRIGGER_AUTOMATION_BUILDS: '96433829',
  RELEASE_NOTES: '103972941',
  IOS_PROD_BUILD: '56347592'
};

// Usage
await scm.triggerWorkflow({
  workflowId: WORKFLOWS.TRIGGER_REGRESSION_BUILDS,
  ref: 'release/v1.2.0',
  inputs: { platform: 'all' }
});
```

---

## Testing

### Unit Tests (Example)

```typescript
import { GitHubService, SCMType } from '../services/scm';

describe('GitHubService', () => {
  let github: GitHubService;

  beforeAll(() => {
    github = new GitHubService({
      scmType: SCMType.GITHUB,
      owner: 'test-org',
      repo: 'test-repo',
      accessToken: process.env.GITHUB_TEST_TOKEN!
    });
  });

  it('should list branches', async () => {
    const branches = await github.listBranches();
    expect(branches.length).toBeGreaterThan(0);
    expect(branches[0]).toHaveProperty('name');
    expect(branches[0]).toHaveProperty('commit');
  });

  it('should create and delete branch', async () => {
    const branchName = `test-${Date.now()}`;
    
    await github.createBranch({
      baseBranch: 'master',
      newBranch: branchName
    });

    const branch = await github.getBranch(branchName);
    expect(branch.name).toBe(branchName);

    // Cleanup would go here
  });
});
```

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Update database schema (add `webhookId`, `webhookSecret`)
3. ✅ Create release management routes
4. ✅ Implement workflow polling/webhook handlers
5. ✅ Add auto-webhook setup during SCM connection
6. ✅ Add webhook cleanup during SCM disconnection

---

## Future Enhancements

- [ ] GitLab support
- [ ] Bitbucket support
- [ ] Retry logic with exponential backoff
- [ ] Rate limit handling
- [ ] Caching for branch/tag lists
- [ ] Webhook signature verification middleware
- [ ] GraphQL API support for more efficient queries

---

## Support

For issues or questions:
- Check error logs for detailed GitHub API errors
- Verify access token has correct scopes
- Ensure webhook URL is publicly accessible (for webhooks)
- Check GitHub API rate limits if experiencing throttling

