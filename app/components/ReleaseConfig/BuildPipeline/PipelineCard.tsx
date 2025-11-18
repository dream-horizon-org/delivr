/**
 * Build Pipeline Card Component
 * Displays a single build pipeline configuration
 */

import { Card, Badge, Button, Text, Group, ActionIcon, Tooltip } from '@mantine/core';
import { IconEdit, IconTrash, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import type { BuildPipelineJob, BuildEnvironment, Platform } from '~/types/release-config';

interface PipelineCardProps {
  pipeline: BuildPipelineJob;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const environmentColors: Record<BuildEnvironment, string> = {
  PRE_REGRESSION: 'blue',
  REGRESSION: 'green',
  TESTFLIGHT: 'orange',
  PRODUCTION: 'red',
};

const environmentLabels: Record<BuildEnvironment, string> = {
  PRE_REGRESSION: 'Pre-Regression',
  REGRESSION: 'Regression',
  TESTFLIGHT: 'TestFlight',
  PRODUCTION: 'Production',
};

const platformLabels: Record<Platform, string> = {
  ANDROID: 'Android',
  IOS: 'iOS',
};

export function PipelineCard({ pipeline, onEdit, onDelete, onToggle }: PipelineCardProps) {
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
              <Badge size="xs" color="green" variant="filled">
                <IconCheck size={12} className="inline mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge size="xs" color="gray" variant="outline">
                <IconX size={12} className="inline mr-1" />
                Disabled
              </Badge>
            )}
          </div>
          
          <Group gap="xs" className="mb-2">
            <Badge size="sm" variant="light">
              {platformLabels[pipeline.platform]}
            </Badge>
            
            <Badge 
              size="sm" 
              variant="light" 
              color={environmentColors[pipeline.environment]}
            >
              {environmentLabels[pipeline.environment]}
            </Badge>
            
            <Badge size="sm" variant="outline" color="gray">
              {providerLabel}
            </Badge>
          </Group>
        </div>
        
        <Group gap="xs">
          <Tooltip label={pipeline.enabled ? 'Disable' : 'Enable'}>
            <ActionIcon
              variant="subtle"
              color={pipeline.enabled ? 'green' : 'gray'}
              onClick={onToggle}
            >
              {pipeline.enabled ? <IconCheck size={18} /> : <IconX size={18} />}
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label="Edit">
            <ActionIcon variant="subtle" color="blue" onClick={onEdit}>
              <IconEdit size={18} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label="Delete">
            <ActionIcon variant="subtle" color="red" onClick={onDelete}>
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>
      
      <div className="text-xs text-gray-600">
        {pipeline.provider === 'JENKINS' && (
          <div className="space-y-1">
            <div>
              <span className="font-medium">Job:</span>{' '}
              {(pipeline.providerConfig as any).jobName}
            </div>
            <div className="truncate">
              <span className="font-medium">URL:</span>{' '}
              {(pipeline.providerConfig as any).jobUrl}
            </div>
          </div>
        )}
        
        {pipeline.provider === 'GITHUB_ACTIONS' && (
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
        
        {pipeline.provider === 'MANUAL_UPLOAD' && (
          <div className="flex items-center gap-1 text-gray-500">
            <IconAlertCircle size={14} />
            <span>Manual upload required</span>
          </div>
        )}
      </div>
    </Card>
  );
}

