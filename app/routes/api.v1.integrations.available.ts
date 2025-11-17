/**
 * API Route: Get all available integrations (system-wide)
 * This is a static list that doesn't require tenant context
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { getAllIntegrations } from '~/config/integrations';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Get base integrations list (no tenant-specific data)
  const integrations = getAllIntegrations();

  return json({
    integrations,
    timestamp: new Date().toISOString()
  });
};


