/**
 * Apple App Store Integration Service
 * Handles all App Store Connect integration API calls from the web panel
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

export enum AppStoreAuthType {
  API_KEY = 'API_KEY',
  JWT = 'JWT'
}

export interface VerifyAppStoreRequest {
  tenantId: string;
  authType: AppStoreAuthType;
  issuerId: string;
  keyId: string;
  privateKey: string;
  bundleId?: string;
  userId: string;
}

export interface VerifyAppStoreResponse {
  verified: boolean;
  message: string;
  details?: {
    teamName?: string;
    appName?: string;
    bundleId?: string;
  };
}

export interface CreateAppStoreIntegrationRequest {
  tenantId: string;
  displayName?: string;
  authType: AppStoreAuthType;
  issuerId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
  appId?: string;
  teamId?: string;
  providerConfig?: {
    autoSubmitForReview?: boolean;
    skipWaitingForBuildProcessing?: boolean;
    submitVersionInfo?: {
      copyright?: string;
      releaseNotes?: string;
    };
    betaGroups?: string[];
  };
  userId: string;
}

export interface UpdateAppStoreIntegrationRequest {
  tenantId: string;
  displayName?: string;
  authType?: AppStoreAuthType;
  issuerId?: string;
  keyId?: string;
  privateKey?: string;
  bundleId?: string;
  appId?: string;
  teamId?: string;
  providerConfig?: {
    autoSubmitForReview?: boolean;
    skipWaitingForBuildProcessing?: boolean;
    submitVersionInfo?: {
      copyright?: string;
      releaseNotes?: string;
    };
    betaGroups?: string[];
  };
  userId: string;
}

export interface AppStoreIntegration {
  id: string;
  tenantId: string;
  displayName: string;
  authType: AppStoreAuthType;
  issuerId: string;
  keyId: string;
  bundleId: string;
  appId: string | null;
  teamId: string | null;
  providerConfig: {
    autoSubmitForReview?: boolean;
    skipWaitingForBuildProcessing?: boolean;
    submitVersionInfo?: {
      copyright?: string;
      releaseNotes?: string;
    };
    betaGroups?: string[];
  };
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  verificationError: string | null;
  isActive: boolean;
  hasValidKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppStoreIntegrationResponse {
  success: boolean;
  integration?: AppStoreIntegration;
  message?: string;
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class AppStoreIntegrationServiceClass extends IntegrationService {
  /**
   * Verify App Store connection
   */
  async verifyAppStore(data: VerifyAppStoreRequest): Promise<VerifyAppStoreResponse> {
    this.logRequest('GET', `/tenants/${data.tenantId}/integrations/app-distribution/appstore/verify`);
    
    try {
      const result = await this.get<VerifyAppStoreResponse>(
        `/tenants/${data.tenantId}/integrations/app-distribution/appstore/verify`,
        data.userId,
        {
          params: {
            authType: data.authType,
            issuerId: data.issuerId,
            keyId: data.keyId,
            privateKey: data.privateKey,
            bundleId: data.bundleId
          }
        }
      );

      this.logResponse('GET', `/tenants/${data.tenantId}/integrations/app-distribution/appstore/verify`, result.verified);
      return result;
    } catch (error: any) {
      this.logResponse('GET', `/tenants/${data.tenantId}/integrations/app-distribution/appstore/verify`, false);
      
      return {
        verified: false,
        message: error.message || 'Failed to verify App Store connection',
      };
    }
  }

  /**
   * Create App Store integration
   */
  async createIntegration(data: CreateAppStoreIntegrationRequest): Promise<AppStoreIntegrationResponse> {
    this.logRequest('POST', `/tenants/${data.tenantId}/integrations/app-distribution/appstore`);
    
    try {
      const result = await this.post<AppStoreIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/app-distribution/appstore`,
        {
          displayName: data.displayName,
          authType: data.authType,
          issuerId: data.issuerId,
          keyId: data.keyId,
          privateKey: data.privateKey,
          bundleId: data.bundleId,
          appId: data.appId,
          teamId: data.teamId,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/app-distribution/appstore`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create App Store integration'
      };
    }
  }

  /**
   * Get App Store integration for tenant
   */
  async getIntegration(tenantId: string, userId: string): Promise<AppStoreIntegrationResponse> {
    try {
      return await this.get<AppStoreIntegrationResponse>(
        `/tenants/${tenantId}/integrations/app-distribution/appstore`,
        userId
      );
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: false,
          error: 'No App Store integration found'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to get App Store integration'
      };
    }
  }

  /**
   * Update App Store integration
   */
  async updateIntegration(data: UpdateAppStoreIntegrationRequest): Promise<AppStoreIntegrationResponse> {
    this.logRequest('PATCH', `/tenants/${data.tenantId}/integrations/app-distribution/appstore`);
    
    try {
      const result = await this.patch<AppStoreIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/app-distribution/appstore`,
        {
          displayName: data.displayName,
          authType: data.authType,
          issuerId: data.issuerId,
          keyId: data.keyId,
          privateKey: data.privateKey,
          bundleId: data.bundleId,
          appId: data.appId,
          teamId: data.teamId,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('PATCH', `/tenants/${data.tenantId}/integrations/app-distribution/appstore`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update App Store integration'
      };
    }
  }

  /**
   * Delete App Store integration
   */
  async deleteIntegration(tenantId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        `/tenants/${tenantId}/integrations/app-distribution/appstore`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete App Store integration'
      };
    }
  }
}

// Export singleton instance
export const AppStoreIntegrationService = new AppStoreIntegrationServiceClass();

