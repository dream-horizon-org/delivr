/**
 * App Platform Target Service
 * Business logic for app platform-target configurations
 */

import { v4 as uuidv4 } from 'uuid';
import { AppPlatformTargetRepository } from '~models/app-platform-target';
import { AppRepository } from '~models/app';
import type {
  AppPlatformTargetAttributes,
  CreateAppPlatformTargetRequest,
  UpdateAppPlatformTargetRequest,
  ConfigurePlatformTargetsRequest
} from '~types/app-platform-target.types';

export class AppPlatformTargetService {
  constructor(
    private readonly appPlatformTargetRepository: AppPlatformTargetRepository,
    private readonly appRepository: AppRepository
  ) {}

  /**
   * Configure platform targets for an app (replace all existing ones)
   */
  async configurePlatformTargets(
    appId: string,
    data: ConfigurePlatformTargetsRequest
  ): Promise<AppPlatformTargetAttributes[]> {
    // Validate app exists
    const app = await this.appRepository.findById(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    // Validate platform-target combinations
    this.validatePlatformTargetCombinations(data.platformTargets);

    // Configure platform targets (replaces existing)
    return await this.appPlatformTargetRepository.configureForApp(appId, data);
  }

  /**
   * Get all platform targets for an app
   */
  async getPlatformTargets(
    appId: string,
    activeOnly: boolean = false
  ): Promise<AppPlatformTargetAttributes[]> {
    // Validate app exists
    const app = await this.appRepository.findById(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    return await this.appPlatformTargetRepository.findByAppId(appId, activeOnly);
  }

  /**
   * Get platform targets by platform
   */
  async getPlatformTargetsByPlatform(
    appId: string,
    platform: AppPlatformTargetAttributes['platform']
  ): Promise<AppPlatformTargetAttributes[]> {
    // Validate app exists
    const app = await this.appRepository.findById(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    return await this.appPlatformTargetRepository.findByAppIdAndPlatform(appId, platform);
  }

  /**
   * Create a new platform target
   */
  async createPlatformTarget(
    appId: string,
    data: CreateAppPlatformTargetRequest
  ): Promise<AppPlatformTargetAttributes> {
    // Validate app exists
    const app = await this.appRepository.findById(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    // Check if combination already exists
    const existing = await this.appPlatformTargetRepository.findByAppIdAndPlatformAndTarget(
      appId,
      data.platform,
      data.target
    );

    if (existing) {
      throw new Error(
        `Platform-target combination already exists: ${data.platform}-${data.target}`
      );
    }

    // Validate platform-target combination
    this.validatePlatformTargetCombination(data.platform, data.target);

    // Create platform target
    return await this.appPlatformTargetRepository.create({
      id: uuidv4(),
      appId,
      platform: data.platform,
      target: data.target,
      isActive: data.isActive ?? true
    });
  }

  /**
   * Update a platform target
   */
  async updatePlatformTarget(
    appId: string,
    platformTargetId: string,
    updates: UpdateAppPlatformTargetRequest
  ): Promise<AppPlatformTargetAttributes | null> {
    // Validate platform target belongs to app
    const platformTarget = await this.appPlatformTargetRepository.findById(platformTargetId);
    if (!platformTarget) {
      return null;
    }

    if (platformTarget.appId !== appId) {
      throw new Error(
        `Platform target ${platformTargetId} does not belong to app ${appId}`
      );
    }

    // Validate if updating platform/target combination
    if (updates.platform || updates.target) {
      const newPlatform = updates.platform ?? platformTarget.platform;
      const newTarget = updates.target ?? platformTarget.target;

      // Check if new combination already exists (excluding current)
      const existing = await this.appPlatformTargetRepository.findByAppIdAndPlatformAndTarget(
        appId,
        newPlatform,
        newTarget
      );

      if (existing && existing.id !== platformTargetId) {
        throw new Error(
          `Platform-target combination already exists: ${newPlatform}-${newTarget}`
        );
      }

      // Validate combination
      this.validatePlatformTargetCombination(newPlatform, newTarget);
    }

    return await this.appPlatformTargetRepository.update(platformTargetId, updates);
  }

  /**
   * Delete a platform target
   */
  async deletePlatformTarget(
    appId: string,
    platformTargetId: string
  ): Promise<boolean> {
    // Validate platform target belongs to app
    const platformTarget = await this.appPlatformTargetRepository.findById(platformTargetId);
    if (!platformTarget) {
      return false;
    }

    if (platformTarget.appId !== appId) {
      throw new Error(
        `Platform target ${platformTargetId} does not belong to app ${appId}`
      );
    }

    return await this.appPlatformTargetRepository.delete(platformTargetId);
  }

  /**
   * Activate/deactivate a platform target
   */
  async setPlatformTargetActive(
    appId: string,
    platformTargetId: string,
    isActive: boolean
  ): Promise<AppPlatformTargetAttributes | null> {
    // Validate platform target belongs to app
    const platformTarget = await this.appPlatformTargetRepository.findById(platformTargetId);
    if (!platformTarget) {
      return null;
    }

    if (platformTarget.appId !== appId) {
      throw new Error(
        `Platform target ${platformTargetId} does not belong to app ${appId}`
      );
    }

    return await this.appPlatformTargetRepository.setActive(platformTargetId, isActive);
  }

  /**
   * Validate platform targets against app configuration
   */
  async validatePlatformTargetsAgainstApp(
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

  /**
   * Validate platform-target combination
   */
  private validatePlatformTargetCombination(
    platform: AppPlatformTargetAttributes['platform'],
    target: AppPlatformTargetAttributes['target']
  ): void {
    // Valid combinations:
    // ANDROID -> PLAY_STORE, DOTA
    // IOS -> APP_STORE, TESTFLIGHT, FIREBASE, DOTA
    // WEB -> WEB, DOTA

    const validCombinations: Record<string, string[]> = {
      ANDROID: ['PLAY_STORE', 'DOTA'],
      IOS: ['APP_STORE', 'TESTFLIGHT', 'FIREBASE', 'DOTA'],
      WEB: ['WEB', 'DOTA']
    };

    const validTargets = validCombinations[platform];
    if (!validTargets || !validTargets.includes(target)) {
      throw new Error(
        `Invalid platform-target combination: ${platform}-${target}. ` +
        `Valid targets for ${platform}: ${validTargets.join(', ')}`
      );
    }
  }

  /**
   * Validate multiple platform-target combinations
   */
  private validatePlatformTargetCombinations(
    platformTargets: Array<{ platform: string; target: string }>
  ): void {
    for (const pt of platformTargets) {
      this.validatePlatformTargetCombination(
        pt.platform as AppPlatformTargetAttributes['platform'],
        pt.target as AppPlatformTargetAttributes['target']
      );
    }
  }
}
