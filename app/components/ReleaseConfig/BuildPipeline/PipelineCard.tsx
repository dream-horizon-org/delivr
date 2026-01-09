/**
 * Build Pipeline Card Component
 * Displays a single build pipeline configuration
 */

import { Card, Button, Text, Group, ActionIcon, Tooltip } from '@mantine/core';
import { IconEdit, IconTrash, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import type { Workflow, BuildEnvironment, Platform } from '~/types/release-config';
import type { PipelineCardProps } from '~/types/release-config-props';
import { BUILD_ENVIRONMENTS, BUILD_PROVIDERS, PLATFORMS } from '~/types/release-config-constants';
import { ENVIRONMENT_LABELS, PLATFORM_LABELS, BUTTON_LABELS, STATUS_LABELS } from '~/constants/release-config-ui';
import { PlatformBadge, AppBadge } from '~/components/Common/AppBadge';
import { getBuildProviderLabel } from '~/constants/release-config-ui';

export function PipelineCard({ pipeline, onEdit, onDelete }: PipelineCardProps) {
  const providerLabel = pipeline.provider.replace('_', ' ');
  
  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      className={`transition-opacity ${!pipeline.enabled ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Text fw={600} size="sm">
              {pipeline.name}
            </Text>
            
            {pipeline.enabled ? (
              <AppBadge
                type="status"
                value="success"
                title="Enabled"
                size="xs"
                variant="filled"
                leftSection={<IconCheck size={12} />}
              />
            ) : (
              <AppBadge
                type="status"
                value="neutral"
                title="Disabled"
                size="xs"
                variant="outline"
                leftSection={<IconX size={12} />}
              />
            )}
          </div>
          
          <Group gap="xs" className="mb-2">
            <PlatformBadge platform={pipeline.platform} size="sm" />
            
            <AppBadge
              type="build-environment"
              value={pipeline.environment}
              title={ENVIRONMENT_LABELS[pipeline.environment]}
              size="sm"
            />
            
            {pipeline.environment === BUILD_ENVIRONMENTS.AAB_BUILD && (
              <AppBadge
                type="status"
                value="neutral"
                title=".aab"
                size="sm"
                variant="outline"
              />
            )}
            
            <AppBadge
              type="build-provider"
              value={pipeline.provider}
              title={getBuildProviderLabel(pipeline.provider)}
              size="sm"
              variant="outline"
            />
          </Group>
        </div>
        
        <Group gap="xs">
          
          <Tooltip label={BUTTON_LABELS.EDIT}>
            <ActionIcon variant="subtle" color="blue" onClick={onEdit}>
              <IconEdit size={18} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label={BUTTON_LABELS.DELETE}>
            <ActionIcon variant="subtle" color="red" onClick={onDelete}>
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>
      
      <div className="text-xs text-gray-600">
        {pipeline.provider === BUILD_PROVIDERS.JENKINS && (
          <div className="space-y-1">
            <div className="truncate">
              <span className="font-medium">URL:</span>{' '}
              {(pipeline.providerConfig as any).jobUrl}
            </div>
          </div>
        )}
        
        {pipeline.provider === BUILD_PROVIDERS.GITHUB_ACTIONS && (
          <div className="space-y-1">
            <div>
              <span className="font-medium">Workflow:</span>{' '}
              {(pipeline.providerConfig as any).workflowPath}
            </div>
            <div>
              <span className="font-medium">Branch:</span>{' '}
              {(pipeline.providerConfig as any).branch}
            </div>
          </div>
        )}
        
        {pipeline.provider === BUILD_PROVIDERS.MANUAL_UPLOAD && (
          <div className="flex items-center gap-1 text-gray-500">
            <IconAlertCircle size={14} />
            <span>Manual upload required</span>
          </div>
        )}
      </div>
    </Card>
  );
}

