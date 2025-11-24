import { CommType } from '../comm-types';
import type { CommConfig } from '../comm-types';
import type { ICommService } from './provider.interface';
import { SlackService } from './slack/slack.service';

/**
 * Provider Factory
 * Creates communication provider instances
 * 
 * Note: Unlike project-management providers, communication providers are stateful
 * and require configuration (credentials) at instantiation time.
 */
export class ProviderFactory {
  /**
   * Get provider instance by type
   * @param providerType - Communication provider type
   * @param config - Provider configuration with credentials
   */
  static getProvider(providerType: CommType, config: CommConfig): ICommService {
    switch (providerType) {
      case CommType.SLACK:
        return new SlackService(config);
      // Future providers:
      // case CommType.TEAMS:
      //   return new TeamsService(config);
      // case CommType.EMAIL:
      //   return new EmailService(config);
      default:
        throw new Error(`Unsupported communication provider: ${providerType}`);
  }
}

  /**
   * Check if provider is supported
   */
  static isSupported(providerType: CommType): boolean {
    return [
      CommType.SLACK
      // Future: TEAMS, EMAIL
    ].includes(providerType);
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): CommType[] {
    return [
      CommType.SLACK
      // Future: TEAMS, EMAIL
    ];
  }
}


