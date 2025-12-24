/**
 * Communication Providers Routes
 * Routes for listing available communication providers
 * 
 * NOTE: This file is deprecated. Provider routes are now handled in comm-integration routes.
 * Keeping for backwards compatibility.
 */

import { Router } from 'express';
import { Storage } from '../../../storage/storage';
import * as tenantPermissions from '../../../middleware/tenant-permissions';
import { createCommIntegrationController } from '../../../controllers/integrations/comm/comm-integration';

/**
 * Create providers listing routes
 */
export const createProvidersRoutes = (storage: Storage): Router => {
  const router = Router();
  const controller = createCommIntegrationController((storage as any).commIntegrationService);

  // Get list of available communication providers
  router.get(
    '/integrations/comm/providers',
    tenantPermissions.requireEditor({ storage }),
    controller.getAvailableProviders
  );

  return router;
};

