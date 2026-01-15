/**
 * Workflows Tab Content Component
 * Reusable content component for workflow tabs (All, Jenkins, GitHub)
 */

import { memo } from 'react';
import {
  Box,
  Text,
  Stack,
  ThemeIcon,
  Center,
  Paper,
  Group,
  Button,
  useMantineTheme,
} from '@mantine/core';
import {
  IconAutomation,
  IconPlug,
} from '@tabler/icons-react';
import { Link } from '@remix-run/react';
import { WorkflowList } from './WorkflowList';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { CICD_PROVIDER_TYPES } from '~/constants/integrations';
import { WORKFLOW_EMPTY_STATE_MESSAGES } from '~/constants/workflow-tabs';

export interface WorkflowsTabContentProps {
  workflows: CICDWorkflow[];
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    githubActions: Array<{ id: string; name: string }>;
  };
  tenantId: string;
  cicdIntegrationsCount: number;
  hasIntegrations: boolean;
  providerType?: string; // CICD_PROVIDER_TYPES value to determine which tab this is
  onRefresh: () => void;
  onCreate: (workflow: any) => Promise<void>;
  onUpdate: (workflowId: string, workflow: any) => Promise<void>;
  onDelete: (workflowId: string) => Promise<void>;
}

export const WorkflowsTabContent = memo(function WorkflowsTabContent({
  workflows,
  availableIntegrations,
  tenantId,
  cicdIntegrationsCount,
  hasIntegrations,
  providerType,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}: WorkflowsTabContentProps) {
  const theme = useMantineTheme();

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
            to={`/dashboard/${tenantId}/integrations`}
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

  // Empty state for specific provider tab when no workflows exist
  if (workflows.length === 0 && providerType) {
    const emptyMessage = 
      providerType === CICD_PROVIDER_TYPES.JENKINS
        ? WORKFLOW_EMPTY_STATE_MESSAGES.JENKINS
        : providerType === CICD_PROVIDER_TYPES.GITHUB_ACTIONS
        ? WORKFLOW_EMPTY_STATE_MESSAGES.GITHUB_ACTIONS
        : 'Your workflows will be shown here.';

    return (
      <Center py={60}>
        <Stack align="center" gap="md" maw={450}>
          <ThemeIcon size={64} radius="xl" variant="light" color="gray">
            <IconAutomation size={32} />
          </ThemeIcon>
          <Box ta="center">
            <Text size="sm" c={theme.colors.slate[6]}>
              {emptyMessage}
            </Text>
          </Box>
        </Stack>
      </Center>
    );
  }

  // If no workflows and no provider type specified, return null (fallback)
  if (workflows.length === 0) {
    return null;
  }

  return (
    <WorkflowList
      workflows={workflows}
      availableIntegrations={availableIntegrations}
      tenantId={tenantId}
      onRefresh={onRefresh}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
});

