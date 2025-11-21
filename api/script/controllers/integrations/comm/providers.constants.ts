/**
 * Communication Provider Metadata
 * Information about available communication/messaging providers
 */

export const COMM_PROVIDERS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Real-time messaging platform for team collaboration',
    enabled: true,
    status: 'available',
    requiresOAuth: false,
    features: ['Channels', 'Direct Messages', 'File Sharing', 'Threads', 'Webhooks', 'Bot Integration']
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Microsoft\'s unified communication platform',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Channels', 'Chat', 'Meetings', 'File Sharing', 'Integration with Office 365']
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Voice, video and text communication platform',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: false,
    features: ['Servers', 'Channels', 'Voice Chat', 'Webhooks', 'Bot Integration']
  }
] as const;

