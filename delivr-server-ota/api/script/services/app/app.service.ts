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
import type { Storage } from '~storage/storage';

export class AppService {
  constructor(
    private readonly appRepository: AppRepository,
    private readonly appPlatformTargetRepository: AppPlatformTargetRepository,
    private readonly sequelize: Sequelize,
    private readonly storage?: Storage
  ) {}

  /**
   * Normalize organizationId so null and '' are treated as the same "no org".
   */
  private normalizeOrgId(value: string | null | undefined): string {
    return value ?? '';
  }

  /**
   * Create a new app and add creator as Owner collaborator when storage is available.
   */
  async createApp(
    orgId: string,
    appData: CreateAppRequest,
    accountId: string
  ): Promise<AppWithPlatformTargets> {
    const effectiveOrgId = this.normalizeOrgId(orgId);
    if (appData.organizationId && this.normalizeOrgId(appData.organizationId) !== effectiveOrgId) {
      throw new Error(`Organization ID mismatch: expected ${orgId}, got ${appData.organizationId}`);
    }

    const appId = uuidv4();
    const app = await this.appRepository.create({
      id: appId,
      name: appData.name,
      displayName: appData.displayName,
      description: appData.description,
      organizationId: effectiveOrgId,
      createdBy: accountId
    });

    if (this.storage) {
      try {
        const account = await this.storage.getAccount(accountId);
        await this.storage.addOrgAppCollaborator(appId, account.email, 'Owner');
      } catch (err) {
        // Log but do not fail create; caller may add collaborator separately
        console.warn('[AppService.createApp] Failed to add creator as collaborator:', err);
      }
    }

    return {
      ...app,
      platformTargets: []
    };
  }

  /**
   * Get app by ID. When app not in App table and accountId + storage provided, fallback to getOrgApps (migration).
   */
  async getApp(orgId: string, appId: string, accountId?: string): Promise<AppWithPlatformTargets | null> {
    let app = await this.appRepository.findByIdWithPlatformTargets(appId);
    const effectiveOrgId = this.normalizeOrgId(orgId);
    const appOrgId = this.normalizeOrgId(app?.organizationId);

    if (app && appOrgId !== effectiveOrgId) {
      return null;
    }

    if (!app && accountId && this.storage?.getOrgApps) {
      const orgApps = await this.storage.getOrgApps(accountId);
      const orgApp = orgApps?.find((t) => t.id === appId);
      if (orgApp) {
        app = {
          id: orgApp.id,
          name: orgApp.displayName ?? orgApp.id,
          organizationId: null,
          displayName: orgApp.displayName,
          isActive: true,
          createdBy: orgApp.createdBy,
          createdAt: new Date(orgApp.createdTime ?? Date.now()),
          updatedAt: new Date(orgApp.createdTime ?? Date.now()),
          platformTargets: []
        };
      }
    }

    return app;
  }

  /**
   * List all apps for an organization. For "no org" (effectiveOrgId === ''), when accountId is provided
   * uses storage.getOrgApps to return only apps the user can see; otherwise uses findByOrganizationIdOrNull.
   */
  async listApps(orgId: string, accountId?: string): Promise<AppWithPlatformTargets[]> {
    const effectiveOrgId = this.normalizeOrgId(orgId);

    let apps: AppAttributes[];
    if (effectiveOrgId === '') {
      if (accountId && this.storage?.getOrgApps) {
        const orgApps = await this.storage.getOrgApps(accountId);
        const results: (AppWithPlatformTargets & { role?: string })[] = [];
        for (const orgApp of orgApps) {
          const full = await this.getApp('', orgApp.id, accountId);
          if (full) results.push({ ...full, role: orgApp.role });
        }
        return results;
      }
      apps = await this.appRepository.findByOrganizationIdOrNull();
    } else {
      apps = await this.appRepository.findByOrganizationId(effectiveOrgId);
    }

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
    const app = await this.appRepository.findById(appId);
    const effectiveOrgId = this.normalizeOrgId(orgId);
    const appOrgId = this.normalizeOrgId(app?.organizationId);

    if (!app || appOrgId !== effectiveOrgId) {
      return null;
    }

    return await this.appRepository.update(appId, updates);
  }

  /**
   * Delete an app. When storage is available, delegates to storage.removeOrgApp (soft-delete + DOTA cleanup).
   * Otherwise performs in-service delete (platform targets then hard delete).
   */
  async deleteApp(orgId: string, appId: string, accountId: string): Promise<boolean> {
    const app = await this.appRepository.findById(appId);
    const effectiveOrgId = this.normalizeOrgId(orgId);
    const appOrgId = this.normalizeOrgId(app?.organizationId);

    if (!app || appOrgId !== effectiveOrgId) {
      return false;
    }

    if (this.storage?.removeOrgApp) {
      await this.storage.removeOrgApp(accountId, appId);
      return true;
    }

    const platformTargets = await this.appPlatformTargetRepository.findByAppId(appId);
    for (const pt of platformTargets) {
      await this.appPlatformTargetRepository.delete(pt.id);
    }
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

    // Return app with updated platform targets (use normalized orgId for getApp)
    const updatedApp = await this.getApp(this.normalizeOrgId(app.organizationId), appId);
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
