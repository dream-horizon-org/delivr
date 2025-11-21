import { ProjectManagementProviderType } from '~types/integrations/project-management';
import type { IProjectManagementProvider } from './provider.interface';
import { JiraProvider } from './jira/jira.provider';

export class ProviderFactory {
  private static providers: Map<string, IProjectManagementProvider> = new Map();

  /**
   * Get provider instance by type
   */
  static getProvider(providerType: ProjectManagementProviderType): IProjectManagementProvider {
    // Initialize provider if not already cached
    if (!this.providers.has(providerType)) {
      switch (providerType) {
        case ProjectManagementProviderType.JIRA:
          this.providers.set(providerType, new JiraProvider());
          break;
        case ProjectManagementProviderType.LINEAR:
        case ProjectManagementProviderType.ASANA:
        case ProjectManagementProviderType.MONDAY:
        case ProjectManagementProviderType.CLICKUP:
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
  static isSupported(providerType: ProjectManagementProviderType): boolean {
    return [
      ProjectManagementProviderType.JIRA,
      ProjectManagementProviderType.LINEAR,
      ProjectManagementProviderType.ASANA,
      ProjectManagementProviderType.MONDAY,
      ProjectManagementProviderType.CLICKUP
    ].includes(providerType);
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): ProjectManagementProviderType[] {
    return [
      ProjectManagementProviderType.JIRA
      // Future: LINEAR, ASANA, etc.
    ];
  }
}

