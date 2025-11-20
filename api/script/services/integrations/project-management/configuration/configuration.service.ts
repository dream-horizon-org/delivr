/**
 * Project Management Config Service
 * Business logic for project management configurations
 */

import type {
  ProjectManagementConfigRepository,
  ProjectManagementIntegrationRepository
} from '~models/integrations/project-management';
import type {
  CreateProjectManagementConfigDto,
  ProjectManagementConfig,
  UpdateProjectManagementConfigDto,
  VerifyProjectManagementConfigResult
} from '~types/integrations/project-management';
import { PROJECT_MANAGEMENT_ERROR_MESSAGES } from '../constants';
import { ProviderFactory } from '../providers';

export class ProjectManagementConfigService {
  constructor(
    private readonly configRepo: ProjectManagementConfigRepository,
    private readonly integrationRepo: ProjectManagementIntegrationRepository
  ) {}

  /**
   * Create project management config
   */
  async createConfig(data: CreateProjectManagementConfigDto): Promise<ProjectManagementConfig> {
    const integration = await this.integrationRepo.findById(data.integrationId);

    if (!integration) {
      throw new Error(
        `${PROJECT_MANAGEMENT_ERROR_MESSAGES.INTEGRATION_NOT_FOUND}: ${data.integrationId}`
      );
    }

    const projectMatches = integration.projectId === data.projectId;

    if (!projectMatches) {
      throw new Error('Integration does not belong to the specified project');
    }

    // Validate platform configurations
    const platformConfigsPresent = data.platformConfigurations.length > 0;

    if (!platformConfigsPresent) {
      throw new Error(PROJECT_MANAGEMENT_ERROR_MESSAGES.INVALID_PLATFORM_CONFIG);
    }

    return this.configRepo.create(data);
  }

  /**
   * Get config by ID
   */
  async getConfigById(id: string): Promise<ProjectManagementConfig | null> {
    return this.configRepo.findById(id);
  }

  /**
   * List configs by project ID
   */
  async listConfigsByProject(projectId: string): Promise<ProjectManagementConfig[]> {
    return this.configRepo.findByProjectId(projectId);
  }

  /**
   * List configs by integration ID
   */
  async listConfigsByIntegration(integrationId: string): Promise<ProjectManagementConfig[]> {
    return this.configRepo.findByIntegrationId(integrationId);
  }

  /**
   * Update config
   */
  async updateConfig(
    id: string,
    data: UpdateProjectManagementConfigDto
  ): Promise<ProjectManagementConfig | null> {
    const config = await this.configRepo.findById(id);

    if (!config) {
      return null;
    }

    // Validate platform configurations if provided
    const platformConfigsBeingUpdated = data.platformConfigurations !== undefined;

    if (platformConfigsBeingUpdated) {
      const platformConfigsPresent = data.platformConfigurations.length > 0;

      if (!platformConfigsPresent) {
        throw new Error(PROJECT_MANAGEMENT_ERROR_MESSAGES.INVALID_PLATFORM_CONFIG);
      }
    }

    return this.configRepo.update(id, data);
  }

  /**
   * Delete config
   */
  async deleteConfig(id: string): Promise<boolean> {
    const config = await this.configRepo.findById(id);

    if (!config) {
      return false;
    }

    return this.configRepo.delete(id);
  }

  /**
   * Verify configuration by checking project keys exist
   */
  async verifyConfig(configId: string): Promise<VerifyProjectManagementConfigResult> {
    const config = await this.configRepo.findById(configId);

    if (!config) {
      throw new Error(PROJECT_MANAGEMENT_ERROR_MESSAGES.CONFIG_NOT_FOUND);
    }

    const integration = await this.integrationRepo.findById(config.integrationId);

    if (!integration) {
      throw new Error(PROJECT_MANAGEMENT_ERROR_MESSAGES.INTEGRATION_NOT_FOUND);
    }

    const provider = ProviderFactory.getProvider(integration.providerType);

    // Check if provider supports getProjects
    const supportsProjectLookup = provider.getProjects !== undefined;

    if (!supportsProjectLookup) {
      return {
        success: true,
        valid: true,
        configurationId: config.id,
        configurationName: config.name,
        results: {} as Record<string, { valid: boolean; projectKey: string }>
      };
    }

    const results: Record<string, { valid: boolean; projectKey: string; message?: string; error?: string }> = {};

    // Verify each platform configuration
    await Promise.all(
      config.platformConfigurations.map(async (platformConfig) => {
        try {
          const projects = await provider.getProjects!(integration.config);
          const projectExists = projects.some((p) => p.key === platformConfig.parameters.projectKey);

          results[platformConfig.platform] = {
            valid: projectExists,
            projectKey: platformConfig.parameters.projectKey,
            message: projectExists
              ? `Project key ${platformConfig.parameters.projectKey} is valid`
              : `Project key ${platformConfig.parameters.projectKey} not found`
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results[platformConfig.platform] = {
            valid: false,
            projectKey: platformConfig.parameters.projectKey,
            error: errorMessage
          };
        }
      })
    );

    const allValid = Object.values(results).every((r) => r.valid);

    return {
      success: true,
      valid: allValid,
      configurationId: config.id,
      configurationName: config.name,
      results: results as Record<string, { valid: boolean; projectKey: string }>
    };
  }
}

