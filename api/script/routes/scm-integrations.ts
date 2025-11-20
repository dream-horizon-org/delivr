/**
 * SCM Integration Routes
 * Composes provider-specific SCM integration routes (GitHub, GitLab, Bitbucket)
 * Follows the same pattern as CI/CD integrations
 */

import { Router } from "express";
import { Storage } from "../storage/storage";
import { createGitHubConnectionRoutes } from "./integrations/scm/connections/github.routes";
import { getAvailableSCMProviders } from "../controllers/integrations/scm/providers.controller";
import { fetchGitHubBranches } from "../controllers/integrations/scm/connections/github.controller";
import * as tenantPermissions from "../middleware/tenant-permissions";
// import { createGitLabConnectionRoutes } from "./integrations/scm/connections/gitlab.routes";
// import { createBitbucketConnectionRoutes } from "./integrations/scm/connections/bitbucket.routes";

/**
 * Create SCM Integration Routes
 * Composes provider-specific subrouters for each SCM provider
 */
export function createSCMIntegrationRoutes(storage: Storage): Router {
  const router = Router();

  // Get available SCM providers (public endpoint)
  router.get(
    "/integrations/scm/providers",
    getAvailableSCMProviders
  );

  // Generic branches endpoint - auto-detects SCM provider and routes to correct handler
  router.get(
    "/tenants/:tenantId/integrations/scm/branches",
    tenantPermissions.requireOwner({ storage }),
    async (req: any, res: any) => {
      const tenantId = req.params.tenantId;
      
      try {
        // Get the active SCM integration for this tenant
        const scmController = (storage as any).scmController;
        const integration = await scmController.findActiveByTenantWithTokens(tenantId);
        
        if (!integration) {
          return res.status(404).json({
            success: false,
            error: "No SCM integration found for this tenant"
          });
        }
        
        // Route to provider-specific controller based on scmType
        switch (integration.scmType) {
          case 'GITHUB':
            return await fetchGitHubBranches(req, res);
          
          case 'GITLAB':
            // TODO: Implement when GitLab is ready
            return res.status(501).json({
              success: false,
              error: "GitLab branch fetching not yet implemented"
            });
          
          case 'BITBUCKET':
            // TODO: Implement when Bitbucket is ready
            return res.status(501).json({
              success: false,
              error: "Bitbucket branch fetching not yet implemented"
            });
          
          default:
            return res.status(400).json({
              success: false,
              error: `Unsupported SCM provider: ${integration.scmType}`
            });
        }
      } catch (error: any) {
        console.error(`[SCM] Error fetching branches:`, error.message);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to fetch branches"
        });
      }
    }
  );

  // Compose provider-specific subrouters
  router.use(createGitHubConnectionRoutes(storage));
  
  // TODO: Uncomment when GitLab and Bitbucket implementations are ready
  // router.use(createGitLabConnectionRoutes(storage));
  // router.use(createBitbucketConnectionRoutes(storage));

  return router;
}
