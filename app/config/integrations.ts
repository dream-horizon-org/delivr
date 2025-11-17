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

    // CI/CD
    {
      id: 'jenkins',
      name: 'Jenkins',
      description: 'Trigger Jenkins builds and track deployment pipelines.',
      category: IntegrationCategory.CI_CD,
      icon: '🔨',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: true
    },

    // Test Management
    {
      id: 'checkmate',
      name: 'Checkmate',
      description: 'Manage test cases, track test runs, and integrate QA workflows.',
      category: IntegrationCategory.TEST_MANAGEMENT,
      icon: '✅',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: true
    },

    // Project Management
    {
      id: 'jira',
      name: 'Jira',
      description: 'Link releases to Jira issues and track project progress.',
      category: IntegrationCategory.PROJECT_MANAGEMENT,
      icon: '📋',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: true
    },

    // App Distribution
    {
      id: 'appstore',
      name: 'Apple App Store',
      description: 'Deploy iOS apps to TestFlight and the App Store.',
      category: IntegrationCategory.APP_DISTRIBUTION,
      icon: '🍎',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: true
    },
    {
      id: 'playstore',
      name: 'Google Play Store',
      description: 'Publish Android apps to Google Play Console.',
      category: IntegrationCategory.APP_DISTRIBUTION,
      icon: '🤖',
      status: IntegrationStatus.NOT_CONNECTED,
      isAvailable: true
    }
  ];
}

/**
 * Get features for a specific integration
 */
// Removed hardcoded features and permissions
// These should come from backend API when implemented
// For now, we only show actual integration data from tenant configuration
