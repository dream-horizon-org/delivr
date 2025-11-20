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
  UpdateReleaseConfigDto
} from '~types/release-configs';
import { hasAtLeastOneIntegration } from './release-config.validation';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-');

// ============================================================================
// INTEGRATION SERVICE INTERFACES (Placeholder)
// ============================================================================

interface CIIntegrationService {
  createConfig(buildPipelines: any[]): Promise<string>;
}

interface CommsIntegrationService {
  createConfig(communication: any): Promise<string>;
}

interface JiraIntegrationService {
  createConfig(jiraConfig: any): Promise<string>;
}

interface SCMIntegrationService {
  createConfig(scmConfig: any): Promise<string>;
}

// Placeholder service instances (will be injected)
const ciService: CIIntegrationService = {
  createConfig: async (buildPipelines: any[]): Promise<string> => {
    console.log('Creating CI config for all pipelines:', buildPipelines);
    return `ci_all_pipelines_${Date.now()}`;
  }
};

const commsService: CommsIntegrationService = {
  createConfig: async (communication: any): Promise<string> => {
    console.log('Creating Communications config:', communication);
    return `comms_${Date.now()}`;
  }
};

const jiraService: JiraIntegrationService = {
  createConfig: async (jiraConfig: any): Promise<string> => {
    console.log('Creating Jira config:', jiraConfig);
    return `jira_${Date.now()}`;
  }
};

const scmService: SCMIntegrationService = {
  createConfig: async (scmConfig: any): Promise<string> => {
    console.log('Creating SCM config:', scmConfig);
    return `scm_${Date.now()}`;
  }
};

export class ReleaseConfigService {
  constructor(
    private readonly configRepo: ReleaseConfigRepository,
    private readonly testManagementConfigService?: TestManagementConfigService
  ) {}

  /**
   * Create release config with integration orchestration
   */
  async createConfig(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): Promise<ReleaseConfiguration> {
    // Step 1: Orchestrate integration config creation
    const integrationConfigIds = await this.createIntegrationConfigs(requestData, currentUserId);

    // Step 2: Validate business rules (after integration processing)
    const hasIntegration = hasAtLeastOneIntegration(integrationConfigIds);
    if (!hasIntegration) {
      throw new Error('At least one integration must be configured for a release profile');
    }

    // Step 3: Check if configuration name already exists for this tenant
    const existing = await this.configRepo.findByTenantIdAndName(requestData.organizationId, requestData.name);
    if (existing) {
      throw new Error('Configuration profile already exists');
    }

    // Step 4: If this is marked as default, unset any existing default
    if (requestData.isDefault) {
      await this.configRepo.unsetDefaultForTenant(requestData.organizationId);
    }

    // Step 5: Create release config in database
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

    return this.configRepo.create({
      ...createDto,
      id
    });
  }

  /**
   * Orchestrate integration config creation
   */
  private async createIntegrationConfigs(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): Promise<Partial<CreateReleaseConfigDto>> {
    const integrationConfigIds: Partial<CreateReleaseConfigDto> = {};

    // Process CI integration
    if (requestData.buildPipelines) {
      if (requestData.ciConfigId && requestData.ciConfigId.trim() !== '') {
        integrationConfigIds.ciConfigId = requestData.ciConfigId;
        console.log('Reusing existing CI config:', integrationConfigIds.ciConfigId);
      } else if (requestData.buildPipelines.length > 0) {
        integrationConfigIds.ciConfigId = await ciService.createConfig(requestData.buildPipelines);
        console.log('Created new CI config for all pipelines:', integrationConfigIds.ciConfigId);
      }
    }

    // Process Test Management integration
    if (requestData.testManagement && requestData.testManagement.enabled) {
      if (requestData.testManagement.id && requestData.testManagement.id.trim() !== '') {
        integrationConfigIds.testManagementConfigId = requestData.testManagement.id;
        console.log('Reusing existing TCM config:', integrationConfigIds.testManagementConfigId);
      } else if (this.testManagementConfigService) {
        const tcmConfig = await this.testManagementConfigService.createConfig({
          projectId: requestData.organizationId,
          integrationId: requestData.testManagement.integrationId,
          name: requestData.testManagement.name || `TCM Config for ${requestData.name}`,
          passThresholdPercent: requestData.testManagement.passThresholdPercent ?? 100,
          platformConfigurations: requestData.testManagement.platformConfigurations ?? [],
          createdByAccountId: currentUserId
        });
        integrationConfigIds.testManagementConfigId = tcmConfig.id;
        console.log('Created new TCM config via service:', integrationConfigIds.testManagementConfigId);
      } else {
        throw new Error('Test management config service not available');
      }
    }

    // Process Communications integration
    if (requestData.communication && requestData.communication.slack && requestData.communication.slack.enabled) {
      if (requestData.communication.id && requestData.communication.id.trim() !== '') {
        integrationConfigIds.commsConfigId = requestData.communication.id;
        console.log('Reusing existing Communications config:', integrationConfigIds.commsConfigId);
      } else {
        integrationConfigIds.commsConfigId = await commsService.createConfig(requestData.communication);
        console.log('Created new Communications config:', integrationConfigIds.commsConfigId);
      }
    }

    // TODO: Add SCM and Jira config creation when available

    return integrationConfigIds;
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

