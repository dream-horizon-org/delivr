// Release Management Router
// Handles all routes related to Release Management features
// Separate from DOTA (Over-The-Air) management routes

import { Request, Response, Router } from "express";
import * as tenantPermissions from "../middleware/tenant-permissions";
import { S3Storage } from "../storage/aws-storage";
import * as storageTypes from "../storage/storage";
import { createCICDIntegrationRoutes } from "./integrations/ci-cd";
import { createCommIntegrationRoutes, createCommConfigRoutes } from "./integrations/comm";
import {
  createConfigurationRoutes as createPMConfigurationRoutes,
  createIntegrationRoutes as createPMIntegrationRoutes,
  createTicketRoutes as createPMTicketRoutes,
  createJiraMetadataRoutes
} from "./integrations/project-management";
import {
  createTestManagementConfigRoutes,
  createTestRunOperationsRoutes
} from "./integrations/test-management";
import { createCheckmateMetadataRoutes } from "./integrations/test-management/metadata/checkmate";
import { createTenantIntegrationRoutes } from "./integrations/test-management/tenant-integration/tenant-integration.routes";
import { createSCMIntegrationRoutes } from "./scm-integrations";
import { createStoreIntegrationRoutes } from "./store-integrations";
import { createReleaseConfigRoutes } from "./release-config-routes";
import { createReleaseScheduleRoutes } from "./release-schedule.routes";
import { createCronWebhookRoutes } from "./release/cron-webhook.routes";
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
  // TEST MANAGEMENT INTEGRATIONS (Checkmate, TestRail, etc.)
  // ============================================================================
  // Only mount test management routes if using S3Storage (which has test management)
  const isS3Storage = storage instanceof S3Storage;
  if (isS3Storage) {
    const s3Storage = storage;
    
    // All test management routes under /test-management/ prefix
    const testManagementRouter = Router();
    
    // Tenant-Level Integration Management (Credentials)
    const tenantIntegrationRoutes = createTenantIntegrationRoutes(s3Storage.testManagementIntegrationService, storage);
    testManagementRouter.use(tenantIntegrationRoutes);

    // Test Management Config Management (Reusable test configurations)
    const testManagementConfigRoutes = createTestManagementConfigRoutes(s3Storage.testManagementConfigService, storage);
    testManagementRouter.use(testManagementConfigRoutes);

    // Test Run Operations (Stateless - Create, Status, Reset, Cancel)
    const testRunRoutes = createTestRunOperationsRoutes(s3Storage.testManagementRunService, storage);
    testManagementRouter.use(testRunRoutes);

    // Checkmate Metadata Proxy Routes (Projects, Sections, Labels, Squads)
    const checkmateMetadataRoutes = createCheckmateMetadataRoutes(s3Storage.checkmateMetadataService, storage);
    testManagementRouter.use(checkmateMetadataRoutes);
    
    // Mount all test management routes under /test-management
    router.use('/test-management', testManagementRouter);
    
    console.log('[Release Management] Test Management routes mounted successfully under /test-management');
  } else {
    console.warn('[Release Management] Test Management services not available (S3Storage required), routes not mounted');
  }

  // ============================================================================
  // PROJECT MANAGEMENT INTEGRATIONS (JIRA, Linear, Asana, etc.)
  // ============================================================================
  if (isS3Storage) {
    const s3Storage = storage;
    
    // Check if services are initialized
    if (s3Storage.projectManagementIntegrationService && 
        s3Storage.projectManagementConfigService && 
        s3Storage.projectManagementTicketService) {
      
      // Project Management Integration Management (Credentials)
      const pmIntegrationRoutes = createPMIntegrationRoutes(s3Storage.projectManagementIntegrationService, s3Storage);
      router.use(pmIntegrationRoutes);
      
      // Project Management Configuration Management (Reusable configurations)
      const pmConfigurationRoutes = createPMConfigurationRoutes(s3Storage.projectManagementConfigService, s3Storage);
      router.use(pmConfigurationRoutes);
      
      // Project Management Ticket Operations (Stateless - Create, Check Status)
      const pmTicketRoutes = createPMTicketRoutes(s3Storage.projectManagementTicketService, s3Storage);
      router.use(pmTicketRoutes);
      
      // Jira Metadata Proxy Routes (Projects)
      const jiraMetadataRoutes = createJiraMetadataRoutes(s3Storage.jiraMetadataService, s3Storage);
      router.use(jiraMetadataRoutes);
      
      console.log('[Release Management] Project Management routes mounted successfully');
    } else {
      console.warn('[Release Management] Project Management services not yet initialized, routes not mounted');
    }
  } else {
    console.warn('[Release Management] Project Management services not available (S3Storage required), routes not mounted');
  }

  // ============================================================================
  // TARGET PLATFORM INTEGRATIONS (App Store, Play Store)
  // ============================================================================
  const storeRoutes = createStoreIntegrationRoutes(storage);
  router.use(storeRoutes);

  // ============================================================================
  // PIPELINE INTEGRATIONS (Jenkins, GitHub Actions)
  // ============================================================================
  const cicdRoutes = createCICDIntegrationRoutes(storage);
  router.use(cicdRoutes);

  // ============================================================================
  // COMMUNICATION INTEGRATIONS (Slack, Teams, Email)
  // ============================================================================
  if (isS3Storage) {
    const s3Storage = storage;
    
    // Check if services are initialized
    if (s3Storage.commIntegrationService && s3Storage.commConfigService) {
      // Integration Management (Credentials)
      const commIntegrationRoutes = createCommIntegrationRoutes(storage);
      router.use(commIntegrationRoutes);
      
      // Configuration Management (Channel configs)
      const commConfigRoutes = createCommConfigRoutes(storage);
      router.use(commConfigRoutes);
      
      console.log('[Release Management] Communication routes mounted successfully');
    } else {
      console.warn('[Release Management] Communication services not yet initialized, routes not mounted');
    }
  } else {
    console.warn('[Release Management] Communication services not available (S3Storage required), routes not mounted');
  }

  // ============================================================================
  // RELEASE CONFIGURATION ROUTES
  // ============================================================================
  if (isS3Storage) {
    const s3Storage = storage;
    const releaseConfigRoutes = createReleaseConfigRoutes(
      s3Storage.releaseConfigService,
      s3Storage.releaseConfigActivityLogService,
      storage
    );
    router.use(releaseConfigRoutes);
    console.log('[Release Management] Release Config routes mounted successfully');
  } else {
    console.warn('[Release Management] Release Config service not available (S3Storage required), routes not mounted');
  }

  // ============================================================================
  // RELEASE SCHEDULE ROUTES (Internal webhook + User-facing list)
  // ============================================================================
  if (isS3Storage) {
    const s3Storage = storage;
    
    if (s3Storage.releaseScheduleService) {
      const releaseScheduleRoutes = createReleaseScheduleRoutes(
        s3Storage.releaseScheduleService,
        storage
      );
      router.use(releaseScheduleRoutes);
      console.log('[Release Management] Release Schedule routes mounted successfully');
    } else {
      console.warn('[Release Management] Release Schedule service not available, routes not mounted');
    }
  } else {
    console.warn('[Release Management] Release Schedule service not available (S3Storage required), routes not mounted');
  }

  // ============================================================================
  // CRON WEBHOOK ROUTES (Global Scheduler - Cronicle)
  // ============================================================================
  const cronWebhookRoutes = createCronWebhookRoutes(storage);
  router.use(cronWebhookRoutes);
  console.log('[Release Management] Cron Webhook routes mounted successfully');

  // ============================================================================
  // RELEASE MANAGEMENT ROUTES (CRUD Operations)
  // ============================================================================
  if (isS3Storage) {
    const s3Storage = storage;
    
    // Release routes now create services internally - just pass storage
    const releaseRoutes = getReleaseRoutes({ storage: s3Storage });
    router.use(releaseRoutes);
    console.log('[Release Management] Release CRUD routes mounted successfully');
  } else {
    console.warn('[Release Management] Release services not available (S3Storage required), CRUD routes not mounted');
  }

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

  // NOTE: Release routes are already mounted above if S3Storage is available
  // This section is kept for reference but the routes are created internally now

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

        // Check Comm/Slack integration
        const commIntegrationRepository = (storage as any).commIntegrationRepository;
        const slackIntegration = await commIntegrationRepository.findByTenant(tenantId, 'SLACK');

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

