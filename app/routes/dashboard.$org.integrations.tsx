import { useState, useMemo, useCallback } from 'react';
import { useParams } from '@remix-run/react';
import { useQueryClient } from 'react-query';
import { Container, Title, Text, Tabs } from '@mantine/core';
import { IntegrationCard } from '~/components/Integrations/IntegrationCard';
import { IntegrationDetailModal } from '~/components/Integrations/IntegrationDetailModal';
import { IntegrationConnectModal } from '~/components/Integrations/IntegrationConnectModal';

import type { Integration, IntegrationDetails } from '~/types/integrations';
import { IntegrationCategory, IntegrationStatus } from '~/types/integrations';
import { useConfig } from '~/contexts/ConfigContext';
import { invalidateTenantConfig } from '~/utils/cache-invalidation';
import { INTEGRATION_DISPLAY_NAMES, INTEGRATION_CATEGORY_LABELS } from '~/constants/integration-ui';
import { INTEGRATION_MESSAGES } from '~/constants/toast-messages';
import { showSuccessToast, showInfoToast } from '~/utils/toast';

export default function IntegrationsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
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
  // Memoize to prevent unnecessary re-renders
  const allIntegrations = useMemo((): Integration[] => {
    const integrations: Integration[] = [];
    
    // Get all integration categories
    const categories = Object.values(IntegrationCategory) as IntegrationCategory[];

    categories.forEach(category => {
      const availableIntegrations = getAvailableIntegrations(category);
      const connectedIntegrations = getConnectedIntegrations(category);

      availableIntegrations.forEach((provider) => {
        const connected = connectedIntegrations.find(
          (c) => c.providerId.toLowerCase() === provider.id.toLowerCase()
        );

        integrations.push({
          ...provider,
          description: provider.description || '',
          icon: provider.icon || '',
          category,
          status: connected ? IntegrationStatus.CONNECTED : IntegrationStatus.NOT_CONNECTED,
          ...(connected && {
            config: {
              id: connected.id,
              ...connected.config,
            },
            connectedAt: connected.connectedAt ? new Date(connected.connectedAt) : undefined,
            connectedBy: connected.connectedBy,
          }),
        });
      });
    });
          
    return integrations;
  }, [getAvailableIntegrations, getConnectedIntegrations]);

  // Group integrations by category
  const integrationsByCategory = useMemo(() => {
    return allIntegrations.reduce((acc, integration) => {
      if (!acc[integration.category]) {
        acc[integration.category] = [];
      }
      acc[integration.category].push(integration);
      return acc;
    }, {} as Record<IntegrationCategory, Integration[]>);
  }, [allIntegrations]);

  // Loading state
  // if (isLoadingMetadata || isLoadingTenantConfig) {
  //   return <PageLoader message="Loading integrations..." size="lg" />;
  // }

  const tenantId = params.org!;

  const handleCardClick = useCallback((integration: Integration) => {
    if (integration.status === IntegrationStatus.CONNECTED) {
      const details: IntegrationDetails = {
        ...integration,
        lastSyncedAt: new Date(),
      };
      setSelectedIntegration(details);
      setDetailModalOpened(true);
    } else {
      setConnectingIntegration(integration);
      setConnectModalOpened(true);
    }
  }, []);

  const handleConnect = useCallback((integrationId: string, data?: any) => {
    if (!params.org) return;

    const displayName = INTEGRATION_DISPLAY_NAMES[integrationId] || integrationId;
    const isKnownIntegration = integrationId in INTEGRATION_DISPLAY_NAMES;

    if (isKnownIntegration) {
      showSuccessToast(INTEGRATION_MESSAGES.CONNECT_SUCCESS(displayName, !!editingIntegration));
      invalidateTenantConfig(queryClient, params.org);
    } else {
      showInfoToast(INTEGRATION_MESSAGES.DEMO_MODE(integrationId));
    }
  }, [params.org, queryClient, editingIntegration]);


  const handleEdit = useCallback((integrationId: string) => {
    const integration = allIntegrations.find(i => i.id === integrationId);
    if (integration) {
      setEditingIntegration(integration);
      setConnectModalOpened(true);
    }
  }, [allIntegrations]);


  const handleDisconnectComplete = useCallback(() => {
    if (!params.org) return;
    invalidateTenantConfig(queryClient, params.org);
  }, [params.org, queryClient]);


  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpened(false);
  }, []);


  const handleCloseConnectModal = useCallback(() => {
    setConnectModalOpened(false);
    setEditingIntegration(null);
  }, []);

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
              {INTEGRATION_CATEGORY_LABELS[category] || category}
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
        onClose={handleCloseDetailModal}
        onDisconnectComplete={handleDisconnectComplete}
        onEdit={handleEdit}
        tenantId={tenantId}
      />

      <IntegrationConnectModal
        integration={editingIntegration || connectingIntegration}
        opened={connectModalOpened}
        onClose={handleCloseConnectModal}
        onConnect={handleConnect}
        isEditMode={!!editingIntegration}
        existingData={editingIntegration?.config}
      />
    </Container>
  );
}

