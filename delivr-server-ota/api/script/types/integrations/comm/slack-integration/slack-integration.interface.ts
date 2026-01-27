/**
 * Slack Integration Types
 * DTOs and interfaces for Slack integration operations
 */

/**
 * DTO for creating or updating Slack integration
 */
export type CreateOrUpdateIntegrationDto = {
  appId: string;
  data: {
    botToken: string;
    botUserId?: string;
    workspaceId?: string;
    workspaceName?: string;
  };
};

/**
 * DTO for updating integration data
 */
export type UpdateIntegrationDataDto = {
  botToken?: string;
  botUserId?: string;
  workspaceId?: string;
  workspaceName?: string;
};

/**
 * Result of create or update operation
 */
export type CreateOrUpdateIntegrationResult = {
  integration: any; // Will be SafeSlackIntegration from storage types
  isNew: boolean;
};

