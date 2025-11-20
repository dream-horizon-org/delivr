/**
 * App Distribution Provider Metadata
 * Information about available app distribution platforms
 */

export const APP_DISTRIBUTION_PROVIDERS = [
  {
    id: 'appstore',
    name: 'App Store',
    description: 'Apple\'s official app distribution platform for iOS/macOS',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: false,
    features: ['App Submission', 'TestFlight', 'App Store Connect', 'Analytics']
  },
  {
    id: 'playstore',
    name: 'Play Store',
    description: 'Google\'s official app distribution platform for Android',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: false,
    features: ['App Publishing', 'Internal Testing', 'Play Console', 'Release Tracks']
  },
  {
    id: 'firebase',
    name: 'Firebase App Distribution',
    description: 'Google\'s app distribution service for testing',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Testers', 'Groups', 'Release Notes', 'Analytics Integration']
  }
] as const;

