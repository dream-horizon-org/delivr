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
  IconRocket,
  IconPlug,
} from '@tabler/icons-react';
import { Link } from '@remix-run/react';
import { WorkflowList } from './WorkflowList';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';

export interface WorkflowsTabContentProps {
  workflows: CICDWorkflow[];
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    githubActions: Array<{ id: string; name: string }>;
  };
  tenantId: string;
  cicdIntegrationsCount: number;
  hasIntegrations: boolean;
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

  // If no workflows, return null (tabs handle empty states)
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

