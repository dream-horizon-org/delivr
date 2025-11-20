/**
 * JIRA Integration TypeScript Definitions
 * 
 * Defines interfaces and enums for JIRA integrations with separated credentials and configurations
 * - jira_integrations: Stores credentials (one per tenant)
 * - jira_configurations: Stores reusable configs (many per tenant)
 * - release_jira_epics: Links releases to configurations
 */

// ============================================================================
// Enums
// ============================================================================

export enum JiraIntegrationType {
  JIRA_CLOUD = 'JIRA_CLOUD',         // Atlassian Cloud (*.atlassian.net)
  JIRA_SERVER = 'JIRA_SERVER',       // Self-hosted JIRA
  JIRA_DATA_CENTER = 'JIRA_DATA_CENTER'  // JIRA Data Center
}

export enum JiraVerificationStatus {
  NOT_VERIFIED = 'NOT_VERIFIED',   // Not yet verified
  VALID = 'VALID',                 // Successfully verified
  INVALID = 'INVALID',             // Verification failed
  EXPIRED = 'EXPIRED'              // Token/credentials expired
}

// ============================================================================
// JIRA INTEGRATIONS (Credentials Table)
// ============================================================================

/**
 * JIRA Integration - Stores credentials in jira_integrations table
 * One integration per tenant
 */
export interface JiraIntegration {
  id: string;
  tenantId: string;
  
  // Connection details
  jiraInstanceUrl: string;          // e.g., 'https://company.atlassian.net'
  apiToken: string;                 // Encrypted API token or password
  email?: string;                   // Email for Jira Cloud auth
  jiraType: JiraIntegrationType;    // Cloud, Server, or Data Center
  
  // Status
  isEnabled: boolean;
  verificationStatus: JiraVerificationStatus;
  lastVerifiedAt?: Date | null;
  
  // Metadata
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Safe version of JiraIntegration (without sensitive tokens)
 */
export interface SafeJiraIntegration {
  id: string;
  tenantId: string;
  jiraInstanceUrl: string;
  email?: string;
  jiraType: JiraIntegrationType;
  isEnabled: boolean;
  verificationStatus: JiraVerificationStatus;
  lastVerifiedAt?: Date | null;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
  hasValidToken?: boolean;
}

/**
 * DTO for creating a new JIRA integration
 */
export interface CreateJiraIntegrationDto {
  tenantId: string;
  jiraInstanceUrl: string;
  apiToken: string;                 // Will be encrypted before storage
  email?: string;
  jiraType?: JiraIntegrationType;   // Defaults to JIRA_CLOUD
  isEnabled?: boolean;              // Defaults to true
  createdByAccountId: string;
}

/**
 * DTO for updating an existing JIRA integration
 */
export interface UpdateJiraIntegrationDto {
  jiraInstanceUrl?: string;
  apiToken?: string;                // Will be encrypted before storage
  email?: string;
  jiraType?: JiraIntegrationType;
  isEnabled?: boolean;
}

// ============================================================================
// JIRA CONFIGURATIONS (Reusable Configs Table)
// ============================================================================

/**
 * Platform-specific Jira configuration
 * Stored as JSON in jira_configurations.platformsConfig
 */
export interface PlatformJiraConfig {
  projectKey: string;               // Jira project key (e.g., "FE", "MOBILE")
  readyToReleaseState: string;      // State that indicates ready (e.g., "Done", "Ready for Production")
}

/**
 * Platforms configuration map
 * Structure: {"WEB": {...}, "IOS": {...}, "ANDROID": {...}}
 */
export interface PlatformsConfigMap {
  WEB?: PlatformJiraConfig;
  IOS?: PlatformJiraConfig;
  ANDROID?: PlatformJiraConfig;
}

/**
 * JIRA Configuration - Stores reusable configs in jira_configurations table
 * Multiple configurations per tenant allowed
 */
export interface JiraConfiguration {
  id: string;
  tenantId: string;
  
  // Configuration details
  configName: string;               // e.g., "Frontend Release Config"
  description?: string;
  
  // Platform-specific settings (stored as JSON)
  platformsConfig: PlatformsConfigMap;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a new JIRA configuration
 */
export interface CreateJiraConfigurationDto {
  tenantId: string;
  configName: string;
  description?: string;
  platformsConfig: PlatformsConfigMap;
  createdByAccountId: string;
}

/**
 * DTO for updating an existing JIRA configuration
 */
export interface UpdateJiraConfigurationDto {
  configName?: string;
  description?: string;
  platformsConfig?: PlatformsConfigMap;
  isActive?: boolean;
}

// ============================================================================
// Query Filters
// ============================================================================

export interface JiraIntegrationFilters {
  tenantId?: string;
  isEnabled?: boolean;
  verificationStatus?: JiraVerificationStatus;
  jiraType?: JiraIntegrationType;
}

export interface JiraConfigurationFilters {
  tenantId?: string;
  isActive?: boolean;
  configName?: string;
}

// ============================================================================
// JIRA Verification
// ============================================================================

/**
 * DTO for verification result (future use if we add API validation)
 */
export interface JiraVerificationResult {
  success: boolean;
  status: JiraVerificationStatus;
  error?: string;
  metadata?: {
    serverInfo?: {
      version?: string;
      serverTitle?: string;
    };
    projects?: Array<{
      key: string;
      name: string;
    }>;
  };
}

// ============================================================================
// JIRA Link Generation
// ============================================================================

/**
 * Parameters for generating JIRA links
 */
export interface JiraLinkParams {
  baseUrl: string;              // JIRA instance URL
  projectKey?: string;          // Project key (e.g., 'FE', 'PROJ')
  epicId?: string;              // Epic ID (numeric or with prefix)
  ticketKey?: string;           // Full ticket key (e.g., 'FE-1234')
}

/**
 * Generated JIRA links for a release
 */
export interface ReleaseJiraLinks {
  webEpicUrl?: string | null;
  iOSEpicUrl?: string | null;
  playStoreEpicUrl?: string | null;
}

// ============================================================================
// JIRA EPIC MANAGEMENT
// ============================================================================

/**
 * Epic creation status enum
 */
export enum EpicCreationStatus {
  PENDING = 'PENDING',
  CREATING = 'CREATING',
  CREATED = 'CREATED',
  FAILED = 'FAILED'
}

/**
 * Epic platform enum
 */
export enum EpicPlatform {
  WEB = 'WEB',
  IOS = 'IOS',
  ANDROID = 'ANDROID'
}

/**
 * Release Jira Epic - Stored in release_jira_epics table
 * Represents an epic associated with a release
 * 
 * IMPORTANT: This now references jira_configurations table via jiraConfigId
 * The projectKey and readyToReleaseState are resolved from the configuration
 */
export interface ReleaseJiraEpic {
  id: string;
  releaseId: string;
  platform: EpicPlatform;
  
  // Reference to configuration (contains project key and ready state)
  jiraConfigId: string;
  
  // Epic details
  epicTitle: string;
  epicDescription?: string;
  
  // Jira API response
  jiraEpicKey?: string;
  jiraEpicId?: string;
  jiraEpicUrl?: string;
  
  // Status tracking
  creationStatus: EpicCreationStatus;
  creationError?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  jiraCreatedAt?: Date;
}

/**
 * DTO for creating a single epic
 */
export interface CreateEpicDto {
  releaseId: string;
  platform: EpicPlatform;
  jiraConfigId: string;             // Reference to jira_configurations
  epicTitle: string;
  epicDescription?: string;
}

/**
 * DTO for creating epics for a release
 * 
 * This uses a jiraConfigId to reference the configuration,
 * which contains the platform-specific project keys and ready states
 */
export interface CreateEpicsForReleaseDto {
  releaseId: string;
  tenantId: string;
  jiraConfigId: string;             // Which configuration to use
  version: string;
  description?: string;
  platforms: EpicPlatform[];
  autoCreateEpics: boolean;
}

/**
 * Jira API request for creating an epic
 */
export interface JiraEpicCreateRequest {
  fields: {
    project: { key: string };
    summary: string;
    description?: any;
    issuetype: { name: string };
    [key: string]: any;
  };
}

/**
 * Jira API response for created epic
 */
export interface JiraEpicCreateResponse {
  id: string;
  key: string;
  self: string;
}

/**
 * Jira Epic Status Check Response
 */
export interface JiraEpicStatusCheckResponse {
  approved: boolean;
  currentStatus: string;
  requiredStatus: string;
  epicKey: string;
  epicUrl?: string;
  message: string;
}

/**
 * Jira Issue Status (from Jira API)
 */
export interface JiraIssueStatus {
  id: string;
  name: string;
  description?: string;
  statusCategory?: {
    id: number;
    key: string;
    name: string;
  };
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Resolved platform configuration
 * Combines config with platform-specific settings
 */
export interface ResolvedPlatformConfig {
  configId: string;
  configName: string;
  platform: EpicPlatform;
  projectKey: string;
  readyToReleaseState: string;
}
