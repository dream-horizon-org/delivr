# SCM Service Integration Examples

Complete examples showing how to integrate the SCM service into delivr-server-ota-managed routes and controllers.

## Table of Contents
1. [Auto-Setup Webhook During SCM Connection](#1-auto-setup-webhook-during-scm-connection)
2. [Create Release Branch](#2-create-release-branch)
3. [Trigger Workflow with Polling](#3-trigger-workflow-with-polling)
4. [Webhook Handler Endpoint](#4-webhook-handler-endpoint)
5. [Create Release with Auto-Generated Notes](#5-create-release-with-auto-generated-notes)
6. [List & Search Branches](#6-list--search-branches)
7. [Compare Commits Between Tags](#7-compare-commits-between-tags)

---

## 1. Auto-Setup Webhook During SCM Connection

**File**: `api/script/controllers/integrations/scm-controllers.ts`

```typescript
import { SCMServiceFactory } from '../../services/scm';

export async function createOrUpdateSCMIntegration(req: Request, res: Response): Promise<any> {
  const { tenantId } = req.params;
  const { scmType, owner, repo, accessToken } = req.body;

  try {
    // 1. Verify connection (existing code)
    await verifyGitHubConnection(owner, repo, accessToken, scmType);

    // 2. Save SCM integration (existing code)
    const scmController = getSCMController();
    const integration = await scmController.createOrUpdate({
      tenantId,
      scmType,
      owner,
      repoName: repo,
      accessToken,
      isActive: true
    });

    // 3. NEW: Auto-setup webhook
    try {
      const scm = await SCMServiceFactory.createForTenant(tenantId);
      
      const webhookUrl = `${process.env.PUBLIC_URL}/api/github-webhooks/${tenantId}`;
      const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'default-secret';

      const webhook = await scm.createWebhook({
        webhookUrl,
        secret: webhookSecret,
        events: ['workflow_run', 'push', 'pull_request', 'create', 'release'],
        active: true
      });

      // Save webhook ID for cleanup later
      await scmController.update(integration.id, {
        webhookId: webhook.id,
        webhookSecret
      });

      console.log(`✅ Webhook created (ID: ${webhook.id}) for tenant ${tenantId}`);
    } catch (webhookError) {
      // Webhook creation is optional - don't fail the integration
      console.error('Failed to create webhook (non-critical):', webhookError);
    }

    res.status(201).json({
      success: true,
      integration: sanitizeSCMResponse(integration)
    });
  } catch (error) {
    console.error('[SCM] Error creating integration:', error);
    res.status(500).json({ error: 'Failed to create SCM integration' });
  }
}

export async function deleteSCMIntegration(req: Request, res: Response): Promise<any> {
  const { tenantId } = req.params;

  try {
    const scmController = getSCMController();
    const integration = await scmController.findOne({ tenantId });

    if (!integration) {
      return res.status(404).json({ error: 'SCM integration not found' });
    }

    // NEW: Cleanup webhook if it exists
    if (integration.webhookId) {
      try {
        const scm = await SCMServiceFactory.createForTenant(tenantId);
        await scm.deleteWebhook(integration.webhookId);
        console.log(`✅ Webhook ${integration.webhookId} deleted for tenant ${tenantId}`);
      } catch (webhookError) {
        console.error('Failed to delete webhook (non-critical):', webhookError);
      }
    }

    await scmController.delete(integration.id);

    res.status(200).json({
      success: true,
      message: 'SCM integration deleted'
    });
  } catch (error) {
    console.error('[SCM] Error deleting integration:', error);
    res.status(500).json({ error: 'Failed to delete SCM integration' });
  }
}
```

---

## 2. Create Release Branch

**File**: `api/script/controllers/releases/release-controllers.ts` (new file)

```typescript
import { Request, Response } from 'express';
import { SCMServiceFactory } from '../../services/scm';
import { getStorage } from '../../storage/storage-instance';
import { NextFunction } from '../../types/express-types';

/**
 * Create a new release branch
 * POST /tenants/:tenantId/releases/branches
 */
export async function createReleaseBranch(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { tenantId } = req.params;
  const { baseBranch, releaseName, version } = req.body;

  if (!baseBranch || !releaseName || !version) {
    return res.status(400).json({
      error: 'baseBranch, releaseName, and version are required'
    });
  }

  try {
    // Get SCM service for tenant
    const scm = await SCMServiceFactory.createForTenant(tenantId);
    
    // Generate branch name
    const newBranchName = `release/${releaseName}-${version}`;

    // Create branch
    await scm.createBranch({
      baseBranch,
      newBranch: newBranchName
    });

    // Store release info in database
    const storage = getStorage();
    // Your release creation logic here

    res.status(201).json({
      success: true,
      branch: newBranchName,
      message: `Release branch '${newBranchName}' created from '${baseBranch}'`
    });
  } catch (error: any) {
    console.error('[Release] Error creating branch:', error);
    
    if (error.status === 422) {
      return res.status(409).json({
        error: 'Branch already exists'
      });
    }
    
    next(error);
  }
}

/**
 * List available branches
 * GET /tenants/:tenantId/releases/branches?search=release/
 */
export async function listBranches(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { tenantId } = req.params;
  const { search } = req.query;

  try {
    const scm = await SCMServiceFactory.createForTenant(tenantId);
    const branches = await scm.listBranches(search as string);

    res.status(200).json({
      branches: branches.map(b => ({
        name: b.name,
        commitSha: b.commit.sha
      }))
    });
  } catch (error) {
    console.error('[Release] Error listing branches:', error);
    next(error);
  }
}
```

---

## 3. Trigger Workflow with Polling

**File**: `api/script/controllers/releases/workflow-controllers.ts` (new file)

```typescript
import { Request, Response } from 'express';
import { SCMServiceFactory } from '../../services/scm';
import { getStorage } from '../../storage/storage-instance';
import { WorkflowStatus, WorkflowConclusion } from '../../services/scm';
import { NextFunction } from '../../types/express-types';

// Store active polling jobs
const activePollingJobs = new Map<string, { cancel: () => void }>();

/**
 * Trigger a workflow (e.g., regression builds)
 * POST /tenants/:tenantId/releases/:releaseId/workflows/trigger
 */
export async function triggerWorkflow(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { tenantId, releaseId } = req.params;
  const { workflowId, branchRef, inputs } = req.body;

  if (!workflowId || !branchRef) {
    return res.status(400).json({
      error: 'workflowId and branchRef are required'
    });
  }

  try {
    const scm = await SCMServiceFactory.createForTenant(tenantId);
    const storage = getStorage();

    // Trigger the workflow
    await scm.triggerWorkflow({
      workflowId,
      ref: branchRef,
      inputs: inputs || {}
    });

    // Get the workflow run ID (GitHub doesn't return it directly)
    // You need to either:
    // 1. Use webhooks (recommended)
    // 2. Poll recent workflow runs and match by time + branch
    
    // For now, we'll create a task record and wait for webhook
    // Your task creation logic here
    const taskId = `task-${Date.now()}`;

    res.status(202).json({
      success: true,
      taskId,
      message: 'Workflow triggered successfully. Waiting for webhook...'
    });
  } catch (error) {
    console.error('[Workflow] Error triggering workflow:', error);
    next(error);
  }
}

/**
 * Start polling a workflow run (backup for webhooks)
 * POST /tenants/:tenantId/workflows/:runId/poll
 */
export async function startWorkflowPolling(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { tenantId, runId } = req.params;
  const { taskId } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  try {
    const scm = await SCMServiceFactory.createForTenant(tenantId);
    const storage = getStorage();

    // Start polling
    const polling = scm.pollWorkflowStatus(
      parseInt(runId),
      async (run) => {
        console.log(`[Polling] Workflow ${runId} status: ${run.status}, conclusion: ${run.conclusion}`);

        // Update task in database
        // await storage.updateReleaseTask(taskId, run.status, run.conclusion);

        // If completed, remove from active jobs
        if (run.status === WorkflowStatus.COMPLETED) {
          activePollingJobs.delete(`${tenantId}-${runId}`);
        }
      },
      3, // Poll every 3 minutes
      4  // Timeout after 4 hours
    );

    // Store polling job for potential cancellation
    activePollingJobs.set(`${tenantId}-${runId}`, polling);

    res.status(200).json({
      success: true,
      message: 'Workflow polling started'
    });
  } catch (error) {
    console.error('[Workflow] Error starting polling:', error);
    next(error);
  }
}

/**
 * Stop polling a workflow run
 * DELETE /tenants/:tenantId/workflows/:runId/poll
 */
export async function stopWorkflowPolling(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { tenantId, runId } = req.params;

  const jobKey = `${tenantId}-${runId}`;
  const polling = activePollingJobs.get(jobKey);

  if (polling) {
    polling.cancel();
    activePollingJobs.delete(jobKey);
    return res.status(200).json({
      success: true,
      message: 'Polling stopped'
    });
  }

  res.status(404).json({
    error: 'No active polling found for this workflow'
  });
}

/**
 * Re-run failed jobs
 * POST /tenants/:tenantId/workflows/:runId/rerun
 */
export async function rerunFailedJobs(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { tenantId, runId } = req.params;

  try {
    const scm = await SCMServiceFactory.createForTenant(tenantId);

    await scm.rerunFailedJobs({ runId });

    res.status(200).json({
      success: true,
      message: 'Failed jobs re-queued'
    });
  } catch (error) {
    console.error('[Workflow] Error re-running failed jobs:', error);
    next(error);
  }
}
```

---

## 4. Webhook Handler Endpoint

**File**: `api/script/routes/github-webhooks.ts` (new file)

```typescript
import { Router, Request, Response } from 'express';
import { SCMServiceFactory } from '../services/scm';
import { getStorage } from '../storage/storage-instance';
import type { EmitterWebhookEventName } from '@octokit/webhooks';
import { NextFunction } from '../types/express-types';

export function createGitHubWebhookRoutes(): Router {
  const router = Router();

  /**
   * GitHub webhook receiver
   * POST /api/github-webhooks/:tenantId
   */
  router.post('/:tenantId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { tenantId } = req.params;

    try {
      // Get webhook headers
      const id = req.headers['x-github-delivery'] as string;
      const name = req.headers['x-github-event'] as EmitterWebhookEventName;
      const signature = req.headers['x-hub-signature-256'] as string;
      const rawBody = JSON.stringify(req.body);

      if (!id || !name || !signature) {
        return res.status(400).json({ error: 'Missing webhook headers' });
      }

      // Get SCM service for tenant
      const scm = await SCMServiceFactory.createForTenant(tenantId);

      // Setup handlers before verifying
      scm.setupWebhookHandlers({
        workflow_run: async (payload) => {
          console.log(`[Webhook] Workflow ${payload.workflow_run.id} ${payload.action}`);
          
          const runId = payload.workflow_run.id;
          const status = payload.workflow_run.status;
          const conclusion = payload.workflow_run.conclusion;

          // Update database
          const storage = getStorage();
          // await storage.updateWorkflowRun(tenantId, runId, status, conclusion);

          // Stop polling if active
          // ... your logic here
        },
        
        push: async (payload) => {
          console.log(`[Webhook] Push to ${payload.ref} by ${payload.pusher.name}`);
          // Handle push events if needed
        },

        pull_request: async (payload) => {
          console.log(`[Webhook] PR #${payload.pull_request.number} ${payload.action}`);
          // Handle PR events if needed
        },

        create: async (payload) => {
          if (payload.ref_type === 'tag') {
            console.log(`[Webhook] Tag created: ${payload.ref}`);
            // Handle tag creation
          }
        }
      });

      // Verify and process webhook
      await scm.handleWebhook(name, id, signature, rawBody);

      res.status(200).json({
        success: true,
        message: 'Webhook received'
      });
    } catch (error) {
      console.error('[Webhook] Error processing webhook:', error);
      
      if ((error as any).message?.includes('signature')) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
      
      next(error);
    }
  });

  return router;
}
```

**Register in main server:**

```typescript
// api/script/default-server.ts
import { createGitHubWebhookRoutes } from './routes/github-webhooks';

// ... in your route setup
app.use('/api/github-webhooks', createGitHubWebhookRoutes());
```

---

## 5. Create Release with Auto-Generated Notes

**File**: `api/script/controllers/releases/release-controllers.ts`

```typescript
/**
 * Create a GitHub release
 * POST /tenants/:tenantId/releases/publish
 */
export async function publishRelease(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { tenantId } = req.params;
  const { tagName, branchName, previousTag, draft = false } = req.body;

  if (!tagName || !branchName) {
    return res.status(400).json({
      error: 'tagName and branchName are required'
    });
  }

  try {
    const scm = await SCMServiceFactory.createForTenant(tenantId);

    // 1. Create tag
    const tag = await scm.createTag({
      tagName,
      branchName,
      message: `Release ${tagName}`
    });

    // 2. Create release (auto-generates notes if previousTag provided)
    const release = await scm.createRelease({
      tagName,
      previousTag,
      releaseName: tagName,
      draft,
      prerelease: false
    });

    res.status(201).json({
      success: true,
      tag: tag.name,
      release: {
        id: release.id,
        url: release.html_url,
        notes: release.body
      }
    });
  } catch (error) {
    console.error('[Release] Error publishing release:', error);
    next(error);
  }
}

/**
 * Preview release notes without publishing
 * POST /tenants/:tenantId/releases/preview-notes
 */
export async function previewReleaseNotes(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { tenantId } = req.params;
  const { latestTag, previousTag } = req.body;

  if (!latestTag || !previousTag) {
    return res.status(400).json({
      error: 'latestTag and previousTag are required'
    });
  }

  try {
    const scm = await SCMServiceFactory.createForTenant(tenantId);

    const notes = await scm.generateReleaseNotes(latestTag, previousTag);

    res.status(200).json({
      markdown: notes.markdown,
      stats: {
        commits: notes.commits,
        pullRequests: notes.pullRequests
      }
    });
  } catch (error) {
    console.error('[Release] Error generating release notes:', error);
    next(error);
  }
}
```

---

## 6. List & Search Branches

Already covered in [Example 2](#2-create-release-branch).

---

## 7. Compare Commits Between Tags

**File**: `api/script/controllers/releases/comparison-controllers.ts` (new file)

```typescript
import { Request, Response } from 'express';
import { SCMServiceFactory } from '../../services/scm';
import { NextFunction } from '../../types/express-types';

/**
 * Compare commits between two refs
 * GET /tenants/:tenantId/releases/compare?base=v1.0.0&head=v1.1.0
 */
export async function compareReleases(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { tenantId } = req.params;
  const { base, head } = req.query;

  if (!base || !head) {
    return res.status(400).json({
      error: 'base and head query parameters are required'
    });
  }

  try {
    const scm = await SCMServiceFactory.createForTenant(tenantId);

    const comparison = await scm.compareCommits(base as string, head as string);

    res.status(200).json({
      totalCommits: comparison.total_commits,
      commits: comparison.commits.map(c => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date
      }))
    });
  } catch (error) {
    console.error('[Release] Error comparing commits:', error);
    next(error);
  }
}
```

---

## Complete Route Registration

**File**: `api/script/routes/release-management.ts`

```typescript
import { Router } from 'express';
import * as tenantPermissions from '../middleware/tenant-permissions';
import * as releaseControllers from '../controllers/releases/release-controllers';
import * as workflowControllers from '../controllers/releases/workflow-controllers';
import * as comparisonControllers from '../controllers/releases/comparison-controllers';
import { Storage } from '../storage/storage';

export function createReleaseManagementRoutes(storage: Storage): Router {
  const router = Router();

  // Branch operations
  router.post(
    '/tenants/:tenantId/releases/branches',
    tenantPermissions.requireOwner({ storage }),
    releaseControllers.createReleaseBranch
  );

  router.get(
    '/tenants/:tenantId/releases/branches',
    tenantPermissions.requireEditor({ storage }),
    releaseControllers.listBranches
  );

  // Workflow operations
  router.post(
    '/tenants/:tenantId/releases/:releaseId/workflows/trigger',
    tenantPermissions.requireOwner({ storage }),
    workflowControllers.triggerWorkflow
  );

  router.post(
    '/tenants/:tenantId/workflows/:runId/poll',
    tenantPermissions.requireOwner({ storage }),
    workflowControllers.startWorkflowPolling
  );

  router.delete(
    '/tenants/:tenantId/workflows/:runId/poll',
    tenantPermissions.requireOwner({ storage }),
    workflowControllers.stopWorkflowPolling
  );

  router.post(
    '/tenants/:tenantId/workflows/:runId/rerun',
    tenantPermissions.requireOwner({ storage }),
    workflowControllers.rerunFailedJobs
  );

  // Release operations
  router.post(
    '/tenants/:tenantId/releases/publish',
    tenantPermissions.requireOwner({ storage }),
    releaseControllers.publishRelease
  );

  router.post(
    '/tenants/:tenantId/releases/preview-notes',
    tenantPermissions.requireEditor({ storage }),
    releaseControllers.previewReleaseNotes
  );

  // Comparison operations
  router.get(
    '/tenants/:tenantId/releases/compare',
    tenantPermissions.requireEditor({ storage }),
    comparisonControllers.compareReleases
  );

  return router;
}
```

---

## Environment Variables Required

```env
# GitHub Configuration
GITHUB_WEBHOOK_SECRET=your-super-secret-webhook-key-here

# Your public URL (for webhook registration)
PUBLIC_URL=https://delivr.yourdomain.com

# Optional: Default GitHub sender for filtering
GITHUB_SENDER_LOGIN=github-actions[bot]
```

---

## Database Migration

```sql
-- Add webhook fields to tenant_scm_integrations
ALTER TABLE tenant_scm_integrations
ADD COLUMN webhookId INT DEFAULT NULL COMMENT 'GitHub webhook ID for cleanup',
ADD COLUMN webhookSecret VARCHAR(255) DEFAULT NULL COMMENT 'Webhook HMAC secret';

-- Create release_tasks table (if not exists)
CREATE TABLE IF NOT EXISTS release_tasks (
  id VARCHAR(36) PRIMARY KEY,
  tenantId VARCHAR(36) NOT NULL,
  releaseId VARCHAR(36) NOT NULL,
  taskType VARCHAR(50) NOT NULL,
  workflowRunId BIGINT DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  conclusion VARCHAR(20) DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant_release (tenantId, releaseId),
  INDEX idx_workflow_run (workflowRunId)
);
```

---

This completes the integration examples! All features from OG Delivr are now available via the SCM service. 🚀

