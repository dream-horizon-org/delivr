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
   */
  static prepareTestManagementConfig(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): Omit<CreateTestManagementConfigDto, 'name'> | null {
    if (!requestData.testManagement) {
      return null;
    }

    return {
      tenantId: requestData.tenantId,
      integrationId: requestData.testManagement.integrationId,
      projectId: requestData.testManagement.projectId, // Checkmate project ID
      passThresholdPercent: requestData.testManagement.passThresholdPercent ?? 100,
      platformConfigurations: requestData.testManagement.platformConfigurations ?? [],
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
    if (!requestData.workflows || requestData.workflows.length === 0) {
      return null;
    }

    return {
      tenantId: requestData.tenantId,
      workflows: requestData.workflows,
      createdByAccountId: currentUserId
    };
  }

  /**
   * Prepare communication config from request data
   * TODO: Return proper CreateCommunicationConfigDto when Communication integration implements types
   */
  static prepareCommunicationConfig(requestData: CreateReleaseConfigRequest): any | null {
    if (!requestData.communication) {
      return null;
    }

    return {
      tenantId: requestData.tenantId,
      channelData: requestData.communication.channelData
    };
  }


  /**
   * Prepare project management config from request data
   * TODO: Return proper CreateProjectManagementConfigDto when Project Management integration implements types
   */
  static prepareProjectManagementConfig(
    requestData: CreateReleaseConfigRequest,
    currentUserId: string
  ): any | null {
    if (!requestData.projectManagement) {
      return null;
    }

    return {
      tenantId: requestData.tenantId,
      integrationId: requestData.projectManagement.integrationId,
      name: requestData.projectManagement.name,
      description: requestData.projectManagement.description,
      platformConfigurations: requestData.projectManagement.platformConfigurations,
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
