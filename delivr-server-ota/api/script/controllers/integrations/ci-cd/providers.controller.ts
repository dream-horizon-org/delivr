/**
 * CI/CD Providers Controller
 * Returns available CI/CD provider information
 */

import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../../constants/http';
import { successResponse, simpleErrorResponse } from '~utils/response.utils';
import { CICD_PROVIDERS } from './providers.constants';

/**
 * Get list of available CI/CD providers
 * GET /integrations/ci-cd/providers
 */
export const getAvailableCICDProviders = async (_req: Request, res: Response): Promise<any> => {
  try {
    return res.status(HTTP_STATUS.OK).json(
      successResponse(CICD_PROVIDERS)
    );
  } catch (error: any) {
    console.error('[CI/CD Providers] Error fetching providers:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      simpleErrorResponse(error.message || 'Failed to fetch CI/CD providers', 'fetch_providers_failed')
    );
  }
};

