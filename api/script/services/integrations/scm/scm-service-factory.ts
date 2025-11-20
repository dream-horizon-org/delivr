// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { getStorage } from '../../storage/storage-instance';
import { GitHubService } from './github-service';
import { SCMType, SCMConfig } from './scm-types';

/**
 * SCM Service Factory
 * Creates appropriate SCM service instance based on tenant's SCM integration
 */
export class SCMServiceFactory {
  /**
   * Create SCM service for a specific tenant
   */
  static async createForTenant(tenantId: string): Promise<GitHubService> {
    const storage = getStorage();
    
    // Get SCM controller
    const scmController = (storage as any).scmController;
    if (!scmController) {
      throw new Error('SCM controller not initialized');
    }

    // Find active SCM integration for tenant
    const integrations = await scmController.findAll({
      tenantId,
      isActive: true
    });

    if (!integrations || integrations.length === 0) {
      throw new Error(`No active SCM integration found for tenant ${tenantId}`);
    }

    const integration = integrations[0]; // Use first active integration

    // Build SCM config
    const scmConfig: SCMConfig = {
      scmType: integration.scmType as SCMType,
      owner: integration.owner,
      repo: integration.repoName,
      accessToken: integration.accessToken,
      webhookSecret: integration.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET
    };

    // Create appropriate service based on SCM type
    switch (scmConfig.scmType) {
      case SCMType.GITHUB:
        return new GitHubService(scmConfig);
      
      case SCMType.GITLAB:
      case SCMType.BITBUCKET:
        throw new Error(`${scmConfig.scmType} is not yet supported`);
      
      default:
        throw new Error(`Unknown SCM type: ${scmConfig.scmType}`);
    }
  }

  /**
   * Create SCM service with explicit configuration
   */
  static create(config: SCMConfig): GitHubService {
    switch (config.scmType) {
      case SCMType.GITHUB:
        return new GitHubService(config);
      
      case SCMType.GITLAB:
      case SCMType.BITBUCKET:
        throw new Error(`${config.scmType} is not yet supported`);
      
      default:
        throw new Error(`Unknown SCM type: ${config.scmType}`);
    }
  }

  /**
   * Validate SCM configuration
   */
  static validateConfig(config: Partial<SCMConfig>): config is SCMConfig {
    return !!(
      config.scmType &&
      config.owner &&
      config.repo &&
      config.accessToken
    );
  }
}

