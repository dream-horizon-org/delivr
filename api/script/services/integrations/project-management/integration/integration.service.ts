import type { ProjectManagementIntegrationRepository } from '~models/integrations/project-management';
import type {
  CreateProjectManagementIntegrationDto,
  ProjectManagementIntegration,
  UpdateProjectManagementIntegrationDto,
  VerifyProjectManagementIntegrationResult
} from '~types/integrations/project-management';
import { VerificationStatus } from '~types/integrations/project-management';
import { PROJECT_MANAGEMENT_ERROR_MESSAGES } from '../constants';
import { ProviderFactory } from '../providers/provider.factory';

/**
 * Project Management Integration Service
 *
 * Responsibilities:
 * - Manage project management integration credentials (CRUD)
 * - Verify integration connectivity
 *
 * This service manages the credentials needed to connect to
 * external project management providers (JIRA, Linear, Asana, etc.)
 */
export class ProjectManagementIntegrationService {
  constructor(private readonly repository: ProjectManagementIntegrationRepository) {}

  /**
   * Create a new project integration
   * Note: Does not validate connectivity - use verify endpoint for that
   */
  async createIntegration(
    data: CreateProjectManagementIntegrationDto
  ): Promise<ProjectManagementIntegration> {
    // Just create the integration - validation happens via verify endpoint
    // This allows users to save configs and test them later
    return await this.repository.create(data);
  }

  /**
   * List all integrations for a project
   */
  async listIntegrations(projectId: string): Promise<ProjectManagementIntegration[]> {
    return await this.repository.findAll({ projectId });
  }

  /**
   * Get a specific integration by ID
   */
  async getIntegration(integrationId: string): Promise<ProjectManagementIntegration | null> {
    return await this.repository.findById(integrationId);
  }

  /**
   * Update an existing integration
   */
  async updateIntegration(
    integrationId: string,
    data: UpdateProjectManagementIntegrationDto
  ): Promise<ProjectManagementIntegration | null> {
    // If config is being updated, validate it
    const configIsBeingUpdated = data.config !== undefined;

    if (configIsBeingUpdated) {
      const integration = await this.repository.findById(integrationId);

      if (!integration) {
        return null;
      }

      // Merge config to get final config for validation
      const mergedConfig = {
        ...integration.config,
        ...data.config
      };

      // Validate merged config
      const provider = ProviderFactory.getProvider(integration.providerType);
      const isValidConfig = await provider.validateConfig(mergedConfig);

      if (!isValidConfig) {
        throw new Error(PROJECT_MANAGEMENT_ERROR_MESSAGES.INVALID_CONFIG);
      }
    }

    return await this.repository.update(integrationId, data);
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(integrationId: string): Promise<boolean> {
    return await this.repository.delete(integrationId);
  }

  /**
   * Verify an integration by testing connectivity
   */
  async verifyIntegration(
    integrationId: string
  ): Promise<VerifyProjectManagementIntegrationResult> {
    const integration = await this.repository.findById(integrationId);

    if (!integration) {
      return {
        success: false,
        status: VerificationStatus.INVALID,
        message: PROJECT_MANAGEMENT_ERROR_MESSAGES.INTEGRATION_NOT_FOUND
      };
    }

    try {
      const provider = ProviderFactory.getProvider(integration.providerType);
      const isValid = await provider.validateConfig(integration.config);

      const status = isValid ? VerificationStatus.VALID : VerificationStatus.INVALID;

      // Update verification status in DB
      await this.repository.updateVerificationStatus(integrationId, status);

      return {
        success: isValid,
        status,
        message: isValid
          ? 'Integration verified successfully'
          : 'Failed to verify integration'
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      // Update verification status to INVALID
      await this.repository.updateVerificationStatus(integrationId, VerificationStatus.INVALID);

      return {
        success: false,
        status: VerificationStatus.INVALID,
        message: errorMessage,
        error: errorMessage
      };
    }
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(): Promise<string[]> {
    return ProviderFactory.getSupportedProviders();
  }
}

