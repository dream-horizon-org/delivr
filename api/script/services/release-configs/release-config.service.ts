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
  IntegrationValidationResult,
  ValidationResult,
  ServiceResult
} from '~types/release-configs';
import { hasAtLeastOneIntegration, validateScheduling } from './release-config.validation';
import { IntegrationConfigMapper } from './integration-config.mapper';
import type { TestManagementConfigService as BaseTestManagementConfigService } from '~services/integrations/test-management/test-management-config';
import type { CreateTestManagementConfigDto } from '~types/integrations/test-management/test-management-config';

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-');

// ============================================================================
// INTEGRATION SERVICE INTERFACES (Placeholder)
// ============================================================================

/**
 * Extended TestManagementConfigService interface with validateConfig method
 * The actual integration service will implement this method
 */
interface TestManagementConfigService extends BaseTestManagementConfigService {
  validateConfig?(config: any): Promise<IntegrationValidationResult>;
}

interface CIIntegrationService {
  validateConfig(config: any): Promise<IntegrationValidationResult>;
  createConfig(config: any): Promise<string>;
}

interface CommunicationIntegrationService {
  validateConfig(config: any): Promise<IntegrationValidationResult>;
  createConfig(config: any): Promise<string>;
}

interface SCMIntegrationService {
  validateConfig(config: any): Promise<IntegrationValidationResult>;
  createConfig(config: any): Promise<string>;
}

interface ProjectManagementIntegrationService {
  validateConfig(config: any): Promise<IntegrationValidationResult>;
  createConfig(config: any): Promise<string>;
}

// Placeholder service instances (will be injected)
const ciService: CIIntegrationService = {
  validateConfig: async (config: any): Promise<IntegrationValidationResult> => {
    console.log('Validating CI config:', config);
    return {
      integration: 'ci',
      isValid: true,
      errors: []
    };
  },
  createConfig: async (config: any): Promise<string> => {
    console.log('Creating CI config:', config);
    return `ci_${Date.now()}`;
  }
};

const communicationService: CommunicationIntegrationService = {
  validateConfig: async (config: any): Promise<IntegrationValidationResult> => {
    console.log('Validating Communication config:', config);
    return {
      integration: 'communication',
      isValid: true,
      errors: []
    };
  },
  createConfig: async (config: any): Promise<string> => {
    console.log('Creating Communication config:', config);
    return `comms_${Date.now()}`;
  }
};

const scmService: SCMIntegrationService = {
  validateConfig: async (config: any): Promise<IntegrationValidationResult> => {
    console.log('Validating SCM config:', config);
    return {
      integration: 'scm',
      isValid: true,
      errors: []
    };
  },
  createConfig: async (config: any): Promise<string> => {
    console.log('Creating SCM config:', config);
    return `scm_${Date.now()}`;
  }
};

const projectManagementService: ProjectManagementIntegrationService = {
  validateConfig: async (config: any): Promise<IntegrationValidationResult> => {
    console.log('Validating Project Management config:', config);
    return {
      integration: 'projectManagement',
      isValid: true,
      errors: []
    };
  },
  createConfig: async (config: any): Promise<string> => {
    console.log('Creating Project Management config:', config);
    return `pm_${Date.now()}`;
  }
};

export class ReleaseConfigService {
  constructor(
    private readonly configRepo: ReleaseConfigRepository,
    private readonly testManagementConfigService?: TestManagementConfigService,
    private readonly ciIntegrationService?: CIIntegrationService,
    private readonly communicationIntegrationService?: CommunicationIntegrationService,
    private readonly scmIntegrationService?: SCMIntegrationService,
    private readonly projectManagementIntegrationService?: ProjectManagementIntegrationService
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
    if (integrationConfigs.ci && this.ciIntegrationService) {
      const ciValidation = await this.ciIntegrationService.validateConfig(integrationConfigs.ci);
      validationResults.push(ciValidation);
    }

    // Validate Test Management configuration
    if (integrationConfigs.testManagement && this.testManagementConfigService?.validateConfig) {
      const tcmValidation = await this.testManagementConfigService.validateConfig(integrationConfigs.testManagement);
      validationResults.push(tcmValidation);
    }

    // Validate Communication configuration
    if (integrationConfigs.communication && this.communicationIntegrationService) {
      const commsValidation = await this.communicationIntegrationService.validateConfig(integrationConfigs.communication);
      validationResults.push(commsValidation);
    }

    // Validate SCM configuration
    if (integrationConfigs.scm && this.scmIntegrationService) {
      const scmValidation = await this.scmIntegrationService.validateConfig(integrationConfigs.scm);
      validationResults.push(scmValidation);
    }

    // Validate Project Management configuration
    if (integrationConfigs.projectManagement && this.projectManagementIntegrationService) {
      const pmValidation = await this.projectManagementIntegrationService.validateConfig(integrationConfigs.projectManagement);
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
    if (integrationConfigs.ci && this.ciIntegrationService) {
      if (requestData.ciConfigId?.trim()) {
        integrationConfigIds.ciConfigId = requestData.ciConfigId;
        console.log('Reusing existing CI config:', integrationConfigIds.ciConfigId);
      } else {
        integrationConfigIds.ciConfigId = await this.ciIntegrationService.createConfig(integrationConfigs.ci);
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
          projectId: requestData.organizationId,
          name: requestData.testManagement?.name || `TCM Config for ${requestData.name}`,
          ...integrationConfigs.testManagement
        };
        const tcmConfig = await this.testManagementConfigService.createConfig(tcmConfigDto);
        integrationConfigIds.testManagementConfigId = tcmConfig.id;
        console.log('Created new TCM config:', integrationConfigIds.testManagementConfigId);
      }
    }

    // Create Communication config
    if (integrationConfigs.communication && this.communicationIntegrationService) {
      if (requestData.communication?.id?.trim()) {
        integrationConfigIds.commsConfigId = requestData.communication.id;
        console.log('Reusing existing Communication config:', integrationConfigIds.commsConfigId);
      } else {
        integrationConfigIds.commsConfigId = await this.communicationIntegrationService.createConfig(integrationConfigs.communication);
        console.log('Created new Communication config:', integrationConfigIds.commsConfigId);
      }
    }

    // Create SCM config
    if (integrationConfigs.scm && this.scmIntegrationService) {
      if (requestData.scmConfig?.id?.trim()) {
        integrationConfigIds.sourceCodeManagementConfigId = requestData.scmConfig.id;
        console.log('Reusing existing SCM config:', integrationConfigIds.sourceCodeManagementConfigId);
      } else {
        integrationConfigIds.sourceCodeManagementConfigId = await this.scmIntegrationService.createConfig(integrationConfigs.scm);
        console.log('Created new SCM config:', integrationConfigIds.sourceCodeManagementConfigId);
      }
    }

    // Create Project Management config
    if (integrationConfigs.projectManagement && this.projectManagementIntegrationService) {
      if (requestData.jiraConfig?.id?.trim()) {
        integrationConfigIds.projectManagementConfigId = requestData.jiraConfig.id;
        console.log('Reusing existing Project Management config:', integrationConfigIds.projectManagementConfigId);
      } else {
        integrationConfigIds.projectManagementConfigId = await this.projectManagementIntegrationService.createConfig(integrationConfigs.projectManagement);
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
    const existing = await this.configRepo.findByTenantIdAndName(requestData.organizationId, requestData.name);
    if (existing) {
      return {
        success: false,
        error: {
          type: 'BUSINESS_RULE_ERROR',
          message: 'Configuration profile already exists',
          code: 'CONFIG_NAME_EXISTS'
        }
      };
    }

    // Step 5: If this is marked as default, unset any existing default
    if (requestData.isDefault) {
      await this.configRepo.unsetDefaultForTenant(requestData.organizationId);
    }

    // Step 6: Create release config in database
    const id = shortid.generate();
    const createDto: CreateReleaseConfigDto = {
      tenantId: requestData.organizationId,
      name: requestData.name,
      description: requestData.description ?? null,
      releaseType: requestData.releaseType,
      targets: requestData.defaultTargets,
      scheduling: requestData.scheduling ?? null,
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
   * Get config by ID
   */
  async getConfigById(id: string): Promise<ReleaseConfiguration | null> {
    return this.configRepo.findById(id);
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
   * Update config
   */
  async updateConfig(
    id: string,
    data: UpdateReleaseConfigDto
  ): Promise<ReleaseConfiguration | null> {
    const config = await this.configRepo.findById(id);

    if (!config) {
      return null;
    }

    // If setting as default, unset other defaults
    if (data.isDefault === true) {
      await this.configRepo.unsetDefaultForTenant(config.tenantId, id);
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
   * Soft delete config
   */
  async softDeleteConfig(id: string): Promise<boolean> {
    return this.configRepo.softDelete(id);
  }
}

