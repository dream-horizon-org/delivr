import { useState } from 'react';
import { useParams } from '@remix-run/react';
import { Container, Title, Text, Tabs, Loader as MantineLoader } from '@mantine/core';
import { IntegrationCard } from '~/components/Integrations/IntegrationCard';
import { IntegrationDetailModal } from '~/components/Integrations/IntegrationDetailModal';
import { IntegrationConnectModal } from '~/components/Integrations/IntegrationConnectModal';
import type { Integration, IntegrationDetails } from '~/types/integrations';
import { IntegrationCategory, IntegrationStatus } from '~/types/integrations';
import { useConfig } from '~/contexts/ConfigContext';

export default function IntegrationsPage() {
  const params = useParams();
  const { 
    isLoadingMetadata,
    isLoadingTenantConfig,
    getConnectedIntegrations,
    getAvailableIntegrations 
  } = useConfig();

  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDetails | null>(null);
  const [connectingIntegration, setConnectingIntegration] = useState<Integration | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [connectModalOpened, setConnectModalOpened] = useState(false);

  // Build integrations list using ConfigContext helpers
  const buildIntegrationsList = (): Integration[] => {
    const allIntegrations: Integration[] = [];
    
    // Get all integration categories
    const categories: IntegrationCategory[] = [
      IntegrationCategory.SOURCE_CONTROL,
      IntegrationCategory.COMMUNICATION,
      IntegrationCategory.CI_CD,
      IntegrationCategory.TEST_MANAGEMENT,
      IntegrationCategory.PROJECT_MANAGEMENT,
      IntegrationCategory.APP_DISTRIBUTION,
    ];

    categories.forEach(category => {
      // Get available integrations for this category
      const availableIntegrations = getAvailableIntegrations(category);
      const connectedIntegrations = getConnectedIntegrations(category);

      availableIntegrations.forEach((provider) => {
        // Check if this provider is connected for this tenant
        const connected = connectedIntegrations.find(
          (c) => c.providerId === provider.id
        );

        allIntegrations.push({
          id: provider.id,
          name: provider.name,
          description: provider.description || '',
          category: category,
          icon: provider.icon || '',
          status: connected ? IntegrationStatus.CONNECTED : IntegrationStatus.NOT_CONNECTED,
          isAvailable: true,
          config: connected?.config,
          connectedAt: connected?.connectedAt ? new Date(connected.connectedAt) : undefined,
          connectedBy: connected?.connectedBy || undefined,
        });
      });
    });
          
    return allIntegrations;
  };

  // Loading state
  if (isLoadingMetadata || isLoadingTenantConfig) {
    return (
      <Container size="xl" className="py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <MantineLoader size="lg" />
        </div>
      </Container>
    );
  }

  const allIntegrations = buildIntegrationsList();
  
  console.log('[Integrations] Total integrations:', allIntegrations.length);
  console.log('[Integrations] All integrations:', allIntegrations);

  const tenantId = params.org!;

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
      // GitHub connection is handled by the modal with real API calls
      console.log('[GitHub] Operation successful:', data);
      // Show success message and reload to update the integration status
      alert(editingIntegration ? 'GitHub integration updated successfully!' : 'GitHub integration connected successfully!');
      window.location.reload();
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

