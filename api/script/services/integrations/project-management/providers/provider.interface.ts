import type {
  ProjectManagementIntegrationConfig,
  ProjectManagementProviderType
} from '~types/integrations/project-management';

/**
 * Ticket creation parameters
 */
export type CreateTicketParams = {
  projectKey: string;
  title: string;
  description?: string;
  issueType?: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
  [key: string]: unknown;
};

/**
 * Ticket creation result
 */
export type TicketResult = {
  ticketKey: string;
  ticketId: string;
  ticketUrl: string;
};

/**
 * Ticket status result
 */
export type TicketStatusResult = {
  ticketKey: string;
  status: string;
  url: string;
};

/**
 * Main provider interface
 * All project management providers must implement this
 */
export interface IProjectManagementProvider {
  readonly providerType: ProjectManagementProviderType;

  /**
   * Validate provider configuration (credentials, connectivity)
   */
  validateConfig(config: ProjectManagementIntegrationConfig): Promise<boolean>;

  /**
   * Create a new ticket/issue
   */
  createTicket(
    config: ProjectManagementIntegrationConfig,
    params: CreateTicketParams
  ): Promise<TicketResult>;

  /**
   * Get ticket status
   */
  getTicketStatus(
    config: ProjectManagementIntegrationConfig,
    ticketKey: string
  ): Promise<TicketStatusResult>;

  /**
   * Check if ticket is in completed status
   */
  isTicketCompleted(
    config: ProjectManagementIntegrationConfig,
    ticketKey: string,
    completedStatus: string
  ): Promise<boolean>;

  /**
   * Get available projects (for UI dropdown)
   */
  getProjects?(
    config: ProjectManagementIntegrationConfig
  ): Promise<Array<{ key: string; name: string }>>;
}

