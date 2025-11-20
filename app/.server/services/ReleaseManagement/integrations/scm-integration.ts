/**
 * SCM Integration Service (BFF Layer)
 * Handles all SCM-related API calls to the backend
 */

import { IntegrationService } from './base-integration';

export interface Branch {
  name: string;
  protected: boolean;
  default: boolean;
}

export interface FetchBranchesResponse {
  success: boolean;
  branches: Branch[];
  defaultBranch: string;
  error?: string;
}

export interface VerifySCMRequest {
  tenantId: string;
  scmType: string;
  owner: string;
  repo: string;
  accessToken: string;
}

export interface VerifySCMResponse {
  success: boolean;
  error?: string;
  message?: string;
}

class SCMIntegrationServiceClass extends IntegrationService {
  constructor() {
    super();
  }

  /**
   * Verify SCM connection
   */
  async verifySCM(data: VerifySCMRequest, userId: string): Promise<VerifySCMResponse> {
    const { tenantId, scmType, owner, repo, accessToken } = data;
    this.logRequest('POST', `/tenants/${tenantId}/integrations/scm/verify`, { scmType, owner, repo });
    
    try {
      const result = await this.post<VerifySCMResponse>(
        `/tenants/${tenantId}/integrations/scm/verify`,
        {
          scmType,
          owner,
          repo,
          accessToken,
        },
        userId
      );
      
      this.logResponse('POST', `/tenants/${tenantId}/integrations/scm/verify`, result.success);
      return result;
    } catch (error: any) {
      this.logResponse('POST', `/tenants/${tenantId}/integrations/scm/verify`, false);
      throw this.handleError(error);
    }
  }

  /**
   * Create SCM integration
   */
  async createSCMIntegration(tenantId: string, userId: string, data: any): Promise<any> {
    this.logRequest('POST', `/tenants/${tenantId}/integrations/scm`, { ...data, accessToken: '[REDACTED]' });
    
    try {
      const result = await this.post<any>(
        `/tenants/${tenantId}/integrations/scm`,
        data,
        userId
      );
      
      this.logResponse('POST', `/tenants/${tenantId}/integrations/scm`, true);
      return result;
    } catch (error: any) {
      this.logResponse('POST', `/tenants/${tenantId}/integrations/scm`, false);
      throw this.handleError(error);
    }
  }

  /**
   * Get SCM integration
   */
  async getSCMIntegration(tenantId: string, userId: string): Promise<any> {
    this.logRequest('GET', `/tenants/${tenantId}/integrations/scm`);
    
    try {
      const result = await this.get<any>(
        `/tenants/${tenantId}/integrations/scm`,
        userId
      );
      
      this.logResponse('GET', `/tenants/${tenantId}/integrations/scm`, true);
      return result;
    } catch (error: any) {
      this.logResponse('GET', `/tenants/${tenantId}/integrations/scm`, false);
      throw this.handleError(error);
    }
  }

  /**
   * Update SCM integration
   */
  async updateSCMIntegration(tenantId: string, userId: string, integrationId: string, data: any): Promise<any> {
    this.logRequest('PATCH', `/tenants/${tenantId}/integrations/scm/${integrationId}`, data);
    
    try {
      const result = await this.patch<any>(
        `/tenants/${tenantId}/integrations/scm/${integrationId}`,
        data,
        userId
      );
      
      this.logResponse('PATCH', `/tenants/${tenantId}/integrations/scm/${integrationId}`, true);
      return result;
    } catch (error: any) {
      this.logResponse('PATCH', `/tenants/${tenantId}/integrations/scm/${integrationId}`, false);
      throw this.handleError(error);
    }
  }

  /**
   * Delete SCM integration
   */
  async deleteSCMIntegration(tenantId: string, userId: string, integrationId: string): Promise<any> {
    this.logRequest('DELETE', `/tenants/${tenantId}/integrations/scm/${integrationId}`);
    
    try {
      const result = await this.delete<any>(
        `/tenants/${tenantId}/integrations/scm/${integrationId}`,
        userId
      );
      
      this.logResponse('DELETE', `/tenants/${tenantId}/integrations/scm/${integrationId}`, true);
      return result;
    } catch (error: any) {
      this.logResponse('DELETE', `/tenants/${tenantId}/integrations/scm/${integrationId}`, false);
      throw this.handleError(error);
    }
  }

  /**
   * Fetch branches from SCM repository
   */
  async fetchBranches(tenantId: string, userId: string): Promise<FetchBranchesResponse> {
    this.logRequest('GET', `/tenants/${tenantId}/integrations/scm/branches`);
    
    try {
      const result = await this.get<FetchBranchesResponse>(
        `/tenants/${tenantId}/integrations/scm/branches`,
        userId
      );
      
      this.logResponse('GET', `/tenants/${tenantId}/integrations/scm/branches`, result.success);
      return result;
    } catch (error: any) {
      this.logResponse('GET', `/tenants/${tenantId}/integrations/scm/branches`, false);
      throw this.handleError(error);
    }
  }
}

// Export singleton instance
export const SCMIntegrationService = new SCMIntegrationServiceClass();
