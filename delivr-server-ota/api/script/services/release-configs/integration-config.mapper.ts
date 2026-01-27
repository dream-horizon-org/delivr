/**
 * Integration Config Mapper
 * Responsible for preparing integration configurations from request data
 */

import type { 
  CreateReleaseConfigRequest
} from '~types/release-configs';
// TODO: Import actual integration types when implemented:
// import type { CreateCIConfigDto } from '~types/integrations/ci/ci-config';
// import type { CreateCommunicationConfigDto } from '~types/integrations/communication/communication-config';
// import type { CreateSCMConfigDto } from '~types/integrations/scm/scm-config';
// import type { CreateProjectManagementConfigDto } from '~types/integrations/project-management/project-management-config';
import type { CreateTestManagementConfigDto } from '~types/integrations/test-management/test-management-config';

export class IntegrationConfigMapper {
  /**
   * Prepare test management config from request data
   * Returns CreateTestManagementConfigDto directly from test-management interface
   * STANDARDIZED: Uses testManagementConfig key (with Config suffix)
   */
  static prepareTestManagementConfig(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): Omit<CreateTestManagementConfigDto, 'name'> | null {
    if (!requestData.testManagementConfig) {
      return null;
    }

    return {
      appId: requestData.appId,
      integrationId: requestData.testManagementConfig.integrationId,
      passThresholdPercent: requestData.testManagementConfig.passThresholdPercent ?? 100,
      platformConfigurations: requestData.testManagementConfig.platformConfigurations ?? [],
      createdByAccountId: currentUserId
    };
  }

  /**
   * Prepare CI config from request data
   * TODO: Return proper CreateCIConfigDto when CI integration implements types
   */
  static prepareCIConfig(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): any | null {
    if (!requestData.ciConfig || !requestData.ciConfig.workflows || requestData.ciConfig.workflows.length === 0) {
      return null;
    }

    return {
      appId: requestData.appId,
      workflows: requestData.ciConfig.workflows,
      createdByAccountId: currentUserId
    };
  }

  /**
   * Prepare communication config from request data
   * TODO: Return proper CreateCommunicationConfigDto when Communication integration implements types
   * STANDARDIZED: Uses communicationConfig key (with Config suffix)
   */
  static prepareCommunicationConfig(requestData: CreateReleaseConfigRequest): any | null {
    if (!requestData.communicationConfig) {
      return null;
    }

    return {
      appId: requestData.appId,
      channelData: requestData.communicationConfig.channelData
    };
  }


  /**
   * Prepare project management config from request data
   * TODO: Return proper CreateProjectManagementConfigDto when Project Management integration implements types
   * STANDARDIZED: Uses projectManagementConfig key (with Config suffix)
   */
  static prepareProjectManagementConfig(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): any | null {
    if (!requestData.projectManagementConfig) {
      return null;
    }

    return {
      appId: requestData.appId,
      integrationId: requestData.projectManagementConfig.integrationId,
      name: requestData.projectManagementConfig.name,
      description: requestData.projectManagementConfig.description,
      platformConfigurations: requestData.projectManagementConfig.platformConfigurations,
      createdByAccountId: currentUserId
    };
  }

  /**
   * Prepare all integration configs at once
   */
  static prepareAllIntegrationConfigs(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): IntegrationConfigs {
    return {
      ci: this.prepareCIConfig(requestData, currentUserId),
      testManagement: this.prepareTestManagementConfig(requestData, currentUserId),
      communication: this.prepareCommunicationConfig(requestData),
      projectManagement: this.prepareProjectManagementConfig(requestData, currentUserId)
    };
  }
}

/**
 * Container for all integration configs
 * TODO: Replace 'any' with proper DTOs when integrations implement their types
 */
export interface IntegrationConfigs {
  ci: any | null; // TODO: CreateCIConfigDto
  testManagement: Omit<CreateTestManagementConfigDto, 'name'> | null;
  communication: any | null; // TODO: CreateCommunicationConfigDto
  projectManagement: any | null; // TODO: CreateProjectManagementConfigDto
}
