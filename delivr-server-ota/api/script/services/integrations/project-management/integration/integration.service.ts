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
   * VALIDATES credentials before saving to prevent broken integrations
   */
  async createIntegration(
    data: CreateProjectManagementIntegrationDto
  ): Promise<ProjectManagementIntegration> {
    // Validate credentials before saving
    const provider = ProviderFactory.getProvider(data.providerType);
    const validationResult = await provider.validateConfig(data.config);
    
    if (!validationResult.isValid) {
      const error = new Error(validationResult.message) as Error & { 
        details?: { errorCode?: string; message?: string; [key: string]: unknown };
      };
      error.details = validationResult.details;
      throw error;
    }
    
    // Create integration with VALID status since we validated before creating
    return await this.repository.create(data, VerificationStatus.VALID);
  }

  /**
   * List all integrations for a tenant
   */
  async listIntegrations(tenantId: string): Promise<ProjectManagementIntegration[]> {
    return await this.repository.findAll({ tenantId });
  }

  /**
   * Get a specific integration by ID
   */
  async getIntegration(integrationId: string): Promise<ProjectManagementIntegration | null> {
    return await this.repository.findById(integrationId);
  }

  /**
   * Update an existing integration
   * VALIDATES credentials if config is being updated
   * Supports partial updates - only provided fields are updated
   */
  async updateIntegration(
    integrationId: string,
    data: UpdateProjectManagementIntegrationDto
  ): Promise<ProjectManagementIntegration | null> {
    const configIsBeingUpdated = data.config !== undefined;

    if (configIsBeingUpdated) {
      const integration = await this.repository.findById(integrationId);

      if (!integration) {
        return null;
      }

      // Merge partial config with existing config
      const mergedConfig = {
        ...integration.config,
        ...data.config
      };

      // ALWAYS validate the merged config when config is being updated
      // This ensures users can't save broken credentials (wrong baseUrl, email, token, etc.)
      const provider = ProviderFactory.getProvider(integration.providerType);
      const validationResult = await provider.validateConfig(mergedConfig);

      if (!validationResult.isValid) {
        const error = new Error(validationResult.message) as Error & { 
          details?: { errorCode?: string; message?: string; [key: string]: unknown };
        };
        error.details = validationResult.details;
        throw error;
      }
    }

    // Credentials are valid (or not being updated) - save the changes
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
      const validationResult = await provider.validateConfig(integration.config);

      const status = validationResult.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID;

      // Update verification status in DB
      await this.repository.updateVerificationStatus(integrationId, status);

      return {
        success: validationResult.isValid,
        status,
        message: validationResult.message,
        ...(validationResult.details && { details: validationResult.details })
      };
    } catch (error: unknown) {
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

