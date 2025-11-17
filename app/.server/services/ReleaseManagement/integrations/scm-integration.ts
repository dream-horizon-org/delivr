import { IntegrationService } from './base-integration';
import type { 
  SCMIntegration, 
  VerifySCMRequest, 
  VerifySCMResponse 
} from './types';

/**
 * SCM Integration Service
 * Handles Source Control Management integrations for Release Management
 */
class SCMIntegrationServiceClass extends IntegrationService {
  /**
   * Verify SCM connection before saving
   */
  async verifySCM(request: VerifySCMRequest, userId: string): Promise<VerifySCMResponse> {
    this.logRequest('POST', `/tenants/${request.tenantId}/integrations/scm/verify`, { 
      scmType: request.scmType, 
      owner: request.owner, 
      repo: request.repo 
    });
    
    const data = await this.post<VerifySCMResponse>(
      `/tenants/${request.tenantId}/integrations/scm/verify`,
      {
        scmType: request.scmType,
        owner: request.owner,
        repo: request.repo,
        accessToken: request.accessToken,
      },
      userId
    );
    
    this.logResponse('POST', `/tenants/${request.tenantId}/integrations/scm/verify`, true);
    return data;
  }

  /**
   * Get current SCM integration for tenant
   */
  async getSCMIntegration(tenantId: string, userId: string): Promise<SCMIntegration | null> {
    try {
      return await this.get<SCMIntegration>(
        `/tenants/${tenantId}/integrations/scm`,
        userId
      );
    } catch (error: any) {
      if ((error as any).status === 404) {
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
    this.logRequest('POST', `/tenants/${tenantId}/integrations/scm`, { 
      scmType: (data as any).scmType, 
      owner: (data as any).owner, 
      repo: (data as any).repo 
    });
    
    const result = await this.post<SCMIntegration>(
      `/tenants/${tenantId}/integrations/scm`,
      data,
      userId
    );
    
    this.logResponse('POST', `/tenants/${tenantId}/integrations/scm`, true);
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
    return await this.patch<SCMIntegration>(
      `/tenants/${tenantId}/integrations/scm`,
      { integrationId, ...updateData },
      userId
    );
  }

  /**
   * Delete SCM integration
   */
  async deleteSCMIntegration(
    tenantId: string,
    userId: string,
    integrationId: string
  ): Promise<void> {
    await this.delete<void>(
      `/tenants/${tenantId}/integrations/scm`,
      userId,
      {
        data: { integrationId },
      }
    );
  }
}

// Export singleton instance
export const SCMIntegrationService = new SCMIntegrationServiceClass();