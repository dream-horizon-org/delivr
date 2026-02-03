/**
 * Checkmate Metadata Service
 * 
 * Service for fetching Checkmate-specific metadata
 * (projects, sections, labels, squads) through project integrations
 */

import type { TenantTestManagementIntegrationRepository } from '~models/integrations/test-management/tenant-integration';
import { TestManagementProviderType } from '~types/integrations/test-management';
import type {
  CheckmateLabelsResponse,
  CheckmateMetadataResult,
  CheckmateProjectsResponse,
  CheckmateSectionsResponse,
  CheckmateSquadsResponse
} from '../../providers/checkmate/checkmate.interface';
import { CheckmateProvider } from '../../providers/checkmate/checkmate.provider';

export class CheckmateMetadataService {
  constructor(
    private readonly integrationRepo: TenantTestManagementIntegrationRepository
  ) {}


  /**
   * Get all projects for an organization
   * Returns result object instead of throwing exceptions
   */
  async getProjects(integrationId: string): Promise<CheckmateMetadataResult<CheckmateProjectsResponse>> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      return {
        success: false,
        message: 'Integration not found',
        statusCode: 404
      };
    }

    // Validate integration is Checkmate
    const isCheckmate = integration.providerType === TestManagementProviderType.CHECKMATE;
    if (!isCheckmate) {
      return {
        success: false,
        message: `Checkmate metadata APIs are only supported for Checkmate integrations. Integration ${integrationId} is ${integration.providerType}`,
        statusCode: 400
      };
    }

    const provider = new CheckmateProvider();
    const result = await provider.getProjectsWithResult(integration.config);
    
    return result;
  }

  /**
   * Get all sections for a project
   * Returns result object instead of throwing exceptions
   */
  async getSections(integrationId: string, projectId: number): Promise<CheckmateMetadataResult<CheckmateSectionsResponse>> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      return {
        success: false,
        message: 'Integration not found',
        statusCode: 404
      };
    }

    // Validate integration is Checkmate
    const isCheckmate = integration.providerType === TestManagementProviderType.CHECKMATE;
    if (!isCheckmate) {
      return {
        success: false,
        message: `Checkmate metadata APIs are only supported for Checkmate integrations. Integration ${integrationId} is ${integration.providerType}`,
        statusCode: 400
      };
    }

    const provider = new CheckmateProvider();
    const result = await provider.getSectionsWithResult(integration.config, projectId);
    
    return result;
  }

  /**
   * Get all labels for a project
   * Returns result object instead of throwing exceptions
   */
  async getLabels(integrationId: string, projectId: number): Promise<CheckmateMetadataResult<CheckmateLabelsResponse>> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      return {
        success: false,
        message: 'Integration not found',
        statusCode: 404
      };
    }

    // Validate integration is Checkmate
    const isCheckmate = integration.providerType === TestManagementProviderType.CHECKMATE;
    if (!isCheckmate) {
      return {
        success: false,
        message: `Checkmate metadata APIs are only supported for Checkmate integrations. Integration ${integrationId} is ${integration.providerType}`,
        statusCode: 400
      };
    }

    const provider = new CheckmateProvider();
    const result = await provider.getLabelsWithResult(integration.config, projectId);
    
    return result;
  }

  /**
   * Get all squads for a project
   * Returns result object instead of throwing exceptions
   */
  async getSquads(integrationId: string, projectId: number): Promise<CheckmateMetadataResult<CheckmateSquadsResponse>> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      return {
        success: false,
        message: 'Integration not found',
        statusCode: 404
      };
    }

    // Validate integration is Checkmate
    const isCheckmate = integration.providerType === TestManagementProviderType.CHECKMATE;
    if (!isCheckmate) {
      return {
        success: false,
        message: `Checkmate metadata APIs are only supported for Checkmate integrations. Integration ${integrationId} is ${integration.providerType}`,
        statusCode: 400
      };
    }

    const provider = new CheckmateProvider();
    const result = await provider.getSquadsWithResult(integration.config, projectId);
    
    return result;
  }
}

