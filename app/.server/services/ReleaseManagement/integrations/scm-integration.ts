/**
 * SCM Integration Service (BFF Layer)
 * Handles all SCM-related API calls to the backend
 */

import { IntegrationService } from './base-integration';
import { SCM } from './api-routes';

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
  _encrypted?: boolean; // Flag to indicate accessToken is encrypted
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
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github/verify)
   */
  async verifySCM(data: VerifySCMRequest, userId: string): Promise<VerifySCMResponse> {
    const { tenantId, scmType, owner, repo, accessToken, _encrypted } = data;
    const endpoint = SCM.verify(tenantId, scmType);
    this.logRequest('POST', endpoint, { scmType, owner, repo, _encrypted });
    
    try {
      const result = await this.post<VerifySCMResponse>(
        endpoint,
        {
          scmType,
          owner,
          repo,
          accessToken,
          _encrypted, // Forward encryption flag to backend
        },
        userId
      );
      
      this.logResponse('POST', endpoint, result.success);
      return result;
    } catch (error: any) {
      this.logResponse('POST', endpoint, false);
      throw this.handleError(error);
    }
  }

  /**
   * Create SCM integration
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github)
   */
  async createSCMIntegration(tenantId: string, userId: string, data: any): Promise<any> {
    // Determine provider type from data or use default (GitHub)
    const scmType = data.scmType || 'GITHUB';
    const endpoint = SCM.create(tenantId, scmType);
    this.logRequest('POST', endpoint, { ...data, accessToken: '[REDACTED]' });
    
    try {
      const result = await this.post<any>(
        endpoint,
        data,
        userId
      );
      
      this.logResponse('POST', endpoint, true);
      return result;
    } catch (error: any) {
      this.logResponse('POST', endpoint, false);
      throw this.handleError(error);
    }
  }

  /**
   * Get SCM integration
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github)
   * Defaults to GITHUB if provider type is unknown
   */
  async getSCMIntegration(tenantId: string, userId: string, scmType: string = 'GITHUB'): Promise<any> {
    const endpoint = SCM.get(tenantId, scmType);
    this.logRequest('GET', endpoint);
    
    try {
      const result = await this.get<any>(
        endpoint,
        userId
      );
      
      this.logResponse('GET', endpoint, true);
      return result;
    } catch (error: any) {
      this.logResponse('GET', endpoint, false);
      throw this.handleError(error);
    }
  }

  /**
   * Update SCM integration
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github)
   */
  async updateSCMIntegration(tenantId: string, userId: string, integrationId: string, data: any): Promise<any> {
    // Determine provider type from data or use default (GitHub)
    const scmType = data.scmType || 'GITHUB';
    const endpoint = SCM.update(tenantId, scmType);
    this.logRequest('PATCH', endpoint, { ...data, accessToken: '[REDACTED]' });
    
    try {
      const result = await this.patch<any>(
        endpoint,
        data,
        userId
      );
      
      this.logResponse('PATCH', endpoint, true);
      return result;
    } catch (error: any) {
      this.logResponse('PATCH', endpoint, false);
      throw this.handleError(error);
    }
  }

  /**
   * Delete SCM integration
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github)
   */
  async deleteSCMIntegration(tenantId: string, userId: string, integrationId: string, scmType: string = 'GITHUB'): Promise<any> {
    const endpoint = SCM.delete(tenantId, scmType);
    this.logRequest('DELETE', endpoint);
    
    try {
      const result = await this.delete<any>(
        endpoint,
        userId
      );
      
      this.logResponse('DELETE', endpoint, true);
      return result;
    } catch (error: any) {
      this.logResponse('DELETE', endpoint, false);
      throw this.handleError(error);
    }
  }

  /**
   * Fetch branches from SCM repository
   */
  async fetchBranches(tenantId: string, userId: string): Promise<FetchBranchesResponse> {
    const endpoint = SCM.branches(tenantId);
    this.logRequest('GET', endpoint);
    
    try {
      const result = await this.get<FetchBranchesResponse>(
        endpoint,
        userId
      );
      
      this.logResponse('GET', endpoint, result.success);
      return result;
    } catch (error: any) {
      this.logResponse('GET', endpoint, false);
      throw this.handleError(error);
    }
  }
}

// Export singleton instance
export const SCMIntegrationService = new SCMIntegrationServiceClass();
