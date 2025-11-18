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
}

export function PipelineList({
  pipelines,
  onChange,
  availableIntegrations,
}: PipelineListProps) {
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<BuildPipelineJob | undefined>();
  
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
              Configure automated build pipelines for each platform and environment
            </Text>
          </div>
          
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Pipeline
          </Button>
        </Group>
        
        <RequiredPipelinesCheck pipelines={pipelines} />
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

