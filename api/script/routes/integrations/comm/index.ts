import { Router } from 'express';
import { Storage } from '../../../storage/storage';
import { createProvidersRoutes } from './providers.routes';
import { createIntegrationRoutes } from './integration';
import { createChannelConfigRoutes } from './slack-channel-config';

/**
 * Create Communication Integration Routes
 * Combines all communication-related routes (providers + integration + channel-config)
 */
export const createCommIntegrationRoutes = (storage: Storage): Router => {
  const router = Router();

  // Mount providers listing routes
  router.use(createProvidersRoutes(storage));

  // Mount integration routes
  router.use(createIntegrationRoutes(storage));

  // Mount channel-config routes
  router.use(createChannelConfigRoutes(storage));

  return router;
};

