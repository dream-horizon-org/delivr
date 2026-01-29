/**
 * CI/CD Tab Component
 * Displays CI/CD workflows with proper loading, error, and empty states
 */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from '@remix-run/react';
import {
  Box,
  Text,
  Button,
  Stack,
  ThemeIcon,
  Center,
  Paper,
  Group,
  Skeleton,
  SimpleGrid,
  useMantineTheme,
} from '@mantine/core';
import {
  IconRocket,
  IconPlus,
  IconAlertCircle,
  IconRefresh,
  IconPlug,
} from '@tabler/icons-react';
import { WorkflowList } from '~/components/ReleaseSettings/WorkflowList';
import { apiGet, apiPost, apiDelete, getApiErrorMessage, apiPatch } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { IntegrationCategory } from '~/types/integrations';
import { useConfig } from '~/contexts/ConfigContext';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';

interface CICDTabProps {
  org: string;
}

export const CICDTab = memo(function CICDTab({ org }: CICDTabProps) {
  const theme = useMantineTheme();
  const { getConnectedIntegrations } = useConfig();
  const [workflows, setWorkflows] = useState<CICDWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get CI/CD integrations
  const cicdIntegrations = getConnectedIntegrations(IntegrationCategory.CI_CD);
  
  // Extract Jenkins and GitHub integrations
  const availableIntegrations = useMemo(() => ({
    jenkins: cicdIntegrations
      .filter(i => i.providerId.toLowerCase() === 'jenkins')
      .map(i => ({ id: i.id, name: i.name || 'Jenkins' })),
    githubActions: cicdIntegrations
      .filter(i => i.providerId.toLowerCase() === 'github_actions' || i.providerId.toLowerCase() === 'github')
      .map(i => ({ id: i.id, name: i.name || 'GitHub Actions' })),
  }), [cicdIntegrations]);

  const hasIntegrations = cicdIntegrations.length > 0;

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    setLoadingWorkflows(true);
    setError(null);
    
    try {
      const result = await apiGet<{ success: boolean; workflows?: CICDWorkflow[] }>(
        `/api/v1/apps/${org}/workflows`
      );
      
      if (result.success && result.data?.workflows) {
        setWorkflows(result.data.workflows);
      } else {
        setWorkflows([]);
      }
    } catch (err) {
      console.error('[CICDTab] Failed to fetch workflows:', err);
      setError(getApiErrorMessage(err, 'Failed to load workflows'));
    } finally {
      setLoadingWorkflows(false);
    }
  }, [org]);

  // Load workflows when component mounts
  useEffect(() => {
    if (hasIntegrations) {
      fetchWorkflows();
    } else {
      setLoadingWorkflows(false);
    }
  }, [fetchWorkflows, hasIntegrations]);

  // Handle workflow creation
  const handleCreateWorkflow = useCallback(async (workflowData: any) => {
    try {
      const result = await apiPost<{ success: boolean; error?: string }>(
        `/api/v1/apps/${org}/workflows`,
        workflowData
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow created successfully' });
        await fetchWorkflows();
      } else {
        showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to create workflow' });
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to create workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    }
  }, [org, fetchWorkflows]);

  // Handle workflow update
  const handleUpdateWorkflow = useCallback(async (workflowId: string, workflowData: any) => {
    try {
      const result = await apiPatch<{ success: boolean; error?: string }>(
        `/api/v1/apps/${org}/workflows/${workflowId}`,
        workflowData
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow updated successfully' });
        await fetchWorkflows();
      } else {
        showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to update workflow' });
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to update workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    }
  }, [org, fetchWorkflows]);

  // Handle workflow deletion
  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    try {
      const result = await apiDelete<{ success: boolean; error?: string }>(
        `/api/v1/apps/${org}/workflows/${workflowId}`
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow deleted successfully' });
        await fetchWorkflows();
      } else {
        showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to delete workflow' });
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to delete workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    }
  }, [org, fetchWorkflows]);

  // Loading state
  if (loadingWorkflows) {
    return (
      <Stack gap="lg">
        <Group justify="space-between">
          <Skeleton height={32} width={200} />
          <Skeleton height={36} width={160} />
        </Group>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {[1, 2].map((i) => (
            <Skeleton key={i} height={160} radius="md" />
          ))}
        </SimpleGrid>
      </Stack>
    );
  }

  // Error state
  if (error) {
    return (
      <Center py={60}>
        <Stack align="center" gap="md">
          <ThemeIcon size={64} radius="xl" variant="light" color="red">
            <IconAlertCircle size={32} />
          </ThemeIcon>
          <Text size="lg" fw={500} c={theme.colors.slate[7]}>
            Failed to load workflows
          </Text>
          <Text size="sm" c={theme.colors.slate[5]} maw={400} ta="center">
            {error}
          </Text>
          <Button
            variant="light"
            color="brand"
            leftSection={<IconRefresh size={16} />}
            onClick={fetchWorkflows}
          >
            Try Again
          </Button>
        </Stack>
      </Center>
    );
  }

  // No integrations connected state
  if (!hasIntegrations) {
    return (
      <Center py={60}>
        <Stack align="center" gap="lg" maw={450}>
          <ThemeIcon size={80} radius="xl" variant="light" color="brand">
            <IconPlug size={40} />
          </ThemeIcon>
          <Box ta="center">
            <Text size="xl" fw={600} c={theme.colors.slate[8]} mb={8}>
              Connect a CI/CD Integration
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} mb={24}>
              To create and manage CI/CD pipelines, you'll need to connect a CI/CD integration
              like Jenkins or GitHub Actions first.
            </Text>
          </Box>
          <Button
            component={Link}
            to={`/dashboard/${org}/integrations`}
            size="md"
            color="brand"
            leftSection={<IconPlug size={18} />}
          >
            Connect Integration
          </Button>
        </Stack>
      </Center>
    );
  }

  // Empty workflows state
  if (workflows.length === 0) {
    return (
      <Stack gap="lg">
        {/* Header with info */}
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.brand[0],
            border: `1px solid ${theme.colors.brand[2]}`,
          }}
        >
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" variant="light" color="brand">
              <IconRocket size={20} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={600} c={theme.colors.brand[8]}>
                CI/CD Pipelines
              </Text>
              <Text size="xs" c={theme.colors.brand[6]}>
                {cicdIntegrations.length} integration{cicdIntegrations.length !== 1 ? 's' : ''} connected
              </Text>
            </Box>
          </Group>
        </Paper>

        <Center py={40}>
          <Stack align="center" gap="lg" maw={400}>
            <ThemeIcon size={64} radius="xl" variant="light" color="gray">
              <IconRocket size={32} />
            </ThemeIcon>
            <Box ta="center">
              <Text size="lg" fw={600} c={theme.colors.slate[8]} mb={8}>
                No workflows yet
              </Text>
              <Text size="sm" c={theme.colors.slate[5]}>
                Create your first CI/CD workflow to automate your build and deployment process.
              </Text>
            </Box>
          </Stack>
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <WorkflowList
        workflows={workflows}
        availableIntegrations={availableIntegrations}
        appId={org}
        onRefresh={fetchWorkflows}
        onCreate={handleCreateWorkflow}
        onUpdate={handleUpdateWorkflow}
        onDelete={handleDeleteWorkflow}
      />
    </Stack>
  );
});
