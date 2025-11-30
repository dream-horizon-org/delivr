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
import { validateScheduling } from './release-config.validation';
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
      if (requestData.ciConfig?.id?.trim()) {
        integrationConfigIds.ciConfigId = requestData.ciConfig.id;
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
      if (requestData.testManagementConfig?.id?.trim()) {
        integrationConfigIds.testManagementConfigId = requestData.testManagementConfig.id;
        console.log('Reusing existing TCM config:', integrationConfigIds.testManagementConfigId);
      } else {
        const tcmConfigDto: CreateTestManagementConfigDto = {
          tenantId: requestData.tenantId,
          name: requestData.testManagementConfig?.name || `TCM Config for ${requestData.name}`,
          ...integrationConfigs.testManagement
        };
        const tcmConfig = await this.testManagementConfigService.createConfig(tcmConfigDto);
        integrationConfigIds.testManagementConfigId = tcmConfig.id;
        console.log('Created new TCM config:', integrationConfigIds.testManagementConfigId);
      }
    }

    // Create Communication config
    if (integrationConfigs.communication && this.commConfigService) {
      if (requestData.communicationConfig?.id?.trim()) {
        integrationConfigIds.commsConfigId = requestData.communicationConfig.id;
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
      if (requestData.projectManagementConfig?.id?.trim()) {
        integrationConfigIds.projectManagementConfigId = requestData.projectManagementConfig.id;
        console.log('Reusing existing Project Management config:', integrationConfigIds.projectManagementConfigId);
      } else {
        const pmConfig = await this.projectManagementConfigService.createConfig({
          tenantId: requestData.tenantId,
          integrationId: integrationConfigs.projectManagement.integrationId || '',
          name: requestData.projectManagementConfig?.name || `PM Config for ${requestData.name}`,
          description: requestData.projectManagementConfig?.description || '',
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
  /**
   * Get config by ID with verbose integration details
   * Returns VerboseReleaseConfiguration format:
   * - NO config IDs at root level
   * - Standardized keys with "Config" suffix: ciConfig, testManagementConfig, projectManagementConfig, communicationConfig
   * - Each integration config has its own id
   */
  async getConfigByIdVerbose(id: string): Promise<any | null> {
    const config = await this.configRepo.findById(id);
    
    if (!config) {
      return null;
    }

    // Fetch integration configs in parallel
    const [ciConfig, testManagementConfig, communicationConfig, projectManagementConfig] = await Promise.all([
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

    // Return verbose format with standardized keys (all have "Config" suffix)
    // IMPORTANT: Omit config IDs from root, they're in nested objects
    return {
      id: config.id,
      tenantId: config.tenantId,
      name: config.name,
      description: config.description,
      releaseType: config.releaseType,
      platformTargets: config.platformTargets,
      baseBranch: config.baseBranch,
      scheduling: config.scheduling,
      hasManualBuildUpload: config.hasManualBuildUpload,
      isActive: config.isActive,
      isDefault: config.isDefault,
      createdByAccountId: config.createdByAccountId,
      createdAt: config.createdAt instanceof Date ? config.createdAt.toISOString() : config.createdAt,
      updatedAt: config.updatedAt instanceof Date ? config.updatedAt.toISOString() : config.updatedAt,
      
      // Nested integration configs with STANDARDIZED keys (all with "Config" suffix)
      ciConfig,
      testManagementConfig,
      projectManagementConfig,
      communicationConfig
    };
  }

  /**
   * List configs by tenant ID (basic format with config IDs)
   * @deprecated Use listConfigsByTenantVerbose for API responses
   */
  async listConfigsByTenant(tenantId: string): Promise<ReleaseConfiguration[]> {
    return this.configRepo.findByTenantId(tenantId);
  }

  /**
   * List configs by tenant ID with verbose integration details
   * Returns array of VerboseReleaseConfiguration
   */
  async listConfigsByTenantVerbose(tenantId: string): Promise<any[]> {
    const configs = await this.configRepo.findByTenantId(tenantId);
    
    // Fetch verbose details for each config in parallel
    const verboseConfigs = await Promise.all(
      configs.map(config => this.getConfigByIdVerbose(config.id))
    );
    
    return verboseConfigs.filter(config => config !== null);
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
    const configUpdate: UpdateReleaseConfigDto = {};

    // Only include fields that are explicitly provided
    if (data.name !== undefined) configUpdate.name = data.name;
    if (data.description !== undefined) configUpdate.description = data.description;
    if (data.releaseType !== undefined) configUpdate.releaseType = data.releaseType;
    if (data.platformTargets !== undefined) configUpdate.platformTargets = data.platformTargets;
    if (data.baseBranch !== undefined) configUpdate.baseBranch = data.baseBranch;
    if (data.scheduling !== undefined) configUpdate.scheduling = data.scheduling;
    if (data.hasManualBuildUpload !== undefined) configUpdate.hasManualBuildUpload = data.hasManualBuildUpload;
    if (data.isDefault !== undefined) configUpdate.isDefault = data.isDefault;
    if (data.isActive !== undefined) configUpdate.isActive = data.isActive;

    // Handle integration config IDs (returns null for removal, id for keep/update/create)
    const ciConfigId = await this.handleCiConfigId(existingConfig, data, currentUserId);
    const testManagementConfigId = await this.handleTestManagementConfigId(existingConfig, data, currentUserId);
    const projectManagementConfigId = await this.handleProjectManagementConfigId(existingConfig, data, currentUserId);
    const commsConfigId = await this.handleCommsConfigId(existingConfig, data, currentUserId);

    console.log('[updateConfig] Orchestrator results:', {
      ciConfigId,
      testManagementConfigId,
      projectManagementConfigId,
      commsConfigId
    });

    // Always set integration config IDs (even if null) when their orchestrators were called
    // This ensures null values are persisted for removal
    // Using STANDARDIZED keys with "Config" suffix
    if ('ciConfig' in data) {
      console.log('[updateConfig] Setting ciConfigId =', ciConfigId);
      configUpdate.ciConfigId = ciConfigId;
    }
    if ('testManagementConfig' in data) {
      console.log('[updateConfig] Setting testManagementConfigId =', testManagementConfigId);
      configUpdate.testManagementConfigId = testManagementConfigId;
    }
    if ('projectManagementConfig' in data) {
      console.log('[updateConfig] Setting projectManagementConfigId =', projectManagementConfigId);
      configUpdate.projectManagementConfigId = projectManagementConfigId;
    }
    if ('communicationConfig' in data) {
      console.log('[updateConfig] Setting commsConfigId =', commsConfigId);
      configUpdate.commsConfigId = commsConfigId;
    }

    console.log('[updateConfig] Final configUpdate DTO:', JSON.stringify(configUpdate, null, 2));

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
   * Pattern 2 (Null Convention):
   * - undefined (absent) → KEEP existing config
   * - null → REMOVE config
   * - object with matching id → UPDATE existing config
   * - object with different/missing id → NO ACTION (keep existing)
   * 
   * STANDARDIZED: Only checks 'ciConfig' key
   */
  private async handleCiConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    // CRITICAL: Check for explicit presence using standardized key
    let ciConfig;
    if ('ciConfig' in updateData) {
      ciConfig = updateData.ciConfig;
    } else {
      ciConfig = undefined;
    }

    // STATE 1: undefined (field absent) → KEEP existing
    if (ciConfig === undefined) {
      console.log('[handleCiConfigId] Field absent - keeping existing config');
      return existingConfig.ciConfigId;
    }

    // STATE 2: null (explicit null) → REMOVE (and delete from DB)
    if (ciConfig === null) {
      console.log('[handleCiConfigId] Explicit null - removing config');
      
      // Delete the actual integration config from its table if it exists
      if (existingConfig.ciConfigId && this.cicdConfigService) {
        console.log('[handleCiConfigId] Deleting config from DB:', existingConfig.ciConfigId);
        await this.cicdConfigService.deleteConfig(existingConfig.ciConfigId, existingConfig.tenantId);
        console.log('[handleCiConfigId] Config deleted successfully');
      }
      
      return null;
    }

    // STATE 3: object → Validate ID matches existing
    const providedConfigId = ciConfig.id;
    const existingConfigId = existingConfig.ciConfigId;

    // If object has an ID, it must match the existing ID
    if (providedConfigId) {
      if (providedConfigId !== existingConfigId) {
        console.log('[handleCiConfigId] Provided ID does not match existing ID - keeping existing config');
        console.log(`  Provided: ${providedConfigId}, Existing: ${existingConfigId}`);
        return existingConfigId; // Keep existing, ignore the update
      }

      // IDs match - UPDATE existing config
      console.log('[handleCiConfigId] IDs match - updating existing config:', providedConfigId);
      await this.updateCiConfig(providedConfigId, existingConfig.tenantId, ciConfig, currentUserId);
      return providedConfigId;
    }

    // Object without ID - only CREATE if there's no existing config
    if (existingConfigId) {
      console.log('[handleCiConfigId] No ID provided but existing config exists - keeping existing');
      return existingConfigId;
    }

    // No existing config and no ID provided - CREATE new
    console.log('[handleCiConfigId] Creating new config');
    return await this.createCiConfig(existingConfig.tenantId, ciConfig, currentUserId);
  }

  /**
   * Update existing CI config
   * Uses UpdateCICDConfigDto: { tenantId, configId, createdByAccountId, workflows }
   */
  private async updateCiConfig(
    configId: string,
    tenantId: string,
    ciConfig: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.cicdConfigService) return;

    await this.cicdConfigService.updateConfig({
      configId,
      tenantId,
      createdByAccountId: currentUserId,
      workflows: ciConfig.workflows || []
    });
  }

  /**
   * Create new CI config
   */
  private async createCiConfig(
    tenantId: string,
    ciConfig: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.cicdConfigService) return null;

    const ciResult = await this.cicdConfigService.createConfig({
      tenantId,
      workflows: ciConfig.workflows || [],
      createdByAccountId: currentUserId
    });

    return ciResult.configId;
  }

  // ============================================================================
  // TEST MANAGEMENT CONFIG HANDLERS (SRP: Separate orchestration, update, create)
  // ============================================================================

  /**
   * Orchestrator: Handle Test Management config ID (decides whether to update or create)
   * Pattern 2 (Null Convention):
   * - undefined (absent) → KEEP existing config
   * - null → REMOVE config
   * - object with matching id → UPDATE existing config
   * - object with different/missing id → NO ACTION (keep existing)
   * 
   * STANDARDIZED: Only checks 'testManagementConfig' key (with Config suffix)
   */
  private async handleTestManagementConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    // CRITICAL: Check for explicit presence using standardized key with Config suffix
    let testMgmtData;
    if ('testManagementConfig' in updateData) {
      testMgmtData = updateData.testManagementConfig;
    } else {
      testMgmtData = undefined;
    }

    // STATE 1: undefined (field absent) → KEEP existing
    if (testMgmtData === undefined) {
      console.log('[handleTestManagementConfigId] Field absent - keeping existing config');
      return existingConfig.testManagementConfigId;
    }

    // STATE 2: null (explicit null) → REMOVE (and delete from DB)
    if (testMgmtData === null) {
      console.log('[handleTestManagementConfigId] Explicit null - removing config');
      
      // Delete the actual integration config from its table if it exists
      if (existingConfig.testManagementConfigId && this.testManagementConfigService) {
        console.log('[handleTestManagementConfigId] Deleting config from DB:', existingConfig.testManagementConfigId);
        await this.testManagementConfigService.deleteConfig(existingConfig.testManagementConfigId);
        console.log('[handleTestManagementConfigId] Config deleted successfully');
      }
      
      return null;
    }

    // STATE 3: object → Validate ID matches existing
    const providedConfigId = testMgmtData.id;
    const existingConfigId = existingConfig.testManagementConfigId;

    // If object has an ID, it must match the existing ID
    if (providedConfigId) {
      if (providedConfigId !== existingConfigId) {
        console.log('[handleTestManagementConfigId] Provided ID does not match existing ID - keeping existing config');
        console.log(`  Provided: ${providedConfigId}, Existing: ${existingConfigId}`);
        return existingConfigId; // Keep existing, ignore the update
      }

      // IDs match - UPDATE existing config
      console.log('[handleTestManagementConfigId] IDs match - updating existing config:', providedConfigId);
      await this.updateTestManagementConfig(
        providedConfigId,
        existingConfig.tenantId,
        testMgmtData,
        currentUserId
      );
      return providedConfigId;
    }

    // Object without ID - only CREATE if there's no existing config
    if (existingConfigId) {
      console.log('[handleTestManagementConfigId] No ID provided but existing config exists - keeping existing');
      return existingConfigId;
    }

    // No existing config and no ID provided - CREATE new
    console.log('[handleTestManagementConfigId] Creating new config');
    return await this.createTestManagementConfig(
      existingConfig.tenantId,
      existingConfig.name,
      testMgmtData,
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


    // Prepare data for mapper: mapper expects { tenantId, testManagementConfig: {...} }
    // updateData is already the testManagementConfig object from the request
    const normalizedData = {
      tenantId,
      testManagementConfig: updateData  // Pass the updateData as testManagementConfig
    };

    console.log('[updateTestManagementConfig] Normalized data:', JSON.stringify(normalizedData.testManagementConfig, null, 2));

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData as any,  // Cast to any for update operations
      currentUserId
    );

    console.log('[updateTestManagementConfig] Integration configs:', JSON.stringify(integrationConfigs.testManagement, null, 2));

    if (integrationConfigs.testManagement) {
      const tcmUpdateDto = {
        name: normalizedData.testManagementConfig.name || updateData.name,
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

    // Field names are now consistent: use testManagement directly
    const normalizedData = {
      ...updateData,
      tenantId,
      testManagement: updateData.testManagement
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
   * Pattern 2 (Null Convention):
   * - undefined (absent) → KEEP existing config
   * - null → REMOVE config
   * - object with matching id → UPDATE existing config
   * - object with different/missing id → NO ACTION (keep existing)
   * 
   * STANDARDIZED: Only checks 'projectManagementConfig' key (with Config suffix)
   */
  private async handleProjectManagementConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    // CRITICAL: Check for explicit presence using standardized key with Config suffix
    let projectMgmtData;
    if ('projectManagementConfig' in updateData) {
      projectMgmtData = updateData.projectManagementConfig;
    } else {
      projectMgmtData = undefined;
    }

    // STATE 1: undefined (field absent) → KEEP existing
    if (projectMgmtData === undefined) {
      console.log('[handleProjectManagementConfigId] Field absent - keeping existing config');
      return existingConfig.projectManagementConfigId;
    }

    // STATE 2: null (explicit null) → REMOVE (and delete from DB)
    if (projectMgmtData === null) {
      console.log('[handleProjectManagementConfigId] Explicit null - removing config');
      
      // Delete the actual integration config from its table if it exists
      if (existingConfig.projectManagementConfigId && this.projectManagementConfigService) {
        console.log('[handleProjectManagementConfigId] Deleting config from DB:', existingConfig.projectManagementConfigId);
        await this.projectManagementConfigService.deleteConfig(existingConfig.projectManagementConfigId);
        console.log('[handleProjectManagementConfigId] Config deleted successfully');
      }
      
      return null;
    }

    // STATE 3: object → Validate ID matches existing
    const providedConfigId = projectMgmtData.id || updateData.projectManagementConfigId;
    const existingConfigId = existingConfig.projectManagementConfigId;

    // If object has an ID, it must match the existing ID
    if (providedConfigId) {
      if (providedConfigId !== existingConfigId) {
        console.log('[handleProjectManagementConfigId] Provided ID does not match existing ID - keeping existing config');
        console.log(`  Provided: ${providedConfigId}, Existing: ${existingConfigId}`);
        return existingConfigId; // Keep existing, ignore the update
      }

      // IDs match - UPDATE existing config
      console.log('[handleProjectManagementConfigId] IDs match - updating existing config:', providedConfigId);
      await this.updateProjectManagementConfig(
        providedConfigId,
        existingConfig.tenantId,
        projectMgmtData,
        currentUserId
      );
      return providedConfigId;
    }

    // Object without ID - only CREATE if there's no existing config
    if (existingConfigId) {
      console.log('[handleProjectManagementConfigId] No ID provided but existing config exists - keeping existing');
      return existingConfigId;
    }

    // No existing config and no ID provided - CREATE new
    console.log('[handleProjectManagementConfigId] Creating new config');
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

    // Prepare data for mapper: mapper expects { tenantId, projectManagementConfig: {...} }
    // updateData is already the projectManagementConfig object from the request
    const normalizedData = {
      tenantId,
      projectManagementConfig: updateData  // Pass the updateData as projectManagementConfig
    };

    console.log('[updateProjectManagementConfig] Normalized data:', JSON.stringify(normalizedData.projectManagementConfig, null, 2));

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData as any,  // Cast to any for update operations
      currentUserId
    );

    console.log('[updateProjectManagementConfig] Integration configs:', JSON.stringify(integrationConfigs.projectManagement, null, 2));

    if (integrationConfigs.projectManagement) {
      // Extract only the fields that are in UpdateProjectManagementConfigDto
      const pmUpdateDto = {
        name: normalizedData.projectManagementConfig.name,
        description: normalizedData.projectManagementConfig.description,
        platformConfigurations: integrationConfigs.projectManagement.platformConfigurations,
        isActive: normalizedData.projectManagementConfig.isActive
      };

      console.log('[updateProjectManagementConfig] Calling updateConfig with:', JSON.stringify(pmUpdateDto, null, 2));
      await this.projectManagementConfigService.updateConfig(configId, pmUpdateDto);
      console.log('[updateProjectManagementConfig] Update completed for configId:', configId);
    } else {
      console.log('[updateProjectManagementConfig] No integration configs found - skipping update');
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

    // Field names are now consistent: use projectManagementConfig (with Config suffix)
    // Map projectManagementConfig to projectManagement for the mapper
    const normalizedData = {
      ...updateData,
      tenantId,
      projectManagementConfig: updateData.projectManagementConfig || updateData.projectManagement
    };

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData,
      currentUserId
    );

    if (!integrationConfigs.projectManagement) return null;

    // Extract name from the projectManagementConfig if available, otherwise use fallback
    const pmConfigName = updateData.projectManagementConfig?.name || 
                        normalizedData.projectManagementConfig?.name || 
                        `PM Config for ${releaseConfigName || 'Release Config'}`;

    const pmResult = await this.projectManagementConfigService.createConfig({
      tenantId,
      name: pmConfigName,
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
   * Pattern 2 (Null Convention):
   * - undefined (absent) → KEEP existing config
   * - null → REMOVE config
   * - object with matching id → UPDATE existing config
   * - object with different/missing id → NO ACTION (keep existing)
   * 
   * STANDARDIZED: Only checks 'communicationConfig' key (with Config suffix)
   */
  private async handleCommsConfigId(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<string | null> {
    // CRITICAL: Check for explicit presence using standardized key with Config suffix
    let commsData;
    if ('communicationConfig' in updateData) {
      commsData = updateData.communicationConfig;
    } else {
      commsData = undefined;
    }

    // STATE 1: undefined (field absent) → KEEP existing
    if (commsData === undefined) {
      console.log('[handleCommsConfigId] Field absent - keeping existing config');
      return existingConfig.commsConfigId;
    }

    // STATE 2: null (explicit null) → REMOVE (and delete from DB)
    if (commsData === null) {
      console.log('[handleCommsConfigId] Explicit null - removing config');
      
      // Delete the actual integration config from its table if it exists
      if (existingConfig.commsConfigId && this.commConfigService) {
        console.log('[handleCommsConfigId] Deleting config from DB:', existingConfig.commsConfigId);
        await this.commConfigService.deleteConfig(existingConfig.commsConfigId);
        console.log('[handleCommsConfigId] Config deleted successfully');
      }
      
      return null;
    }

    // STATE 3: object → Validate ID matches existing
    const providedConfigId = commsData.id || updateData.commsConfigId;
    const existingConfigId = existingConfig.commsConfigId;

    // If object has an ID, it must match the existing ID
    if (providedConfigId) {
      if (providedConfigId !== existingConfigId) {
        console.log('[handleCommsConfigId] Provided ID does not match existing ID - keeping existing config');
        console.log(`  Provided: ${providedConfigId}, Existing: ${existingConfigId}`);
        return existingConfigId; // Keep existing, ignore the update
      }

      // IDs match - UPDATE existing config
      console.log('[handleCommsConfigId] IDs match - updating existing config:', providedConfigId);
      await this.updateCommsConfig(
        providedConfigId,
        existingConfig.tenantId,
        commsData,
        currentUserId
      );
      return providedConfigId;
    }

    // Object without ID - only CREATE if there's no existing config
    if (existingConfigId) {
      console.log('[handleCommsConfigId] No ID provided but existing config exists - keeping existing');
      return existingConfigId;
    }

    // No existing config and no ID provided - CREATE new
    console.log('[handleCommsConfigId] Creating new config');
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

    // Prepare data for mapper: mapper expects { tenantId, communicationConfig: {...} }
    // updateData is already the communicationConfig object from the request
    const normalizedData = {
      tenantId,
      communicationConfig: updateData  // Pass the updateData as communicationConfig
    };

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData as any,  // Cast to any for update operations
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

    // Field names are now consistent: use communication directly
    const normalizedData = {
      ...updateData,
      tenantId,
      communication: updateData.communication
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
   * Delete config with cascade deletion of integration configs
   */
  async deleteConfig(id: string): Promise<boolean> {
    const config = await this.configRepo.findById(id);

    if (!config) {
      return false;
    }

    console.log('[deleteConfig] Deleting release config and associated integration configs:', id);

    // Delete associated integration configs before deleting the release config
    await this.cascadeDeleteIntegrationConfigs(config);

    return this.configRepo.delete(id);
  }

  /**
   * Cascade delete all integration configs associated with a release config
   */
  private async cascadeDeleteIntegrationConfigs(config: ReleaseConfiguration): Promise<void> {
    console.log('[cascadeDeleteIntegrationConfigs] Starting cascade deletion for config:', config.id);

    // Delete CI/CD config if exists
    if (config.ciConfigId && this.cicdConfigService) {
      console.log('[cascadeDeleteIntegrationConfigs] Deleting CI config:', config.ciConfigId);
      try {
        await this.cicdConfigService.deleteConfig(config.ciConfigId, config.tenantId);
        console.log('[cascadeDeleteIntegrationConfigs] CI config deleted successfully');
      } catch (error) {
        console.error('[cascadeDeleteIntegrationConfigs] Failed to delete CI config:', error);
        // Continue with other deletions even if one fails
      }
    }

    // Delete Test Management config if exists
    if (config.testManagementConfigId && this.testManagementConfigService) {
      console.log('[cascadeDeleteIntegrationConfigs] Deleting Test Management config:', config.testManagementConfigId);
      try {
        await this.testManagementConfigService.deleteConfig(config.testManagementConfigId);
        console.log('[cascadeDeleteIntegrationConfigs] Test Management config deleted successfully');
      } catch (error) {
        console.error('[cascadeDeleteIntegrationConfigs] Failed to delete Test Management config:', error);
        // Continue with other deletions even if one fails
      }
    }

    // Delete Project Management config if exists
    if (config.projectManagementConfigId && this.projectManagementConfigService) {
      console.log('[cascadeDeleteIntegrationConfigs] Deleting Project Management config:', config.projectManagementConfigId);
      try {
        await this.projectManagementConfigService.deleteConfig(config.projectManagementConfigId);
        console.log('[cascadeDeleteIntegrationConfigs] Project Management config deleted successfully');
      } catch (error) {
        console.error('[cascadeDeleteIntegrationConfigs] Failed to delete Project Management config:', error);
        // Continue with other deletions even if one fails
      }
    }

    // Delete Communication config if exists
    if (config.commsConfigId && this.commConfigService) {
      console.log('[cascadeDeleteIntegrationConfigs] Deleting Communication config:', config.commsConfigId);
      try {
        await this.commConfigService.deleteConfig(config.commsConfigId);
        console.log('[cascadeDeleteIntegrationConfigs] Communication config deleted successfully');
      } catch (error) {
        console.error('[cascadeDeleteIntegrationConfigs] Failed to delete Communication config:', error);
        // Continue with other deletions even if one fails
      }
    }

    console.log('[cascadeDeleteIntegrationConfigs] Cascade deletion completed for config:', config.id);
  }

  /**
   * Soft delete config with cascade deletion of integration configs
   */
  async softDeleteConfig(id: string): Promise<boolean> {
    const config = await this.configRepo.findById(id);

    if (!config) {
      return false;
    }

    console.log('[softDeleteConfig] Soft deleting release config and associated integration configs:', id);

    // Delete associated integration configs before soft deleting the release config
    await this.cascadeDeleteIntegrationConfigs(config);

    return this.configRepo.softDelete(id);
  }
}

