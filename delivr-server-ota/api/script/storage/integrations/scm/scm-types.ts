/**
 * SCM Integration TypeScript Definitions
 * 
 * Defines interfaces and enums for SCM (Source Control Management) integrations
 * Matches the tenant_scm_integrations table schema
 */

// ============================================================================
// Enums
// ============================================================================

export enum SCMType {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  BITBUCKET = 'BITBUCKET'
}

export enum VerificationStatus {
  PENDING = 'PENDING',   // Not yet verified
  VALID = 'VALID',       // Successfully verified
  INVALID = 'INVALID',   // Verification failed
  EXPIRED = 'EXPIRED'    // Token/credentials expired
}

// ============================================================================
// Main Interface (matches DB schema)
// ============================================================================

export interface TenantSCMIntegration {
  id: string;
  appId: string;
  
  // Provider type
  scmType: SCMType;
  displayName: string;
  
  // Core GitHub fields (from OG Delivr)
  owner: string;                    // GitHub org or username (e.g., 'dream11')
  repo: string;                     // Repository name (e.g., 'd11-react-native')
  repositoryUrl: string;            // Full URL
  defaultBranch: string;            // 'main', 'master', etc.
  
  // Authentication (encrypted in DB)
  accessToken: string;              // GitHub Personal Access Token
  
  // Webhook configuration
  webhookSecret?: string | null;
  webhookUrl?: string | null;
  webhookEnabled: boolean;
  senderLogin?: string | null;
  
  // Extensibility for other providers
  providerConfig?: any | null;      // JSON field for provider-specific config
  
  // Status
  isActive: boolean;
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: Date | null;
  verificationError?: string | null;
  
  // Metadata
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a new SCM integration
 */
export interface CreateSCMIntegrationDto {
  appId: string;
  scmType?: SCMType;                // Defaults to GITHUB
  displayName: string;
  
  // GitHub fields (required)
  owner: string;
  repo: string;
  repositoryUrl: string;
  defaultBranch?: string;           // Defaults to 'main'
  accessToken: string;              // Will be encrypted before storage
  
  // Optional fields
  webhookSecret?: string;
  webhookUrl?: string;
  webhookEnabled?: boolean;
  senderLogin?: string;
  providerConfig?: any;
  verificationStatus?: VerificationStatus;  // Defaults to PENDING
  
  // Creator
  createdByAccountId: string;
}

/**
 * DTO for updating an existing SCM integration
 */
export interface UpdateSCMIntegrationDto {
  displayName?: string;
  defaultBranch?: string;
  accessToken?: string;             // Will be encrypted before storage
  webhookSecret?: string;
  webhookUrl?: string;
  webhookEnabled?: boolean;
  senderLogin?: string;
  providerConfig?: any;
  isActive?: boolean;
  verificationStatus?: VerificationStatus;
}

/**
 * DTO for verification result
 */
export interface VerificationResult {
  success: boolean;
  status: VerificationStatus;
  error?: string;
  metadata?: {
    repositoryName?: string;
    ownerName?: string;
    defaultBranch?: string;
    visibility?: 'public' | 'private';
    hasWebhooks?: boolean;
  };
}

/**
 * Safe version without sensitive data (for API responses)
 * 
 * This is what gets returned from API endpoints - tokens removed!
 */
export interface SafeSCMIntegration extends Omit<
  TenantSCMIntegration,
  'accessToken' | 'webhookSecret'
> {
  // Add computed fields
  hasValidToken?: boolean;
}

// ============================================================================
// Query Filters
// ============================================================================

export interface SCMIntegrationFilters {
  appId?: string;
  scmType?: SCMType;
  isActive?: boolean;
  verificationStatus?: VerificationStatus;
  owner?: string;
  repo?: string;
}

// ============================================================================
// GitHub Client Configuration (from integration)
// ============================================================================

/**
 * Configuration extracted from integration for GitHub client
 * Used to initialize Octokit (like OG Delivr)
 */
export interface GitHubClientConfig {
  token: string;          // Decrypted accessToken
  owner: string;          // GitHub org/username
  repo: string;           // Repository name
  sender?: string;        // senderLogin
}

