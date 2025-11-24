/**
 * Regression Slot Editor Component
 * Create and edit individual regression slots
 */

import { useState } from 'react';
import { Modal, TextInput, NumberInput, Stack, Group, Button, Switch, Text } from '@mantine/core';
import type { RegressionSlot } from '~/types/release-config';
import type { RegressionSlotEditorProps } from '~/types/release-config-props';
import { generateConfigId } from '~/utils/release-config-storage';

export function RegressionSlotEditor({
  opened,
  onClose,
  onSave,
  slot,
}: RegressionSlotEditorProps) {
  const isEditing = !!slot;
  
  const [name, setName] = useState(slot?.name || '');
  const [offsetDays, setOffsetDays] = useState(slot?.regressionSlotOffsetFromKickoff || 0);
  const [time, setTime] = useState(slot?.time || '09:00');
  const [config, setConfig] = useState(
    slot?.config || {
      regressionBuilds: true,
      postReleaseNotes: false,
      automationBuilds: false,
      automationRuns: false,
    }
  );
  
  const handleSave = () => {
    const slotData: RegressionSlot = {
      id: slot?.id || generateConfigId(),
      name: name.trim(),
      regressionSlotOffsetFromKickoff: offsetDays,
      time,
      config,
    };
    
    onSave(slotData);
    onClose();
  };
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Edit Regression Slot' : 'Add Regression Slot'}
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="Slot Name"
          placeholder="e.g., Evening Regression, Slot 1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          description="A descriptive name for this regression slot"
        />
        
        <Group grow>
          <NumberInput
            label="Days Offset from Kickoff"
            placeholder="0"
            value={offsetDays}
            onChange={(val) => setOffsetDays(Number(val) || 0)}
            required
            min={0}
            max={30}
            description="Days after kickoff"
          />
          
          <TextInput
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            description="Time in 24-hour format"
          />
        </Group>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <Text size="sm" fw={500} className="mb-3">
            Slot Activities
          </Text>
          
          <Stack gap="sm">
            <Switch
              label="Trigger Regression Builds"
              description="Build regression versions for testing"
              checked={config.regressionBuilds}
              onChange={(e) =>
                setConfig({ ...config, regressionBuilds: e.currentTarget.checked })
              }
            />
            
            <Switch
              label="Post Release Notes"
              description="Post release notes to communication channels"
              checked={config.postReleaseNotes}
              onChange={(e) =>
                setConfig({ ...config, postReleaseNotes: e.currentTarget.checked })
              }
            />
            
            <Switch
              label="Trigger Automation Builds"
              description="Build automation test versions"
              checked={config.automationBuilds}
              onChange={(e) =>
                setConfig({ ...config, automationBuilds: e.currentTarget.checked })
              }
            />
            
            <Switch
              label="Run Automated Tests"
              description="Execute automated test suites"
              checked={config.automationRuns}
              onChange={(e) =>
                setConfig({ ...config, automationRuns: e.currentTarget.checked })
              }
            />
          </Stack>
        </div>
        
        <Group justify="flex-end" className="mt-4">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            {isEditing ? 'Save Changes' : 'Add Slot'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

