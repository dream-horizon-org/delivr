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
    id: 'github-actions',
    name: 'GitHub Actions',
    description: 'GitHub\'s native CI/CD platform',
    enabled: true,
    status: 'available',
    requiresOAuth: false,
    features: ['Workflows', 'Matrix Builds', 'Reusable Workflows', 'Environments']
  },
  {
    id: 'gitlab-ci',
    name: 'GitLab CI',
    description: 'GitLab\'s integrated CI/CD solution',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: false,
    features: ['Pipelines', 'Auto DevOps', 'Environments', 'Feature Flags']
  },
  {
    id: 'circle-ci',
    name: 'Circle CI',
    description: 'Cloud-native continuous integration and delivery platform',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Workflows', 'Orbs', 'Contexts', 'Insights']
  },
  {
    id: 'travis-ci',
    name: 'Travis CI',
    description: 'Hosted CI/CD service for building and testing software',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Build Matrix', 'Caching', 'Deployment', 'Notifications']
  },
  {
    id: 'azure-devops',
    name: 'Azure DevOps',
    description: 'Microsoft\'s DevOps solution with CI/CD pipelines',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Pipelines', 'Artifacts', 'Test Plans', 'Deployment Groups']
  }
] as const;

