import { getStorage } from '../../../../storage/storage-instance';
import { SlackIntegrationService } from '../slack-integration';
import { SlackChannelConfigService } from '../slack-channel-config';

/**
 * Service Factory
 * Creates service instances with proper repository dependencies
 */
export class ServiceFactory {
  /**
   * Get Slack Integration Service instance
   * Note: Creates new instance each time to ensure fresh repository reference
   */
  static getSlackIntegrationService(): SlackIntegrationService {
      const storage = getStorage();
      const integrationRepository = (storage as any).slackController;

    return new SlackIntegrationService(integrationRepository);
  }

  /**
   * Get Slack Channel Config Service instance
   * Note: Creates new instance each time to ensure fresh repository reference
   */
  static getSlackChannelConfigService(): SlackChannelConfigService {
      const storage = getStorage();
      const channelConfigRepository = (storage as any).channelController;
      const integrationRepository = (storage as any).slackController;

    return new SlackChannelConfigService(
        channelConfigRepository,
        integrationRepository
      );
  }
}

// Convenience exports
export const getSlackIntegrationService = () => ServiceFactory.getSlackIntegrationService();
export const getSlackChannelConfigService = () => ServiceFactory.getSlackChannelConfigService();

