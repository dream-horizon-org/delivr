/**
 * SCM Providers Controller
 * Returns available SCM provider information
 */

import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../../constants/http';
import { SCM_PROVIDERS } from './providers.constants';

/**
 * Get list of available SCM providers
 * GET /integrations/scm/providers
 */
export const getAvailableSCMProviders = async (_req: Request, res: Response): Promise<any> => {
  try {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: SCM_PROVIDERS
    });
  } catch (error: any) {
    console.error('[SCM Providers] Error fetching providers:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || 'Failed to fetch SCM providers'
    });
  }
};

