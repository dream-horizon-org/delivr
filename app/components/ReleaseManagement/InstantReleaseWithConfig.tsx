/**
 * Instant Release With Configuration Component
 * Create a new release using a saved configuration
 */

import { useState } from 'react';
import { Modal, Stack, Select, TextInput, Textarea, Button, Group, Text, Alert, Badge } from '@mantine/core';
import { IconRocket, IconInfoCircle } from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';

interface InstantReleaseWithConfigProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: ReleaseCreationData) => Promise<void>;
  configurations: ReleaseConfiguration[];
  defaultConfigId?: string;
}

export interface ReleaseCreationData {
  configId: string;
  version: string;
  releaseDate: string;
  kickoffDate: string;
  description?: string;
  overrides?: {
    targets?: string[];
    slackChannels?: Record<string, string>;
  };
}

export function InstantReleaseWithConfig({
  opened,
  onClose,
  onSubmit,
  configurations,
  defaultConfigId,
}: InstantReleaseWithConfigProps) {
  const [selectedConfigId, setSelectedConfigId] = useState(
    defaultConfigId || configurations.find(c => c.isDefault)?.id || ''
  );
  const [version, setVersion] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [kickoffDate, setKickoffDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const selectedConfig = configurations.find(c => c.id === selectedConfigId);
  
  const handleSubmit = async () => {
    if (!selectedConfig || !version || !releaseDate || !kickoffDate) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        configId: selectedConfigId,
        version,
        releaseDate,
        kickoffDate,
        description,
      });
      
      // Reset form
      setVersion('');
      setReleaseDate('');
      setKickoffDate('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to create release:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create New Release"
      size="lg"
    >
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
          <Text size="sm">
            Create a new release using a saved configuration. All pipelines, schedules, and 
            settings from the configuration will be applied automatically.
          </Text>
        </Alert>
        
        <Select
          label="Release Configuration"
          placeholder="Select configuration"
          data={configurations.map(c => ({
            value: c.id,
            label: c.name,
            disabled: c.status !== 'ACTIVE',
          }))}
          value={selectedConfigId}
          onChange={(val) => setSelectedConfigId(val || '')}
          required
          description="Choose the configuration to use for this release"
        />
        
        {selectedConfig && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <Text size="sm" fw={500} className="mb-2">
              Configuration Details
            </Text>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <Text c="dimmed">Pipelines:</Text>
                <Text fw={500}>{selectedConfig.buildPipelines.length}</Text>
              </div>
              <div>
                <Text c="dimmed">Platforms:</Text>
                <Group gap={4}>
                  {selectedConfig.defaultTargets.map(t => (
                    <Badge key={t} size="xs" variant="light">
                      {t}
                    </Badge>
                  ))}
                </Group>
              </div>
              <div>
                <Text c="dimmed">Frequency:</Text>
                <Text fw={500}>{selectedConfig.scheduling.releaseFrequency}</Text>
              </div>
              <div>
                <Text c="dimmed">Regression Slots:</Text>
                <Text fw={500}>{selectedConfig.scheduling.regressionSlots.length}</Text>
              </div>
            </div>
          </div>
        )}
        
        <TextInput
          label="Version"
          placeholder="v1.2.3"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          required
          description="Release version number"
        />
        
        <Group grow>
          <TextInput
            label="Kickoff Date"
            type="date"
            value={kickoffDate}
            onChange={(e) => setKickoffDate(e.target.value)}
            required
            description="When to kickoff this release"
          />
          
          <TextInput
            label="Release Date"
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            required
            description="Target release date"
          />
        </Group>
        
        <Textarea
          label="Description (Optional)"
          placeholder="Release highlights and notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          description="Additional details about this release"
        />
        
        <Group justify="flex-end" className="mt-4">
          <Button variant="subtle" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            leftSection={<IconRocket size={18} />}
            onClick={handleSubmit}
            disabled={!selectedConfig || !version || !releaseDate || !kickoffDate}
            loading={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Create Release
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

