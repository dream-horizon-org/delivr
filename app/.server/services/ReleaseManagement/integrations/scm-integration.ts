/**
 * SCM Integration Service (BFF Layer)
 * Handles all SCM-related API calls to the backend
 */

import { IntegrationService } from '../base-integration';

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

export class SCMIntegrationService extends IntegrationService {
  constructor() {
    super();
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
