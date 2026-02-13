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
 * Additional details for validation errors
 */
export type ValidationResultDetails = {
  errorCode?: string;
  message?: string;
  [key: string]: unknown;
};

/**
 * Validation result with detailed error information
 */
export type ValidationResult = {
  isValid: boolean;
  message: string;
  details?: ValidationResultDetails;
};

/**
 * Main provider interface
 * All project management providers must implement this
 */
export interface IProjectManagementProvider {
  readonly providerType: ProjectManagementProviderType;

  /**
   * Validate provider configuration (credentials, connectivity)
   * Returns ValidationResult with detailed error information
   */
  validateConfig(
    config: ProjectManagementIntegrationConfig
  ): Promise<ValidationResult>;

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
   * Get the URL for a ticket
   */
  getTicketUrl(
    config: ProjectManagementIntegrationConfig,
    ticketKey: string
  ): Promise<string>;

  /**
   * Get available projects (for UI dropdown)
   */
  getProjects?(
    config: ProjectManagementIntegrationConfig
  ): Promise<Array<{ key: string; name: string }>>;
}

