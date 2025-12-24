/**
 * Configurations Page
 * Manage release configurations
 */

import {
  Anchor,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Center,
  Group,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineTheme,
} from '@mantine/core';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconRefresh,
  IconSettings,
} from '@tabler/icons-react';
import { sanitizeUser } from '~/.server/services/Auth/sanitize-user';
import { ConfigurationsTab } from '~/components/ReleaseSettings/ConfigurationsTab';
import { useConfig } from '~/contexts/ConfigContext';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { PermissionService } from '~/utils/permissions.server';

export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }

  // Check if user is owner - only owners can access config settings
  try {
    const isEditor = await PermissionService.isTenantEditor(org, user.user.id);
    if (!isEditor) {
      throw redirect(`/dashboard/${org}/releases`);
    }
  } catch (error) {
    console.error('[ReleaseSettings] Permission check failed:', error);
    throw redirect(`/dashboard/${org}/releases`);
  }
  
  // SECURITY: Sanitize user before sending to client (removes tokens)
  return json({ org, user: sanitizeUser(user) });
});

export default function ConfigurationsPage() {
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
  const isLoading = isLoadingMetadata || isLoadingTenantConfig || isLoadingReleaseConfigs;

  // Breadcrumb items
  const breadcrumbItems = [
    { title: 'Release Management', href: `/dashboard/${org}/releases` },
    { title: 'Configurations', href: '#' },
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
            Configurations
          </Title>
          <Text size="md" c={theme.colors.slate[5]}>
            Manage your release configurations
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
                Configurations
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

      {/* Configurations Content */}
      <ConfigurationsTab
        org={org}
        releaseConfigs={releaseConfigs}
        invalidateReleaseConfigs={invalidateReleaseConfigs}
        isLoading={isLoadingReleaseConfigs}
      />
    </Box>
  );
}
