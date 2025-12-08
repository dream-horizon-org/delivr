/**
 * Release Configuration Page
 * Manage release configurations and CI/CD pipelines
 */

import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams, Link } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { useConfig } from '~/contexts/ConfigContext';
import {
  Box,
  Title,
  Text,
  Tabs,
  Group,
  Badge,
  Skeleton,
  Stack,
  ThemeIcon,
  Center,
  Button,
  Breadcrumbs,
  Anchor,
  useMantineTheme,
} from '@mantine/core';
import {
  IconSettings,
  IconRocket,
  IconArrowLeft,
  IconAlertCircle,
  IconRefresh,
} from '@tabler/icons-react';
import { ConfigurationsTab } from '~/components/ReleaseSettings/ConfigurationsTab';
import { CICDTab } from '~/components/ReleaseSettings/CICDTab';

export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  return json({ org, user });
});

type ConfigTab = 'configurations' | 'cicd';

export default function ReleaseConfigurationPage() {
  const theme = useMantineTheme();
  const data = useLoaderData<typeof loader>();
  const { org } = data as any;
  
  const { 
    releaseConfigs, 
    invalidateReleaseConfigs, 
    isLoadingMetadata, 
    isLoadingTenantConfig,
    isLoadingReleaseConfigs,
    releaseConfigsError,
    metadataError,
    tenantConfigError,
  } = useConfig();
  
  const configError = releaseConfigsError || metadataError || tenantConfigError;
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get tab from URL params, default to 'configurations'
  const tabFromUrl = searchParams.get('tab') as ConfigTab | null;
  const [activeTab, setActiveTab] = useState<ConfigTab>(
    tabFromUrl === 'cicd' ? 'cicd' : 'configurations'
  );
  
  // Sync activeTab with URL params
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl as ConfigTab);
    }
  }, [tabFromUrl, activeTab]);
  
  // Update URL when tab changes
  const handleTabChange = useCallback((tab: string | null) => {
    if (tab) {
      setActiveTab(tab as ConfigTab);
      setSearchParams({ tab });
    }
  }, [setSearchParams]);

  const isLoading = isLoadingMetadata || isLoadingTenantConfig || isLoadingReleaseConfigs;

  // Breadcrumb items
  const breadcrumbItems = [
    { title: 'Release Management', href: `/dashboard/${org}/releases` },
    { title: 'Configuration', href: '#' },
  ].map((item, index) => (
    item.href === '#' ? (
      <Text key={index} size="sm" c={theme.colors.slate[6]}>
        {item.title}
      </Text>
    ) : (
      <Anchor
        key={index}
        component={Link}
        to={item.href}
        size="sm"
        c={theme.colors.slate[5]}
      >
        {item.title}
      </Anchor>
    )
  ));

  // Loading state
  if (isLoading) {
    return (
      <Box>
        {/* Header Skeleton */}
        <Box mb={32}>
          <Skeleton height={16} width={200} mb={16} />
          <Skeleton height={32} width={300} mb={8} />
          <Skeleton height={20} width={400} />
        </Box>

        {/* Tabs Skeleton */}
        <Group gap="xs" mb={24}>
          <Skeleton height={40} width={160} radius="md" />
          <Skeleton height={40} width={140} radius="md" />
        </Group>

        {/* Content Skeleton */}
        <Stack gap="lg">
          <Skeleton height={80} radius="md" />
          <Group gap="md">
            <Skeleton height={200} style={{ flex: 1 }} radius="md" />
            <Skeleton height={200} style={{ flex: 1 }} radius="md" />
            <Skeleton height={200} style={{ flex: 1 }} radius="md" />
          </Group>
        </Stack>
      </Box>
    );
  }

  // Error state
  if (configError) {
    return (
      <Box>
        {/* Header */}
        <Box mb={32}>
          <Breadcrumbs mb={16}>{breadcrumbItems}</Breadcrumbs>
          <Title order={2} fw={700} c={theme.colors.slate[9]} mb={4}>
            Release Configuration
          </Title>
          <Text size="md" c={theme.colors.slate[5]}>
            Manage your release configurations and CI/CD pipelines
          </Text>
        </Box>

        <Center py={80}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertCircle size={32} />
            </ThemeIcon>
            <Text size="lg" fw={500} c={theme.colors.slate[7]}>
              Failed to load configuration
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} maw={400} ta="center">
              {typeof configError === 'string' ? configError : 'An error occurred while loading the configuration. Please try again.'}
            </Text>
            <Button
              variant="light"
              color="brand"
              leftSection={<IconRefresh size={16} />}
              onClick={() => invalidateReleaseConfigs()}
            >
              Try Again
            </Button>
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Box mb={32}>
        <Breadcrumbs mb={16}>{breadcrumbItems}</Breadcrumbs>
        
        <Group justify="space-between" align="flex-start">
          <Box>
            <Group gap="md" mb={4}>
              <Title order={2} fw={700} c={theme.colors.slate[9]}>
                Release Configuration
              </Title>
              {releaseConfigs.length > 0 && (
                <Badge 
                  size="lg" 
                  variant="light" 
                  color="brand"
                  leftSection={<IconSettings size={14} />}
                >
                  {releaseConfigs.length} configuration{releaseConfigs.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </Group>
            <Text size="md" c={theme.colors.slate[5]} maw={600}>
              Create and manage release configurations to standardize your release process.
              Define versioning rules, approval workflows, and deployment strategies.
            </Text>
          </Box>
          
          <Button
            component={Link}
            to={`/dashboard/${org}/releases`}
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Releases
          </Button>
        </Group>
      </Box>

      {/* Tabs Navigation */}
      <Tabs 
        value={activeTab}
        onChange={handleTabChange}
        variant="unstyled"
        styles={{
          root: {
            display: 'flex',
            flexDirection: 'column',
          },
          list: {
            display: 'flex',
            borderBottom: `1px solid ${theme.colors.slate[2]}`,
            gap: 0,
            marginBottom: 24,
          },
          tab: {
            padding: '12px 20px',
            fontWeight: 500,
            fontSize: '14px',
            color: theme.colors.slate[6],
            backgroundColor: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            borderBottomColor: 'transparent',
            marginBottom: '-1px',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            
            '&:hover': {
              backgroundColor: theme.colors.slate[0],
              color: theme.colors.slate[8],
            },
            
            '&[data-active]': {
              color: theme.colors.brand[6],
              borderBottomColor: theme.colors.brand[5],
            },
            
            '&[data-active]:hover': {
              backgroundColor: 'transparent',
              borderBottomColor: theme.colors.brand[5],
            },
          },
          panel: {
            paddingTop: 0,
          },
        }}
      >
        <Tabs.List>
          <Tabs.Tab 
            value="configurations"
            leftSection={<IconSettings size={18} />}
          >
            Configurations
          </Tabs.Tab>
          <Tabs.Tab 
            value="cicd"
            leftSection={<IconRocket size={18} />}
          >
            CI/CD Pipelines
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="configurations">
          <ConfigurationsTab
            org={org}
            releaseConfigs={releaseConfigs}
            invalidateReleaseConfigs={invalidateReleaseConfigs}
            isLoading={isLoadingReleaseConfigs}
          />
        </Tabs.Panel>

        <Tabs.Panel value="cicd">
          <CICDTab org={org} />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
