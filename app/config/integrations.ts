/**
 * Integration Definitions
 * All available integrations across categories
 */

import type { Integration } from '~/types/integrations';
import { IntegrationCategory, IntegrationStatus } from '~/types/integrations';
import type { SCMIntegration } from '~/.server/services/Codepush/types';

interface GetAllIntegrationsParams {
  githubIntegration?: SCMIntegration;
  // Add other integration types as they're implemented
  slackIntegration?: any;
  jiraIntegration?: any;
}

/**
 * Get all available integrations with their connection status
 */
export function getAllIntegrations(params: GetAllIntegrationsParams = {}): Integration[] {
  const { githubIntegration } = params;

  return [
    // Source Control
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect your GitHub repository to manage releases, trigger workflows, and automate deployments.',
      category: IntegrationCategory.SOURCE_CONTROL,
      icon: '🐙',
      status: githubIntegration ? IntegrationStatus.CONNECTED : IntegrationStatus.NOT_CONNECTED,
      isAvailable: true,
      config: githubIntegration ? {
        owner: githubIntegration.owner,
        repo: githubIntegration.repo,
        repositoryUrl: `https://github.com/${githubIntegration.owner}/${githubIntegration.repo}`,
        defaultBranch: githubIntegration.defaultBranch || 'main'
      } : undefined,
      connectedAt: githubIntegration ? new Date(githubIntegration.createdAt) : undefined,
      connectedBy: githubIntegration ? 'Current User' : undefined
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      description: 'Integrate with GitLab for CI/CD pipelines and release management.',
      category: IntegrationCategory.SOURCE_CONTROL,
      icon: '🦊',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false
    },
    {
      id: 'bitbucket',
      name: 'Bitbucket',
      description: 'Connect Bitbucket repositories for code management and deployments.',
      category: IntegrationCategory.SOURCE_CONTROL,
      icon: '🪣',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false
    },

    // Communication
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send release notifications and updates to your Slack workspace.',
      category: IntegrationCategory.COMMUNICATION,
      icon: '💬',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: true
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Get notified about releases in Microsoft Teams channels.',
      category: IntegrationCategory.COMMUNICATION,
      icon: '👥',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false
    },
    {
      id: 'discord',
      name: 'Discord',
      description: 'Receive release updates in your Discord server.',
      category: IntegrationCategory.COMMUNICATION,
      icon: '🎮',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false
    },

    // CI/CD
    {
      id: 'jenkins',
      name: 'Jenkins',
      description: 'Trigger Jenkins builds and track deployment pipelines.',
      category: IntegrationCategory.CI_CD,
      icon: '🔨',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false
    },
    {
      id: 'circleci',
      name: 'CircleCI',
      description: 'Integrate with CircleCI for continuous integration and deployment.',
      category: IntegrationCategory.CI_CD,
      icon: '⭕',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false
    },

    // Cloud Platforms
    {
      id: 'aws',
      name: 'AWS',
      description: 'Deploy and manage releases on Amazon Web Services.',
      category: IntegrationCategory.CLOUD_PLATFORMS,
      icon: '☁️',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false,
      isPremium: true
    },
    {
      id: 'gcp',
      name: 'Google Cloud',
      description: 'Integrate with Google Cloud Platform for deployments.',
      category: IntegrationCategory.CLOUD_PLATFORMS,
      icon: '🌐',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false,
      isPremium: true
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      description: 'Connect to Azure for cloud deployments and services.',
      category: IntegrationCategory.CLOUD_PLATFORMS,
      icon: '🔷',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false,
      isPremium: true
    },

    // Monitoring
    {
      id: 'sentry',
      name: 'Sentry',
      description: 'Track errors and performance issues in your releases.',
      category: IntegrationCategory.MONITORING,
      icon: '🔍',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false
    },
    {
      id: 'datadog',
      name: 'Datadog',
      description: 'Monitor application performance and metrics.',
      category: IntegrationCategory.MONITORING,
      icon: '📊',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: false,
      isPremium: true
    }
  ];
}

/**
 * Get features for a specific integration
 */
// Removed hardcoded features and permissions
// These should come from backend API when implemented
// For now, we only show actual integration data from tenant configuration
