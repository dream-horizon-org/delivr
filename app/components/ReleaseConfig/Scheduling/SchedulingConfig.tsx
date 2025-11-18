/**
 * Complete Scheduling Configuration Component
 * Main container for all scheduling-related configuration
 */

import { useState } from 'react';
import { Stack, Text, Card, Group, TextInput, NumberInput } from '@mantine/core';
import type { SchedulingConfig as SchedulingConfigType, RegressionSlot } from '~/types/release-config';
import { ReleaseFrequencySelector } from './ReleaseFrequencySelector';
import { WorkingDaysSelector } from './WorkingDaysSelector';
import { TimezonePicker } from './TimezonePicker';
import { RegressionSlotTimeline } from './RegressionSlotTimeline';
import { RegressionSlotEditor } from './RegressionSlotEditor';

interface SchedulingConfigProps {
  config: SchedulingConfigType;
  onChange: (config: SchedulingConfigType) => void;
}

export function SchedulingConfig({ config, onChange }: SchedulingConfigProps) {
  const [slotEditorOpened, setSlotEditorOpened] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RegressionSlot | undefined>();
  
  const handleFrequencyChange = (
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM',
    customDays?: number
  ) => {
    onChange({
      ...config,
      releaseFrequency: frequency,
      customFrequencyDays: customDays,
    });
  };
  
  const handleAddSlot = () => {
    setEditingSlot(undefined);
    setSlotEditorOpened(true);
  };
  
  const handleEditSlot = (slot: RegressionSlot) => {
    setEditingSlot(slot);
    setSlotEditorOpened(true);
  };
  
  const handleDeleteSlot = (slotId: string) => {
    onChange({
      ...config,
      regressionSlots: config.regressionSlots.filter(s => s.id !== slotId),
    });
  };
  
  const handleSaveSlot = (slot: RegressionSlot) => {
    if (editingSlot) {
      // Update existing
      onChange({
        ...config,
        regressionSlots: config.regressionSlots.map(s => (s.id === slot.id ? slot : s)),
      });
    } else {
      // Add new
      onChange({
        ...config,
        regressionSlots: [...config.regressionSlots, slot],
      });
    }
  };
  
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Release Scheduling
        </Text>
        <Text size="sm" c="dimmed">
          Configure release cadence, working days, and regression test slots
        </Text>
      </div>
      
      {/* Release Frequency */}
      <ReleaseFrequencySelector
        frequency={config.releaseFrequency}
        customDays={config.customFrequencyDays}
        onChange={handleFrequencyChange}
      />
      
      {/* Timezone */}
      <TimezonePicker
        timezone={config.timezone}
        onChange={(tz) => onChange({ ...config, timezone: tz })}
      />
      
      {/* Working Days */}
      <WorkingDaysSelector
        workingDays={config.workingDays}
        onChange={(days) => onChange({ ...config, workingDays: days })}
      />
      
      {/* Default Timings */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Text fw={600} size="sm" className="mb-3">
          Default Timings
        </Text>
        
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Default Release Time"
              type="time"
              value={config.defaultReleaseTime}
              onChange={(e) =>
                onChange({ ...config, defaultReleaseTime: e.target.value })
              }
              required
              description="Default time for releases"
            />
            
            <TextInput
              label="Default Kickoff Time"
              type="time"
              value={config.defaultKickoffTime}
              onChange={(e) =>
                onChange({ ...config, defaultKickoffTime: e.target.value })
              }
              required
              description="Default time for kickoffs"
            />
          </Group>
          
          <NumberInput
            label="Kickoff Lead Days"
            placeholder="7"
            value={config.kickoffLeadDays}
            onChange={(val) =>
              onChange({ ...config, kickoffLeadDays: Number(val) || 0 })
            }
            required
            min={1}
            max={30}
            description="Days before release to schedule kickoff"
          />
        </Stack>
      </Card>
      
      {/* Kickoff Reminder */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Text fw={600} size="sm" className="mb-3">
          Kickoff Reminder (Optional)
        </Text>
        
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Reminder Time"
              type="time"
              value={config.kickoffReminderTime}
              onChange={(e) =>
                onChange({ ...config, kickoffReminderTime: e.target.value })
              }
              description="Time to send kickoff reminder"
            />
            
            <NumberInput
              label="Reminder Lead Days"
              placeholder="1"
              value={config.kickoffReminderLeadDays}
              onChange={(val) =>
                onChange({ ...config, kickoffReminderLeadDays: Number(val) || 0 })
              }
              min={0}
              max={7}
              description="Days before kickoff"
            />
          </Group>
        </Stack>
      </Card>
      
      {/* Regression Slots */}
      <RegressionSlotTimeline
        slots={config.regressionSlots}
        onEdit={handleEditSlot}
        onDelete={handleDeleteSlot}
        onAdd={handleAddSlot}
      />
      
      <RegressionSlotEditor
        opened={slotEditorOpened}
        onClose={() => setSlotEditorOpened(false)}
        onSave={handleSaveSlot}
        slot={editingSlot}
      />
    </Stack>
  );
}

