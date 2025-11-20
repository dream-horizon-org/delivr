/**
 * SCM Integration Routes
 * Composes provider-specific SCM integration routes (GitHub, GitLab, Bitbucket)
 * Follows the same pattern as CI/CD integrations
 */

import { Router } from "express";
import { Storage } from "../storage/storage";
import { createGitHubConnectionRoutes } from "./integrations/scm/connections/github.routes";
// import { createGitLabConnectionRoutes } from "./integrations/scm/connections/gitlab.routes";
// import { createBitbucketConnectionRoutes } from "./integrations/scm/connections/bitbucket.routes";

/**
 * Create SCM Integration Routes
 * Composes provider-specific subrouters for each SCM provider
 */
export function createSCMIntegrationRoutes(storage: Storage): Router {
  const router = Router();

  // Compose provider-specific subrouters
  router.use(createGitHubConnectionRoutes(storage));
  
  // TODO: Uncomment when GitLab and Bitbucket implementations are ready
  // router.use(createGitLabConnectionRoutes(storage));
  // router.use(createBitbucketConnectionRoutes(storage));

  return router;
}
