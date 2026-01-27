/**
 * Release Config Service
 * Business logic for release configurations
 */

import * as shortid from 'shortid';
import { ReleaseConfigRepository, ReleaseConfigActivityLogRepository } from '~models/release-configs';
import type { ReleaseRetrievalService } from '~services/release/release-retrieval.service';
import type {
  CreateReleaseConfigDto,
  CreateReleaseConfigRequest,
  ReleaseConfiguration,
  UpdateReleaseConfigDto,
  IntegrationValidationResult,
  ValidationResult,
  ServiceResult,
  VerboseReleaseConfiguration
} from '~types/release-configs';
import type { ReleaseSchedule } from '~types/release-schedules';
import { validateScheduling, validateSchedulingForUpdate } from './release-config.validation';
import { IntegrationConfigMapper } from './integration-config.mapper';
import {
  TARGET_TO_STORE_TYPE,
  TARGETS_BYPASS_STORE_INTEGRATION_VALIDATION
} from './release-config.constants';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';
import type { CreateTestManagementConfigDto } from '~types/integrations/test-management/test-management-config';
import type { CICDConfigService } from '../integrations/ci-cd/config/config.service';
import type { CommConfigService } from '../integrations/comm/comm-config/comm-config.service';
import type { ProjectManagementConfigService } from '~services/integrations/project-management/configuration';
import type { ReleaseConfigActivityLogService } from './release-config-activity-log.service';
import type { ReleaseScheduleService } from '~services/release-schedules';
import type { StoreIntegrationController } from '~storage/integrations/store/store-controller';
import { IntegrationStatus } from '~storage/integrations/store/store-types';
import type { FieldValidationError } from '~types/release-configs';

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-');

// ============================================================================
// INTEGRATION SERVICE INTERFACES
// ============================================================================

export class ReleaseConfigService {
  private releaseRetrievalService!: ReleaseRetrievalService;

  constructor(
    private readonly configRepo: ReleaseConfigRepository,
    private readonly releaseScheduleService?: ReleaseScheduleService,
    private readonly cicdConfigService?: CICDConfigService,
    private readonly testManagementConfigService?: TestManagementConfigService,
    private readonly commConfigService?: CommConfigService,
    private readonly projectManagementConfigService?: ProjectManagementConfigService,
    private readonly activityLogService?: ReleaseConfigActivityLogService,
    private readonly activityLogRepository?: ReleaseConfigActivityLogRepository,
    private readonly storeIntegrationController?: StoreIntegrationController
  ) {}

  /**
   * Set the release retrieval service (for checking releases before config deletion)
   * Called after initialization since ReleaseRetrievalService is created after ReleaseConfigService
   */
  setReleaseRetrievalService(service: ReleaseRetrievalService): void {
    this.releaseRetrievalService = service;
  }

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
        appId: requestData.appId,
        workflows: integrationConfigs.ci.workflows || [],
        createdByAccountId: currentUserId
      });
      validationResults.push(ciValidation);
    }

    // Validate Test Management configuration
    if (integrationConfigs.testManagement && this.testManagementConfigService?.validateConfig) {
      const testMgmtValidation = this.testManagementConfigService.validateConfig({
        appId: requestData.appId,
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
        appId: requestData.appId,
        channelData: integrationConfigs.communication.channelData || {}
      });
      validationResults.push(commValidation);
    }

    // Validate Project Management configuration
    if (integrationConfigs.projectManagement && this.projectManagementConfigService?.validateConfig) {
      const pmValidation = this.projectManagementConfigService.validateConfig(integrationConfigs.projectManagement);
      validationResults.push(pmValidation);
    }

    // Validate release schedule if provided
    if (requestData.releaseSchedule) {
      const schedulingErrors = validateScheduling(requestData.releaseSchedule);
      if (schedulingErrors.length > 0) {
        validationResults.push({
          integration: 'releaseSchedule',
          isValid: false,
          errors: schedulingErrors
        });
      }
    }

    // Validate store integrations for platform-targets
    if (this.storeIntegrationController && requestData.platformTargets) {
      const storeValidation = await this.validateStoreIntegrations(
        requestData.appId,
        requestData.platformTargets
      );
      if (!storeValidation.isValid) {
        validationResults.push({
          integration: 'storeIntegration',
          isValid: false,
          errors: storeValidation.errors
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
   * Validate that store integrations exist for all platform-target combinations
   * that require store integrations (APP_STORE, PLAY_STORE).
   * WEB targets don't require store integrations.
   */
  private async validateStoreIntegrations(
    appId: string,
    platformTargets: Array<{ platform: string; target: string }>
  ): Promise<{ isValid: boolean; errors: FieldValidationError[] }> {
    const errors: FieldValidationError[] = [];

    // Get all VERIFIED store integrations for this tenant
    const allStoreIntegrations = await this.storeIntegrationController!.findAll({
      appId,
      status: IntegrationStatus.VERIFIED
    });

    // Check each platform-target that requires a store integration
    for (let i = 0; i < platformTargets.length; i++) {
      const pt = platformTargets[i];
      const { platform, target } = pt;

      // Skip targets that don't require store integration validation
      if (TARGETS_BYPASS_STORE_INTEGRATION_VALIDATION.includes(target)) {
        continue;
      }

      // Get required storeType for this target
      const requiredStoreType = TARGET_TO_STORE_TYPE[target];

      // Check if there's a matching store integration
      // Note: All integrations are already VERIFIED (filtered at DB level)
      const hasMatchingIntegration = allStoreIntegrations.some(
        integration =>
          integration.storeType === requiredStoreType &&
          integration.platform === platform.toUpperCase()
      );

      if (!hasMatchingIntegration) {
        errors.push({
          field: `platformTargets[${i}]`,
          message: `No verified ${requiredStoreType} integration found for ${platform.toUpperCase()} platform. Please set up the store integration first.`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate integration configurations for UPDATE operations
   * Only validates integrations that are explicitly provided as objects
   * 
   * Skip validation when:
   * - Field is absent (undefined) → keeping existing
   * - Field is null → removing integration
   * - Field is object with only 'id' → referencing existing config
   * 
   * Validate when:
   * - Field is object with data → updating/creating
   */
  private async validateIntegrationsForUpdate(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<ValidationResult> {
    const validationResults: IntegrationValidationResult[] = [];
    const appId = existingConfig.appId;

    // Helper to check if object has meaningful data (not just 'id')
    const hasDataBeyondId = (obj: any): boolean => {
      const isObject = obj !== null && typeof obj === 'object';
      if (!isObject) return false;
      
      const keys = Object.keys(obj).filter(k => k !== 'id');
      return keys.length > 0;
    };

    // Validate CI Config (only if object with data is provided)
    if ('ciConfig' in updateData) {
      const ciConfig = updateData.ciConfig;
      const shouldValidate = ciConfig !== null && 
                             ciConfig !== undefined && 
                             hasDataBeyondId(ciConfig) &&
                             this.cicdConfigService?.validateConfig;
      
      if (shouldValidate) {
        const ciValidation = await this.cicdConfigService!.validateConfig({
          appId,
          workflows: ciConfig.workflows || [],
          createdByAccountId: currentUserId
        });
        validationResults.push(ciValidation);
      }
    }

    // Validate Test Management Config (only if object with data is provided)
    if ('testManagementConfig' in updateData) {
      const testMgmtConfig = updateData.testManagementConfig;
      const shouldValidate = testMgmtConfig !== null && 
                             testMgmtConfig !== undefined && 
                             hasDataBeyondId(testMgmtConfig) &&
                             this.testManagementConfigService?.validateConfig;
      
      if (shouldValidate) {
        const testMgmtValidation = this.testManagementConfigService!.validateConfig({
          appId,
          integrationId: testMgmtConfig.integrationId || '',
          name: testMgmtConfig.name || `Test Config for ${existingConfig.name}`,
          passThresholdPercent: testMgmtConfig.passThresholdPercent ?? 100,
          platformConfigurations: testMgmtConfig.platformConfigurations || [],
          createdByAccountId: currentUserId
        });
        validationResults.push(testMgmtValidation);
      }
    }

    // Validate Communication Config (only if object with data is provided)
    if ('communicationConfig' in updateData) {
      const commConfig = updateData.communicationConfig;
      const shouldValidate = commConfig !== null && 
                             commConfig !== undefined && 
                             hasDataBeyondId(commConfig) &&
                             this.commConfigService?.validateConfig;
      
      if (shouldValidate) {
        const commValidation = this.commConfigService!.validateConfig({
          appId,
          channelData: commConfig.channelData || {}
        });
        validationResults.push(commValidation);
      }
    }

    // Validate Project Management Config (only if object with data is provided)
    if ('projectManagementConfig' in updateData) {
      const pmConfig = updateData.projectManagementConfig;
      const shouldValidate = pmConfig !== null && 
                             pmConfig !== undefined && 
                             hasDataBeyondId(pmConfig) &&
                             this.projectManagementConfigService?.validateConfig;
      
      if (shouldValidate) {
        const pmValidation = this.projectManagementConfigService!.validateConfig(pmConfig);
        validationResults.push(pmValidation);
      }
    }

    // Validate Release Schedule (only if object with data is provided)
    // Use validateSchedulingForUpdate for partial updates (e.g., archive with only isActive: false)
    if ('releaseSchedule' in updateData) {
      const scheduleData = updateData.releaseSchedule;
      const shouldValidate = scheduleData !== null && scheduleData !== undefined;
      
      if (shouldValidate) {
        const schedulingErrors = validateSchedulingForUpdate(scheduleData);
        if (schedulingErrors.length > 0) {
          validationResults.push({
            integration: 'releaseSchedule',
            isValid: false,
            errors: schedulingErrors
          });
        }
      }
    }

    // Validate store integrations if platformTargets are being updated
    if (this.storeIntegrationController && 'platformTargets' in updateData && updateData.platformTargets) {
      const storeValidation = await this.validateStoreIntegrations(
        appId,
        updateData.platformTargets
      );
      if (!storeValidation.isValid) {
        validationResults.push({
          integration: 'storeIntegration',
          isValid: false,
          errors: storeValidation.errors
        });
      }
    }

    // Filter only invalid integrations
    const invalidIntegrations = validationResults.filter(result => !result.isValid);

    // Log validation failures for debugging
    if (invalidIntegrations.length > 0) {
      console.error('[validateIntegrationsForUpdate] Validation failed:', JSON.stringify({
        configId: existingConfig.id,
        appId,
        invalidIntegrations: invalidIntegrations.map(inv => ({
          integration: inv.integration,
          errors: inv.errors
        }))
      }, null, 2));
    }

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
          appId: requestData.appId,
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
          appId: requestData.appId,
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
          appId: requestData.appId,
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
          appId: requestData.appId,
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

    // NOTE: Release Schedule is created AFTER config creation (since schedule references config)
    // See createConfig method for schedule creation

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
      // Log detailed validation errors for debugging
      console.error('[createConfig] Validation failed:', JSON.stringify({
        appId: requestData.appId,
        configName: requestData.name,
        invalidIntegrations: validationResult.invalidIntegrations.map(inv => ({
          integration: inv.integration,
          errorCount: inv.errors?.length || 0,
          errors: inv.errors
        }))
      }, null, 2));

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

    // Step 2: Check if configuration name already exists for this tenant
    // (Must happen BEFORE creating integration configs to avoid orphan records)
    const existing = await this.configRepo.findByAppIdAndName(requestData.appId, requestData.name);
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

    // Step 3: Create integration configs
    const integrationConfigIds = await this.createIntegrationConfigs(requestData, currentUserId);

    // Step 5: If this is marked as default, unset any existing default
    if (requestData.isDefault) {
      await this.configRepo.unsetDefaultForApp(requestData.appId);
    }

    // Step 6: Create release config in database
    const id = shortid.generate();
    
    const createDto: CreateReleaseConfigDto = {
      appId: requestData.appId,
      name: requestData.name,
      description: requestData.description ?? null,
      releaseType: requestData.releaseType,
      platformTargets: requestData.platformTargets,
      baseBranch: requestData.baseBranch ?? null,
      // TODO: Implement release schedule handling - create schedule first, then pass releaseScheduleId
      // releaseScheduleId will be set after creating the schedule in release_schedules table
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

    // Step 7: Create Release Schedule AFTER config is created (schedule references config)
    if (requestData.releaseSchedule && this.releaseScheduleService) {
      console.log('[createConfig] Creating Release Schedule for config:', id);
      try {
        await this.releaseScheduleService.create(
          releaseConfig.id,           // releaseConfigId - required FK
          releaseConfig.name,         // For Cronicle job title
          requestData.releaseSchedule, // Schedule data
          releaseConfig.appId,     // appId (denormalized)
          currentUserId               // createdByAccountId
        );
        console.log('[createConfig] Release Schedule created successfully');
      } catch (error) {
        console.error('[createConfig] Failed to create Release Schedule:', error);
        // Don't fail config creation if schedule creation fails
      }
    }

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
  async getConfigByIdVerbose(id: string): Promise<VerboseReleaseConfiguration | null> {
    const config = await this.configRepo.findById(id);
    
    if (!config) {
      return null;
    }

    // Fetch integration configs in parallel
    const [ciConfig, testManagementConfig, communicationConfig, projectManagementConfig, releaseScheduleRecord] = await Promise.all([
      config.ciConfigId && this.cicdConfigService 
        ? this.cicdConfigService.getByIdVerbose(config.ciConfigId)
        : Promise.resolve(null),
      
      config.testManagementConfigId && this.testManagementConfigService
        ? this.testManagementConfigService.getConfigById(config.testManagementConfigId)
        : Promise.resolve(null),
      
      config.commsConfigId && this.commConfigService
        ? this.commConfigService.getConfigById(config.commsConfigId)
        : Promise.resolve(null),
      
      config.projectManagementConfigId && this.projectManagementConfigService
        ? this.projectManagementConfigService.getConfigById(config.projectManagementConfigId)
        : Promise.resolve(null),
      
      // Schedule references config (not vice versa) - lookup by config ID
      this.releaseScheduleService
        ? this.releaseScheduleService.getByReleaseConfigId(config.id)
        : Promise.resolve(null)
    ]);

    // Map ReleaseScheduleRecord to ReleaseSchedule (strip DB-only fields)
    const releaseSchedule = this.mapScheduleRecordToSchedule(releaseScheduleRecord);

    // Return verbose format with standardized keys (all have "Config" suffix except releaseSchedule)
    // IMPORTANT: Omit config IDs from root, they're in nested objects
    return {
      id: config.id,
      appId: config.appId,
      name: config.name,
      description: config.description,
      releaseType: config.releaseType,
      platformTargets: config.platformTargets,
      baseBranch: config.baseBranch,
      hasManualBuildUpload: config.hasManualBuildUpload,
      isActive: config.isActive,
      isDefault: config.isDefault,
      createdByAccountId: config.createdByAccountId,
      createdAt: config.createdAt instanceof Date ? config.createdAt.toISOString() : config.createdAt,
      updatedAt: config.updatedAt instanceof Date ? config.updatedAt.toISOString() : config.updatedAt,
      
      // Nested integration configs with STANDARDIZED keys (all with "Config" suffix except releaseSchedule)
      ciConfig,
      testManagementConfig,
      projectManagementConfig,
      communicationConfig,
      releaseSchedule
    };
  }

  /**
   * Map ReleaseScheduleRecord to ReleaseSchedule
   * Strips DB-only fields (appId, createdAt, updatedAt, etc.)
   * Keeps scheduling configuration fields + runtime state
   */
  private mapScheduleRecordToSchedule(record: any): (ReleaseSchedule & { id: string }) | null {
    if (!record) {
      return null;
    }

    return {
      id: record.id, // Include id for update operations
      releaseFrequency: record.releaseFrequency,
      firstReleaseKickoffDate: record.firstReleaseKickoffDate,
      nextReleaseKickoffDate: record.nextReleaseKickoffDate,
      initialVersions: record.initialVersions,
      kickoffReminderTime: record.kickoffReminderTime,
      kickoffTime: record.kickoffTime,
      targetReleaseTime: record.targetReleaseTime,
      targetReleaseDateOffsetFromKickoff: record.targetReleaseDateOffsetFromKickoff,
      kickoffReminderEnabled: record.kickoffReminderEnabled,
      timezone: record.timezone,
      regressionSlots: record.regressionSlots,
      workingDays: record.workingDays,
      // Runtime state fields
      isEnabled: record.isEnabled,
      lastCreatedReleaseId: record.lastCreatedReleaseId
    };
  }

  /**
   * List configs by app id (basic format with config IDs)
   * @deprecated Use listConfigsByAppVerbose for API responses
   */
  async listConfigsByApp(appId: string, includeArchived = false): Promise<ReleaseConfiguration[]> {
    return this.configRepo.findByAppId(appId, includeArchived);
  }

  /**
   * @deprecated Use listConfigsByApp instead
   * Kept for backward compatibility
   */
  listConfigsByTenant = this.listConfigsByApp;

  /**
   * List configs by app id with verbose integration details
   * Returns array of VerboseReleaseConfiguration
   */
  async listConfigsByAppVerbose(appId: string, includeArchived = false): Promise<VerboseReleaseConfiguration[]> {
    const configs = await this.configRepo.findByAppId(appId, includeArchived);
    
    // Fetch verbose details for each config in parallel
    const verboseConfigs = await Promise.all(
      configs.map(config => this.getConfigByIdVerbose(config.id))
    );
    
    return verboseConfigs.filter((config): config is VerboseReleaseConfiguration => config !== null);
  }

  /**
   * Get default config for tenant
   */
  async getDefaultConfig(appId: string): Promise<ReleaseConfiguration | null> {
    return this.configRepo.findDefaultByTenantId(appId);
  }

  /**
   * Update config with integration management
   * Returns ServiceResult to handle validation errors
   */
  async updateConfig(
    id: string,
    data: any,  // UpdateReleaseConfigRequest
    currentUserId: string
  ): Promise<ServiceResult<ReleaseConfiguration | null>> {
    const existingConfig = await this.configRepo.findById(id);

    if (!existingConfig) {
      return {
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Release configuration not found',
          code: 'CONFIG_NOT_FOUND'
        }
      };
    }

    // Step 1: Validate integration configurations BEFORE any other operations
    const validationResult = await this.validateIntegrationsForUpdate(
      existingConfig,
      data,
      currentUserId
    );

    if (!validationResult.isValid) {
      // Log detailed validation errors for debugging
      console.error('[updateConfig] Validation failed for config:', JSON.stringify({
        configId: id,
        appId: existingConfig.appId,
        invalidIntegrations: validationResult.invalidIntegrations.map(inv => ({
          integration: inv.integration,
          errorCount: inv.errors?.length || 0,
          errors: inv.errors
        })),
        updateDataKeys: Object.keys(data)
      }, null, 2));

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

    // Build the update DTO for the main config
    const configUpdate: UpdateReleaseConfigDto = {};

    // Only include fields that are explicitly provided
    if (data.name !== undefined) configUpdate.name = data.name;
    if (data.description !== undefined) configUpdate.description = data.description;
    if (data.releaseType !== undefined) configUpdate.releaseType = data.releaseType;
    if (data.platformTargets !== undefined) configUpdate.platformTargets = data.platformTargets;
    if (data.baseBranch !== undefined) configUpdate.baseBranch = data.baseBranch;
    if (data.hasManualBuildUpload !== undefined) configUpdate.hasManualBuildUpload = data.hasManualBuildUpload;
    if (data.isDefault !== undefined) configUpdate.isDefault = data.isDefault;
    if (data.isActive !== undefined) configUpdate.isActive = data.isActive;

    // Log base config changes BEFORE integration updates (excluding scheduling)
    if (this.activityLogService) {
      const previousValue: Record<string, any> = {};
      const newValue: Record<string, any> = {};

      // Build previous and new values from configUpdate keys (excluding scheduling)
      const baseFields = ['name', 'description', 'releaseType', 'platformTargets', 'baseBranch', 
                          'hasManualBuildUpload', 'isDefault', 'isActive'];
      
      for (const field of baseFields) {
        if (field in configUpdate) {
          previousValue[field] = existingConfig[field as keyof ReleaseConfiguration];
          newValue[field] = configUpdate[field as keyof UpdateReleaseConfigDto];
        }
      }

      // Log changes if any base fields were updated
      const hasBaseFieldUpdates = Object.keys(previousValue).length > 0;
      if (hasBaseFieldUpdates) {
        await this.activityLogService.registerConfigActivityLogs(
          id,
          currentUserId,
          new Date(),
          'RELEASE_CONFIG',
          previousValue,
          newValue
        );
      }

      // Log release schedule changes separately
      // Note: releaseSchedule is managed via ReleaseScheduleService but we log changes here
      if ('releaseSchedule' in configUpdate) {
        const previousSchedule = (existingConfig as any).releaseSchedule;
        const newSchedule = (configUpdate as any).releaseSchedule;
        
        // Extract regression slots for separate logging
        const previousRegressionSlots = previousSchedule?.regressionSlots || [];
        const newRegressionSlots = newSchedule?.regressionSlots || [];
        
        // Build schedule without regression slots for base logging
        const previousScheduleWithoutSlots = previousSchedule ? { ...previousSchedule } : null;
        const newScheduleWithoutSlots = newSchedule ? { ...newSchedule } : null;
        
        if (previousScheduleWithoutSlots) {
          delete previousScheduleWithoutSlots.regressionSlots;
        }
        if (newScheduleWithoutSlots) {
          delete newScheduleWithoutSlots.regressionSlots;
        }
        
        // Log base schedule fields (without regression slots)
        await this.activityLogService.registerConfigActivityLogs(
          id,
          currentUserId,
          new Date(),
          'SCHEDULE',
          { releaseSchedule: previousScheduleWithoutSlots },
          { releaseSchedule: newScheduleWithoutSlots }
        );
        
        // Log regression slots - each slot as separate row
        // Create maps for easy lookup (use index as key since slots don't have IDs)
        const previousSlotsMap = new Map(
          previousRegressionSlots.map((slot: any, index: number) => [index, slot])
        );
        const newSlotsMap = new Map(
          newRegressionSlots.map((slot: any, index: number) => [index, slot])
        );
        
        // Get max length to cover all slots
        const maxSlots = Math.max(previousRegressionSlots.length, newRegressionSlots.length);
        
        for (let i = 0; i < maxSlots; i++) {
          const prevSlot = previousSlotsMap.get(i);
          const newSlot = newSlotsMap.get(i);
          
          // Check if there's an actual change
          const prevStr = prevSlot ? JSON.stringify(prevSlot) : null;
          const newStr = newSlot ? JSON.stringify(newSlot) : null;
          
          if (prevStr !== newStr) {
            await this.activityLogService.registerConfigActivityLogs(
              id,
              currentUserId,
              new Date(),
              'SCHEDULE',
              prevSlot || null,
              newSlot || null
            );
          }
        }
      }
    }

    // Handle integration config IDs (returns null for removal, id for keep/update/create)
    const ciConfigId = await this.handleCiConfigId(existingConfig, data, currentUserId);
    const testManagementConfigId = await this.handleTestManagementConfigId(existingConfig, data, currentUserId);
    const projectManagementConfigId = await this.handleProjectManagementConfigId(existingConfig, data, currentUserId);
    const commsConfigId = await this.handleCommsConfigId(existingConfig, data, currentUserId);
    
    // Handle Release Schedule separately (schedule references config, not vice versa)
    await this.handleReleaseSchedule(existingConfig, data, currentUserId);

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
    // NOTE: releaseSchedule is NOT stored on config - schedule references config via FK
    // handleReleaseSchedule manages the schedule directly

    console.log('[updateConfig] Final configUpdate DTO:', JSON.stringify(configUpdate, null, 2));

    // If setting as default, unset other defaults
    if (data.isDefault === true) {
      await this.configRepo.unsetDefaultForTenant(existingConfig.appId, id);
    }

    const updatedConfig = await this.configRepo.update(id, configUpdate);
    
    return {
      success: true,
      data: updatedConfig
    };
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
      
      // Get previous config for activity log before deletion
      let previousCiConfig = null;
      if (existingConfig.ciConfigId && this.cicdConfigService) {
        previousCiConfig = await this.cicdConfigService.findById(existingConfig.ciConfigId);
      }
      
      // Delete the actual integration config from its table if it exists
      if (existingConfig.ciConfigId && this.cicdConfigService) {
        console.log('[handleCiConfigId] Deleting config from DB:', existingConfig.ciConfigId);
        await this.cicdConfigService.deleteConfig(existingConfig.ciConfigId, existingConfig.appId);
        console.log('[handleCiConfigId] Config deleted successfully');
      }
      
      // Log CI config deletion
      if (this.activityLogService && previousCiConfig) {
        await this.activityLogService.registerConfigActivityLogs(
          existingConfig.id,
          currentUserId,
          new Date(),
          'CI_CONFIG',
          { workflowIds: previousCiConfig.workflowIds },
          null
        );
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
      
      // Get previous config for activity log before update
      let previousCiConfig = null;
      if (this.cicdConfigService) {
        previousCiConfig = await this.cicdConfigService.findById(providedConfigId);
      }
      
      await this.updateCiConfig(providedConfigId, existingConfig.appId, ciConfig, currentUserId);
      
      // Log CI config update
      if (this.activityLogService && previousCiConfig) {
        await this.activityLogService.registerConfigActivityLogs(
          existingConfig.id,
          currentUserId,
          new Date(),
          'CI_CONFIG',
          { workflowIds: previousCiConfig.workflowIds },
          { workflowIds: ciConfig.workflows || [] }
        );
      }
      
      return providedConfigId;
    }

    // Object without ID - only CREATE if there's no existing config
    if (existingConfigId) {
      console.log('[handleCiConfigId] No ID provided but existing config exists - keeping existing');
      return existingConfigId;
    }

    // No existing config and no ID provided - CREATE new
    console.log('[handleCiConfigId] Creating new config');
    const newConfigId = await this.createCiConfig(existingConfig.appId, ciConfig, currentUserId);
    
    // Log CI config creation
    if (this.activityLogService && newConfigId) {
      await this.activityLogService.registerConfigActivityLogs(
        existingConfig.id,
        currentUserId,
        new Date(),
        'CI_CONFIG',
        null,
        { workflowIds: ciConfig.workflows || [] }
      );
    }
    
    return newConfigId;
  }

  /**
   * Update existing CI config
   * Uses UpdateCICDConfigDto: { appId, configId, createdByAccountId, workflows }
   */
  private async updateCiConfig(
    configId: string,
    appId: string,
    ciConfig: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.cicdConfigService) return;

    await this.cicdConfigService.updateConfig({
      configId,
      appId,
      createdByAccountId: currentUserId,
      workflows: ciConfig.workflows || []
    });
  }

  /**
   * Create new CI config
   */
  private async createCiConfig(
    appId: string,
    ciConfig: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.cicdConfigService) return null;

    const ciResult = await this.cicdConfigService.createConfig({
      appId,
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
      
      // Get previous config for activity log before deletion
      let previousTestMgmtConfig = null;
      if (existingConfig.testManagementConfigId && this.testManagementConfigService) {
        previousTestMgmtConfig = await this.testManagementConfigService.getConfigById(existingConfig.testManagementConfigId);
      }
      
      // Delete the actual integration config from its table if it exists
      if (existingConfig.testManagementConfigId && this.testManagementConfigService) {
        console.log('[handleTestManagementConfigId] Deleting config from DB:', existingConfig.testManagementConfigId);
        await this.testManagementConfigService.deleteConfig(existingConfig.testManagementConfigId);
        console.log('[handleTestManagementConfigId] Config deleted successfully');
      }
      
      // Log test management config deletion (single row with all data)
      if (this.activityLogService && previousTestMgmtConfig) {
        await this.activityLogService.registerConfigActivityLogs(
          existingConfig.id,
          currentUserId,
          new Date(),
          'TEST_MANAGEMENT_CONFIG',
          { 
            name: previousTestMgmtConfig.name,
            passThresholdPercent: previousTestMgmtConfig.passThresholdPercent,
            platformConfigurations: previousTestMgmtConfig.platformConfigurations || []
          },
          null
        );
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
      
      // Get previous config for activity log before update
      let previousTestMgmtConfig = null;
      if (this.testManagementConfigService) {
        previousTestMgmtConfig = await this.testManagementConfigService.getConfigById(providedConfigId);
      }
      
      await this.updateTestManagementConfig(
        providedConfigId,
        existingConfig.appId,
        testMgmtData,
        currentUserId
      );
      
      // Log test management config update
      if (this.activityLogService && previousTestMgmtConfig) {
        // Log base fields (name, passThresholdPercent) if changed
        const baseFieldChanges: Record<string, any> = {};
        const baseFieldNewValues: Record<string, any> = {};
        
        if (testMgmtData.name !== undefined && testMgmtData.name !== previousTestMgmtConfig.name) {
          baseFieldChanges.name = previousTestMgmtConfig.name;
          baseFieldNewValues.name = testMgmtData.name;
        }
        if (testMgmtData.passThresholdPercent !== undefined && testMgmtData.passThresholdPercent !== previousTestMgmtConfig.passThresholdPercent) {
          baseFieldChanges.passThresholdPercent = previousTestMgmtConfig.passThresholdPercent;
          baseFieldNewValues.passThresholdPercent = testMgmtData.passThresholdPercent;
        }
        
        if (Object.keys(baseFieldChanges).length > 0) {
          await this.activityLogService.registerConfigActivityLogs(
            existingConfig.id,
            currentUserId,
            new Date(),
            'TEST_MANAGEMENT_CONFIG',
            baseFieldChanges,
            baseFieldNewValues
          );
        }
        
        // Log platform configurations - each platform as separate row
        if (testMgmtData.platforms) {
          const previousPlatforms = previousTestMgmtConfig.platformConfigurations || [];
          const newPlatforms = testMgmtData.platforms || [];
          
          // Create maps for easy lookup
          const previousPlatformMap = new Map(
            previousPlatforms.map(p => [p.platform, p])
          );
          const newPlatformMap = new Map(
            newPlatforms.map((p: any) => [p.platform, p])
          );
          
          // Get all unique platforms
          const allPlatforms = new Set([
            ...previousPlatformMap.keys(),
            ...newPlatformMap.keys()
          ]);
          
          // Log each platform change separately
          for (const platform of allPlatforms) {
            const prevPlatform = previousPlatformMap.get(platform) as any;
            const newPlatform = newPlatformMap.get(platform) as any;
            
            // Check if there's an actual change
            const prevStr = prevPlatform ? JSON.stringify(prevPlatform.parameters) : null;
            const newStr = newPlatform ? JSON.stringify(newPlatform.parameters) : null;
            
            if (prevStr !== newStr) {
              await this.activityLogService.registerConfigActivityLogs(
                existingConfig.id,
                currentUserId,
                new Date(),
                'TEST_MANAGEMENT_CONFIG',
                prevPlatform ? { platform: prevPlatform.platform, parameters: prevPlatform.parameters } : null,
                newPlatform ? { platform: newPlatform.platform, parameters: newPlatform.parameters } : null
              );
            }
          }
        }
      }
      
      return providedConfigId;
    }

    // Object without ID - only CREATE if there's no existing config
    if (existingConfigId) {
      console.log('[handleTestManagementConfigId] No ID provided but existing config exists - keeping existing');
      return existingConfigId;
    }

    // No existing config and no ID provided - CREATE new
    console.log('[handleTestManagementConfigId] Creating new config');
    const newConfigId = await this.createTestManagementConfig(
      existingConfig.appId,
      existingConfig.name,
      testMgmtData,  // Pass extracted config object, not full updateData
      currentUserId
    );
    
    // Log test management config creation (single row with all data)
    if (this.activityLogService && newConfigId) {
      await this.activityLogService.registerConfigActivityLogs(
        existingConfig.id,
        currentUserId,
        new Date(),
        'TEST_MANAGEMENT_CONFIG',
        null,
        { 
          name: testMgmtData.name,
          passThresholdPercent: testMgmtData.passThresholdPercent,
          platformConfigurations: testMgmtData.platforms || []
        }
      );
    }
    
    return newConfigId;
  }

  /**
   * Update existing Test Management config
   */
  private async updateTestManagementConfig(
    configId: string,
    appId: string,
    updateData: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.testManagementConfigService) return;


    // Prepare data for mapper: mapper expects { appId, testManagementConfig: {...} }
    // updateData is already the testManagementConfig object from the request
    const normalizedData = {
      appId,
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
    appId: string,
    releaseConfigName: string,
    testManagementConfigData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.testManagementConfigService) return null;

    const normalizedData = {
      appId,
      testManagementConfig: testManagementConfigData
    };

    console.log('[createTestManagementConfig] Creating new config with data:', JSON.stringify(testManagementConfigData, null, 2));

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData as any,  // Cast to any for partial data during create
      currentUserId
    );

    if (!integrationConfigs.testManagement) {
      console.log('[createTestManagementConfig] Mapper returned null - no valid config data');
      return null;
    }

    const tcmConfigDto: CreateTestManagementConfigDto = {
      appId,
      name: testManagementConfigData.name || `TCM Config for ${releaseConfigName}`,
      ...integrationConfigs.testManagement
    };

    console.log('[createTestManagementConfig] Creating config with DTO:', JSON.stringify(tcmConfigDto, null, 2));
    const tcmResult = await this.testManagementConfigService.createConfig(tcmConfigDto);
    console.log('[createTestManagementConfig] Config created with ID:', tcmResult.id);
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
      
      // Get previous config for activity log before deletion
      let previousPmConfig = null;
      if (existingConfig.projectManagementConfigId && this.projectManagementConfigService) {
        previousPmConfig = await this.projectManagementConfigService.getConfigById(existingConfig.projectManagementConfigId);
      }
      
      // Delete the actual integration config from its table if it exists
      if (existingConfig.projectManagementConfigId && this.projectManagementConfigService) {
        console.log('[handleProjectManagementConfigId] Deleting config from DB:', existingConfig.projectManagementConfigId);
        await this.projectManagementConfigService.deleteConfig(existingConfig.projectManagementConfigId);
        console.log('[handleProjectManagementConfigId] Config deleted successfully');
      }
      
      // Log project management config deletion (single row with all data)
      if (this.activityLogService && previousPmConfig) {
        await this.activityLogService.registerConfigActivityLogs(
          existingConfig.id,
          currentUserId,
          new Date(),
          'PROJECT_MANAGEMENT_CONFIG',
          { 
            name: previousPmConfig.name,
            description: previousPmConfig.description,
            isActive: previousPmConfig.isActive,
            platformConfigurations: previousPmConfig.platformConfigurations || []
          },
          null
        );
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
      
      // Get previous config for activity log before update
      let previousPmConfig = null;
      if (this.projectManagementConfigService) {
        previousPmConfig = await this.projectManagementConfigService.getConfigById(providedConfigId);
      }
      
      await this.updateProjectManagementConfig(
        providedConfigId,
        existingConfig.appId,
        projectMgmtData,
        currentUserId
      );
      
      // Log project management config update
      if (this.activityLogService && previousPmConfig) {
        // Log base fields if changed
        const baseFieldChanges: Record<string, any> = {};
        const baseFieldNewValues: Record<string, any> = {};
        
        if (projectMgmtData.name !== undefined && projectMgmtData.name !== previousPmConfig.name) {
          baseFieldChanges.name = previousPmConfig.name;
          baseFieldNewValues.name = projectMgmtData.name;
        }
        if (projectMgmtData.description !== undefined && projectMgmtData.description !== previousPmConfig.description) {
          baseFieldChanges.description = previousPmConfig.description;
          baseFieldNewValues.description = projectMgmtData.description;
        }
        if (projectMgmtData.isActive !== undefined && projectMgmtData.isActive !== previousPmConfig.isActive) {
          baseFieldChanges.isActive = previousPmConfig.isActive;
          baseFieldNewValues.isActive = projectMgmtData.isActive;
        }
        
        if (Object.keys(baseFieldChanges).length > 0) {
          await this.activityLogService.registerConfigActivityLogs(
            existingConfig.id,
            currentUserId,
            new Date(),
            'PROJECT_MANAGEMENT_CONFIG',
            baseFieldChanges,
            baseFieldNewValues
          );
        }
        
        // Log platform configurations - each platform as separate row
        if (projectMgmtData.platformConfigurations) {
          const previousPlatforms = previousPmConfig.platformConfigurations || [];
          const newPlatforms = projectMgmtData.platformConfigurations || [];
          
          // Create maps for easy lookup
          const previousPlatformMap = new Map(
            previousPlatforms.map((p: any) => [p.platform, p])
          );
          const newPlatformMap = new Map(
            newPlatforms.map((p: any) => [p.platform, p])
          );
          
          // Get all unique platforms
          const allPlatforms = new Set([
            ...previousPlatformMap.keys(),
            ...newPlatformMap.keys()
          ]);
          
          // Log each platform change separately
          for (const platform of allPlatforms) {
            const prevPlatform = previousPlatformMap.get(platform) as any;
            const newPlatform = newPlatformMap.get(platform) as any;
            
            // Check if there's an actual change
            const prevStr = prevPlatform ? JSON.stringify(prevPlatform) : null;
            const newStr = newPlatform ? JSON.stringify(newPlatform) : null;
            
            if (prevStr !== newStr) {
              await this.activityLogService.registerConfigActivityLogs(
                existingConfig.id,
                currentUserId,
                new Date(),
                'PROJECT_MANAGEMENT_CONFIG',
                prevPlatform || null,
                newPlatform || null
              );
            }
          }
        }
      }
      
      return providedConfigId;
    }

    // Object without ID - only CREATE if there's no existing config
    if (existingConfigId) {
      console.log('[handleProjectManagementConfigId] No ID provided but existing config exists - keeping existing');
      return existingConfigId;
    }

    // No existing config and no ID provided - CREATE new
    console.log('[handleProjectManagementConfigId] Creating new config');
    const newConfigId = await this.createProjectManagementConfig(
      existingConfig.appId,
      existingConfig.name,
      projectMgmtData,  // Pass the extracted projectManagementConfig object, not full updateData
      currentUserId
    );
    
    // Log project management config creation (single row with all data)
    if (this.activityLogService && newConfigId) {
      await this.activityLogService.registerConfigActivityLogs(
        existingConfig.id,
        currentUserId,
        new Date(),
        'PROJECT_MANAGEMENT_CONFIG',
        null,
        { 
          name: projectMgmtData.name,
          description: projectMgmtData.description,
          isActive: projectMgmtData.isActive ?? true,
          platformConfigurations: projectMgmtData.platformConfigurations || []
        }
      );
    }
    
    return newConfigId;
  }

  /**
   * Update existing Project Management config
   */
  private async updateProjectManagementConfig(
    configId: string,
    appId: string,
    updateData: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.projectManagementConfigService) return;

    // Prepare data for mapper: mapper expects { appId, projectManagementConfig: {...} }
    // updateData is already the projectManagementConfig object from the request
    const normalizedData = {
      appId,
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
    appId: string,
    releaseConfigName: string,
    projectManagementConfigData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.projectManagementConfigService) return null;

    const normalizedData = {
      appId,
      projectManagementConfig: projectManagementConfigData
    };

    console.log('[createProjectManagementConfig] Creating new config with data:', JSON.stringify(projectManagementConfigData, null, 2));

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData as any,  // Cast to any for partial data during create
      currentUserId
    );

    if (!integrationConfigs.projectManagement) {
      console.log('[createProjectManagementConfig] Mapper returned null - no valid config data');
      return null;
    }

    const pmResult = await this.projectManagementConfigService.createConfig({
      appId,
      name: projectManagementConfigData.name || `PM Config for ${releaseConfigName}`,
      ...integrationConfigs.projectManagement,
      createdByAccountId: currentUserId
    });

    console.log('[createProjectManagementConfig] Config created with ID:', pmResult.id);
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
      
      // Get previous config for activity log before deletion
      let previousCommsConfig = null;
      if (existingConfig.commsConfigId && this.commConfigService) {
        previousCommsConfig = await this.commConfigService.getConfigById(existingConfig.commsConfigId);
      }
      
      // Delete the actual integration config from its table if it exists
      if (existingConfig.commsConfigId && this.commConfigService) {
        console.log('[handleCommsConfigId] Deleting config from DB:', existingConfig.commsConfigId);
        await this.commConfigService.deleteConfig(existingConfig.commsConfigId);
        console.log('[handleCommsConfigId] Config deleted successfully');
      }
      
      // Log communication config deletion
      if (this.activityLogService && previousCommsConfig) {
        await this.activityLogService.registerConfigActivityLogs(
          existingConfig.id,
          currentUserId,
          new Date(),
          'COMMUNICATION_CONFIG',
          { channelData: previousCommsConfig.channelData },
          null
        );
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
      
      // Get previous config for activity log before update
      let previousCommsConfig = null;
      if (this.commConfigService) {
        previousCommsConfig = await this.commConfigService.getConfigById(providedConfigId);
      }
      
      await this.updateCommsConfig(
        providedConfigId,
        existingConfig.appId,
        commsData,
        currentUserId
      );
      
      // Log communication config update
      if (this.activityLogService && previousCommsConfig) {
        await this.activityLogService.registerConfigActivityLogs(
          existingConfig.id,
          currentUserId,
          new Date(),
          'COMMUNICATION_CONFIG',
          { channelData: previousCommsConfig.channelData },
          { channelData: commsData.channelData }
        );
      }
      
      return providedConfigId;
    }

    // Object without ID - only CREATE if there's no existing config
    if (existingConfigId) {
      console.log('[handleCommsConfigId] No ID provided but existing config exists - keeping existing');
      return existingConfigId;
    }

    // No existing config and no ID provided - CREATE new
    console.log('[handleCommsConfigId] Creating new config');
    const newConfigId = await this.createCommsConfig(
      existingConfig.appId,
      commsData,  // Pass the extracted communicationConfig object, not full updateData
      currentUserId
    );
    
    // Log communication config creation
    if (this.activityLogService && newConfigId) {
      await this.activityLogService.registerConfigActivityLogs(
        existingConfig.id,
        currentUserId,
        new Date(),
        'COMMUNICATION_CONFIG',
        null,
        { channelData: commsData.channelData }
      );
    }
    
    return newConfigId;
  }

  /**
   * Update existing Communication config
   */
  private async updateCommsConfig(
    configId: string,
    appId: string,
    updateData: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.commConfigService) return;

    // Prepare data for mapper: mapper expects { appId, communicationConfig: {...} }
    // updateData is already the communicationConfig object from the request
    const normalizedData = {
      appId,
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
    appId: string,
    communicationConfigData: any,
    currentUserId: string
  ): Promise<string | null> {
    if (!this.commConfigService) return null;

    // communicationConfigData IS the communicationConfig object
    // Wrap it in the structure expected by the mapper
    const normalizedData = {
      appId,
      communicationConfig: communicationConfigData
    };

    console.log('[createCommsConfig] Creating new config with data:', JSON.stringify(communicationConfigData, null, 2));

    const integrationConfigs = IntegrationConfigMapper.prepareAllIntegrationConfigs(
      normalizedData as any,  // Cast to any for partial data during create
      currentUserId
    );

    console.log('[createCommsConfig] Integration configs.communication:', JSON.stringify(integrationConfigs.communication, null, 2));

    if (!integrationConfigs.communication) {
      console.log('[createCommsConfig] Mapper returned null - no valid config data');
      return null;
    }

    const createDto = {
      appId,
      channelData: integrationConfigs.communication.channelData
    };

    console.log('[createCommsConfig] Creating config with DTO:', JSON.stringify(createDto, null, 2));
    const commsResult = await this.commConfigService.createConfig(createDto);

    console.log('[createCommsConfig] Config created with ID:', commsResult.id);

    return commsResult.id;
  }

  // ============================================================================
  // RELEASE SCHEDULE HANDLERS (SRP: Separate orchestration, update, create)
  // NOTE: Schedule → Config relationship (schedule has releaseConfigId FK)
  // ============================================================================

  /**
   * Orchestrator: Handle Release Schedule (decides whether to update, create, or delete)
   * Pattern 2 (Null Convention):
   * - undefined (absent) → KEEP existing schedule
   * - null → REMOVE schedule
   * - object with id → UPDATE existing schedule (id must match)
   * - object without id → CREATE new schedule if none exists
   * 
   * NOTE: Unlike other integration configs, schedule is NOT stored on the config.
   * The schedule references the config via FK (release_schedules.releaseConfigId).
   */
  private async handleReleaseSchedule(
    existingConfig: ReleaseConfiguration,
    updateData: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.releaseScheduleService) {
      console.log('[handleReleaseSchedule] No schedule service configured, skipping');
      return;
    }

    // CRITICAL: Check for explicit presence
    let scheduleData;
    if ('releaseSchedule' in updateData) {
      scheduleData = updateData.releaseSchedule;
    } else {
      scheduleData = undefined;
    }

    // Fetch existing schedule (schedule references config)
    const existingSchedule = await this.releaseScheduleService.getByReleaseConfigId(existingConfig.id);

    // STATE 1: undefined (field absent) → KEEP existing
    if (scheduleData === undefined) {
      console.log('[handleReleaseSchedule] Field absent - keeping existing schedule');
      return;
    }

    // STATE 2: null (explicit null) → REMOVE (delete schedule)
    if (scheduleData === null) {
      console.log('[handleReleaseSchedule] Explicit null - removing schedule');
      
      if (existingSchedule) {
        console.log('[handleReleaseSchedule] Deleting schedule:', existingSchedule.id);
        await this.releaseScheduleService.delete(existingSchedule.id);
        console.log('[handleReleaseSchedule] Schedule deleted successfully');
      }
      
      return;
    }

    // STATE 3: object with ID → UPDATE existing schedule
    const providedScheduleId = scheduleData.id;
    
    if (providedScheduleId) {
      // Verify ID matches existing schedule
      if (!existingSchedule || providedScheduleId !== existingSchedule.id) {
        console.log('[handleReleaseSchedule] Provided ID does not match existing schedule - ignoring');
        console.log(`  Provided: ${providedScheduleId}, Existing: ${existingSchedule?.id ?? 'none'}`);
        return;
      }

      // IDs match - UPDATE existing schedule
      console.log('[handleReleaseSchedule] IDs match - updating existing schedule:', providedScheduleId);
      await this.updateReleaseSchedule(providedScheduleId, scheduleData, existingConfig.name);
      return;
    }

    // STATE 4: object without ID → CREATE new schedule (only if none exists)
    if (existingSchedule) {
      console.log('[handleReleaseSchedule] No ID provided but existing schedule exists - keeping existing');
      return;
    }

    // No existing schedule and no ID provided - CREATE new
    console.log('[handleReleaseSchedule] Creating new schedule for config:', existingConfig.id);
    await this.createReleaseSchedule(existingConfig, scheduleData, currentUserId);
  }

  /**
   * Update existing Release Schedule
   */
  private async updateReleaseSchedule(
    scheduleId: string,
    updateData: any,
    configName: string
  ): Promise<void> {
    if (!this.releaseScheduleService) return;

    // Build update DTO - only include fields that are provided
    const updateDto: any = {};

    if (updateData.releaseFrequency !== undefined) updateDto.releaseFrequency = updateData.releaseFrequency;
    if (updateData.firstReleaseKickoffDate !== undefined) updateDto.firstReleaseKickoffDate = updateData.firstReleaseKickoffDate;
    if (updateData.nextReleaseKickoffDate !== undefined) updateDto.nextReleaseKickoffDate = updateData.nextReleaseKickoffDate;
    if (updateData.initialVersions !== undefined) updateDto.initialVersions = updateData.initialVersions;
    if (updateData.kickoffReminderTime !== undefined) updateDto.kickoffReminderTime = updateData.kickoffReminderTime;
    if (updateData.kickoffTime !== undefined) updateDto.kickoffTime = updateData.kickoffTime;
    if (updateData.targetReleaseTime !== undefined) updateDto.targetReleaseTime = updateData.targetReleaseTime;
    if (updateData.targetReleaseDateOffsetFromKickoff !== undefined) updateDto.targetReleaseDateOffsetFromKickoff = updateData.targetReleaseDateOffsetFromKickoff;
    if (updateData.kickoffReminderEnabled !== undefined) updateDto.kickoffReminderEnabled = updateData.kickoffReminderEnabled;
    if (updateData.timezone !== undefined) updateDto.timezone = updateData.timezone;
    if (updateData.regressionSlots !== undefined) updateDto.regressionSlots = updateData.regressionSlots;
    if (updateData.workingDays !== undefined) updateDto.workingDays = updateData.workingDays;
    if (updateData.isEnabled !== undefined) updateDto.isEnabled = updateData.isEnabled;

    console.log('[updateReleaseSchedule] Updating schedule:', scheduleId, 'with:', JSON.stringify(updateDto, null, 2));

    await this.releaseScheduleService.update(scheduleId, updateDto, configName);
    console.log('[updateReleaseSchedule] Update completed for scheduleId:', scheduleId);
  }

  /**
   * Create new Release Schedule
   * Note: Schedule references config via FK, so we need the config object
   * 
   * After creating the schedule, immediately creates the first release
   * using initialVersions from the schedule configuration.
   */
  private async createReleaseSchedule(
    config: ReleaseConfiguration,
    scheduleData: any,
    currentUserId: string
  ): Promise<void> {
    if (!this.releaseScheduleService) return;

    console.log('[createReleaseSchedule] Creating schedule for config:', config.id);
    
    const schedule = await this.releaseScheduleService.create(
      config.id,           // releaseConfigId (FK)
      config.name,         // For Cronicle job title
      scheduleData,        // Schedule configuration
      config.appId,     // appId (denormalized)
      currentUserId        // createdByAccountId
    );

    console.log('[createReleaseSchedule] Created with ID:', schedule.id);
    // Note: First release is created automatically by ReleaseScheduleService.create()
  }

  /**
   * Delete config with cascade deletion of integration configs
   * 
   * Throws an error if any releases exist that use this config.
   * Note: We don't allow deletion even for completed releases to maintain
   * data integrity and historical reference.
   */
  async deleteConfig(id: string): Promise<boolean> {
    const config = await this.configRepo.findById(id);

    if (!config) {
      return false;
    }

    // Check if any releases exist for this config
    const hasReleases = await this.releaseRetrievalService.existsReleasesByConfigId(id);
    if (hasReleases) {
      throw new Error(
        `Cannot delete release config. One or more releases are associated with this config. ` +
        `Archive the config instead.`
      );
    }

    console.log('[deleteConfig] Deleting release config and associated integration configs:', id);

    // Delete associated integration configs before deleting the release config
    await this.cascadeDeleteIntegrationConfigs(config);

    // Delete activity logs (Note: Database has ON DELETE CASCADE, but explicit deletion for clarity)
    if (this.activityLogRepository) {
      console.log('[deleteConfig] Deleting activity logs for config:', id);
      await this.activityLogRepository.deleteByReleaseConfigId(id);
      console.log('[deleteConfig] Activity logs deleted successfully');
    }

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
        await this.cicdConfigService.deleteConfig(config.ciConfigId, config.appId);
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

    // Delete Release Schedule if exists (schedule references config via FK)
    // Note: FK cascade should handle this, but we also delete Cronicle job here
    if (this.releaseScheduleService) {
      console.log('[cascadeDeleteIntegrationConfigs] Deleting Release Schedule for config:', config.id);
      try {
        await this.releaseScheduleService.deleteByReleaseConfigId(config.id);
        console.log('[cascadeDeleteIntegrationConfigs] Release Schedule deleted successfully');
      } catch (error) {
        console.error('[cascadeDeleteIntegrationConfigs] Failed to delete Release Schedule:', error);
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

