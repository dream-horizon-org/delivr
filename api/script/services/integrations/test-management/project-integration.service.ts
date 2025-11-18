import { TEST_MANAGEMENT_ERROR_MESSAGES } from '~controllers/integrations/test-management/constants';
import type { ProjectTestManagementIntegrationRepository } from '~models/integrations/test-management/project-integration/project-integration.repository';
import type {
  CreateProjectTestManagementIntegrationDto,
  ProjectTestManagementIntegration,
  UpdateProjectTestManagementIntegrationDto,
  VerifyProjectTestManagementIntegrationResult
} from '~types/integrations/test-management/project-integration';
import { ProviderFactory } from './providers/provider.factory';

/**
 * Test Management Integration Service
 * 
 * Responsibilities:
 * - Manage test management integration credentials (CRUD)
 * - Verify integration connectivity
 * 
 * This service manages the credentials needed to connect to
 * external test management providers (Checkmate, TestRail, etc.)
 */
export class TestManagementIntegrationService {
  constructor(
    private readonly repository: ProjectTestManagementIntegrationRepository
  ) {}

  /**
   * Create a new project integration
   */
  async createProjectIntegration(
    data: CreateProjectTestManagementIntegrationDto
  ): Promise<ProjectTestManagementIntegration> {
    // Validate config structure before creating
    const provider = ProviderFactory.getProvider(data.providerType);
    const isValidConfig = await provider.validateConfig(data.config);
    
    if (!isValidConfig) {
      throw new Error(TEST_MANAGEMENT_ERROR_MESSAGES.INVALID_CONFIG);
    }
    
    return await this.repository.create(data);
  }

  /**
   * List all integrations for a project
   */
  async listProjectIntegrations(projectId: string): Promise<ProjectTestManagementIntegration[]> {
    return await this.repository.findAll({ projectId });
  }

  /**
   * Get a specific integration by ID
   */
  async getProjectIntegration(integrationId: string): Promise<ProjectTestManagementIntegration | null> {
    return await this.repository.findById(integrationId);
  }

  /**
   * Update an existing integration
   */
  async updateProjectIntegration(
    integrationId: string,
    data: UpdateProjectTestManagementIntegrationDto
  ): Promise<ProjectTestManagementIntegration | null> {
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
        throw new Error(TEST_MANAGEMENT_ERROR_MESSAGES.INVALID_CONFIG);
      }
    }
    
    return await this.repository.update(integrationId, data);
  }

  /**
   * Delete an integration
   */
  async deleteProjectIntegration(integrationId: string): Promise<boolean> {
    return await this.repository.delete(integrationId);
  }

  /**
   * Verify an integration by testing connectivity
   */
  async verifyProjectIntegration(
    integrationId: string
  ): Promise<VerifyProjectTestManagementIntegrationResult> {
    const integration = await this.repository.findById(integrationId);
    
    if (!integration) {
      return {
        success: false,
        status: 'ERROR',
        message: 'Integration not found'
      };
    }

    try {
      const provider = ProviderFactory.getProvider(integration.providerType);
      const isValid = await provider.validateConfig(integration.config);
      
      return {
        success: isValid,
        status: isValid ? 'VALID' : 'INVALID',
        message: isValid 
          ? 'Integration verified successfully'
          : 'Failed to verify integration'
      };
    } catch (error) {
      return {
        success: false,
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

