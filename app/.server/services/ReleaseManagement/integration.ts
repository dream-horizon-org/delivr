import axios from 'axios';
import { env } from '../config';
import type { 
  SCMIntegration, 
  VerifySCMRequest, 
  VerifySCMResponse 
} from './types';

/**
 * SCM Integration Service
 * Handles Source Control Management integrations for Release Management
 */
class IntegrationService {
  private __client = axios.create({
    baseURL: env.DELIVR_BACKEND_URL,
    timeout: 10000,
  });

  /**
   * Verify SCM connection before saving
   */
  async verifySCM(request: VerifySCMRequest, userId: string): Promise<VerifySCMResponse> {
    console.log(`[IntegrationService] Verifying SCM for tenant: ${request.tenantId}, owner: ${request.owner}, repo: ${request.repo}`);
    console.log(`[IntegrationService] Calling backend: ${this.__client.defaults.baseURL}/tenants/${request.tenantId}/integrations/scm/verify`);
    
    const { data } = await this.__client.post<VerifySCMResponse>(
      `/tenants/${request.tenantId}/integrations/scm/verify`,
      {
        scmType: request.scmType,
        owner: request.owner,
        repo: request.repo,
        accessToken: request.accessToken,
      },
      {
        headers: {
          userId,
        },
      }
    );
    
    console.log(`[IntegrationService] Backend response:`, data);
    return data;
  }

  /**
   * Get current SCM integration for tenant
   */
  async getSCMIntegration(tenantId: string, userId: string): Promise<SCMIntegration | null> {
    try {
      const { data } = await this.__client.get<SCMIntegration>(
        `/tenants/${tenantId}/integrations/scm`,
        {
          headers: {
            userId,
          },
        }
      );
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create new SCM integration
   */
  async createSCMIntegration(
    tenantId: string,
    userId: string,
    data: Omit<SCMIntegration, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SCMIntegration> {
    const { data: result } = await this.__client.post<SCMIntegration>(
      `/tenants/${tenantId}/integrations/scm`,
      data,
      {
        headers: {
          userId,
        },
      }
    );
    return result;
  }

  /**
   * Update existing SCM integration
   */
  async updateSCMIntegration(
    tenantId: string,
    userId: string,
    integrationId: string,
    updateData: Partial<SCMIntegration>
  ): Promise<SCMIntegration> {
    const { data } = await this.__client.patch<SCMIntegration>(
      `/tenants/${tenantId}/integrations/scm`,
      { integrationId, ...updateData },
      {
        headers: {
          userId,
        },
      }
    );
    return data;
  }

  /**
   * Delete SCM integration
   */
  async deleteSCMIntegration(
    tenantId: string,
    userId: string,
    integrationId: string
  ): Promise<void> {
    await this.__client.delete(
      `/tenants/${tenantId}/integrations/scm`,
      {
        headers: {
          userId,
        },
        data: { integrationId },
      }
    );
  }
}

// Export singleton instance
export const SCMIntegrationService = new IntegrationService();