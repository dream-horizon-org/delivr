/**
 * Communication Provider Metadata
 * Information about available communication/notification providers
 */

export const COMMUNICATION_PROVIDERS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team collaboration and messaging platform',
    enabled: true,
    status: 'available',
    requiresOAuth: true,
    features: ['Channels', 'Direct Messages', 'Notifications', 'Bot Integration']
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Microsoft\'s team collaboration platform',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Channels', 'Chat', 'Notifications', 'Webhooks']
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Voice, video and text communication platform',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Channels', 'Webhooks', 'Bot Integration', 'Rich Embeds']
  }
] as const;

