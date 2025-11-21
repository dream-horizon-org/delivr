/**
 * Communication Providers Controller
 * Returns available communication provider information
 */

import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../../constants/http';
import { COMM_PROVIDERS } from './providers.constants';

/**
 * Get list of available communication providers
 * GET /integrations/comm/providers
 */
export const getAvailableCommProviders = async (_req: Request, res: Response): Promise<any> => {
  try {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: COMM_PROVIDERS
    });
  } catch (error: any) {
    console.error('[Comm Providers] Error fetching providers:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message || 'Failed to fetch communication providers'
    });
  }
};

