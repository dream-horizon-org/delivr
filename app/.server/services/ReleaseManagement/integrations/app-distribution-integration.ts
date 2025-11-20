/**
 * App Distribution Integration Service
 * Handles communication with backend /integrations/store/* endpoints
 */

import { IntegrationService } from './base-integration';
import type {
  ConnectStoreRequest,
  ConnectStoreResponse,
  VerifyStoreRequest,
  VerifyStoreResponse,
  AppDistributionIntegration,
  ListDistributionsResponse,
} from '~/types/app-distribution';

class AppDistributionIntegrationService extends IntegrationService {
  /**
   * Verify store credentials (test connection)
   * POST /integrations/store/verify
   */
  async verifyStore(request: VerifyStoreRequest, userId: string): Promise<VerifyStoreResponse> {
    try {
      return await this.post<VerifyStoreResponse>(
        '/integrations/store/verify',
        {
          ...request,
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
  async connectStore(request: ConnectStoreRequest, userId: string): Promise<ConnectStoreResponse> {
    try {
      const response = await this.put<ConnectStoreResponse>(
        '/integrations/store/connect',
        {
          ...request,
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
   * List all store integrations for tenant
   * GET /integrations/store/:tenantId
   */
  async listIntegrations(tenantId: string, userId: string): Promise<ListDistributionsResponse> {
    try {
      const response = await this.get<ListDistributionsResponse>(
        `/integrations/store/${tenantId}`,
        userId
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        integrations: [],
        error: error.message || 'Failed to fetch integrations',
      };
    }
  }

  /**
   * Get single store integration
   * GET /integrations/store/:tenantId/:integrationId
   */
  async getIntegration(
    tenantId: string,
    integrationId: string,
    userId: string
  ): Promise<{ success: boolean; integration?: AppDistributionIntegration; error?: string }> {
    try {
      const response = await this.get<{ success: boolean; integration?: AppDistributionIntegration }>(
        `/integrations/store/${tenantId}/${integrationId}`,
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
   * Delete store integration
   * DELETE /integrations/store/:tenantId/:integrationId
   */
  async deleteIntegration(
    tenantId: string,
    integrationId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await this.delete<{ success: boolean; message?: string }>(
        `/integrations/store/${tenantId}/${integrationId}`,
        userId
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete integration',
      };
    }
  }
}

export const AppDistributionService = new AppDistributionIntegrationService();

