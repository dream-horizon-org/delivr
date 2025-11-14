import { useState } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { Container, Title, Text, Tabs } from '@mantine/core';
import { IntegrationCard } from '~/components/Integrations/IntegrationCard';
import { IntegrationDetailModal } from '~/components/Integrations/IntegrationDetailModal';
import { IntegrationConnectModal } from '~/components/Integrations/IntegrationConnectModal';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { CodepushService } from '~/.server/services/Codepush';
import type { Integration, IntegrationDetails } from '~/types/integrations';
import { IntegrationCategory, IntegrationStatus } from '~/types/integrations';
import type { SCMIntegration } from '~/.server/services/Codepush/types';

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org: tenantId } = params;

  if (!tenantId) {
    throw new Response('Tenant ID is required', { status: 400 });
  }

  try {
    // Fetch tenant info to get connected integrations
    const response = await CodepushService.getTenantInfo({
      userId: user.user.id,
      tenantId
    });

    const organisation = response.data.organisation;
    const connectedIntegrations = organisation?.releaseManagement?.integrations || [];

    // Get GitHub integration if connected
    const githubIntegration = connectedIntegrations.find((i: any) => i.type === 'scm') as SCMIntegration | undefined;

    return json({
      tenantId,
      githubIntegration: githubIntegration || null
    });
  } catch (error) {
    console.error('Error loading integrations:', error);
    return json({
      tenantId,
      githubIntegration: null as SCMIntegration | null
    });
  }
});

export default function IntegrationsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const { tenantId, githubIntegration } = loaderData as { tenantId: string; githubIntegration: SCMIntegration | null };
  const params = useParams();

  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDetails | null>(null);
  const [connectingIntegration, setConnectingIntegration] = useState<Integration | null>(null);
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [connectModalOpened, setConnectModalOpened] = useState(false);

  // Define all available integrations
  const allIntegrations: Integration[] = [
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
      isAvailable: false
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

  // Group integrations by category
  const integrationsByCategory = allIntegrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<IntegrationCategory, Integration[]>);

  const handleCardClick = (integration: Integration) => {
    if (integration.status === IntegrationStatus.CONNECTED) {
      // Show details modal
      const details: IntegrationDetails = {
        ...integration,
        features: getFeatures(integration.id),
        permissions: getPermissions(integration.id),
        lastSyncedAt: new Date(),
        webhookUrl: integration.id === 'github' ? `https://delivr.yourdomain.com/api/github-webhooks/${tenantId}` : undefined,
        webhookStatus: integration.id === 'github' ? 'active' : undefined
      };
      setSelectedIntegration(details);
      setDetailModalOpened(true);
    } else {
      // Show connect modal
      setConnectingIntegration(integration);
      setConnectModalOpened(true);
    }
  };

  const handleConnect = (integrationId: string) => {
    if (integrationId === 'github') {
      // Navigate to GitHub setup
      window.location.href = `/dashboard/${params.org}/releases/setup`;
    } else {
      // For other integrations, show success message (demo)
      alert(`${integrationId} connection initiated (demo mode)`);
    }
  };

  const handleDisconnect = (integrationId: string) => {
    // For now, just show an alert
    alert(`Disconnecting ${integrationId}...`);
    // TODO: Implement actual disconnect logic
  };

  const getFeatures = (integrationId: string): string[] => {
    const features: Record<string, string[]> = {
      github: [
        'Branch Management',
        'Workflow Triggers',
        'Release Notes',
        'Tag Management',
        'Webhooks'
      ],
      slack: ['Real-time Notifications', 'Channel Integration', 'Custom Messages'],
      jenkins: ['Build Triggers', 'Pipeline Integration', 'Artifact Management']
    };
    return features[integrationId] || [];
  };

  const getPermissions = (integrationId: string): string[] => {
    const permissions: Record<string, string[]> = {
      github: [
        'Read repository contents',
        'Create branches and tags',
        'Trigger workflows',
        'Manage webhooks',
        'Read pull requests'
      ],
      slack: ['Send messages', 'Read channels'],
      jenkins: ['Trigger builds', 'Read build status']
    };
    return permissions[integrationId] || [];
  };

  return (
    <Container size="xl" className="py-8">
      <div className="mb-8">
        <Title order={1} className="mb-2">Integrations</Title>
        <Text size="md" c="dimmed">
          Connect external services to enhance your release management workflow
        </Text>
      </div>

      <Tabs defaultValue={IntegrationCategory.SOURCE_CONTROL}>
        <Tabs.List className="mb-6">
          {Object.keys(integrationsByCategory).map((category) => (
            <Tabs.Tab key={category} value={category}>
              {category}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {Object.entries(integrationsByCategory).map(([category, integrations]) => (
          <Tabs.Panel key={category} value={category}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          </Tabs.Panel>
        ))}
      </Tabs>

      {/* Modals */}
      <IntegrationDetailModal
        integration={selectedIntegration}
        opened={detailModalOpened}
        onClose={() => setDetailModalOpened(false)}
        onDisconnect={handleDisconnect}
      />

      <IntegrationConnectModal
        integration={connectingIntegration}
        opened={connectModalOpened}
        onClose={() => setConnectModalOpened(false)}
        onConnect={handleConnect}
      />
    </Container>
  );
}

function getFeatures(integrationId: string): string[] {
  const features: Record<string, string[]> = {
    github: [
      'Branch Management',
      'Workflow Triggers',
      'Release Notes',
      'Tag Management',
      'Webhooks'
    ],
    slack: ['Real-time Notifications', 'Channel Integration', 'Custom Messages'],
    jenkins: ['Build Triggers', 'Pipeline Integration', 'Artifact Management']
  };
  return features[integrationId] || [];
}

function getPermissions(integrationId: string): string[] {
  const permissions: Record<string, string[]> = {
    github: [
      'Read repository contents',
      'Create branches and tags',
      'Trigger workflows',
      'Manage webhooks',
      'Read pull requests'
    ],
    slack: ['Send messages', 'Read channels'],
    jenkins: ['Trigger builds', 'Read build status']
  };
  return permissions[integrationId] || [];
}

