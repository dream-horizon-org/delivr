/**
 * Pipeline List Component
 * Main container for managing build pipelines
 */

import { useState } from 'react';
import { Stack, Button, Text, Group, SimpleGrid } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { BuildPipelineJob } from '~/types/release-config';
import { PipelineCard } from './PipelineCard';
import { PipelineEditModal } from './PipelineEditModal';
import { RequiredPipelinesCheck } from './RequiredPipelinesCheck';

interface PipelineListProps {
  pipelines: BuildPipelineJob[];
  onChange: (pipelines: BuildPipelineJob[]) => void;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
  };
  selectedPlatforms?: Array<'WEB' | 'PLAY_STORE' | 'APP_STORE'>;
}

export function PipelineList({
  pipelines,
  onChange,
  availableIntegrations,
  selectedPlatforms = [],
}: PipelineListProps) {
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<BuildPipelineJob | undefined>();
  
  // Determine which platforms are needed based on selected targets
  const needsAndroid = selectedPlatforms.some(p => p === 'WEB' || p === 'PLAY_STORE');
  const needsIOS = selectedPlatforms.includes('APP_STORE');
  
  const handleAdd = () => {
    setEditingPipeline(undefined);
    setEditModalOpened(true);
  };
  
  const handleEdit = (pipeline: BuildPipelineJob) => {
    setEditingPipeline(pipeline);
    setEditModalOpened(true);
  };
  
  const handleDelete = (pipelineId: string) => {
    onChange(pipelines.filter(p => p.id !== pipelineId));
  };
  
  const handleToggle = (pipelineId: string) => {
    onChange(
      pipelines.map(p =>
        p.id === pipelineId ? { ...p, enabled: !p.enabled } : p
      )
    );
  };
  
  const handleSave = (pipeline: BuildPipelineJob) => {
    if (editingPipeline) {
      // Update existing
      onChange(pipelines.map(p => (p.id === pipeline.id ? pipeline : p)));
    } else {
      // Add new
      onChange([...pipelines, pipeline]);
    }
  };
  
  return (
    <Stack gap="md">
      <div>
        <Group justify="apart" className="mb-4">
          <div>
            <Text fw={600} size="lg">
              Build Pipelines
            </Text>
            <Text size="sm" c="dimmed">
              Configure automated build pipelines for selected platforms
            </Text>
            {selectedPlatforms.length > 0 && (
              <Text size="xs" c="blue" className="mt-1">
                Selected: {needsAndroid && 'Android'}{needsAndroid && needsIOS && ' + '}{needsIOS && 'iOS'}
              </Text>
            )}
          </div>
          
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={selectedPlatforms.length === 0}
          >
            Add Pipeline
          </Button>
        </Group>
        
        {selectedPlatforms.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <Text size="sm" c="orange" className="font-medium">
              Please select target platforms first (previous step) to configure build pipelines.
            </Text>
          </div>
        ) : (
          <RequiredPipelinesCheck pipelines={pipelines} />
        )}
      </div>
      
      {pipelines.length > 0 ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {pipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onEdit={() => handleEdit(pipeline)}
              onDelete={() => handleDelete(pipeline.id)}
              onToggle={() => handleToggle(pipeline.id)}
            />
          ))}
        </SimpleGrid>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Text size="sm" c="dimmed" className="mb-4">
            No build pipelines configured yet
          </Text>
          <Button
            variant="light"
            leftSection={<IconPlus size={18} />}
            onClick={handleAdd}
          >
            Add Your First Pipeline
          </Button>
        </div>
      )}
      
      <PipelineEditModal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        onSave={handleSave}
        pipeline={editingPipeline}
        availableIntegrations={availableIntegrations}
        existingPipelines={pipelines}
      />
    </Stack>
  );
}

