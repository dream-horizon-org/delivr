/**
 * Google Play Store Integration Service
 * Handles all Google Play Console integration API calls from the web panel
 */

import { IntegrationService } from './base-integration';

// ============================================================================
// Types
// ============================================================================

export enum VerificationStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED'
}

export enum PlayStoreAuthType {
  SERVICE_ACCOUNT = 'SERVICE_ACCOUNT',
  OAUTH2 = 'OAUTH2'
}

export interface VerifyPlayStoreRequest {
  tenantId: string;
  authType: PlayStoreAuthType;
  serviceAccountEmail?: string;
  serviceAccountJson?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  packageName: string;
  userId: string;
}

export interface VerifyPlayStoreResponse {
  verified: boolean;
  message: string;
  details?: {
    packageName?: string;
    appName?: string;
    trackInfo?: string[];
  };
}

export interface CreatePlayStoreIntegrationRequest {
  tenantId: string;
  displayName?: string;
  authType: PlayStoreAuthType;
  serviceAccountEmail?: string;
  serviceAccountJson?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  packageName: string;
  providerConfig?: {
    track?: string;
    rolloutPercentage?: number;
    releaseStatus?: string;
    autoPromote?: boolean;
    releaseNotes?: Record<string, string>;
  };
  userId: string;
}

export interface UpdatePlayStoreIntegrationRequest {
  tenantId: string;
  displayName?: string;
  authType?: PlayStoreAuthType;
  serviceAccountEmail?: string;
  serviceAccountJson?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  packageName?: string;
  providerConfig?: {
    track?: string;
    rolloutPercentage?: number;
    releaseStatus?: string;
    autoPromote?: boolean;
    releaseNotes?: Record<string, string>;
  };
  userId: string;
}

export interface PlayStoreIntegration {
  id: string;
  tenantId: string;
  displayName: string;
  authType: PlayStoreAuthType;
  serviceAccountEmail: string | null;
  clientId: string | null;
  packageName: string;
  providerConfig: {
    track?: string;
    rolloutPercentage?: number;
    releaseStatus?: string;
    autoPromote?: boolean;
    releaseNotes?: Record<string, string>;
  };
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  verificationError: string | null;
  isActive: boolean;
  hasValidCredentials: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlayStoreIntegrationResponse {
  success: boolean;
  integration?: PlayStoreIntegration;
  message?: string;
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class PlayStoreIntegrationServiceClass extends IntegrationService {
  /**
   * Verify Play Store connection
   */
  async verifyPlayStore(data: VerifyPlayStoreRequest): Promise<VerifyPlayStoreResponse> {
    this.logRequest('GET', `/tenants/${data.tenantId}/integrations/app-distribution/playstore/verify`);
    
    try {
      const result = await this.get<VerifyPlayStoreResponse>(
        `/tenants/${data.tenantId}/integrations/app-distribution/playstore/verify`,
        data.userId,
        {
          params: {
            authType: data.authType,
            serviceAccountEmail: data.serviceAccountEmail,
            serviceAccountJson: data.serviceAccountJson,
            clientId: data.clientId,
            clientSecret: data.clientSecret,
            refreshToken: data.refreshToken,
            packageName: data.packageName
          }
        }
      );

      this.logResponse('GET', `/tenants/${data.tenantId}/integrations/app-distribution/playstore/verify`, result.verified);
      return result;
    } catch (error: any) {
      this.logResponse('GET', `/tenants/${data.tenantId}/integrations/app-distribution/playstore/verify`, false);
      
      return {
        verified: false,
        message: error.message || 'Failed to verify Play Store connection',
      };
    }
  }

  /**
   * Create Play Store integration
   */
  async createIntegration(data: CreatePlayStoreIntegrationRequest): Promise<PlayStoreIntegrationResponse> {
    this.logRequest('POST', `/tenants/${data.tenantId}/integrations/app-distribution/playstore`);
    
    try {
      const result = await this.post<PlayStoreIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/app-distribution/playstore`,
        {
          displayName: data.displayName,
          authType: data.authType,
          serviceAccountEmail: data.serviceAccountEmail,
          serviceAccountJson: data.serviceAccountJson,
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          refreshToken: data.refreshToken,
          packageName: data.packageName,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/app-distribution/playstore`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Play Store integration'
      };
    }
  }

  /**
   * Get Play Store integration for tenant
   */
  async getIntegration(tenantId: string, userId: string): Promise<PlayStoreIntegrationResponse> {
    try {
      return await this.get<PlayStoreIntegrationResponse>(
        `/tenants/${tenantId}/integrations/app-distribution/playstore`,
        userId
      );
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: false,
          error: 'No Play Store integration found'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to get Play Store integration'
      };
    }
  }

  /**
   * Update Play Store integration
   */
  async updateIntegration(data: UpdatePlayStoreIntegrationRequest): Promise<PlayStoreIntegrationResponse> {
    this.logRequest('PATCH', `/tenants/${data.tenantId}/integrations/app-distribution/playstore`);
    
    try {
      const result = await this.patch<PlayStoreIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/app-distribution/playstore`,
        {
          displayName: data.displayName,
          authType: data.authType,
          serviceAccountEmail: data.serviceAccountEmail,
          serviceAccountJson: data.serviceAccountJson,
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          refreshToken: data.refreshToken,
          packageName: data.packageName,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('PATCH', `/tenants/${data.tenantId}/integrations/app-distribution/playstore`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update Play Store integration'
      };
    }
  }

  /**
   * Delete Play Store integration
   */
  async deleteIntegration(tenantId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        `/tenants/${tenantId}/integrations/app-distribution/playstore`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete Play Store integration'
      };
    }
  }
}

// Export singleton instance
export const PlayStoreIntegrationService = new PlayStoreIntegrationServiceClass();

