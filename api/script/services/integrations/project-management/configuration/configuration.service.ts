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
  ValidateProjectManagementConfigResult,
  ValidationError,
  VerifyProjectManagementConfigResult
} from '~types/integrations/project-management';
import { Platform, PLATFORMS } from '~types/integrations/project-management';
import { PROJECT_MANAGEMENT_ERROR_MESSAGES } from '../constants';
import { ProviderFactory } from '../providers';

export class ProjectManagementConfigService {
  constructor(
    private readonly configRepo: ProjectManagementConfigRepository,
    private readonly integrationRepo: ProjectManagementIntegrationRepository
  ) {}

  /**
   * Validate project management config data
   * @returns Validation result with isValid flag and error details
   */
  validateConfig(data: CreateProjectManagementConfigDto): ValidateProjectManagementConfigResult {
    const errors: ValidationError[] = [];

    // Validate projectId
    if (!data.projectId || data.projectId.trim() === '') {
      errors.push({
        field: 'projectId',
        message: 'Project ID is required and cannot be empty'
      });
    }

    // Validate integrationId
    if (!data.integrationId || data.integrationId.trim() === '') {
      errors.push({
        field: 'integrationId',
        message: 'Integration ID is required and cannot be empty'
      });
    }

    // Validate name
    if (!data.name || data.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Name is required and cannot be empty'
      });
    } else if (data.name.length > 255) {
      errors.push({
        field: 'name',
        message: 'Name must not exceed 255 characters'
      });
    } else if (data.name.length < 3) {
      errors.push({
        field: 'name',
        message: 'Name must be at least 3 characters long'
      });
    }

    // Validate description length if provided
    if (data.description && data.description.length > 10000) {
      errors.push({
        field: 'description',
        message: 'Description must not exceed 10000 characters'
      });
    }

    // Validate platformConfigurations array
    if (!data.platformConfigurations || !Array.isArray(data.platformConfigurations)) {
      errors.push({
        field: 'platformConfigurations',
        message: 'Platform configurations must be a non-empty array'
      });
    } else if (data.platformConfigurations.length === 0) {
      errors.push({
        field: 'platformConfigurations',
        message: 'Platform configurations must contain at least one configuration'
      });
    } else {
      // Validate each platform configuration
      const seenPlatforms = new Set<string>();

      data.platformConfigurations.forEach((config, index) => {
        // Validate platform
        if (!config.platform || config.platform.trim() === '') {
          errors.push({
            field: `platformConfigurations[${index}].platform`,
            message: 'Platform is required and cannot be empty'
          });
        } else if (!PLATFORMS.includes(config.platform as Platform)) {
          errors.push({
            field: `platformConfigurations[${index}].platform`,
            message: `Platform "${config.platform}" is not valid. Must be one of: ${PLATFORMS.join(', ')}`
          });
        } else {
          // Check for duplicate platforms
          if (seenPlatforms.has(config.platform)) {
            errors.push({
              field: `platformConfigurations[${index}].platform`,
              message: `Duplicate platform "${config.platform}". Each platform must be unique`
            });
          }
          seenPlatforms.add(config.platform);
        }

        // Validate parameters
        if (!config.parameters) {
          errors.push({
            field: `platformConfigurations[${index}].parameters`,
            message: 'Parameters object is required'
          });
        } else {
          // Validate projectKey
          if (!config.parameters.projectKey || config.parameters.projectKey.trim() === '') {
            errors.push({
              field: `platformConfigurations[${index}].parameters.projectKey`,
              message: 'Project key is required and cannot be empty'
            });
          } else {
            const projectKey = config.parameters.projectKey.trim();

            // Jira project key validation rules:
            // - Must be 2-10 characters long
            // - Must start with a letter
            // - Can only contain uppercase letters, numbers, and underscores
            // - Cannot contain spaces or special characters
            const projectKeyRegex = /^[A-Z][A-Z0-9_]{1,9}$/;

            if (!projectKeyRegex.test(projectKey)) {
              errors.push({
                field: `platformConfigurations[${index}].parameters.projectKey`,
                message: `Project key "${projectKey}" is invalid. Must be 2-10 characters, start with an uppercase letter, and contain only uppercase letters, numbers, and underscores`
              });
            }
          }

          // Validate completedStatus
          if (!config.parameters.completedStatus || config.parameters.completedStatus.trim() === '') {
            errors.push({
              field: `platformConfigurations[${index}].parameters.completedStatus`,
              message: 'Completed status is required and cannot be empty'
            });
          }

          // Validate issueType if provided
          if (config.parameters.issueType && config.parameters.issueType.trim() === '') {
            errors.push({
              field: `platformConfigurations[${index}].parameters.issueType`,
              message: 'Issue type cannot be an empty string if provided'
            });
          }
          /*
          // Validate priority if provided
          if (config.parameters.priority && config.parameters.priority.trim() === '') {
            errors.push({
              field: `platformConfigurations[${index}].parameters.priority`,
              message: 'Priority cannot be an empty string if provided'
            });
          }

          // Validate assignee if provided
          if (config.parameters.assignee && config.parameters.assignee.trim() === '') {
            errors.push({
              field: `platformConfigurations[${index}].parameters.assignee`,
              message: 'Assignee cannot be an empty string if provided'
            });
          }

          // Validate labels array if provided
          if (config.parameters.labels) {
            if (!Array.isArray(config.parameters.labels)) {
              errors.push({
                field: `platformConfigurations[${index}].parameters.labels`,
                message: 'Labels must be an array if provided'
              });
            } else {
              config.parameters.labels.forEach((label, labelIndex) => {
                if (typeof label !== 'string' || label.trim() === '') {
                  errors.push({
                    field: `platformConfigurations[${index}].parameters.labels[${labelIndex}]`,
                    message: 'Label must be a non-empty string'
                  });
                }
              });
            }
          }
          */
        }
      });
    }

    return {
      integration: 'projectManagement',
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create project management config
   */
  async createConfig(data: CreateProjectManagementConfigDto): Promise<ProjectManagementConfig> {
    // Validate input data
    const validationResult = this.validateConfig(data);

    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }

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

