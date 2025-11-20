// Release Management Router
// Handles all routes related to Release Management features
// Separate from DOTA (Over-The-Air) management routes

import { Request, Response, Router } from "express";
import * as tenantPermissions from "../middleware/tenant-permissions";
import { S3Storage } from "../storage/aws-storage";
import * as storageTypes from "../storage/storage";
import {
  createProjectIntegrationRoutes,
  createTestManagementConfigRoutes,
  createTestRunOperationsRoutes
} from "./integrations/test-management";
import { createMetadataRoutes } from "./integrations/test-management/metadata";
import { createSCMIntegrationRoutes } from "./scm-integrations";
import { createCICDIntegrationRoutes } from "./ci-cd-integrations";
import { createCommIntegrationRoutes } from "./integrations/comm";

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
  // TEST MANAGEMENT INTEGRATIONS (Checkmate, TestRail, etc.)
  // ============================================================================
  // Only mount test management routes if using S3Storage (which has test management)
  const isS3Storage = storage instanceof S3Storage;
  if (isS3Storage) {
    const s3Storage = storage;
    
    // Project-Level Integration Management (Credentials)
    const projectIntegrationRoutes = createProjectIntegrationRoutes(s3Storage.testManagementIntegrationService);
    router.use(projectIntegrationRoutes);

    // Test Management Config Management (Reusable test configurations)
    const testManagementConfigRoutes = createTestManagementConfigRoutes(s3Storage.testManagementConfigService);
    router.use('/test-management-configs', testManagementConfigRoutes);

    // Test Run Operations (Stateless - Create, Status, Reset, Cancel)
    const testRunRoutes = createTestRunOperationsRoutes(s3Storage.testManagementRunService);
    router.use('/test-management', testRunRoutes);

    // Metadata Proxy Routes (Projects, Sections, Labels, Squads)
    const metadataRoutes = createMetadataRoutes(s3Storage.testManagementMetadataService);
    router.use('/integrations', metadataRoutes);
    
    console.log('[Release Management] Test Management routes mounted successfully');
  } else {
    console.warn('[Release Management] Test Management services not available (S3Storage required), routes not mounted');
  }

  // ============================================================================
  // TARGET PLATFORM INTEGRATIONS (App Store, Play Store)
  // ============================================================================
  // TODO: Implement target platform integration routes
  // router.use(createTargetPlatformRoutes(storage));

  // ============================================================================
  // PIPELINE INTEGRATIONS (Jenkins, GitHub Actions)
  // ============================================================================
  const cicdRoutes = createCICDIntegrationRoutes(storage);
  router.use(cicdRoutes);

  // ============================================================================
  // COMMUNICATION INTEGRATIONS (Slack, Teams, Email)
  // ============================================================================
  const commRoutes = createCommIntegrationRoutes(storage);
  router.use(commRoutes);
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
  
  // Get all releases for a tenant
  router.get(
    "/tenants/:tenantId/releases",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement release listing
      // - Filter by status (KICKOFF_PENDING, STARTED, RELEASED, etc.)
      // - Pagination
      // - Sort by date
      res.status(501).json({
        error: "Not implemented yet",
        message: "Release listing endpoint coming soon"
      });
    }
  );

  // Get a specific release
  router.get(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement release details
      res.status(501).json({
        error: "Not implemented yet",
        message: "Release details endpoint coming soon"
      });
    }
  );

  // Create a new release
  router.post(
    "/tenants/:tenantId/releases",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement release creation
      // - Validate release metadata
      // - Create release record
      // - Initialize state history
      // - Trigger kickoff if needed
      res.status(501).json({
        error: "Not implemented yet",
        message: "Release creation endpoint coming soon"
      });
    }
  );

  // Update a release
  router.patch(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement release update
      res.status(501).json({
        error: "Not implemented yet",
        message: "Release update endpoint coming soon"
      });
    }
  );

  // Delete a release
  router.delete(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement release deletion (soft delete)
      res.status(501).json({
        error: "Not implemented yet",
        message: "Release deletion endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // BUILD MANAGEMENT
  // ============================================================================
  
  // Get builds for a release
  router.get(
    "/tenants/:tenantId/releases/:releaseId/builds",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement build listing
      res.status(501).json({
        error: "Not implemented yet",
        message: "Build listing endpoint coming soon"
      });
    }
  );

  // Trigger a new build
  router.post(
    "/tenants/:tenantId/releases/:releaseId/builds",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement build trigger
      // - Connect to Jenkins/GitHub Actions
      // - Create build record
      // - Monitor build status
      res.status(501).json({
        error: "Not implemented yet",
        message: "Build trigger endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // ROLLOUT MANAGEMENT
  // ============================================================================
  
  // Get rollout status for a release
  router.get(
    "/tenants/:tenantId/releases/:releaseId/rollout",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement rollout status
      res.status(501).json({
        error: "Not implemented yet",
        message: "Rollout status endpoint coming soon"
      });
    }
  );

  // Update rollout percentage
  router.patch(
    "/tenants/:tenantId/releases/:releaseId/rollout",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement rollout update
      res.status(501).json({
        error: "Not implemented yet",
        message: "Rollout update endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // CHERRY-PICK MANAGEMENT
  // ============================================================================
  
  // Get cherry-picks for a release
  router.get(
    "/tenants/:tenantId/releases/:releaseId/cherry-picks",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement cherry-pick listing
      res.status(501).json({
        error: "Not implemented yet",
        message: "Cherry-pick listing endpoint coming soon"
      });
    }
  );

  // Create a cherry-pick
  router.post(
    "/tenants/:tenantId/releases/:releaseId/cherry-picks",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement cherry-pick creation
      res.status(501).json({
        error: "Not implemented yet",
        message: "Cherry-pick creation endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // RELEASE ANALYTICS
  // ============================================================================
  
  // Get analytics for a tenant's releases
  router.get(
    "/tenants/:tenantId/releases/analytics",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement release analytics
      // - Success rate
      // - Average cycle time
      // - Release frequency
      // - User adoption metrics
      res.status(501).json({
        error: "Not implemented yet",
        message: "Release analytics endpoint coming soon"
      });
    }
  );

  // Get user adoption metrics for a specific release
  router.get(
    "/tenants/:tenantId/releases/:releaseId/adoption",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      // TODO: Implement adoption metrics
      res.status(501).json({
        error: "Not implemented yet",
        message: "Adoption metrics endpoint coming soon"
      });
    }
  );

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

