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
   * Validate that integration is Checkmate
   * Metadata APIs are Checkmate-specific
   */
  private validateCheckmateIntegration(providerType: string, integrationId: string): void {
    const isCheckmate = providerType === TestManagementProviderType.CHECKMATE;
    
    if (!isCheckmate) {
      throw new Error(
        `Checkmate metadata APIs are only supported for Checkmate integrations. Integration ${integrationId} is ${providerType}`
      );
    }
  }

  /**
   * Get all projects for an organization
   */
  async getProjects(integrationId: string): Promise<CheckmateProjectsResponse> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    this.validateCheckmateIntegration(integration.providerType, integrationId);

    const provider = new CheckmateProvider();
    const response = await provider.getProjects(integration.config);
    
    return response;
  }

  /**
   * Get all sections for a project
   */
  async getSections(integrationId: string, projectId: number): Promise<CheckmateSectionsResponse> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    this.validateCheckmateIntegration(integration.providerType, integrationId);

    const provider = new CheckmateProvider();
    const response = await provider.getSections(integration.config, projectId);
    
    return response;
  }

  /**
   * Get all labels for a project
   */
  async getLabels(integrationId: string, projectId: number): Promise<CheckmateLabelsResponse> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    this.validateCheckmateIntegration(integration.providerType, integrationId);

    const provider = new CheckmateProvider();
    const response = await provider.getLabels(integration.config, projectId);
    
    return response;
  }

  /**
   * Get all squads for a project
   */
  async getSquads(integrationId: string, projectId: number): Promise<CheckmateSquadsResponse> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    this.validateCheckmateIntegration(integration.providerType, integrationId);

    const provider = new CheckmateProvider();
    const response = await provider.getSquads(integration.config, projectId);
    
    return response;
  }
}

