/**
 * Project Management Provider Metadata
 * Information about available project management providers
 */

export const PROJECT_MANAGEMENT_PROVIDERS = [
  {
    id: 'jira',
    name: 'Jira',
    description: 'Atlassian\'s project and issue tracking platform',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Issues', 'Sprints', 'Boards', 'Reports', 'Workflows']
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Modern issue tracking for software teams',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Issues', 'Projects', 'Cycles', 'Roadmaps', 'Integrations']
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Work management platform for teams',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: true,
    features: ['Tasks', 'Projects', 'Timeline', 'Portfolios', 'Goals']
  }
] as const;

