/**
 * Release Config Service
 * Business logic for release configurations
 */

import * as shortid from 'shortid';
import { ReleaseConfigRepository } from '~models/release-configs';
import type {
  CreateReleaseConfigDto,
  CreateReleaseConfigRequest,
  ReleaseConfiguration,
  UpdateReleaseConfigDto,
  UpdateReleaseConfigRequest,
  IntegrationValidationResult,
  ValidationResult,
  ServiceResult
} from '~types/release-configs';
import { hasAtLeastOneIntegration, validateScheduling } from './release-config.validation';
import { IntegrationConfigMapper } from './integration-config.mapper';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';
import type { CreateTestManagementConfigDto } from '~types/integrations/test-management/test-management-config';
import type { CICDConfigService } from '../integrations/ci-cd/config/config.service';
import type { SlackChannelConfigService } from '~services/integrations/comm/slack-channel-config';
import type { ProjectManagementConfigService } from '~services/integrations/project-management/configuration';

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-');

// ============================================================================
// INTEGRATION SERVICE INTERFACES
// ============================================================================

export class ReleaseConfigService {
  constructor(
    private readonly configRepo: ReleaseConfigRepository,
    private readonly cicdConfigService?: CICDConfigService,
    private readonly testManagementConfigService?: TestManagementConfigService,
    private readonly slackChannelConfigService?: SlackChannelConfigService,
    private readonly projectManagementConfigService?: ProjectManagementConfigService
  ) {}

  /**
   * Validate all integration configurations
   */
  private async validateAllIntegrations(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): Promise<ValidationResult> {
    const validationResults: IntegrationValidationResult[] = [];

    // Prepare all integration configs using mapper
    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(requestData, currentUserId);

    // Validate CI configuration
    if (integrationConfigs.ci && this.cicdConfigService?.validateConfig) {
      const ciValidation = await this.cicdConfigService.validateConfig({
        tenantId: requestData.tenantId,
        workflows: integrationConfigs.ci.workflows || [],
        createdByAccountId: currentUserId
      });
      validationResults.push(ciValidation);
    }

    // Validate Test Management configuration
    if (integrationConfigs.testManagement && this.testManagementConfigService?.validateConfig) {
      const testMgmtValidation = this.testManagementConfigService.validateConfig({
        tenantId: requestData.tenantId,
        integrationId: integrationConfigs.testManagement.integrationId || '',
        name: `Test Config for ${requestData.name}`,
        passThresholdPercent: integrationConfigs.testManagement.passThresholdPercent || 100,
        platformConfigurations: integrationConfigs.testManagement.platformConfigurations || [],
        createdByAccountId: currentUserId
      });
      validationResults.push(testMgmtValidation);
    }

    // Validate Communication configuration
    if (integrationConfigs.communication && this.slackChannelConfigService?.validateConfig) {
      const commValidation = this.slackChannelConfigService.validateConfig({
        tenantId: requestData.tenantId,
        channelData: integrationConfigs.communication.slack?.channels || {}
      });
      validationResults.push(commValidation);
    }

    // Validate Project Management configuration
    if (integrationConfigs.projectManagement && this.projectManagementConfigService?.validateConfig) {
      const pmValidation = this.projectManagementConfigService.validateConfig(integrationConfigs.projectManagement);
      validationResults.push(pmValidation);
    }

    // Validate scheduling configuration if provided
    if (requestData.scheduling) {
      const schedulingErrors = validateScheduling(requestData.scheduling);
      if (schedulingErrors.length > 0) {
        validationResults.push({
          integration: 'scheduling',
          isValid: false,
          errors: schedulingErrors
        });
      }
    }

    // Filter only invalid integrations
    const invalidIntegrations = validationResults.filter(result => !result.isValid);

    return {
      isValid: invalidIntegrations.length === 0,
      invalidIntegrations
    };
  }

  /**
   * Create integration configs and return their IDs
   */
  private async createIntegrationConfigs(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): Promise<Partial<CreateReleaseConfigDto>> {
    const integrationConfigIds: Partial<CreateReleaseConfigDto> = {};

    // Prepare all integration configs using mapper
    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(requestData, currentUserId);

    // Create CI config
    if (integrationConfigs.ci && this.cicdConfigService) {
      if (requestData.ciConfigId?.trim()) {
        integrationConfigIds.ciConfigId = requestData.ciConfigId;
        console.log('Reusing existing CI config:', integrationConfigIds.ciConfigId);
      } else {
        const ciResult = await this.cicdConfigService.createConfig({
          tenantId: requestData.tenantId,
          workflows: integrationConfigs.ci.workflows || [],
          createdByAccountId: currentUserId
        });
        integrationConfigIds.ciConfigId = ciResult.configId;
        console.log('Created new CI config:', integrationConfigIds.ciConfigId);
      }
    }

    // Create Test Management config
    if (integrationConfigs.testManagement && this.testManagementConfigService) {
      if (requestData.testManagement?.id?.trim()) {
        integrationConfigIds.testManagementConfigId = requestData.testManagement.id;
        console.log('Reusing existing TCM config:', integrationConfigIds.testManagementConfigId);
      } else {
        const tcmConfigDto: CreateTestManagementConfigDto = {
          tenantId: requestData.tenantId,
          name: requestData.testManagement?.name || `TCM Config for ${requestData.name}`,
          ...integrationConfigs.testManagement
        };
        const tcmConfig = await this.testManagementConfigService.createConfig(tcmConfigDto);
        integrationConfigIds.testManagementConfigId = tcmConfig.id;
        console.log('Created new TCM config:', integrationConfigIds.testManagementConfigId);
      }
    }

    // Create Communication config
    if (integrationConfigs.communication && this.slackChannelConfigService) {
      if (requestData.communication?.id?.trim()) {
        integrationConfigIds.commsConfigId = requestData.communication.id;
        console.log('Reusing existing Communication config:', integrationConfigIds.commsConfigId);
      } else {
        const commConfig = await this.slackChannelConfigService.createConfig({
          tenantId: requestData.tenantId,
          channelData: integrationConfigs.communication.slack?.channels || {}
        });
        integrationConfigIds.commsConfigId = commConfig.id;
        console.log('Created new Communication config:', integrationConfigIds.commsConfigId);
      }
    }

    // Create Project Management config
    if (integrationConfigs.projectManagement && this.projectManagementConfigService) {
      if (requestData.projectManagement?.id?.trim()) {
        integrationConfigIds.projectManagementConfigId = requestData.projectManagement.id;
        console.log('Reusing existing Project Management config:', integrationConfigIds.projectManagementConfigId);
      } else {
        const pmConfig = await this.projectManagementConfigService.createConfig({
          tenantId: requestData.tenantId,
          integrationId: integrationConfigs.projectManagement.integrationId || '',
          name: requestData.projectManagement?.name || `PM Config for ${requestData.name}`,
          description: requestData.projectManagement?.description || '',
          createdByAccountId: currentUserId,
          ...integrationConfigs.projectManagement
        });
        integrationConfigIds.projectManagementConfigId = pmConfig.id;
        console.log('Created new Project Management config:', integrationConfigIds.projectManagementConfigId);
      }
    }

    return integrationConfigIds;
  }

  /**
   * Create release config with integration orchestration
   */
  async createConfig(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): Promise<ServiceResult<ReleaseConfiguration>> {
    
    // Step 1: Validate all integration configurations
    const validationResult = await this.validateAllIntegrations(requestData, currentUserId);
    
    if (!validationResult.isValid) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Integration configuration validation failed',
          code: 'INTEGRATION_CONFIG_INVALID',
          details: {
            invalidIntegrations: validationResult.invalidIntegrations
          }
        }
      };
    }

    // Step 2: Create integration configs
    const integrationConfigIds = await this.createIntegrationConfigs(requestData, currentUserId);

    // Step 3: Validate business rules (after integration processing)
    const hasIntegration = hasAtLeastOneIntegration(integrationConfigIds);
    if (!hasIntegration) {
      return {
        success: false,
        error: {
          type: 'BUSINESS_RULE_ERROR',
          message: 'At least one integration must be configured for a release profile',
          code: 'NO_INTEGRATIONS_CONFIGURED'
        }
      };
    }

    // Step 4: Check if configuration name already exists for this tenant
    const existing = await this.configRepo.findByTenantIdAndName(requestData.tenantId, requestData.name);
    if (existing) {
      return {
        success: false,
        error: {
          type: 'BUSINESS_RULE_ERROR',
          message: 'Configuration profile with this name already exists',
          code: 'CONFIG_NAME_EXISTS'
        }
      };
    }

    // Step 5: If this is marked as default, unset any existing default
    if (requestData.isDefault) {
      await this.configRepo.unsetDefaultForTenant(requestData.tenantId);
    }

    // Step 6: Create release config in database
    const id = shortid.generate();
    
    const createDto: CreateReleaseConfigDto = {
      tenantId: requestData.tenantId,
      name: requestData.name,
      description: requestData.description ?? null,
      releaseType: requestData.releaseType,
      platformTargets: requestData.platformTargets,
      baseBranch: requestData.baseBranch ?? null,
      scheduling: requestData.scheduling ?? null,
      hasManualBuildUpload: requestData.hasManualBuildUpload ?? false,
      isActive: true,
      isDefault: requestData.isDefault ?? false,
      createdByAccountId: currentUserId,
      ...integrationConfigIds
    };

    const releaseConfig = await this.configRepo.create({
      ...createDto,
      id
    });

    return {
      success: true,
      data: releaseConfig
    };
  }


  /**
   * Get config by ID with minimal data
   */
  async getConfigById(id: string): Promise<ReleaseConfiguration | null> {
    return this.configRepo.findById(id);
  }

  /**
   * Get config by ID with verbose integration data
   */
  async getConfigByIdVerbose(id: string): Promise<any | null> {
    const config = await this.configRepo.findById(id);
    
    if (!config) {
      return null;
    }

    // Fetch integration configs in parallel
    const [ciConfig, testManagementConfig, commsConfig, projectManagementConfig] = await Promise.all([
      config.ciConfigId && this.cicdConfigService 
        ? this.cicdConfigService.findById(config.ciConfigId)
        : Promise.resolve(null),
      
      config.testManagementConfigId && this.testManagementConfigService
        ? this.testManagementConfigService.getConfigById(config.testManagementConfigId)
        : Promise.resolve(null),
      
      config.commsConfigId && this.slackChannelConfigService
        ? this.slackChannelConfigService.getConfig(config.commsConfigId)
        : Promise.resolve(null),
      
      config.projectManagementConfigId && this.projectManagementConfigService
        ? this.projectManagementConfigService.getConfigById(config.projectManagementConfigId)
        : Promise.resolve(null)
    ]);

    return {
      ...config,
      ciConfig,
      testManagement: testManagementConfig,        // Consistent with POST field name
      communication: commsConfig,                  // Consistent with POST field name
      projectManagement: projectManagementConfig   // Consistent with POST field name
    };
  }

  /**
   * List configs by tenant ID
   */
  async listConfigsByTenant(tenantId: string): Promise<ReleaseConfiguration[]> {
    return this.configRepo.findByTenantId(tenantId);
  }

  /**
   * Get default config for tenant
   */
  async getDefaultConfig(tenantId: string): Promise<ReleaseConfiguration | null> {
    return this.configRepo.findDefaultByTenantId(tenantId);
  }

  /**
   * Update config with integration management
   */
  async updateConfig(
    id: string,
    data: any  // UpdateReleaseConfigRequest
  ): Promise<ReleaseConfiguration | null> {
    const existingConfig = await this.configRepo.findById(id);

    if (!existingConfig) {
      return null;
    }

    // Build the update DTO for the main config
    const configUpdate: UpdateReleaseConfigDto = {
      name: data.name,
      description: data.description,
      releaseType: data.releaseType,
      platformTargets: data.platformTargets,
      baseBranch: data.baseBranch,
      scheduling: data.scheduling,
      hasManualBuildUpload: data.hasManualBuildUpload,
      isDefault: data.isDefault,
      isActive: data.isActive
    };

    // Set the integration config IDs (create new configs if needed)
    configUpdate.ciConfigId = await this.getOrCreateCiConfigId(existingConfig, data, data.createdByAccountId || existingConfig.createdByAccountId);
    configUpdate.testManagementConfigId = await this.getOrCreateTestManagementConfigId(existingConfig, data, data.createdByAccountId || existingConfig.createdByAccountId);
    configUpdate.projectManagementConfigId = await this.getOrCreateProjectManagementConfigId(existingConfig, data, data.createdByAccountId || existingConfig.createdByAccountId);
    configUpdate.commsConfigId = await this.getOrCreateCommsConfigId(existingConfig, data, data.createdByAccountId || existingConfig.createdByAccountId);

    // If setting as default, unset other defaults
    if (data.isDefault === true) {
      await this.configRepo.unsetDefaultForTenant(existingConfig.tenantId, id);
    }

    return this.configRepo.update(id, configUpdate);
  }

  /**
   * Get or create CI config ID
   */
  private async getOrCreateCiConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!updateData.ciConfig) {
      return existingConfig.ciConfigId;
    }

    // If ciConfig has an id, reuse it (update scenario)
    if (updateData.ciConfig.id || updateData.ciConfigId) {
      return updateData.ciConfig.id || updateData.ciConfigId;
    }

    // No existing ID, create new
    if (this.cicdConfigService) {
      const ciResult = await this.cicdConfigService.createConfig({
        tenantId: existingConfig.tenantId,
        workflows: updateData.ciConfig.workflows || [],
        createdByAccountId: currentUserId
      });
      return ciResult.configId;
    }

    return existingConfig.ciConfigId;
  }

  /**
   * Get or create Test Management config ID
   */
  private async getOrCreateTestManagementConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!updateData.testManagement) {
      return existingConfig.testManagementConfigId;
    }

    // If testManagement has an id, reuse it (update scenario)
    if (updateData.testManagement.id || updateData.testManagementConfigId) {
      return updateData.testManagement.id || updateData.testManagementConfigId;
    }

    // No existing ID, create new
    if (this.testManagementConfigService) {
      const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
        { ...updateData, tenantId: existingConfig.tenantId },
        currentUserId
      );

      if (integrationConfigs.testManagement) {
        const tcmConfigDto: CreateTestManagementConfigDto = {
          tenantId: existingConfig.tenantId,
          name: updateData.testManagement.name || `TCM Config for ${existingConfig.name}`,
          ...integrationConfigs.testManagement
        };

        const tcmResult = await this.testManagementConfigService.createConfig(tcmConfigDto);
        return tcmResult.id;
      }
    }

    return existingConfig.testManagementConfigId;
  }

  /**
   * Get or create Project Management config ID
   */
  private async getOrCreateProjectManagementConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!updateData.projectManagement) {
      return existingConfig.projectManagementConfigId;
    }

    // If projectManagement has an id, reuse it (update scenario)
    if (updateData.projectManagement.id || updateData.projectManagementConfigId) {
      return updateData.projectManagement.id || updateData.projectManagementConfigId;
    }

    // No existing ID, create new
    if (this.projectManagementConfigService) {
      const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
        { ...updateData, tenantId: existingConfig.tenantId },
        currentUserId
      );

      if (integrationConfigs.projectManagement) {
        const pmResult = await this.projectManagementConfigService.createConfig({
          tenantId: existingConfig.tenantId,
          name: updateData.projectManagement.name || `PM Config for ${existingConfig.name}`,
          ...integrationConfigs.projectManagement,
          createdByAccountId: currentUserId
        });
        return pmResult.id;
      }
    }

    return existingConfig.projectManagementConfigId;
  }

  /**
   * Get or create Communication config ID
   */
  private async getOrCreateCommsConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!updateData.communication) {
      return existingConfig.commsConfigId;
    }

    // If communication has an id, reuse it (update scenario)
    if (updateData.communication.id || updateData.commsConfigId) {
      return updateData.communication.id || updateData.commsConfigId;
    }

    // No existing ID, create new
    if (this.slackChannelConfigService) {
      const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
        { ...updateData, tenantId: existingConfig.tenantId },
        currentUserId
      );

      if (integrationConfigs.communication) {
        const commsResult = await this.slackChannelConfigService.createConfig({
          tenantId: existingConfig.tenantId,
          ...integrationConfigs.communication,
          createdByAccountId: currentUserId
        });
        return commsResult.id;
      }
    }

    return existingConfig.commsConfigId;
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
   * Soft delete config
   */
  async softDeleteConfig(id: string): Promise<boolean> {
    return this.configRepo.softDelete(id);
  }
}

