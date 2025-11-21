/**
 * Communication Providers Routes
 * Routes for listing available communication providers
 */

import { Router } from 'express';
import { Storage } from '../../../storage/storage';
import * as providersController from '../../../controllers/integrations/comm/providers.controller';

/**
 * Create providers listing routes
 */
export const createProvidersRoutes = (storage: Storage): Router => {
  const router = Router();

  // Get list of available communication providers
  router.get(
    '/integrations/comm/providers',
    providersController.getAvailableCommProviders
  );

  return router;
};

