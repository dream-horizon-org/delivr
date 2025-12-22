/**
 * Workflow Preview Card Component
 * Displays preview information for a selected workflow
 */

import { Card, Stack, Group, Badge, Text } from '@mantine/core';
import { IconServer, IconBrandGithub } from '@tabler/icons-react';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { BUILD_PROVIDERS } from '~/types/release-config-constants';
import { workflowTypeToEnvironment } from '~/types/workflow-mappings';

interface WorkflowPreviewCardProps {
  workflow: CICDWorkflow;
}

export function WorkflowPreviewCard({ workflow }: WorkflowPreviewCardProps) {
  const isJenkins = workflow.providerType === BUILD_PROVIDERS.JENKINS;
  const environment = workflowTypeToEnvironment[workflow.workflowType] || workflow.workflowType;
  const hasParameters = workflow.parameters && Object.keys(workflow.parameters).length > 0;

  return (
    <Card withBorder className="bg-gray-50">
      <Stack gap="xs">
        <Group gap="xs">
          {isJenkins ? (
            <IconServer size={18} className="text-red-600" />
          ) : (
            <IconBrandGithub size={18} />
          )}
          <Text size="sm" fw={600}>
            {workflow.displayName}
          </Text>
        </Group>

        <Group gap="xs">
          <Badge size="sm" color={isJenkins ? 'red' : 'dark'}>
            {workflow.providerType.replace('_', ' ')}
          </Badge>
          <Badge size="sm" color="blue">
            {workflow.platform}
          </Badge>
          <Badge size="sm" color="grape">
            {environment}
          </Badge>
        </Group>

        <div className="bg-white rounded p-2 border border-gray-200">
          <a
            href={workflow.workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono break-all text-xs text-gray-500 hover:text-blue-600 hover:underline"
          >
            {workflow.workflowUrl}
          </a>
        </div>

        {hasParameters && workflow.parameters && (
          <div>
            <Text size="xs" fw={500} c="dimmed" className="mb-1">
              Parameters:
            </Text>
            <div className="bg-white rounded p-2 border border-gray-200 space-y-1">
              {Object.entries(workflow.parameters).slice(0, 3).map(([key, value]) => (
                <Text key={key} size="xs" className="font-mono">
                  <span className="text-gray-600">{key}:</span>{' '}
                  <span className="text-blue-600">{String(value)}</span>
                </Text>
              ))}
              {Object.keys(workflow.parameters).length > 3 && (
                <Text size="xs" c="dimmed">
                  +{Object.keys(workflow.parameters).length - 3} more...
                </Text>
              )}
            </div>
          </div>
        )}
      </Stack>
    </Card>
  );
}

