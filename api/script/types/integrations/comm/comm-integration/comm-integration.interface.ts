/**
 * Slack/Communication Integration TypeScript Definitions
 * 
 * Defines interfaces and enums for communication platform integrations
 * Matches the tenant_communication_integrations table schema
 */

// ============================================================================
// Enums
// ============================================================================

export enum CommunicationType {
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
  DISCORD = 'DISCORD'
}

export enum VerificationStatus {
  PENDING = 'PENDING',   // Not yet verified
  VALID = 'VALID',       // Successfully verified
  INVALID = 'INVALID'    // Verification failed
}

// ============================================================================
// Slack-specific Types
// ============================================================================

/**
 * Slack Channel structure (stored in JSON field)
 */
export interface SlackChannel {
  id: string;              // Channel ID (e.g., C01234ABCDE)
  name: string;            // Channel name (e.g., "releases")
}

// ============================================================================
// Main Interface (matches DB schema)
// ============================================================================

export interface TenantCommunicationIntegration {
  id: string;
  tenantId: string;
  
  // Communication platform type
  communicationType: CommunicationType;
  
  // Slack configuration
  slackBotToken?: string | null;                 // Bot Token (xoxb-...) - encrypted in DB
  slackBotUserId?: string | null;        // Bot User ID
  slackWorkspaceId?: string | null;      // Workspace/Team ID
  slackWorkspaceName?: string | null;    // Workspace Name
  
  // Verification status
  verificationStatus: VerificationStatus;
  
  // Metadata
  createdByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Alias for convenience (Slack-specific)
export type TenantSlackIntegration = TenantCommunicationIntegration;

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a new Slack integration
 */
export interface CreateSlackIntegrationDto {
  tenantId: string;
  communicationType?: CommunicationType;  // Defaults to SLACK
  createdByAccountId?: string | null;
  
  // Slack fields (required)
  slackBotToken: string;                  // Will be encrypted before storage
  slackBotUserId?: string;
  slackWorkspaceId?: string;
  slackWorkspaceName?: string;
}

/**
 * DTO for updating an existing Slack integration
 */
export interface UpdateSlackIntegrationDto {
  slackBotToken?: string;                 // Will be encrypted before storage
  slackBotUserId?: string;
  slackWorkspaceId?: string;
  slackWorkspaceName?: string;
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
    workspaceId?: string;
    workspaceName?: string;
    botUserId?: string;
    botUsername?: string;
  };
}

/**
 * Safe version without sensitive data (for API responses)
 * 
 * This is what gets returned from API endpoints - tokens removed!
 */
export type SafeSlackIntegration = Omit<
  TenantCommunicationIntegration,
  'slackBotToken'
>;

// ============================================================================
// Query Filters
// ============================================================================

export interface SlackIntegrationFilters {
  tenantId?: string;
  communicationType?: CommunicationType;
  verificationStatus?: VerificationStatus;
  workspaceId?: string;
}

// ============================================================================
// Slack Client Configuration
// ============================================================================

/**
 * Configuration extracted from integration for Slack client
 * Used to initialize Slack WebClient
 */
export interface SlackClientConfig {
  token: string;              // Decrypted botToken
  workspaceId?: string;       // Workspace ID
  botUserId?: string;         // Bot User ID
}

// ============================================================================
// Channel Configuration Types (tenant_comm_channels table)
// ============================================================================

/**
 * Stage-to-channels mapping structure
 * 
 * Example:
 * {
 *   "development": [
 *     { "id": "C01234ABCDE", "name": "dev-releases" },
 *     { "id": "C11111AAAAA", "name": "dev-notifications" }
 *   ],
 *   "staging": [
 *     { "id": "C22222BBBBB", "name": "staging-releases" }
 *   ],
 *   "production": [
 *     { "id": "C33333CCCCC", "name": "prod-releases" },
 *     { "id": "C44444DDDDD", "name": "prod-notifications" }
 *   ]
 * }
 */
export interface StageChannelMapping {
  [stageName: string]: SlackChannel[];  // stage name -> array of channel objects
}

/**
 * Tenant Communication Channels (matches slack_configuration table)
 */
export interface TenantCommChannel {
  id: string;                         // nanoid (21 chars)
  integrationId: string;              // FK to tenant_comm_integrations
  tenantId: string;                   // FK to tenants (denormalized)
  channelData: StageChannelMapping;   // Stage-based channel mapping
  createdAt: Date;
  updatedAt: Date;
}

