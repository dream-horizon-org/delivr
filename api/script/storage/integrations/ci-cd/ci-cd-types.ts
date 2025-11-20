/**
 * CI/CD Integration TypeScript Definitions
 * 
 * Defines interfaces and enums for CI/CD (Continuous Integration/Continuous Delivery) integrations
 * Matches the tenant_ci_cd_integrations table schema
 */

// ============================================================================
// Enums
// ============================================================================
export enum CICDProviderType {
  JENKINS = 'JENKINS',
  GITHUB_ACTIONS = 'GITHUB_ACTIONS',
  CIRCLE_CI = 'CIRCLE_CI',
  GITLAB_CI = 'GITLAB_CI',
}

export enum AuthType {
  BASIC = 'BASIC',
  BEARER = 'BEARER',
  HEADER = 'HEADER',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED',
}

// ============================================================================
// Main Interface (matches DB schema)
// ============================================================================

export interface TenantCICDIntegration {
  id: string;
  tenantId: string;

  providerType: CICDProviderType;
  displayName: string;

  hostUrl: string;
  authType: AuthType;
  username?: string | null;

  apiToken?: string | null;
  headerName?: string | null;
  headerValue?: string | null;

  providerConfig?: any | null;

  verificationStatus: VerificationStatus;
  lastVerifiedAt?: Date | null;
  verificationError?: string | null;

  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeCICDIntegration extends Omit<TenantCICDIntegration, 'apiToken' | 'headerValue'> {
  hasSecret?: boolean;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CreateCICDIntegrationDto {
  tenantId: string;
  providerType: CICDProviderType;
  displayName: string;
  hostUrl: string;
  authType: AuthType;
  username?: string | null;
  apiToken?: string | null;
  headerName?: string | null;
  headerValue?: string | null;
  providerConfig?: any | null;
  createdByAccountId: string;
  verificationStatus?: VerificationStatus;
  lastVerifiedAt?: Date | null;
  verificationError?: string | null;
}

export interface UpdateCICDIntegrationDto {
  displayName?: string;
  hostUrl?: string;
  authType?: AuthType;
  username?: string | null;
  apiToken?: string | null;
  headerName?: string | null;
  headerValue?: string | null;
  providerConfig?: any | null;
  verificationStatus?: VerificationStatus;
  lastVerifiedAt?: Date | null;
  verificationError?: string | null;
}

export interface CICDIntegrationFilters {
  tenantId?: string;
  providerType?: CICDProviderType;
  verificationStatus?: VerificationStatus;
  hostUrl?: string;
}


