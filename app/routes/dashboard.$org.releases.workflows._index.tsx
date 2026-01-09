/**
 * Workflows List Page
 * Manage CI/CD workflows (Jenkins and GitHub Actions)
 */

import {
  Box,
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
  IconRocket,
} from '@tabler/icons-react';
import { sanitizeUser } from '~/.server/services/Auth';
import { Breadcrumb } from '~/components/Common';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { CICDTab } from '~/components/ReleaseSettings/CICDTab';
import { useConfig } from '~/contexts/ConfigContext';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { PermissionService } from '~/utils/permissions.server';

export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Check if user is available
  if (!user || !user.user || !user.user.id) {
    throw redirect(`/dashboard/${org}/releases`);
  }
  
  // Check permissions - only editors and owners can access
  const isEditor = await PermissionService.isTenantEditor(org, user.user.id);
  if (!isEditor) {
    throw redirect(`/dashboard/${org}/releases`);
  }
  
  return json({ org, user: sanitizeUser(user) });
});

export default function WorkflowsPage() {
  const theme = useMantineTheme();
  const data = useLoaderData<typeof loader>();
  const { org } = data as any;
  
  const { 
    isLoadingMetadata, 
    isLoadingTenantConfig,
    metadataError,
    tenantConfigError,
  } = useConfig();
  
  const configError = metadataError || tenantConfigError;
  const isLoading = isLoadingMetadata || isLoadingTenantConfig;

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('releases.workflows.list', { org });

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Box mb={32}>
          <Skeleton height={16} width={200} mb={16} />
          <Skeleton height={32} width={300} mb={8} />
          <Skeleton height={20} width={400} />
        </Box>
        <Stack gap="lg">
          <Skeleton height={80} radius="md" />
          <Group gap="md">
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
        <Box mb={32}>
          <Breadcrumb items={breadcrumbItems} />
          <Title order={2} fw={700} c={theme.colors.slate[9]} mb={4}>
            Workflows
          </Title>
          <Text size="md" c={theme.colors.slate[5]}>
            Manage your CI/CD workflows
          </Text>
        </Box>

        <Center py={80}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertCircle size={32} />
            </ThemeIcon>
            <Text size="lg" fw={500} c={theme.colors.slate[7]}>
              Failed to load workflows
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} maw={400} ta="center">
              {typeof configError === 'string' ? configError : 'An error occurred while loading workflows. Please try again.'}
            </Text>
            <Button
              variant="light"
              color="brand"
              leftSection={<IconRefresh size={16} />}
              onClick={() => window.location.reload()}
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
        <Breadcrumb items={breadcrumbItems} />
        
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2} fw={700} c={theme.colors.slate[9]} mb={4}>
              Workflows
            </Title>
            <Text size="md" c={theme.colors.slate[5]} maw={600}>
              Manage your CI/CD workflows for Jenkins and GitHub Actions.
              Configure build pipelines and automate your deployment process.
            </Text>
          </Box>
          
          <Group gap="md">
            <Button
              component={Link}
              to={`/dashboard/${org}/releases/workflows/new`}
              color="brand"
              leftSection={<IconRocket size={16} />}
            >
              Add Workflow
            </Button>
            <Button
              component={Link}
              to={`/dashboard/${org}/releases`}
              variant="default"
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Releases
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Workflows Content */}
      <CICDTab org={org} />
    </Box>
  );
}

