/**
 * Configuration Selector Component
 * 
 * Dropdown selector with preview card for selected configuration.
 * Replaces the multi-card view with a cleaner dropdown + preview approach.
 */

import { useState } from 'react';
import { Card, Text, Group, Badge, Stack, Button, Select, ActionIcon } from '@mantine/core';
import { IconSettings, IconPlus, IconEye } from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';
import { ConfigurationPreviewModal } from '~/components/ReleaseSettings/ConfigurationPreviewModal';
import { PLATFORM_LABELS, TARGET_PLATFORM_LABELS } from '~/constants/release-config-ui';

interface ConfigurationSelectorProps {
  configurations: ReleaseConfiguration[];
  selectedMode: 'WITH_CONFIG' | 'MANUAL'; // Keep for compatibility
  selectedConfigId?: string;
  onModeChange: (mode: 'WITH_CONFIG' | 'MANUAL') => void; // Keep for compatibility
  onConfigSelect: (configId: string) => void;
  onCreateNew?: () => void;
  onClone?: (configId: string) => void;
}

export function ConfigurationSelector({
  configurations,
  selectedConfigId,
  onConfigSelect,
  onCreateNew,
}: ConfigurationSelectorProps) {
  const [previewOpened, setPreviewOpened] = useState(false);
  
  // Filter active configs
  const activeConfigs = configurations.filter((c) => c.isActive === true);

  // Get selected config for preview
  const selectedConfig = activeConfigs.find((c) => c.id === selectedConfigId);

  // Prepare dropdown options
  const configOptions = activeConfigs.map((config) => ({
    value: config.id,
    label: config.name,
  }));

  // Get build type label
  const getBuildTypeLabel = (config: ReleaseConfiguration): string => {
    return config.hasManualBuildUpload ? 'Manual' : 'CI/CD';
  };

  // Get targeted platforms (platform → target)
  const getTargetedPlatforms = (config: ReleaseConfiguration): string => {
    if (!config.targets || config.targets.length === 0) {
      return 'No targets';
    }
    return config.targets
      .map((target) => {
        // Map target to platform
        let platform: string;
        if (target === 'WEB') {
          platform = PLATFORM_LABELS.WEB;
        } else if (target === 'PLAY_STORE') {
          platform = PLATFORM_LABELS.ANDROID;
        } else if (target === 'APP_STORE') {
          platform = PLATFORM_LABELS.IOS;
        } else {
          platform = target;
        }
        const targetLabel = TARGET_PLATFORM_LABELS[target as keyof typeof TARGET_PLATFORM_LABELS] || target;
        return `${platform} → ${targetLabel}`;
      })
      .join(', ');
  };

  // Get pipeline count (only show if CI/CD and has workflows)
  const getPipelineCount = (config: ReleaseConfiguration): number | null => {
    if (config.hasManualBuildUpload) {
      return null; // Don't show pipelines for manual builds
    }
    // Workflows are stored in ciConfig.workflows
    const count = config.ciConfig?.workflows?.length || 0;
    return count > 0 ? count : null; // Don't show if 0
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Select
          label="Configuration"
          placeholder="Select a configuration"
          data={configOptions}
          value={selectedConfigId || null}
          onChange={(value) => {
            if (value) {
              onConfigSelect(value);
            }
          }}
          required
          searchable
          description="Choose a configuration template for your release"
          style={{ flex: 1 }}
        />

        {onCreateNew && (
          <Button
            leftSection={<IconPlus size={18} />}
            variant="light"
            onClick={onCreateNew}
            style={{ marginTop: '24px' }}
          >
            Create New
          </Button>
        )}
      </Group>

      {/* Preview Card for Selected Configuration */}
      {selectedConfig && (
        <Card shadow="sm" padding="md" radius="md" withBorder className="border-blue-300 bg-blue-50">
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <div className="flex-1">
              <Group gap="xs" className="mb-2">
                <IconSettings size={18} className="text-blue-600" />
                <Text fw={600} size="md">
                  {selectedConfig.name}
                </Text>

                {selectedConfig.isDefault && (
                  <Badge size="sm" variant="light" color="green">
                    Default
                  </Badge>
                )}

                <Badge size="sm" variant="outline" color="gray">
                  {selectedConfig.releaseType}
                </Badge>

                <Badge size="sm" variant="light" color="blue">
                  {getBuildTypeLabel(selectedConfig)}
                </Badge>
              </Group>

              {selectedConfig.description && (
                <Text size="sm" c="dimmed" className="mb-2">
                  {selectedConfig.description}
                </Text>
              )}

              <Group gap="lg" className="text-xs text-gray-600">
                <div>
                  <span className="font-medium">{getTargetedPlatforms(selectedConfig)}</span>
                </div>
                {getPipelineCount(selectedConfig) !== null && (
                <div>
                    <span className="font-medium">{getPipelineCount(selectedConfig)}</span> pipelines
                </div>
                )}
              </Group>
            </div>

            <ActionIcon
                variant="subtle"
              size="lg"
              onClick={() => setPreviewOpened(true)}
              className="text-blue-600 hover:text-blue-700"
            >
              <IconEye size={20} />
            </ActionIcon>
          </Group>
        </Card>
      )}

      {/* Preview Modal */}
      {selectedConfig && (
        <ConfigurationPreviewModal
          opened={previewOpened}
          onClose={() => setPreviewOpened(false)}
          config={selectedConfig}
        />
      )}

      {activeConfigs.length === 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            No configurations found. Click "Create New" to get started.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
