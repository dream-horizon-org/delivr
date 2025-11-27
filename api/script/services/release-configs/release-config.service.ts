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
import type { CommConfigService } from '../integrations/comm/comm-config/comm-config.service';
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
    private readonly commConfigService?: CommConfigService,
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
    if (integrationConfigs.communication && this.commConfigService?.validateConfig) {
      const commValidation = this.commConfigService.validateConfig({
        tenantId: requestData.tenantId,
        channelData: integrationConfigs.communication.channelData || {}
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
    if (integrationConfigs.communication && this.commConfigService) {
      if (requestData.communication?.id?.trim()) {
        integrationConfigIds.commsConfigId = requestData.communication.id;
        console.log('Reusing existing Communication config:', integrationConfigIds.commsConfigId);
      } else {
        const commConfig = await this.commConfigService.createConfig({
          tenantId: requestData.tenantId,
          channelData: integrationConfigs.communication.channelData || {}
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
    // Note: Allowing release configs without integrations for flexibility
    // const hasIntegration = hasAtLeastOneIntegration(integrationConfigIds);
    // if (!hasIntegration) {
    //   return {
    //     success: false,
    //     error: {
    //       type: 'BUSINESS_RULE_ERROR',
    //       message: 'At least one integration must be configured for a release profile',
    //       code: 'NO_INTEGRATIONS_CONFIGURED'
    //     }
    //   };
    // }

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
      
      config.commsConfigId && this.commConfigService
        ? this.commConfigService.getConfigById(config.commsConfigId)
        : Promise.resolve(null),
      
      config.projectManagementConfigId && this.projectManagementConfigService
        ? this.projectManagementConfigService.getConfigById(config.projectManagementConfigId)
        : Promise.resolve(null)
    ]);

    return {
      ...config,
      ciConfig,
      testManagementConfig,
      commsConfig,
      projectManagementConfig
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
    data: any,  // UpdateReleaseConfigRequest
    currentUserId: string
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

    // Handle integration config IDs (create or update as needed)
    configUpdate.ciConfigId = await this.handleCiConfigId(existingConfig, data, currentUserId);
    configUpdate.testManagementConfigId = await this.handleTestManagementConfigId(existingConfig, data, currentUserId);
    configUpdate.projectManagementConfigId = await this.handleProjectManagementConfigId(existingConfig, data, currentUserId);
    configUpdate.commsConfigId = await this.handleCommsConfigId(existingConfig, data, currentUserId);

    // If setting as default, unset other defaults
    if (data.isDefault === true) {
      await this.configRepo.unsetDefaultForTenant(existingConfig.tenantId, id);
    }

    return this.configRepo.update(id, configUpdate);
  }

  // ============================================================================
  // CI/CD CONFIG HANDLERS (SRP: Separate orchestration, update, create)
  // ============================================================================

  /**
   * Orchestrator: Handle CI config ID (decides whether to update or create)
   */
  private async handleCiConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!updateData.ciConfig) {
      return existingConfig.ciConfigId;
    }

    const configId = updateData.ciConfig.id || updateData.ciConfigId;

    if (configId) {
      // Update existing config
      await this.updateCiConfig(configId, existingConfig.tenantId, updateData);
      return configId;
    }

    // Create new config
    return await this.createCiConfig(existingConfig.tenantId, updateData, currentUserId);
  }

  /**
   * Update existing CI config
   */
  private async updateCiConfig(
    configId: string,
    tenantId: string,
    updateData: any
  ): Promise<void> {
    if (!this.cicdConfigService) return;

    const ciUpdateDto = {
      workflowIds: updateData.ciConfig.workflows || []
    };

    await this.cicdConfigService.updateConfig(configId, tenantId, ciUpdateDto);
  }

  /**
   * Create new CI config
   */
  private async createCiConfig(
    tenantId: string,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.cicdConfigService) return null;

    const ciResult = await this.cicdConfigService.createConfig({
      tenantId,
      workflows: updateData.ciConfig.workflows || [],
      createdByAccountId: currentUserId
    });

    return ciResult.configId;
  }

  // ============================================================================
  // TEST MANAGEMENT CONFIG HANDLERS (SRP: Separate orchestration, update, create)
  // ============================================================================

  /**
   * Orchestrator: Handle Test Management config ID (decides whether to update or create)
   */
  private async handleTestManagementConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    // Normalize field name: Check both 'testManagementConfig' (from GET) and 'testManagement' (from CREATE)
    const testMgmtData = updateData.testManagementConfig || updateData.testManagement;

    if (!testMgmtData) {
      return existingConfig.testManagementConfigId;
    }

    const configId = testMgmtData.id || updateData.testManagementConfigId;

    if (configId) {
      // Update existing config
      await this.updateTestManagementConfig(
        configId,
        existingConfig.tenantId,
        updateData,
        currentUserId
      );
      return configId;
    }

    // Create new config
    return await this.createTestManagementConfig(
      existingConfig.tenantId,
      existingConfig.name,
      updateData,
      currentUserId
    );
  }

  /**
   * Update existing Test Management config
   */
  private async updateTestManagementConfig(
    configId: string,
    tenantId: string,
    updateData: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.testManagementConfigService) return;

    // Normalize field name: updateData might have 'testManagementConfig' (from GET response)
    // but mapper expects 'testManagement'
    const normalizedData = {
      ...updateData,
      tenantId,
      testManagement: updateData.testManagementConfig || updateData.testManagement
    };

    console.log('[updateTestManagementConfig] Normalized data:', JSON.stringify(normalizedData.testManagement, null, 2));

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData,
      currentUserId
    );

    console.log('[updateTestManagementConfig] Integration configs:', JSON.stringify(integrationConfigs.testManagement, null, 2));

    if (integrationConfigs.testManagement) {
      const tcmUpdateDto = {
        name: normalizedData.testManagement.name,
        ...integrationConfigs.testManagement
      };

      console.log('[updateTestManagementConfig] Update DTO:', JSON.stringify(tcmUpdateDto, null, 2));

      await this.testManagementConfigService.updateConfig(configId, tcmUpdateDto);
      console.log('[updateTestManagementConfig] Update completed for configId:', configId);
    } else {
      console.log('[updateTestManagementConfig] No integration configs found - skipping update');
    }
  }

  /**
   * Create new Test Management config
   */
  private async createTestManagementConfig(
    tenantId: string,
    releaseConfigName: string,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.testManagementConfigService) return null;

    // Normalize field name: updateData might have 'testManagementConfig' (from GET response)
    // but mapper expects 'testManagement'
    const normalizedData = {
      ...updateData,
      tenantId,
      testManagement: updateData.testManagementConfig || updateData.testManagement
    };

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData,
      currentUserId
    );

    if (!integrationConfigs.testManagement) return null;

    const tcmConfigDto: CreateTestManagementConfigDto = {
      tenantId,
      name: normalizedData.testManagement.name || `TCM Config for ${releaseConfigName}`,
      ...integrationConfigs.testManagement
    };

    const tcmResult = await this.testManagementConfigService.createConfig(tcmConfigDto);
    return tcmResult.id;
  }

  // ============================================================================
  // PROJECT MANAGEMENT CONFIG HANDLERS (SRP: Separate orchestration, update, create)
  // ============================================================================

  /**
   * Orchestrator: Handle Project Management config ID (decides whether to update or create)
   */
  private async handleProjectManagementConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    // Normalize field name: Check both 'projectManagementConfig' (from GET) and 'projectManagement' (from CREATE)
    const projectMgmtData = updateData.projectManagementConfig || updateData.projectManagement;

    if (!projectMgmtData) {
      return existingConfig.projectManagementConfigId;
    }

    const configId = projectMgmtData.id || updateData.projectManagementConfigId;

    if (configId) {
      // Update existing config
      await this.updateProjectManagementConfig(
        configId,
        existingConfig.tenantId,
        updateData,
        currentUserId
      );
      return configId;
    }

    // Create new config
    return await this.createProjectManagementConfig(
      existingConfig.tenantId,
      existingConfig.name,
      updateData,
      currentUserId
    );
  }

  /**
   * Update existing Project Management config
   */
  private async updateProjectManagementConfig(
    configId: string,
    tenantId: string,
    updateData: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.projectManagementConfigService) return;

    // Normalize field name: updateData might have 'projectManagementConfig' (from GET response)
    // but mapper expects 'projectManagement'
    const normalizedData = {
      ...updateData,
      tenantId,
      projectManagement: updateData.projectManagementConfig || updateData.projectManagement
    };

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData,
      currentUserId
    );

    if (integrationConfigs.projectManagement) {
      const pmUpdateDto = {
        name: normalizedData.projectManagement.name,
        ...integrationConfigs.projectManagement
      };

      await this.projectManagementConfigService.updateConfig(configId, pmUpdateDto);
    }
  }

  /**
   * Create new Project Management config
   */
  private async createProjectManagementConfig(
    tenantId: string,
    releaseConfigName: string,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.projectManagementConfigService) return null;

    // Normalize field name: updateData might have 'projectManagementConfig' (from GET response)
    // but mapper expects 'projectManagement'
    const normalizedData = {
      ...updateData,
      tenantId,
      projectManagement: updateData.projectManagementConfig || updateData.projectManagement
    };

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData,
      currentUserId
    );

    if (!integrationConfigs.projectManagement) return null;

    const pmResult = await this.projectManagementConfigService.createConfig({
      tenantId,
      name: normalizedData.projectManagement.name || `PM Config for ${releaseConfigName}`,
      ...integrationConfigs.projectManagement,
      createdByAccountId: currentUserId
    });

    return pmResult.id;
  }

  // ============================================================================
  // COMMUNICATION CONFIG HANDLERS (SRP: Separate orchestration, update, create)
  // ============================================================================

  /**
   * Orchestrator: Handle Communication config ID (decides whether to update or create)
   */
  private async handleCommsConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    // Normalize field name: Check both 'commsConfig' (from GET) and 'communication' (from CREATE)
    const commsData = updateData.commsConfig || updateData.communication;

    if (!commsData) {
      return existingConfig.commsConfigId;
    }

    const configId = commsData.id || updateData.commsConfigId;

    if (configId) {
      // Update existing config
      await this.updateCommsConfig(
        configId,
        existingConfig.tenantId,
        updateData,
        currentUserId
      );
      return configId;
    }

    // Create new config
    return await this.createCommsConfig(
      existingConfig.tenantId,
      updateData,
      currentUserId
    );
  }

  /**
   * Update existing Communication config
   */
  private async updateCommsConfig(
    configId: string,
    tenantId: string,
    updateData: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.commConfigService) return;

    // Normalize field name: updateData might have 'commsConfig' (from GET response)
    // but mapper expects 'communication'
    const normalizedData = {
      ...updateData,
      tenantId,
      communication: updateData.commsConfig || updateData.communication
    };

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData,
      currentUserId
    );

    if (integrationConfigs.communication) {
      const commsUpdateDto = {
        channelData: integrationConfigs.communication.channelData
      };

      await this.commConfigService.updateConfig(configId, commsUpdateDto);
    }
  }

  /**
   * Create new Communication config
   */
  private async createCommsConfig(
    tenantId: string,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.commConfigService) return null;

    // Normalize field name: updateData might have 'commsConfig' (from GET response)
    // but mapper expects 'communication'
    const normalizedData = {
      ...updateData,
      tenantId,
      communication: updateData.commsConfig || updateData.communication
    };

    console.log('[createCommsConfig] Normalized communication data:', JSON.stringify(normalizedData.communication, null, 2));

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData,
      currentUserId
    );

    console.log('[createCommsConfig] Integration configs.communication:', JSON.stringify(integrationConfigs.communication, null, 2));

    if (!integrationConfigs.communication) return null;

    const createDto = {
      tenantId,
      channelData: integrationConfigs.communication.channelData
    };

    console.log('[createCommsConfig] CreateDTO being passed to createConfig:', JSON.stringify(createDto, null, 2));

    const commsResult = await this.commConfigService.createConfig(createDto);

    console.log('[createCommsConfig] Created comms config with ID:', commsResult.id);

    return commsResult.id;
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

