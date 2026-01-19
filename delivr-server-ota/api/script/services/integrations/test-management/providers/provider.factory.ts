/**
 * Provider Factory - Creates instances of test management providers
 * Clean implementation using new architecture
 */

import { TestManagementProviderType } from '~types/integrations/test-management';
import type { ITestManagementProvider } from './provider.interface';
import { CheckmateProvider } from './checkmate/checkmate.provider';

export class ProviderFactory {
  private static providers: Map<string, ITestManagementProvider> = new Map();

  /**
   * Get provider instance by type
   */
  static getProvider(providerType: TestManagementProviderType): ITestManagementProvider {
    // Initialize provider if not already cached
    if (!this.providers.has(providerType)) {
      switch (providerType) {
        case TestManagementProviderType.CHECKMATE:
          this.providers.set(providerType, new CheckmateProvider());
          break;
        case TestManagementProviderType.TESTRAIL:
        case TestManagementProviderType.XRAY:
        case TestManagementProviderType.ZEPHYR:
          throw new Error(`Provider ${providerType} not yet implemented`);
        default:
          throw new Error(`Unsupported provider type: ${providerType}`);
      }
    }

    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider not found: ${providerType}`);
    }

    return provider;
  }

  /**
   * Check if provider is supported
   */
  static isSupported(providerType: TestManagementProviderType): boolean {
    return [
      TestManagementProviderType.CHECKMATE,
      TestManagementProviderType.TESTRAIL,
      TestManagementProviderType.XRAY,
      TestManagementProviderType.ZEPHYR
    ].includes(providerType);
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): TestManagementProviderType[] {
    return [
      TestManagementProviderType.CHECKMATE,
      TestManagementProviderType.TESTRAIL,
      TestManagementProviderType.XRAY,
      TestManagementProviderType.ZEPHYR
    ];
  }
}
