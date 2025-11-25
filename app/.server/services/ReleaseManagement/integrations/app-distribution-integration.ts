/**
 * App Distribution Integration Service
 * Handles communication with backend /integrations/store/* endpoints
 */

import { IntegrationService } from './base-integration';
import { APP_DISTRIBUTION } from './api-routes';
import type {
  ConnectStoreRequest,
  ConnectStoreResponse,
  VerifyStoreRequest,
  VerifyStoreResponse,
  AppDistributionIntegration,
  ListDistributionsResponse,
  StoreType,
  Platform,
} from '~/types/app-distribution';

class AppDistributionIntegrationService extends IntegrationService {
  /**
   * Verify store credentials (test connection)
   * POST /integrations/store/verify
   */
  async verifyStore(
    tenantId: string,
    userId: string,
    request: VerifyStoreRequest
  ): Promise<VerifyStoreResponse> {
    try {
      return await this.post<VerifyStoreResponse>(
        APP_DISTRIBUTION.verify,
        {
          ...request,
          tenantId,
          userId,
        },
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify store credentials',
      };
    }
  }

  /**
   * Connect/Create store integration
   * PUT /integrations/store/connect
   */
  async connectStore(
    tenantId: string,
    userId: string,
    request: ConnectStoreRequest
  ): Promise<ConnectStoreResponse> {
    try {
      const response = await this.put<ConnectStoreResponse>(
        APP_DISTRIBUTION.connect,
        {
          ...request,
          tenantId,
          userId,
        },
        userId
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect store',
      };
    }
  }

  /**
   * List all store integrations for tenant (grouped by platform)
   * GET /integrations/store/tenant/:tenantId
   */
  async listIntegrations(tenantId: string, userId: string): Promise<ListDistributionsResponse> {
    try {
      const response = await this.get<ListDistributionsResponse>(
        APP_DISTRIBUTION.list(tenantId),
        userId
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch integrations',
      };
    }
  }

  /**
   * Get single store integration by ID
   * GET /integrations/store/:integrationId
   */
  async getIntegration(
    integrationId: string,
    userId: string
  ): Promise<{ success: boolean; data?: AppDistributionIntegration; error?: string }> {
    try {
      const response = await this.get<{ success: boolean; data?: AppDistributionIntegration }>(
        APP_DISTRIBUTION.get(integrationId),
        userId
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch integration',
      };
    }
  }

  /**
   * Revoke store integration
   * PATCH /integrations/store/tenant/:tenantId/revoke
   */
  async revokeIntegration(
    tenantId: string,
    storeType: StoreType,
    platform: Platform,
    userId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await this.patch<{ success: boolean; message?: string }>(
        APP_DISTRIBUTION.revoke(tenantId, storeType, platform),
        {},
        userId
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to revoke integration',
      };
    }
  }
}

export const AppDistributionService = new AppDistributionIntegrationService();

