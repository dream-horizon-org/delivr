import type { Platform } from '../platform.interface';

/**
 * Platform-specific configuration parameters
 */
export type PlatformConfiguration = {
  platform: Platform;
  parameters: {
    projectKey: string; // JIRA project key, Linear team ID, etc.
    issueType?: string; // Epic, Story, Task, etc.
    completedStatus: string; // Status that indicates completion
    priority?: string; // High, Medium, Low
    labels?: string[]; // Custom labels
    assignee?: string; // Default assignee
    [key: string]: unknown; // Provider-specific additional fields
  };
};

/**
 * Main Configuration Entity
 */
export type ProjectManagementConfig = {
  id: string;
  projectId: string;
  integrationId: string;
  name: string;
  description: string | null;
  platformConfigurations: PlatformConfiguration[];
  isActive: boolean;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DTOs
 */
export type CreateProjectManagementConfigDto = {
  projectId: string;
  integrationId: string;
  name: string;
  description?: string;
  platformConfigurations: PlatformConfiguration[];
  createdByAccountId?: string;
};

export type UpdateProjectManagementConfigDto = {
  name?: string;
  description?: string;
  platformConfigurations?: PlatformConfiguration[];
  isActive?: boolean;
};

export type VerifyProjectManagementConfigResult = {
  success: boolean;
  valid: boolean;
  configurationId: string;
  configurationName: string;
  results: Record<
    Platform,
    {
      valid: boolean;
      projectKey: string;
      message?: string;
      error?: string;
    }
  >;
};

