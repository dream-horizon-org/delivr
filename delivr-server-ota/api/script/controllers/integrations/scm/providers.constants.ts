/**
 * SCM Provider Metadata
 * Information about available Source Control Management providers
 */

export const SCM_PROVIDERS = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'World\'s leading software development platform',
    enabled: true,
    status: 'available',
    requiresOAuth: false,
    features: ['Repositories', 'Pull Requests', 'Branches', 'Webhooks', 'Actions Integration']
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Complete DevOps platform with built-in SCM',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: false,
    features: ['Repositories', 'Merge Requests', 'CI/CD Integration', 'Container Registry']
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    description: 'Git solution for professional teams',
    enabled: false,
    status: 'coming_soon',
    requiresOAuth: false,
    features: ['Repositories', 'Pull Requests', 'Pipelines', 'Jira Integration']
  },
  // {
  //   id: 'azure-repos',
  //   name: 'Azure Repos',
  //   description: 'Git repositories in Azure DevOps',
  //   enabled: false,
  //   status: 'coming_soon',
  //   requiresOAuth: true,
  //   features: ['Git Repositories', 'Branch Policies', 'Code Search', 'Pull Requests']
  // }
] as const;

