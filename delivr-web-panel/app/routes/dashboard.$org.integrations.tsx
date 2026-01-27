import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { useQueryClient } from 'react-query';
import { 
  Box, 
  Container,
  Text, 
  Tabs, 
  Group, 
  Badge, 
  Skeleton, 
  Stack,
  ThemeIcon,
  SimpleGrid,
  useMantineTheme,
  Center,
  Paper,
} from '@mantine/core';
import { StandardizedTabs, type TabConfig } from '~/components/Common/StandardizedTabs';
import { Breadcrumb } from '~/components/Common';
import { PageHeader } from '~/components/Common/PageHeader';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { 
  IconPlug, 
  IconBrandGithub, 
  IconBrandSlack, 
  IconRocket,
  IconTestPipe,
  IconLayoutKanban,
  IconApps,
  IconAlertCircle,
} from '@tabler/icons-react';
import { IntegrationCard } from '~/components/Integrations/IntegrationCard';
import { IntegrationDetailModal } from '~/components/Integrations/IntegrationDetailModal';
import { IntegrationConnectModal } from '~/components/Integrations/IntegrationConnectModal';

import type { Integration, IntegrationDetails } from '~/types/integrations';
import { IntegrationCategory, IntegrationStatus } from '~/types/integrations';
import { useConfig } from '~/contexts/ConfigContext';
import { refetchTenantConfigInBackground } from '~/utils/cache-invalidation';
import { INTEGRATION_DISPLAY_NAMES, INTEGRATION_CATEGORY_LABELS } from '~/constants/integration-ui';
import { INTEGRATION_MESSAGES } from '~/constants/toast-messages';
import { showSuccessToast, showInfoToast } from '~/utils/toast';
import { usePermissions } from '~/hooks/usePermissions';
import type { OrgLayoutLoaderData } from '~/routes/dashboard.$org';
import { INTEGRATIONS_PAGE_HEADER } from '~/constants/page-headers';

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  SOURCE_CONTROL: IconBrandGithub,
  COMMUNICATION: IconBrandSlack,
  CI_CD: IconRocket,
  TEST_MANAGEMENT: IconTestPipe,
  PROJECT_MANAGEMENT: IconLayoutKanban,
  APP_DISTRIBUTION: IconApps,
};

// Category descriptions
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  SOURCE_CONTROL: 'Connect your repositories to enable automated release workflows',
  COMMUNICATION: 'Keep your team informed with real-time notifications',
  CI_CD: 'Automate your build and deployment pipelines',
  TEST_MANAGEMENT: 'Track and manage test runs and quality metrics',
  PROJECT_MANAGEMENT: 'Link releases to project tracking and issue management',
  APP_DISTRIBUTION: 'Distribute your apps to stores and testers',
};

export default function IntegrationsPage() {
  const theme = useMantineTheme();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { 
    isLoadingMetadata,
    isLoadingTenantConfig,
    getConnectedIntegrations,
    getAvailableIntegrations 
  } = useConfig();

  // Get user data and check permissions
  const orgLayoutData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const userId = orgLayoutData?.user?.user?.id || '';
  const appId = params.org!;
  const { isOwner } = usePermissions(appId, userId);

  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDetails | null>(null);
  const [connectingIntegration, setConnectingIntegration] = useState<Integration | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [connectModalOpened, setConnectModalOpened] = useState(false);

  // Build integrations list using ConfigContext helpers
  const allIntegrations = useMemo((): Integration[] => {
    const integrations: Integration[] = [];
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
          description: provider.description ?? '',
          icon: provider.icon ?? '',
          category,
          status: connected ? IntegrationStatus.CONNECTED : IntegrationStatus.NOT_CONNECTED,
          ...(connected && {
            // Include displayName from connected integration if available
            ...(connected.displayName && { displayName: connected.displayName }),
            config: {
              id: connected.id,
              ...connected.config,
            },
            ...(connected.connectedAt && { connectedAt: new Date(connected.connectedAt) }),
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

  // Define the desired tab order
  const tabOrder: IntegrationCategory[] = [
    IntegrationCategory.SOURCE_CONTROL,      // 1. SCM
    IntegrationCategory.APP_DISTRIBUTION,    // 2. App Distribution
    IntegrationCategory.CI_CD,              // 3. Workflows
    IntegrationCategory.COMMUNICATION,       // 4. Slack
    IntegrationCategory.TEST_MANAGEMENT,     // 5. Test Management
    IntegrationCategory.PROJECT_MANAGEMENT,  // 6. Project Management
  ];

  // Get ordered categories that have integrations
  const orderedCategories = useMemo(() => {
    return tabOrder.filter(category => 
      integrationsByCategory[category] && integrationsByCategory[category].length > 0
    );
  }, [integrationsByCategory]);

  // Get active tab from URL, default to first available category
  const activeTabFromUrl = searchParams.get('tab');
  
  // Validate that the tab exists in available categories and convert to enum
  const validTab = useMemo(() => {
    // Check if URL param matches any enum value
    if (activeTabFromUrl) {
      const enumValue = Object.values(IntegrationCategory).find(
        (cat) => cat === activeTabFromUrl
      ) as IntegrationCategory | undefined;
      
      if (enumValue && orderedCategories.includes(enumValue)) {
        return enumValue;
      }
    }
    
    // Default to first available category in the desired order
    return orderedCategories[0] || IntegrationCategory.SOURCE_CONTROL;
  }, [activeTabFromUrl, orderedCategories]);

  // Handle tab change - update URL with enum value
  const handleTabChange = useCallback((value: string | null) => {
    if (value) {
      // Validate that value is a valid IntegrationCategory enum
      const enumValue = Object.values(IntegrationCategory).find(
        (cat) => cat === value
      ) as IntegrationCategory | undefined;
      
      if (enumValue) {
        setSearchParams({ tab: enumValue });
      }
    }
  }, [setSearchParams]);

  // Count connected integrations
  const connectedCount = useMemo(() => {
    return allIntegrations.filter(i => i.status === IntegrationStatus.CONNECTED).length;
  }, [allIntegrations]);

  const handleCardClick = useCallback((integration: Integration) => {
    // Only allow connecting if user is owner
    if (integration.status === IntegrationStatus.CONNECTED) {
      const details: IntegrationDetails = {
        ...integration,
        lastSyncedAt: new Date(),
      };
      setSelectedIntegration(details);
      setDetailModalOpened(true);
    } else if (isOwner) {
      // Only allow connecting if user is owner
      setConnectingIntegration(integration);
      setConnectModalOpened(true);
    }
  }, [isOwner]);

  const handleConnect = useCallback((integrationId: string, data?: any) => {
    if (!params.org) return;

    const displayName = INTEGRATION_DISPLAY_NAMES[integrationId] ?? integrationId;
    const isKnownIntegration = integrationId in INTEGRATION_DISPLAY_NAMES;
    if (isKnownIntegration) {
      showSuccessToast(INTEGRATION_MESSAGES.CONNECT_SUCCESS(displayName, !!editingIntegration));
      // Refetch tenant config in background to reflect latest integration changes
      refetchTenantConfigInBackground(queryClient, params.org);
    } else {
      showInfoToast(INTEGRATION_MESSAGES.DEMO_MODE(integrationId));
    }
  }, [params.org, queryClient, editingIntegration]);

  const handleEdit = useCallback((integrationId: string) => {
    // Only allow editing if user is owner
    if (!isOwner) return;
    const integration = allIntegrations.find(i => i.id === integrationId);
    if (integration) {
      setEditingIntegration(integration);
      setConnectModalOpened(true);
    }
  }, [allIntegrations, isOwner]);

  const handleDisconnectComplete = useCallback(() => {
    if (!params.org) return;
    // Refetch tenant config in background to reflect latest integration changes
    refetchTenantConfigInBackground(queryClient, params.org);
  }, [params.org, queryClient]);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpened(false);
  }, []);

  const handleCloseConnectModal = useCallback(() => {
    setConnectModalOpened(false);
    setEditingIntegration(null);
  }, []);

  const isLoading = isLoadingMetadata || isLoadingTenantConfig;

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('integrations', { org: appId });

  // Loading state
  if (isLoading) {
    return (
      <Container size="xl" py={16}>
        {/* Header skeleton */}
        <Box mb={32}>
          <Skeleton height={36} width={200} mb={8} />
          <Skeleton height={20} width={400} />
        </Box>

        {/* Tabs skeleton */}
        <Group gap="xs" mb={24}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height={36} width={120} radius="md" />
          ))}
        </Group>

        {/* Cards skeleton */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height={200} radius="md" />
          ))}
        </SimpleGrid>
      </Container>
    );
  }

  // Check if no categories have integrations
  const hasNoIntegrations = Object.keys(integrationsByCategory).length === 0;

  if (hasNoIntegrations) {
    return (
      <Container size="xl" py={16}>
        <Breadcrumb items={breadcrumbItems} mb={16} />
        <PageHeader
          title={INTEGRATIONS_PAGE_HEADER.TITLE}
          description={INTEGRATIONS_PAGE_HEADER.DESCRIPTION}
          icon={IconPlug}
          descriptionMaxWidth={600}
        />

        <Center py={80}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" variant="light" color="gray">
              <IconAlertCircle size={32} />
            </ThemeIcon>
            <Text size="lg" fw={500} c={theme.colors.slate[7]}>
              No integrations available
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} maw={400} ta="center">
              Integration options are loaded from your system configuration.
              Please contact support if you believe this is an error.
            </Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py={16}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} mb={16} />
      
      {/* Header Section */}
      <PageHeader
        title={INTEGRATIONS_PAGE_HEADER.TITLE}
        description={INTEGRATIONS_PAGE_HEADER.DESCRIPTION}
        icon={IconPlug}
        descriptionMaxWidth={600}
      />

      {/* Tabs Navigation */}
      <StandardizedTabs
        activeTab={validTab}
        onTabChange={handleTabChange}
        tabs={useMemo(() => 
          orderedCategories.map((category) => {
            const categoryIntegrations = integrationsByCategory[category] ?? [];
            const connectedInCategory = categoryIntegrations.filter(
              i => i.status === IntegrationStatus.CONNECTED
            ).length;

            return {
              value: category,
              label: INTEGRATION_CATEGORY_LABELS[category] ?? category,
              icon: CATEGORY_ICONS[category],
              count: connectedInCategory > 0 ? connectedInCategory : undefined,
            };
          }),
          [orderedCategories, integrationsByCategory]
        )}
      >
        {orderedCategories.map((category) => {
          const integrations = integrationsByCategory[category] ?? [];
          return (
          <Tabs.Panel key={category} value={category}>
            {/* Category Description */}
            <Paper
              p="md"
              mb={24}
              radius="md"
              style={{
                backgroundColor: theme.colors.slate[0],
                border: `1px solid ${theme.colors.slate[2]}`,
              }}
            >
              <Group gap="sm">
                <ThemeIcon 
                  size={36} 
                  radius="md" 
                  variant="light" 
                  color="brand"
                >
                  {(() => {
                    const IconComponent = CATEGORY_ICONS[category];
                    return IconComponent ? <IconComponent size={18} /> : null;
                  })()}
                </ThemeIcon>
                <Box>
                  <Text size="sm" fw={600} c={theme.colors.slate[8]}>
                    {INTEGRATION_CATEGORY_LABELS[category]}
                  </Text>
                  <Text size="xs" c={theme.colors.slate[5]}>
                    {CATEGORY_DESCRIPTIONS[category] ?? 'Configure and manage your integrations'}
                  </Text>
                </Box>
              </Group>
            </Paper>

            {/* Integration Cards Grid */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onClick={handleCardClick}
                  canConnect={isOwner}
                />
              ))}
            </SimpleGrid>
          </Tabs.Panel>
          );
        })}
      </StandardizedTabs>

      {/* Modals */}
      <IntegrationDetailModal
        integration={selectedIntegration}
        opened={detailModalOpened}
        onClose={handleCloseDetailModal}
        onDisconnectComplete={handleDisconnectComplete}
        onEdit={isOwner ? handleEdit : undefined}
        appId={appId}
      />

      <IntegrationConnectModal
        integration={editingIntegration ?? connectingIntegration}
        opened={connectModalOpened}
        onClose={handleCloseConnectModal}
        onConnect={handleConnect}
        isEditMode={!!editingIntegration}
        existingData={editingIntegration?.config}
      />
    </Container>
  );
}

