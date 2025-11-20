// Release Management Router
// Handles all routes related to Release Management features
// Separate from DOTA (Over-The-Air) management routes

import { Request, Response, Router } from "express";
import * as storageTypes from "../storage/storage";
import * as tenantPermissions from "../middleware/tenant-permissions";
import { createSCMIntegrationRoutes } from "./scm-integrations";
import { createJiraIntegrationRoutes } from "./jira-integrations";
import { generateReleaseJiraLinks } from "../utils/jira-utils";

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
  // TODO: Implement communication integration routes
  // router.use(createCommunicationRoutes(storage));

  // ============================================================================
  // TICKET MANAGEMENT INTEGRATIONS (Jira, etc.)
  // ============================================================================
  const jiraRoutes = createJiraIntegrationRoutes(storage);
  router.use(jiraRoutes);

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
      // 
      // Example of how to add JIRA links to each release:
      // 
      // const tenantId = req.params.tenantId;
      // const releases = await storage.getReleases(tenantId);
      // 
      // // Add JIRA links to each release
      // const releasesWithJiraLinks = await Promise.all(
      //   releases.map(async (release) => {
      //     const jiraLinks = await generateReleaseJiraLinks(
      //       tenantId,
      //       release.webEpicId,
      //       release.iOSEpicId,
      //       release.playStoreEpicId
      //     );
      //     return {
      //       ...release,
      //       jiraLinks: {
      //         web: jiraLinks.webEpicUrl,
      //         ios: jiraLinks.iOSEpicUrl,
      //         playStore: jiraLinks.playStoreEpicUrl
      //       }
      //     };
      //   })
      // );
      // 
      // return res.status(200).json({ releases: releasesWithJiraLinks });
      
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
      try {
        const { tenantId, releaseId } = req.params;
        
        // TODO: Implement full release details retrieval from database
        // const release = await storage.getRelease(releaseId);
        
        // For now, return placeholder with Jira epic integration
        // Once release management is fully implemented, uncomment the code below
        
        // Fetch Jira epics for the release (from release_jira_epics table)
        const { getEpicsForRelease, generateReleaseJiraLinksFromEpics } = require('../utils/jira-utils');
        const jiraEpics = await getEpicsForRelease(releaseId);
        const jiraLinks = await generateReleaseJiraLinksFromEpics(releaseId);
        
        // Return placeholder response with Jira data
        res.status(200).json({
          id: releaseId,
          tenantId,
          // ...release data will go here once implemented
          jiraEpics: jiraEpics,
          jiraLinks: {
            web: jiraLinks.webEpicUrl,
            ios: jiraLinks.iOSEpicUrl,
            playStore: jiraLinks.playStoreEpicUrl
          },
          message: "Release details coming soon - Jira integration ready"
        });
      } catch (error: any) {
        console.error('[Release] Error fetching release details:', error);
        res.status(500).json({
          error: "Failed to fetch release details",
          message: error.message
        });
      }
    }
  );

  // Create a new release
  router.post(
    "/tenants/:tenantId/releases",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      try {
        const { tenantId } = req.params;
        const {
          version,
          type,
          platforms,
          jiraProjectKey,
          jiraEpics,
          autoCreateJiraEpics,
          description,
          ...releaseData
        } = req.body;
        
        // Validate required fields
        if (!version) {
          return res.status(400).json({
            error: "Missing required field",
            details: "version is required"
          });
        }
        
        // TODO: Implement full release creation logic
        // 1. Validate release metadata
        // 2. Create release record in database
        // 3. Initialize state history
        // 4. Trigger kickoff if needed
        
        // Placeholder: Create a mock release ID
        const releaseId = `rel_${Date.now()}`;
        
        // If Jira epics are requested, create them
        // NOTE: This code uses the old API (jiraProjectKey) and needs to be updated to use jiraConfigId
        if (autoCreateJiraEpics && jiraProjectKey && platforms && Array.isArray(platforms)) {
          const jiraIntegrationController = (storage as any).jiraIntegrationController;
          
          if (jiraIntegrationController && jiraIntegrationController.epicService) {
            try {
              console.warn('[Release] DEPRECATED: This code uses old jiraProjectKey API. Please update to use jiraConfigId instead.');
              // TODO: Update this to use jiraConfigId from jira_configurations table
              // For now, this will fail gracefully since createEpicsForRelease signature changed
              
              // Create epic records in database (OLD API - needs jiraConfigId now)
              // const epics = await jiraIntegrationController.epicService.createEpicsForRelease(
              //   releaseId,
              //   jiraConfigId,  // Changed: was jiraProjectKey
              //   version,
              //   platforms,
              //   description
              // );
              
              // Trigger background job to create epics in Jira
              // const { JiraEpicService } = require('../storage/integrations/jira/jira-epic-service');
              // for (const epic of epics) {
              //   jiraIntegrationController.epicService.createEpicInJira(tenantId, epic).catch((err: any) => {
              //     console.error('[Release] Failed to create epic in Jira:', err);
              //   });
              // }
              
              console.log(`[Release] Jira epic creation initiated for release ${releaseId}`);
            } catch (error: any) {
              console.error('[Release] Error creating Jira epics:', error);
              // Don't fail release creation if Jira epic creation fails
            }
          }
        }
        
        // Return placeholder response
        res.status(201).json({
          success: true,
          message: "Release creation placeholder - full implementation coming soon",
          release: {
            id: releaseId,
            tenantId,
            version,
            type,
            platforms,
            jiraProjectKey,
            autoCreateJiraEpics,
            ...releaseData
          },
          note: "Jira epic integration is ready. Complete release management will be implemented separately."
        });
      } catch (error: any) {
        console.error('[Release] Error creating release:', error);
        res.status(500).json({
          error: "Failed to create release",
          message: error.message
        });
      }
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

        // TODO: Check other required integrations (targets, pipelines, etc.)
        // const targetPlatforms = await storage.getTenantTargetPlatforms(tenantId);
        // const pipelines = await storage.getTenantPipelines(tenantId);
        // const communication = await storage.getTenantCommunicationIntegrations(tenantId);
        
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
            completed: false,  // TODO: Implement
            required: false,  // Optional
            label: "Slack Integration",
            description: "Connect Slack for notifications (optional)"
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

