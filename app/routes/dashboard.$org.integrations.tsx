import { useState, useEffect } from 'react';
import { useParams, useRouteLoaderData } from '@remix-run/react';
import { Container, Title, Text, Tabs, Loader as MantineLoader } from '@mantine/core';
import { IntegrationCard } from '~/components/Integrations/IntegrationCard';
import { IntegrationDetailModal } from '~/components/Integrations/IntegrationDetailModal';
import { IntegrationConnectModal } from '~/components/Integrations/IntegrationConnectModal';
import type { Integration, IntegrationDetails } from '~/types/integrations';
import { IntegrationCategory, IntegrationStatus } from '~/types/integrations';
import type { OrgLayoutLoaderData } from './dashboard.$org';
import { INTEGRATION_TYPES } from '~/constants/integrations';

export default function IntegrationsPage() {
  // Get shared tenant data from parent layout (no redundant API call!)
  const orgData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const params = useParams();

  const [allIntegrations, setAllIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDetails | null>(null);
  const [connectingIntegration, setConnectingIntegration] = useState<Integration | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [connectModalOpened, setConnectModalOpened] = useState(false);

  // Get user display name for "Connected By"
  const userDisplayName = orgData?.user?.user?.email || 
                          orgData?.user?.user?.name || 
                          orgData?.user?.user?.id || 
                          'Unknown User';

  console.log('orgData', orgData);
  console.log("allIntegrations", allIntegrations);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        // Fetch system-wide available integrations
        const response = await fetch('/api/v1/integrations/available');
        const data = await response.json();
        
        if (!orgData) {
          // If no org data, just show available integrations
          setAllIntegrations(data.integrations);
          setIsLoading(false);
          return;
        }

        // Extract tenant-specific connected integrations
        const connectedIntegrations = orgData.organisation?.releaseManagement?.integrations || [];
        const githubIntegration = connectedIntegrations.find((i: any) => i.type === INTEGRATION_TYPES.SCM) as any;
        const slackIntegration = connectedIntegrations.find(
          (i: any) => i.type === 'communication' && i.communicationType === 'SLACK'
        ) as any;
        const jenkinsIntegration = connectedIntegrations.find(
          (i: any) => i.type === 'cicd' && i.providerType === 'JENKINS'
        ) as any;
        const githubActionsIntegration = connectedIntegrations.find(
          (i: any) => i.type === 'cicd' && i.providerType === 'GITHUB_ACTIONS'
        ) as any;

        // Fetch Checkmate integrations separately (uses test management API)
        let checkmateIntegrations: any[] = [];
        try {
          const checkmateResponse = await fetch(`/api/v1/tenants/${tenantId}/integrations/test-management/checkmate`);
          if (checkmateResponse.ok) {
            const checkmateData = await checkmateResponse.json();
            checkmateIntegrations = checkmateData.data || [];
          }
        } catch (error) {
          console.error('Failed to fetch Checkmate integrations:', error);
        }
        const checkmateIntegration = checkmateIntegrations[0]; // Use first integration
        
        // Merge: Update connection status for tenant-connected integrations
        const integrationsWithStatus = data.integrations.map((integration: Integration) => {
          // Check if GitHub is connected for this tenant
          if (integration.id === 'github' && githubIntegration) {
            return {
              ...integration,
              status: IntegrationStatus.CONNECTED,
              config: {
                owner: githubIntegration.owner,
                repo: githubIntegration.repo,
                repositoryUrl: `https://github.com/${githubIntegration.owner}/${githubIntegration.repo}`,
                defaultBranch: githubIntegration.defaultBranch || 'main'
              },
              connectedAt: new Date(githubIntegration.createdAt),
              connectedBy: userDisplayName
            };
          }
          
          // Check if Slack is connected for this tenant
          if (integration.id === 'slack' && slackIntegration) {
            return {
              ...integration,
              status: IntegrationStatus.CONNECTED,
              config: {
                workspaceName: slackIntegration.workspaceName,
                workspaceId: slackIntegration.workspaceId,
                botUserId: slackIntegration.botUserId,
                channels: slackIntegration.slackChannels || [],
                channelsCount: slackIntegration.channelsCount || 0,
                verificationStatus: slackIntegration.verificationStatus,
                hasValidToken: slackIntegration.hasValidToken
              },
              connectedAt: new Date(slackIntegration.createdAt),
              connectedBy: userDisplayName
            };
          }
          
          // Check if Jenkins is connected for this tenant
          if (integration.id === 'jenkins' && jenkinsIntegration) {
            return {
              ...integration,
              status: IntegrationStatus.CONNECTED,
              config: {
                displayName: jenkinsIntegration.displayName,
                hostUrl: jenkinsIntegration.hostUrl,
                username: jenkinsIntegration.username,
                verificationStatus: jenkinsIntegration.verificationStatus,
                hasValidToken: jenkinsIntegration.hasValidToken,
                isActive: jenkinsIntegration.isActive
              },
              connectedAt: new Date(jenkinsIntegration.createdAt),
              connectedBy: userDisplayName
            };
          }
          
          // Check if GitHub Actions is connected for this tenant
          if (integration.id === 'github-actions' && githubActionsIntegration) {
            return {
              ...integration,
              status: IntegrationStatus.CONNECTED,
              config: {
                displayName: githubActionsIntegration.displayName,
                hostUrl: githubActionsIntegration.hostUrl,
                verificationStatus: githubActionsIntegration.verificationStatus,
                hasValidToken: githubActionsIntegration.hasValidToken,
                isActive: githubActionsIntegration.isActive
              },
              connectedAt: new Date(githubActionsIntegration.createdAt),
              connectedBy: userDisplayName
            };
          }

          // Check if Checkmate is connected for this tenant
          if (integration.id === 'checkmate' && checkmateIntegration) {
            return {
              ...integration,
              status: IntegrationStatus.CONNECTED,
              config: {
                id: checkmateIntegration.id,
                name: checkmateIntegration.name,
                baseUrl: checkmateIntegration.config?.baseUrl,
                providerType: checkmateIntegration.providerType
              },
              connectedAt: new Date(checkmateIntegration.createdAt),
              connectedBy: userDisplayName
            };
          }
          
          return integration;
        });

        setAllIntegrations(integrationsWithStatus);
      } catch (error) {
        console.error('Failed to fetch integrations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntegrations();
  }, [orgData]);

  if (!orgData || isLoading) {
    return (
      <Container size="xl" className="py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <MantineLoader size="lg" />
        </div>
      </Container>
    );
  }


  const { tenantId } = orgData;

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
      // Show details modal with actual integration data (no hardcoded features/permissions)
      const details: IntegrationDetails = {
        ...integration,
        lastSyncedAt: new Date(),
        // GitHub-specific webhook info (when implemented)
        webhookUrl: integration.id === 'github' 
          ? `https://delivr.yourdomain.com/api/github-webhooks/${tenantId}` 
          : undefined,
        webhookStatus: integration.id === 'github' ? 'active' : undefined
      };
      setSelectedIntegration(details);
      setDetailModalOpened(true);
    } else {
      // Show connect modal (handles all integration types)
      setConnectingIntegration(integration);
      setConnectModalOpened(true);
    }
  };

  const handleConnect = (integrationId: string, data?: any) => {
    if (integrationId === 'github') {
      // Navigate to GitHub setup in release management wizard
      window.location.href = `/dashboard/${params.org}/releases/setup`;
    } else if (integrationId === 'slack') {
      // Navigate to Slack setup in release management wizard
      console.log('[Slack] Navigating to setup wizard for Slack integration');
      window.location.href = `/dashboard/${params.org}/releases/setup`;
    } else if (integrationId === 'jenkins') {
      // Jenkins connection is handled by the modal with real API calls
      console.log('[Jenkins] Operation successful:', data);
      // Show success message and reload to update the integration status
      alert(editingIntegration ? 'Jenkins integration updated successfully!' : 'Jenkins integration connected successfully!');
      window.location.reload();
    } else if (integrationId === 'github-actions') {
      // GitHub Actions connection is handled by the modal with real API calls
      console.log('[GitHub Actions] Operation successful:', data);
      // Show success message and reload to update the integration status
      alert(editingIntegration ? 'GitHub Actions integration updated successfully!' : 'GitHub Actions integration connected successfully!');
      window.location.reload();
    } else if (integrationId === 'checkmate') {
      // Checkmate connection is handled by the modal with real API calls
      console.log('[Checkmate] Operation successful:', data);
      // Show success message and reload to update the integration status
      alert(editingIntegration ? 'Checkmate integration updated successfully!' : 'Checkmate integration connected successfully!');
      window.location.reload();
    } else {
      // For other integrations, show success message (demo)
      alert(`${integrationId} connection initiated (demo mode)`);
    }
  };

  const handleEdit = (integrationId: string) => {
    // Find the integration to edit
    const integration = allIntegrations.find(i => i.id === integrationId);
    if (integration) {
      setEditingIntegration(integration);
      setConnectModalOpened(true);
    }
  };

  const handleDisconnectComplete = () => {
    // Callback after successful disconnect - refresh to show updated state
    window.location.reload();
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
        onDisconnectComplete={handleDisconnectComplete}
        onEdit={handleEdit}
        tenantId={tenantId}
      />

      <IntegrationConnectModal
        integration={editingIntegration || connectingIntegration}
        opened={connectModalOpened}
        onClose={() => {
          setConnectModalOpened(false);
          setEditingIntegration(null);
        }}
        onConnect={handleConnect}
        isEditMode={!!editingIntegration}
        existingData={editingIntegration?.config}
      />
    </Container>
  );
}

