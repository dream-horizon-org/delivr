/**
 * App Service
 * Business logic for App entity management (renamed from Tenant)
 */

import { v4 as uuidv4 } from 'uuid';
import { AppRepository } from '~models/app';
import { AppPlatformTargetRepository } from '~models/app-platform-target';
import type {
  AppAttributes,
  CreateAppRequest,
  UpdateAppRequest,
  AppWithPlatformTargets
} from '~types/app.types';
import type {
  ConfigurePlatformTargetsRequest
} from '~types/app-platform-target.types';
import type { Sequelize } from 'sequelize';

export class AppService {
  constructor(
    private readonly appRepository: AppRepository,
    private readonly appPlatformTargetRepository: AppPlatformTargetRepository,
    private readonly sequelize: Sequelize
  ) {}

  /**
   * Create a new app
   * Note: Collaborator creation is handled by storage layer methods (e.g., storage.addOrgApp)
   */
  async createApp(
    orgId: string,
    appData: CreateAppRequest,
    accountId: string
  ): Promise<AppWithPlatformTargets> {
    // Validate organizationId matches
    if (appData.organizationId && appData.organizationId !== orgId) {
      throw new Error(`Organization ID mismatch: expected ${orgId}, got ${appData.organizationId}`);
    }

    // Generate app ID
    const appId = uuidv4();

    // Create the app
    const app = await this.appRepository.create({
      id: appId,
      name: appData.name,
      displayName: appData.displayName,
      description: appData.description,
      organizationId: orgId,
      createdBy: accountId
    });

    // Note: Collaborator creation should be handled by the caller using storage methods
    // This keeps the service focused on app management only

    // Return app with empty platform targets (can be configured later)
    return {
      ...app,
      platformTargets: []
    };
  }

  /**
   * Get app by ID
   */
  async getApp(orgId: string, appId: string): Promise<AppWithPlatformTargets | null> {
    const app = await this.appRepository.findByIdWithPlatformTargets(appId);
    
    // Validate app belongs to organization
    if (app && app.organizationId !== orgId) {
      return null;
    }
    
    return app;
  }

  /**
   * List all apps for an organization
   */
  async listApps(orgId: string): Promise<AppWithPlatformTargets[]> {
    const apps = await this.appRepository.findByOrganizationId(orgId);
    
    // Fetch platform targets for each app
    const appsWithTargets = await Promise.all(
      apps.map(async (app) => {
        const platformTargets = await this.appPlatformTargetRepository.findByAppId(app.id, true);
        return {
          ...app,
          platformTargets
        };
      })
    );

    return appsWithTargets;
  }

  /**
   * Get all apps created by an account
   */
  async getAppsByCreator(accountId: string): Promise<AppWithPlatformTargets[]> {
    const apps = await this.appRepository.findByCreatedBy(accountId);
    
    // Fetch platform targets for each app
    const appsWithTargets = await Promise.all(
      apps.map(async (app) => {
        const platformTargets = await this.appPlatformTargetRepository.findByAppId(app.id, true);
        return {
          ...app,
          platformTargets
        };
      })
    );

    return appsWithTargets;
  }

  /**
   * Update an app
   */
  async updateApp(
    orgId: string,
    appId: string,
    updates: UpdateAppRequest
  ): Promise<AppAttributes | null> {
    // Validate app belongs to organization
    const app = await this.appRepository.findById(appId);
    if (!app || app.organizationId !== orgId) {
      return null;
    }

    return await this.appRepository.update(appId, updates);
  }

  /**
   * Delete an app
   * Note: This will cascade delete related entities (collaborators, platform targets, etc.)
   * Collaborators are handled by database cascade or storage layer methods
   */
  async deleteApp(orgId: string, appId: string): Promise<boolean> {
    // Validate app belongs to organization
    const app = await this.appRepository.findById(appId);
    if (!app || app.organizationId !== orgId) {
      return false;
    }

    // Check for dependencies (releases, integrations, etc.)
    // For now, we'll allow deletion - cascade will handle related data
    
    // Delete platform targets first
    const platformTargets = await this.appPlatformTargetRepository.findByAppId(appId);
    for (const pt of platformTargets) {
      await this.appPlatformTargetRepository.delete(pt.id);
    }

    // Note: Collaborator deletion is handled by database cascade or storage layer methods

    // Delete the app
    return await this.appRepository.delete(appId);
  }

  /**
   * Configure platform targets for an app
   * Note: This method is part of AppService but delegates to AppPlatformTargetService
   * Keeping for backward compatibility, but should use AppPlatformTargetService directly
   */
  async configurePlatformTargets(
    appId: string,
    platformTargets: ConfigurePlatformTargetsRequest
  ): Promise<AppWithPlatformTargets> {
    // Validate app exists
    const app = await this.appRepository.findById(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    // Configure platform targets
    await this.appPlatformTargetRepository.configureForApp(appId, platformTargets);

    // Return app with updated platform targets
    // Note: getApp now requires orgId, but we can get it from the app we just fetched
    if (!app.organizationId) {
      throw new Error(`App ${appId} does not have an organization ID`);
    }
    const updatedApp = await this.getApp(app.organizationId, appId);
    if (!updatedApp) {
      throw new Error(`Failed to retrieve app after platform target configuration: ${appId}`);
    }

    return updatedApp;
  }

  /**
   * Validate platform targets against app configuration
   */
  async validatePlatformTargets(
    appId: string,
    requestedPlatformTargets: Array<{ platform: string; target: string }>
  ): Promise<{ valid: boolean; invalid: Array<{ platform: string; target: string }> }> {
    // Get app's configured platform targets
    const configuredTargets = await this.appPlatformTargetRepository.findByAppId(appId, true);

    // Create a set of valid combinations
    const validCombinations = new Set(
      configuredTargets.map(pt => `${pt.platform}:${pt.target}`)
    );

    // Check requested targets
    const invalid: Array<{ platform: string; target: string }> = [];
    for (const requested of requestedPlatformTargets) {
      const key = `${requested.platform}:${requested.target}`;
      if (!validCombinations.has(key)) {
        invalid.push(requested);
      }
    }

    return {
      valid: invalid.length === 0,
      invalid
    };
  }
}
