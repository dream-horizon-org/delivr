// Release Management Router
// Handles all routes related to Release Management features
// Separate from DOTA (Over-The-Air) management routes

import { Request, Response, Router } from "express";
import * as storageTypes from "../storage/storage";
import * as tenantPermissions from "../middleware/tenant-permissions";
import { createSCMIntegrationRoutes } from "./scm-integrations";
import { createIntegrationRoutes as createSlackIntegrationRoutes } from "./integrations/comm/slack-integration/slack-integration.routes";
import { getReleaseManagementRouter as getReleaseRoutes } from "./release/release-management";

export interface ReleaseManagementConfig {
  storage: storageTypes.Storage;
}

/**
 * Creates and configures the Release Management router
 * 
 * This router handles all Release Management features:
 * - SCM Integrations (GitHub, GitLab, Bitbucket)
 * - Target Platform Integrations (App Store, Play Store)
 * - Pipeline Integrations (Jenkins, GitHub Actions)
 * - Communication Integrations (Slack, Teams)
 * - Ticket Management Integrations (Jira, etc.)
 * - Release CRUD operations
 * - Build management
 * - Rollout management
 * - Cherry-pick management
 * - Release analytics
 */
export function getReleaseManagementRouter(config: ReleaseManagementConfig): Router {
  const storage: storageTypes.Storage = config.storage;
  const router: Router = Router();

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  router.get("/health", (req: Request, res: Response): any => {
    res.status(200).json({
      service: "Release Management",
      status: "healthy",
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // SCM INTEGRATIONS (GitHub, GitLab, Bitbucket)
  // ============================================================================
  const scmRoutes = createSCMIntegrationRoutes(storage);
  router.use(scmRoutes);

  // ============================================================================
  // TARGET PLATFORM INTEGRATIONS (App Store, Play Store)
  // ============================================================================
  // TODO: Implement target platform integration routes
  // router.use(createTargetPlatformRoutes(storage));

  // ============================================================================
  // PIPELINE INTEGRATIONS (Jenkins, GitHub Actions)
  // ============================================================================
  // TODO: Implement pipeline integration routes
  // router.use(createPipelineRoutes(storage));

  // ============================================================================
  // COMMUNICATION INTEGRATIONS (Slack, Teams, Email)
  // ============================================================================
  const slackRoutes = createSlackIntegrationRoutes(storage);
  router.use(slackRoutes);
  // router.use(createCommunicationRoutes(storage));

  // ============================================================================
  // TICKET MANAGEMENT INTEGRATIONS (Jira, etc.)
  // ============================================================================
  // TODO: Implement ticket management integration routes
  // router.use(createTicketManagementRoutes(storage));

  // ============================================================================
  // SETUP MANAGEMENT
  // ============================================================================
  
  // Mark setup as complete
  router.post(
    "/tenants/:tenantId/release-management/complete-setup",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      const tenantId: string = req.params.tenantId;
      
      try {
        // The setup completion is actually determined automatically by the backend
        // based on whether required integrations (SCM) are configured
        // This endpoint is just for optimistic UI updates
        
        console.log(`[Setup] Marking setup as complete for tenant: ${tenantId}`);
        
        // You could optionally store a flag in the database if needed
        // For now, we just return success as the backend already handles this logic
        
        return res.status(200).json({
          success: true,
          message: "Setup marked as complete",
          setupComplete: true,
          tenantId
        });
      } catch (error: any) {
        console.error(`[Setup] Error marking setup as complete for tenant ${tenantId}:`, error);
        return res.status(500).json({
          error: "Failed to mark setup as complete",
          message: error.message
        });
      }
    }
  );

  // ============================================================================
  // RELEASE OPERATIONS
  // ============================================================================
  // All release-specific routes are now in ./release/release-management.ts
  const releaseRoutes = getReleaseRoutes({
    storage,
    releaseCreationService: (storage as any).releaseCreationService,
    releaseRetrievalService: (storage as any).releaseRetrievalService
  });
  router.use(releaseRoutes);

  // ============================================================================
  // RELEASE SETUP & CONFIGURATION
  // ============================================================================
  
  // Check if release management is set up for tenant
  router.get(
    "/tenants/:tenantId/releases/setup-status",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      const tenantId: string = req.params.tenantId;

      try {
        const scmController = (storage as any).scmController;
        const scmIntegration = await scmController.findActiveByTenant(tenantId);

        // Check Slack integration
        const slackController = (storage as any).slackController;
        const slackIntegration = await slackController.findByTenant(tenantId);

        // TODO: Check other required integrations (targets, pipelines, etc.)
        // const targetPlatforms = await storage.getTenantTargetPlatforms(tenantId);
        // const pipelines = await storage.getTenantPipelines(tenantId);
        
        const setupSteps = {
          scm: {
            completed: !!scmIntegration,
            required: true,
            label: "GitHub Integration",
            description: "Connect your GitHub repository",
            data: scmIntegration ? {
              owner: scmIntegration.owner,
              repo: scmIntegration.repo,
              displayName: scmIntegration.displayName
            } : null
          },
          targetPlatforms: {
            completed: false,  // TODO: Implement
            required: true,
            label: "Target Platforms",
            description: "Configure App Store and/or Play Store"
          },
          pipelines: {
            completed: false,  // TODO: Implement
            required: false,  // Optional
            label: "CI/CD Pipelines",
            description: "Set up build pipelines (optional)"
          },
          communication: {
            completed: !!slackIntegration,
            required: false,  // Optional
            label: "Slack Integration",
            description: "Connect Slack for notifications (optional)",
            data: slackIntegration ? {
              workspaceName: slackIntegration.slackWorkspaceName,
              workspaceId: slackIntegration.slackWorkspaceId,
              verificationStatus: slackIntegration.verificationStatus
            } : null
          }
        };

        // Calculate overall completion
        const requiredSteps = Object.values(setupSteps).filter(step => step.required);
        const completedRequiredSteps = requiredSteps.filter(step => step.completed);
        const setupComplete = requiredSteps.length === completedRequiredSteps.length;
        
        const totalSteps = Object.keys(setupSteps).length;
        const completedSteps = Object.values(setupSteps).filter(step => step.completed).length;
        
        return res.status(200).json({
          setupComplete,
          progress: {
            completed: completedSteps,
            total: totalSteps,
            percentage: Math.round((completedSteps / totalSteps) * 100),
            requiredCompleted: completedRequiredSteps.length,
            requiredTotal: requiredSteps.length
          },
          steps: setupSteps,
          message: setupComplete 
            ? "Release Management is fully configured" 
            : "Please complete the required setup steps",
          nextStep: !setupSteps.scm.completed 
            ? "scm" 
            : !setupSteps.targetPlatforms.completed 
            ? "targetPlatforms" 
            : null
        });
      } catch (error: any) {
        console.error("Error checking setup status:", error);
        return res.status(500).json({
          error: "Failed to check setup status",
          message: error.message
        });
      }
    }
  );

  return router;
}

