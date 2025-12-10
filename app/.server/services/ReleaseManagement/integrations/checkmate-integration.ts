/**
 * Checkmate Test Management Integration Service
 * Handles all Checkmate integration API calls from the web panel
 */

import { IntegrationService } from './base-integration';
import { TEST_MANAGEMENT } from './api-routes';

// ============================================================================
// Types
// ============================================================================

export enum VerificationStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  ERROR = 'ERROR'
}

export interface CheckmateConfig {
  baseUrl: string;
  authToken: string;
  orgId: number;
  _encrypted?: boolean; // Flag to indicate authToken is encrypted
}

export interface VerifyCheckmateRequest {
  integrationId: string;
  userId: string;
}

export interface VerifyCheckmateResponse {
  success: boolean;
  status: VerificationStatus;
  message: string;
  error?: string;
}

export interface CreateCheckmateIntegrationRequest {
  tenantId: string;
  name: string;
  config: CheckmateConfig;
  userId: string;
}

export interface UpdateCheckmateIntegrationRequest {
  integrationId: string;
  name?: string;
  config?: Partial<CheckmateConfig>;
  userId: string;
}

export interface CheckmateIntegration {
  id: string;
  tenantId: string;
  name: string;
  providerType: 'checkmate'; // Backend uses lowercase
  config: CheckmateConfig;
  createdByAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckmateIntegrationResponse {
  success: boolean;
  data?: CheckmateIntegration | CheckmateIntegration[];
  message?: string;
  error?: string;
}

export interface CheckmateVerifyResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
}

export interface VerifyCheckmateCredentialsRequest {
  baseUrl: string;
  authToken: string;
  orgId: number;
  _encrypted?: boolean; // Flag to indicate authToken is encrypted
}

// ============================================================================
// Service Class
// ============================================================================

export class CheckmateIntegrationServiceClass extends IntegrationService {
  /**
   * Verify Checkmate credentials without saving
   */
  async verifyCredentials(
    data: VerifyCheckmateCredentialsRequest,
    userId: string
  ): Promise<CheckmateVerifyResponse> {
    const endpoint = TEST_MANAGEMENT.verifyCredentials;
    
    console.log('[CheckmateIntegrationService] Verifying credentials:', {
      endpoint,
      baseUrl: this.baseUrl,
      fullUrl: `${this.baseUrl}${endpoint}`,
      config: {
        baseUrl: data.baseUrl,
        orgId: data.orgId,
        authToken: '[REDACTED]'
      }
    });
    
    this.logRequest('POST', endpoint, {
      baseUrl: data.baseUrl,
      orgId: data.orgId,
      authToken: '[REDACTED]'
    });
    
    try {
      const result = await this.post<any>(
        endpoint,
        {
          providerType: 'checkmate',
          config: {
            baseUrl: data.baseUrl,
            authToken: data.authToken,
            orgId: data.orgId,
            _encrypted: data._encrypted, // Forward encryption flag
          },
        },
        userId
      );
      
      console.log('[CheckmateIntegrationService] Raw backend response:', JSON.stringify(result, null, 2));
      
      // Handle both nested and flat response structures
      // Checkmate backend returns: { success, data: { success, status: 'VALID'|'INVALID', message } }
      let verificationResult: CheckmateVerifyResponse;
      
      if (result.data && typeof result.data === 'object') {
        // Response is wrapped in data field
        // Check for both 'verified' field and 'status' field (Checkmate uses 'status')
        const isVerified = result.data.verified === true || result.data.status === 'VALID';
        
        verificationResult = {
          success: result.data.success !== false,
          verified: isVerified,
          message: result.data.message,
          error: result.data.error,
        };
      } else if (typeof result.verified !== 'undefined' || typeof result.status !== 'undefined') {
        // Response has verified/status at top level
        const isVerified = result.verified === true || result.status === 'VALID';
        
        verificationResult = {
          success: result.success !== false,
          verified: isVerified,
          message: result.message,
          error: result.error,
        };
      } else {
        // Invalid response structure
        console.error('[CheckmateIntegrationService] Invalid response from backend:', result);
        return {
          success: false,
          verified: false,
          error: 'Invalid response from backend - no verification status',
        };
      }
      
      console.log('[CheckmateIntegrationService] Parsed verification result:', verificationResult);
      this.logResponse('POST', endpoint, verificationResult.verified === true);
      
      return verificationResult;
    } catch (error: any) {
      this.logResponse('POST', endpoint, false);
      console.error('[CheckmateIntegrationService] Verification error:', error);
      
      // Check if this is a network/connection error
      if (error.message === 'No response from server') {
        return {
          success: false,
          verified: false,
          error: 'Unable to connect to backend server. Please check your backend configuration.',
        };
      }
      
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify credentials',
      };
    }
  }

  /**
   * Create Checkmate integration
   */
  async createIntegration(data: CreateCheckmateIntegrationRequest): Promise<CheckmateIntegrationResponse> {
    const endpoint = TEST_MANAGEMENT.create(data.tenantId);
    
    console.log('[CheckmateIntegrationService] Creating integration:', {
      endpoint,
      baseUrl: this.baseUrl,
      fullUrl: `${this.baseUrl}${endpoint}`,
      tenantId: data.tenantId,
      name: data.name,
      configKeys: Object.keys(data.config)
    });
    
    this.logRequest('POST', endpoint);
    
    try {
      const result = await this.post<{ success: boolean; data: CheckmateIntegration; error?: string }>(
        endpoint,
        {
          name: data.name,
          providerType: 'checkmate', // Backend expects lowercase
          config: {
            baseUrl: data.config.baseUrl,
            authToken: data.config.authToken,
            orgId: data.config.orgId,
            _encrypted: data.config._encrypted, // Forward encryption flag
          }
        },
        data.userId
      );

      this.logResponse('POST', endpoint, result.success);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      console.error('[CheckmateIntegrationService] Create integration error:', error.message);
      
      // Check if this is a network/connection error
      if (error.message === 'No response from server') {
        return {
          success: false,
          error: `Backend server (${this.baseUrl}) is not responding. Check if the backend is running and has the test-management endpoints implemented.`
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to create Checkmate integration'
      };
    }
  }

  /**
   * Get all Checkmate integrations for a tenant
   */
  async listIntegrations(tenantId: string, userId: string): Promise<CheckmateIntegrationResponse> {
    try {
      const result = await this.get<{ success: boolean; data: CheckmateIntegration[]; error?: string }>(
        TEST_MANAGEMENT.list(tenantId),
        userId
      );

      // Filter only Checkmate integrations
      const checkmateIntegrations = result.data?.filter((i: any) => i.providerType === 'checkmate') || [];

      return {
        success: result.success,
        data: checkmateIntegrations,
        error: result.error
      };
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: true,
          data: []
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to list Checkmate integrations'
      };
    }
  }

  /**
   * Get single Checkmate integration
   */
  async getIntegration(integrationId: string, userId: string): Promise<CheckmateIntegrationResponse> {
    try {
      const result = await this.get<{ success: boolean; data: CheckmateIntegration; error?: string }>(
        TEST_MANAGEMENT.get(integrationId),
        userId
      );

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: false,
          error: 'Checkmate integration not found'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to get Checkmate integration'
      };
    }
  }

  /**
   * Update Checkmate integration
   */
  async updateIntegration(data: UpdateCheckmateIntegrationRequest, userId: string): Promise<CheckmateIntegrationResponse> {
    const endpoint = TEST_MANAGEMENT.update(data.integrationId);
    this.logRequest('PUT', endpoint);
    
    try {
      const payload: any = {};
      if (data.name) payload.name = data.name;
      if (data.config) {
        payload.config = {
          ...(data.config.baseUrl && { baseUrl: data.config.baseUrl }),
          ...(data.config.authToken && { authToken: data.config.authToken }),
          ...(data.config.orgId !== undefined && { orgId: data.config.orgId }),
          ...(data.config._encrypted && { _encrypted: data.config._encrypted }), // Forward encryption flag
        };
      }

      const result = await this.put<{ success: boolean; data: CheckmateIntegration; error?: string }>(
        endpoint,
        payload,
        userId
      );

      this.logResponse('PUT', endpoint, result.success);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update Checkmate integration'
      };
    }
  }

  /**
   * Delete Checkmate integration
   */
  async deleteIntegration(integrationId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const result = await this.delete<{ success: boolean; message?: string; error?: string }>(
        TEST_MANAGEMENT.delete(integrationId),
        userId
      );

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete Checkmate integration'
      };
    }
  }

  /**
   * Verify Checkmate integration connection
   */
  async verifyIntegration(integrationId: string, userId: string): Promise<VerifyCheckmateResponse> {
    const endpoint = TEST_MANAGEMENT.verify(integrationId);
    this.logRequest('POST', endpoint);
    
    try {
      const result = await this.post<{ success: boolean; data: VerifyCheckmateResponse }>(
        endpoint,
        {},
        userId
      );

      this.logResponse('POST', endpoint, result.data.success);
      return result.data;
    } catch (error: any) {
      return {
        success: false,
        status: VerificationStatus.ERROR,
        message: error.message || 'Failed to verify Checkmate connection',
        error: error.message
      };
    }
  }

  /**
   * Fetch Checkmate metadata (labels, projects, sections, squads)
   */
  async fetchMetadata(
    integrationId: string,
    metadataType: 'labels' | 'projects' | 'sections' | 'squads',
    projectId?: string,
    userId?: string
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    let endpoint: string;
    
    switch (metadataType) {
      case 'labels':
        endpoint = TEST_MANAGEMENT.checkmate.labels(integrationId);
        break;
      case 'projects':
        endpoint = TEST_MANAGEMENT.checkmate.projects(integrationId);
        break;
      case 'sections':
        endpoint = TEST_MANAGEMENT.checkmate.sections(integrationId);
        break;
      case 'squads':
        endpoint = TEST_MANAGEMENT.checkmate.squads(integrationId);
        break;
      default:
        return {
          success: false,
          error: `Unknown metadata type: ${metadataType}`
        };
    }

    // Add projectId query param if provided
    if (projectId && (metadataType === 'labels' || metadataType === 'sections' || metadataType === 'squads')) {
      endpoint += `?projectId=${projectId}`;
    }

    this.logRequest('GET', endpoint);
    
    try {
      // Use empty string as userId if not provided (metadata endpoints may not require auth)
      const result = await this.get<{ success: boolean; data: any[]; error?: string }>(
        endpoint,
        userId || ''
      );

      this.logResponse('GET', endpoint, result.success);
      
      // The backend might return data in different formats
      // For projects, it might be { projectsList: [...] } or just [...]
      let responseData = result.data || [];
      
      // If it's an object with projectsList, extract it
      if (metadataType === 'projects' && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        const dataObj = result.data as any;
        if ('projectsList' in dataObj) {
          responseData = dataObj.projectsList || [];
        }
      }
      
      return {
        success: result.success,
        data: responseData,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || `Failed to fetch ${metadataType}`
      };
    }
  }
}

// Export singleton instance
export const CheckmateIntegrationService = new CheckmateIntegrationServiceClass();
