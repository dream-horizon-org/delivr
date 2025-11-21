/**
 * Communication Integration Routes
 * Combines all communication-related routes (providers + integration + channel-config)
 */

import { Router } from 'express';
import { Storage } from '~storage/storage';
import { createProvidersRoutes } from './providers.routes';
import { createIntegrationRoutes } from './slack-integration';
import { createChannelConfigRoutes } from './slack-channel-config';

/**
 * Create Communication Integration Routes
 */
export const createCommIntegrationRoutes = (storage: Storage): Router => {
  const router = Router();

  // Mount providers listing routes
  router.use(createProvidersRoutes(storage));

  // Mount integration routes (services created lazily via factory on first request)
  router.use(createIntegrationRoutes(storage));

  // Mount channel-config routes (services created lazily via factory on first request)
  router.use(createChannelConfigRoutes(storage));

  return router;
};
