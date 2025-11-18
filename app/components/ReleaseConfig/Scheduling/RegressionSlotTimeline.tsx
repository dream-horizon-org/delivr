/**
 * Regression Slot Timeline Component
 * Visual timeline of regression slots
 */

import { Card, Text, Badge, Group, ActionIcon, Tooltip, Button } from '@mantine/core';
import { IconEdit, IconTrash, IconPlus, IconClock } from '@tabler/icons-react';
import type { RegressionSlot } from '~/types/release-config';

interface RegressionSlotTimelineProps {
  slots: RegressionSlot[];
  onEdit: (slot: RegressionSlot) => void;
  onDelete: (slotId: string) => void;
  onAdd: () => void;
}

export function RegressionSlotTimeline({
  slots,
  onEdit,
  onDelete,
  onAdd,
}: RegressionSlotTimelineProps) {
  // Sort slots by offset days and time
  const sortedSlots = [...slots].sort((a, b) => {
    if (a.offsetDays !== b.offsetDays) {
      return a.offsetDays - b.offsetDays;
    }
    return a.time.localeCompare(b.time);
  });
  
  const getActivityBadges = (slot: RegressionSlot) => {
    const activities = [];
    if (slot.config.regressionBuilds) activities.push('Builds');
    if (slot.config.postReleaseNotes) activities.push('Notes');
    if (slot.config.automationBuilds) activities.push('Auto Builds');
    if (slot.config.automationRuns) activities.push('Tests');
    return activities;
  };
  
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group gap="sm" justify="apart" className="mb-4">
        <div>
          <Group gap="sm">
            <IconClock size={20} className="text-blue-600" />
            <Text fw={600} size="sm">
              Regression Slots
            </Text>
          </Group>
          <Text size="xs" c="dimmed" className="mt-1">
            Define testing slots throughout the release cycle
          </Text>
        </div>
        
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={onAdd}
        >
          Add Slot
        </Button>
      </Group>
      
      {sortedSlots.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Text size="sm" c="dimmed" className="mb-3">
            No regression slots defined yet
          </Text>
          <Button
            variant="light"
            size="sm"
            leftSection={<IconPlus size={16} />}
            onClick={onAdd}
          >
            Add First Slot
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSlots.map((slot, index) => {
            const activities = getActivityBadges(slot);
            
            return (
              <div
                key={slot.id}
                className="relative pl-8 pb-4 border-l-2 border-blue-200 last:border-l-0"
              >
                {/* Timeline dot */}
                <div className="absolute left-0 -ml-2 mt-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
                </div>
                
                <Card padding="sm" radius="md" withBorder className="bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <Group gap="xs" className="mb-1">
                        <Text fw={600} size="sm">
                          {slot.name}
                        </Text>
                        <Badge size="xs" variant="light" color="blue">
                          Day {slot.offsetDays}
                        </Badge>
                        <Badge size="xs" variant="outline" color="gray">
                          {slot.time}
                        </Badge>
                      </Group>
                      
                      {activities.length > 0 && (
                        <Group gap={4}>
                          {activities.map((activity) => (
                            <Badge key={activity} size="xs" variant="dot" color="green">
                              {activity}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </div>
                    
                    <Group gap={4}>
                      <Tooltip label="Edit">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="blue"
                          onClick={() => onEdit(slot)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      
                      <Tooltip label="Delete">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => onDelete(slot.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
      
      {sortedSlots.length > 0 && (
        <div className="mt-4 bg-green-50 p-3 rounded-lg">
          <Text size="sm" fw={500} className="text-green-900">
            {sortedSlots.length} regression slot{sortedSlots.length > 1 ? 's' : ''} configured
          </Text>
        </div>
      )}
    </Card>
  );
}

