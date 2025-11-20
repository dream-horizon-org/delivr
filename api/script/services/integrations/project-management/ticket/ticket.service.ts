/**
 * Project Management Ticket Service
 *
 * STATELESS - Does not store tickets!
 * Just creates tickets via provider and returns results.
 * Release management team handles storage if needed.
 */

import type {
  ProjectManagementConfigRepository,
  ProjectManagementIntegrationRepository
} from '~models/integrations/project-management';
import type {
  CreateTicketsRequest,
  CreateTicketsResponse,
  CheckTicketStatusResult,
  Platform
} from '~types/integrations/project-management';
import { PROJECT_MANAGEMENT_ERROR_MESSAGES } from '../constants';
import { ProviderFactory } from '../providers';

export class ProjectManagementTicketService {
  constructor(
    private readonly configRepo: ProjectManagementConfigRepository,
    private readonly integrationRepo: ProjectManagementIntegrationRepository
    // NO ticket repository - stateless!
  ) {}

  /**
   * Create tickets for specified platforms
   * Returns ticket info WITHOUT storing it
   */
  async createTickets(request: CreateTicketsRequest): Promise<CreateTicketsResponse> {
    const { pmConfigId, tickets } = request;

    // 1. Fetch configuration
    const config = await this.configRepo.findById(pmConfigId);

    if (!config) {
      throw new Error(`${PROJECT_MANAGEMENT_ERROR_MESSAGES.CONFIG_NOT_FOUND}: ${pmConfigId}`);
    }

    const configIsNotActive = !config.isActive;

    if (configIsNotActive) {
      throw new Error('Configuration is not active');
    }

    // 2. Fetch integration (credentials)
    const integration = await this.integrationRepo.findById(config.integrationId);

    if (!integration) {
      throw new Error(
        `${PROJECT_MANAGEMENT_ERROR_MESSAGES.INTEGRATION_NOT_FOUND}: ${config.integrationId}`
      );
    }

    const integrationIsNotEnabled = !integration.isEnabled;

    if (integrationIsNotEnabled) {
      throw new Error('Integration is not enabled');
    }

    // 3. Get provider
    const provider = ProviderFactory.getProvider(integration.providerType);

    // 4. Create tickets for each platform (in parallel)
    const results: CreateTicketsResponse = {} as CreateTicketsResponse;

    await Promise.all(
      tickets.map(async (ticketRequest) => {
        try {
          const platformConfig = config.platformConfigurations.find(
            (pc) => pc.platform === ticketRequest.platform
          );

          if (!platformConfig) {
            results[ticketRequest.platform] = {
              success: false,
              error: `No configuration found for platform: ${ticketRequest.platform}`
            };
            return;
          }

          // Create ticket via provider
          const ticket = await provider.createTicket(integration.config, {
            projectKey: platformConfig.parameters.projectKey,
            title: ticketRequest.title,
            description: ticketRequest.description,
            issueType: platformConfig.parameters.issueType ?? 'Task',
            priority: platformConfig.parameters.priority,
            labels: platformConfig.parameters.labels,
            assignee: platformConfig.parameters.assignee
          });

          // Return ticket info (no DB storage!)
          results[ticketRequest.platform] = {
            success: true,
            ticketKey: ticket.ticketKey,
            ticketId: ticket.ticketId,
            ticketUrl: ticket.ticketUrl,
            projectKey: platformConfig.parameters.projectKey,
            completedStatus: platformConfig.parameters.completedStatus
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results[ticketRequest.platform] = {
            success: false,
            error: errorMessage
          };
        }
      })
    );

    return results;
  }

  /**
   * Check ticket status (optional helper)
   * Useful for release management to check if ticket is completed
   */
  async checkTicketStatus(
    pmConfigId: string,
    platform: Platform,
    ticketKey: string
  ): Promise<CheckTicketStatusResult> {
    const config = await this.configRepo.findById(pmConfigId);

    if (!config) {
      throw new Error(`${PROJECT_MANAGEMENT_ERROR_MESSAGES.CONFIG_NOT_FOUND}: ${pmConfigId}`);
    }

    const integration = await this.integrationRepo.findById(config.integrationId);

    if (!integration) {
      throw new Error(
        `${PROJECT_MANAGEMENT_ERROR_MESSAGES.INTEGRATION_NOT_FOUND}: ${config.integrationId}`
      );
    }

    const platformConfig = config.platformConfigurations.find((pc) => pc.platform === platform);

    if (!platformConfig) {
      throw new Error(`No configuration found for platform: ${platform}`);
    }

    const provider = ProviderFactory.getProvider(integration.providerType);
    const statusResult = await provider.getTicketStatus(integration.config, ticketKey);

    const isCompleted = await provider.isTicketCompleted(
      integration.config,
      ticketKey,
      platformConfig.parameters.completedStatus
    );

    const completedMessage = `✅ Ticket ${ticketKey} is completed.`;
    const notCompletedMessage = `⏳ Ticket ${ticketKey} is not completed. Current: "${statusResult.status}", required: "${platformConfig.parameters.completedStatus}".`;

    return {
      ticketKey,
      currentStatus: statusResult.status,
      completedStatus: platformConfig.parameters.completedStatus,
      isCompleted,
      message: isCompleted ? completedMessage : notCompletedMessage
    };
  }
}

