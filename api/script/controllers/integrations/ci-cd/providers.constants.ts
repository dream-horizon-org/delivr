/**
 * CI/CD Provider Metadata
 * Information about available CI/CD providers
 */

export const CICD_PROVIDERS = [
  {
    id: 'jenkins',
    name: 'Jenkins',
    description: 'Open source automation server for CI/CD pipelines',
    enabled: true,
    status: 'available',
    requiresOAuth: false,
    features: ['Workflows', 'Build Triggers', 'Job Parameters', 'Queue Management']
  },
  {
    id: 'github_actions',
    name: 'GitHub Actions',
    description: 'GitHub\'s native CI/CD platform',
    enabled: true,
    status: 'available',
    requiresOAuth: false,
    features: ['Workflows', 'Matrix Builds', 'Reusable Workflows', 'Environments']
  },
  {
    id: 'gitlab_ci',
    name: 'GitLab CI',
    description: 'GitLab\'s integrated CI/CD solution',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: false,
    features: ['Pipelines', 'Auto DevOps', 'Environments', 'Feature Flags']
  }
] as const;

