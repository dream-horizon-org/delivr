/**
 * SCM Integration Routes
 * Composes provider-specific SCM integration routes (GitHub, GitLab, Bitbucket)
 * Follows the same pattern as CI/CD integrations
 */

import { Router } from "express";
import { Storage } from "../storage/storage";
import { createGitHubConnectionRoutes } from "./integrations/scm/connections/github.routes";
import { getAvailableSCMProviders } from "../controllers/integrations/scm/providers.controller";
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

  // Compose provider-specific subrouters
  router.use(createGitHubConnectionRoutes(storage));
  
  // TODO: Uncomment when GitLab and Bitbucket implementations are ready
  // router.use(createGitLabConnectionRoutes(storage));
  // router.use(createBitbucketConnectionRoutes(storage));

  return router;
}
