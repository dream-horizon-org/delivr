/**
 * Slack/Communication Integration Module Exports
 * 
 * Barrel file for easy importing
 */

// Export all types
export * from './slack-types';

// Export model factories
export { 
  createSlackIntegrationModel,
  createChannelConfigModel 
} from './slack-models';

// Export controllers
export { 
  SlackIntegrationController,
  ChannelController 
} from './slack-controller';

